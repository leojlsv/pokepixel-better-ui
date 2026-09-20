# Coupled Workspace — Command Deck Design Override

Status: **Implementation complete; corrected candidate TECH / A11Y / UX / VISUAL READY; Product Owner live revalidation functional; normal host promoted**
Direction: **compact dual-account field-console workspace**
Recorded: **2026-09-20**

This page specializes `../MASTER.md` for the native WebView2 Coupled Workspace.
It governs only the host chrome around PokePixel. It does not redesign the game
canvas or reopen previously validated Better UI modules.

## Design intent

The Coupled Workspace is a compact field console for managing one or two independent
PokePixel sessions. The game viewport remains the focal surface. Host chrome must make
account identity, layout, active context, health and maintenance obvious while consuming
as little permanent vertical/horizontal space as practical.

The visual hierarchy is:

1. game viewport(s);
2. account identity + active context;
3. layout/mode controls;
4. host health/status;
5. progressive-disclosure maintenance.

Large surfaces remain charcoal. Stone edges provide structure, cyan owns interaction
and keyboard focus, gold owns persistent active/current pane, green is healthy/ready,
and red is error/failure. No SaaS cards, glass, blurred shadow or decorative dashboard
chrome is introduced.

## Non-visual constraints

- Runtime remains WinForms + WebView2; Electron is superseded.
- One profile maps to one persistent WebView2 user-data folder. Never share/copy a UDF
  between accounts.
- Current exact-origin HTTPS navigation boundary, external-scheme block, popup block,
  permission deny and ProcessFailed diagnostics remain fail-closed.
- Better UI injection remains top-frame only, exact-origin, document-idle and
  idempotent per document.
- The host stores no password, token, cookie export or other credential material.
- 1 Account mode may avoid creating the second WebView2 until needed.
- Hiding/focusing/swapping panes must not mutate authoritative game state.
- Shared controls are limited to browser/host operations. Never mirror raw keyboard,
  mouse or gameplay commands between accounts.
- Product Owner retains exclusive live PokePixel validation.

## Component inventory / migration

| Family | Classification | Direction |
| --- | --- | --- |
| WebView2 game canvas | MATCH | Preserve as dominant content; host does not repaint game viewport |
| Current 44px toolbar shell | REDESIGN | Become one adaptive Command Deck with clear account/mode/layout hierarchy |
| Hardcoded Rhyxus-left / Rhyosa-right assumption | REDESIGN | Introduce Profile ↔ Pane mapping; profiles may swap visual sides without UDF mutation |
| 33/67 / 50/50 / 67/33 labels | REDESIGN | Semantic **1:2 / 1:1 / 2:1** segmented layout control |
| Native SplitContainer | REFINE | Keep draggable splitter, add bounded 20–80 behavior and semantic snap points |
| Account-count control | NEW | Explicit **1 ACC / 2 ACC** segmented control |
| Single-profile selector | NEW | Compact profile selector visible in single mode only |
| Active pane | NEW | Exactly one current pane in dual mode; gold current-state cue, cyan focus independent |
| Swap | NEW | Compact host command; swaps visual pane/profile mapping only |
| Focus / Restore | NEW | Temporarily promote active pane to full viewport and restore previous dual composition |
| Per-side duplicated Home/Reload | REDESIGN | Contextual command group targets Active by default; explicit scope can be Both |
| Per-side permanent DevTools | REMOVE from primary deck | Move to Maintenance Drawer |
| Loaded/error text | REDESIGN | HealthIndicator family: Initializing / Loading / Ready / UI Ready / Error / Process Failed |
| Maintenance Drawer | NEW | Progressive disclosure for DevTools, runtime, detailed errors, recovery and settings reset |
| Raw `split.txt` persistence | REMOVE | Replace with versioned structured workspace settings |
| Electron workspace | REMOVE | Retain only archived/superseded reference; launcher targets WebView2 |
| Mirrored input / gameplay sync | REMOVE / prohibited | Never implement as workspace functionality |
| Bespoke raster art | ASSET NEEDED: NO | MASTER CSS/WinForms primitives are sufficient for host chrome |

## Art direction

Use MASTER's Miyazaki 16 grammar without inventing a parallel native-desktop theme:

- background/surface: `#232228`;
- structural edge: `#5F5854`;
- strong neutral edge: `#878573`;
- interaction/focus: `#2485A6` / `#54BAD2`;
- active/current pane: `#E3C054`;
- healthy/ready: `#55A058`;
- error: `#C65046`;
- primary text: `#EBECDC`;
- muted text: `#C3D5C7`;
- 0px radius;
- 2px primary edges;
- hard/no-blur depth only when a native control needs separation;
- generic monospace family;
- 28px standard controls, 24px only for clearly secondary maintenance utilities;
- low motion: state changes may be immediate or brief; no decorative transitions.

The native host cannot consume CSS tokens directly, so implementation constants must be
named by the same semantic roles and kept visually aligned with MASTER rather than
scattering raw one-off colors through controls.

## Command Deck composition

