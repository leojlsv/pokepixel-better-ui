[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$')]
    [string]$CampaignId,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-fA-F0-9]{64}$')]
    [string]$ExpectedManifestSha256,

    [ValidateRange(200, 5000)]
    [int]$SampleMs = 1000,

    [ValidateRange(5, 900)]
    [int]$MaxSeconds = 30,

    [ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$')]
    [string]$RunId = 'smoke01',

    [switch]$PerfMetrics,

    # Separate performance core smoke. Full visual snapshot smoke remains a
    # different explicit gate and must not be marked PASS by this mode.
    [switch]$CorePerfSmoke,
    [switch]$CoreCycleSmoke,
    [switch]$VisibleFocusSmoke,
    [switch]$IdlePreflightSmoke,
    [switch]$ExtendedVisualSmoke,
    [switch]$IdleCards,
    [switch]$IdleGame,
    [switch]$IdleMixed
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$variantCount = 0
foreach ($variant in @($CorePerfSmoke, $CoreCycleSmoke, $VisibleFocusSmoke, $IdlePreflightSmoke, $ExtendedVisualSmoke, $IdleCards, $IdleGame, $IdleMixed)) {
    if ($variant) { $variantCount++ }
}
if ($variantCount -gt 1) {
    throw 'Choose exactly one synthetic performance variant.'
}
if ($MaxSeconds -gt 60 -and -not ($CoreCycleSmoke -or $VisibleFocusSmoke -or $ExtendedVisualSmoke -or $IdleCards -or $IdleGame -or $IdleMixed)) {
    throw 'Extended synthetic process budget requires an extended synthetic mode.'
}
if (($IdleCards -or $IdleGame -or $IdleMixed) -and $MaxSeconds -lt 660) {
    throw 'Idle performance smoke requires at least 660 seconds of external budget for a 600-second idle window plus startup/teardown margin.'
}
if (($IdleCards -or $IdleGame -or $IdleMixed) -and $PerfMetrics) {
    throw 'Idle performance smoke uses the OS sampler and idle-ready marker; omit -PerfMetrics to avoid redirected-output coupling.'
}
if ($VisibleFocusSmoke -and (-not $PerfMetrics -or $MaxSeconds -lt 100)) {
    throw 'Visible local focus requires opt-in -PerfMetrics and a bounded external budget of at least 100s.'
}
if ($IdlePreflightSmoke -and -not $PerfMetrics) {
    throw 'Idle mode/root preflight requires opt-in -PerfMetrics to capture the explicit marker.'
}
if ($ExtendedVisualSmoke -and (-not $PerfMetrics -or $MaxSeconds -lt 90)) {
    throw 'Extended visual smoke requires opt-in -PerfMetrics and an explicit >=90s external budget.'
}

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$collectorSha256 = (Get-FileHash -LiteralPath $MyInvocation.MyCommand.Path -Algorithm SHA256).Hash
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $toolDir '..\..')).Path
$campaignRoot = Join-Path $repoRoot ('.local-evidence\coupled-webview2-perf\tuples\' + $CampaignId)
$manifestPath = Join-Path $campaignRoot 'tuple-manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw 'Missing frozen tuple manifest.' }
$manifest = Get-Content -LiteralPath $manifestPath -Encoding UTF8 -Raw | ConvertFrom-Json
$name = [string]$manifest.hostExecutable
if ($name -notin @(
    'PokePixelCoupledWorkspace.candidate.exe', 'PokePixelCoupledWorkspace.exe',
    'PokePixelCoupledWorkspace.pptools.candidate.exe', 'PokePixelCoupledWorkspace.evidence-probe.exe'
)) { throw 'Unexpected executable in frozen tuple.' }

# This script can start ONLY a cryptographically verified, campaign-local
# host with --smoke. It never enumerates or profiles a user's running game.
& (Join-Path $toolDir 'Freeze-PerformanceTuple.ps1') -CampaignId $CampaignId -HostExeName $name -Verify -ExpectedManifestSha256 $ExpectedManifestSha256 | Out-Null
$exe = Join-Path $campaignRoot ('tools\coupled-workspace-webview2\bin\' + $name)
$reportDir = Join-Path $campaignRoot 'measurements'
$reportPath = Join-Path $reportDir ($RunId + '.json')
if (Test-Path -LiteralPath $reportPath) { throw "Measurement already exists: $reportPath" }

# Keep one native process handle open while checking identity and terminating
# an owned renderer. A Process object fetched by PID can reopen its handle
# during Kill(), after that PID has already been recycled.
if (-not ('CWPerfScopedNativeProcess' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class CWPerfScopedNativeProcess {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern SafeProcessHandle OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GetProcessTimes(SafeProcessHandle handle, out long created, out long exited, out long kernel, out long user);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool TerminateProcess(SafeProcessHandle handle, uint code);
}
'@
}

function Test-SameProcessBirth([datetime]$left, [datetime]$right) {
    # CIM_DATETIME stores microseconds; .NET/FILETIME stores 100ns ticks.
    # Ignore only the sub-microsecond precision that CIM cannot represent.
    return [math]::Abs($left.ToFileTimeUtc() - $right.ToFileTimeUtc()) -lt 10
}

function Get-DescendantIds([int]$rootId, [datetime]$rootBornUtc, [ref]$birthById) {
    # Only query children of the synthetic process and its verified WebView2
    # descendants. Never enumerate all OS processes, user browser instances,
    # their command lines, or unrelated game sessions.
    $seen = New-Object 'System.Collections.Generic.Dictionary[int,datetime]'
    $seen.Add($rootId, $rootBornUtc)
    $frontier = @($rootId)
    for ($depth = 0; $depth -lt 8 -and $frontier.Count -gt 0; $depth++) {
        $next = New-Object 'System.Collections.Generic.List[int]'
        foreach ($parentId in $frontier) {
            # Fetch the parent and its direct children together. A recycled
            # parent PID must never turn unrelated children into owned PIDs.
            $family = @(Get-CimInstance Win32_Process -Filter (
                'ProcessId = ' + [int]$parentId + ' OR ParentProcessId = ' + [int]$parentId
            ) -ErrorAction Stop)
            $matchingParent = @($family | Where-Object { [int]$_.ProcessId -eq [int]$parentId })
            if ($matchingParent.Count -ne 1 -or
                -not (Test-SameProcessBirth (([datetime]$matchingParent[0].CreationDate).ToUniversalTime()) ($seen[[int]$parentId]))) { continue }
            $parentNow = Get-Process -Id $parentId -ErrorAction SilentlyContinue
            if ($null -eq $parentNow) { continue }
            try {
                if (-not (Test-SameProcessBirth ($parentNow.StartTime.ToUniversalTime()) ($seen[[int]$parentId]))) { continue }
            } catch [InvalidOperationException] {
                continue
            } catch [System.ComponentModel.Win32Exception] {
                continue
            }
            $children = @($family | Where-Object { [int]$_.ParentProcessId -eq [int]$parentId })
            foreach ($child in $children) {
                $childId = [int]$child.ProcessId
                if ($seen.ContainsKey($childId) -or $child.Name -ine 'msedgewebview2.exe') { continue }
                $bornUtc = ([datetime]$child.CreationDate).ToUniversalTime()
                if ($bornUtc -lt $seen[[int]$parentId] -or $bornUtc -lt $rootBornUtc) { continue }
                $seen.Add($childId, $bornUtc)
                $next.Add($childId)
            }
        }
        $frontier = @($next.ToArray())
    }
    $birthById.Value = $seen
    return @($seen.Keys)
}

$launch = New-Object System.Diagnostics.ProcessStartInfo
$launch.FileName = $exe
$launch.Arguments = '--smoke'
if ($CorePerfSmoke) { $launch.Arguments += ' --smoke-perf-baseline' }
if ($CoreCycleSmoke) { $launch.Arguments += ' --smoke-perf-cycles' }
if ($VisibleFocusSmoke) { $launch.Arguments += ' --smoke-perf-focus-visible' }
if ($IdlePreflightSmoke) { $launch.Arguments += ' --smoke-perf-idle-preflight' }
if ($ExtendedVisualSmoke) { $launch.Arguments += ' --smoke-visual-extended' }
if ($IdleCards) { $launch.Arguments += ' --smoke-perf-idle-cards' }
if ($IdleGame) { $launch.Arguments += ' --smoke-perf-idle-game' }
if ($IdleMixed) { $launch.Arguments += ' --smoke-perf-idle-mixed' }
if ($PerfMetrics) { $launch.Arguments += ' --perf-metrics' }
$launch.WorkingDirectory = Split-Path -Parent $exe
$launch.UseShellExecute = $false
$captureOutput = [bool]($PerfMetrics -or $CorePerfSmoke -or $CoreCycleSmoke)
$idleReadyMarker = Join-Path (Split-Path -Parent $exe) 'smoke\perf-idle-ready.txt'
$idlePassMarker = Join-Path (Split-Path -Parent $exe) 'smoke\perf-idle-pass.txt'
if (($IdleCards -or $IdleGame -or $IdleMixed) -and (Test-Path -LiteralPath $idleReadyMarker -PathType Leaf)) {
    Remove-Item -LiteralPath $idleReadyMarker -Force -ErrorAction Stop
}
if (($IdleCards -or $IdleGame -or $IdleMixed) -and (Test-Path -LiteralPath $idlePassMarker -PathType Leaf)) {
    Remove-Item -LiteralPath $idlePassMarker -Force -ErrorAction Stop
}
$launch.RedirectStandardOutput = $captureOutput
$launch.RedirectStandardError = $captureOutput
if ($captureOutput) {
    $stdout = Join-Path $reportDir ($RunId + '.perf.stdout.txt')
    $stderr = Join-Path $reportDir ($RunId + '.perf.stderr.txt')
    if ((Test-Path -LiteralPath $stdout) -or (Test-Path -LiteralPath $stderr)) {
        throw 'Instrumented synthetic stdout/stderr already exists; refusing to overwrite.'
    }
    [void][IO.Directory]::CreateDirectory($reportDir)
}
$process = New-Object System.Diagnostics.Process
$process.StartInfo = $launch
if (-not $process.Start()) { throw 'Unable to start verified synthetic smoke.' }
$stdoutTask = if ($captureOutput) { $process.StandardOutput.ReadToEndAsync() } else { $null }
$stderrTask = if ($captureOutput) { $process.StandardError.ReadToEndAsync() } else { $null }
$rootStartUtc = $process.StartTime.ToUniversalTime()
$timer = [Diagnostics.Stopwatch]::StartNew()
$samples = New-Object System.Collections.Generic.List[object]
$idleReadyObserved = $false
$idleReadyElapsedMs = $null
$idlePassObserved = $false
$idlePassElapsedMs = $null
$idleHostDurationMs = $null
$ownedDescendantSnapshot = @()
$verifiedChildBirths = New-Object 'System.Collections.Generic.Dictionary[int,datetime]'
$samplerCleanupError = $null
$previousCpu = $null
$previousAt = $null
$timedOut = $false
try {
    while ($true) {
        if ($timer.Elapsed.TotalSeconds -ge $MaxSeconds) { $timedOut = $true; break }
        $observedBirths = $null
        $ids = @(Get-DescendantIds $process.Id $rootStartUtc ([ref]$observedBirths))
        $processes = @(
            foreach ($ownedId in $ids) {
                $candidate = Get-Process -Id $ownedId -ErrorAction SilentlyContinue
                if ($null -eq $candidate) { continue }
                try {
                    if (-not (Test-SameProcessBirth ($candidate.StartTime.ToUniversalTime()) ($observedBirths[[int]$ownedId])) -or
                        ($ownedId -ne $process.Id -and $candidate.ProcessName -ine 'msedgewebview2')) { continue }
                    if ($ownedId -ne $process.Id) { $verifiedChildBirths[[int]$ownedId] = $observedBirths[[int]$ownedId] }
                    $candidate
                } catch [InvalidOperationException] {
                } catch [System.ComponentModel.Win32Exception] {
                }
            }
        )
        $cpuSeconds = 0.0
        $privateBytes = 0L
        $workingSetBytes = 0L
        $handleCount = 0
        $threadCount = 0
        $exitedWhileSampling = 0
        foreach ($item in $processes) {
            try {
                # Chromium renderers can exit between Get-Process and the
                # individual properties. Capture a complete per-PID sample
                # before adding anything, never dereference a null Threads
                # collection in StrictMode, and report unavailable PIDs.
                $cpu = $item.TotalProcessorTime.TotalSeconds
                $privateSize = $item.PrivateMemorySize64
                $workingSize = $item.WorkingSet64
                $handles = $item.HandleCount
                $threads = $item.Threads
                if ($null -eq $threads) {
                    $exitedWhileSampling++
                    continue
                }
                $threadsInProcess = $threads.Count
                $cpuSeconds += $cpu
                $privateBytes += $privateSize
                $workingSetBytes += $workingSize
                $handleCount += $handles
                $threadCount += $threadsInProcess
            } catch [InvalidOperationException] {
                $exitedWhileSampling++
            } catch [System.ComponentModel.Win32Exception] {
                $exitedWhileSampling++
            } catch [System.Management.Automation.PropertyNotFoundException] {
                # StrictMode exposes null/missing process properties as a
                # property-not-found error after a renderer exits. Do not
                # swallow an unexpected property error on a running process.
                try {
                    if (-not $item.HasExited) { throw }
                } catch [InvalidOperationException] { }
                $exitedWhileSampling++
            }
        }
        $at = $timer.Elapsed.TotalSeconds
        if (($IdleCards -or $IdleGame -or $IdleMixed) -and -not $idleReadyObserved -and (Test-Path -LiteralPath $idleReadyMarker -PathType Leaf)) {
            $idleReadyObserved = $true
            $idleReadyElapsedMs = [math]::Round($timer.Elapsed.TotalMilliseconds, 3)
            # The expensive descendant discovery/snapshot above happened
            # BEFORE observing READY. It must NOT become a post-READY sample.
            # Instead refresh only those just-verified owned process IDs
            # AFTER observing the marker. This genuine measurement is a
            # resource anchor, not a CPU-rate sample: there is no previous
            # post-READY CPU baseline. Subsequent normal rows derive their
            # first valid CPU delta from this anchor.
            $anchorCpu = 0.0
            $anchorPrivate = 0L
            $anchorWorking = 0L
            $anchorHandles = 0
            $anchorThreads = 0
            $anchorCount = 0
            $anchorExits = 0
            foreach ($ownedId in $ids) {
                $owned = Get-Process -Id $ownedId -ErrorAction SilentlyContinue
                if ($null -eq $owned) { $anchorExits++; continue }
                try {
                    $bornUtc = $owned.StartTime.ToUniversalTime()
                    if (-not (Test-SameProcessBirth $bornUtc ($observedBirths[[int]$ownedId]))) { $anchorExits++; continue }
                    if ($ownedId -ne $process.Id -and $owned.ProcessName -ine 'msedgewebview2') {
                        $anchorExits++
                        continue
                    }
                    $ownedThreads = $owned.Threads
                    if ($null -eq $ownedThreads) { $anchorExits++; continue }
                    $anchorCpu += $owned.TotalProcessorTime.TotalSeconds
                    $anchorPrivate += $owned.PrivateMemorySize64
                    $anchorWorking += $owned.WorkingSet64
                    $anchorHandles += $owned.HandleCount
                    $anchorThreads += $ownedThreads.Count
                    $anchorCount++
                } catch [InvalidOperationException] {
                    $anchorExits++
                } catch [System.ComponentModel.Win32Exception] {
                    $anchorExits++
                } catch [System.Management.Automation.PropertyNotFoundException] {
                    $anchorExits++
                }
            }
            $anchorAt = $timer.Elapsed.TotalSeconds
            if ($anchorCount -gt 0) {
                $samples.Add([pscustomobject]@{
                    elapsedMs = [math]::Round($anchorAt * 1000, 3)
                    processCount = $anchorCount
                    privateMiB = [math]::Round($anchorPrivate / 1MB, 3)
                    workingSetMiBSum = [math]::Round($anchorWorking / 1MB, 3)
                    cpuMachinePercent = $null
                    readyAnchor = $true
                    handles = $anchorHandles
                    threads = $anchorThreads
                    processesExitedDuringSampling = $anchorExits
                })
                $previousCpu = $anchorCpu
                $previousAt = $anchorAt
            } else {
                # Preserve the negative evidence: zero genuine live process
                # anchors cannot satisfy the downstream steady-state audit.
                $previousCpu = $cpuSeconds
                $previousAt = $at
            }
            continue
        }
        if (($IdleCards -or $IdleGame -or $IdleMixed) -and $idleReadyObserved -and -not $idlePassObserved -and (Test-Path -LiteralPath $idlePassMarker -PathType Leaf)) {
            $idlePassObserved = $true
            $idlePassElapsedMs = [math]::Round($at * 1000, 3)
            $passLines = @(Get-Content -LiteralPath $idlePassMarker -ErrorAction Stop)
            $parsedDuration = 0.0
            if ($passLines.Count -eq 2 -and
                [double]::TryParse($passLines[1], [System.Globalization.NumberStyles]::Float,
                    [System.Globalization.CultureInfo]::InvariantCulture, [ref]$parsedDuration) -and
                -not [double]::IsNaN($parsedDuration) -and -not [double]::IsInfinity($parsedDuration)) {
                $idleHostDurationMs = $parsedDuration
            }
        }
        if (($IdleCards -or $IdleGame -or $IdleMixed) -and -not $idleReadyObserved) {
            $process.Refresh()
            if ($process.HasExited) { break }
            Start-Sleep -Milliseconds $SampleMs
            continue
        }
        $cpuPctOfMachine = $null
        if ($previousAt -ne $null -and $at -gt $previousAt) {
            $deltaCpu = [math]::Max(0.0, ($cpuSeconds - $previousCpu))
            $cpuPctOfMachine = [math]::Round((100.0 * $deltaCpu / (($at - $previousAt) * [Environment]::ProcessorCount)), 3)
        }
        $samples.Add([pscustomobject]@{
            elapsedMs = [math]::Round($at * 1000, 3)
            processCount = $processes.Count
            privateMiB = [math]::Round($privateBytes / 1MB, 3)
            workingSetMiBSum = [math]::Round($workingSetBytes / 1MB, 3)
            cpuMachinePercent = $cpuPctOfMachine
            handles = $handleCount
            threads = $threadCount
            processesExitedDuringSampling = $exitedWhileSampling
        })
        $previousCpu = $cpuSeconds
        $previousAt = $at
        $process.Refresh()
        if ($process.HasExited) { break }
        Start-Sleep -Milliseconds $SampleMs
    }
} finally {
    # A smoke that fails to terminate is not a benchmark. Capture the
    # synthetic WebView2 descendants before terminating the owned root so
    # redirected stdout/stderr handles cannot keep the sampler blocked.
    $cleanupBirths = $null
    try {
        $ownedDescendants = @(Get-DescendantIds $process.Id $rootStartUtc ([ref]$cleanupBirths) | Where-Object { $_ -ne $process.Id })
        foreach ($childId in $ownedDescendants) {
            $verifiedChildBirths[[int]$childId] = $cleanupBirths[[int]$childId]
        }
    } catch {
        # Even if the CIM snapshot fails, terminate only our retained root
        # process handle and preserve already verified descendant identities.
        $samplerCleanupError = $_.Exception.Message
    }
    try {
        $ownedDescendantSnapshot = @(
            foreach ($childId in $verifiedChildBirths.Keys) {
                $child = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + [int]$childId) -ErrorAction Stop
                if ($child -ne $null -and $child.Name -ieq 'msedgewebview2.exe' -and
                    (Test-SameProcessBirth (([datetime]$child.CreationDate).ToUniversalTime()) ($verifiedChildBirths[[int]$childId]))) {
                    [pscustomobject]@{
                        id = [int]$child.ProcessId
                        creationUtc = $verifiedChildBirths[[int]$childId]
                    }
                }
            }
        )
    } catch {
        if ($null -eq $samplerCleanupError) { $samplerCleanupError = $_.Exception.Message }
    }
    $rootWasRunning = $true
    try {
        $process.Refresh()
        $rootWasRunning = -not $process.HasExited
    } catch {
        if ($null -eq $samplerCleanupError) { $samplerCleanupError = $_.Exception.Message }
    }
    if ($rootWasRunning) {
        try { $process.Kill() } catch {
            if ($null -eq $samplerCleanupError) { $samplerCleanupError = $_.Exception.Message }
        }
        try { $process.WaitForExit(2000) | Out-Null } catch {
            if ($null -eq $samplerCleanupError) { $samplerCleanupError = $_.Exception.Message }
        }
    } elseif ($ownedDescendantSnapshot.Count -gt 0) {
        Start-Sleep -Milliseconds 1000
    }
    foreach ($snapshot in $ownedDescendantSnapshot) {
        # Open once with terminate + query rights. Query creation time AND
        # terminate through this same retained kernel handle, which cannot
        # switch to a new process even if the PID is subsequently recycled.
        $handle = [CWPerfScopedNativeProcess]::OpenProcess(0x1001, $false, [uint32]$snapshot.id)
        if ($null -eq $handle) { continue }
        try {
            if ($handle.IsInvalid -or $handle.IsClosed) { continue }
            [long]$created = 0
            [long]$exited = 0
            [long]$kernel = 0
            [long]$user = 0
            if (-not [CWPerfScopedNativeProcess]::GetProcessTimes($handle, [ref]$created, [ref]$exited, [ref]$kernel, [ref]$user)) { continue }
            if ([math]::Abs($created - $snapshot.creationUtc.ToFileTimeUtc()) -ge 10) { continue }
            [void][CWPerfScopedNativeProcess]::TerminateProcess($handle, [uint32]1)
        } catch {
            # Any failed identity check or OS access is a refusal to kill;
            # the post-cleanup survivor check will preserve negative evidence.
        } finally {
            $handle.Dispose()
        }
    }
}

$process.Refresh()
if ($process.HasExited) {
    # System.Diagnostics.Process owns the handle. Unlike Windows PowerShell
    # Start-Process -PassThru with RedirectStandardOutput, it provides ExitCode.
    $process.WaitForExit()
}
$exitCode = if ($process.HasExited) { $process.ExitCode } else { $null }
$survivors = @()
try {
    $survivors = @(
        foreach ($snapshot in $ownedDescendantSnapshot) {
            $current = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + [int]$snapshot.id) -ErrorAction Stop
            if ($current -ne $null) {
                $creationUtc = ([datetime]$current.CreationDate).ToUniversalTime()
                if (Test-SameProcessBirth $creationUtc ($snapshot.creationUtc)) { $snapshot.id }
            }
        }
    )
} catch {
    if ($null -eq $samplerCleanupError) { $samplerCleanupError = $_.Exception.Message }
}
$hostMetricsCaptured = $null
$coreBaselineVerdictCaptured = $null
$coreCycleVerdictCaptured = $null
$visibleFocusVerdictCaptured = $null
$gatedFocusVerdictCaptured = $null
$idlePreflightVerdictCaptured = $null
$extendedVisualVerdictCaptured = $null
$idleVerdictCaptured = $null
if ($captureOutput) {
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($stdout, $stdoutTask.GetAwaiter().GetResult(), $encoding)
    [IO.File]::WriteAllText($stderr, $stderrTask.GetAwaiter().GetResult(), $encoding)
    $text = Get-Content -LiteralPath $stdout -Raw -Encoding UTF8
    if ($PerfMetrics) { $hostMetricsCaptured = $text -match 'CW-PERF-001 opt-in aggregate' }
    if ($CorePerfSmoke) {
        $coreBaselineVerdictCaptured = $text -match '(?m)^CW-PERF-001 synthetic core-only smoke: PASS \(visual smoke NOT RUN\)\r?$'
    }
    if ($CoreCycleSmoke) {
        $coreCycleVerdictCaptured = $text -match '(?m)^CW-PERF-001 synthetic 20-cycle core smoke: PASS \(visual smoke NOT RUN\)\r?$'
    }
    if ($VisibleFocusSmoke) {
        $visibleFocusVerdictCaptured = ($text -match '(?m)^CW-PERF-001 visible local WebView2 GotFocus: 20/20 processed with owner PASS \(visual smoke NOT RUN\)\r?$') -and
            ($text -match '(?m)^span.FocusHandling n=(?:2[0-9]|[3-9][0-9]|[1-9][0-9]{2,})\s') -and
            ($text -match '(?m)^count.FocusReceived=(?:2[0-9]|[3-9][0-9]|[1-9][0-9]{2,})\r?$')
        $gatedFocusVerdictCaptured = $text -match '(?m)^CW-PERF-001 gated stale GotFocus: suppressed owner and active-profile mutation PASS\r?$'
    }
    if ($IdlePreflightSmoke) {
        $idlePreflightVerdictCaptured = $text -match '(?m)^CW-PERF-001 idle preflight: cards/cards \+ game/game \+ mixed \+ missing-root refusal PASS \(600s idle NOT RUN\)\r?$'
    }
    if ($ExtendedVisualSmoke) {
        $extendedVisualVerdictCaptured =
            ($text -match '(?m)^CW-PERF-001 extended visual smoke: full screenshot assertions PASS\r?$') -and
            ($text -match '(?m)^WebView2 coupled workspace smoke: PASS\r?$')
    }
}
$idleVerdictCaptured = if ($IdleCards -or $IdleGame -or $IdleMixed) { $exitCode -eq 0 } else { $null }
$report = [ordered]@{
    schemaVersion = 1
    collectorSha256 = $collectorSha256
    campaignId = $CampaignId
    runId = $RunId
    syntheticOnly = $true
    hostExecutableSha256 = ($manifest.artifacts | Where-Object { $_.path -eq ('tools/coupled-workspace-webview2/bin/' + $name) } | Select-Object -First 1).sha256
    scenario = if ($IdleCards) {
        '--smoke-perf-idle-cards / local synthetic WebView2 10-minute idle; visual screenshot smoke NOT RUN'
    } elseif ($IdleGame) {
        '--smoke-perf-idle-game / local synthetic WebView2 10-minute idle; visual screenshot smoke NOT RUN'
    } elseif ($IdleMixed) {
        '--smoke-perf-idle-mixed / local synthetic WebView2 left Cards/right Game 10-minute idle; visual screenshot smoke NOT RUN'
    } elseif ($VisibleFocusSmoke) {
        '--smoke-perf-focus-visible / local HTML only, short visible window, 20 genuine WinForms GotFocus with owner; visual screenshot smoke NOT RUN'
    } elseif ($IdlePreflightSmoke) {
        '--smoke-perf-idle-preflight / local HTML only, verify 3 modes and reject missing Cards root; 600s idle NOT RUN'
    } elseif ($ExtendedVisualSmoke) {
        '--smoke-visual-extended / local HTML only, full visual screenshot regression with bounded 60s internal watchdog; no game'
    } elseif ($CoreCycleSmoke) {
        '--smoke-perf-cycles / local synthetic WebView2 20 lifecycle and focus-layout cycles; visual screenshot smoke NOT RUN'
    } elseif ($CorePerfSmoke) {
        '--smoke-perf-baseline / local synthetic WebView2 core only; visual screenshot smoke NOT RUN'
    } else { '--smoke / local synthetic WebView2 including visual regression; no game' }
    sampleIntervalMs = $SampleMs
    elapsedMs = [math]::Round($timer.Elapsed.TotalMilliseconds, 3)
    timeout = $timedOut
    exitCode = $exitCode
    hostMetricsRequested = [bool]$PerfMetrics
    hostMetricsCaptured = $hostMetricsCaptured
    coreBaselineVerdictCaptured = $coreBaselineVerdictCaptured
    coreCycleVerdictCaptured = $coreCycleVerdictCaptured
    visibleFocusVerdictCaptured = $visibleFocusVerdictCaptured
    gatedFocusVerdictCaptured = $gatedFocusVerdictCaptured
    idlePreflightVerdictCaptured = $idlePreflightVerdictCaptured
    extendedVisualVerdictCaptured = $extendedVisualVerdictCaptured
    idleVerdictCaptured = $idleVerdictCaptured
    idleReadyObserved = $idleReadyObserved
    idleReadyElapsedMs = $idleReadyElapsedMs
    idlePassObserved = $idlePassObserved
    idlePassElapsedMs = $idlePassElapsedMs
    idleDurationMs = $idleHostDurationMs
    idleObservedMarkerSpanMs = if ($idleReadyObserved -and $idlePassObserved) { [math]::Round($idlePassElapsedMs - $idleReadyElapsedMs, 3) } else { $null }
    logicalProcessors = [Environment]::ProcessorCount
    gpu = 'not collected; no stable per-process GPU attribution in this sampler'
    attribution = 'Only direct/recursive msedgewebview2.exe children of synthetic root, with creation-time bounds; exited child CPU is not retained; summed process working sets can double-count shared resident pages'
    survivingChildProcessCount = $survivors.Count
    cleanupError = $samplerCleanupError
    samples = @($samples.ToArray())
}
[void][IO.Directory]::CreateDirectory($reportDir)
[IO.File]::WriteAllText($reportPath, ($report | ConvertTo-Json -Depth 7), (New-Object System.Text.UTF8Encoding($false)))
Write-Output "SYNTHETIC HOST SAMPLE: $CampaignId/$RunId samples=$($samples.Count) elapsedMs=$($report.elapsedMs) exit=$exitCode timeout=$timedOut"
Write-Output "REPORT: $reportPath"
if ($timedOut -or $exitCode -ne 0 -or ($PerfMetrics -and -not $hostMetricsCaptured) -or
    ($CorePerfSmoke -and -not $coreBaselineVerdictCaptured) -or
    ($CoreCycleSmoke -and -not $coreCycleVerdictCaptured) -or
    ($VisibleFocusSmoke -and -not $visibleFocusVerdictCaptured) -or
    ($VisibleFocusSmoke -and -not $gatedFocusVerdictCaptured) -or
    ($IdlePreflightSmoke -and -not $idlePreflightVerdictCaptured) -or
    ($ExtendedVisualSmoke -and -not $extendedVisualVerdictCaptured) -or
    (($IdleCards -or $IdleGame -or $IdleMixed) -and (-not $idleVerdictCaptured -or -not $idleReadyObserved -or -not $idlePassObserved -or $null -eq $idleHostDurationMs -or $idleHostDurationMs -lt 600000 -or $samples.Count -lt 60)) -or
    $survivors.Count -gt 0 -or $null -ne $samplerCleanupError) {
    throw 'Synthetic smoke failed/timed out or C# metrics were not captured; report retained as failure evidence.'
}
