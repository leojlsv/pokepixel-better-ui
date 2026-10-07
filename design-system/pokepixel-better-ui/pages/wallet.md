# Wallet locations

Feature refined by Product Owner feedback on 2026-10-07; candidate 0.2.186 validated
and approved in-game by the Product Owner at 2026-10-07T19:02:22Z.

Only two independent settings remain in the Better UI preferences surface:
**Backpack** and **Trainer Header**. Wallet itself is a collapsible disclosure matching
the other Better UI sections. Keep Backpack as the only default.

One small anchored panel displays a Wallet heading, Close and two balance rows.
Use current 1px borders, 8px window/5px well radii, neutral window/value surfaces,
11–12px readable labels/values and tabular numerals. Panel width is content-driven and
viewport-bounded. Amounts retain full values with local wrapping, never reduced font
size just to fit. Currency presentation delegates to the native formatter.

Trainer summary lives inside the trainer information column rather than spanning the
whole card. Its position is approved in-game. Present the balances as one compact
resource strip: two equal segments inside a single Values well, icon + value aligned in
each segment, one internal neutral divider, and no outer floating wallet/card. The strip
must read as an integrated footer/status control rather than two loose values. It may
coexist with Backpack. Focus remains visible.

Toggling a Wallet location preserves the preferences panel scroll position and focused
checkbox. Session-only and owner/storage failures remain visible without rebuilding rows.

Rendered evidence and independent verdicts are recorded in
`docs/PM_GATE_2026-10-07_WALLET_LOCATIONS.md`. Local fixture formatting is explicitly
synthetic and is not evidence of all native Currency denominations.
