# Coupled Workspace — WebView2

This is the primary coupled-workspace implementation for PokePixel Better UI.
It replaces the Electron host after repeated `sandboxed_renderer.bundle.js`
`binding.startupData = null` failures in the user's Windows environment.

## Removed PPTools diagnostic path

The PPTools Recommendation relay and its dedicated diagnostic candidate were
removed on 2026-10-02 by Product Owner decision. The current host no longer
accepts PPTools bridge messages, stages a PPTools runner, exposes PPTools CLI
modes, or builds a PPTools-specific candidate. Historical evidence remains in
the project records only.

Live-functional baseline candidate (2026-09-20):

```text
PokePixelCoupledWorkspace.candidate.exe
SHA-256 07DC9364C13F77530ED9FAAF9458FD99ED292E259E7539878A8BB52F1AF70FE8
```

Independent TECH, UX and VISUAL gates were READY for this artifact, and the
Product Owner reported it functional in the live PokePixel environment. A later
F6-F8 keyboard-accessibility audit found one Maintenance Drawer Tab-boundary
defect that was not exercised by that live report.

Post-live keyboard-accessibility correction candidate:

```text
PokePixelCoupledWorkspace.candidate2.exe
SHA-256 638A7AB9BF1F3A49CB21E86B70B9F2CDC39407C4D2566A634913F6D4FDBBFD88
```

The correction moves Drawer boundary Tab/Shift+Tab handling into WinForms'
dialog-key path and adds a regression smoke using `PreProcessMessage`. Focused
TECH, A11Y/QOL, UX and VISUAL re-QA are READY with no remaining P0–P3 findings;
the approved visual evidence is byte-identical. The Product Owner reported this
corrected candidate functional in the live PokePixel environment on 2026-09-20.

The later UI/UX alignment audit produced the current validation candidate:

```text
PokePixelCoupledWorkspace.candidate3.exe
SHA-256 A304E45F55152350A569EB6AA0816779154A11287A8D1062DAEA4E64E4CAF830
```

This pass corrects Command Deck alignment/centering, removes the viewport seam,
keeps dual health visible at the 1180px logical minimum, replaces native light
ComboBox chrome with the Better UI select, keeps WebView keyboard focus cyan
independent from gold current state, normalizes Focus ordering, and adds
Per-Monitor V2/DPI-aware geometry including mixed-monitor Drawer placement.
The final select keyboard path is handled through WinForms `ProcessCmdKey` and
is exercised by the blocking local smoke through `PreProcessMessage`.
Independent TECH-UI, UX/A11Y and render-first VISUAL gates are READY with no
P0–P3 findings, and the Product Owner validated this exact candidate live on
2026-09-20.

The candidate3 source is now promoted to the normal host path:

```text
PokePixelCoupledWorkspace.exe
SHA-256 3C904395CACB17CD8B467FDDEEFC46170B4441B7C88D6BB599100DF32CF84C27
```

Normal-host build, blocking local smoke and compatibility-wrapper validation all
pass. `candidate2` is retained as the previous known-good accessibility-corrected
reference artifact.

The Game Dock UI/UX integration phase was validated in the preserved candidate:

```text
PokePixelCoupledWorkspace.candidate4.exe
SHA-256 E7BC1DA7083B3E095836BB20F99F57571814199317E612F75E4A007EE4A8D924
Better UI bundle SHA-256 87078A53369F3ED15CEF093A583C7CE52596BF5F2ED3D1E88C3B75BEF4CB026B
```

This candidate adds a versioned Coupled Workspace page adapter and one host-owned
Game Dock for the active account. The adapter delegates supported navigation to
the exact existing native menu action, never to a gameplay API, and keeps the
native toolbar as fallback until a correlated capability handshake succeeds.
Navigation messages are bound to the current pane document and command results
must match a pending request id + surface id before they can change host state.
The Game Dock candidate passed the full local Better UI suite, blocking WebView2
smoke and independent TECH/ARCH, UX/A11Y and VISUAL gates with no P0–P3 findings.
The Product Owner reported this exact candidate functional in the live PokePixel
environment on 2026-09-20.

