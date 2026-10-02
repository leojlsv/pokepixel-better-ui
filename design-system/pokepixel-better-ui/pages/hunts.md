# Hunts — Hunt Atlas Design Override

Status: **native-first current Hunt selector refinement implemented; regional GYMS navigation and MAP/LIST visual unification user-validated on 2026-10-02**
Direction: **Native Hunts + Better UI hierarchy refinement**
Product Owner approval: **2026-09-12**
Migration classification: **redesign**
Validation status: **historical Hunt Atlas behavior user-validated; current Miyazaki 16 candidate pending fresh live validation**
Product Owner live validation: **2026-09-12 — All green**
Validated implementation: **`3faa712`**

## Previous native-first baseline — 2026-10-02

The Product Owner explicitly judged the current PokéPixel Hunts model better than
the Better UI composition and requested that future UI/UX improvements build on
top of the native structure. This direction supersedes the historical requirement
to make the current upstream Hunt list resemble the older Hunt Atlas rails.

The rules immediately below record the first native-first pass. The later
`AC-HUNTS-UX-*` implementation supersedes its strict current-list child-order/layout
requirements where explicitly documented, while preserving native node identity,
handlers, gameplay behavior and cleanup.

For the current native Hunt list (`hunt-list-*`):

- preserve the native title, header, toolbar, summary and table hierarchy;
- preserve native child order and layout ownership; Better UI must not turn the
  header into an Atlas rail or the filter toolbar into its own grid;
- world navigation remains the dominant context control; presentation mode is a
  subordinate utility and must not receive the same selected/current emphasis;
- Search, Element, Sort and Level retain the native order and control affordances;
- Clear is tertiary/reversible utility rather than a peer of the filter fields;
- `Hunt` is the primary row action; `Details` is secondary/disclosure;
- Better UI may refine typography, semantic action states, focus visibility,
  control surfaces, separators and narrow-width overflow without moving or
  recreating native controls;
- native select arrows, number steppers, search affordances and other useful host
  control cues remain unless a later validated issue justifies owning them;
- the legacy map adapter remains compatibility behavior and does not define the
  current-list composition.

### Acceptance criteria for this pass

- **AC-HUNTS-NATIVE-01:** mounting current-list Hunts keeps the visible native
  title text and preserves header/toolbar/table child order.
- **AC-HUNTS-NATIVE-02:** Better UI adds no current-list Atlas-rail class and no
  toolbar/surface data wrappers used to impose a replacement layout.
- **AC-HUNTS-NATIVE-03:** current-list CSS does not force the native filter toolbar
  into a Better UI grid or the native header into a replacement flex rail.
- **AC-HUNTS-NATIVE-04:** Hunt, Details and Clear expose three distinct semantic
  visual tiers: primary, secondary and tertiary respectively.
- **AC-HUNTS-NATIVE-05:** world navigation and presentation-mode state do not share
  one equal selected/current treatment; presentation stays visually subordinate.
- **AC-HUNTS-NATIVE-06:** keyboard focus remains explicit on native tabs, fields,
  utilities and row actions.
- **AC-HUNTS-NATIVE-07:** constrained list panes preserve usable row/action geometry
  through the native table shell as the horizontal scroll owner without changing
  filter order.
- **AC-HUNTS-NATIVE-08:** cleanup restores the exact native DOM/title/style state and
  Hunt still delegates to the native action exactly once.

### Regional Hunts → Gyms navigation — 2026-10-02

Hunts now exposes `GYMS` as a **secondary regional destination**, not as a Hunt
filter and not as a gameplay action. The player flow is:

`Region → activity (Hunts/Gyms) → refine/select → explicit gameplay action`.

The control belongs in the regional header between world context and lower-priority
view/presentation utilities. Its visible label remains compact (`GYMS`); accessible
name and tooltip include the current region.

- **AC-HUNTS-GYM-01:** the button follows the authoritative active Hunt region.
- **AC-HUNTS-GYM-02:** Kanto opens the native Gym scene with Kanto selected; Johto
  opens the same native scene with Johto selected.
- **AC-HUNTS-GYM-03:** navigation uses `Scene_Gym`/`SceneManager`; Better UI does not
  fetch Gym APIs, reserve a battle, click `gym-start`, or recreate the Gym UI.
- **AC-HUNTS-GYM-04:** regions unsupported by the native Gym scene fail closed with
  a disabled control. Current native Gym source supports Kanto and Johto only.
