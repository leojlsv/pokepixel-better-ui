# Coupled Workspace — Command Deck Design Override

Status: **2026-09-29 host chrome / contextual Game Dock implementation; pending Product Owner in-game validation**
Direction: **game-integrated dual-account workspace, data-first Cards and explicit Game fallback**
Recorded: **2026-09-21; host chrome direction updated 2026-09-29**

This page specializes `../MASTER.md` for the native WebView2 Coupled Workspace.
It governs only the host chrome around PokePixel. It does not redesign the game
canvas or reopen previously validated Better UI modules.

## Current host chrome direction — 2026-09-29

This section supersedes the historical Miyazaki 16/monospace/2px visual rules
below, including the old Art direction and control-state appearance examples.
The host follows `MASTER.md` version 3.0: window `#161D20`, interactive
`#232C2E`, neutral lines `#6B6543` at **1px**, `Segoe UI` as the WinForms
fallback for the game's Inter body font, gold for persistent selected/current,
and **2px cyan only for actual keyboard/WebView focus**. Native Pokémon sprites
remain pixelated assets; the host chrome does not imitate pixel art. Structural
panels, disabled actions and the Maintenance Drawer share these roles.

The 44px Game Dock directly exposes **two labeled account choices** in Dual
mode, replacing the former noninteractive Active label. The selected account
has a visible check mark, gold current-state edge/text and an accessible name
(`Active account <name>`); the other exposes `Activate account <name>`.
Both use the same authoritative workspace `ActiveProfileId` as the top deck.
Changing the account does not change that profile's Cards/Game view, navigate
the game, switch a Pokémon Team leader or target `Both`. In Dual Focus, choosing
the other account changes the focused pane through the existing host layout
path. Single mode shows only the selected profile as a noninteractive label;
actual Single profile changes continue through the top profile selector.

When the active page's menu bridge is unavailable, `MENUS OFFLINE` is shown
within the dock while the account controls and Cards/Game remain accessible.
Native module controls are disabled until capabilities return. The profile
controls, shortened availability label and normal module actions must all fit
on one 44px row at the supported 1180px logical minimum. This layout is
subject to independent Technical, UX/A11y and rendered Visual Regression QA;
automated evidence does not replace Product Owner validation in the live game.

### Post-candidate111 user-approved QoLs (2026-09-29)

The seven Game Dock native shortcuts become configurable **per workspace
account** from the existing scrollable Maintenance Drawer. Reassignment swaps
any duplicate favorite in place. Only existing native `data-menu-id` values
are eligible; hover/tooltip exposes full names when a label needs shortening.
Keep the dock one 44px row at 1180px. Reserve the same status footprint for
`MENUS READY`, `MENUS OFFLINE` and `OPEN FAILED`; failure explains the exact
account and destination through text/accessible status, without any automatic
retry or change to native action ownership. Home/Reload remain the only
shared-scope (`Active`/`Both`) actions.

User-facing zoom is limited to 90%, 100%, 110% and 125% per independently
initialized WebView2 account and may be reset to 100%; retained versioned
preferences must not copy cookies or sessions. Maintenance includes one
read-only health/error summary for **each** profile, without changing Active.
The expanded Command Deck omits its duplicate active-account caption while
retaining layout, Focus, Swap, status and scoped browser operations.

Cards keeps the complete battle + Team control under 200px and its page-local
Analyzer authority. The Product Owner's 2026-09-29 screenshot rejected the
crowded two-line Hunt Story arrangement. At a pane width at or below 640px,
Hunt Story uses a compact encounter record with Pokémon identity and semantic
Rarity as its header, then visible labeled Time/Result/Ball and
Quality/IV Total/Chance groups. When the available history content width is
at most 320px, it reflows to two columns while retaining the same eight direct-read
facts. Captured detail keeps Gender, Nature and six individual IVs only; IV Total
belongs to the primary row and is not repeated in the detail. All eight values and
explicit Shiny state remain readable, with no hidden horizontal columns or
root scrolling; the local history scroller stays bounded. Wide history keeps its
single-row table. Small Team and HP/EXP text becomes readable without crossing the
player/target card boundary. Result filters use a three-choice segmented group
with a selected text/state and roving keyboard focus. Scroll-triggered shortcuts
jump to Summary, Economy, Story or Top within the **same pane** and hand focus
to the chosen section. They create no extra persistent row and are omitted in
standalone Card Mode, which already owns a fixed Cards/Game toggle in the menu bar.
Copy Summary includes only rendered, available, display-authoritative KPI facts,
localizes copy/status, rejects an absent clipboard and fences stale async
settlement on cleanup or Analyzer loss. Live game acceptance remains Owner-only.

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
| Electron workspace | REMOVE | Superseded source removed; compatibility launcher targets WebView2; historical record in Git |
| Mirrored input / gameplay sync | REMOVE / prohibited | Never implement as workspace functionality |
| Bespoke raster art | ASSET NEEDED: NO | MASTER CSS/WinForms primitives are sufficient for host chrome |

