# Hunts — Hunt Atlas Design Override

Status: **approved**
Direction: **Hunt Atlas**
Product Owner approval: **2026-09-12**
Migration classification: **redesign**
Validation status: **pending in-game validation**

This page specializes `../MASTER.md` for the Hunts window. Hunt Atlas replaces
the previous four-zone/two-card composition with a map-first cartographic tool:
one navigation rail, one compact finder rail, a dominant map, and an attached
inspector that appears only when a Hunt is selected.

The current implementation remains evidence for safe integration. It is not the
composition baseline. All frozen gameplay, lifecycle and native-integration
constraints below remain authoritative.

## Design intent

**Hunt Atlas is a dense pixel-RPG field atlas for finding, inspecting and entering
Hunts without turning the map into a dashboard.**

The map is always the focal surface. Navigation and discovery controls read as
instruments attached to the atlas, while selected-Hunt information reads as an
inspector attached to the map rather than as a floating dialog or independent
card.

The visual hierarchy is:

1. world/context navigation;
2. compact Hunt discovery and targeting controls;
3. dominant map workspace;
4. attached selected-Hunt inspector;
5. one explicit primary gameplay action: `Entrar na Hunt`.

Density remains high, motion remains low, ornament remains restrained, and all
pixel-art character comes from crisp geometry, state language, separators,
hard shadows and domain sprites rather than decorative noise.

## Non-visual constraints

The redesign must preserve the approved functional and integration contract:

- marker pointer click selects a Hunt and opens/updates its inspector; it never
  starts gameplay;
- keyboard marker activation performs the same selection and moves focus into the
  inspector sequence;
- required Hunt information remains persistent and does not depend on hover;
- `Localizar no mapa` selects the same Hunt, pans through native map state and
  preserves perceived zoom; it never starts gameplay;
- Reset clears selected/located/inspector state without clearing filters or
  intentionally moving the map;
- Escape/close closes the inspector and returns focus to the selected marker when
  possible;
- `Entrar na Hunt` is the only Better UI gameplay-entry path; it reacquires the
  current native zone index and calls the existing native `startHunt()` flow;
- Selected and Located remain independent states and may coexist;
- stable zone identity survives native reorder/refresh; disappearing zones clear
  selection rather than reusing stale indices;
- opening/closing the inspector preserves semantic zoom ratio and focal center;
- native refresh/rAF clamp races must not replace the user's prior open-map intent;
- search value/caret and other preserved native interaction state survive safe SPA
  reconstruction where already covered;
- original Search, level inputs, Clear, world tabs, zoom, area count, element
  filters, presentation toggle and map viewport may be moved but retain their
  native handlers/private state;
- the original presentation toggle is moved intact and never cloned;
- the native viewport/map markers are moved intact and never cloned;
- no synthetic marker click is used for gameplay;
- no `startHunt()` monkey patch;
- no feature-specific `MutationObserver`;
- no gameplay/network automation or interception;
- reconciliation remains idempotent, cleanup remains deterministic, and native
  structure/behavior is restored where the module contract requires it.

## Structure

### 1. Atlas rail

The top rail establishes world context and map utility in one continuous visual
baseline.

- World tabs occupy the primary left side.
- Zoom controls occupy a compact utility group on the right.
- The rail uses one shared outer frame; tabs use internal separators rather than
  looking like unrelated standalone buttons.
- Current world uses the selected/current state from MASTER.
- Zoom remains visually neutral and subordinate to world navigation.
- The rail may wrap into two rows only when its contents no longer fit cleanly.

### 2. Finder rail

The old Filters/Target cards are removed. Discovery and targeting become one
supporting rail directly below the Atlas rail, with no independent card shadows.

The preferred desktop order is three compact lines:

1. **Query line:** Search | level minimum | level maximum | Clear.
2. **Element line:** element-filter chip rail.
3. **Target line:** filtered Hunt select | native result count | Locate | Reset.

A reserved status slot sits with the target line or immediately below it so empty,
choose, located and unavailable feedback does not cause layout jumps.