That validated source is now promoted to the normal host path:

```text
PokePixelCoupledWorkspace.exe
SHA-256 924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F
```

The promoted normal host passes the blocking local smoke, the direct WebView2
launcher validation and the compatibility wrapper validation. `candidate2`,
`candidate3` and the exact validated `candidate4` remain preserved as references.

Candidate30 is a historical hunt-console corrective checkpoint and remains unpromoted:

```text
PokePixelCoupledWorkspace.candidate30.exe
SHA-256 EDEE495C4F49E9F01107CD91B72EC9BB2FF31E35C47DAE1F37FF567D3F6A96F6
Better UI 0.2.36 SHA-256 8FDAC0D66BCFBF631D3D3DD22D0389B1985BE765B633CBF32785ABCB08E08DDB
Hunt Analyzer 1.13.2 PROD/embed SHA-256 0E3DFABDB64780E3C04EC659C353D09ACB4C9D7979908E715DA07826F22A29F5
```

The exact current local-validation artifact is `candidate94`; it is the post-live
Card Mode corrective and remains unpromoted:

```text
PokePixelCoupledWorkspace.candidate94.exe
SHA-256 8737FCAB9DE0D9BFE986D46C58F612C52C15E8A9992BFFF8B30C3E77E75F8E79
Better UI 0.2.93 SHA-256 E75399C22C62C6385153C2441B7772C45114F26E5B184949DDE222D7A07FC29E
Hunt Analyzer 1.13.5 PROD/embed SHA-256 BF81D945D852F1FC3B628CA099A47AC2A177EEC1995335DE5D798E9515C1C841
```

Candidate94 passes the normal, shutdown-during-init and shutdown-during-switch local smokes with
empty stderr. The normal smoke actively verifies the Loot rarity filter, four current Active move
icons, Target without XP, wide Target/Captured-Seen crop alignment, and one-row Hunt Story geometry
with local horizontal scrolling. Fresh evidence includes dedicated `1:2` and `2:1` Hunt Story
composites. Better UI exact-current tests are 68/68 Card/Coupled, 170/170 affected and 455/455 full.
Candidate93 / Better UI 0.2.92 remains preserved as the preceding local checkpoint. Independent
exact-current re-gates close candidate94 as **TECH READY**, **UX/A11Y READY** and **VISUAL READY**,
all with `P0=0 P1=0 P2=0 P3=0`. The promoted normal host remains unchanged; live game validation
is still Product Owner-owned.

Better UI `0.2.94` is a later **standalone/Tampermonkey-only corrective**: it adds explicit
page-runtime access for Card Mode and removes the standalone `Cards | Game` selector from native toolbar
layout ownership. It does not change `candidate94` C# bytes. As a coupled regression check, the unchanged
candidate94 binary passes both forced-shutdown lifecycle smokes against the current `0.2.94` dist.
Normal visual-evidence reruns are currently timing-sensitive in the host harness (one failed while
positioning History scroll evidence and another while waiting for the synthetic Analyzer handshake),
so this standalone-only delta does not claim a new exact host gate from those runs. The independently
gated `candidate94 / 0.2.93` tuple above is retained as historical exact provenance rather than silently
relabelling the unchanged binary as a new host candidate.

Better UI `0.2.95` / Hunt Analyzer `1.13.6` is a later additive Cards-data corrective. Hunt Story now
shows **IV Total** for terminal attempts, including failed captures when the Analyzer observed the scalar.
Analyzer bounds the value to 0–186 and still keeps gender, nature and the six individual IVs
captured-only; Better UI sanitizes the scalar again before rendering it. The eight direct-read Hunt Story
fields remain one horizontal row with local scrolling in narrow panes. `candidate94` itself is unchanged:
the host loads Better UI and `dist/pokepixel-hunt-analyzer.embed.js` dynamically, so no host binary
rebuild/promotion is required for this JS-only delta.

