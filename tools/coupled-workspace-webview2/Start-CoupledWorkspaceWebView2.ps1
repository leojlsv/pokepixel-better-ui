[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [switch]$Build,
    [switch]$Plan,
    [switch]$Smoke,
    [switch]$Candidate,
    [switch]$EvidenceProbe
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $toolDir '..\..')
$exeName = if ($EvidenceProbe) {
    'PokePixelCoupledWorkspace.evidence-probe.exe'
} elseif ($Candidate) {
    'PokePixelCoupledWorkspace.candidate.exe'
} else {
    'PokePixelCoupledWorkspace.exe'
}
$exe = Join-Path $toolDir ("bin\" + $exeName)

if (([int]$Candidate.IsPresent + [int]$EvidenceProbe.IsPresent) -gt 1) {
    throw 'Choose only one WebView2 host target.'
}
if ($Build -and $SkipBuild) {
    throw 'Choose either -Build or -SkipBuild.'
}
if ($Build -and -not ($EvidenceProbe -or $Candidate)) {
    throw 'Normal host promotion is not a launcher operation. Build isolated candidates explicitly.'
}
if ($Plan) {
    [pscustomobject]@{
        Executable = $exe
        BuildRequested = [bool]$Build
        Mode = if ($Smoke) { 'smoke' } elseif ($EvidenceProbe) { 'evidence-probe' } else { 'launch' }
    } | ConvertTo-Json -Compress
    return
}

# Launching an existing host never silently recompiles it or the two userscripts.
# -SkipBuild remains accepted for compatibility; -Build is an explicit opt-in
# and only supports isolated (non-normal) candidate outputs.
if ($Build) {
    Push-Location $repoRoot.Path
    try {
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) {
            throw "Better UI build failed with exit code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
    }

    & (Join-Path $toolDir 'Prepare-HuntAnalyzerBundle.ps1')

    if ($EvidenceProbe) {
        & (Join-Path $toolDir 'Build-WebView2Workspace.ps1') -EvidenceProbe
    } elseif ($Candidate) {
        & (Join-Path $toolDir 'Build-WebView2Workspace.ps1') -Candidate
    } else {
        & (Join-Path $toolDir 'Build-WebView2Workspace.ps1')
    }
}

if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) {
    throw "WebView2 workspace executable not found: $exe"
}

if ($Smoke) {
    $process = Start-Process -FilePath $exe -ArgumentList '--smoke' -Wait -PassThru
    if ($process.ExitCode -eq 0) {
        Write-Host 'WebView2 coupled workspace smoke: PASS'
    }
    exit $process.ExitCode
}

if ($EvidenceProbe) {
    $process = Start-Process -FilePath $exe -ArgumentList '--evidence-probe' -Wait -PassThru
} else {
    $process = Start-Process -FilePath $exe -Wait -PassThru
}
exit $process.ExitCode