- **AC-HUNTS-GYM-05:** repeated reconciliation keeps one stable button and performs
  no DOM mutation when region/availability are unchanged.
- **AC-HUNTS-GYM-06:** the button is keyboard-focusable when available, has explicit
  focus-visible treatment, and exposes localized region context through its
  accessible name.
- **AC-HUNTS-GYM-07:** cleanup removes the Better UI navigation control and restores
  the underlying native Hunts structure exactly.

### Current-list UI/UX implementation — 2026-10-02

The Product Owner approved the regional `GYMS` control in-game, requested the broader
Hunts UI/UX study and then authorized implementation. The approved `GYMS`
placement/behavior is frozen; the current candidate applies the documented Hunts
hierarchy while preserving native controls/handlers.

#### Observed narrow-pane problem

The Product Owner supplied a representative **249×712 px** Hunts capture. In that
state the player sees, in order:

1. title;
2. four full-width region controls;
3. the approved `GYMS` destination;
4. `MAP / LIST`;
5. `MODO CLÁSSICO / MODO PLATAFORMA`;
6. region/level context;
7. an always-expanded filter card containing Search, Element, Sort, Level range and
   a full-width Clear action.

The first Hunt result is completely below the fold. Roughly the whole 712 px viewport
is consumed by context/navigation/refinement before the player reaches the content
they opened Hunts to inspect. This is the dominant usability problem; changing color,
border or typography alone cannot solve it.

#### Current player flow

`Region → regional destination → view → presentation/mode → search/filter/sort → results → Details/Hunt`

The functional ordering is valid, but the screen gives almost every stage similar
visual area and framing. This makes secondary setup controls compete with the Hunt
results and pushes the primary task down the page.

#### Target hierarchy

`Region → Hunts/Gyms → view → Search → results → explicit Hunt action`

Element/Level are **advanced refinement**, Sort is a **result-order utility**, and the
Classic/Platform control is a **secondary mode/presentation setting**. They remain
available, but should no longer consume the same persistent vertical weight as region,
Search and results.

#### Findings and recommended changes

| Priority | Finding | Recommended direction |
| --- | --- | --- |
| High | Four full-width region buttons consume disproportionate height in a narrow pane. | At constrained widths, keep the same native region buttons and order but arrange them in a compact 2-column grid. This is an explicit narrow-width exception to the earlier “native layout ownership” rule; Better UI may alter only the visual grid of the existing native region controls, without cloning/reordering them. Wider panes retain the native row/desktop behavior. |
| High | The entire filter surface is permanently expanded even when the player only needs Search or browsing. | Keep Search persistently visible. Put Element + Level range behind one Better UI `Filters` disclosure. When hidden filters are active, the trigger must expose an active state and Clear must remain reachable outside the collapsed disclosure. |
| High | Search, filtering and sorting are visually presented as one concept. | Treat Search as discovery, Element/Level as filters, and Sort as a list utility. Keep Sort visible beside the results/filter utility row instead of giving it the same semantic grouping as Element/Level. |
| High | No result is visible above the fold in the supplied 249×712 state. | Narrow-layout acceptance must require the result summary and start of the results surface to be visible without scrolling when advanced filters are collapsed. |
| Medium | `MAP / LIST` and `MODO CLÁSSICO / MODO PLATAFORMA` use similarly heavy framed segmented controls, making two different dimensions look equally primary. | Keep `MAP / LIST` as the stronger view switch. Visually demote the second segmented control through lighter chrome/typography while retaining its native behavior and full keyboard access. |
| Medium | Repeated framed containers create border noise: segmented wrappers, filter card and every field all read as separate boxes. | Follow MASTER §6: remove decorative outer framing where spacing + one separator is sufficient; keep borders on actual interactive controls/value wells. |
| Medium | Full-width `Clear` reads more like a primary action than a reversible utility despite current color treatment. | Keep the native action but present it as a compact tertiary reset near filter state, not as the final full-width CTA of the filter card. |
| Medium | The two Level inputs share a visual label but need distinct accessible identities. | Ensure explicit accessible names for minimum and maximum level, preserving native number-input behavior and exact cleanup. |
| Low | Disabled region state is visually quiet but its reason may be unclear. | Preserve native disabled state and add/retain concise accessible/title text when the host does not already explain availability. |

#### Recommended narrow-pane composition