For Better UI `0.2.98`, the local-only `candidate96.exe` updates the synthetic visual smoke
to assert all **eight** Hunt Story columns, including the `IV Total` column introduced in
`0.2.95`. The fixture contains bounded totals for captured and failed attempts and waits
up to two seconds for both synthetic bridge/analyzer summaries after navigation. The
`candidate96.exe` `--smoke` run passes with the exact `0.2.98` userscript. This is an
offline harness correction; the existing promoted host, the in-use candidate alias and
the previously gated `candidate94` remain untouched. The Professions HUD's actual
Backpack stacking still requires Product Owner live validation.

Better UI `0.2.99` adds the native Wallet exclusion rule to the Professions HUD.
The new isolated `candidate97.exe` reuses the current host C# without replacing the
promoted host or the candidate alias and passes local `--smoke` against the `0.2.99`
userscript. That generic Card Mode smoke is not a live Team/Wallet geometry test:
the Wallet-aware synthetic layout coverage is in `test/professions-hud.test.js`;
the Product Owner verifies actual native Wallet paint/hit testing in game.

Better UI `0.2.100` supersedes the user-rejected `0.2.99` Professions HUD
visibility fallback: a strict no-overlap candidate could hide the entire HUD.
The new version offers the expanded HUD, a compact header, a wallet-safe 72×40px
`Prof.` tab, then a reversible shortcut in the *visible* native Team controls,
while preserving the same Team/Backpack stacking layer. No room and hidden
native Team controls in extreme portrait fall back to the original Professions
menu. The new isolated `candidate98.exe` passes local `--smoke` with the
`0.2.100` bundle. The smoke remains a synthetic host/UI check rather than
evidence of actual game painting. Neither the promoted host nor the in-use
`candidate.exe` alias is replaced by the new file.

Candidate24 is now a historical predecessor. Product Owner live review drove candidate25 to add
full-session special History (Epic/Legendary/Mythical or any Shiny), Captured/Seen rarity counters,
true Epic+, active-Pokémon EXP progress, primary Pokémon XP/h and compact large-number rendering.
That candidate was then rejected live for three concrete defects: the EXP copy wrapped unnecessarily,
the requested Heal Potion had been misread as an EXP Elixir, and current-target art still did not
resolve in the real page. Candidate26 is the corrective artifact: EXP value/progress stays on one
line, the third Hunt control is the native `auto_potion.potion_item_id` selector populated only from
in-stock `type="potion"` inventory, and target art may reuse only an already-observed same-origin
`/img/characters/` resource whose basename exactly matches the canonical species and normal/Shiny
variant. It does not construct a sprite URL and still rejects PokémonDB.

Candidate26 then exposed a host-only shutdown defect during Product Owner live use: closing the
application could re-enter WinForms `ToolTip.SetToolTip(...)` while the top-level/control handles
were already being destroyed. Candidate27 keeps the Better UI and Analyzer bundles byte-identical
and changes only the host lifecycle: `FormClosing` enters a closing quarantine, stops WinForms
timers before teardown, detaches tooltip associations while handles are valid, suppresses late
WebView2/UI refresh callbacks, removes panes from the live registry before disposing their WebViews,
and disposes the ToolTip last. Smoke mode now fails on `Application.ThreadException` and exercises
late shutdown sinks explicitly.

The independent lifecycle re-gate correctly kept candidate27 out of live delivery because an
already-running `EnsurePaneAsync` could still resume after an await during shutdown and reach
post-initialization UI/error handling. Candidate28 adds explicit closing/current-pane checks after
each lifecycle-relevant await, prevents the initialization catch from opening host UI while closing,
and adds a dedicated `--smoke-close-during-init` path. The exact frozen candidate28 passes the
normal smoke and 20/20 forced close-during-initialization runs with exit 0 and empty stderr.

