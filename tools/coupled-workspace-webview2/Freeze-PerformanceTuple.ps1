[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$')]
    [string]$CampaignId,

    [switch]$Create,
    [switch]$Verify,
    [switch]$Smoke,

    [switch]$PerfMetrics,

    [ValidateSet('basic', 'baseline-core', 'close-during-init', 'close-during-switch')]
    [string]$SmokeVariant = 'basic',

    [ValidateSet(
        'PokePixelCoupledWorkspace.candidate.exe',
        'PokePixelCoupledWorkspace.exe',
        'PokePixelCoupledWorkspace.evidence-probe.exe'
    )]
    [string]$HostExeName = 'PokePixelCoupledWorkspace.candidate.exe',

    # Explicit source expectations prevent accidentally capturing a silently
    # rebuilt shared dist/ as the approved 0.2.124 baseline.
    [ValidatePattern('^[a-fA-F0-9]{64}$')]
    [string]$ExpectedBetterUiSha256 = '1641B1AB5DB8E21A12D118687772A768C35611415D7D41EA4468BF36D9E4FB76',

    [ValidatePattern('^[a-fA-F0-9]{64}$')]
    [string]$ExpectedAnalyzerSha256 = '0131E53D542949D84E4677736CF3A50FF90573EF10407866ACE3AA4DA2A8EE60',

    [ValidatePattern('^$|^[a-fA-F0-9]{64}$')]
    [string]$ExpectedHostSha256 = '',

    # Detached/pinned checksum supplied by the caller, never copied from the
    # manifest being verified. A malicious local editor who controls BOTH the
    # manifest and this trusted argument is outside this check's threat model.
    [ValidatePattern('^$|^[a-fA-F0-9]{64}$')]
    [string]$ExpectedManifestSha256 = '',

    # Optional instrumented candidate built inside the dedicated ignored
    # staging tree. This never reads/replaces the ordinary bin/ executable.
    [string]$HostSourceFile = '',

    # Opt-in reuse of immutable bundles from an earlier *frozen* synthetic
    # tuple; source/destination hashes remain independently pinned. Neither
    # the shared dist/ nor the earlier tuple is modified.
    [string]$BetterUiSourceFile = '',
    [string]$AnalyzerSourceFile = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (([int]$Create.IsPresent + [int]$Verify.IsPresent + [int]$Smoke.IsPresent) -ne 1) {
    throw 'Choose exactly one action: -Create, -Verify or -Smoke. No action launches the game.'
}
if ($PerfMetrics -and -not $Smoke) {
    throw '-PerfMetrics is supported only alongside a verified synthetic -Smoke.'
}
if (-not $Smoke -and $SmokeVariant -ne 'basic') {
    throw '-SmokeVariant requires -Smoke.'
}
if (($Verify -or $Smoke) -and -not $ExpectedManifestSha256) {
    throw '-Verify/-Smoke require an independently pinned -ExpectedManifestSha256.'
}
if (-not $Create -and ($BetterUiSourceFile -or $AnalyzerSourceFile)) {
    throw '-BetterUiSourceFile/-AnalyzerSourceFile are supported only with -Create.'
}

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $toolDir '..\..')).Path
$campaignsRoot = Join-Path $repoRoot '.local-evidence\coupled-webview2-perf\tuples'
$campaignRoot = Join-Path $campaignsRoot $CampaignId
$manifestPath = Join-Path $campaignRoot 'tuple-manifest.json'
$binPrefix = 'tools/coupled-workspace-webview2/bin/'
$requiredPaths = @(
    ($binPrefix + $HostExeName),
    ($binPrefix + 'Microsoft.Web.WebView2.Core.dll'),
    ($binPrefix + 'Microsoft.Web.WebView2.WinForms.dll'),
    ($binPrefix + 'WebView2Loader.dll'),
    'dist/pokepixel-better-ui.user.js',
    'dist/pokepixel-hunt-analyzer.embed.js'
)

function Get-Hash([string]$path) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Missing artifact: $path"
    }
    return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToUpperInvariant()
}

