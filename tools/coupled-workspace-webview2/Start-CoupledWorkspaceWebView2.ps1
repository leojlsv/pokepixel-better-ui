[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [switch]$Smoke,
    [switch]$Candidate
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $toolDir '..\..')
$exeName = if ($Candidate) { 'PokePixelCoupledWorkspace.candidate.exe' } else { 'PokePixelCoupledWorkspace.exe' }
$exe = Join-Path $toolDir ("bin\" + $exeName)

if (-not $SkipBuild) {
    Push-Location $repoRoot.Path
    try {
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) {
            throw "Better UI build failed with exit code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
    }

    if ($Candidate) {
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

$process = Start-Process -FilePath $exe -Wait -PassThru
exit $process.ExitCode
