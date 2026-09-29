[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $toolDir '..\..')).Path
$repoParent = Split-Path -Parent $repoRoot
$analyzerRoot = if ($env:POKEPIXEL_HUNT_ANALYZER_REPO) {
    $env:POKEPIXEL_HUNT_ANALYZER_REPO
} else {
    Join-Path $repoParent 'pokepixel-hunt-analyzer'
}
$analyzerRoot = [System.IO.Path]::GetFullPath($analyzerRoot)
$analyzerPackage = Join-Path $analyzerRoot 'package.json'
$sourceBundle = Join-Path $analyzerRoot 'dist\pokepixel-hunt-analyzer.user.js'
$targetDir = Join-Path $repoRoot 'dist'
$targetBundle = Join-Path $targetDir 'pokepixel-hunt-analyzer.embed.js'

if (-not (Test-Path -LiteralPath $analyzerPackage -PathType Leaf)) {
    throw "PokePixel Hunt Analyzer project not found at: $analyzerRoot. Set POKEPIXEL_HUNT_ANALYZER_REPO to override."
}

Push-Location $analyzerRoot
try {
    & npm.cmd run build:userscript
    if ($LASTEXITCODE -ne 0) {
        throw "Hunt Analyzer userscript build failed with exit code $LASTEXITCODE."
    }
} finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath $sourceBundle -PathType Leaf)) {
    throw "Hunt Analyzer bundle was not produced: $sourceBundle"
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Copy-Item -LiteralPath $sourceBundle -Destination $targetBundle -Force
$hash = (Get-FileHash -LiteralPath $targetBundle -Algorithm SHA256).Hash
Write-Host "Hunt Analyzer embed bundle: PASS ($hash)"