## Coupled navigation integration — Game Dock

### Product Owner card-mode navigation rule — 2026-09-21

The approved card-mode workspace must keep navigation **easy, persistent and
predictable** while replacing the large gameplay/platform presentation with a
data-first dashboard.

- High-frequency module access remains directly visible in host chrome; it must not
  move behind hover-only affordances, tooltips or multi-step menus.
- The Command Deck remains the always-visible account/layout/navigation shell.
- The Game Dock remains the direct active-account route to Inventory, Hunts, Hunt
  Analyzer, Team, Storage, Auto Helper and Settings.
- Card content must never cover, displace or require scrolling to reach the primary
  navigation rows at supported desktop sizes.
- Essential analytics must be readable in the cards themselves. Tooltips are
  supplemental detail only, never the sole way to discover a metric or its meaning.
- The **entire simplified battle representation**, not each Pokémon image, is bounded
  to a horizontal strip no more than **200px logical height**. It is an intentionally
  minimal **card × card** presentation: the active player Pokémon versus the current
  target, using small static PNGs inside the cards plus only encounter-critical state
  such as species/name, level and HP/status when available. It is not a sprite gallery,
  carousel or decorative battle scene.
- Remaining workspace area belongs to analytics cards and history. Recent encounter
  imagery must not consume the 200px battle budget or compete with the data hierarchy.
- Epic-attempt history is a first-class visible card/table, not a tooltip-only drilldown.

The next workspace phase removes duplicated persistent game navigation from each
embedded account viewport and promotes navigation orchestration to one host-owned
**Game Dock**. This does not move game windows or gameplay logic into WinForms.
The game remains authoritative; the host only asks the active account to activate
an existing native destination.

### Workspace Adapter contract

- Coupled mode is enabled only by an explicit host bootstrap marker injected by the
  WebView2 workspace before the Better UI bundle executes. Ordinary browser/
  userscript sessions never enter coupled mode by inference.
- A Better UI `coupled-workspace` adapter owns the page-side bridge. The **host bridge**
  may expose navigation capability metadata and activate existing menu destinations by
  their stable native `data-menu-id`; host messages must not call gameplay APIs, patch
  network traffic or reproduce game state in WinForms. Separately, the page-local Cards
  Hunt console may execute one allowlisted same-page native action only after an explicit
  user selection (currently active-Team change or Auto Ball preference). Analyzer data
  must never trigger, schedule, mirror or fan out those actions.
- The bridge is top-frame and exact-host only. Messages use a versioned protocol,
  tolerate unknown commands, and never carry credentials, cookies or storage data.
- While coupled mode is active, the duplicated native `.pokeidle-top-toolbar` is
  visually suppressed through reversible Better UI ownership. Its original nodes,
  handlers and menu destinations remain in the DOM so host navigation can delegate
  to those native controls.
- The Game Dock remains a persistent **44px** host row even when the page bridge is
  unavailable. `Cards` and `Game` remain directly reachable; native module buttons
  stay visible but disabled/fail-closed and a visible `GAME MENU UNAVAILABLE` state
  explains why. The dock must never disappear and trap the user in one content view.
- The host bootstrap marker remains document-owned for that document. Adapter
  cleanup removes only Better UI-owned root state/style/listeners and restores the
  page to its normal Better UI/standalone presentation without reloading, so a
  same-document Better UI remount can still re-enter coupled mode.

### Host Game Dock

- The Game Dock is one **44px logical row** below the game viewport(s), matching
  Command Deck density rather than the native large-icon toolbar. A quiet **2px
  stone top edge** separates host navigation from the game viewport without
  introducing another card/surface frame.
