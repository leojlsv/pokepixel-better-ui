# Trade — Dense Exchange Workstation Override

Status: **candidate `0.2.158` TECH READY / UX READY / VISUAL READY; pending Product Owner live validation; `0.2.157` rejected in-game**
Direction: **compact offers + high-density inventory**
Recorded: **2026-10-04**

This page specializes `../MASTER.md` for Trade. It preserves the native trade rules,
offer nodes, inventory nodes, handlers and authoritative state. The Product Owner's
2026-10-04 live screenshot is the current defect reference: empty offer slots stretch
into oversized cards while the inventory remains artificially limited to four columns.

## Information hierarchy

Trade is a three-part exchange workstation:

1. received offer — compact review surface;
2. own offer — compact editable offer plus confirmation controls;
3. inventory — the primary browsing surface and therefore the largest flexible desktop region.

The two offer surfaces contain a fixed twenty-slot capacity and must not grow their slot
geometry merely because more space is available. Inventory density should grow with
available width because browsing hundreds of items/Pokémon is the dominant repetitive task.

## Geometry contract

- The Trade window uses a preferred desktop width of `1280px` and shrinks to the
  actual containing pane with a 12px margin on each side. It must not auto-stretch to
  the full viewport merely because more horizontal space exists.
- At Trade container widths above `959px`, retain the three semantic columns and give
  inventory the largest flexible share. Use `minmax(318px,1fr) minmax(318px,1fr)
  minmax(280px,1.25fr)` or an equivalent no-overflow distribution.
- Offer panels align to the top of the shell rather than stretching to match the
  inventory column height.
- Offer grids are Better UI-owned integration geometry: five fixed `56px` columns,
  with twenty slots arranged as `5×4` at desktop width. Rows use `minmax(56px,auto)`:
  empty rows remain compact while a row containing a taller native item/Pokémon card
  grows to its intrinsic height. Host changes must not stretch empty slots or clip/
  overlap filled card content.
- Inventory uses fixed `56px` card tracks with `auto-fill`, aligned from the start.
  The list itself owns vertical scrolling; expanding inventory width must never create
  root-level horizontal scrolling.
- The player's balance belongs with the editable currency row when that row is
  discoverable. Reuse/move the native node; never clone it.

## Responsive contract

- `<=959px`: two equal offer columns remain side by side; inventory spans the row below;
  each offer uses four `56px` columns.
- `<=519px`: one semantic column; each offer uses five `56px` columns when they fit.
- `<=339px`: offer grids reduce to four `56px` columns.
- Search, item category, Pokémon filter disclosure and result counts remain reachable
  before the scrollable inventory list.
- No breakpoint may introduce horizontal page/root overflow.

## Interaction and states

- Keep native Trade add/remove, amount, confirm and cancel handlers unchanged.
- Keep native tab semantics and Better UI focus-visible treatment.
- Pokémon filters remain in the existing bounded modal; Escape/cancel restores focus
  to the trigger and filter rerenders preserve the focused field.
- Disabled/hover/pressed/selected styling continues to use the shared MASTER primitives.
- Cleanup removes only Better UI-owned styles/classes/scroll claims and restores scene
  wrappers deterministically.

## Render acceptance checks

1. At a desktop composition comparable to the Product Owner screenshot, twenty offer
   slots appear as four rows of five fixed-width cells. Empty rows remain compact and
   filled cards never overlap the following row.
2. Inventory visibly uses the width available to it and presents more than four columns
   when the panel can fit them.
3. Offer status/actions remain directly reachable beneath their compact content and do
   not get pushed to the bottom by inventory height.
4. Balance is visually associated with the editable currency control rather than an
   isolated empty band.
5. The established `959/519/339px` semantic responsive behavior remains coherent and
   no root horizontal scrollbar appears.
6. On a wide desktop the Trade window remains visibly bounded instead of expanding to
   the full viewport width.
7. Focus, disabled states, text wrapping and the inventory scrollbar remain legible.
