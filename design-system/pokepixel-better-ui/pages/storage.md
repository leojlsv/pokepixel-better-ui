# Storage / Pokémon Center — Dual Vault Design Override

Status: **Product Owner live-validated on exact `0.2.16`; no Storage validation pending for this candidate**
Direction: **Dual-vault transfer console**
Recorded: **2026-09-17**

This page specializes `../MASTER.md` for Storage without changing its gameplay or
transfer contract. The Product Owner's live screenshot from 2026-09-17 is the
current visual baseline. The two-column Backpack ↔ Warehouse workflow remains the
authoritative structure.

The Product Owner explicitly approved Storage functionality and structure on
2026-09-17 and rejected only the live Search/initial-filter chrome. Exact `0.2.16`
uses a Storage-scoped higher-specificity bridge so Search, Rarity, Element, Sort
and the same Better UI-owned field family inside More Filters retain the square
Miyazaki treatment under the native `.pokeidle-panel` `!important` rules. No
control node, option, listener, field order, tab order or transfer behavior is
changed. Independent Technical, UX/A11y and local Visual Regression gates are
ready. The Product Owner subsequently live-validated exact `0.2.16` on 2026-09-17
with **“Storage validado”**, closing the field-chrome gate.

## Design intent

Storage is a dense transfer workstation. The two vaults are equal peers; the
Pokémon grids are the visual focus; filters, counts, bulk actions and pagination
are supporting chrome. Use MASTER's charcoal-dominant Miyazaki 16 grammar and
remove legacy gold/brown/gradient chrome where it does not represent a gameplay
domain value or the selected state.

## Non-visual constraints

- Preserve two independent source/destination columns.
- Preserve per-side search, rarity, element, sort and More Filters state.
- Search remains accent-insensitive and includes off-page results before
  pagination.
- Preserve 42 occupied Pokémon per page and native capacity/deposit limits.
- Preserve the original slot nodes, click, double-click, tooltip and transfer
  listeners; do not clone/recreate gameplay actions.
- Preserve native normal/shiny sprites and failure fallback.
- Preserve selected native transfer-button movement into the 48px column footer.
- Preserve instance-only reversible scene adapters; do not patch the prototype,
  transfer API or network flow.
- Preserve filtered bulk confirmation/authoritative move verification and native
  unfiltered bulk behavior.
- Preserve empty-source vs no-results semantics, localization, focus restoration,
  scroll restoration and deterministic cleanup/remount.

## Component inventory / migration

| Family | Classification | Direction |
| --- | --- | --- |
| Window shell/title | REFINE | MASTER square charcoal shell; no legacy gradient/radius |
| Two vault layout | MATCH structure / REFINE chrome | Equal side-by-side columns with aligned baselines |
| Vault header | REFINE | Ivory title, muted subtitle, neutral tabular count, stable bulk action |
| Search + result count | MATCH layout / REFINE chrome | Full-width PPBUI search with reserved result-count track |
| Rarity / Element / Sort / Clear | MATCH behavior / REFINE chrome | One aligned shared-control rail |
| More Filters | MATCH interaction / REFINE hierarchy | Compact progressive disclosure; square labeled fields |
| Pokémon grid | MATCH 42/page / REDESIGN presentation | 7×6 at representative live width, square neutral cards |
| Pokémon sprite | MATCH | Existing 40px pixel sprite, never stretched/smoothed |
| Rarity/quality cue | REDESIGN | Canonical color retained as a compact structural edge rather than full repeated-card border noise |
| Level | REFINE | Compact dark data plaque; no sprite overlap |
| Lock/equipped/tag markers | MATCH semantics / REFINE collision handling | Stable reserved corners and square chrome |
| Slot hover/pressed/selected/focus/disabled | REDESIGN | MASTER state grammar; selected gold and independent cyan focus |
| Pager | REFINE | Centered, stable tabular label, shared 28×28 navigation buttons |
| Transfer footer | MATCH structure / REFINE hierarchy | Constant 48px height; idle hint or selected name + original action |
| Empty/no-results | REFINE | Distinct copy; Clear only for filtered no-results |
| Scrollbar | MATCH | Shared square 10px Miyazaki scrollbar |
| Hidden overview / legacy lower selection panel | REMOVE / keep removed | Do not restore redundant native management surfaces |
| Bespoke raster | ASSET NEEDED: NO | Existing Pokémon/domain art is sufficient |

