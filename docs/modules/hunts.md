# Hunts (Map) — pixel-art pilot, selection and explicit entry

Status: **reviewed / redesign**. Shared pixel-art migration implemented on
`refactor/pixel-design-system`; automated validation complete for the module,
user in-game validation pending.

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

## In-game validation boundary

The coding agent does not open/control/reload PokePixel, the user's browser or
Tampermonkey to validate this interface. The module remains
`pending in-game validation` until the user explicitly gives a green light.
