[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$')]
    [string]$CampaignId,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-fA-F0-9]{64}$')]
    [string]$ExpectedManifestSha256,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$')]
    [string]$RunId,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-fA-F0-9]{64}$')]
    [string]$ExpectedReportSha256,

    [Parameter(Mandatory = $true)]
    [ValidateSet('cards', 'game', 'mixed')]
    [string]$Mode,

    # New collector reports pin their collector implementation externally.
    # Older immutable reports without this field remain verifiable unchanged.
    [ValidatePattern('^$|^[a-fA-F0-9]{64}$')]
    [string]$ExpectedCollectorSha256 = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# This verifier is read-only. All inputs are exact, caller-pinned artifacts of
# an already completed synthetic run; it never launches a process or the game.
$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $toolDir '..\..')).Path
$campaignRoot = Join-Path $repoRoot ('.local-evidence\coupled-webview2-perf\tuples\' + $CampaignId)
$manifestPath = Join-Path $campaignRoot 'tuple-manifest.json'
$reportPath = Join-Path (Join-Path $campaignRoot 'measurements') ($RunId + '.json')
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf) -or
    -not (Test-Path -LiteralPath $reportPath -PathType Leaf)) {
    throw 'Expected frozen manifest or raw idle report is missing.'
}
foreach ($path in @($campaignRoot, (Split-Path -Parent $reportPath), $reportPath)) {
    if (((Get-Item -LiteralPath $path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Audit refuses a reparse-point campaign/report: $path"
    }
}
if ((Get-Item -LiteralPath $reportPath).Length -gt 10MB) {
    throw 'Audit refuses an unexpectedly large idle report.'
}
if ((Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash -cne $ExpectedManifestSha256 -or
    (Get-FileHash -LiteralPath $reportPath -Algorithm SHA256).Hash -cne $ExpectedReportSha256) {
    throw 'Independently pinned manifest/report SHA-256 does not match.'
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
& (Join-Path $toolDir 'Freeze-PerformanceTuple.ps1') -CampaignId $CampaignId -Verify `
    -HostExeName ([string]$manifest.hostExecutable) `
    -ExpectedManifestSha256 $ExpectedManifestSha256 | Out-Null

$report = Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8 | ConvertFrom-Json
$reportCollectorProperty = $report.PSObject.Properties['collectorSha256']
if ($null -ne $reportCollectorProperty) {
    if ([string]::IsNullOrWhiteSpace($ExpectedCollectorSha256) -or
        $reportCollectorProperty.Value -cne $ExpectedCollectorSha256) {
        throw 'Raw report collector SHA-256 requires a matching independent caller pin.'
    }
} elseif (-not [string]::IsNullOrWhiteSpace($ExpectedCollectorSha256)) {
    throw 'Caller pinned a collector hash that the historical report did not record.'
}
$modePrefix = @{
    cards = '--smoke-perf-idle-cards /'
    game = '--smoke-perf-idle-game /'
    mixed = '--smoke-perf-idle-mixed /'
}[$Mode]
$hostPath = 'tools/coupled-workspace-webview2/bin/' + [string]$manifest.hostExecutable
$hostArtifact = @($manifest.artifacts | Where-Object { $_.path -ceq $hostPath })
if ($hostArtifact.Count -ne 1 -or
    $report.schemaVersion -ne 1 -or $report.syntheticOnly -ne $true -or
    $report.campaignId -cne $CampaignId -or $report.runId -cne $RunId -or
    -not ([string]$report.scenario).StartsWith($modePrefix, [StringComparison]::Ordinal) -or
    $report.hostExecutableSha256 -cne $hostArtifact[0].sha256) {
    throw 'Raw report identity/mode/host does not match the frozen manifest.'
}
$hostDuration = [double]$report.idleDurationMs
if ($report.timeout -ne $false -or $report.exitCode -ne 0 -or
    $report.idleVerdictCaptured -ne $true -or
    $report.idleReadyObserved -ne $true -or $report.idlePassObserved -ne $true -or
    $report.survivingChildProcessCount -ne 0 -or
    $null -eq $report.idleDurationMs -or [double]::IsNaN($hostDuration) -or
    [double]::IsInfinity($hostDuration) -or $hostDuration -lt 600000) {
    throw 'Idle report has no valid 600-second PASS/no-survivor verdict.'
}

$all = @($report.samples)
$steady = @($all | Where-Object { $_.processCount -gt 0 })
$anchors = @($all | Where-Object { $_.PSObject.Properties['readyAnchor'] -and $_.readyAnchor -eq $true })
$cpuSteady = @($steady | Where-Object { -not ($_.PSObject.Properties['readyAnchor'] -and $_.readyAnchor -eq $true) })
if ($anchors.Count -gt 1 -or
    ($anchors.Count -eq 1 -and ($all[0].readyAnchor -ne $true -or
        $all[0].processCount -le 0 -or $null -ne $all[0].cpuMachinePercent)) -or
    $all.Count -lt 60 -or $steady.Count -lt 60 -or $cpuSteady.Count -lt 60) {
    throw 'Idle report has insufficient post-READY process samples.'
}
if ($anchors.Count -eq 1 -and $null -eq $reportCollectorProperty) {
    throw 'Post-READY resource anchors require independently pinned collector provenance.'
}
$readyObservedAt = [double]$report.idleReadyElapsedMs
$passObservedAt = [double]$report.idlePassElapsedMs
if ($null -eq $report.idleReadyElapsedMs -or $null -eq $report.idlePassElapsedMs -or
    [double]::IsNaN($readyObservedAt) -or [double]::IsInfinity($readyObservedAt) -or
    [double]::IsNaN($passObservedAt) -or [double]::IsInfinity($passObservedAt) -or
    $readyObservedAt -le 0 -or $passObservedAt -le $readyObservedAt -or
    [double]$steady[0].elapsedMs -le $readyObservedAt -or
    [double]$steady[-1].elapsedMs -gt $passObservedAt) {
    throw 'Observed READY/PASS marker ordering does not bound the real resource samples.'
}
$gaps = New-Object 'System.Collections.Generic.List[double]'
$previous = $null
foreach ($sample in $steady) {
    $isAnchor = $sample.PSObject.Properties['readyAnchor'] -and $sample.readyAnchor -eq $true
    if ((-not $isAnchor -and $null -eq $sample.cpuMachinePercent) -or
        ($isAnchor -and $null -ne $sample.cpuMachinePercent) -or
        $null -eq $sample.elapsedMs -or
        $null -eq $sample.privateMiB -or $null -eq $sample.workingSetMiBSum) {
        throw 'Idle report is missing a required process measurement.'
    }
    $at = [double]$sample.elapsedMs
    $cpu = if ($isAnchor) { 0.0 } else { [double]$sample.cpuMachinePercent }
    $private = [double]$sample.privateMiB
    $working = [double]$sample.workingSetMiBSum
    if ([double]::IsNaN($at) -or [double]::IsInfinity($at) -or
        [double]::IsNaN($cpu) -or [double]::IsInfinity($cpu) -or
        [double]::IsNaN($private) -or [double]::IsInfinity($private) -or
        [double]::IsNaN($working) -or [double]::IsInfinity($working) -or
        $cpu -lt 0 -or $cpu -gt 100 -or $private -le 0 -or $working -le 0) {
        throw 'Idle report contains non-finite or invalid process measurements.'
    }
    if ($null -ne $previous) {
        if ($at -le $previous) { throw 'Idle report sample timestamps are not strictly increasing.' }
        $gaps.Add($at - $previous)
    }
    $previous = $at
}
$coveredMs = [double]$steady[-1].elapsedMs - [double]$steady[0].elapsedMs
if ($coveredMs -lt 590000 -or ($gaps | Measure-Object -Maximum).Maximum -gt 30000) {
    throw 'Post-READY measurements do not cover the idle window without excessive gaps.'
}
$sortedGaps = @($gaps.ToArray() | Sort-Object)
$p95Index = [math]::Ceiling($sortedGaps.Count * 0.95) - 1
$summary = @(
    ('FROZEN IDLE EVIDENCE PASS: ' + $CampaignId + '/' + $RunId)
    ('mode=' + $Mode)
    ('hostIdleMs=' + $report.idleDurationMs)
    ('steadySamples=' + $steady.Count)
    ('numericCpuSamples=' + $cpuSteady.Count)
    ('realPostReadyAnchor=' + [bool]($anchors.Count -eq 1))
    ('coveredMs=' + [math]::Round($coveredMs, 3))
    ('configuredSleepMs=' + $report.sampleIntervalMs)
    ('observedMeanGapMs=' + [math]::Round(($gaps | Measure-Object -Average).Average, 3))
    ('observedP95GapMs=' + [math]::Round($sortedGaps[$p95Index], 3))
    ('observedMaxGapMs=' + [math]::Round($sortedGaps[-1], 3))
) -join ' '
Write-Output $summary
