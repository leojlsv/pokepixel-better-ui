# Hunts (Map) — pixel-art pilot, selection and explicit entry

Status: **reviewed / redesign**. Shared pixel-art migration implemented on
`refactor/pixel-design-system`; automated validation complete for the module,
user in-game validation partially completed; visual-completion follow-up remains
open.

Visual authority: `design-system/pokepixel-better-ui/MASTER.md` plus the approved
`design-system/pokepixel-better-ui/pages/hunts.md` override.

## Functional contract

Hunts separates inspection from gameplay. Native map markers remain the source
for zones, but pointer click and keyboard activation select a Hunt and open the
right-side dossier; they do not call `startHunt()`.

Hover/focus no longer opens the floating information tooltip while Better UI is
active. The dossier exposes the useful data persistently: Hunt name, level,
Elements, exact Weakness/Resistance/Immunity multipliers and Drops with NPC sell
value. The only Better UI gameplay entry is the explicit `Entrar na Hunt` action.

## Pixel-art window composition

The previous native-looking three-row composition is superseded. The desktop
window now has four intentional zones:

1. **World navigation header** — world tabs remain the primary context; zoom is
   grouped as a compact map utility.
2. **Command deck** — two task groups:
   - **Filtros**: native Search, level range, Clear and element filters;
   - **Alvo**: filtered Hunt selector, native area count, Locate, Reset and
     textual feedback.
3. **Map workspace** — visually dominant, framed by the Better UI pixel-art
   system without recoloring the map itself.
4. **Intel dossier** — selected Hunt identity/data, presentation mode and the
   primary Hunt action.

The shared `--ppbui-*` palette, square 2px borders, hard shadows, compact type
scale and focus/state language come from the global design-system runtime.
Hunts owns only its module-specific layout/integration CSS.

At constrained container widths the command deck stacks by task. The open
dossier remains side-by-side while usable, then stacks below the map at the
module's fit threshold; no project-wide mobile breakpoint or global game-window
scale is introduced.

## Native integration preserved

- Search, level inputs, Clear, world tabs, zoom, area count and element-filter
  nodes stay native and keep their handlers.
- The original `.hunt-presentation-toggle` is moved intact into the dossier; it
  is never cloned or recreated.
- The native map viewport is moved intact into a reversible workspace; pan/zoom
  listeners and map markers are not cloned.
- Styling native nodes is scoped through `.ppbui-hunts-enhanced`; global Better
  UI CSS remains opt-in and does not restyle host controls broadly.
- No feature-specific MutationObserver, network interception, synthetic Hunt
  marker click or `startHunt()` monkey patch is used.

Cleanup restores the native toolbar/count/element order, viewport placement,
presentation control and native marker click/hover behavior.

## Selection and navigation

- **Marker click:** selects/highlights and opens/updates the dossier only.
- **Keyboard activation:** performs the same selection and moves focus into the
  dossier sequence.
- **Localizar no mapa:** selects the same zone, opens the dossier and pans through
  native map state without changing perceived zoom or starting gameplay.
- **Reset:** clears selected/located/dossier state without changing filters or
  intentionally moving the map.
- **Esc / ×:** closes the dossier and returns focus to the selected marker when
  possible.
- **World/filter change:** clears a selection that is no longer valid.

Selected and Located remain separate states. Locate may dim other marker labels;
selecting another marker does not silently redefine the located target.

## Map-state preservation

Opening or closing the dossier changes the available viewport width. The
controller converts the current native state to semantic zoom ratio + focal
center, applies the new geometry and reconstructs scale/x/y so the player does
not experience a zoom jump.

Native refresh can temporarily recreate a full-width viewport and schedule its
own clamp. While the dossier is open, Better UI keeps a reference to the prior
open map state and geometry so the subsequent reconciliation restores the same
relative zoom and focal center instead of accepting the transient clamp as the
new intent.

## Stable Hunt identity

Selection is tracked by world + stable zone id when available, with the zone
object as fallback. On native reorder/refresh the current index is reacquired.
If the zone disappears, Better UI clears the dossier rather than reusing a stale
index and potentially entering another Hunt.

## Explicit Hunt action

`Entrar na Hunt` validates the current selected zone, assigns the reacquired
native `_selectedIndex` and calls the existing `scene.startHunt()`. The button
uses pending/disabled state while the returned operation is unresolved.

No custom gameplay request is sent and no gameplay automation is added.

## Accessibility and design-system review

