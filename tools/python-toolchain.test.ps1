# Offline integration regression for the shared Python launcher's exit handling.
# Uses an isolated temporary venv and never runs production scraper commands.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$helper = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'python-toolchain.ps1'
$root = Join-Path ([IO.Path]::GetTempPath()) ('ppbui-python-toolchain-' + [guid]::NewGuid().ToString('N'))
$marker = Join-Path $root '.venv\.requirements-sha256'
$requirements = Join-Path $root 'requirements.txt'
$entry = Join-Path $root 'task.py'
$originalNoIndex = $env:PIP_NO_INDEX
$env:PIP_NO_INDEX = '1'
New-Item -Path $root -ItemType Directory -ErrorAction Stop | Out-Null

try {
    Set-Content -LiteralPath $entry -Value 'import sys; print("fixture:" + ",".join(sys.argv[1:]))' -Encoding ASCII
    Set-Content -LiteralPath $requirements -Value 'broken requirement !!!' -Encoding ASCII
    $ErrorActionPreference = 'Continue'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $helper -ToolRoot $root -EntryPoint task.py *> $null
    $pipFailureExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($pipFailureExit -eq 0) { throw 'Dependency install failure returned success.' }
    if (Test-Path -LiteralPath $marker) { throw 'Failed pip incorrectly published its requirements marker.' }

    Set-Content -LiteralPath $requirements -Value '' -Encoding ASCII
    $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $helper -ToolRoot $root -EntryPoint task.py -ToolArgs fixture
    if ($LASTEXITCODE -ne 0 -or ($output -join "`n") -notmatch 'fixture:fixture') {
        throw 'Successful launch failed or did not forward its argument.'
    }
    $hash = (Get-FileHash -LiteralPath $requirements -Algorithm SHA256).Hash
    if ((Get-Content -LiteralPath $marker -Raw).Trim() -ne $hash) {
        throw 'Successful pip did not publish the expected requirements marker.'
    }

    # A partially deleted environment can retain its marker. Recreating the
    # interpreter must force dependency installation even with an equal hash.
    Remove-Item -LiteralPath (Join-Path $root '.venv\Scripts\python.exe') -Force -ErrorAction Stop
    $recreated = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $helper -ToolRoot $root -EntryPoint task.py -ToolArgs fixture
    if ($LASTEXITCODE -ne 0 -or ($recreated -join "`n") -notmatch 'Installing Python dependencies for task.py') {
        throw 'A recreated Python venv incorrectly reused its stale requirements marker.'
    }

    Set-Content -LiteralPath $entry -Value 'import sys; sys.exit(17)' -Encoding ASCII
    $ErrorActionPreference = 'Continue'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $helper -ToolRoot $root -EntryPoint task.py *> $null
    $toolFailureExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($toolFailureExit -ne 17) { throw "Python command failure returned $toolFailureExit instead of 17." }
    if ((Get-Content -LiteralPath $marker -Raw).Trim() -ne $hash) {
        throw 'The tool command modified the successful dependency marker.'
    }
    Write-Host 'Shared Python toolchain: PASS (pip failure, success, arguments, exit code, marker integrity).'
} finally {
    $env:PIP_NO_INDEX = $originalNoIndex
    $prefix = ([IO.Path]::GetFullPath([IO.Path]::GetTempPath())).TrimEnd('\') + '\'
    if (-not $root.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -or
        -not ([IO.Path]::GetFileName($root)).StartsWith('ppbui-python-toolchain-')) {
        throw "Unsafe fixture cleanup path: $root"
    }
    if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}
