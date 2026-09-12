# Hunts — Pixel-Art Design Override

Status: **approved**
Migration classification: **reviewed / redesign**
Validation status: **pending in-game validation**

This page specializes `../MASTER.md` for the Hunts desktop window. It changes
visual hierarchy and layout while preserving the already implemented functional
contract: selection is separate from gameplay, Locate is navigation-only, the
explicit Hunt action starts gameplay, native map state survives layout changes,
and cleanup restores the host integration safely.

## UI/UX review provenance

Reviewed against `.skills/ui_ux_pro.md` with the product context of a dense
desktop game map. The skill's referenced search/catalog/checklist resources are
not available in this workspace, so no generated style/palette result is claimed.
The project-native fallback review prioritizes accessibility, interaction
clarity, information hierarchy, responsive resilience, feedback and performance.

## Information architecture

The window uses four intentional zones:

1. **World navigation header** — world tabs as the primary context selector;
   zoom remains a compact map utility on the opposite side.
2. **Command deck** — two task groups instead of three visually equivalent
   native rows:
   - **Filters**: search, level range, Clear and element filters;
   - **Target**: filtered Hunt selector, area count, Locate and Reset.
3. **Map workspace** — dominant surface and primary spatial context.
4. **Intel dossier** — selected Hunt identity, level, elements, defensive
   relations, drops, presentation mode and the explicit `Entrar na Hunt` action.

The map remains the largest visual surface. The command deck must read as
supporting chrome, not another content panel competing with the map.

## Layout

### Header

- Pixel-art window/navigation surface using MASTER tokens.
- World tabs read as a continuous navigation rail, not unrelated buttons.
- Selected world uses the MASTER selected/current state.
- Zoom is visually subordinate and aligned as one compact utility group.
- The native Classic/Platform control remains relocated into the dossier when a
  selection exists; it is not duplicated.

### Command deck

Desktop default uses a two-column grid:

- Filters: `minmax(0, 1fr)`.
- Target: approximately 300–360px, allowed to shrink only while actions remain
  usable.

Filters contain the native search/level/Clear controls in one compact row and
element filters beneath them as a scan-friendly chip rail. Target contains the
filtered Hunt select, native result count and Locate/Reset actions.

At constrained window width, the target group stacks below Filters. The
breakpoint must be based on the controls' fit, not a generic viewport breakpoint.

### Workspace

- Closed dossier: map owns the full workspace width.
- Open dossier: map + dossier use a stable two-column grid.
- Dossier target width: `clamp(250px, 34%, 330px)` unless implementation
  evidence requires a small adjustment.
- Opening/closing the dossier must preserve perceived zoom and focal center.
- No global game-window resize is required for the pilot.

## Visual treatment

Hunts is the first full consumer of the Better UI pixel-art system:

- `bg-1` main shell;
- `bg-2` grouped controls/dossier sections;
- 2px borders and hard shadows;
- square corners by default;
- gold accent for selection/primary action;
- cyan independent keyboard focus;
- 13px body/control text, 11–12px metadata;
- domain element colors remain semantic and are not recolored to brand gold.

The map itself is not recolored or filtered as decorative theming. Better UI
styles the map frame, selection feedback and surrounding controls.

## Dossier hierarchy

The dossier should scan top-to-bottom as:

1. Hunt name + level metadata;
2. element badges;
3. defensive relation rows: Weaknesses / Resistances / Immunities;
4. Drops list with name and NPC sell value;
5. presentation selector;
6. full-width primary `Entrar na Hunt` action.

Use separators and spacing rather than wrapping every relation row in another
card. Empty relation groups remain explicit (`Nenhuma`/localized equivalent).

## Interaction requirements

- Marker pointer click: select only; never start Hunt.
- Keyboard activation: select and move focus into the dossier sequence.
- Hover/focus: no required floating info tooltip.
- Locate: select + pan; preserve zoom; never start Hunt.
- Reset: clear selection/location/dossier without clearing filters or moving map.
- Escape/close: close dossier and return focus when possible.
- Explicit Hunt: only Better UI path that assigns native `_selectedIndex` and
  invokes native `startHunt()`.
- Selected and located states remain separate.

## Accessibility

- Every icon-only close/utility action has an accessible name.
- Native/Better UI controls retain visible focus independent from selected state.
- Status/error feedback uses text, not color alone.
- Dossier remains labelled by the selected Hunt title.
- Long localized names truncate visually only when the full text remains
  recoverable by title/accessible name.
- Reduced-motion disables the Locate flash.

## Integration constraints

Preserve the existing functional implementation unless redesign requires a
strictly presentational wrapper/class change:

- stable zone identity across native refresh/reorder;
- capture-phase marker interaction protection;
- no `startHunt()` monkey patch;
- no synthetic marker click for gameplay;
- original presentation node is moved, never cloned;
- original toolbar/element/count nodes may be moved but retain handlers;
- no feature-specific MutationObserver;
- no gameplay/network automation;
- exact/reliable cleanup remains covered by automated tests.

## Delivery gate

Before handoff:

- shared design-system runtime contracts pass;
- Hunts automated interaction/lifecycle tests pass;
- static UI/UX review confirms this override and MASTER are followed;
- full test suite/build/diff-check pass;
- metadata version is bumped for the first actual pixel-art runtime build.

Then stop for user-owned in-game validation. This page moves to `user validated`
only after explicit user green light.
