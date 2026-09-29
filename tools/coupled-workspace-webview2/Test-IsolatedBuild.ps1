# Synthetic C# builder gate. Copies all inputs into an isolated throwaway tree;
# never compiles, inspects or launches a live game/host executable.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$tempParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$fixture = Join-Path $tempParent ('ppbui native build ' + [guid]::NewGuid().ToString('N'))
$builderName = 'Build-WebView2Workspace.ps1'
$sdkName = 'Ensure-WebView2Sdk.ps1'
$inputs = @($builderName, $sdkName)
$dlls = @(
    'sdk\lib\net462\Microsoft.Web.WebView2.Core.dll',
    'sdk\lib\net462\Microsoft.Web.WebView2.WinForms.dll',
    'sdk\runtimes\win-x64\native\WebView2Loader.dll'
)

# Build-WebView2Workspace.ps1 checks process names. In this synthetic scope,
# its resolver must not enumerate user-owned processes at all.
function Get-Process { [CmdletBinding()] param() return @() }

try {
    New-Item -Path $fixture -ItemType Directory -ErrorAction Stop | Out-Null
    foreach ($file in $inputs) {
        Copy-Item -LiteralPath (Join-Path $sourceRoot $file) -Destination (Join-Path $fixture $file) -ErrorAction Stop
    }
    foreach ($file in (Get-ChildItem -LiteralPath $sourceRoot -Filter '*.cs' -File)) {
        Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $fixture $file.Name) -ErrorAction Stop
    }
    foreach ($relative in $dlls) {
        $target = Join-Path $fixture $relative
        New-Item -Path (Split-Path -Parent $target) -ItemType Directory -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $sourceRoot $relative) -Destination $target -ErrorAction Stop
    }

    $builder = Join-Path $fixture $builderName
    $output = Join-Path $fixture 'bin\PokePixelCoupledWorkspace.candidate.exe'
    & $builder -Candidate | Out-Null
    if (-not (Test-Path -LiteralPath $output -PathType Leaf)) { throw 'Isolated initial C# build produced no EXE.' }
    & $builder -Candidate | Out-Null
    $goodHash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash

    # An injected compiler error must not modify the already-built candidate.
    $invalid = Join-Path $fixture 'ppbui-injected-compile-error.cs'
    Set-Content -LiteralPath $invalid -Value 'class Test { private !!! }' -Encoding ASCII
    $failed = $false
    try {
        & $builder -Candidate *> $null
    } catch { $failed = $true }
    if (-not $failed) { throw 'Invalid C# unexpectedly compiled successfully.' }
    if ((Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash -ne $goodHash) {
        throw 'A failed C# compile overwrote the existing candidate.'
    }
    if (@(Get-ChildItem -LiteralPath (Join-Path $fixture 'bin') -File -Filter '*.stage.exe').Count -ne 0) {
        throw 'Builder left staging EXE after failure.'
    }
    Remove-Item -LiteralPath $invalid -Force -ErrorAction Stop

    # A shared WebView2 DLL differs from the pinned source: the tool must
    # refuse the whole rebuild rather than replacing a runtime in an active
    # sibling host's bin directory.
    $sharedCore = Join-Path $fixture 'bin\Microsoft.Web.WebView2.Core.dll'
    $sharedCoreBytes = [IO.File]::ReadAllBytes($sharedCore)
    try {
        Set-Content -LiteralPath $sharedCore -Value 'synthetic shared-runtime mismatch' -Encoding ASCII
        $blocked = $false
        try { & $builder -Candidate *> $null }
        catch { $blocked = $true }
        if (-not $blocked) { throw 'Builder overwrote a mismatched shared DLL.' }
        if ((Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash -ne $goodHash) {
            throw 'A shared runtime mismatch overwrote the previous candidate.'
        }
    } finally {
        [IO.File]::WriteAllBytes($sharedCore, $sharedCoreBytes)
    }

    # Exercise SDK re-extraction only inside this synthetic tree, not the
    # working repository. A corrupt loader must not be treated as a ready SDK.
    $packageName = 'Microsoft.Web.WebView2.1.0.4191.47.nupkg'
    $packageSource = Join-Path $sourceRoot $packageName
    if (-not (Test-Path -LiteralPath $packageSource -PathType Leaf)) {
        throw 'Pinned SDK restore package is required for isolated SDK validation.'
    }
    $packageCopy = Join-Path $fixture $packageName
    Copy-Item -LiteralPath $packageSource -Destination $packageCopy -ErrorAction Stop
    if ((Get-FileHash -LiteralPath $packageCopy -Algorithm SHA256).Hash -ne
        'F492BBF547D0DA329553B6727435B677579B1E9F91CC9E4A1AD029366D5F23D0') {
        throw 'Isolated SDK source package SHA mismatch.'
    }
    $loader = Join-Path $fixture 'sdk\runtimes\win-x64\native\WebView2Loader.dll'
    Set-Content -LiteralPath $loader -Value 'deliberately corrupt synthetic loader' -Encoding ASCII
    & (Join-Path $fixture $sdkName) | Out-Null
    if ((Get-FileHash -LiteralPath $loader -Algorithm SHA256).Hash -ne
        'C66E4A92FDC7A216118E43B7A5024EA2200E8C43F9310BF20D96A0084F82C5BC') {
        throw 'SDK re-extraction did not restore the expected loader.'
    }
    $coreDll = Join-Path $fixture 'sdk\lib\net462\Microsoft.Web.WebView2.Core.dll'
    Set-Content -LiteralPath $coreDll -Value 'deliberately corrupt synthetic Core assembly' -Encoding ASCII
    & (Join-Path $fixture $sdkName) | Out-Null
    if ((Get-FileHash -LiteralPath $coreDll -Algorithm SHA256).Hash -ne
        'E6F54C8CE208E3797C427D01AD671B47CB25ABC85604753D6EC2546D0FFEF550') {
        throw 'SDK re-extraction did not restore a damaged Core assembly.'
    }
    if ((Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash -ne $goodHash) {
        throw 'SDK repair unexpectedly changed the isolated candidate executable.'
    }
    Write-Host 'Isolated WebView2 tooling: PASS (compile, atomic replacement, failed-build rollback, offline SDK recovery).'
} finally {
    $prefix = $tempParent.TrimEnd('\') + '\'
    if (-not $fixture.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -or
        -not ([IO.Path]::GetFileName($fixture)).StartsWith('ppbui native build ')) {
        throw "Unsafe isolated test cleanup path: $fixture"
    }
    if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}
