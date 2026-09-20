[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [switch]$ValidateOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$newLauncher = Join-Path (Split-Path -Parent $toolDir) 'coupled-workspace-webview2\Start-CoupledWorkspaceWebView2.ps1'

if (-not (Test-Path -LiteralPath $newLauncher -PathType Leaf)) {
    throw "WebView2 coupled-workspace launcher not found: $newLauncher"
}

$argsList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $newLauncher)
if ($SkipBuild) {
    $argsList += '-SkipBuild'
}
if ($ValidateOnly) {
    $argsList += '-Smoke'
}

$process = Start-Process -FilePath 'powershell.exe' -ArgumentList $argsList -Wait -PassThru
exit $process.ExitCode
