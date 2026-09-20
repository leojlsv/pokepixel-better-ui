[CmdletBinding(DefaultParameterSetName = 'Launch')]
param(
    [Parameter(ParameterSetName = 'Launch', Mandatory = $true)]
    [string]$LeftProfile,

    [Parameter(ParameterSetName = 'Launch', Mandatory = $true)]
    [string]$RightProfile,

    [Parameter(ParameterSetName = 'Profiles', Mandatory = $true)]
    [switch]$ListProfiles,

    [Parameter(ParameterSetName = 'Profiles')]
    [string]$ProfilesUserDataDir,

    [Parameter(ParameterSetName = 'Launch')]
    [ValidateSet('SideBySide', 'Stacked')]
    [string]$Layout = 'SideBySide',

    [Parameter(ParameterSetName = 'Launch')]
    [ValidateRange(0, 32)]
    [int]$Monitor = 0,

    [Parameter(ParameterSetName = 'Launch')]
    [string]$MonitorDeviceName,

    [Parameter(ParameterSetName = 'Launch')]
    [ValidateRange(0, 128)]
    [int]$Gap = 8,

    [Parameter(ParameterSetName = 'Launch')]
    [ValidateRange(0.2, 0.8)]
    [double]$Split = 0.5,

    [Parameter(ParameterSetName = 'Launch')]
    [string]$Url = 'https://pokepixel.nietore.com/play',

    [Parameter(ParameterSetName = 'Launch')]
    [string]$LeftUserDataDir,

    [Parameter(ParameterSetName = 'Launch')]
    [string]$RightUserDataDir,

    [Parameter(ParameterSetName = 'Launch')]
    [string]$EdgePath,

    [Parameter(ParameterSetName = 'Launch')]
    [ValidateRange(1, 60)]
    [int]$WindowTimeoutSeconds = 15,

    [Parameter(ParameterSetName = 'Launch')]
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-DefaultEdgeUserDataDir {
    if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        throw 'LOCALAPPDATA is not available.'
    }

    return Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\User Data'
}

