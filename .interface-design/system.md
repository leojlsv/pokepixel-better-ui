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
