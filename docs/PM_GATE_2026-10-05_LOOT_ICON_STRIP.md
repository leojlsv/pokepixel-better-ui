# PM Acceptance & Evidence Record — Loot icon strip

## Task

- Request: show dropped-item icons side by side at the top of Loot Story, between
  the item-rarity filter and the history list. Border color follows the canonical
  item rarity. Ordering is always rarity rank
  `Weak < Common < Uncommon < Rare < Epic < Legendary < Mythical`; quantity
  never affects position.
- Branch / worktree: `fix/inventory-poke-filters-wallet` / current clean worktree.
- Baseline artifact / version: Better UI `0.2.174`; current implementation
  candidate `0.2.176`.
- Previously Product Owner validated scope: Card Mode / Loot Story data authority,
  item-rarity filter and native item metadata enrichment remain unchanged.
- Explicitly out of scope: Analyzer persistence/public protocol, loot valuation,
  gameplay/network behavior, live-game validation and release/merge.
- Write owners: PM for this record and the approved module contract; Feature /
  Module Engineer for `src/modules/card-mode/**` and focused tests.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Loot Story shows a compact horizontal strip of dropped-item tiles between the item-rarity filter and the history list. | Existing filter, table/history rows and Story tab behavior. | DOM order test + representative local render. | Feature Engineer | Visual Regression QA | `author verified; independent review unavailable` |
| AC-02 | Each unique dropped item appears once in the strip with its native icon and aggregated quantity; name, quantity and rarity remain available accessibly. | Analyzer stays authoritative for `itemId + qty`; Better UI only enriches presentation from native inventory metadata. | Source review + DOM test including repeated drops and icon metadata. | Feature Engineer | Technical QA + UX/A11y QA | `author verified; independent review unavailable` |
| AC-03 | Tile order is canonical rarity ascending: Weak, Common, Uncommon, Rare, Epic, Legendary, Mythical. Quantity never participates in ordering. Same-rarity ties are deterministic by item ID; unclassified items follow the seven canonical ranks. | Existing canonical rarity normalization and `Sem raridade` behavior. | Regression with deliberately conflicting quantities + source review. | Feature Engineer | Technical QA | `author verified; independent review unavailable` |
| AC-04 | Each tile border uses the canonical rarity color; unclassified items use neutral Better UI border chrome. | Existing `--quality-*` tokens and semantic rarity meaning. | Rendered screenshot + scoped CSS/source check. | Feature Engineer | Visual Regression QA | `author verified; independent review unavailable` |
| AC-05 | The current item-rarity filter scopes both the icon strip and the item chips in history rows; financial totals retain their existing semantics. | Filter values, row inclusion and financial calculations. | Filter regression + source review. | Feature Engineer | Technical QA + UX/A11y QA | `author verified; independent review unavailable` |
| AC-06 | The strip stays one row, owns horizontal overflow locally when needed, and does not create page-level horizontal overflow at narrow widths. | Existing bounded Story layout and table scroll ownership. | Representative wide/narrow local renders. | Feature Engineer | Visual Regression QA | `author verified; independent review unavailable` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| R-01 | Sorting accidentally reuses aggregate quantity or native inventory order. | Conflicting-quantity regression verifies canonical rank order. | `covered` |
| R-02 | Item metadata may omit `icon_index`. | Regression verifies a neutral fallback tile while preserving name/qty/rarity semantics. | `covered` |
| R-03 | Many distinct drops could increase Story height or page width. | Narrow render must show local horizontal scrolling without wrapping/page overflow. | `covered by 235 px synthetic evidence` |
| R-04 | Async inventory hydration could reorder tiles unpredictably. | Rank uses canonical rarity and item ID only; regression checks post-hydration order. | `covered` |

## Gate results

- Author verification: **PASS**. Full Node suite: **1330/1330**, 0 failures.
  `npm run build`, the product JavaScript suite and `git diff --check` pass.
- Focused Loot Story regression proves aggregation, native `icon_index` mapping,
  fallback behavior, filter synchronization and rarity-first ordering with
  deliberately conflicting quantities.
- Product Owner validation of `0.2.175` exposed a constrained-height regression:
  the flex Story panel could shrink the loot strip until the following table
  visually covered most of each tile. Candidate `0.2.176` fixes this by making
  the strip non-shrinkable in the flex column. A browser-level regression now
  forces a 126 px Loot Story panel and verifies the first tile remains 46 px tall
  and the table begins below the strip.
- The synthetic fixture intentionally has no live game `IconSet.png`; it renders
  the explicit `?` fallback. The native `icon_index → IconSet.png` path and
  background-position arithmetic are covered by the DOM regression. Product
  Owner validation of the real in-game sprites/layout passed on 2026-10-05.
- `TECH READY / TECH NOT READY`: **not issued** — independent reviewer failed
  to start because its delegated chat timed out.
- `UX READY / UX NOT READY`: **not issued** — independent reviewer failed to
  start because its delegated chat timed out.
- `VISUAL READY / VISUAL NOT READY`: **not issued**. Representative local
  evidence exists, but the independent Visual Regression gate was unavailable.
- Product Owner in-game validation: **APPROVED on 2026-10-05** for candidate
  `0.2.176`, including the corrected non-overlapping loot strip.
- Exact candidate reviewed: Better UI `0.2.176`,
  `dist/pokepixel-better-ui.user.js` SHA-256
  `F6EF67CC1E61EE0AEA8B63964ED2BC54CF4E431000D84B807289C3840579CFB2`.

## PM evidence audit

The implementation satisfies AC-01 through AC-06 in author-produced automated
and rendered evidence, and the Product Owner approved the exact candidate
in-game on 2026-10-05. The remaining gap is process evidence: both delegated
independent reviewers failed to start and cannot provide the role-separated
verdicts required by project governance.

## PM decision

`BLOCKED — independent project gates unavailable`

Rationale: candidate `0.2.176` is implemented and author-verified, including
representative wide/narrow rendered evidence. Formal handoff readiness cannot be
claimed without the independent Technical/UX/Visual verdicts required by the
project role matrix. Product Owner in-game validation is complete and approved.

## Product Owner validation result

- **APPROVED — 2026-10-05.**
- Real Loot Story rendering and corrected strip/table separation accepted in-game.
- No Product Owner validation remains pending for candidate `0.2.176`.
