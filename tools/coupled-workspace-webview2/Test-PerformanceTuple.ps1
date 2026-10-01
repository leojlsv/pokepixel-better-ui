[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $toolDir '..\..')).Path
$freeze = Join-Path $toolDir 'Freeze-PerformanceTuple.ps1'
$tupleRoot = Join-Path $repoRoot '.local-evidence\coupled-webview2-perf\tuples'
$id = 'cwperf001-negative-' + [Guid]::NewGuid().ToString('N').Substring(0, 10)
$campaign = Join-Path $tupleRoot $id

function Expect-Error([scriptblock]$operation, [string]$name) {
    $failed = $false
    try { & $operation | Out-Null } catch { $failed = $true }
    if (-not $failed) { throw "Negative assertion did not fail: $name" }
    Write-Output "PASS expected refusal: $name"
}

try {
    # A failed expectation must not even create the campaign destination.
    Expect-Error { & $freeze -CampaignId $id -Create -ExpectedHostSha256 ('0' * 64) } 'wrong source hash'
    if (Test-Path -LiteralPath $campaign) { throw 'A failed freeze created a campaign.' }

    & $freeze -CampaignId $id -Create -ExpectedHostSha256 '09E3D7988DDEAEB19F64659345EFFE651555E312B93F0D8A4475C7B8407A0675' | Out-Null
    $manifest = Join-Path $campaign 'tuple-manifest.json'
    $anchor = (Get-FileHash -LiteralPath $manifest -Algorithm SHA256).Hash
    & $freeze -CampaignId $id -Verify -ExpectedManifestSha256 $anchor | Out-Null
    Write-Output 'PASS source verified and immutable tuple created'

    Expect-Error { & $freeze -CampaignId $id -Create } 'overwrite existing campaign'
    Expect-Error { & $freeze -CampaignId $id -Verify } 'missing independent manifest anchor'
    Expect-Error { & $freeze -CampaignId $id -Verify -HostExeName 'PokePixelCoupledWorkspace.exe' -ExpectedManifestSha256 $anchor } 'mismatched host selection'

    # Tamper ONLY a freshly generated ignored temporary tuple, never repo dist.
    $isolatedBundle = Join-Path $campaign 'dist\pokepixel-better-ui.user.js'
    [IO.File]::AppendAllText($isolatedBundle, "`n// deliberate test corruption`n")
    Expect-Error { & $freeze -CampaignId $id -Verify -ExpectedManifestSha256 $anchor } 'corrupted frozen bundle'
    $content = Get-Content -LiteralPath $manifest -Encoding UTF8 -Raw | ConvertFrom-Json
    foreach ($entry in $content.artifacts) {
        if ($entry.path -eq 'dist/pokepixel-better-ui.user.js') {
            $entry.sha256 = (Get-FileHash -LiteralPath $isolatedBundle -Algorithm SHA256).Hash
            $entry.bytes = (Get-Item -LiteralPath $isolatedBundle).Length
        }
    }
    [IO.File]::WriteAllText($manifest, ($content | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
    Expect-Error { & $freeze -CampaignId $id -Verify -ExpectedManifestSha256 $anchor } 'bundle + same-folder manifest rewritten together'
    # Also prove a --smoke request would fail *before* host launch.
    Expect-Error { & $freeze -CampaignId $id -Smoke -ExpectedManifestSha256 $anchor } 'corrupted tuple smoke refusal'
    Write-Output 'PERFORMANCE TUPLE NEGATIVE CHECKS: PASS'
} finally {
    if (Test-Path -LiteralPath $campaign) {
        # This test owns only the unique campaign it just created.
        Remove-Item -LiteralPath $campaign -Recurse -Force -ErrorAction Stop
    }
}