Candidate28 was also held by the next independent lifecycle pass: an already-entered Single/Dual
mutation could return from its first `EnsurePaneAsync` after shutdown and attempt another pane
creation because the Ensure entry itself was not yet quarantined. Candidate29 closes the boundary
at both entry and continuation: Ensure/Recover/Single/Dual fail closed once shutdown starts,
workspace persistence is suppressed while closing, and the shutdown smoke proves late mutation
calls cannot repopulate the pane registry. A second regression,
`--smoke-close-during-switch`, forces close during Single -> Dual while the first missing pane is
being initialized.

Candidate29 then passed the independent lifecycle gate with **P0=P1=P2=P3=0**, but it was
superseded before live delivery to preserve the host's intentional final workspace-state snapshot.
Candidate30 keeps every candidate29 shutdown guard and makes only that persistence semantic
explicit: ordinary mutation saves still fail closed while `_isClosing`, while
`CompleteShutdown` alone may persist the final coherent workspace state before pane disposal.
Exact candidate30 normal smoke passes, close-during-init passes 20/20, and close-during-switch
passes 20/20, all with exit 0 and empty stderr. Its independent TECH/lifecycle re-gate is
**READY — P0=P1=P2=P3=0**. Product Owner close validation remains the final runtime gate.

Candidate20 established `Cards` as the primary hunt console while keeping explicit `Game` access
for city, gym, PvP and other native contexts. The <=200px battle module now combines the
active Pokémon × canonical target pair with an explicit Shiny state, a player HP rail,
rarity treatment and two direct user controls: active-Team selection and the native
auto-capture Ball preference. These controls are never Analyzer-triggered: they execute
only after an explicit user selection in the current page/account and fail closed when
their native API/state contract is unavailable or cannot be verified. `Auto Ball` edits
the persistent native `auto_capture.common_capsule_item_id` or
`auto_capture.shiny_capsule_item_id`; it is not presented as a one-shot manual throw.

Product Owner live validation then rejected candidate20 because active-player art could remain
blank. Candidate21 added direct canonical PokémonDB species fallback and rejected a fully
transparent active-portrait canvas, but a new regression proved the shared compact Team-card
extractor could still serialize its own transparent canvas first and block every later fallback.
Candidate22 closes that second path in the shared native sprite extractor with the same bounded
alpha inspection: canvases up to 65,536 pixels are rejected only when every inspected alpha is
zero; larger, tainted or otherwise uninspectable native canvases retain the prior conservative
path. Player art still prefers valid native Team HUD art, then valid active portrait art, then the
canonical PokémonDB URL derived from a strict species slug while bounded `getSpecies()` metadata
remains a secondary refinement. No server asset pathname is invented.

Product Owner live validation of candidate22 proved the transparent-canvas correction itself:
Rhydon and Gyarados both rendered. It also exposed the next product defects: mixed native/PokémonDB
art was visually inconsistent; one live account could keep metrics moving while `currentTarget`
failed closed because unresolved persisted `started`/`looted` rows were rehydrated as active; Team
selection omitted levels; History was still too tall and rarity filtering remained single-choice;
and there was no page-local Pause/Reset control for leaving Hunt activity behind in the city.

Candidate24 replaces that behavior without moving Hunt ownership into Better UI. Cards now accepts
only native game visual sources (Team HUD/canvas or sprite metadata actually returned by the native
game API) and explicitly rejects PokémonDB even if such a URL appears in metadata. Analyzer
`currentTarget` now has current-runtime provenance: persisted unresolved rows remain available to
history/reconciliation but never become active solely because IndexedDB contains them; live target
keys are updated only by current runtime encounter changes, preserved across safe full reloads and
cleared with session/cache boundaries. Exact-one live target remains the fail-closed invariant.