```text
HUNTS

[ KANTO ] [ JOHTO ]
[ ILHAS LENDÁRIAS ] [ HOENN ]

            [ GYMS ]        ← approved, unchanged

[ MAP | LIST ]
[ CLÁSSICO | PLATAFORMA ]   ← visually subordinate

[ Search Pokémon or area........................ ]
[ Filters ]   [ Sort: Level low → high ]   [ Clear ]

──────── Results / summary · Kanto · Lv. 1–100 ────────
Hunt rows become visible here without first scrolling.

Expanded Filters only when requested:
[ Element ...................................... ]
[ Min level ............ ] [ Max level ......... ]
```

This is an information-architecture target, not a requirement to recreate native
controls. Existing native Search, Element, Sort, level inputs, Clear, world buttons,
view/presentation controls and Hunt rows remain the functional authority.

#### Implementation constraints for the current pass

- do not change Hunt eligibility, filters, sort semantics or native gameplay actions;
- do not clone native fields/buttons solely to obtain the new composition;
- preserve native handlers/private state; a layout-only visual reorder may use scoped
  Better UI CSS or reversible ownership only after inspecting the actual host node;
- one Better UI disclosure state may control advanced-filter visibility, but it must
  not become a parallel copy of filter values;
- active hidden filters must remain obvious while the disclosure is collapsed. Prefer
  a binary active indicator unless native/default filter state can be derived
  authoritatively for the current region; do not invent a numeric filter count;
- native Clear remains compact and reachable while advanced filters are collapsed;
- existing native state changes/re-renders must not reset Search, Sort, filter values,
  region or keyboard focus;
- collapsing advanced filters while focus is inside them returns focus to the Filters
  trigger before hiding the focused field; the disclosure exposes `aria-expanded` and
  an explicit relationship to the controlled native fields;
- the region/level context line may be folded into the result summary or hidden when
  it only duplicates selected region/default range; preserve it when it communicates
  unique gameplay, unlock or availability information;
- disabled-region explanations must use host-provided visible/described context when
  available rather than relying on `title` alone; never invent an unlock reason;
- responsive adaptation uses the Hunts module container and keeps DOM/tab order
  aligned with the visual order; do not use CSS `order` to create a different keyboard
  sequence;
- the already approved `GYMS` navigation contract remains unchanged.

#### Acceptance criteria for the current UI pass

- **AC-HUNTS-UX-01:** in the representative ~249×712 narrow pane, collapsed advanced
  filters expose the result summary and the beginning of the results surface without
  requiring vertical scroll.
- **AC-HUNTS-UX-02:** constrained region navigation uses at most two rows while
  preserving every native region control, disabled state, DOM order and handler. This
  is the approved narrow-width exception to native layout ownership.
- **AC-HUNTS-UX-03:** Search remains always visible; Element and Level are available
  through one explicit advanced-filter disclosure.
- **AC-HUNTS-UX-04:** collapsing advanced filters never hides the fact that an active
  hidden filter is affecting the result set, and Clear remains reachable outside the
  collapsed disclosure. A numeric filter count is used only if authoritative defaults
  make it exact; otherwise the trigger exposes a binary active state.
- **AC-HUNTS-UX-05:** Sort remains independently reachable and is visually identified
  as result ordering rather than filtering.
- **AC-HUNTS-UX-06:** `MAP / LIST` remains visually stronger than the secondary
  Classic/Platform control without changing either native interaction.
- **AC-HUNTS-UX-07:** Clear is visually tertiary and does not compete with Hunt as a
  primary gameplay action.
- **AC-HUNTS-UX-08:** minimum and maximum Level inputs expose distinct accessible
  names; the Filters disclosure exposes `aria-expanded`, returns focus to its trigger
  before hiding a focused advanced field, and all tabs/toggles/fields retain visible
  keyboard focus.
- **AC-HUNTS-UX-09:** stable reconciliation introduces no mutations when layout state,
  filter disclosure, region and host structure are unchanged.
- **AC-HUNTS-UX-10:** cleanup restores the exact current native DOM attributes/order
  for any nodes Better UI temporarily owns or annotates.
- **AC-HUNTS-UX-11:** responsive compaction is container-scoped, preserves visual and
  keyboard order, and does not shrink controls below the project control geometry for
  the active pointer mode.
- **AC-HUNTS-UX-12:** redundant region/default-level context does not consume a
  permanent standalone row; unique gameplay/unlock/availability context remains
  visible or associated with the result summary.

### MAP/LIST visual-unification correction — 2026-10-02

