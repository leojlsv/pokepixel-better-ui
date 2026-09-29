# Auto Helper — Operations Console Design Override

Status: **exact `0.2.17` live-rejected for bounded visual density/composition; exact `0.2.18` TECH/UX/VISUAL READY and Product Owner live-validated**
Direction: **compact automation operations console**
Recorded: **2026-09-17**

This page specializes `../MASTER.md` for Auto Helper without changing its validated
gameplay/settings contract. MASTER remains authoritative; this candidate page exists
to make the module migration concrete and reviewable.

## Design intent

Auto Helper is a dense configuration console, not a collection of independent cards.
The main hierarchy is: persistent save/resource state → three task groups → controls.
Large surfaces stay charcoal. Stone/weathered edges provide structure, blue/cyan owns
interaction/focus, green is active/success, red is error/danger, and rarity colors
remain domain semantics in the destination matrix.

## Non-visual constraints

- Preserve the historically Product Owner-validated grouped Support / Capture /
  Pokémon destination workflow.
- Preserve the existing native controls and their authoritative checked/disabled
  state where the module currently moves them.
- Preserve the exact `updateHuntSettings` payload contract and serialized/coalesced
  save lifecycle.
- Preserve the 450 ms species-filter debounce, close flush and explicit Retry path.
- Preserve stock refresh through `inventory.updated` and explicit resource refresh;
  idle reconciliation must not make requests.
- Preserve pending drafts, group disclosure state, scroll, focus and text selection
  across native panel reconstruction.
- Preserve Keep / Sell / Extract exclusivity and the rule that destination selection
  does not enable a paused/locked master function.
- Preserve unsupported-server behavior: Genetic Extraction remains absent when the
  native runtime does not expose it.
- Preserve exact reversible cleanup and the native editor reload on disable.

## Component inventory / migration

| Family | Classification | Direction |
| --- | --- | --- |
| Window/body ownership | REFINE | Opt the enhanced Auto Helper surface into PPBUI window/root/scroll ownership without changing native close/resize behavior |
| Save/resource rail | REDESIGN presentation | One attached persistent status rail; Saved/Loading/Pending/Error are text + semantic edge/state, with Retry/Refresh using shared buttons |
| Group disclosures | REFINE | Square attached disclosure headers for Support, Capture and Pokémon destination; native `<details>/<summary>` semantics remain |
| Group bodies | REFINE | One coherent framed body per task group; avoid extra decorative nested cards |
| Support rows | REFINE | Stable Function / Consumable / Condition columns with two aligned rows and square selects |
| Capture Normal/Shiny | REFINE | Two equal peer cells remain side-by-side through normal/live-width desktop layouts; stack only below the true narrow threshold. Shiny gets a stronger typographic identity while its locked state remains explicit without opacity-washing the whole group |
| Species filter | REFINE | Wide labeled square field beneath capture peers; no native rounded field chrome |
| Item picker | REFINE | Preserve compact select + item icon composition; canonical game item sprite remains domain artwork |
| Destination masters/license | REFINE | One utility rail above the matrix; native checkbox semantics preserved |
| Destination matrix | MATCH behavior / REDESIGN chrome | Full readable quality × Keep/Sell/Extract matrix with outer/header structure, subtle row banding instead of a full cell grid, canonical rarity labels and native radios |
| Help disclosure | REFINE | Quiet progressive disclosure; no competing card frame |
| Loading/error/empty feedback | REFINE | Stable local status feedback without exposing the native picker/grid flash |
| Scrollbars | REFINE | Shared 10px square Miyazaki scrollbar within owned Auto Helper subtree |
| Bespoke raster | ASSET NEEDED: NO | Existing item/domain artwork is sufficient |

## Art direction and hierarchy

1. Save/resource state stays visually persistent but subordinate to configuration.
2. Group summaries provide the major scan anchors.
3. Inside a group, controls align as rows/rails rather than floating mini-cards.
4. The destination matrix is the dominant data structure in its group.
5. Status/locked/paused information is explicit text/state, never opacity alone.