The Finder rail may use separators between lines, but it must read as one tool
surface attached to the map rather than as a set of nested cards.

### 3. Map workspace

- The map is the largest surface in every usable layout mode.
- The native map itself is not recolored, filtered or visually replaced.
- Better UI owns the map frame, marker-label chrome, focus/selection/location
  feedback and surrounding controls.
- With no selected Hunt, the map owns the full workspace width.

### 4. Attached inspector

When a Hunt is selected, the map workspace becomes map + inspector.

- The inspector is attached to the map with a shared 2px structural boundary.
- It does not use independent dialog elevation or a floating-card treatment.
- Wide target width: approximately 280–320px, adjusted only when implementation
  evidence shows a small fit correction is necessary.
- Closing the inspector returns the released width to the map.

Inspector reading order:

1. Hunt name + level + Close;
2. element badges;
3. Weakness / Resistance / Immunity rows;
4. Drops list with icon, name and NPC sell value;
5. presentation segmented control, without a redundant visible heading label;
6. full-width primary `Entrar na Hunt` action.

Use spacing and separators rather than nested cards around every relation or drop.
Empty relation groups remain explicit (`Nenhuma`/localized equivalent).

## Component and state treatment

### Surface grammar

- Main Hunt Map shell is Better UI-owned for the complete visible window chrome,
  including exposed native title/header framing inside `.hunt-window`: square
  geometry, `bg-1` body, `bg-2` title/header strip, 2px strong outer border and a
  single 4px hard raised shadow. Host gradients, soft rounding and unrelated host
  surface styling must not remain visible inside this scoped shell.
- Atlas/Finder supporting rails: `bg-2` only where separation from the shell is
  needed; avoid equal hard-shadow elevation on every group.
- Map frame: `bg-0` boundary with a crisp 2px structural edge.
- Inspector: `bg-1`/`bg-2` sections attached to the workspace, separated with
  1–2px rules rather than card stacks.
- Default corners remain square; hard shadows follow MASTER and are reserved for
  actual elevation, not every internal grouping.

### World tabs

- One continuous rail with one outer 2px frame and 1px internal dividers.
- Desktop tab height is 32px; tabs are gapless inside the rail and must not retain
  native standalone-button chrome.
- Every world tab must stretch to the full height of the rail and share the
  available navigation width evenly; the selected tab background/edge must fill
  its entire segment with no inset/native gap around the active surface.
- The tab rail and zoom rail must share the same 32px inner row height and align
  to the same top/bottom structural edges. Extra native margins/padding/gaps on
  either rail are suppressed.
- Default: `bg-1`, muted text, neutral edge.
- Hover: `bg-3`, readable text, neutral strong edge.
- Pressed: inset/depth-shift treatment; no scale animation.
- Selected/current: `bg-3` plus a clear 2px gold structural edge or baseline.
- Focus-visible: independent 2px cyan outline outside the current state.
- Disabled: `bg-1`, subtle text, neutral border, no hover elevation.

### Zoom utility

Uses the same crisp rail grammar as world navigation but remains neutral. Zoom
buttons are 32px high with 2px neutral borders, `bg-2` default surface, `bg-3`
hover, inset/depth-shift pressed state, cyan focus and subtle disabled state. They
must not retain native button bevels/rounding. Gold is not used unless a future
zoom state has actual selected/current semantics.

### Search, level inputs and Hunt select

- `bg-0` input well, 2px border, 32px desktop height.
- Search and number inputs use hard square geometry (`border-radius: 0`) with no
  residual UA/host rounding, clipping or inset treatment. This rule is
  authoritative even when the host supplies rounded input styles at higher
  specificity.
- Hover uses strong neutral border; focus uses independent cyan outline.
- Disabled follows MASTER without opacity-only treatment.
- Browser chrome that conflicts with the approved visual language must be owned:
  remove the native search cancel decoration because explicit Clear is present;
  remove visible number-input spinner buttons while preserving keyboard/value
  editing; use one CSS-owned pixel chevron for the Hunt select and suppress the
  native select arrow.
- Labels remain visible wherever meaning would otherwise be ambiguous.

### Clear action

