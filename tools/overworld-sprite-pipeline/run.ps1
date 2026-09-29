param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$PipelineArgs
)

$ErrorActionPreference = 'Stop'
$ToolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $ToolRoot '..\python-toolchain.ps1') -ToolRoot $ToolRoot -EntryPoint 'pipeline.py' -ToolArgs $PipelineArgs
exit $LASTEXITCODE