- It always targets **Active** only. Unlike Home/Reload, game navigation is never a
  `Both` operation because opening the same game surface on two accounts would be a
  gameplay/UI fan-out rather than a host/browser command.
- The left side identifies the target profile using the existing gold current-state
  language. Navigation controls remain neutral until hover/focus; cyan is reserved
  for keyboard focus.
- First implementation slice exposes direct high-frequency destinations that are
  already native menu actions: `Inventory`, `Hunts`, `Team`, `Storage`,
  `Auto Helper`, and `Settings`. The next native CW-M3 slice adds the game's own
  `hunt-analyzer` destination. A destination is disabled until the active page
  advertises that capability.
- The dock never clones a native window, stores native scene state or manufactures
  a second navigation implementation. Activation is delegated back into the active
  WebView through the adapter.
- Single, Dual, Swap and Focus change only which profile the dock targets; they do
  not duplicate the dock or alter profile/UDF ownership.
- At the supported 1180px host minimum the dock remains one row with no horizontal
  scrolling. Lower-frequency destinations belong in later progressive disclosure,
  not by expanding the permanent row.

## Native Hunt Analyzer integration

CW-M3 targets the **native PokePixel Hunt Analyzer**, not the separate external
`pokepixel-hunt-analyzer` userscript. The Product Owner screenshot shows the native
`ANALISADOR DE CAÇADA / Expandir` bottom surface, while the native menu exposes
`button[data-menu-id="hunt-analyzer"]`.

### Native action contract

- The Game Dock may expose `hunt-analyzer` only through the same existing capability
  discovery and active-profile-only bridge used by the other native destinations.
- Activation delegates to the exact native `data-menu-id="hunt-analyzer"` button.
  No native window, scene, metric, action or gameplay state is recreated in WinForms.
- `Both` never applies to Hunt Analyzer navigation. Single, Dual, Swap and Focus only
  change which profile owns the active request.
- The full native Hunt Analyzer remains inside the WebView. Native navigation and
  external Hunt analytics are separate contracts; neither replaces the other.

### External Hunt Analyzer analytics contract

The Product Owner explicitly approved incorporating information from the separate
`pokepixel-hunt-analyzer` project. This supersedes the earlier temporary constraint
that candidate6 should contain no host Hunt metrics, but it does **not** restore the
invalid candidate5 architecture.

- WebView2 injects the Analyzer engine at document start under an explicit
  `__POKEPIXEL_HUNT_ANALYZER_EMBED__` marker so its passive WebSocket observation
  remains early enough for the Analyzer's own protocol contract.
- Embed mode keeps the Analyzer's pipeline, domain calculations and IndexedDB
  persistence authoritative while omitting its panel/HUD/audio/gallery/history UI.
  The Coupled Workspace does not create a second analytics implementation.
- The Analyzer exposes only a versioned read-only summary provider through
  `__POKEPIXEL_HUNT_ANALYZER_PUBLIC__`. The public snapshot contains bounded Current
  Hunt metrics such as status/time, Seen/Captured/Failed, capture rate, Trainer and
  Pokémon XP/h, Dollar/h, expenses, Rare+ failures and Shiny Seen/Captured, plus the
  Analyzer-owned Seen counts for each rarity bucket and the chance from the latest
  completed capture attempt. The additive protocol-1 Card Mode projection may also
  expose bounded special-attempt `speciesId`/`qualityMultiplier` and bounded realized
  loot item identity/quantity (`itemId` + `qty`). It does not expose encounter rows,
  session IDs, raw frames, credentials, storage APIs, fabricated item metadata or
  per-item value allocation.
- Better UI samples only that public provider and forwards a bounded allowlisted
  summary through the existing coupled bridge. It never reads Analyzer IndexedDB,
  hooks Analyzer WebSocket state, scrapes Analyzer Shadow DOM or recomputes metrics.
- Each WebView2 profile keeps its own UDF, Analyzer database, leadership lease and
  summary. Host context is ephemeral per `AccountPane`, never persisted and never
  copied between profiles.