function Assert-Hash([string]$path, [string]$expected) {
    $actual = Get-Hash $path
    if (-not [string]::Equals($actual, $expected, [StringComparison]::OrdinalIgnoreCase)) {
        throw "SHA-256 mismatch for $path; expected $expected; actual $actual"
    }
}

function Assert-NoLink([string]$path) {
    $full = [IO.Path]::GetFullPath($path)
    $root = [IO.Path]::GetFullPath($repoRoot).TrimEnd('\')
    if (-not ($full.Equals($root, [StringComparison]::OrdinalIgnoreCase) -or
        $full.StartsWith(($root + '\'), [StringComparison]::OrdinalIgnoreCase))) {
        throw "Refusing a path outside the workspace: $path"
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
        if ([string]::IsNullOrWhiteSpace($cursor)) { throw 'Invalid workspace ancestor.' }
    }
}

function Get-FrozenBundleSource([string]$customSource, [string]$bundleName, [string]$expectedSha256) {
    if (-not $customSource) {
        $shared = Join-Path $repoRoot ('dist/' + $bundleName)
        Assert-NoLink $shared
        Assert-Hash $shared $expectedSha256
        return $shared
    }
    $full = [IO.Path]::GetFullPath($customSource)
    $sourcePrefix = [IO.Path]::GetFullPath($campaignsRoot).TrimEnd('\') + '\'
    $tail = [IO.Path]::Combine('dist', $bundleName)
    $withinTuples = $full.StartsWith($sourcePrefix, [StringComparison]::OrdinalIgnoreCase)
    $matchesArtifact = $full.EndsWith(('\' + $tail), [StringComparison]::OrdinalIgnoreCase)
    $sameCampaign = $full.Equals((Join-Path $campaignRoot $tail), [StringComparison]::OrdinalIgnoreCase)
    if (-not $withinTuples -or -not $matchesArtifact -or $sameCampaign) {
        throw 'Frozen bundle source must be a dist artifact in a different, existing CW-PERF tuple.'
    }
    Assert-NoLink $full
    Assert-Hash $full $expectedSha256
    return $full
}

function Assert-ManifestAndContents {
    Assert-NoLink $campaignRoot
    Assert-NoLink $manifestPath
    Assert-Hash $manifestPath $ExpectedManifestSha256
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw "Missing frozen tuple manifest: $manifestPath"
    }
    $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($manifest.schemaVersion -ne 1 -or $manifest.campaignId -cne $CampaignId) {
        throw 'Manifest schema/campaign mismatch.'
    }
    if ($manifest.hostExecutable -cne $HostExeName) {
        throw 'Manifest host name mismatch; specify the frozen host executable explicitly.'
    }
    $paths = @($manifest.artifacts | ForEach-Object { $_.path })
    if ($paths.Count -ne $requiredPaths.Count) { throw 'Manifest artifact count mismatch.' }
    foreach ($required in $requiredPaths) {
        if ($paths -cnotcontains $required) { throw "Missing required manifest entry: $required" }
    }
    foreach ($entry in $manifest.artifacts) {
        $rel = [string]$entry.path
        if ($rel -cnotin $requiredPaths -or $rel.Contains('..') -or $rel.StartsWith('/') -or $rel.Contains('\')) {
            throw "Invalid manifest path: $rel"
        }
        if ([string]$entry.sha256 -notmatch '^[a-fA-F0-9]{64}$') { throw "Invalid SHA-256 for $rel" }
        $target = Join-Path $campaignRoot $rel
        Assert-NoLink $target
        Assert-Hash $target ([string]$entry.sha256)
        if ((Get-Item -LiteralPath $target).Length -ne [int64]$entry.bytes) {
            throw "Length mismatch for $rel"
        }
    }
    return $manifest
}

if ($Create) {
    if (Test-Path -LiteralPath $campaignRoot) {
        throw "Frozen campaign already exists; refusing to overwrite: $campaignRoot"
    }
    Assert-NoLink $campaignsRoot

    # Verify shared inputs *before* creating the destination. Running hosts
    # and userscripts are not rebuilt, overwritten or accessed via the game.
    $betterSource = Get-FrozenBundleSource $BetterUiSourceFile 'pokepixel-better-ui.user.js' $ExpectedBetterUiSha256
    $analyzerSource = Get-FrozenBundleSource $AnalyzerSourceFile 'pokepixel-hunt-analyzer.embed.js' $ExpectedAnalyzerSha256
    $allowedStagingRoot = Join-Path $repoRoot '.local-evidence\coupled-webview2-perf\staging'
    $hostSource = if ($HostSourceFile) {
        $resolved = [IO.Path]::GetFullPath($HostSourceFile)
        $prefix = [IO.Path]::GetFullPath($allowedStagingRoot).TrimEnd('\') + '\'
        $withinStaging = $resolved.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)
        $matchingName = [IO.Path]::GetFileName($resolved) -ceq $HostExeName
        if (-not $withinStaging -or -not $matchingName) {
            throw 'HostSourceFile must be a candidate under the ignored CW-PERF staging tree.'
        }
        $resolved
    } else { Join-Path $repoRoot ($binPrefix + $HostExeName) }
    Assert-NoLink $hostSource
    if ($ExpectedHostSha256) {
        Assert-Hash $hostSource $ExpectedHostSha256
    }

    $items = foreach ($rel in $requiredPaths) {
        $source = if ($rel -ceq ($binPrefix + $HostExeName)) { $hostSource }
            elseif ($rel -ceq 'dist/pokepixel-better-ui.user.js') { $betterSource }
            elseif ($rel -ceq 'dist/pokepixel-hunt-analyzer.embed.js') { $analyzerSource }
            else { Join-Path $repoRoot $rel }
        Assert-NoLink $source
        [pscustomobject]@{
            path = $rel
            sha256 = Get-Hash $source
            bytes = (Get-Item -LiteralPath $source).Length
        }
    }

    $sourceProvenance = $null
    if ($HostSourceFile) {
        $provenancePath = Join-Path (Split-Path -Parent $hostSource) 'build-provenance.json'
        Assert-NoLink $provenancePath
        if (-not (Test-Path -LiteralPath $provenancePath -PathType Leaf)) {
            throw 'Staged host must include build-provenance.json with source/DLL/compiler hashes.'
        }
        $sourceProvenance = Get-Content -LiteralPath $provenancePath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($sourceProvenance.schemaVersion -ne 1 -or
            -not [string]::Equals($sourceProvenance.binarySha256, (Get-Hash $hostSource), [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Staged host/build provenance SHA-256 mismatch.'
        }
    }

    [void][IO.Directory]::CreateDirectory($campaignRoot)
    foreach ($item in $items) {
        $source = if ($item.path -ceq ($binPrefix + $HostExeName)) { $hostSource }
            elseif ($item.path -ceq 'dist/pokepixel-better-ui.user.js') { $betterSource }
            elseif ($item.path -ceq 'dist/pokepixel-hunt-analyzer.embed.js') { $analyzerSource }
            else { Join-Path $repoRoot $item.path }
        $target = Join-Path $campaignRoot $item.path
        [void][IO.Directory]::CreateDirectory((Split-Path -Parent $target))
        Assert-NoLink $target
        [IO.File]::Copy($source, $target, $false)
        Assert-Hash $target $item.sha256
    }

    $revision = (& git -C $repoRoot rev-parse HEAD)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to determine git revision.' }
    $manifest = [ordered]@{
        schemaVersion = 1
        campaignId = $CampaignId
        hostExecutable = $HostExeName
        sourceCommit = ($revision | Select-Object -First 1).Trim()
        createdAtUtc = [DateTime]::UtcNow.ToString('o')
        artifactRootLayout = 'repo-compatible; tools/.../bin and dist share a tuple root'
        hostBuildProvenance = $sourceProvenance
        artifacts = @($items)
    }
    # UTF8 without BOM; manifest is written only after all copies pass hashes.
    [IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
    $ExpectedManifestSha256 = Get-Hash $manifestPath
    [void](Assert-ManifestAndContents)
    Write-Output "FROZEN TUPLE PASS: $CampaignId (source tree and live host unchanged)"
    Write-Output "MANIFEST: $manifestPath"
    Write-Output "MANIFEST_SHA256: $ExpectedManifestSha256 (pin outside campaign for every Verify/Smoke)"
    return
}

$frozen = Assert-ManifestAndContents
Write-Output "FROZEN TUPLE VERIFIED: $($frozen.campaignId), $($frozen.artifacts.Count) artifacts"
if ($Smoke) {
    # The host's --smoke path uses only synthetic local pages and its own
    # campaign-scoped smoke-user-data. There is no normal game launch option.
    $hostExecutablePath = Join-Path $campaignRoot ($binPrefix + $HostExeName)
    # Older pinned hosts do not recognize the core-only flag. Always supply
    # their known --smoke flag too, so an old binary cannot launch the game.
    $smokeArguments = switch ($SmokeVariant) {
        'baseline-core' { @('--smoke', '--smoke-perf-baseline') }
        'close-during-init' { @('--smoke', '--smoke-close-during-init') }
        'close-during-switch' { @('--smoke', '--smoke-close-during-switch') }
        default { @('--smoke') }
    }
    $arguments = @($smokeArguments)
    if ($PerfMetrics) { $arguments += '--perf-metrics' }
    $launch = @{
        FilePath = $hostExecutablePath
        ArgumentList = $arguments
        WorkingDirectory = (Split-Path -Parent $hostExecutablePath)
        Wait = $true
        PassThru = $true
    }
    $captureOutput = $PerfMetrics -or $SmokeVariant -ne 'basic'
    if ($captureOutput) {
        $measurementsRoot = Join-Path $campaignRoot 'measurements'
        [void][IO.Directory]::CreateDirectory($measurementsRoot)
        $filename = if ($SmokeVariant -eq 'basic') { 'synthetic-host-metrics' } else { 'synthetic-host-metrics.' + $SmokeVariant }
        $stdout = Join-Path $measurementsRoot ($filename + '.stdout.txt')
        $stderr = Join-Path $measurementsRoot ($filename + '.stderr.txt')
        if ((Test-Path -LiteralPath $stdout) -or (Test-Path -LiteralPath $stderr)) {
            throw 'Opt-in metrics report already exists; refusing to overwrite.'
        }
        $launch.RedirectStandardOutput = $stdout
        $launch.RedirectStandardError = $stderr
    }
    $started = Start-Process @launch
    if ($started.ExitCode -ne 0) { throw "Frozen synthetic WebView2 smoke failed: exit $($started.ExitCode)" }
    if ($captureOutput) {
        $metricsText = Get-Content -LiteralPath $stdout -Encoding UTF8 -Raw
        if ($SmokeVariant -eq 'baseline-core' -and
            $metricsText -notmatch '(?m)^CW-PERF-001 synthetic core-only smoke: PASS \(visual smoke NOT RUN\)\r?$') {
            throw "Frozen host did not confirm core-only smoke; the result cannot be classified as a baseline-core PASS: $stdout"
        }
        if ($SmokeVariant -eq 'close-during-init' -and
            $metricsText -notmatch '(?m)^WebView2 coupled workspace shutdown-during-init smoke: PASS\r?$') {
            throw "Frozen host did not confirm shutdown-during-init smoke: $stdout"
        }
        if ($SmokeVariant -eq 'close-during-switch' -and
            $metricsText -notmatch '(?m)^WebView2 coupled workspace shutdown-during-switch smoke: PASS\r?$') {
            throw "Frozen host did not confirm shutdown-during-switch smoke: $stdout"
        }
        if ($PerfMetrics -and $metricsText -notmatch 'CW-PERF-001 opt-in aggregate') {
            throw "Smoke succeeded, but opt-in C# metrics were not captured through stdout: $stdout"
        }
        if ($PerfMetrics) { Write-Output "OPT-IN HOST METRICS CAPTURED: $stdout" }
    }
    Write-Output 'FROZEN SYNTHETIC SMOKE PASS'
}