Clear is a 32px secondary utility button with square 2px neutral border,
`bg-2` default surface, `bg-3` hover, inset/depth-shift pressed state, cyan focus
and subtle disabled state. It must read as part of Finder and must not retain
native bevel/rounding/shadow treatment.

### Element chips

- Compact 26–28px desktop badge treatment is acceptable for pointer use.
- Preserve canonical element/icon color as domain semantics.
- Selected adds a gold structural cue without recoloring the element meaning.
- Hover, pressed, focus-visible and disabled remain explicit.
- Coarse-pointer target height increases toward 40px.

### Marker and marker-label states

Normal marker labels become Better UI-owned dark pixel plates instead of inheriting
host visual chrome. Pokémon/domain sprites remain native domain assets.

- **Base:** dark plate, crisp neutral border, readable text, small hard shadow.
- **Hover:** keep the Base geometry, raise the plate to `bg-3` and strengthen the
  neutral edge; do not introduce gold or blue semantic cues on hover alone.
- **Pressed:** apply a brief inset/depth shift while the pointer/key activation is
  held; pressed feedback must not create, clear or visually imply Selected or
  Located state.
- **Selected:** gold 2px border/edge + `bg-3`; clearly indicates the Hunt currently
  shown in the inspector.
- **Located:** retain the neutral outer plate and add one deterministic INFO-blue
  2px bottom rail/underline inside the label plate; do not reuse the selected gold
  outer border.
- **Selected + Located:** retain the Selected gold outer border while also keeping
  the INFO-blue 2px bottom rail inside the same plate, so both semantics remain
  simultaneously visible.
- **Focus-visible:** independent 2px cyan outline outside whichever state is
  active; focus must remain visible on selected and located markers.
- **Dimmed while Locate is active:** every non-Located Pokémon sprite is reduced
  by exactly 90% visual alpha (`opacity: 0.10`). Non-Located, non-Selected marker
  labels use the same `opacity: 0.10`. If a different marker is Selected while a
  Locate target remains active, that Selected label plate stays fully readable at
  `opacity: 1` so inspection state is not lost, but its non-Located Pokémon sprite
  remains at `opacity: 0.10`. A focused label/focus outline also stays fully
  visible. The Located marker remains `opacity: 1`.
- **Locate flash:** short stepped state feedback only; remove it under
  `prefers-reduced-motion: reduce`.

Selected, Located and Focus must be distinguishable by structure as well as color.

### Result count and status

- Count remains a compact data badge with tabular numerals.
- Status remains text-first and reserves layout space to avoid jumping.
- Empty/error/unavailable states may use semantic color only as a secondary cue;
  the message remains explicit text.

### Native world notice

`.hunt-world-notice` is part of the Hunt Atlas status language rather than a
standalone card.

- Empty notice remains hidden and occupies no layout space.
- Populated notice appears as an inline Atlas/Finder status strip.
- Use text plus a semantic 2px left edge as the primary treatment.
- Background may use the supporting `bg-2` surface, but the notice has no card
  elevation or independent hard shadow.
- Notice text remains readable and must not rely on semantic color alone.

### Locate, Reset and Clear

- Secondary/ghost Better UI actions with deliberate default/hover/pressed/focus/
  disabled states.
- No action should visually compete with `Entrar na Hunt`.
- Reset remains spatially stable whenever its state is available.

### Inspector

- Header: Hunt title, level metadata and compact Close.
- Body: flat information rhythm using separators; relation rows are not cards.
- Element/relation badges preserve domain colors and exact multipliers.
- Drops use one row rhythm: item icon | flexible name | right-aligned value, with
  1px row separators rather than a frame around every row.
- Scrollbar, when needed, follows the local Better UI pixel scrollbar grammar.

### Hunts scrollbars

All horizontal and vertical scrollbars exposed by Hunt Atlas-owned scroll
containers receive one scoped pixel treatment; no host-wide scrollbar styling.

- thickness: 10px on both axes;
- track: `bg-0`, square corners;
- thumb: `border-strong` fill with a 2px `bg-0` inset edge so it reads as a pixel
  handle rather than browser chrome;