function Resolve-EdgeExecutable {
    param([string]$RequestedPath)

    if (-not [string]::IsNullOrWhiteSpace($RequestedPath)) {
        $resolved = Resolve-Path -LiteralPath $RequestedPath -ErrorAction SilentlyContinue
        if ($null -eq $resolved) {
            throw "Edge executable was not found at '$RequestedPath'."
        }
        return $resolved.Path
    }

    $candidates = @(
        $(if (${env:ProgramFiles(x86)}) { Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe' }),
        $(if ($env:ProgramFiles) { Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe' }),
        $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe' })
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return $candidate
        }
    }

    throw 'Microsoft Edge executable was not found. Pass -EdgePath explicitly.'
}

function Get-EdgeProfileCatalog {
    param([string]$UserDataDir)

    $root = if ([string]::IsNullOrWhiteSpace($UserDataDir)) {
        Get-DefaultEdgeUserDataDir
    } else {
        $UserDataDir
    }
    $resolvedRoot = Resolve-Path -LiteralPath $root -ErrorAction SilentlyContinue
    if ($null -eq $resolvedRoot) {
        throw "Edge user-data root was not found at '$root'."
    }
    $root = $resolvedRoot.Path

    $localStatePath = Join-Path $root 'Local State'
    if (-not (Test-Path -LiteralPath $localStatePath -PathType Leaf)) {
        throw "Edge profile metadata was not found at '$localStatePath'."
    }

    $state = Get-Content -LiteralPath $localStatePath -Raw | ConvertFrom-Json
    if ($null -eq $state.profile -or $null -eq $state.profile.info_cache) {
        throw "Edge profile metadata at '$localStatePath' has no profile.info_cache section."
    }

    $rows = foreach ($property in $state.profile.info_cache.PSObject.Properties) {
        $profile = $property.Value
        [pscustomobject]@{
            UserDataRoot = $root
            Directory = $property.Name
            Name = $profile.name
            Account = $profile.user_name
            PreferencesPath = Join-Path (Join-Path $root $property.Name) 'Preferences'
        }
    }

    return @($rows | Sort-Object Directory)
}

function Show-EdgeProfiles {
    param([string]$UserDataDir)

    Get-EdgeProfileCatalog -UserDataDir $UserDataDir |
        Select-Object @{ Name = 'DirectoryKey'; Expression = { $_.Directory } },
                      @{ Name = 'DisplayName'; Expression = { $_.Name } },
                      Account |
        Format-Table -AutoSize
}

function Resolve-EdgeProfile {
    param(
        [string]$UserDataDir,
        [string]$ProfileSelector
    )

    if ([string]::IsNullOrWhiteSpace($ProfileSelector) -or
        $ProfileSelector -match '[/\\]' -or
        $ProfileSelector -match '\.\.' -or
        $ProfileSelector -match '[\x00-\x1F"]') {
        throw "Invalid Edge profile selector '$ProfileSelector'. Use a DirectoryKey such as 'Default'/'Profile 1' or its unique DisplayName."
    }

    $catalog = @(Get-EdgeProfileCatalog -UserDataDir $UserDataDir)
    $directoryMatches = @($catalog | Where-Object {
        [string]::Equals($_.Directory, $ProfileSelector, [StringComparison]::OrdinalIgnoreCase)
    })

    if ($directoryMatches.Count -eq 1) {
        $match = $directoryMatches[0]
    } else {
        $nameMatches = @($catalog | Where-Object {
            [string]::Equals($_.Name, $ProfileSelector, [StringComparison]::OrdinalIgnoreCase)
        })

        if ($nameMatches.Count -gt 1) {
            $keys = ($nameMatches | ForEach-Object { $_.Directory }) -join ', '
            throw "Edge DisplayName '$ProfileSelector' is ambiguous. Matching DirectoryKeys: $keys. Use a DirectoryKey explicitly."
        }

        if ($nameMatches.Count -eq 0) {
            $available = ($catalog | ForEach-Object { "'$($_.Directory)' ('$($_.Name)')" }) -join ', '
            throw "Edge profile '$ProfileSelector' was not found. Available profiles: $available"
        }

        $match = $nameMatches[0]
    }

    if (-not (Test-Path -LiteralPath $match.PreferencesPath -PathType Leaf)) {
        throw "Edge profile '$($match.Directory)' has no Preferences file at '$($match.PreferencesPath)'."
    }

    return $match
}

function Initialize-WindowApi {
    if ('Ppbui.DualEdge.NativeWindow' -as [type]) {
        return
    }

    Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace Ppbui.DualEdge
{
    public sealed class WindowInfo
    {
        public IntPtr Handle { get; set; }
        public int ProcessId { get; set; }
        public string ExecutablePath { get; set; }
        public string Title { get; set; }
        public int X { get; set; }
        public int Y { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
    }

    public static class NativeWindow
    {
        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
        [StructLayout(LayoutKind.Sequential)]
        private struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        private static extern int GetWindowTextLength(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool MoveWindow(IntPtr hWnd, int x, int y, int width, int height, bool repaint);

        [DllImport("user32.dll")]
        private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr dpiContext);

        [DllImport("dwmapi.dll")]
        private static extern int DwmGetWindowAttribute(
            IntPtr hWnd,
            uint dwAttribute,
            out int pvAttribute,
            int cbAttribute
        );

        private static bool IsDwmCloaked(IntPtr hWnd)
        {
            const uint DWMWA_CLOAKED = 14;
            int cloaked;
            int result = DwmGetWindowAttribute(hWnd, DWMWA_CLOAKED, out cloaked, sizeof(int));
            return result != 0 || cloaked != 0;
        }

        public static IntPtr PushPerMonitorV2()
        {
            try
            {
                return SetThreadDpiAwarenessContext(new IntPtr(-4));
            }
            catch
            {
                return IntPtr.Zero;
            }
        }

        public static void PopDpiContext(IntPtr previousContext)
        {
            if (previousContext == IntPtr.Zero)
                return;

            try
            {
                SetThreadDpiAwarenessContext(previousContext);
            }
            catch
            {
            }
        }

        public static WindowInfo[] GetEdgeWindows()
        {
            var windows = new List<WindowInfo>();
            var previousDpiContext = PushPerMonitorV2();

            try
            {
                EnumWindows(delegate(IntPtr hWnd, IntPtr lParam)
                {
                if (!IsWindowVisible(hWnd))
                    return true;

                if (IsDwmCloaked(hWnd))
                    return true;

                int titleLength = GetWindowTextLength(hWnd);
                if (titleLength <= 0)
                    return true;

                uint processId;
                GetWindowThreadProcessId(hWnd, out processId);

                try
                {
                    using (var process = Process.GetProcessById((int)processId))
                    {
                        if (!String.Equals(process.ProcessName, "msedge", StringComparison.OrdinalIgnoreCase))
                            return true;

                        string executablePath;
                        try
                        {
                            executablePath = process.MainModule.FileName;
                        }
                        catch
                        {
                            return true;
                        }

                        if (String.IsNullOrWhiteSpace(executablePath))
                            return true;

                        var title = new StringBuilder(titleLength + 1);
                        GetWindowText(hWnd, title, title.Capacity);

                        RECT rect;
                        if (!GetWindowRect(hWnd, out rect))
                            return true;

                        int width = Math.Max(0, rect.Right - rect.Left);
                        int height = Math.Max(0, rect.Bottom - rect.Top);
                        if (width < 300 || height < 200)
                            return true;

                        windows.Add(new WindowInfo
                        {
                            Handle = hWnd,
                            ProcessId = (int)processId,
                            ExecutablePath = executablePath,
                            Title = title.ToString(),
                            X = rect.Left,
                            Y = rect.Top,
                            Width = width,
                            Height = height
                        });
                    }
                }
                catch
                {
                    return true;
                }

                    return true;
                }, IntPtr.Zero);

                return windows.ToArray();
            }
            finally
            {
                PopDpiContext(previousDpiContext);
            }
        }

        public static bool Move(IntPtr hWnd, int x, int y, int width, int height)
        {
            const int SW_RESTORE = 9;
            var previousDpiContext = PushPerMonitorV2();
            try
            {
                ShowWindow(hWnd, SW_RESTORE);
                return MoveWindow(hWnd, x, y, width, height, true);
            }
            finally
            {
                PopDpiContext(previousDpiContext);
            }
        }
    }
}
'@
}

function Get-MonitorWorkArea {
    param(
        [int]$Index,
        [string]$DeviceName
    )

    Initialize-WindowApi
    $previousDpiContext = [Ppbui.DualEdge.NativeWindow]::PushPerMonitorV2()
    try {
    Add-Type -AssemblyName System.Windows.Forms
    $screens = [System.Windows.Forms.Screen]::AllScreens
    if (-not [string]::IsNullOrWhiteSpace($DeviceName)) {
        $selected = @($screens | Where-Object {
            [string]::Equals($_.DeviceName, $DeviceName, [StringComparison]::OrdinalIgnoreCase)
        })
        if ($selected.Count -ne 1) {
            throw "Monitor device '$DeviceName' was not found exactly once."
        }
        $screen = $selected[0]
    } else {
        if ($Index -lt 0 -or $Index -ge $screens.Count) {
            throw "Monitor index $Index is invalid. Available monitor indexes: 0..$($screens.Count - 1)."
        }
        $screen = $screens[$Index]
    }

    $area = $screen.WorkingArea
    return [pscustomobject]@{
        X = $area.X
        Y = $area.Y
        Width = $area.Width
        Height = $area.Height
        DeviceName = $screen.DeviceName
        Primary = $screen.Primary
    }
    } finally {
        [Ppbui.DualEdge.NativeWindow]::PopDpiContext($previousDpiContext)
    }
}

function Get-GridRectangles {
    param(
        [pscustomobject]$Area,
        [string]$Mode,
        [int]$GapPixels,
        [double]$SplitRatio
    )

    if ($Mode -eq 'SideBySide') {
        $usable = $Area.Width - $GapPixels
        $first = [int][Math]::Floor($usable * $SplitRatio)
        $second = $usable - $first
        return @(
            [pscustomobject]@{ X = $Area.X; Y = $Area.Y; Width = $first; Height = $Area.Height },
            [pscustomobject]@{ X = $Area.X + $first + $GapPixels; Y = $Area.Y; Width = $second; Height = $Area.Height }
        )
    }

    $usable = $Area.Height - $GapPixels
    $first = [int][Math]::Floor($usable * $SplitRatio)
    $second = $usable - $first
    return @(
        [pscustomobject]@{ X = $Area.X; Y = $Area.Y; Width = $Area.Width; Height = $first },
        [pscustomobject]@{ X = $Area.X; Y = $Area.Y + $first + $GapPixels; Width = $Area.Width; Height = $second }
    )
}

function Assert-SafeArgumentValue {
    param(
        [string]$Value,
        [string]$Name
    )

    if ($Value -match '[\x00-\x1F"]') {
        throw "$Name contains a quote or control character and cannot be passed safely to Edge."
    }
}

function ConvertTo-WindowsQuotedArgument {
    param([string]$Value)

    if ($null -eq $Value) {
        return '""'
    }

    # In a quoted Windows argv token, backslashes immediately before a quote
    # must be doubled. Values are quote-free here, so only the closing quote
    # needs this treatment.
    $trailingBackslashes = [regex]::Match($Value, '\\+$').Value
    if ($trailingBackslashes.Length -gt 0) {
        $prefixLength = $Value.Length - $trailingBackslashes.Length
        $Value = $Value.Substring(0, $prefixLength) + $trailingBackslashes + $trailingBackslashes
    }

    return '"' + $Value + '"'
}

function New-EdgeArgumentString {
    param(
        [string]$Profile,
        [string]$UserDataDir,
        [string]$TargetUrl
    )

    Assert-SafeArgumentValue -Value $Profile -Name 'Profile directory'
    Assert-SafeArgumentValue -Value $TargetUrl -Name 'URL'

    $arguments = New-Object System.Collections.Generic.List[string]
    $arguments.Add('--profile-directory=' + (ConvertTo-WindowsQuotedArgument $Profile))
    if (-not [string]::IsNullOrWhiteSpace($UserDataDir)) {
        Assert-SafeArgumentValue -Value $UserDataDir -Name 'User-data directory'
        $arguments.Add('--user-data-dir=' + (ConvertTo-WindowsQuotedArgument $UserDataDir))
    }
    $arguments.Add('--new-window')
    $arguments.Add((ConvertTo-WindowsQuotedArgument $TargetUrl))
    return $arguments -join ' '
}

function Get-EdgeWindowSnapshot {
    param([string]$ExpectedExecutablePath)

    Initialize-WindowApi
    return @([Ppbui.DualEdge.NativeWindow]::GetEdgeWindows() | Where-Object {
        [string]::Equals(
            $_.ExecutablePath,
            $ExpectedExecutablePath,
            [StringComparison]::OrdinalIgnoreCase
        )
    })
}

function New-HandleSet {
    param([object[]]$Windows)

    $set = New-Object 'System.Collections.Generic.HashSet[long]'
    foreach ($window in $Windows) {
        if ($null -eq $window -or $null -eq $window.Handle) {
            continue
        }
        [void]$set.Add($window.Handle.ToInt64())
    }
    Write-Output -NoEnumerate $set
}

function Wait-NewEdgeWindow {
    param(
        [System.Collections.Generic.HashSet[long]]$KnownHandles,
        [string]$ExpectedExecutablePath,
        [int]$TimeoutSeconds
    )

    if ($null -eq $KnownHandles) {
        $KnownHandles = New-Object 'System.Collections.Generic.HashSet[long]'
    }

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    $stableHandle = $null
    $stablePolls = 0
    $lastCandidateSummary = 'none'
    do {
        $candidates = @(Get-EdgeWindowSnapshot -ExpectedExecutablePath $ExpectedExecutablePath | Where-Object {
            -not $KnownHandles.Contains($_.Handle.ToInt64()) -and
            $_.Title -notmatch '^DevTools\s*-'
        } | Sort-Object @{ Expression = { $_.Width * $_.Height }; Descending = $true })

        $lastCandidateSummary = if ($candidates.Count -eq 0) {
            'none'
        } else {
            ($candidates | ForEach-Object {
                "0x$($_.Handle.ToInt64().ToString('X')) '$($_.Title)'"
            }) -join ', '
        }

        if ($candidates.Count -eq 1) {
            $candidateHandle = $candidates[0].Handle.ToInt64()
            if ($stableHandle -eq $candidateHandle) {
                $stablePolls++
            } else {
                $stableHandle = $candidateHandle
                $stablePolls = 1
            }

            if ($stablePolls -ge 3) {
                return $candidates[0]
            }
        } else {
            $stableHandle = $null
            $stablePolls = 0
        }

        Start-Sleep -Milliseconds 100
    } while ([DateTime]::UtcNow -lt $deadline)

    throw "A single stable new Edge window was not detected within $TimeoutSeconds seconds. Last candidates: $lastCandidateSummary"
}

function Move-WorkspaceWindow {
    param(
        [object]$Window,
        [pscustomobject]$Rectangle
    )

    $moved = [Ppbui.DualEdge.NativeWindow]::Move(
        $Window.Handle,
        $Rectangle.X,
        $Rectangle.Y,
        $Rectangle.Width,
        $Rectangle.Height
    )

    if (-not $moved) {
        throw "Failed to position Edge window '$($Window.Title)'."
    }
}

if ($PSCmdlet.ParameterSetName -eq 'Profiles') {
    Show-EdgeProfiles -UserDataDir $ProfilesUserDataDir
    return
}

$resolvedEdgePath = Resolve-EdgeExecutable -RequestedPath $EdgePath
$leftProfileInfo = Resolve-EdgeProfile -UserDataDir $LeftUserDataDir -ProfileSelector $LeftProfile
$rightProfileInfo = Resolve-EdgeProfile -UserDataDir $RightUserDataDir -ProfileSelector $RightProfile
$sameUserDataRoot = [string]::Equals(
    $leftProfileInfo.UserDataRoot,
    $rightProfileInfo.UserDataRoot,
    [StringComparison]::OrdinalIgnoreCase
)
$sameProfileDirectory = [string]::Equals(
    $leftProfileInfo.Directory,
    $rightProfileInfo.Directory,
    [StringComparison]::OrdinalIgnoreCase
)
if ($sameUserDataRoot -and $sameProfileDirectory) {
    throw 'Left and right sessions resolve to the same Edge profile. Select two distinct existing profiles.'
}

$leftLaunchUserDataDir = if ([string]::IsNullOrWhiteSpace($LeftUserDataDir)) {
    $null
} else {
    $leftProfileInfo.UserDataRoot
}
$rightLaunchUserDataDir = if ([string]::IsNullOrWhiteSpace($RightUserDataDir)) {
    $null
} else {
    $rightProfileInfo.UserDataRoot
}

$workArea = Get-MonitorWorkArea -Index $Monitor -DeviceName $MonitorDeviceName
$rectangles = Get-GridRectangles -Area $workArea -Mode $Layout -GapPixels $Gap -SplitRatio $Split
$leftArguments = New-EdgeArgumentString -Profile $leftProfileInfo.Directory -UserDataDir $leftLaunchUserDataDir -TargetUrl $Url
$rightArguments = New-EdgeArgumentString -Profile $rightProfileInfo.Directory -UserDataDir $rightLaunchUserDataDir -TargetUrl $Url

if ($DryRun) {
    [pscustomobject]@{
        EdgePath = $resolvedEdgePath
        DeviceName = $workArea.DeviceName
        PrimaryMonitor = $workArea.Primary
        Layout = $Layout
        Gap = $Gap
        Split = $Split
        Url = $Url
        LeftProfile = $leftProfileInfo.Directory
        LeftUserDataRoot = $leftProfileInfo.UserDataRoot
        RightProfile = $rightProfileInfo.Directory
        RightUserDataRoot = $rightProfileInfo.UserDataRoot
        LeftRectangle = "$($rectangles[0].X),$($rectangles[0].Y) $($rectangles[0].Width)x$($rectangles[0].Height)"
        RightRectangle = "$($rectangles[1].X),$($rectangles[1].Y) $($rectangles[1].Width)x$($rectangles[1].Height)"
        LeftArguments = $leftArguments
        RightArguments = $rightArguments
    } | Format-List
    return
}

$beforeLeft = New-HandleSet -Windows (Get-EdgeWindowSnapshot -ExpectedExecutablePath $resolvedEdgePath)
Start-Process -FilePath $resolvedEdgePath -ArgumentList $leftArguments | Out-Null
$leftWindow = Wait-NewEdgeWindow -KnownHandles $beforeLeft -ExpectedExecutablePath $resolvedEdgePath -TimeoutSeconds $WindowTimeoutSeconds

$beforeRight = New-HandleSet -Windows (Get-EdgeWindowSnapshot -ExpectedExecutablePath $resolvedEdgePath)
Start-Process -FilePath $resolvedEdgePath -ArgumentList $rightArguments | Out-Null
$rightWindow = Wait-NewEdgeWindow -KnownHandles $beforeRight -ExpectedExecutablePath $resolvedEdgePath -TimeoutSeconds $WindowTimeoutSeconds

Move-WorkspaceWindow -Window $leftWindow -Rectangle $rectangles[0]
Move-WorkspaceWindow -Window $rightWindow -Rectangle $rectangles[1]

[pscustomobject]@{
    Monitor = $workArea.DeviceName
    Layout = $Layout
    LeftProfile = $LeftProfile
    LeftWindow = $leftWindow.Title
    RightProfile = $RightProfile
    RightWindow = $rightWindow.Title
} | Format-List