- `Cards | Game` is also profile-owned. The one host selector always targets the Active
  profile; changing Active only refreshes which state the selector shows. Rhyxus and
  Rhyosa may therefore remain in different content views, including across Swap,
  Focus/Restore and Single/Dual transitions. Native Game Dock navigation changes only
  its active target to Game before delegating the native action.
- In the ordinary standalone userscript, `Cards / Game` is a **single fixed toggle
  button inside the native menu bar**. Its DOM parent and physical slot do not change
  when the view changes. Cards keeps the toolbar path visible while suppressing the
  rest of the native game surface, so the user always reaches the same switch in the
  same place. No external dock, viewport positioning fallback or mode-driven
  reparenting is permitted.
- Toolbar-owning Better UI infrastructure (`menu-bar`, Pokémon Profile launcher and
  Module Controls) remains mounted while standalone Cards hides the native game
  surface. Returning to Game therefore reveals the same enhanced toolbar DOM instead
  of reconstructing it; unrelated gameplay/window modules may still suspend in Cards
  for the existing performance boundary.

### Card Mode hunt-data presentation — 2026-09-26 Product Owner correction

- Product Owner layout selection on 2026-10-02 replaces the earlier three-column wide
  composition at 1180px and above with one four-column desktop grid. Battle occupies columns 1–2 row 1;
  Hunt Summary columns 1–2 row 2; Capture columns 1–2 row 3; Economy / XP columns 1–2
  row 4; Captured / Seen columns 3–4 row 1; History columns 3–4 spanning rows 2–4.
  From 900–1179px the prior three-column overview remains active; below that, the
  existing responsive flow remains authoritative. Semantic DOM order stays Battle →
  Hunt Summary → Capture → Captured / Seen → Economy / XP → History.
- Product Owner refinement on 2026-10-02 keeps those outer coordinates and makes
  History consume its full row-2-through-row-4 allocation at 1180px+. Hunt/Loot retain
  their own scroll ownership; filling the card must not create root-level horizontal
  overflow. The half-width Active and Target cards use more of their existing area for
  native art and authoritative identity/level/types. Active keeps its selected moves;
  Target keeps Rarity/Shiny/types. No new gameplay facts are invented to fill space.
- Product Owner live follow-up on 2026-10-02 clarifies that the standalone Cards path
  must receive the same Active/Target density instead of keeping those portraits hidden
  behind its `textOnly` optimization. Standalone Cards therefore enables only the two
  static combat portraits while keeping secondary Element icons and Story sprites in
  text-only mode. When no canonical Target exists, the art slot remains as an explicit
  waiting/empty placeholder rather than becoming dead space. The Cards surface itself
  owns vertical scrolling inside `100dvh`; the page/body must not grow past the viewport.
  In Hunt Story, the `Pokémon` column heading is left-aligned with its row values.
- Product Owner live follow-up on 2026-10-03 establishes that browser `100dvh` alone is
  not the usable Card Mode boundary while the persistent Poké Hub remains fixed over the
  bottom of that viewport. When a horizontal toolbar is docked near the bottom edge,
  standalone Cards ends 8 px above its measured top edge and keeps its own
  vertical scrollbar inside that reduced area. The reservation follows live toolbar/
  viewport geometry and must disappear for a vertical/collapsed toolbar or a horizontal
  toolbar dragged away from the bottom edge, so those states do not waste a full-width
  strip. The approved 4×6 coordinates do not change.
- Product Owner live rejection later on 2026-10-03 adds a stronger desktop-fit rule:
  respecting the usable viewport is insufficient if the root Card Mode itself still has
  to scroll to reveal Economy / XP. At the current desktop validation sizes (including
  the 1728×874-class viewport), all six top-level surfaces must be simultaneously visible
  above the Poké Hub. The 4×6 grid therefore owns a bounded 100%-height row budget rather
  than intrinsic `auto` rows; Summary/Capture/Captured-Seen/Economy may use denser desktop
  padding and KPI spacing, but no facts are removed. Story keeps vertical scrolling
  inside its attempt/loot table. Root vertical scrolling remains only a short-height
  fallback, not the normal desktop path.
- Product Owner visual follow-up on 2026-10-03 clarifies that a Shiny Story row does
  not get a separate rarity-label accent. Both the Pokémon name (`✦ SHINY` included)
  and the `Rarity` value resolve from the row's `--rarity-color`; Shiny remains explicit
  through text/ARIA rather than a fixed gold recolor.

