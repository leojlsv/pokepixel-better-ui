# Coupled Workspace — WebView2

This is the primary coupled-workspace implementation for PokePixel Better UI.
It replaces the Electron host after repeated `sandboxed_renderer.bundle.js`
`binding.startupData = null` failures in the user's Windows environment.

Live-functional baseline candidate (2026-09-20):

```text
PokePixelCoupledWorkspace.candidate.exe
SHA-256 07DC9364C13F77530ED9FAAF9458FD99ED292E259E7539878A8BB52F1AF70FE8
```

Independent TECH, UX and VISUAL gates were READY for this artifact, and the
Product Owner reported it functional in the live PokePixel environment. A later
F6-F8 keyboard-accessibility audit found one Maintenance Drawer Tab-boundary
defect that was not exercised by that live report.

Final corrected validation candidate:

```text
PokePixelCoupledWorkspace.candidate2.exe
SHA-256 638A7AB9BF1F3A49CB21E86B70B9F2CDC39407C4D2566A634913F6D4FDBBFD88
```

The correction moves Drawer boundary Tab/Shift+Tab handling into WinForms'
dialog-key path and adds a regression smoke using `PreProcessMessage`. Focused
TECH, A11Y/QOL, UX and VISUAL re-QA are READY with no remaining P0–P3 findings;
the approved visual evidence is byte-identical. The Product Owner reported this
corrected candidate functional in the live PokePixel environment on 2026-09-20.

The corrected source is now promoted to the normal host path:

```text
PokePixelCoupledWorkspace.exe
SHA-256 052D146BED95045FED641A56CD1A8C64178CFAD9AEB570800A7C0CF9AF609F81
```

Normal-host build, local smoke and compatibility-wrapper validation all pass.

## Architecture

One WinForms window contains:

```text
+--------------------------------------------------------------------------+
| 1/2 ACC | account | 1:2 1:1 2:1 | Swap | Focus | Active/Both | Home ... |
+-----------------------------------+--------------------------------------+
| 2px active/inactive host rail     | 2px active/inactive host rail       |
| WebView2                          | WebView2                             |
| profile-owned UDF                 | profile-owned UDF                    |
+-----------------------------------+--------------------------------------+
```

The command deck adapts to **Single**, **Dual** and **Focus** modes. Dual mode
supports semantic `1:2`, `1:1` and `2:1` presets, a bounded native splitter,
Swap, active-account selection and layout-only Focus/Restore. Common Home and
Reload commands use explicit `Active` / `Both` host scope; they never relay
gameplay input.

`AccountPane` lifetime is keyed by profile identity rather than physical
left/right position. Dual→Single preserves the active pane and disposes only
the inactive one; Single→Dual reuses the surviving pane and lazily initializes
only the missing profile. Swap never exchanges UDF ownership.

The two WebView2 controls use different `CoreWebView2Environment` user-data
folders under:

```text
%LOCALAPPDATA%\PokePixelCoupledWorkspace\Rhyxus
%LOCALAPPDATA%\PokePixelCoupledWorkspace\Rhyosa
```

Cookies, local storage and login state therefore persist independently.

## Better UI

The launcher builds the current repository `dist/pokepixel-better-ui.user.js`.
The host reads that exact local bundle and registers it with
`AddScriptToExecuteOnDocumentCreatedAsync` in both views before navigating to
PokePixel. The injected wrapper runs only when:

```text
location.origin === https://pokepixel.nietore.com
```

The launch URL is intentionally `https://pokepixel.nietore.com/play/` with the
trailing slash. The slash-less endpoint currently responds with an HTTP 308
redirect to `http://pokepixel.nietore.com/play/`; the workspace correctly
rejects that HTTPS-to-HTTP downgrade.

It also installs a per-document idempotence marker and a separate post-success
ready marker. `UI READY` is published only when
`window.__PPBUI_WEBVIEW2_READY__` is observed after the injected bundle has
returned successfully.

No Tampermonkey extension is required inside this host.

## Navigation/security boundary

Each WebView2:

- navigates only to `https://pokepixel.nietore.com/...` during normal mode;
- blocks `NewWindowRequested`;
- denies browser permission requests;
- exposes no host-object bridge to the remote page;
- uses the Edge WebView2 Runtime already installed on Windows.

Home and Reload are explicit host/browser actions in the primary command deck.
DevTools, recovery, detailed runtime/error information, diagnostics copy and
workspace reset live in a 360px native Maintenance Drawer. The drawer overlays
the WebView2 surface without resizing it and uses Better UI square scrollbar
treatment rather than the native light WinForms scrollbar.

Workspace UI state is stored in versioned
`%LOCALAPPDATA%\PokePixelCoupledWorkspace\workspace.json`; credentials, cookies
and tokens remain WebView2-owned and are never serialized by the host.

## Build toolchain

No .NET SDK installation is required. The build uses the .NET Framework x64
compiler already present at:

```text
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe
```

The exact Microsoft.Web.WebView2 SDK version is pinned to `1.0.4191.47`.
`Ensure-WebView2Sdk.ps1` downloads that NuGet package only when the local SDK
files are missing or the assembly version differs. The package SHA-256 is
pinned and verified before extraction, and the extracted Core assembly version
is checked again. The generated executable and SDK extraction are ignored by Git.

## Local smoke test

The smoke test does not open PokePixel:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\coupled-workspace-webview2\Start-CoupledWorkspaceWebView2.ps1 -Smoke
```

It verifies:

- both WebView2 controls initialize;
- Rhyxus/Rhyosa environments use different user-data folders;
- both views navigate independent local pages;
- document-created scripts execute independently and the post-success ready
  marker is set;
- structured settings round-trip and safely reject corrupt/future state;
- Dual→Single→Dual and Single profile switching preserve the approved pane/UDF
  lifecycle;
- `1:2` / `1:1` / `2:1`, 24px release snap, custom ratios and the effective
  20–80% + 320px splitter bounds;
- Swap/Focus/Restore preserve profile, object and UDF identity;
- Active/Both command targeting and recovery isolation;
- diagnostic URL redaction;
- keyboard focus remains cyan while selected/current remains gold;
- representative local-only visual renders, including composited WebView2
  previews for the 2px host rail and Maintenance Drawer overlay.

For a candidate-safe validation while another normal workspace instance is
running:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\coupled-workspace-webview2\Build-WebView2Workspace.ps1 -Candidate
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\coupled-workspace-webview2\Start-CoupledWorkspaceWebView2.ps1 -SkipBuild -Smoke -Candidate
```

## Run

From repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\coupled-workspace-webview2\Start-CoupledWorkspaceWebView2.ps1
```

The compatibility wrapper at `tools/coupled-workspace/Start-CoupledWorkspace.ps1`
forwards to this WebView2 launcher, so the previous command remains valid.

## Validation boundary

The smoke test establishes local host/WebView2 behavior only. Account login,
PokePixel networking, gameplay behavior and Better UI rendering remain
Product Owner-only live validation. Both the original baseline candidate and the
final corrected candidate were reported functional live on 2026-09-20; the
normal host now contains the corrected source.
