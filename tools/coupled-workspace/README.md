# Coupled Workspace — compatibility launcher

The active Coupled Workspace uses WinForms + WebView2 in
`../coupled-workspace-webview2/`. The historical Electron prototype, its local
dependency tree and its unpacked extension have been retired. Historical
implementation and validation records remain available in Git history and
`../../docs/COUPLED_WORKSPACE_STATUS.md`.

`Start-CoupledWorkspace.ps1` is retained to support existing launch shortcuts.
It forwards to the active WebView2 launcher without opening Electron:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\coupled-workspace\Start-CoupledWorkspace.ps1
```

Launch uses the already-built WebView2 executable without rebuilding by
default. `-SkipBuild` remains accepted for older shortcuts; use
`-ValidateOnly` to run the active host's local smoke checks. The
production Better UI bundle is generated at `dist/pokepixel-better-ui.user.js`;
the WebView2 host loads that file directly.

In-game validation belongs exclusively to the Product Owner.