### Dual mode — default

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [2 ACC] RHYXUS ● │ [1:2][1:1][2:1] [⇄] │ ● RHYOSA │ ACTIVE:RHYXUS ⋯ │
├──────────────────────────────────┬─────────────────────────────────────┤
│                                  │                                     │
│              Rhyxus              │                Rhyosa               │
│                                  │                                     │
└──────────────────────────────────┴─────────────────────────────────────┘
```

- Command Deck target height remains **44px** at normal desktop width.
- Account identity anchors the left/right context; layout controls occupy the center.
- Active account text/status must not force the primary controls to shift materially.
- The active/current pane gets a persistent gold structural cue; keyboard focus remains
  independently cyan.

### Single mode

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [1 ACC] Account [RHYXUS ▾] │ ● UI READY │ [Home][Reload] │ [2 ACC] ⋯ │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                              Rhyxus                                    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

- Only one profile selector is shown.
- Dual-only layout/swap controls disappear rather than becoming disabled clutter.
- The current account identity and health stay visible.

### Focus mode

```text
┌────────────────────────────────────────────────────────────────────────┐
│ RHYXUS ● │ FOCUS │ [Restore dual] │ [Home][Reload] │ ⋯               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                              Rhyxus                                    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

- Hidden secondary pane remains logically alive. Focus/Restore is layout-only: it must not
  navigate, dispose, recreate or retarget the hidden session. Recreate is allowed only through
  an explicit recovery action after a diagnosed pane/process failure.
- Restore returns to the previous dual ordering + ratio, not an arbitrary default.

## Controls and states

### Account-count segmented control

- Two explicit options: `1 ACC` and `2 ACC`.
- Current option uses MASTER selected/current treatment (gold structural cue).
- Keyboard focus remains cyan and independent.
- **Dual → Single:** the currently active profile becomes `singleProfileId`, its existing
  WebView2 instance remains live and expands to the full workspace, and the inactive
  AccountPane is disposed to release CPU/RAM. Its cookies/storage remain in its UDF.
- **Single → Dual:** restore the last persisted dual left/right profile mapping. Reuse the
  live single AccountPane on whichever side owns that profile; lazily initialize only the
  missing counterpart from its own UDF. Switching may show a short `INITIALIZING` state.
- A host that starts directly in Single mode initializes only the selected single profile;
  the second account is not created until Dual mode or an explicit profile switch requires it.

### Layout segmented control

- Options are `1:2`, `1:1`, `2:1`.
- Selected preset is gold/current.
- Moving the native splitter away from a preset may clear selected preset while preserving
  the exact custom ratio.
- Snap occurs **only when the user releases the native splitter**. If the released splitter
  position is within **24px** of the exact 1:2, 1:1 or 2:1 target, adopt that preset;
  otherwise preserve the custom ratio. There is no continuous magnetic snap while dragging.
- Free dragging targets a nominal **20–80%** range, but the hard pane minimum is **320px**.
  The effective runtime bound is therefore `max(20%, 320px / availablePaneWidth)` on each
  side. At the 1180px minimum host width the pixel minimum wins; the UI must never force a
  20% pane below 320px merely to preserve the percentage.

### Profile selector

- Visible in single mode; compact labeled select/combo treatment.
- Never displays UDF paths, tokens or technical IDs in the primary deck.
- Changing profile in Single mode disposes the current AccountPane after detaching it from
  layout, then lazily initializes the selected profile from its own persistent UDF.
- A profile switch never copies/merges cookies or host state between accounts.

### Active pane

- Pointer interaction with a pane or an explicit account selector can make it active.
- Exactly one active pane in dual mode.
- **Active identity follows the profile/account, not the physical side.** If Swap moves the
  active profile from left to right, Active moves with that profile so Active-scoped Home/
  Reload continue targeting the same account.
- Pane geometry uses a quiet **2px top status rail** owned by the host frame: inactive =
  neutral strong edge; active/current = gold. Do not draw a full gold rectangle around
  the game viewport.
- The Command Deck account selector for the active pane also carries explicit `ACTIVE`
  copy/current semantics so active state is not color-only.
- Keyboard focus remains independent: focusable account/layout controls use the MASTER
  **2px cyan focus outline** while the gold pane rail remains unchanged. When keyboard
  focus moves into the WebView2 itself, the active account indicator in the Command Deck
  retains the gold/current cue and receives a compact cyan focus marker; the game viewport
  is not repainted.
- Active state must not be inferred from color alone: account text/current label or icon
  also identifies the context.

### Scoped commands

Approved common host/browser operations may expose:

- `Active` (default);
- `Both` (explicit scope).

Initial approved scoped commands: Home and Reload. Future host-only commands such as zoom
or mute require their own acceptance criteria before becoming visible commands. Per-profile
zoom preference is nevertheless part of the approved persisted workspace schema so adding
the visible zoom control later does not require a settings migration. Raw input/gameplay
actions are not eligible for common scope.

### HealthIndicator

Required state family:

- `INITIALIZING` — neutral/informational;
- `LOADING` — informational;
- `READY` — green + text/icon;
- `UI READY` — green + explicit post-success Better UI execution marker. The marker is written
  only after the injected bundle returns without a top-level exception; the pre-execution
  idempotence marker alone is never sufficient for this state;
