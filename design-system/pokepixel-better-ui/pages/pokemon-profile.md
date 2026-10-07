# PokémonCard progress summary

Status: `0.2.181` makes the rarity bar relative to native band minimum and maximum.
The Product Owner confirmed the rarity bar is correct in-game on 2026-10-07;
the missing-bar report used an outdated userscript. MASTER remains authoritative
for shared tokens.

## Local composition

The HP/Experience box and Rarity/Awakening box share a row with an 8px gutter. The
native meters receive slightly more width; both boxes stretch to the same height.
Native label/value text must wrap inside its allocated track instead of forcing a
minimum width or hiding a numeric suffix. No text is reduced to fit the column.

The summary has two label/value rows separated by one neutral 1px line. Rarity
uses the host `--quality-*` color through a Better UI-owned variable. Current
values use tabular numerals; denominators are quieter. Passive values do not gain
button chrome or new keyboard stops. Surface, font and corner tokens follow MASTER.

Below the rarity label/value, reuse `.pokemon-card__meter` and
`.pokemon-card__track > i` with the same 6px track and 4px top spacing as HP/XP.
The fill inherits `--ppbui-summary-quality`. Fill represents
`(current Quality - band minimum) / (band maximum - band minimum)` for the native
Normal or Shiny range, clamped to 0–100%. This supersedes the 0.2.180 current/max
scale. A missing, equal or reversed range omits the bar. ARIA uses the same native
minimum/maximum and bounded current value; no AWK count is inferred. The exact
label/current/maximum remain visible and available to assistive technology.

## State meaning

Only native AWK steps show a counter. `Challenge`, `God Tier Challenge`, `God Tier`
and `MAX` are explicit native stages, not missing counters. Loading and unavailable
states are distinct and announced by the existing polite status region.

Current screenshot/metrics in `work/profile-rarity-181/` cover the relative scale;
`work/profile-rarity-180/` preserves the earlier fill reference. Both are local
component evidence and do not establish user-owned in-game acceptance.
