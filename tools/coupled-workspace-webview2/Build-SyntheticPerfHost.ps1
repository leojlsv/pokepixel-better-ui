[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$')]
    [string]$BuildId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $toolDir '..\..')).Path
$staging = Join-Path $repoRoot ('.local-evidence\coupled-webview2-perf\staging\' + $BuildId)
$output = Join-Path $staging 'PokePixelCoupledWorkspace.candidate.exe'
function Assert-NoLink([string]$path) {
    $full = [IO.Path]::GetFullPath($path)
    $root = [IO.Path]::GetFullPath($repoRoot).TrimEnd('\')
    if (-not $full.StartsWith(($root + '\'), [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing a staging path outside the workspace: $path"
    }
    $cursor = $full
    while ($true) {
        if (Test-Path -LiteralPath $cursor) {
            if (((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw "Refusing a reparse-point ancestor: $cursor"
            }
        }
        if ($cursor.Equals($root, [StringComparison]::OrdinalIgnoreCase)) { break }
        $cursor = [IO.Path]::GetDirectoryName($cursor)
        if ([string]::IsNullOrWhiteSpace($cursor)) { throw 'Invalid staging ancestor.' }
    }
}
Assert-NoLink $output
if (Test-Path -LiteralPath $staging) { throw "Refusing to overwrite an existing isolated build: $staging" }

$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$sdk = Join-Path $toolDir 'sdk\lib\net462'
$coreDll = Join-Path $sdk 'Microsoft.Web.WebView2.Core.dll'
$winFormsDll = Join-Path $sdk 'Microsoft.Web.WebView2.WinForms.dll'
$loader = Join-Path $toolDir 'sdk\runtimes\win-x64\native\WebView2Loader.dll'
foreach ($p in @($csc, $coreDll, $winFormsDll, $loader)) {
    if (-not (Test-Path -LiteralPath $p -PathType Leaf)) {
        throw "Missing pinned compiler/dependency: $p (do not download/update during perf campaign)"
    }
}

# The host will run using the three DLLs from the frozen bin/ layout. Compile
# only if the exact pinned SDK sidecars match those the tuple will copy.
foreach ($pair in @(
    @{ sdk = $coreDll; bin = (Join-Path $toolDir 'bin\Microsoft.Web.WebView2.Core.dll') },
    @{ sdk = $winFormsDll; bin = (Join-Path $toolDir 'bin\Microsoft.Web.WebView2.WinForms.dll') },
    @{ sdk = $loader; bin = (Join-Path $toolDir 'bin\WebView2Loader.dll') }
)) {
    if (-not (Test-Path -LiteralPath $pair.bin -PathType Leaf)) { throw "Missing bin sidecar: $($pair.bin)" }
    if ((Get-FileHash -LiteralPath $pair.sdk -Algorithm SHA256).Hash -cne
        (Get-FileHash -LiteralPath $pair.bin -Algorithm SHA256).Hash) {
        throw "SDK/bin sidecar mismatch. Do not silently upgrade a shared runtime: $($pair.bin)"
    }
}

$sources = @(Get-ChildItem -LiteralPath $toolDir -Filter '*.cs' -File | Sort-Object Name | ForEach-Object { $_.FullName })
if ($sources.Count -lt 2) { throw 'Host sources were not found.' }
[void][IO.Directory]::CreateDirectory($staging)
Assert-NoLink $output
$snapshotDir = Join-Path $staging 'source-snapshot'
[void][IO.Directory]::CreateDirectory($snapshotDir)
$compiledSources = @($sources | ForEach-Object {
    $destination = Join-Path $snapshotDir ([IO.Path]::GetFileName($_))
    [IO.File]::Copy($_, $destination, $false)
    $destination
})
# The compiler reads exclusively this unique, create-only source snapshot.
# Hashes below refer to these exact staged source bytes, never to concurrently
# editable worktree paths after the compiler has run.
$args = @(
    '/nologo', '/target:winexe', '/platform:x64', '/optimize+',
    ('/out:' + $output),
    '/reference:System.dll', '/reference:System.Core.dll',
    '/reference:System.Drawing.dll', '/reference:System.Runtime.Serialization.dll',
    '/reference:System.Windows.Forms.dll',
    ('/reference:' + $coreDll), ('/reference:' + $winFormsDll)
) + $compiledSources
& $csc @args
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $output -PathType Leaf)) {
    throw "Isolated host compilation failed (exit $LASTEXITCODE); staging retained for diagnostics."
}

Write-Output "ISOLATED HOST BUILD PASS: $BuildId"
$compiledHash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash
$revision = (& git -C $repoRoot rev-parse HEAD | Select-Object -First 1).Trim()
$dirty = @(& git -C $repoRoot status --porcelain=v1 --untracked-files=all).Count -gt 0
$provenance = [ordered]@{
    schemaVersion = 1
    binarySha256 = $compiledHash
    sourceCommitBase = $revision
    sourceWorktreeDirty = $dirty
    compilerSha256 = (Get-FileHash -LiteralPath $csc -Algorithm SHA256).Hash
    sdkCoreSha256 = (Get-FileHash -LiteralPath $coreDll -Algorithm SHA256).Hash
    sdkWinFormsSha256 = (Get-FileHash -LiteralPath $winFormsDll -Algorithm SHA256).Hash
    sdkLoaderSha256 = (Get-FileHash -LiteralPath $loader -Algorithm SHA256).Hash
    csharpSources = @($compiledSources | ForEach-Object {
        [ordered]@{
            filename = [IO.Path]::GetFileName($_)
            sha256 = (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash
        }
    })
}
$provenanceFile = Join-Path $staging 'build-provenance.json'
[IO.File]::WriteAllText($provenanceFile, ($provenance | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))
Write-Output "SHA256: $compiledHash"
Write-Output "STAGED: $output"
Write-Output "PROVENANCE: $provenanceFile"
Write-Output 'Use Freeze-PerformanceTuple.ps1 -Create -HostSourceFile <STAGED> -ExpectedHostSha256 <SHA256>; never run the staging binary directly.'