- thumb hover/active: gold accent edge/fill cue, without glow;
- scrollbar corner: `bg-0`;
- inspector/map/list scrolling must retain normal wheel, drag and keyboard
  behavior; styling is visual only.

### Presentation control

The native Classic/Platform node remains intact but is visually treated as one
segmented rail:

- shared outer frame;
- no gaps between segment buttons;
- selected segment uses the MASTER gold selected/current cue;
- focus remains cyan and independent;
- full default/hover/pressed/selected/focus/disabled state family.

### Primary Hunt action

`Entrar na Hunt` is the only primary action in the inspector and receives a much
stronger action hierarchy than every utility control.

- full-width minimum height: **48px desktop**;
- coarse-pointer minimum height: **52px**;
- minimum label treatment: 14px / 700, centered, with at least 12px horizontal
  padding;
- `bg-3` surface, 2px gold primary edge and one 2px hard shadow for persistent
  prominence;
- hover uses accent-highlight edge/text without increasing geometry;
- pressed uses a brief inset/depth shift and removes the raised shadow while held;
- focus remains an independent 2px cyan outline outside the gold edge;
- keep at least 12px visual separation above the action so presentation/metadata
  controls cannot visually merge into its click target;
- pending uses `aria-busy`, blocks duplicate submission and receives a visible
  pending treatment. Any new visible pending copy must be localized before use;
- disabled remains readable and does not rely on opacity alone.

## Live validation fix addendum — 2026-09-12

Product Owner live validation confirmed that the Hunt Atlas hierarchy is correct
but the following visible surfaces still read as native/untreated. This addendum is
approved direction and narrows the next implementation pass; it does not change
gameplay behavior.

1. **Own the full Hunt Map shell.** The exposed `.hunt-window` outer/title chrome
   must use the Hunt Atlas shell treatment defined above rather than relying on the
   host panel appearance.
2. **Finish native-control visual ownership.** World tabs, Clear, zoom buttons,
   Search, Level min/max and the Hunt dropdown must receive their complete Hunt
   Atlas Base/Hover/Pressed/Selected-or-current/Focus/Disabled states where
   applicable, with native browser bevels/arrows/spinners/rounding suppressed as
   specified above. Native handlers and state remain untouched.
3. **Finish both-axis scrollbar ownership.** Every horizontal/vertical scrollbar
   visible inside Hunt Atlas uses the 10px scoped pixel scrollbar treatment above.
4. **Locate emphasis is intentionally aggressive.** While Locate is active,
   non-Located Pokémon sprites use exactly `opacity: 0.10` (90% dim). Label
   exceptions exist only to preserve a simultaneous Selected or Focus state as
   specified in the marker state family.
5. **Primary entry action is deliberately oversized relative to utilities.**
   `Entrar na Hunt` uses 48px desktop / 52px coarse-pointer minimum height and the
   stronger gold + hard-shadow hierarchy above. No other action in the inspector
   may match that visual weight.
6. **Second live geometry correction.** Search and Level min/max must render with
   visibly square 0px corners; the world-tab rail and zoom rail must align to the
   same inner row edges; every world tab, including the selected Johto tab, must
   fill its complete segment with no inset gap or uncovered strip.

## DOM/CSS vs asset plan

This Hunt Atlas pass is **DOM/CSS first**. No raster asset is mandatory.

Keep as DOM/CSS:

- Atlas rail and Finder rail;
- tab/segmented-control frames and separators;
- inputs, select arrow, chips and buttons;
- marker-label plates and Selected/Located/Focus structural cues;
- inspector surfaces, relation/drop rows and separators;
- focus, hover, pressed, disabled, pending, status and responsive states;
- ordinary pixel borders, hard shadows and scrollbars.

Keep existing Pokémon, item and element imagery as domain assets.

Optional bespoke artwork may be proposed later only through a separate approved
asset brief when it adds identity that CSS cannot express cleanly. A small locator
emblem/icon family would be a valid candidate, but Hunt Atlas does not depend on
SpriteCook or any raster-production tool for this implementation.

