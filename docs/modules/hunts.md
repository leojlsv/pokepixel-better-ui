# Hunts — current selector refinement + legacy map compatibility

Status: **current PokéPixel Hunt selector remains the functional baseline; regional
GYMS navigation and the MAP/LIST-unified UI/UX refinement are Product Owner-approved
and validated in-game on 2026-10-02**. The historical Hunt Atlas result through `3faa712` remains evidence
for legacy-map interaction/lifecycle behavior, not the current-list visual layout.

Historical visual references: `design-system/pokepixel-better-ui/MASTER.md` and
`design-system/pokepixel-better-ui/pages/hunts.md`. Per `AGENTS.md` and
`docs/PROJECT_RULES.md`, these become mandatory visual authority only when the
task expressly includes art direction; native gameplay/functional contracts
remain authoritative in all cases.

## Current native selector contract

Current upstream MAP and LIST share the same native selector shell: title, world
controls, MAP/LIST view toggle, Classic/Platform preference, Search, Element, Sort,
Level, Clear and result summary. Better UI applies one composition to both modes and
moves the existing native filter nodes rather than cloning or reimplementing them:
Search remains persistent; native Sort + Clear sit in a compact utility row beside one
Better UI `Filters` disclosure; native Element + Level live inside that disclosure;
and the native world/context note is folded into the native result summary.

The two native toggle groups intentionally receive different Better UI roles even
though upstream gives both `.hunt-presentation-toggle`: MAP/LIST is the full-width,
primary view switch; Classic/Platform is the full-width but visually subordinate
presentation preference. `GYMS` also consumes the available navigation width between
region and view navigation so it does not collapse into a small orphan control; the same
node remains present in both MAP and LIST and is rehomed after upstream refreshes.

Only the content surface differs by view: MAP owns the native atlas/markers and its
compact zoom/reset overlay; LIST owns the native table, `Details` and `Hunt` actions.
Both use the same Better UI workspace frame: a bounded discovery sidebar, an attached
summary rail and a content surface with the same structural edge/corner grammar. The
LIST table receives matching header/row chrome while preserving native rows/actions.
`Hunt` remains the primary gameplay action and `Details` remains secondary. Native
select/number/search affordances and handlers stay authoritative.

At constrained container widths up to 620px, the existing region buttons use a
balanced two-column visual grid while keeping DOM order, disabled state and handlers.
Wider panes use responsive auto-fit columns. This is the explicit narrow-width
exception to the earlier layout-ownership rule. The current MAP also releases the
native desktop `370px` atlas minimum to `300px` at this container threshold so the
249×712 target can keep navigation, discovery and a usable map in the same vertical
workflow even when the outer desktop viewport would not trigger the game's media query.

`GYMS` is a contextual regional navigation action in the header. It follows the
active Hunt region and opens the game's native `Scene_Gym` already scoped to that
region. It does not call Gym APIs or start/reserve a battle. The current native Gym
scene exposes Kanto and Johto; other Hunt regions keep the control disabled rather
than falling back to the wrong region.

## Current UI/UX implementation

The Product Owner's 249×712 in-game capture shows the first Hunt result entirely
below the fold: four full-width region controls, GYMS, two segmented mode rows,
context copy and the permanently expanded Search/Element/Sort/Level/Clear surface
consume essentially the whole viewport before results begin.

The implemented pass optimizes both **time to Hunt content** and the visual hierarchy
of the selector. The target hierarchy is `Region → Hunts/Gyms → view → Search → results → Hunt`.
Search stays persistent; Element + Level become advanced refinement; Sort is treated
as result ordering; Clear remains tertiary and reachable while advanced filters are
collapsed; and the Classic/Platform control remains available with less visual weight
than MAP/LIST. On narrow panes the same native region controls may use a compact
two-column arrangement as an explicit exception to native layout ownership; native
controls, DOM order, disabled state and handlers remain authoritative.

The full findings, wireframes, implementation constraints and `AC-HUNTS-UX-01..20` are maintained in
`design-system/pokepixel-better-ui/pages/hunts.md`. The approved GYMS placement and
native navigation contract are not reopened by this refinement.

The current selector adapter wraps the existing scene `startHunt()` only to remember the
authoritative Hunt-zone snapshot used by Cards. It delegates the native action once,
does not add a second gameplay path, and restores the exact original property on
cleanup.

## Legacy map functional contract