- Filters/Target groups expose visible headings and `aria-labelledby` regions.
- Dossier is labelled by the selected Hunt title.
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
- command deck moves native filters/count/elements without cloning them;
- pixel-art pilot consumes shared PPBUI tokens/components with scoped CSS;
- Locate/Reset/selected-vs-located semantics;
- dossier defensive relations and valued Drops;
- search/world invalidation and stable-zone refresh/reorder behavior;
- semantic zoom/focal preservation, including the native rAF clamp race;
- mutation-free stable reconciliation;
- full native DOM restoration on cleanup;
- complete native window replacement/remount without duplicate Better UI UI.

Focused suite: **28/28 tests**. Full suite: **212/212 tests**. Userscript build:
**PASS**. Automated checks do not constitute in-game validation.

## Visual follow-up after partial in-game validation

The user reported on 2026-09-12 that the Hunts redesign is only partially
validated because some objects still do not read as redesigned. Before the next
implementation batch, the current source baseline is classified as follows.

| Component | Classification | Priority | Source-confirmable reason |
| --- | --- | --- | --- |
| World header surface | `MATCH` | — | Uses Better UI surface, border, hard shadow and shared state palette. |
| World tabs | `REFINE` | P2 | Correct state semantics are present, but the buttons still read as generic individual controls rather than a strongly unified pixel navigation rail. |
| Zoom utility | `MATCH` | P3 | Scoped state styling and compact grouping are complete; any additional art treatment is optional polish pending user visual confirmation. |
| Command-deck group surfaces | `REFINE` | P2 | Filters/Target use the same framed hard-shadow elevation as larger surfaces, which can make supporting chrome compete visually with the map. |
| Search/level/Clear filter row | `REFINE` | P2 | Better UI owns color, geometry and focus, but browser search decorations and number steppers are not explicitly owned and may remain visibly native. |
| Element filters | `REFINE` | P3 | State styling is complete, but the moved native buttons remain 26px tall and do not receive the shared coarse-pointer 40px adaptation. |
| Target select / count / Locate / Reset / status | `REFINE` | P2 | Buttons/count/status are Better UI-owned, but the result `<select>` still exposes native select arrow/popup chrome. |
| Marker keyboard focus | `MATCH` (resolved) | — | The follow-up adds a Better UI `:focus-visible` outline on the marker label, independent from selected/located state. |
| Normal map-marker labels | `REFINE` | P2 | Normal `.hunt-map-marker__name` nodes receive no Better UI base treatment; only selected/located/dimmed variants are restyled, leaving host visual language on the dominant map surface. |
| Selected vs. located marker feedback | `REDESIGN` | P2 | The states are functionally separate but share the same border/background/text rule, so the visual system does not communicate the distinction clearly. |
| Map workspace frame | `MATCH` | — | The map itself remains untouched as required while the surrounding workspace receives Better UI framing. |
| Dossier shell/header/body/footer | `MATCH` | — | Uses shared dialog/scroll/button primitives and the approved surface hierarchy. |
| Better UI-created dossier content ownership | `MATCH` (resolved) | — | Better UI-created dossier nodes now use `ppbui-hunts-*` classes; only genuine native/domain icon nodes returned by game APIs retain their native classes. |
| Element/relation badges and drops | `REFINE` | P3 | Semantics and readability are sound after ownership cleanup; additional pixel-art character is optional. |
| Classic/Platform presentation control | `REFINE` | P2 | The native control is safely moved and state-complete, but visually remains a generic two-button segment and is a candidate for stronger module-specific treatment. |
| Dossier close control | `MATCH` | P3 | The plain `×` is functional, accessible and does not require a raster asset; a bespoke pixel glyph is optional future polish. |

The next visual cycle must use the concept-first tooling flow in
`docs/DESIGN_TOOLING.md`. The first UI-kit concept should focus on the P1/P2 rows
above, then reclassify each component as `MATCH`, `REFINE`, `REDESIGN`,
`ASSET NEEDED` or `REMOVE` before code changes.

No SpriteCook asset is mandatory for the remaining visual batch. Base marker
labels, field/select chrome, tab rail hierarchy, command-deck weight,
selected-vs-located differentiation and coarse-pointer behavior should remain
DOM/CSS work unless an adopted concept demonstrates a specific asset with clear
artistic value.

One live-surface item cannot be proven from the synthetic fixture: outer native
panel chrome/title-bar elements outside `.pokeidle-panel__body`, if present in the
current game build. The Hunts module has no explicit source treatment for those
elements, so the next user validation should confirm whether they are visually
exposed and need Better UI ownership.

## In-game validation boundary

The coding agent does not open/control/reload PokePixel, the user's browser or
Tampermonkey to validate this interface. The module remains
`pending in-game validation` until the user explicitly gives a green light.
