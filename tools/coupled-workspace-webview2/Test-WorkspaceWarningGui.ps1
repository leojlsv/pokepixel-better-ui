# Opt-in local WinForms-only check of the warning method in a frozen synthetic
# candidate. No PokePixel page, browser profile or normal host is launched.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$')]
    [string]$CampaignId,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-fA-F0-9]{64}$')]
    [string]$ExpectedManifestSha256,

    [ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9_-]{0,24}$')]
    [string]$EvidenceId = 'original'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not [Environment]::UserInteractive) { throw 'A real interactive Windows desktop is required.' }
$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $toolDir '..\..')).Path
$tuple = Join-Path $repoRoot ('.local-evidence\coupled-webview2-perf\tuples\' + $CampaignId)
& (Join-Path $toolDir 'Freeze-PerformanceTuple.ps1') -CampaignId $CampaignId -Verify `
    -ExpectedManifestSha256 $ExpectedManifestSha256 | Out-Null
$candidate = Join-Path $tuple 'tools\coupled-workspace-webview2\bin\PokePixelCoupledWorkspace.candidate.exe'
if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { throw 'Frozen candidate not found.' }
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $csc -PathType Leaf)) { throw 'C# compiler not found.' }

$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
$fixture = Join-Path $tempRoot ('ppbui-owned-warning-' + [guid]::NewGuid().ToString('N'))
$source = Join-Path $fixture 'OwnedWarning.cs'
$exe = Join-Path $fixture 'OwnedWarning.exe'
$stdout = Join-Path $fixture 'stdout.txt'
$stderr = Join-Path $fixture 'stderr.txt'
$screenshot = Join-Path $tuple ('measurements\owned-warning-gui-' + $EvidenceId + '.png')
if (Test-Path -LiteralPath $screenshot) { throw 'Refusing to overwrite existing GUI evidence.' }

try {
    New-Item -ItemType Directory -Path $fixture -ErrorAction Stop | Out-Null
    $harness = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

internal static class OwnedWarning
{
    private delegate bool Enumerate(IntPtr handle, IntPtr param);
    [DllImport("user32.dll")] private static extern bool EnumWindows(Enumerate callback, IntPtr param);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr handle, StringBuilder text, int count);
    [DllImport("user32.dll")] private static extern IntPtr GetWindow(IntPtr handle, uint command);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr handle);
    [DllImport("user32.dll")] private static extern bool IsWindow(IntPtr handle);
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern IntPtr GetDlgItem(IntPtr handle, int id);
    [DllImport("user32.dll")] private static extern bool PostMessage(IntPtr handle, uint message, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr handle, out RectangleNative rect);
    [DllImport("user32.dll")] private static extern bool PrintWindow(IntPtr handle, IntPtr dc, uint flags);
    [StructLayout(LayoutKind.Sequential)] private struct RectangleNative
    { public int Left, Top, Right, Bottom; }

    private const string WarningTitle = "PokePixel Better UI - prefer\u00eancias n\u00e3o salvas";
    private static IntPtr owner;
    private static IntPtr dialog;
    private static int sawOwned, sawVisible, sawForeground, sawOk, closed;
    private static int keySent, keyClosed, fallbackSent, screenshotCaptured;
    private static DateTime keyAt;
    private static string screenshotPath;
    private static Exception callbackError;

    private static IntPtr FindOurWarning()
    {
        IntPtr found = IntPtr.Zero;
        EnumWindows((handle, param) =>
        {
            var caption = new StringBuilder(300);
            GetWindowText(handle, caption, caption.Capacity);
            if (caption.ToString() == WarningTitle && GetWindow(handle, 4) == owner)
            {
                found = handle;
                return false;
            }
            return true;
        }, IntPtr.Zero);
        return found;
    }

    private static void CaptureDialog(IntPtr handle)
    {
        RectangleNative rect;
        if (!GetWindowRect(handle, out rect)) return;
        var width = rect.Right - rect.Left;
        var height = rect.Bottom - rect.Top;
        if (width < 150 || height < 80 || width > 2000 || height > 1400) return;
        using (var bitmap = new Bitmap(width, height))
        using (var graphics = Graphics.FromImage(bitmap))
        {
            var dc = graphics.GetHdc();
            bool copied;
            try { copied = PrintWindow(handle, dc, 0); }
            finally { graphics.ReleaseHdc(dc); }
            if (!copied) return;
            bitmap.Save(screenshotPath, ImageFormat.Png);
            Interlocked.Exchange(ref screenshotCaptured, 1);
        }
    }

    private static void Probe(object state)
    {
        try
        {
            if (dialog == IntPtr.Zero) dialog = FindOurWarning();
            if (dialog == IntPtr.Zero) return;
            Interlocked.Exchange(ref sawOwned, 1);
            if (IsWindowVisible(dialog)) Interlocked.Exchange(ref sawVisible, 1);
            if (GetForegroundWindow() == dialog) Interlocked.Exchange(ref sawForeground, 1);
            if (GetDlgItem(dialog, 1) != IntPtr.Zero) Interlocked.Exchange(ref sawOk, 1);
            if (Interlocked.CompareExchange(ref keySent, 1, 0) == 0)
            {
                CaptureDialog(dialog);
                keyAt = DateTime.UtcNow;
                // Address only the verified dialog HWND; no system-wide key input.
                PostMessage(dialog, 0x100, new IntPtr(13), new IntPtr(0x001C0001));
                PostMessage(dialog, 0x101, new IntPtr(13), new IntPtr(unchecked((int)0xC01C0001)));
            }
            else if (!IsWindow(dialog))
                Interlocked.Exchange(ref keyClosed, 1);
            else if ((DateTime.UtcNow - keyAt).TotalMilliseconds > 600
                && Interlocked.CompareExchange(ref fallbackSent, 1, 0) == 0)
                PostMessage(dialog, 0x111, new IntPtr(1), IntPtr.Zero); // Own default OK button.
        }
        catch (Exception error) { callbackError = error; }
    }

    [STAThread]
    public static int Main(string[] args)
    {
        if (args.Length != 2) return 2;
        screenshotPath = args[1];
        var loaded = Assembly.LoadFrom(args[0]);
        var formClass = loaded.GetType("PokePixel.CoupledWorkspace.WorkspaceForm", true);
        var warn = formClass.GetMethod("WarnAboutUnsavedWorkspaceSettings",
            BindingFlags.Static | BindingFlags.NonPublic);
        if (warn == null || warn.GetParameters().Length != 1 ||
            warn.GetParameters()[0].ParameterType != typeof(IWin32Window))
            throw new InvalidOperationException("Owned production warning method is unavailable.");
        Application.EnableVisualStyles();
        using (var form = new Form())
        using (var probe = new System.Threading.Timer(Probe, null, Timeout.Infinite, Timeout.Infinite))
        {
            form.Text = "LOCAL-ONLY SYNTHETIC WORKSPACE WARNING PROBE";
            form.Width = 460;
            form.Height = 160;
            form.StartPosition = FormStartPosition.CenterScreen;
            form.ShowInTaskbar = true;
            form.Controls.Add(new Label {
                Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter,
                Text = "Synthetic local warning probe; no game or user profiles."
            });
            form.Shown += (sender, e) =>
            {
                owner = form.Handle;
                form.Activate();
                probe.Change(40, 40);
                form.BeginInvoke(new Action(form.Close));
            };
            // Invoke the EXACT compiled host's warning method while our local
            // owner's FormClosing handle is still valid, as the normal host does.
            form.FormClosing += (sender, e) => warn.Invoke(null, new object[] { form });
            form.FormClosed += (sender, e) => Interlocked.Exchange(ref closed, 1);
            Application.Run(form);
            probe.Change(Timeout.Infinite, Timeout.Infinite);
        }
        if (dialog != IntPtr.Zero && !IsWindow(dialog) && keySent == 1 && fallbackSent == 0)
            Interlocked.Exchange(ref keyClosed, 1);
        if (callbackError != null) throw callbackError;
        if (sawOwned == 0 || sawVisible == 0 || closed == 0 || keyClosed == 0)
            throw new InvalidOperationException("Owned warning assertion failed: owned=" + sawOwned
                + ",visible=" + sawVisible + ",foreground=" + sawForeground + ",ok=" + sawOk
                + ",formClosed=" + closed + ",keyClosed=" + keyClosed + ",fallback=" + fallbackSent);
        Console.WriteLine("OWNED SETTINGS WARNING GUI PASS: HWND owner, visible dialog, OK control, FormClosed, screenshot="
            + screenshotCaptured + ", foregroundObserved=" + sawForeground + ", enterDismissed=" + keyClosed
            + ", fallbackUsed=" + fallbackSent);
        return 0;
    }
}
'@
    [IO.File]::WriteAllText($source, $harness, (New-Object System.Text.UTF8Encoding($false)))
    $compilerArgs = @(
        '/nologo', '/target:exe', '/platform:x64',
        '/reference:System.dll', '/reference:System.Core.dll',
        '/reference:System.Drawing.dll', '/reference:System.Windows.Forms.dll',
        ('/out:' + $exe), $source
    )
    & $csc @compilerArgs
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $exe -PathType Leaf)) {
        throw 'Unable to compile the local Windows warning probe.'
    }
    $process = Start-Process -FilePath $exe -ArgumentList @('"' + $candidate + '"', '"' + $screenshot + '"') `
        -WorkingDirectory (Split-Path -Parent $candidate) -PassThru `
        -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    try {
        if (-not $process.WaitForExit(12000)) {
            $process.Kill()
            throw 'Synthetic owned warning did not exit within 12 seconds.'
        }
        $process.Refresh()
        $outText = Get-Content -LiteralPath $stdout -Raw -ErrorAction SilentlyContinue
        $errorText = Get-Content -LiteralPath $stderr -Raw -ErrorAction SilentlyContinue
        if (($null -ne $process.ExitCode -and $process.ExitCode -ne 0) -or
            $outText -notmatch 'OWNED SETTINGS WARNING GUI PASS:' -or
            -not [string]::IsNullOrWhiteSpace($errorText)) {
            throw "Synthetic warning failed (exit $($process.ExitCode)): $errorText"
        }
        Write-Output $outText.Trim()
    }
    finally {
        $process.Dispose()
    }
}
finally {
    $prefix = $tempRoot + '\'
    if (-not $fixture.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -or
        -not ([IO.Path]::GetFileName($fixture)).StartsWith('ppbui-owned-warning-',
            [StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe synthetic warning cleanup path: $fixture"
    }
    if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}