Hunts separates inspection from gameplay. Native map markers remain the source
for zones, but pointer click and keyboard activation select a Hunt and open the
attached Inspector; they do not call `startHunt()`.

Hover/focus no longer opens the floating information tooltip while Better UI is
active. The Inspector exposes the useful data persistently: Hunt name, level,
Elements, exact Weakness/Resistance/Immunity multipliers and Drops with NPC sell
value. The only Better UI gameplay entry is the explicit `Entrar na Hunt` action.

Element/relation rows now consume MASTER's global `ppbui-element-icon` primitive. Hunts
still extracts the raw native/domain image rather than nesting the host's circular wrapper;
the square color well and sizes are therefore identical to Team/Picker/HUD rather than a
Hunts-specific icon family.

## Historical Hunt Atlas composition — legacy map only

For the legacy map adapter, the previous two-card Filters/Target command deck was
superseded by the historical map-first Hunt Atlas composition:

1. **Atlas rail** — world tabs define context and zoom remains a compact map
   utility on the same structural rail.
2. **Finder rail** — Search, level range, Clear, element filters, Hunt selector,
   native result count, Locate, Reset and status feedback form one supporting
   surface attached to the map rather than separate cards.
3. **Map workspace** — visually dominant, framed by the Better UI pixel-art
   system without recoloring the native map itself.
4. **Attached Inspector** — selected Hunt identity/data, native presentation mode
   and the explicit primary `Entrar na Hunt` action.

The current visual FIX keeps each Pokémon sprite on a transparent marker substrate;
only a compact dark caption carries Selected/Located/Focus state, so there is no
opaque card/plate behind the sprite. Element and defensive-relation rows extract the
native PNG itself from decorative host wrappers and align that PNG directly with
label/multiplier content; the old circle-inside-badge presentation is intentionally
not reproduced.

Current visual chrome follows the game-integrated MASTER. Historical square/pixel
geometry in older Hunt Atlas evidence is not current visual authority.

At constrained container widths Finder controls wrap by semantic group. The open
Inspector remains side-by-side while usable, then stacks below the map at the
module's fit threshold; no project-wide mobile breakpoint or global game-window
scale is introduced.

## Native integration preserved

- Current MAP/LIST Search, Element, Sort, Level, Clear, world tabs, presentation mode,
  summary, rows and actions stay in their native structure and keep handlers.
- Legacy-map Search, level inputs, Clear, world tabs, zoom, area count and
  element-filter nodes stay native and keep their handlers.
- In the legacy-map adapter, the original `.hunt-presentation-toggle` is moved intact
  into the Inspector; it is never cloned or recreated.
- The native map viewport is moved intact into a reversible workspace; pan/zoom
  listeners and map markers are not cloned.
- Styling native nodes is scoped through `.ppbui-hunts-enhanced`; global Better
  UI CSS remains opt-in and does not restyle host controls broadly.
- No feature-specific MutationObserver, network interception or synthetic Hunt
  marker click is used. The historic map/Inspector mode does not patch
  `startHunt()`. The current native **MAP/LIST selector** adapter wraps the scene's
  `startHunt()` narrowly to preserve zone context across native commands and
  restores the original descriptor on cleanup (`src/modules/hunts/controller.js`);
  this is not an automatic Hunt action.

Cleanup removes Better UI current-selector styling without reconstructing its native
structure. Legacy-map cleanup restores toolbar/count/element order, viewport
placement, presentation control and native marker click/hover behavior.

## Selection and navigation

- **Marker click:** selects/highlights and opens/updates the Inspector only.
- **Keyboard activation:** performs the same selection and moves focus into the
  Inspector sequence.
- **Localizar no mapa:** selects the same zone, opens the Inspector and pans through
  native map state without changing perceived zoom or starting gameplay.
- **Reset:** clears selected/located/Inspector state without changing filters or
  intentionally moving the map.
- **Esc / ×:** closes the Inspector and returns focus to the selected marker when
  possible.
- **World/filter change:** clears a selection that is no longer valid.

Selected and Located remain separate states. Locate may dim other marker labels;
selecting another marker does not silently redefine the located target.

## Map-state preservation

Opening or closing the Inspector changes the available viewport width. The
controller converts the current native state to semantic zoom ratio + focal
center, applies the new geometry and reconstructs scale/x/y so the player does
not experience a zoom jump.

Native refresh can temporarily recreate a full-width viewport and schedule its
own clamp. While the Inspector is open, Better UI keeps a reference to the prior
open map state and geometry so the subsequent reconciliation restores the same
relative zoom and focal center instead of accepting the transient clamp as the
new intent.