## Responsive and accessibility constraints

Layout changes are based on container fit, not generic device breakpoints.

### Wide

- Atlas rail stays single-row.
- Finder uses the three-line compact structure.
- Map + inspector stay side-by-side when selected.
- Inspector target width remains approximately 280–320px.

### Medium

- Finder controls wrap predictably within their semantic line before introducing
  another layout mode.
- Map + inspector remain side-by-side only while the map retains useful spatial
  area.
- Atlas world/zoom groups may redistribute available width without changing order.

### Narrow

- Inspector stacks below the map.
- Atlas rail may use two rows while retaining world context before zoom utility.
- Finder lines stack/wrap without horizontal scrolling for the primary workflow.
- Map remains visible before inspector content in reading order.

### Coarse pointer

- Important interactive targets move toward 40px height/size where feasible.
- Element chips and moved native controls receive explicit adaptation rather than
  relying only on shared PPBUI classes.

### Accessibility

- Focus-visible is always independent from selected/current/location state.
- Required information is persistent; no workflow depends on hover.
- Inspector remains labelled by the selected Hunt title.
- Icon-only controls have accessible names.
- Long localized names may truncate visually only when complete text remains
  recoverable by title/accessibility metadata.
- Status/error/empty feedback is textual and not color-only.
- Exact numeric data uses readable/tabular formatting where useful.
- Reduced-motion removes the Locate flash and any future non-essential motion.
- Keyboard flow remains coherent through Atlas/Finder, markers, inspector and
  primary action without trapping focus.
- When the inspector closes automatically because a world/filter change invalidates
  the current selection or the selected zone disappears, restore focus
  deterministically without moving the map: first focus the previously selected
  marker only if that exact node is still connected, valid and visible; otherwise
  focus the Hunt result select if it is connected and enabled; otherwise focus
  Search if it is connected and enabled; otherwise focus the Hunts root/body focus
  target. Never attempt to focus a detached node.

## Implementation brief

Engineering should implement Hunt Atlas by recomposing existing native nodes with
reversible Better UI wrappers/anchors while preserving their identity and handlers.

1. Replace the old two-card command deck with one `Finder` supporting surface.
2. Convert the existing world header treatment into the continuous `Atlas` rail.
3. Keep the native viewport/map as the dominant workspace.
4. Convert the current dossier presentation into an attached `Inspector` surface;
   retain its data and explicit Hunt action.
5. Give normal map labels a complete Better UI treatment and implement the full
   state family: Base, Hover, Pressed, Selected, Located, Selected+Located, Focus
   and Dimmed. Located uses the INFO-blue 2px bottom rail; Selected+Located keeps
   the gold outer border and blue bottom rail simultaneously.
6. Fully own browser-visible chrome for Search/number/select where safe, including
   the select arrow and redundant search decoration.
7. Convert the presentation toggle into a gapless segmented rail while moving the
   original node intact.
8. Remove redundant internal card shadows/frames from Finder, relation rows and
   drop rows so the map remains visually dominant.
9. Preserve current selection/navigation/map-state/lifecycle logic unless a change
   is strictly necessary to support presentational wrappers/classes.
10. Keep Hunts-specific layout/state CSS module-local. Change shared design-system
    runtime only when a primitive is demonstrably reusable outside Hunts.
11. Implement the automatic-inspector-close focus fallback in this exact order:
    valid/visible prior marker -> enabled Hunt result select -> enabled Search ->
    Hunts root/body focus target, never a detached node and never by moving the map.
12. Treat `.hunt-world-notice` as an inline Atlas/Finder status strip: hidden when
    empty; text + semantic left edge when populated; no card elevation.
13. Apply the scoped Hunt Map shell treatment to all visible `.hunt-window`
    chrome confirmed by Product Owner live validation.
14. Apply the complete Hunt Atlas treatment to world tabs, Clear, zoom, Search,
    Level min/max, Hunt select and visible horizontal/vertical scrollbars without
    replacing their native behavior.
15. Implement Locate dim exactly as specified: non-Located Pokémon sprites at
    `opacity: 0.10`, with only Selected/Focus label readability exceptions.
