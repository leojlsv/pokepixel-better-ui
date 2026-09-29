[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ToolRoot,
    [Parameter(Mandatory = $true)][string]$EntryPoint,
    [string[]]$ToolArgs = @(),
    [string]$PythonLauncher = 'python'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ToolRoot = (Resolve-Path -LiteralPath $ToolRoot -ErrorAction Stop).Path
$VenvRoot = Join-Path $ToolRoot '.venv'
$Python = Join-Path $VenvRoot 'Scripts\python.exe'
$Requirements = Join-Path $ToolRoot 'requirements.txt'
$Entry = Join-Path $ToolRoot $EntryPoint
$Marker = Join-Path $VenvRoot '.requirements-sha256'

foreach ($path in @($Requirements, $Entry)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Python tool input not found: $path"
    }
}

$createdVenv = -not (Test-Path -LiteralPath $Python -PathType Leaf)
if ($createdVenv) {
    Write-Host "Creating Python environment for $EntryPoint..."
    $priorErrorPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $PythonLauncher -m venv $VenvRoot
        $venvExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $priorErrorPreference }
    if ($venvExit -ne 0) { throw "Python venv creation failed (exit $venvExit)." }
    if (-not (Test-Path -LiteralPath $Python -PathType Leaf)) {
        throw "Python venv creation did not produce: $Python"
    }
}

$RequirementsHash = (Get-FileHash -LiteralPath $Requirements -Algorithm SHA256).Hash
$InstalledHash = if (-not $createdVenv -and (Test-Path -LiteralPath $Marker -PathType Leaf)) {
    (Get-Content -LiteralPath $Marker -Raw).Trim()
} else { '' }

if ($InstalledHash -ne $RequirementsHash) {
    Write-Host "Installing Python dependencies for $EntryPoint..."
    $priorErrorPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $Python -m pip install --disable-pip-version-check -r $Requirements
        $pipExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $priorErrorPreference }
    if ($pipExit -ne 0) {
        throw "Python dependency installation failed (exit $pipExit); requirements marker unchanged."
    }

    # Publish the marker only after a successful pip exit, on the same volume.
    $Staging = Join-Path $VenvRoot ('.requirements-sha256.' + [guid]::NewGuid().ToString('N') + '.tmp')
    try {
        Set-Content -LiteralPath $Staging -Value $RequirementsHash -Encoding ASCII -ErrorAction Stop
        Move-Item -LiteralPath $Staging -Destination $Marker -Force -ErrorAction Stop
    } finally {
        if (Test-Path -LiteralPath $Staging) {
            Remove-Item -LiteralPath $Staging -Force -ErrorAction SilentlyContinue
        }
    }
}

Push-Location -LiteralPath $ToolRoot
try {
    $priorErrorPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $Python $Entry @ToolArgs
        $toolExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $priorErrorPreference }
    exit $toolExit
} finally {
    Pop-Location
}
