[CmdletBinding()]
param(
    [switch]$Candidate,
    [switch]$PptoolsCandidate,
    [switch]$EvidenceProbe,
    [switch]$PromoteNormal
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (([int]$Candidate.IsPresent + [int]$PptoolsCandidate.IsPresent + [int]$EvidenceProbe.IsPresent) -gt 1) {
    throw 'Choose one isolated WebView2 build target.'
}
if (-not ($Candidate -or $PptoolsCandidate -or $EvidenceProbe) -and -not $PromoteNormal) {
    throw 'Refusing to overwrite the normal host. Use an isolated candidate or explicitly request -PromoteNormal after user-owned validation.'
}
if ($PromoteNormal -and ($Candidate -or $PptoolsCandidate -or $EvidenceProbe)) {
    throw '-PromoteNormal is incompatible with isolated candidate targets.'
}

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $toolDir 'Ensure-WebView2Sdk.ps1')

$sdkRoot = Join-Path $toolDir 'sdk'
$coreDll = Join-Path $sdkRoot 'lib\net462\Microsoft.Web.WebView2.Core.dll'
$winFormsDll = Join-Path $sdkRoot 'lib\net462\Microsoft.Web.WebView2.WinForms.dll'
$loaderDll = Join-Path $sdkRoot 'runtimes\win-x64\native\WebView2Loader.dll'
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$outDir = Join-Path $toolDir 'bin'
$outputName = if ($EvidenceProbe) {
    'PokePixelCoupledWorkspace.evidence-probe.exe'
} elseif ($PptoolsCandidate) {
    'PokePixelCoupledWorkspace.pptools.candidate.exe'
} elseif ($Candidate) {
    'PokePixelCoupledWorkspace.candidate.exe'
} else {
    'PokePixelCoupledWorkspace.exe'
}
$outputPath = Join-Path $outDir $outputName

# Even an explicitly requested isolated rebuild must never rewrite the bytes
# of an executable that a Product Owner has open for live validation.
$activeHost = Get-Process -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessName -eq [IO.Path]::GetFileNameWithoutExtension($outputName)
}
if ($activeHost) {
    foreach ($process in $activeHost) {
        try {
            $processPath = $process.Path
            if ([string]::IsNullOrWhiteSpace($processPath)) {
                throw "Cannot confirm whether host is in use: $outputPath"
            }
            if ([string]::Equals($processPath, $outputPath, [StringComparison]::OrdinalIgnoreCase)) {
                throw "Refusing to rebuild currently running host: $outputPath"
            }
        } catch [System.ComponentModel.Win32Exception] {
            # No process inspection permission: conservative refusal.
            throw "Cannot confirm whether host is in use: $outputPath"
        }
    }
}

foreach ($path in @($coreDll, $winFormsDll, $loaderDll, $csc)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Required build input not found: $path"
    }
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$sources = Get-ChildItem -LiteralPath $toolDir -Filter '*.cs' -File | Sort-Object Name | ForEach-Object { $_.FullName }
$stagedOutput = Join-Path $outDir ('.' + $outputName + '.' + [guid]::NewGuid().ToString('N') + '.stage.exe')
$compileArgs = @(
    '/nologo',
    '/target:winexe',
    '/platform:x64',
    '/optimize+',
    "/out:$stagedOutput",
    '/reference:System.dll',
    '/reference:System.Core.dll',
    '/reference:System.Drawing.dll',
    '/reference:System.Runtime.Serialization.dll',
    '/reference:System.Windows.Forms.dll',
    "/reference:$coreDll",
    "/reference:$winFormsDll"
) + $sources

try {
    & $csc @compileArgs
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $stagedOutput -PathType Leaf) -or
        (Get-Item -LiteralPath $stagedOutput).Length -le 0) {
        throw "C# compilation failed with exit code $LASTEXITCODE; previous host preserved."
    }

function Copy-DependencyIfChanged([string]$source, [string]$destination) {
    if (Test-Path -LiteralPath $destination -PathType Leaf) {
        $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
        $destinationHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
        if ($sourceHash -eq $destinationHash) {
            return
        }
        # Runtime DLLs and the PPTools runner are shared by every EXE in bin/.
        # Updating one while another host is in use can break a validated
        # candidate even if the new compilation later fails. Never silently
        # mutate shared dependencies; a SDK/runner migration needs its own
        # separately staged toolchain and explicit acceptance.
        throw "Refusing to overwrite shared WebView2 dependency: $destination"
    }

    Copy-Item -LiteralPath $source -Destination $destination -ErrorAction Stop
}

    Copy-DependencyIfChanged $coreDll (Join-Path $outDir 'Microsoft.Web.WebView2.Core.dll')
    Copy-DependencyIfChanged $winFormsDll (Join-Path $outDir 'Microsoft.Web.WebView2.WinForms.dll')
    Copy-DependencyIfChanged $loaderDll (Join-Path $outDir 'WebView2Loader.dll')

    if ($PptoolsCandidate) {
        $runnerSource = Join-Path $toolDir 'pptools-runner.js'
        if (-not (Test-Path -LiteralPath $runnerSource -PathType Leaf)) {
            throw "Required PPTools runner missing: $runnerSource"
        }
        Copy-DependencyIfChanged $runnerSource (Join-Path $outDir 'pptools-runner.js')
    }

    if (Test-Path -LiteralPath $outputPath -PathType Leaf) {
        $backup = Join-Path $outDir ('.' + $outputName + '.' + [guid]::NewGuid().ToString('N') + '.previous.exe')
        # Same-volume File.Replace is atomic; a failed compile never truncates
        # the previously validated host. It also refuses an open/locked EXE.
        [IO.File]::Replace($stagedOutput, $outputPath, $backup)
        if ($PromoteNormal) {
            $evidenceDir = Join-Path $toolDir '..\..\.local-evidence\native-host-promotions'
            New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null
            Move-Item -LiteralPath $backup -Destination (Join-Path $evidenceDir (Split-Path -Leaf $backup)) -ErrorAction Stop
        } else {
            Remove-Item -LiteralPath $backup -Force -ErrorAction Stop
        }
    } else {
        Move-Item -LiteralPath $stagedOutput -Destination $outputPath -ErrorAction Stop
    }
} finally {
    if (Test-Path -LiteralPath $stagedOutput) { Remove-Item -LiteralPath $stagedOutput -Force }
}

Write-Host "WebView2 workspace build: PASS ($outputName)"
