# PM Gate — Analyzer bridge / residual hiccups — 2026-10-09

## Status

**PRODUCT OWNER APPROVED — RELEASE AUTHORIZED**

The exact local candidate pair was validated in-game by the Product Owner on 2026-10-09.
The Product Owner explicitly authorized commit, push, merge and release for Better UI
`0.2.194` and Hunt Analyzer `1.15.6`.

## Scope

Residual hiccups were still reported by some Zen users after Better UI `0.2.193`.
The follow-up audit found a recurring cross-script cost rather than another confirmed
Better UI visual hot path:

- Better UI Game mode polled the Analyzer public provider every second to preserve the
  current Hunt/Expedition Loot Story aggregate.
- `0.2.193` already limited Better UI-side sanitization to Loot/session fields, but the
  Analyzer public `getSummary()` call still marked the complete Current reader as active.
- That reader activity kept Analyzer `loadCurrent()` eligible for the 1-second refresh
  loop even when the full Current UI was not needed.
- Analyzer Closed HUD rendering also rescanned current-Hunt encounters for Ball/IV data
  and rebuilt its four widget slots on authoritative refreshes.

## Candidate pair

### Better UI `0.2.194`

- Game-mode Loot polling prefers Analyzer protocol-1 `getLootSession()` when present.
- A provider that advertises the dedicated reader but returns invalid/stale data, throws,
  or exposes a non-callable value fails closed; it never silently invokes the heavier
  full reader.
- `getSummary()` remains a compatibility fallback only for legacy Analyzer versions that
  do not expose `getLootSession` at all.
- Cards mode keeps the complete `getSummary()` contract and the `0.2.193` Story signature
  and Loot session aggregate behavior unchanged.

### Hunt Analyzer `1.15.6`

- Adds protocol-1 `getLootSession()` as an additive read-only API. It copies only source
  freshness/session identity/activity and bounded Loot rows and does not activate the
  full-summary reader grace window.
- The 1-second authoritative Current load runs only while standalone Current is actually
  visible or a recent full `getSummary()` consumer requires it. Embed/loot-only use no
  longer forces that load by itself.
- Hidden/History Current DOM rendering is deferred and hydrated when Current is revealed.
- Closed HUD keeps Time and per-hour metrics live through a presentation-only tick, using
  the authoritative metric measurement timestamp as its clock anchor.
- Ball/IV encounter-derived data is cached by authoritative Current revision; stable clock
  ticks do not rescan the Hunt.
- Unchanged HUD slot presentations retain their DOM instead of rebuilding all four slots.
- Protocol events and explicit Current refreshes remain authoritative and unchanged.

## Compatibility contract

- Public Analyzer protocol remains `1`.
- Existing `getSummary()` semantics and its full-reader activation remain intact.
- Better UI remains compatible with older Analyzer versions through absent-property
  fallback to `getSummary()`.
- Better UI Loot Story persistence, 32-row upstream limitation and session identity rules
  from `0.2.193` are unchanged.
- No new gameplay/API/network path is introduced by Better UI.

## Verification

### Better UI `0.2.194`

- focused Card Mode: `67/67 PASS`
- full suite: `721/721 PASS`
- dependency audit: `0 vulnerabilities`
- build: PASS
- `release:check -- v0.2.194`: PASS
- `git diff --check`: PASS
- independent TECH review: READY, `P0/P1/P2/P3 = 0/0/0/0`

Local candidate artifact:

- `dist/pokepixel-better-ui.user.js`
- size: `1565258` bytes
- SHA-256: `EAD8470EBE8CC045FAA75657D22E6B4426FF8D7FAA190969F3274CD6D62FEA63`

### Hunt Analyzer `1.15.6`

- combined focused performance/bridge set: PASS
- exact-current focused after clock-anchor hardening: `36/36 PASS`
- full suite: `567/567 PASS`
- dependency audit: `0 vulnerabilities`
- production userscript build: PASS
- userscript release/update invariant verification: PASS
- `git diff --check`: PASS
- independent exact-current TECH review: READY, `P0/P1/P2/P3 = 0/0/0/0`

Local candidate artifact:

- `dist/pokepixel-hunt-analyzer.user.js`
- size: `1647206` bytes
- SHA-256: `88F3123BDDE498C61D09E42A7DFD08C5EAB9B45A3B13E5A5B40192E8D3934F57`

## Cross-contract proof

A direct local integration check instantiated the Analyzer protocol-1 bridge and consumed
it through Better UI's real readers:

- `readAnalyzerLootSession()` returned the expected session/Loot data with `0` full-reader
  activations.
- `readAnalyzerSummary()` then activated the full reader exactly once and returned the
  complete summary.

## Synthetic performance evidence

The direct public bridge clone itself was not the primary cost: in a Node fixture the full
bridge call remained sub-millisecond. The important change is removing its side effect of
keeping the complete Current refresh loop alive for a Loot-only consumer.

For the confirmed Closed HUD O(N) step with 5,000 synthetic encounters:

- full encounter-derived scan: ~`0.129 ms` median / `0.222 ms` p95
- cached derivation on stable tick: ~`0.0013 ms` median / `0.0018 ms` p95

These are local synthetic measurements, not live browser frame-time measurements.

## Product Owner decision

**VALIDATED AND APPROVED IN-GAME — commit, push, merge and release authorized on
2026-10-09.**