The Product Owner rejected the preceding candidate as functionally improved but still
visually under-designed. The concrete failures were: `MAP / LIST` was too small for the
available width, MAP and LIST exposed visibly different menu composition, and `GYMS`
disappeared in the current MAP view.

Current upstream `HuntSelectionScene` source was re-inspected after that feedback. The
current game now uses the **same** `hunt-list-header`, `hunt-list-world-tabs` and
`hunt-list-toolbar` for both MAP and LIST. Only the content surface changes:

- MAP: `hunt-world-viewport` + map markers + `hunt-region-controls`;
- LIST: `hunt-list-table-shell` + Hunt rows/details.

The native header also renders two separate controls with the same host class
`hunt-presentation-toggle`: the first is the MAP/LIST view switch and the second is
Classic/Platform presentation preference. Better UI therefore assigns scoped semantic
classes to the existing native groups instead of treating them as one visual family.

#### Unified current-selector hierarchy

```text
HUNTS

[ KANTO             ] [ JOHTO             ]
[ ILHAS LENDÁRIAS   ] [ HOENN             ]

[                   GYMS                   ]  ← regional activity navigation

[                MAP | LIST                ]  ← primary view navigation
[        CLÁSSICO | PLATAFORMA             ]  ← secondary preference

[ Search .................................. ]
[ Filters ]      [ Sort ................ ] [ Clear ]

──────── result/context summary ────────

MAP  → atlas + map-only zoom controls
LIST → table + Details/Hunt actions
```

The approved `GYMS` behavior remains unchanged, but its reopened visual treatment now
uses the full navigation width so it does not read as a tiny orphan between region and
view controls. MAP/LIST consumes the same width with equal 50/50 segments and stronger
selected-state/height than Classic/Platform. The latter stays full width for alignment
but uses quieter chrome, smaller geometry and muted default text.

The selector shell is also explicitly owned as one composition: a bounded discovery
sidebar and a content workspace. The native result summary becomes the attached top rail
of that workspace; MAP viewport and LIST table shell use the same structural frame below
it. This gives the two views one visual identity without forcing their content models to
be identical. LIST table headers/rows are normalized to the same current-game tokens;
MAP retains native atlas imagery/markers and only restyles the existing zoom/reset group.

#### UI/UX Pro Max application note

`/ui_ux_pro_max` was explicitly requested for this correction. Its installed
`SKILL.md` guidance was applied for hierarchy, navigation consistency, progressive
disclosure, interaction states and responsive layout. The skill's referenced local
search datasets, `references/quick-reference.md`, `references/pro-rules.md` and search
script are not present in the installed `/skills/ui_ux_pro` package in this workspace,
so no external/search result is claimed. Project `MASTER.md`, the current native
HuntSelection source and Product Owner feedback remain the design authorities.

#### Additional acceptance criteria

- **AC-HUNTS-UX-13:** current MAP and LIST use the same region → GYMS → view →
  presentation → filter hierarchy; switching view does not expose a different menu
  architecture.
- **AC-HUNTS-UX-14:** `GYMS` is present in both current MAP and LIST, follows the active
  region, and one stable Better UI button is rehomed after the native MAP/LIST refresh
  without duplication.
- **AC-HUNTS-UX-15:** MAP/LIST spans the available navigation width in two equal
  segments and receives visibly stronger geometry/selected treatment than the
  Classic/Platform preference immediately below it.
- **AC-HUNTS-UX-16:** Better UI distinguishes the two native
  `hunt-presentation-toggle` groups through reversible scoped classes; cleanup restores
  the exact native classes/DOM, and MAP/LIST refresh reacquires new native groups.
- **AC-HUNTS-UX-17:** current MAP keeps its content-specific navigation controls
  (`hunt-region-controls`) as a compact map overlay using the same Better UI control
  language and focus treatment; LIST-only table actions remain LIST-only.
- **AC-HUNTS-UX-18:** current MAP and LIST share the same bounded discovery-sidebar +
  workspace composition; the native summary is visually attached to the content surface
  instead of reading as a detached intermediate row.
- **AC-HUNTS-UX-19:** `GYMS` uses the available current-header width in both views while
  remaining a secondary regional navigation action; its behavior, supported-region gate
  and native `Scene_Gym` destination are unchanged.