The Hunt action surface now shows Team levels, exposes explicit Analyzer-owned Pause/Resume and
Reset controls, keeps Reset non-destructive to prior history by starting a fresh zeroed session and
immediately pausing+locking it, adds multi-select Rarity plus Shiny filtering, and bounds History to
roughly five visible attempt records per responsive presentation with internal vertical scroll.
The current Cards Story presentation keeps one bounded card with two tabs: **Hunt Story** and
**Loot Story**. Hunt Story is the default and keeps the explicit All/Captured/Failed Result
filter alongside Rarity and Shiny. Each Hunt event exposes Time, Rarity, Pokémon, Quality, Result,
Ball, Chance and IV Total in one row; captured Genetics is readable inline. Narrow panes use a local
horizontal scroll surface instead of reflowing fields or forcing horizontal document overflow. Loot Story uses the same bounded
surface for canonical per-encounter Direct Gold, loot sell value, realized Pokémon auto-sell and
recomputed total value. It does not infer item names or quantities that the Analyzer does not own.
Candidate23 first implemented this delta but was **superseded before delivery** after exact smoke
found the old narrow `<520px` History rule still overriding the new height at 252px. Candidate24
fixes only that responsive override/test contract.

Candidate24 verification: Hunt Analyzer **434/434 PASS + build/verify PASS**, Better UI coupled
focused **35/35 PASS**, full **336/336 PASS + build PASS**, exact `candidate24 --smoke` **PASS** with
exit `0` and empty stderr. Fresh render evidence was regenerated at `20:17:05–08Z`. Independent
TECH/ARCH, UX/A11Y and VISUAL gates are all **READY (P0=P1=P2=P3=0)**. Independent local acceptance
is **ACCEPTED (P0=P1=P2=P3=0)** for Product Owner live validation only. The normal host remains SHA
`924D3E...498F` and intentionally unpromoted; these gates do not authorize promotion, Git history
or release.

## Architecture

One WinForms window contains:

