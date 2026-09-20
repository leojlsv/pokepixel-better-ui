# Dual Edge Workspace — archived prototype

> Superseded for the coupled-workspace requirement. This tool launched and tiled
> two independent Microsoft Edge windows; it is retained only as historical
> implementation evidence and is not a supported run path.

The supported single-frame multi-account host is now:

```text
tools/coupled-workspace-webview2/
```

The legacy entry point:

```text
tools/coupled-workspace/Start-CoupledWorkspace.ps1
```

is only a compatibility wrapper that forwards to the WebView2 host.

## Historical rationale

Dual Edge was the first attempt to preserve two independent browser sessions
while presenting them as a predictable workspace. It intentionally avoided
gameplay automation, request modification and browser-state sharing, but the two
sessions remained separate top-level Windows windows rather than one native
application frame.

That limitation led to the single-frame host work. Electron was evaluated next
and then superseded after Windows renderer/bootstrap failures. The final
implementation uses WinForms + WebView2 with isolated per-profile user-data
folders, native layout controls and the Better UI host chrome.

No current installation, validation or launch instructions are kept here to
avoid presenting this archived tool as an alternative supported runtime. For the
active workflow, see `tools/coupled-workspace-webview2/README.md` and
`docs/COUPLED_WORKSPACE_STATUS.md`.
