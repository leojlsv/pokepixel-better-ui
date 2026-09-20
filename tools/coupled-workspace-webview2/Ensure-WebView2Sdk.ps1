[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$version = '1.0.4191.47'
$expectedSha256 = 'F492BBF547D0DA329553B6727435B677579B1E9F91CC9E4A1AD029366D5F23D0'
$sdkRoot = Join-Path $toolDir 'sdk'
$coreDll = Join-Path $sdkRoot 'lib\net462\Microsoft.Web.WebView2.Core.dll'
$winFormsDll = Join-Path $sdkRoot 'lib\net462\Microsoft.Web.WebView2.WinForms.dll'
$loaderDll = Join-Path $sdkRoot 'runtimes\win-x64\native\WebView2Loader.dll'

if ((Test-Path -LiteralPath $coreDll -PathType Leaf) -and
    (Test-Path -LiteralPath $winFormsDll -PathType Leaf) -and
    (Test-Path -LiteralPath $loaderDll -PathType Leaf)) {
    $installedVersion = [System.Reflection.AssemblyName]::GetAssemblyName($coreDll).Version.ToString()
    if ($installedVersion -eq $version) {
        Write-Host "WebView2 SDK: ready ($installedVersion)"
        return
    }
    Write-Host "WebView2 SDK version mismatch ($installedVersion); refreshing $version..."
}

$package = Join-Path $toolDir "Microsoft.Web.WebView2.$version.nupkg"
$zip = "$package.zip"
$url = "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$version/microsoft.web.webview2.$version.nupkg"

Write-Host "Downloading WebView2 SDK $version..."
Invoke-WebRequest -Uri $url -OutFile $package -UseBasicParsing
$actualSha256 = (Get-FileHash -LiteralPath $package -Algorithm SHA256).Hash
if ($actualSha256 -ne $expectedSha256) {
    throw "WebView2 SDK package hash mismatch. Expected $expectedSha256, got $actualSha256"
}
Copy-Item -LiteralPath $package -Destination $zip -Force

if (Test-Path -LiteralPath $sdkRoot) {
    $resolved = (Resolve-Path -LiteralPath $sdkRoot).Path
    if (-not $resolved.StartsWith($toolDir, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to replace SDK outside tool directory: $resolved"
    }
    Remove-Item -LiteralPath $sdkRoot -Recurse -Force
}

Expand-Archive -LiteralPath $zip -DestinationPath $sdkRoot -Force

foreach ($required in @($coreDll, $winFormsDll, $loaderDll)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        throw "WebView2 SDK extraction is incomplete: $required"
    }
}

$extractedVersion = [System.Reflection.AssemblyName]::GetAssemblyName($coreDll).Version.ToString()
if ($extractedVersion -ne $version) {
    throw "WebView2 SDK assembly version mismatch. Expected $version, got $extractedVersion"
}

Write-Host 'WebView2 SDK download: PASS'