- **AC-HUNTS-UX-20:** MAP viewport and LIST table shell consume the same Better UI
  structural frame. LIST may normalize table header/row chrome; MAP may normalize the
  native zoom/reset overlay, but neither view recreates native gameplay/content state.
  At the current-selector narrow threshold the MAP may reduce the host desktop atlas
  minimum to 300px so the 249×712 workflow keeps meaningful workspace without forcing
  the navigation stack to overflow the window before the map begins.

Sections below remain historical Hunt Atlas design evidence for the legacy map
adapter unless they describe non-visual lifecycle/integration invariants that are
still referenced by current code.

**Current visual authority — 2026-10-01:** the Product Owner now requires Better UI to
blend into the current PokéPixel as part of the game. Historical Miyazaki 16, mandatory
square/0px geometry, 2px structural-edge and hard-shadow instructions below are retained
as candidate history only. Hunt Atlas behavior, hierarchy and lifecycle constraints remain
valid; current MASTER/native visual grammar owns chrome.

Master-style migration note (2026-09-16): the Product Owner explicitly rejected the
intermediate white/warm master, later rejected the Sweetie 16 color distribution in live
inspection, and selected official Miyazaki 16 as the project-wide palette. The older
Hunts-only font, 32px utility-control and oversized 48/52px
CTA treatments remain superseded by MASTER's shared geometry/type scale. All
non-visual Hunt Atlas behavior, hierarchy, lifecycle and native-integration
constraints remain frozen.

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
  single shared restrained 2px hard raised shadow. Host gradients, soft rounding and unrelated host
  surface styling must not remain visible inside this scoped shell.
- While Better UI is mounted, the visible native window title is presented as
  `HUNT ATLAS`; the original native title node is preserved and its exact text is
  restored during cleanup.
- `HUNT ATLAS` keeps its uppercase identity and 1px tracking, but consumes MASTER's
  single monospace family and title size/weight. Apply the typography directly to
  the native element that owns the visible title text with authoritative
  `!important` inline properties while mounted because the host title may carry its
  own important shorthand; restore its exact original `style` and class state during
  cleanup. Do not introduce a Hunts-only font family or decorative title shadow.
- Atlas/Finder supporting rails: `bg-2` only where separation from the shell is
  needed; avoid equal hard-shadow elevation on every group.
- Map frame: `bg-0` boundary with a crisp 2px structural edge.
- Inspector: `bg-1`/`bg-2` sections attached to the workspace, separated with
  1–2px rules rather than card stacks.
- Default corners remain square; hard shadows follow MASTER and are reserved for
  actual elevation, not every internal grouping.

### World tabs

- One continuous rail with one outer 2px frame and 1px internal dividers.
- Desktop tab height is the MASTER `--ppbui-control-height` (28px); tabs are gapless inside the rail and must not retain
  native standalone-button chrome.
- Every world tab must stretch to the full height of the rail and share the
  available navigation width evenly; the selected tab background/edge must fill
  its entire segment with no inset/native gap around the active surface.
- The tab rail and zoom rail must share the same 28px inner row height and align
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
buttons are 28px high with 2px neutral borders, `bg-2` default surface, `bg-3`
hover, inset/depth-shift pressed state, cyan focus and subtle disabled state. They
must not retain native button bevels/rounding. Gold is not used unless a future
zoom state has actual selected/current semantics.

### Search, level inputs and Hunt select

- `bg-0` input well, 2px border, 28px desktop height.
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

Clear is a 28px secondary utility button with square 2px neutral border,
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

Pokémon/domain sprites remain the visually primary native assets. The marker root
must stay transparent: no opaque tile, card, border or hard-shadow plate may sit
behind the sprite. Better UI owns only a compact dark caption plus state cues.

- **Base:** transparent sprite substrate + compact `bg-0` caption with a restrained
  neutral separator and readable light text.
- **Hover:** strengthen the caption edge/text and allow the shared cyan interaction
  cue on the sprite/caption without introducing a backing card behind the sprite;
  do not introduce gold selection or INFO-blue Located cues on hover alone.
- **Pressed:** apply compact caption feedback only; pressed feedback must not create,
  clear or visually imply Selected or Located state.
- **Selected:** gold 2px caption/structural edge; clearly indicates the Hunt currently
  shown in the inspector while leaving the sprite substrate transparent.
- **Located:** keep the compact neutral caption and add one deterministic INFO-blue
  2px bottom rail/underline; do not reuse the selected gold outer cue.
- **Selected + Located:** retain the Selected gold cue while also keeping the INFO-blue
  bottom rail inside the same compact caption, so both semantics remain visible.
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
containers consume the shared `.ppbui-scroll` pixel primitive; no descendant-wide
or host-wide scrollbar styling.

