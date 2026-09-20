[CmdletBinding()]
param(
    [switch]$Candidate
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $toolDir 'Ensure-WebView2Sdk.ps1')

$sdkRoot = Join-Path $toolDir 'sdk'
$coreDll = Join-Path $sdkRoot 'lib\net462\Microsoft.Web.WebView2.Core.dll'
$winFormsDll = Join-Path $sdkRoot 'lib\net462\Microsoft.Web.WebView2.WinForms.dll'
$loaderDll = Join-Path $sdkRoot 'runtimes\win-x64\native\WebView2Loader.dll'
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$outDir = Join-Path $toolDir 'bin'
$outputName = if ($Candidate) { 'PokePixelCoupledWorkspace.candidate.exe' } else { 'PokePixelCoupledWorkspace.exe' }
$outputPath = Join-Path $outDir $outputName

foreach ($path in @($coreDll, $winFormsDll, $loaderDll, $csc)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Required build input not found: $path"
    }
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$sources = Get-ChildItem -LiteralPath $toolDir -Filter '*.cs' -File | Sort-Object Name | ForEach-Object { $_.FullName }
$compileArgs = @(
    '/nologo',
    '/target:winexe',
    '/platform:x64',
    '/optimize+',
    "/out:$outputPath",
    '/reference:System.dll',
    '/reference:System.Core.dll',
    '/reference:System.Drawing.dll',
    '/reference:System.Runtime.Serialization.dll',
    '/reference:System.Windows.Forms.dll',
    "/reference:$coreDll",
    "/reference:$winFormsDll"
) + $sources

& $csc @compileArgs

if ($LASTEXITCODE -ne 0) {
    throw "C# compilation failed with exit code $LASTEXITCODE."
}

function Copy-DependencyIfChanged([string]$source, [string]$destination) {
    if (Test-Path -LiteralPath $destination -PathType Leaf) {
        $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
        $destinationHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
        if ($sourceHash -eq $destinationHash) {
            return
        }
    }

    Copy-Item -LiteralPath $source -Destination $destination -Force
}

Copy-DependencyIfChanged $coreDll (Join-Path $outDir 'Microsoft.Web.WebView2.Core.dll')
Copy-DependencyIfChanged $winFormsDll (Join-Path $outDir 'Microsoft.Web.WebView2.WinForms.dll')
Copy-DependencyIfChanged $loaderDll (Join-Path $outDir 'WebView2Loader.dll')

Write-Host "WebView2 workspace build: PASS ($outputName)"