## Stable Hunt identity

Selection is tracked by world + stable zone id when available, with the zone
object as fallback. On native reorder/refresh the current index is reacquired.
If the zone disappears, Better UI clears the Inspector rather than reusing a stale
index and potentially entering another Hunt.

## Explicit Hunt action

`Entrar na Hunt` validates the current selected zone, assigns the reacquired
native `_selectedIndex` and calls the existing `scene.startHunt()`. The button
uses pending/disabled state while the returned operation is unresolved.

No custom gameplay request is sent and no gameplay automation is added.

## Accessibility and design-system review

- Finder controls retain explicit accessible labels/group semantics without the
  obsolete visible Filters/Target card headings.
- Inspector is labelled by the selected Hunt title.
- Close has a localized accessible label.
- Keyboard focus uses the independent Better UI cyan focus state.
- Primary action/selected state uses more than text color alone.
- Required information is persistent; workflows do not depend on hover.
- Long names remain recoverable through title/accessibility metadata.
- Locate flash is removed under `prefers-reduced-motion: reduce`.
- Metadata uses the approved contrast-safe `--ppbui-text-subtle` token.

The optional UI/UX Pro search/catalog/checklist files referenced by
`.skills/ui_ux_pro.md` are unavailable in this workspace. The project-native
fallback review was used; no external search/checklist result is claimed.

## Automated validation

Focused Hunts coverage verifies:

- marker click/keyboard selection cannot start gameplay;
- explicit Hunt calls the native flow exactly once with the current index;
- hover/focus native tooltip handlers are suppressed only while enhanced;
- presentation toggle identity/listeners survive relocation and cleanup;
- Finder/Atlas composition moves native filters/count/elements without cloning
  them;
- Hunt Atlas consumes shared PPBUI tokens/components with scoped CSS;
- Locate/Reset/selected-vs-located semantics;
- Inspector defensive relations and valued Drops;
- search/world invalidation and stable-zone refresh/reorder behavior;
- semantic zoom/focal preservation, including the native rAF clamp race;
- mutation-free stable reconciliation;
- full native DOM restoration on cleanup;
- complete native window replacement/remount without duplicate Better UI UI.

Historical Hunts suite: **31/31 tests**; the `3faa712` closure used **214/214**
full tests, and the later Miyazaki 16 review recorded **249/249** at that time.
The 2026-09-29 working tree verified **43/43 Hunts tests** and **518/518 full-suite
tests** before the later PPTools Recommendation removal. Current automated totals
must be taken from the active candidate validation. Historical Team redesign
hashes remain in `docs/TEAM_REDESIGN_STATUS.md`. Automated checks do not constitute
in-game validation.

## Final live-validation closure

The Product Owner's first 2026-09-12 live pass identified unfinished shell/control
ownership, weak Locate dimming and insufficient primary-action hierarchy. A second
pass identified Search/Level rounding, Atlas/zoom alignment and incomplete selected
tab fill. The visible `PRESENTATION` heading was then removed, the window was renamed
to `HUNT ATLAS`, and the title typography was corrected against the actual nested
host title owner after the first typography attempt passed tests but failed in-game.

The final title-owner correction in historical `3faa712` applies authoritative inline
`!important` typography while preserving and restoring the native title owner's
exact text/style/class state. Independent Design QA and technical QA returned
P0/P1/P2/P3 = none / READY, and the Product Owner then gave the final in-game
verdict **Hunt Atlas validado. All green.** No Hunt Atlas visual-completion item
from that historical cycle remains open; the later Miyazaki 16 visual migration is
a separate candidate and remains pending fresh live validation.

## In-game validation boundary

The coding agent does not open/control/reload PokePixel, the user's browser or
Tampermonkey to validate this interface. The Product Owner supplied the required
green light on 2026-09-12 for the delivery through `3faa712`. Any future live
appearance/behavior change reopens validation only for the changed scope.

## PPTools Recommendation removal

On 2026-10-02 the Product Owner requested complete removal of PPTools
Recommendation from Hunts. Hunts no longer renders the recommendation widget,
reads PPTools-specific leader/input projections, parses recommendation payloads,
searches or locates Hunts from PPTools results, or exchanges recommendation
messages with the Coupled Workspace bridge.

The former PPTools experiments and acceptance records are historical only and do
not define current Hunts behavior or acceptance criteria.
