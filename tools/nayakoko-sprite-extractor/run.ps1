param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ExtractorArgs
)

$ErrorActionPreference = 'Stop'
$ToolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $ToolRoot '..\python-toolchain.ps1') -ToolRoot $ToolRoot -EntryPoint 'extractor.py' -ToolArgs $ExtractorArgs
exit $LASTEXITCODE
