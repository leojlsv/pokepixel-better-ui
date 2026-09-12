# PokePixel Better UI — interface direction

Native enhancement only. Preserve game fonts, tokens, colors, rounding, window dimensions and responsive rules. Reuse native nodes and action listeners.

## Storage

Two independent columns: Backpack and Pokémon Center. Order: identity/capacity, search and filters, Pokémon grid, pagination, selected action.

- Capacity stays in the header; result count sits beside search. Filter changes must not change the meaning of capacity.
- Use native rarity colors and sprite assets; keep detail data in the native hover.
- Reserve a stable 48px footer per column: short instruction when idle; selected name and original transfer button when selected. Selection must not move slots.
- Keep bulk actions secondary in the header. Without filters, retain native All actions. With restrictive filters, use Deposit/Withdraw filtered and confirm the matching count across all pages.
- Differentiate empty inventory from no filter results. Offer a local Clear filters action for the latter.
- Remove the redundant management banner. Preserve keyboard focus and scroll on local updates; clear a column's selection when navigating its pages.
- Existing native surfaces and borders define depth. Use --ui-ink, --ui-muted and --ui-gold-dark; no new palette, fonts, shadows or gradients.
- Controls use native sizes; filter gaps 5–6px, content padding 8px 10px. Footer 48px with border-box sizing and a single native separator.

Approved for implementation and subsequently validated in game by the user through 8a4097a.


## Pokémon organization (fixed-tag revision; pending validation)

- One of ten fixed tags per individual Pokémon. Catalog, colors and ASCII symbols are defined in pokemon-tools/model.js; never recolor the rarity border.
- Alt + left click opens a bounded native-styled modal: two columns, ten named options, current tag highlighted, separate Remove action. Escape/Close cancels. No tag editing fields in the backpack.
- Capture Alt-click before native equip, transfer or Trade actions; normal clicks and hover remain native. Only own Pokémon can be tagged.
- A single More Filters disclosure contains the extra filters. Tag sits next to Gender; All/Untagged and the ten fixed choices. Storage keeps independent native rarity/element controls.
- Personal labels are character-scoped and remain local. A tag does not block selling or trading. Preserve unmatched legacy data rather than guessing a migration.
- Slot markers use a compact colored monospace symbol on the native dark background; the modal pairs every symbol with its name and wraps safely in constrained widths.

User-approved window minimums: Poké Center 980px, Backpack 560px. Poké Center More Filters always uses four equal columns. Selection must preserve the native rarity border token.

## Trade (approved; pending in-game validation)

Keep the native three-column layout. Pokémon filters open in a 560px dialog with four columns, native tokens, Clear and Close; inventory retains search, filter count and result count. Preserve filters on close and native offer actions. Offer gold rows reserve 72px; balance sits inside the own currency block so headings and grids align. Confirm/Cancel share 36px minimum height.

Trade refinement: minimum width 1000px, offer columns at least 318px, inventory at least 280px with four 56px slots per row. Item category uses native category/type grouping and combines with search. Added labels match the native Portuguese Trade screen. Cancel remains visible as a secondary action.

## Buff strip (approved; pending in-game validation)

- Treat the native buff strip as a Rearrange feature, not a redesign. Reuse `.pokeidle-buff-strip`, `.pokeidle-buff-list` and `.pokeidle-event-ticker` without cloning or recreating buff state.
- Keep the strip independent from the toolbar DOM lifecycle. Dock it geometrically against the top edge of `.pokeidle-top-toolbar`; do not reparent it into the toolbar.
- Use the native strip as a compact one-line status rail: effect name, multiplier/effect and timer stay on the same row. Reuse every native pill and its text; do not shorten or synthesize state in JavaScript.
- Preserve native typography and palette. Reduce only the standalone-panel chrome needed to merge it with the toolbar: compact padding/min-height, no separate drop shadow/backdrop blur, top-only rounding and subtle native-gold separators between entries.
- Prefer content width instead of the native fixed strip width and cap it to the toolbar/viewport. Existing overflow/ellipsis remains the fallback when many buffs are active.
- Recalculate docking on normal Better UI reconciliation and viewport resize. Do not poll and do not add a feature-specific MutationObserver.
- Cleanup removes only Better UI markers/styles/custom properties and must preserve the game's latest native inline `left`, `top` and `width` values.
