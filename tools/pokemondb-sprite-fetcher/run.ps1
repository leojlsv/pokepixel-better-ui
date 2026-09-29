param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$FetcherArgs
)

$ErrorActionPreference = 'Stop'
$ToolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $ToolRoot '..\python-toolchain.ps1') -ToolRoot $ToolRoot -EntryPoint 'fetch.py' -ToolArgs $FetcherArgs
exit $LASTEXITCODE
