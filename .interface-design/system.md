# PokePixel Better UI — interface direction

Native enhancement only. Preserve game fonts, tokens, colors, rounding, window dimensions and responsive rules. Reuse native nodes and action listeners.

## Storage

Two independent columns: Backpack and Pokémon Center. Order: identity/capacity, search and filters, Pokémon grid, pagination, selected action.

- Capacity stays in the header; result count sits beside search. Filter changes must not change the meaning of capacity.
- Use native rarity colors and sprite assets; keep detail data in the native hover.
- Reserve a stable 48px footer per column: short instruction when idle; selected name and original transfer button when selected. Selection must not move slots.
- Keep bulk actions secondary in the header. Their native confirmation must state quantity, destination and that filters do not restrict the action.
- Differentiate empty inventory from no filter results. Offer a local Clear filters action for the latter.
- Remove the redundant management banner. Preserve keyboard focus and scroll on local updates; clear a column's selection when navigating its pages.
- Existing native surfaces and borders define depth. Use --ui-ink, --ui-muted and --ui-gold-dark; no new palette, fonts, shadows or gradients.
- Controls use native sizes; filter gaps 5–6px, content padding 8px 10px. Footer 48px with border-box sizing and a single native separator.

Approved by user for implementation. Visual validation in game remains separate from automated tests.