- thickness: shared 10px token on both axes;
- shared track/thumb/corner treatment from current MASTER geometry;
- only actual scroll containers opt into `.ppbui-scroll`; map descendants that do
  not scroll are not styled merely because they are inside Hunts;
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

`Entrar na Hunt` is the only primary action in the inspector. Its hierarchy comes
from semantic primary styling, full-width placement and separation from utilities,
not from a separate button-height system.

- full-width MASTER action height: **28px desktop**;
- coarse-pointer minimum height: **40px**;
- MASTER body/control label treatment, 700 weight, centered, with shared horizontal
  padding;
- dark Miyazaki 16 control surface with 2px blue/cyan primary action edge/text; no persistent
  raised shadow;
- hover uses accent-highlight edge/text without increasing geometry;
- pressed uses the shared hard inset depth cue without translation/scale;
- focus remains an independent 2px cyan outline outside the action edge;
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
5. **Primary entry action remains semantically unique without a second geometry.**
   `Entrar na Hunt` uses the MASTER 28px desktop action height / 40px coarse-pointer
   minimum, full width and the primary blue/cyan action edge/text treatment. No other action in
   the inspector may receive equal primary semantics.
6. **Second live geometry correction — historical geometry superseded.** Search and
   Level min/max retain the validated row alignment and complete segment fill, but
   their old 0px/square corner requirement is retired. Current MASTER's fixed native
   5px control radius applies.

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
16. Keep `Entrar na Hunt` full-width at the shared MASTER action geometry and
    preserve its exclusive primary-action hierarchy through semantic primary styling.

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
7. Blue/cyan communicates action/focus, gold communicates persistent selection/current
   state, and domain colors retain gameplay meaning.
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
18. In-game appearance/function for the current delivery is Product Owner-approved
    through `3faa712`; any later visual/runtime change reopens live validation for
    the changed scope.
19. Automatic inspector closure restores focus using the specified deterministic
    fallback and never targets a detached node or intentionally moves the map.
20. `.hunt-world-notice` is hidden when empty and, when populated, reads as an
    inline status strip with text + semantic left edge and no card elevation.
21. The full visible Hunt Map shell uses square PPBUI surfaces/borders/shadow and
    no longer exposes host gradients, soft rounding or untreated panel chrome.
22. World tabs, Clear, zoom, Search, Level min/max and Hunt dropdown visibly belong
    to one Hunt Atlas component family across their complete applicable states.
23. Horizontal and vertical Hunt Atlas scroll containers explicitly consume the
    shared 10px `.ppbui-scroll` treatment and preserve normal scrolling behavior.
24. With Locate active, every non-Located Pokémon sprite is visibly 90% dimmed
    (`opacity: 0.10`); the Located sprite remains fully visible, and Selected/Focus
    label exceptions do not cancel the sprite dim.
25. `Entrar na Hunt` is full-width, uses the 28px MASTER action height on desktop
    and at least 40px on coarse pointer, and remains clearly primary through its
    semantic blue/cyan action edge/text, placement and spacing rather than oversized geometry.

## Validation boundary

Agents must not install, open, reload, control, inspect or validate Better UI in
the live game, the user's browser or Tampermonkey. Automated/local validation is
agent-owned; live validation remains exclusively Product Owner-owned.

Product Owner live validation on 2026-09-12 closed the Hunt Atlas delivery gate
with the verdict **All green** after the shell/control polish, Locate dim treatment,
primary Hunt action refinement and final title-owner typography correction. The
validated implementation is `3faa712`. This recorded approval does not authorize
agents to inspect the live game directly; future visual/runtime changes require a
new Product Owner live-validation pass for the changed scope.

## Delivery gate

Before implementation is handed to the Product Owner:

- Hunt Atlas page authority and MASTER conformance are confirmed;
- required UX/A11y & Design QA and Independent QA gates are `READY`;
- Hunts interaction/lifecycle tests pass;
- shared design-system runtime contracts pass if touched;
- full test suite/build/diff checks pass;
- no unrelated host UI is restyled.

For the current Hunt Atlas delivery, all gates above were completed and the Product
Owner explicitly approved the in-game result on 2026-09-12. The page is therefore
`user validated` through `3faa712`. Future changes that affect live appearance or
behavior reopen the Product Owner validation gate for that changed scope.