- The overview order is **Hunt summary → Capture → Captured / Seen**. The Captured / Seen
  rarity card does not render an `Unknown` bucket; the product contract treats the seven
  canonical rarity values as the complete user-facing set.
- Target identity is Analyzer-first. A fresh `currentTarget` establishes the hunt Pokémon
  identity and native `PokeIdle.Api.getSpecies` metadata may supply its visual. The identity
  remains readable between encounters while the Hunt is running. Opening Hunts/Atlas or
  pressing Hunt is never a prerequisite; a remembered Hunt zone may only enrich a matching
  target with already-native marker art/level context.
- Product Owner follow-up on 2026-09-27 removes XP from the Target card. Target keeps only useful
  authoritative context already available to Cards: identity, level/range, Rarity, Shiny, Element
  types and native art. Internal zone ids are not presentation data and Cards must not fabricate a
  prospective capture chance.
- The Active Pokémon card may show the exact selected native moves as compact move icons. The source
  is the read-only native `getMoveset` contract for the current Team leader; it is not inferred from
  Analyzer data and it does not introduce a gameplay write. `moveset.saved` invalidates that visual
  cache so a user-authored move change can be reflected without remounting Cards.
- `Trocar Pokémon` reads the authoritative Team runtime. A transient empty hydration may show
  `Team indisponível`, but that availability message is cleared as soon as members arrive and
  must not overwrite explicit switch success/failure feedback. Pokémon identity/level remains
  readable from runtime data even if the compact HUD DOM was reconstructed.
- Hunt Story is direct-read history. Its wide primary order is exactly **Time → Pokémon →
  Rarity → Quality → IV Total → Result → Ball → Chance**. The visible rarity controls expose
  **All, Weak, Common, Uncommon, Rare, Epic, Legendary and Mythical**; Unknown is never a
  user-facing filter. The complete sanitized attemptHistory supplies all canonical
  rarities, while non-duplicated older specialHistory entries may extend the retained
  Epic/Legendary/Mythical/Shiny tail beyond the 32 general-attempt window.
  Each row exposes Pokémon identity/available native art, discrete Rarity, continuous
  **Quality**, result, Ball, Chance and authoritative **IV Total**.
  The scalar total is available for failed attempts when Analyzer observed it; missing/invalid totals
  remain unavailable rather than being inferred. Captured detail is inline and contains only
  **Gender, Nature, HP, ATK, DEF, SpA, SpD and SPE**. The literal “Genetics” label is removed
  and IV Total is not repeated there. Female text uses a light-pink semantic accent and Male
  text uses baby blue, while the textual gender remains present so color is never the only cue.
  No per-row disclosure click is required to understand the captured Pokémon. The eight direct-read
  fields keep explicit visible column labels and remain a single row in `1:2` / `2:1` panes. A narrow
  Story owns horizontal scrolling instead of reflowing those fields to a second line; the row/table
  remains locally bounded rather than expanding the whole Card Mode surface.
- Loot Story names its financial fields explicitly and lists realized item drops with quantity.
  Each row aggregate is visibly labelled **Total** and exposes the same label/value accessibly.
  The Analyzer supplies only authoritative `itemId` + `qty`; Better UI may enrich name and item
  rarity from read-only native game metadata. Rarity is never inferred from item ID or value.
  When native rarity metadata is unavailable the item remains visible as **Sem raridade**.
  Loot Story provides an item-rarity filter for the seven canonical rarities plus this explicit
  unclassified state. Native inventory metadata may arrive either on the inventory entry itself or
  on its nested `item` object; explicit localized rarity labels are normalized to the same canonical
  filter keys, while rarity is still never guessed from item id/name/value.
  Directly below that filter and above the history list, Loot Story presents one compact,
  non-interactive tile per distinct dropped item. Tiles stay in one horizontal row with local
  horizontal overflow when required, reuse the native item icon when `icon_index` is available,
  expose the aggregated quantity, and use the canonical rarity color only for their border.
  Their ordering is strictly **Weak → Common → Uncommon → Rare → Epic → Legendary → Mythical**;
  aggregate quantity never affects position. Same-rarity ties use stable item ID ordering and
  items without trustworthy rarity metadata follow the canonical seven with neutral border chrome.
  The active item-rarity filter scopes this visual strip together with the row item list while
  preserving the existing financial-total semantics.

