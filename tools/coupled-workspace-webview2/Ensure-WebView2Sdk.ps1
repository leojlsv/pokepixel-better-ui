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
$requiredHashes = @{
    'lib\net462\Microsoft.Web.WebView2.Core.dll' = 'E6F54C8CE208E3797C427D01AD671B47CB25ABC85604753D6EC2546D0FFEF550'
    'lib\net462\Microsoft.Web.WebView2.WinForms.dll' = 'CC3D2937C350A4F5E20399855BCAB4FE695A395308FEB2ED67394FAA6A1AE849'
    'runtimes\win-x64\native\WebView2Loader.dll' = 'C66E4A92FDC7A216118E43B7A5024EA2200E8C43F9310BF20D96A0084F82C5BC'
}

if ((Test-Path -LiteralPath $coreDll -PathType Leaf) -and
    (Test-Path -LiteralPath $winFormsDll -PathType Leaf) -and
    (Test-Path -LiteralPath $loaderDll -PathType Leaf)) {
    $installedVersion = 'invalid'
    try {
        $installedVersion = [System.Reflection.AssemblyName]::GetAssemblyName($coreDll).Version.ToString()
    } catch {
        # A corrupt existing Core DLL is a repair condition, not a reason to
        # abort before the pinned NuGet package can be staged and verified.
    }
    $matchingDlls = $true
    foreach ($relative in $requiredHashes.Keys) {
        $required = Join-Path $sdkRoot $relative
        if ((Get-FileHash -LiteralPath $required -Algorithm SHA256).Hash -ne $requiredHashes[$relative]) {
            $matchingDlls = $false
            break
        }
    }
    if ($installedVersion -eq $version -and $matchingDlls) {
        Write-Host "WebView2 SDK: ready ($installedVersion)"
        return
    }
    Write-Host "WebView2 SDK version or file-hash mismatch ($installedVersion); refreshing $version..."
}

$package = Join-Path $toolDir "Microsoft.Web.WebView2.$version.nupkg"
$instance = [guid]::NewGuid().ToString('N')
$zip = Join-Path $toolDir (".webview2-sdk-$instance.zip")
$staging = Join-Path $toolDir ("sdk.staging-$instance")
$backup = Join-Path $toolDir ("sdk.previous-$instance")
$url = "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$version/microsoft.web.webview2.$version.nupkg"

$actualSha256 = if (Test-Path -LiteralPath $package -PathType Leaf) {
    (Get-FileHash -LiteralPath $package -Algorithm SHA256).Hash
} else {
    ''
}
if ($actualSha256 -ne $expectedSha256) {
    Write-Host "Downloading WebView2 SDK $version..."
    Invoke-WebRequest -Uri $url -OutFile $package -UseBasicParsing
    $actualSha256 = (Get-FileHash -LiteralPath $package -Algorithm SHA256).Hash
}
if ($actualSha256 -ne $expectedSha256) {
    throw "WebView2 SDK package hash mismatch. Expected $expectedSha256, got $actualSha256"
}
try {
    # Validate the complete replacement before changing a working SDK.
    Copy-Item -LiteralPath $package -Destination $zip -ErrorAction Stop
    Expand-Archive -LiteralPath $zip -DestinationPath $staging -ErrorAction Stop
    foreach ($relative in $requiredHashes.Keys) {
        $required = Join-Path $staging $relative
        if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
            throw "WebView2 SDK extraction is incomplete: $required"
        }
        if ((Get-FileHash -LiteralPath $required -Algorithm SHA256).Hash -ne $requiredHashes[$relative]) {
            throw "WebView2 SDK extracted file hash mismatch: $required"
        }
    }
    $extractedCore = Join-Path $staging 'lib\net462\Microsoft.Web.WebView2.Core.dll'
    $extractedVersion = [System.Reflection.AssemblyName]::GetAssemblyName($extractedCore).Version.ToString()
    if ($extractedVersion -ne $version) {
        throw "WebView2 SDK assembly version mismatch. Expected $version, got $extractedVersion"
    }

    $hasBackup = $false
    if (Test-Path -LiteralPath $sdkRoot) {
        $resolved = (Resolve-Path -LiteralPath $sdkRoot).Path
        $expected = [IO.Path]::GetFullPath((Join-Path $toolDir 'sdk'))
        if (-not [string]::Equals([IO.Path]::GetFullPath($resolved), $expected, [StringComparison]::OrdinalIgnoreCase) -or
            ((Get-Item -LiteralPath $sdkRoot).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw "Refusing to replace redirected SDK directory: $resolved"
        }
        Move-Item -LiteralPath $sdkRoot -Destination $backup -ErrorAction Stop
        $hasBackup = $true
    }
    try {
        Move-Item -LiteralPath $staging -Destination $sdkRoot -ErrorAction Stop
    } catch {
        if ($hasBackup -and -not (Test-Path -LiteralPath $sdkRoot)) {
            Move-Item -LiteralPath $backup -Destination $sdkRoot -ErrorAction Stop
            $hasBackup = $false
        }
        throw
    }
    if ($hasBackup) { Remove-Item -LiteralPath $backup -Recurse -Force -ErrorAction Stop }
} finally {
    if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
    if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
}

Write-Host 'WebView2 SDK verified local extraction: PASS'