16. Raise `Entrar na Hunt` to 48px desktop / 52px coarse-pointer minimum height
    and preserve its exclusive primary-action hierarchy.

## Design acceptance checks

The implementation is design-ready for independent review only when all checks
below are true:

1. The map is immediately the largest and strongest visual surface.
2. Atlas and Finder read as attached map instruments, not dashboard cards.
3. World tabs read as one navigation rail with a clear current-world state.
4. No visible Search/number/select affordance falls back to accidental browser or
   host chrome where Better UI is expected to own it.
5. Marker Base, Hover, Pressed, Selected, Located, Selected+Located, Focus and
   Dimmed states are all visually distinct at runtime size and remain the same
   component family.
6. Selected and Located can coexist without becoming visually ambiguous.
7. Cyan is reserved for keyboard focus; gold remains the primary selected/action
   accent; domain colors retain gameplay meaning.
8. The inspector reads as attached map intelligence rather than a floating dialog.
9. Relations and Drops avoid nested-card/frame noise and remain fast to scan.
10. `Entrar na Hunt` is the only visually primary action in the selected-Hunt
    context.
11. Required information and actions remain available without hover.
12. Keyboard focus remains visible on every interactive family, including selected
    tabs/markers/segments.
13. Wide, medium, narrow and coarse-pointer modes preserve the full find → select →
    inspect → locate/reset → enter workflow without primary horizontal scrolling.
14. Opening/closing the inspector does not cause a perceived map zoom/focal jump.
15. Existing native behavior, stable identity, reconciliation and cleanup contracts
    remain covered by automated/synthetic tests.
16. Styling remains scoped to Hunts/PPBUI ownership and does not restyle unrelated
    host UI.
17. Independent UX/A11y & Design QA and Independent QA gates must be `READY` before
    user handoff.
18. In-game appearance/function remains pending until the Product Owner performs
    and explicitly approves live validation.
19. Automatic inspector closure restores focus using the specified deterministic
    fallback and never targets a detached node or intentionally moves the map.
20. `.hunt-world-notice` is hidden when empty and, when populated, reads as an
    inline status strip with text + semantic left edge and no card elevation.
21. The full visible Hunt Map shell uses square PPBUI surfaces/borders/shadow and
    no longer exposes host gradients, soft rounding or untreated panel chrome.
22. World tabs, Clear, zoom, Search, Level min/max and Hunt dropdown visibly belong
    to one Hunt Atlas component family across their complete applicable states.
23. Horizontal and vertical Hunt Atlas scrollbars use the scoped 10px pixel track/
    thumb treatment and preserve normal scrolling behavior.
24. With Locate active, every non-Located Pokémon sprite is visibly 90% dimmed
    (`opacity: 0.10`); the Located sprite remains fully visible, and Selected/Focus
    label exceptions do not cancel the sprite dim.
25. `Entrar na Hunt` is full-width, at least 48px high on desktop and 52px on
    coarse pointer, with a larger 14px/700 label and clearly greater visual/click
    prominence than Locate, Reset, Clear, presentation or zoom controls.

## Validation boundary

Agents must not install, open, reload, control, inspect or validate Better UI in
the live game, the user's browser or Tampermonkey. Automated/local validation is
agent-owned; live validation remains exclusively Product Owner-owned.

Product Owner live validation on 2026-09-12 confirmed that outer Hunt Map
window/title chrome is visibly exposed and currently under-treated. It is therefore
explicitly in scope for the next Hunt Atlas visual implementation pass. This
recorded observation does not authorize agents to inspect the live game directly.

## Delivery gate

Before implementation is handed to the Product Owner:

- Hunt Atlas page authority and MASTER conformance are confirmed;
- required UX/A11y & Design QA and Independent QA gates are `READY`;
- Hunts interaction/lifecycle tests pass;
- shared design-system runtime contracts pass if touched;
- full test suite/build/diff checks pass;
- no unrelated host UI is restyled.

Then stop for Product Owner in-game validation. This page moves to
`user validated` only after explicit Product Owner green light.