```text
+--------------------------------------------------------------------------+
| 1/2 ACC | account | 1:2 1:1 2:1 | Swap | Focus | Active/Both | Home ... |
+-----------------------------------+--------------------------------------+
| Cards: active Pokémon × target + Hunt analytics/history (default)        |
| Game: underlying isolated WebView2 surfaces (explicit/native module)     |
+-----------------------------------+--------------------------------------+
| Rhyxus | Rhyosa | Cards Game | MENUS READY | seven favorites | Menus ... |
+--------------------------------------------------------------------------+
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

## Hunt Analyzer embed

The Coupled Workspace also builds the sibling `pokepixel-hunt-analyzer` project and
copies its generated production userscript to the ignored local artifact:

```text
dist/pokepixel-hunt-analyzer.embed.js
```

`Prepare-HuntAnalyzerBundle.ps1` resolves the Analyzer repository from the
`POKEPIXEL_HUNT_ANALYZER_REPO` environment variable when set, otherwise from the
default sibling folder `../pokepixel-hunt-analyzer`. The normal launcher runs this
preparation step whenever `-SkipBuild` is not used.

The host registers the Analyzer bundle before Better UI and executes it at document
start only on the exact PokePixel origin. An explicit
`__POKEPIXEL_HUNT_ANALYZER_EMBED__` protocol marker keeps the Analyzer in UI-less
embed mode: its passive protocol pipeline, domain calculations and profile-local
IndexedDB remain authoritative, but its panel/HUD and auxiliary UI are not mounted.

Better UI consumes only the Analyzer-owned versioned public summary provider. The
Cards view may consume additive page-local `currentTarget`, bounded all-rarity
`attemptHistory`, whole-session special `specialHistory`, and bounded financial
`lootHistory` fields. The host no longer receives any Hunt telemetry relay; it
does not inspect Analyzer IndexedDB, WebSocket frames, encounter rows or credentials
or reimplement Analyzer metric formulas.

Cards is the primary Hunt operating surface and renders Hunt Summary, Seen by rarity,
capture performance, Hunt/Loot Story and throughput/economy directly in the WebView. Hunt Story
keeps the special-session Epic/Legendary/Mythical plus Shiny view with Rarity, Result and Shiny
filters; Loot Story is a bounded per-encounter financial projection only. Economy includes
Analyzer-owned total revenue/revenue per hour, expenses, profit/profit per hour and
canonical loot sell value; itemized loot is not inferred from that value. The entire simplified active-Pokémon ×
current-target battle/control module is capped at 200px logical height; it is not a battle
platform, gallery or carousel. `Última chance` is the chance recorded for the latest
completed capture attempt and is never presented as a prospective target chance. A Shiny
target is explicitly labeled in addition to its visual edge treatment, and Hunt Story rows keep
Shiny textual state rather than relying on color alone.

The Cards action boundary is narrow and explicit. `Trocar Pokémon` is a six-row Team roster
positioned immediately left of the active Pokémon card. Every occupied row shows Pokémon +
level; the active row is selected, fainted members remain visible but disabled, and an
explicit row selection can request exactly one active-Team change only after verifying the
resulting native `leader_id`. Card Mode no longer owns Auto Ball or Heal Potion controls;
capture/healing configuration stays in Auto-Helper. Analyzer remains read-only and
authoritative for Hunt telemetry.

The host has a 44px Command Deck, the account panes and a 44px Game Dock.
The former 32px Hunt Analyzer Context Rail was removed; Cards keeps its
Analyzer-owned metrics locally, and the native Hunt Analyzer remains accessible
through Game Dock. Mixed Cards/Game views share the same three-row host shell.

As of the 2026-09-29 host-chrome refresh, the Game Dock shows a direct
`Rhyxus | Rhyosa` account selector in Dual and Dual Focus modes. The selected
button is labeled with the account name and a check mark and remains synchronized
with the Command Deck and the focused WebView. Choosing an account uses the same
host `ActiveProfileId` path as the top controls; it does not execute a game
command. Single retains its plain active-account label below and the existing
top profile selector. `MENUS OFFLINE` replaces the long unavailable caption so
the 44px row still fits at 1180 logical pixels with disabled native menu buttons.
Host typography, surfaces and neutral borders now follow MASTER 3.0's integrated
game palette. These changes require Product Owner in-game confirmation.

The subsequent `0.2.112` QoL batch adds seven **customizable quick destinations
per account** in the existing one-row Game Dock. Open Maintenance (`...`) →
**Game Dock shortcuts** to replace a slot using only known native menu IDs.
Choosing an already assigned destination swaps its slot, keeping seven unique
buttons; unavailable native destinations stay disabled. The `Menus` overflow
still exposes available native destinations not already assigned. The active
account remains the only navigation target even when Home/Reload scope is Both.

In the same Maintenance Drawer, **Active account zoom** applies a 90%, 100%,
110% or 125% WebView2 zoom preset only to the selected account, with reset to
100%. Each account's zoom and seven favorite IDs persist independently in
versioned workspace settings; v1 preferences are accepted and normalized into
v2 without copying either account's WebView2 user-data folder. The drawer's
read-only account health panel reports both profiles without retargeting the
active account or changing which pane Recover acts on.

The dock reserves its compact availability space to avoid horizontal shifts
between `MENUS READY`, `MENUS OFFLINE` and `OPEN FAILED`. A failed correlated
native menu-open result includes destination/account text in its accessible
status/tooltip, leaves the game-authoritative action failed, and never retries
automatically. The Command Deck keeps layout, Swap, Focus, scoped Home/Reload
and readable per-account health while removing the redundant expanded active
caption. Narrow Hunt Story now reflows all eight labels and values into two
rows without a horizontal scrollbar; wider panes retain the prior table.
Section shortcuts inside coupled Cards appear only after scrolling. Copy
Summary uses the available page-local Analyzer projection and excludes private
session data. The normal/installed host is deliberately unchanged until
Product Owner validation of the new isolated candidate.

The `0.2.113` / isolated `candidate114` correction keeps textual target rarity
and `✦ SHINY` visible in the narrow Cards battle header. Maintenance's
`Reset layout` also reapplies 100% zoom immediately to both live WebView2
profiles. The 1180px synthetic renders and zoom-reset smoke pass; independent
rendered DPI 125/150%, zoomed-pane visuals and dynamic failure-state captures
remain separate evidence gaps for Product Owner validation. The regular host
executable remains unchanged.

The subsequent Better UI `0.2.114` / isolated `candidate115` updates only the
narrow Hunt Story presentation after the Product Owner rejected the crowded
two-line mini-table. Species/Rarity become the visual header; Time, Result,
Ball, Quality, Chance and IV Total use individually labeled, responsive fact
bands. At actual history widths <=320px the card uses two columns instead of
clipping its trailing facts. Native Pokémon art, explicit Shiny status,
captured-only genetics, bounded vertical scrolling, filters, and the wider
eight-column table remain intact. A dedicated synthetic 235px screenshot and
eight-field geometry checks supplement the 1180px Dual ratio renders.

`Cards | Game` itself is stored per profile. The shared host selector controls only the
Active account, changing Active only updates the selector's current-state indication, and
native Game Dock navigation switches only its active target to Game. Those divergent view
choices survive Swap, Focus/Restore, Single/Dual recreation and pane recovery.

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
and tokens remain WebView2-owned and are never serialized by the host. Structural state
includes a backward-compatible per-profile Cards/Game preference; older state files that
do not contain it default each profile to Cards.

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
- Cards is the default Hunt console, its real Better UI dashboard is visible and its
  battle strip remains <=200px with no horizontal overflow, explicit Shiny state, a six-row
  active-Team roster to the left of the active Pokémon, no duplicate Auto Ball/Heal Potion
  controls or obsolete YOU/TYPE midpoint, and a bounded 32-row all-rarity History;
- Cards/Game can diverge per profile; toggling Active Rhyxus does not mutate Rhyosa,
  changing Active only updates selector state, and independent explicit toggles may put
  either or both profiles in Game;
- native module activation targets only the active profile and switches only that target
  to Game; the Game Dock directly follows the account panes in every view mode;
- Swap, Focus/Restore, Single/Dual recreation and active-pane recovery preserve each
  profile's Cards/Game choice;
- the 44px Game Dock remains visible while bridge capabilities are unavailable,
  keeps Cards/Game enabled, disables native modules and shows visible unavailable
  copy, then recovers when capabilities return;
- representative local-only renders cover Cards Dual 1600/1180/1:2, Single,
  Focus left/right, dual Game, mixed Cards/Game, host focus states and Maintenance Drawer.

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

The launcher runs the **existing** executable and does not rebuild any
userscript, Analyzer bundle or host by default. This also applies to the
compatibility wrapper and its legacy `-SkipBuild` option. Use `-Plan` to print
the selected executable/mode **without launching anything**. For intentional
isolated candidate compilation, use the builder with `-Candidate` (or the
corresponding evidence candidate option); the launcher accepts an
explicit `-Build` only with an isolated target. Normal-host recompilation
requires the builder's separate `-PromoteNormal` flag and user-owned acceptance;
ordinary launch and smoke flows cannot promote it by accident.
Shared runtime DLLs are preserved when their hashes already match the staged
sources. A mismatching existing shared dependency now
causes the candidate build to fail rather than overwriting another host's
runtime; upgrade that dependency only through a separately reviewed artifact
tuple. An explicitly approved normal-host promotion backs up the previous EXE
under ignored `.local-evidence/native-host-promotions/`.

The compatibility wrapper at `tools/coupled-workspace/Start-CoupledWorkspace.ps1`
forwards to this WebView2 launcher, so the previous command remains valid.

## Validation boundary

The smoke test establishes local host/WebView2 behavior only. Account login,
PokePixel networking and live native action behavior remain Product Owner-only validation.
Candidate20's Hunt console is exercised locally using the real Better UI bundle on
synthetic pages, including the bounded battle geometry, Shiny contract and availability of
the two explicit Hunt controls. The candidate still requires Product Owner validation
against the live game before any normal-host promotion. The current normal host remains
the previously validated Game Dock build.