Use square 0px corners, 2px major hard edges and 1px internal separators. Do not use
the host olive fills, rounded 4–6px cards, Arial typography, gradients or blurred
shadows. Avoid broad stone/taupe fills; stone is structural/transient only.

## Component + state treatment

- **Buttons:** shared PPBUI secondary by default; Retry may use action emphasis while
  an error is present. Refresh remains utility/secondary.
- **Inputs/selects:** 28px square dark wells with weathered hard edge and independent
  cyan `:focus-visible`. Host radius/background/height must not leak through.
- **Checkbox/radio:** retain native form semantics and checked/disabled state. Accent
  may use project semantic tokens, but labels remain necessary.
- **Group summary:** charcoal header, hard lower edge, readable enabled count. Hover is
  a transient stone response; keyboard focus is cyan and independent.
- **Locked/disabled:** keep readable charcoal presentation, muted text + explicit
  unavailable/paused copy. Do not dim the complete section with blanket opacity.
- **Save states:** Saved = success text/edge; Pending/Saving = informative/warning copy;
  Error = danger text/edge + Retry. No status depends on color alone.
- **Capture/Shiny emphasis:** Normal and Shiny stay side-by-side until the container is
  truly narrow. Shiny may use stronger uppercase/small-caps cyan typography, but not a
  filled action surface or selection treatment.
- **Destination selection:** one native radio selected per row. Rarity label keeps the
  verified `--quality-*` domain color while the surrounding matrix remains neutral.
  Avoid a spreadsheet-like full grid: body cells have no internal borders, while the
  outer frame/header boundary and subtle row bands retain scanability.

## Responsive / accessibility constraints

- Preserve the module's desktop-first two-column composition where space allows.
- Support and general task columns may collapse at the existing 760px container
  threshold. Capture remains two columns until **560px**, then stacks; primary workflows
  must not require horizontal scrolling.
- Support column headings may collapse at narrow width, but each condition/resource
  remains spatially associated with its function row.
- Preserve native tab order; no new positive `tabindex`.
- Save/resource messages keep polite live-region behavior.
- Group summaries remain keyboard-operable native disclosures.
- Focus restoration and species-input caret/selection restoration remain intact.
- Longer localized labels wrap/expand; do not shrink primary labels below MASTER.

## Design acceptance checks

1. Enhanced Auto Helper shell/body uses charcoal Miyazaki surfaces with square hard edges and project monospace typography.
2. No rounded olive native card/field/button chrome leaks into the enhanced surface.
3. Save/resource rail remains stable during Loading, Saved, Pending/Saving and Error states; Retry/Refresh do not shift the primary layout materially.
4. Support remains two function rows aligned to Consumable and Condition columns at representative desktop width.
5. Normal and Shiny capture remain side-by-side at representative/live-width desktop geometry and stack only below the true narrow threshold; locked Shiny is explicit and its stronger typography remains distinct without reading as a button/focus state.
6. Species filter is a full-width labeled square field below the capture peers and retains native value/focus semantics.
7. Item selectors remain compact, preserve item artwork/names/quantities and expose disabled/missing-stock states clearly.
8. Destination master controls/license information form a stable utility rail above the matrix.
9. Destination matrix shows each quality exactly once with one selected Keep/Sell/Extract radio and canonical rarity color only on the rarity label/cue, without a full internal cell grid that creates unnecessary visual fatigue.
10. Disabled/paused destination states remain distinguishable by semantics/copy, not color or opacity alone.
11. Open/closed group disclosures, keyboard focus, loading/error and narrow layouts render without clipping or horizontal overflow.
12. Shared square 10px scrollbar is applied only inside the owned Auto Helper subtree.
13. No new raster asset, remote font, decorative gradient or blurred shadow is introduced.
14. Cleanup returns native DOM/classes/state without leaving PPBUI ownership behind.
