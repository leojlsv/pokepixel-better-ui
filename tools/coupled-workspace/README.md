# Coupled Workspace — archived Electron prototype

> Superseded implementation. The Electron host remains here only for reference.
> `Start-CoupledWorkspace.ps1` now forwards to
> `tools/coupled-workspace-webview2/Start-CoupledWorkspaceWebView2.ps1`, which is
> the active implementation after repeated Electron `sandboxed_renderer.bundle.js`
> startup failures on the user's Windows environment.

> The only active file in this directory's runtime path is the compatibility
> launcher `Start-CoupledWorkspace.ps1`, which forwards to WebView2. The Electron
> source, package metadata and smoke fixtures below are retained as historical
> implementation evidence and are not the current install/runbook.

This directory preserves the earlier Electron single-frame prototype for running
the Rhyxus and Rhyosa PokePixel sessions together. It replaced the still-earlier
Dual Edge Workspace tiler during exploration, and was itself superseded by the
current WinForms + WebView2 host.

## Architecture

The workspace uses one Electron `BrowserWindow` for the trusted local toolbar
plus two child `BrowserView` panes for the remote game sessions:

```text
+---------------------------------------------------------------+
| Rhyxus controls | 33/67 50/50 67/33 | Rhyosa controls       |
+----------------------------+----------------------------------+
|                            |                                  |
| persist:ppbui-rhyxus       | persist:ppbui-rhyosa            |
|                            |                                  |
|      PokePixel session     |      PokePixel session           |
|                            |                                  |
+----------------------------+----------------------------------+
```

The two panes resize with the application frame. The toolbar slider supports any split from 20/80 through 80/20, with 33/67, 50/50 and 67/33 presets.

The remote panes deliberately use the legacy `BrowserView` path. In this
Windows environment, sandboxed `WebContentsView` renderers hit Electron's
`binding.startupData.preloadScripts` bootstrap failure, while equivalent
sandboxed `BrowserView` panes pass the local regression smoke.

A drag-across-pane splitter is deliberately not part of this MVP. The remote
views are native child surfaces, so the slider/presets own the split until
cross-view pointer interaction is validated separately.

## Sessions

The account sessions are independent persistent Electron partitions:

```text
persist:ppbui-rhyxus
persist:ppbui-rhyosa
```

They do not reuse, move or modify the Microsoft Edge profile databases. On the first run, log into Rhyxus in the left pane and Rhyosa in the right pane. Electron then persists cookies/storage for each partition under the app's Windows user-data directory.

## Better UI integration

The launcher builds the current Better UI userscript and copies the exact bundle into a small unpacked extension under `extension/`.

Electron loads that extension into both persistent sessions before navigating. The extension uses a Manifest V3 content script with:

```text
run_at: document_idle
world: MAIN
match: https://pokepixel.nietore.com/*
```

This works for Better UI because the userscript is a browser IIFE with `@grant none` and no `GM_*`, `unsafeWindow`, `@require` or other Tampermonkey-only API dependency.

Tampermonkey itself is not required inside the coupled workspace.

The toolbar reports **Loader ready** when the unpacked extension was loaded into
both Electron sessions. That status deliberately does not claim that Better UI
executed correctly in the live game; live execution/rendering remains user
validation.

## Security boundaries

Remote game panes use:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `sandbox: true`;
- `webSecurity: true`;
- no preload or IPC bridge exposed to the game page;
- default-deny browser permission handlers;
- navigation and server redirects restricted to the configured HTTPS PokePixel
  origin;
- `window.open` denied in the MVP so a popup cannot escape the coupled frame.

The local toolbar preload exposes only split control and the explicit Home, Reload and DevTools commands.
The toolbar is a trusted local `file://` `BrowserWindow` surface with
`contextIsolation: true`, `nodeIntegration: false`, and `sandbox: false`.
The explicit non-sandboxed setting avoids the Electron/Windows sandbox preload
bootstrap failure observed in this workspace. The two remote PokePixel panes
remain `sandbox: true`, have no preload bridge, no Node integration, context
isolation enabled, and web security enabled.
Each game pane also reports main-frame loading state back to the local toolbar.
If navigation fails, the pane status becomes `Load error`; hovering that status
shows the Electron error code, description and failing URL.

## Historical Electron install — archived

Do not install these dependencies for the current Coupled Workspace. The active
WebView2 host bootstraps its own pinned SDK through
`tools/coupled-workspace-webview2/Ensure-WebView2Sdk.ps1`.

Dependencies are isolated to this tool:

```powershell
cd G:\pokepixel-better-ui\tools\coupled-workspace
npm install
```

The archived Electron prototype was pinned to Electron 44.4.3.

## Current compatibility validation

From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\coupled-workspace\Start-CoupledWorkspace.ps1 -SkipBuild -ValidateOnly
```

The command above forwards to the active WebView2 smoke. The Electron-only smoke
commands below are archival diagnostics and are not part of the current release
gate:

```powershell
cd .\tools\coupled-workspace
npm run smoke
```

The smoke test uses only local `file://` pages. It verifies the production
`BrowserWindow + BrowserView` composition with the real toolbar page, two
sandboxed game-pane views, isolated sessions, bounds, toolbar IPC/state
rendering, extension loading and `world: MAIN` execution.

To exercise the remote-pane runtime model without opening PokePixel, run:

```powershell
npm run smoke:remote
```

That test starts a local HTTP server and verifies two persistent sandboxed
`BrowserView` panes with Node integration disabled, context isolation and web
security enabled, the MV3 extension loaded before navigation and a `MAIN`-world
content-script marker in both panes.

## Current run path

From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\coupled-workspace\Start-CoupledWorkspace.ps1
```

The launcher forwards to the normal WebView2 Coupled Workspace launcher. It does
not start the archived Electron host.

If the exact `dist` candidate is already built:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\coupled-workspace\Start-CoupledWorkspace.ps1 -SkipBuild
```

## Validation boundary

Automated/local validation does not establish live PokePixel correctness or
rendered Better UI correctness. The Product Owner performs live validation of
the active WebView2 Coupled Workspace; the archived Electron implementation is
not part of that current validation surface.