## Art direction and hierarchy

1. Quiet window shell.
2. Aligned vault headers establish source/destination.
3. Search and filters form a secondary discovery rail.
4. Pokémon grids dominate the visual field.
5. Pager and transfer footer remain stable utility strips.

Large surfaces stay charcoal. Stone/weathered colors provide structure and neutral
interaction. Blue/cyan is interaction/focus. Gold is persistent selection only.
Quality/rarity remains a domain semantic color. Do not use brown/gold fills to
differentiate the Warehouse and do not add decorative gradients, blurred shadows,
soft cards or extra ornaments.

## Slot family

- Keep the live 7×6 matrix for 42 Pokémon/page at representative desktop width.
- Use equal square hard-edged cells in both vaults.
- Default card edge is neutral; canonical rarity remains visible as a compact
  bottom/side structural cue.
- Keep the native 40px sprite centered and pixelated.
- Level uses a compact dark plaque anchored away from reserved marker corners.
- Lock/equipped/tag markers must not overlap each other, the level plaque or the
  primary sprite silhouette.
- Do not enlarge sprites merely to fill available whitespace.

## States

- Default: neutral card on charcoal; no per-card shadow.
- Hover: neutral/weathered surface plus blue/cyan interaction cue without erasing
  the rarity cue.
- Pressed: hard inset/depth response; no scale/translate.
- Selected: unmistakable 2px gold structural cue plus surface change; rarity cue
  remains separately readable.
- Focus-visible: independent 2px cyan outline outside the current selected state.
- Disabled/non-transferable: native lock/team semantics retained, muted neutral
  chrome, no hover elevation.
- Fainted/shiny remain gameplay/domain states; do not recolor them to brand roles.
- Async bulk transfer: pending state blocks duplicate submission and keeps the
  existing system-feedback/native confirmation path.

## Responsive / accessibility constraints

- Keep the desktop two-vault workflow and approximately the existing 980px
  functional minimum. Do not stack the source/destination transfer flow for this
  pass.
- Use `minmax(0,1fr)` vaults. Controls may wrap within their own vault before text
  is shrunk; advanced fields may use additional rows.
- Preserve native tab order and slot button semantics.
- Search remains explicitly labelled; More Filters stays keyboard-operable.
- Focus is always visible and independent from selection/rarity.
- Longer localization must wrap/expand rather than shrink below MASTER.
- Shared scrollbars remain square 10px. No motion beyond state feedback.

## Render acceptance checks

1. Two equal side-by-side vaults remain the only transfer workspace.
2. Vault headers align; count/capacity and bulk action stay stable at the right.
3. Search rows and reserved result-count tracks align between columns.
4. Basic filter rails use square PPBUI fields/buttons with no host gradient/radius.
5. More Filters is compact when closed and exposes labeled square fields without clipping when open.
6. Representative live-width render shows 7×6 equal slots per normal full page.
7. Repeated default cards are neutral; rarity remains visible without turning the whole grid into competing full-color borders.
8. Pokémon sprites remain crisp, centered and unscaled beyond the existing 40px visual.
9. Level/lock/equipped/tag indicators do not collide.
10. Hover, pressed, selected and focus states are visibly distinct; cyan focus remains visible on gold selection.
11. Pager is centered with 28px square navigation buttons and a stable tabular label.
12. Idle and selected transfer footers stay exactly the same height and do not move the grid/pager.
13. Empty source and filtered no-results remain visibly distinct; only no-results offers Clear.
14. Storage uses the shared square Miyazaki scrollbar with no host rounded/gold chrome.
15. Click/double-click/native transfer-button placement remains functionally unchanged.
16. No new raster asset, remote font, decorative gradient or blurred shadow is introduced.
