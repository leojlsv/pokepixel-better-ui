# Offline negative gate only. -Plan and rejected arguments cannot open the host.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcher = Join-Path $toolDir 'Start-CoupledWorkspaceWebView2.ps1'
$builder = Join-Path $toolDir 'Build-WebView2Workspace.ps1'
$bin = Join-Path $toolDir 'bin'
$hosts = if (Test-Path -LiteralPath $bin -PathType Container) {
    @(Get-ChildItem -LiteralPath $bin -Filter 'PokePixelCoupledWorkspace*.exe' -File)
} else { @() }
$before = @{}
foreach ($file in $hosts) { $before[$file.Name] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash }

function Invoke-Rejected([string]$script, [string[]]$arguments) {
    $prior = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script @arguments *> $null
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $prior }
    if ($code -eq 0) { throw "Unsafe command unexpectedly accepted: $script $($arguments -join ' ')" }
}

$plan = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -Plan | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $plan.BuildRequested -or $plan.Mode -ne 'launch' -or
    -not $plan.Executable.EndsWith('PokePixelCoupledWorkspace.exe')) {
    throw 'Default launcher plan must select the existing normal host without build.'
}
$candidate = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -Plan -Candidate | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $candidate.BuildRequested -or
    -not $candidate.Executable.EndsWith('PokePixelCoupledWorkspace.candidate.exe')) {
    throw 'Candidate launcher plan must not rebuild by default.'
}
$smoke = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -Plan -Smoke | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $smoke.BuildRequested -or $smoke.Mode -ne 'smoke') {
    throw 'Default smoke plan must not rebuild or launch.'
}

Invoke-Rejected $launcher @('-Plan', '-Build')
Invoke-Rejected $launcher @('-Plan', '-Build', '-Candidate', '-SkipBuild')
Invoke-Rejected $builder @()
Invoke-Rejected $builder @('-PromoteNormal', '-Candidate')

$after = if (Test-Path -LiteralPath $bin -PathType Container) {
    @(Get-ChildItem -LiteralPath $bin -Filter 'PokePixelCoupledWorkspace*.exe' -File)
} else { @() }
if ($after.Count -ne $hosts.Count) { throw 'Host count changed while verifying non-launch safety.' }
foreach ($file in $after) {
    if ($before[$file.Name] -ne (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash) {
        throw "Existing host bytes changed: $($file.Name)"
    }
}
Write-Host "WebView2 launcher: PASS (default launch/smoke non-building; invalid promotion refused; $($hosts.Count) host hashes unchanged)."