### Host shell and Hunt analytics

- The workspace has three vertical rows: 44px Command Deck, flexible account
  panes and 44px Game Dock. No Host Analyzer Context Rail or Hunt metrics footer
  is mounted between the panes and Game Dock, in Cards, Game or mixed view.
- Cards consumes the Analyzer-owned public summary locally, checking the source
  `capturedAtMs` against its bounded freshness window. The WebView2 host no
  longer receives a separate Hunt telemetry message or stores a second summary
  snapshot. The native Hunt Analyzer remains available through its game menu.

### Duplicated native bottom surface

- The duplicated `ANALISADOR DE CAÇADA / Expandir` strip may be visually suppressed
  only after a stable native selector/structural contract is proven from repository
  evidence or a non-destructive Product Owner diagnostic probe.
- Do not infer that surface from visible text alone when a stable structural selector
  is unavailable, and do not reuse external userscript selectors such as
  `#pokepixel-hunt-analyzer-root` or `#pha-toggle`.
- Suppression, once implemented, must be coupled-mode-only, reversible, keep the
  native node/listeners mounted, and fail safe so native access returns if coupled
  bridge ownership is unavailable.
- If static evidence cannot identify the native strip reliably, CW-M3 must stop at
  the native Game Dock destination and produce a read-only diagnostic probe instead
  of guessing.

## Art direction — historical snapshot (superseded on 2026-09-29)

The following Miyazaki 16 values document the original 2026-09-21 candidate
and are **not** an implementation target for the current host. Use the game
palette, Segoe UI fallback, 1px neutral borders and independent cyan keyboard
focus described in *Current host chrome direction* above. Historical values:

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

1. **Cards is the default coupled view** and analytics/history visibly dominate that
   view; the full game viewport appears only through the explicit `Game` view or a
   native module activation. Host chrome remains compact in both modes.
2. Single and dual modes are immediately distinguishable without reading documentation.
3. Single mode exposes one profile selector and no irrelevant dual-layout controls.
4. Dual mode exposes 1:2 / 1:1 / 2:1, Swap and a clearly active pane.
5. Focus mode can be entered/restored without losing the secondary session or previous ratio.
6. Gold selected/current and cyan focus remain simultaneously distinguishable.
7. Home/Reload default to Active and never fan out to Both without explicit scope.
8. Host-level primary controls never perform or mirror gameplay input. Cards may expose
   narrowly allowlisted **explicit user actions** in the current page/account; they must
   validate native state, fail closed, and never be Analyzer-triggered, scheduled,
   mirrored or sent to `Both`.
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
17. The complete active-Pokémon × current-target battle representation stays at or below
    200px logical height, with no gallery/platform scene and no fabricated target facts.
18. Attempt history across **all rarities** remains a first-class visible surface with
    direct rarity/result filtering; Epic is an important filter, not the only history.
    Essential hunt state, unavailable/offline state and module names are never tooltip-only.
19. Economy exposes Analyzer-owned total revenue, revenue/hour, expenses, profit,
    profit/hour and canonical loot sell value; Better UI must not recreate those formulas
    or imply itemized loot when the canonical pipeline only retains monetary value.
20. Equivalent summary cards share row rhythm and height. Rarity, capture, history and
    economy remain visually identifiable without turning every surface into the same
    dark-gray/gold panel or relying on color alone.
21. The all-rarity history contract may retain up to 32 recent terminal attempts, but the
    visible table is height-bounded with its own square vertical scroll surface and sticky
    header. History must not expand dozens of rows inline and bury the Economy/XP section.
22. The Hunt battle/control module keeps **Trocar Pokémon** and **Auto Ball** directly
    reachable in the <=200px budget. Auto Ball exposes an explicit `Normal | Shiny` scope;
    target telemetry never changes that editing scope on the user's behalf.
23. A Team quick action reports success only after native Team state confirms the requested
    active member. Auto Ball validates the selected capsule against current inventory and
    preserves the latest unrelated Hunt settings before the native update.
24. Sprite fallback work is bounded. Missing native art may use server-provided species
    sprite metadata, but repeated Analyzer reconciliation must not create unbounded asset or
    settings polling.