- `ERROR` — red + concise status;
- `PROCESS FAILED` — red + explicit process failure copy;
- `BLOCKED URL` — warning/error copy when navigation policy rejects a target.

Primary deck copy stays compact. Detailed URL/error/runtime information belongs in the
Maintenance Drawer.

### Maintenance Drawer

Progressive-disclosure maintenance surface, visually subordinate to the game and Command
Deck. Initial groups:

1. **Session** — profile identity, UDF label/name (not full sensitive filesystem detail by
   default), recreate/recover pane;
2. **Better UI** — injection health and reload/recovery tools;
3. **Browser** — per-pane DevTools, Reload, Home;
4. **Runtime** — WebView2 runtime/SDK/host version;
5. **Errors** — last navigation/process error with copy diagnostic;
6. **Workspace** — restore layout defaults / clear workspace UI settings.

The Maintenance Drawer is a **native overlay drop-down** anchored to the primary `⋯` button,
not a docked panel. It must not resize either game viewport.

Geometry/interaction contract:

- width: **360px** at normal desktop width;
- maximum height: **480px** or available host height below the Command Deck, whichever is
  smaller; internal content scrolls with square Better UI-style scrollbar treatment;
- anchor: top-right, directly below/right-aligned to the `⋯` trigger with a 2px structural edge;
- layer: above WebView2 surfaces using a native drop-down/owned overlay mechanism rather than
  ordinary sibling z-order;
- open: focus moves to the first actionable drawer control;
- close: `Esc`, repeat activation of `⋯`, or dismissal outside the overlay; focus returns to `⋯`;
- the drawer is **non-modal**. `Tab`/`Shift+Tab` follow normal host tab order and may leave
  the drawer; focus is not trapped. If focus leaves because of Tab, the drawer may remain
  open until explicit dismissal; `Esc` always closes it safely;
- opening/closing does not alter splitter ratio, focus mode or pane dimensions;
- only one maintenance overlay exists at a time.

## Responsive / accessibility constraints

- Desktop-first; supported host minimum remains **1180×600** unless implementation evidence
  justifies a later change.
- At normal width the deck stays one row / ~44px.
- At constrained width, low-frequency status labels may shorten and maintenance moves under
  `⋯` before primary controls wrap.
- Primary command deck must not use horizontal scrolling.
- Natural keyboard traversal only; no positive tabindex.
- Focus indication must remain visible on selected/gold controls.
- Controls have accessible names independent of glyphs.
- Status/error information is text/icon + color, never color alone.
- Splitter remains keyboard/pointer operable through native semantics where available;
  preset buttons provide an equivalent non-drag path.
- Longer profile labels truncate/ellipsize in the deck and remain available via tooltip /
  accessible name; never shrink primary control text below MASTER.

## Persistence contract

Replace `split.txt` with a versioned structured workspace settings file. Initial persisted
fields may include:

```text
version
mode: single | dual
singleProfileId
leftProfileId
rightProfileId
activeProfileId
layoutRatio
lastDualRatio
focusMode
commandScope
zoomByProfile
maintenanceDrawerExpanded
```

Constraints:

- no credentials or cookies in host settings;
- unknown/missing fields fall back safely;
- malformed settings do not prevent startup;
- future schema versions fail closed to known defaults rather than partially applying
  incompatible state;
- old `split.txt` may be imported once only if that behavior is explicitly implemented and
  tested; otherwise it is ignored rather than silently fighting the new settings.

## DOM/CSS vs asset plan

This is a native WinForms host, so implement ordinary interface chrome with WinForms/C#
controls and drawing. Do not add raster art for buttons, borders, selectors, health or
layout controls. Existing game/domain imagery stays inside WebView2 and remains untouched.

## Design acceptance checks

1. Game viewport(s) visibly dominate; host chrome remains compact.
2. Single and dual modes are immediately distinguishable without reading documentation.
3. Single mode exposes one profile selector and no irrelevant dual-layout controls.
4. Dual mode exposes 1:2 / 1:1 / 2:1, Swap and a clearly active pane.
5. Focus mode can be entered/restored without losing the secondary session or previous ratio.
6. Gold selected/current and cyan focus remain simultaneously distinguishable.
7. Home/Reload default to Active and never fan out to Both without explicit scope.
8. No primary control performs or mirrors gameplay input.
9. Health states communicate meaning with text/icon in addition to color.
10. DevTools/runtime/error details are removed from permanent primary chrome and available
    through progressive disclosure.
11. Normal desktop layout remains one compact command row with no clipped primary controls.
12. Minimum supported width remains operable with no toolbar horizontal scroll.
13. Surfaces remain charcoal-dominant; stone is structural/transient, not a large panel fill.
14. No rounded SaaS cards, gradients, blurred shadows, decorative animations or remote fonts.
15. Pane/session isolation is never represented visually in a way that implies accounts are
    synchronized or linked.
16. Visible implementation receives representative local render evidence before Visual QA;
    source/tests alone do not qualify as visual approval.
