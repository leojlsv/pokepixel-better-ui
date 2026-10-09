# PM Acceptance & Evidence Record — Public Loot persistence / performance reconciliation

## Task

- Release-blocking divergence found while preparing the public mirror after Product Owner approval of Better UI `0.2.192`.
- The public release line retained the `0.2.178` Card Mode requirement that Loot Story item totals persist for the whole current Hunt/Expedition while Game mode is active, even after source rows leave the Analyzer's 32-row public window.
- The old public implementation achieved that by calling the complete Analyzer summary pipeline every second in Game mode, which reprocessed full Story histories and conflicts with the performance work approved in `0.2.190` / `0.2.192`.
- Candidate: Better UI `0.2.193`, local/unpublished.
- No public `0.2.192` tag/release was created. The local `release/public-0.2.192` candidate was rejected before push because its runtime differed from the approved private artifact.

## Acceptance contract

| ID | Requirement | Must preserve | Evidence | Status |
| --- | --- | --- | --- | --- |
| AC-LP-01 | Loot item icons/quantities accumulate for the current Hunt/Expedition beyond the rolling 32-row public window and while Game mode is active. | Existing Loot Story filter/order/native item enrichment. | Game-mode rolling-window regression. | `author pass` |
| AC-LP-02 | Game-mode polling must not execute full Attempts/Special History/Target sanitization or mutate hidden Cards DOM. | Full Card Mode summary remains authoritative when Cards is visible. | Poisoned-getter reader regression + hidden DOM mutation probe + benchmark. | `author pass` |
| AC-LP-03 | Repeated snapshots, duplicate timestamp/species rows, row reorder and quantity correction are idempotent. | Precisely-once aggregate for observed rows. | Adversarial duplicate/correction regression. | `author pass` |
| AC-LP-04 | Temporary unavailable, paused or waiting summaries do not erase a known aggregate. | Last trustworthy session total. | Lifecycle regression. | `author pass` |
| AC-LP-05 | Late `sessionGeneration` hydration for the same `startedAtMs` does not reset; a confirmed new generation/activity does. | Session boundary semantics. | Transition/reset regression. | `author pass` |
| AC-LP-06 | Full-session Hunt Story compatibility and its exact `__ppbuiStorySignature` optimization remain intact. | No cap to legacy `specialHistory`; incremental Story identity preserved. | Existing full-session Story tests + focused suite. | `author pass` |
| AC-LP-07 | Reconciliation memory for source rows remains bounded to the current public window. | Session aggregate totals persist separately. | Source invariant + soak/review. | `author pass` |

## Implementation boundary

- `readAnalyzerLootSession()` uses the same protocol, `available` and source-freshness checks as the full reader, but returns only status, session identity metadata and sanitized bounded `lootHistory`.
- In Game mode the 1-second timer calls `cards.ingest(readAnalyzerLootSession(...))`; `ingest` updates only in-memory loot aggregate state and never renders DOM.
- In Cards mode the timer still uses `readAnalyzerSummary()` and normal rendering, including the exact full-session Story signature.
- Session identity prefers a valid `sessionGeneration` but carries `startedAtMs` so a late transition from fallback timestamp to generation can be recognized as the same session. Ambiguous identity regressions fail closed instead of resetting.
- Source-row reconciliation stores only the current bounded window. Item totals are the persistent session state.

## Local evidence

- Focused Card Mode / render-idempotence suite: **70/70 PASS** after the combined implementation and adversarial duplicate/reorder correction.
- Synthetic 5,000-special benchmark, same process:
  - public-provider `getSummary()` fixture: ~`0.000 ms` median;
  - `readAnalyzerLootSession()`: ~`0.018 ms` median / `0.042 ms` p95;
  - hidden Game path `loot reader + cards.ingest()`: ~`0.048 ms` median / `0.087 ms` p95;
  - full `readAnalyzerSummary()`: ~`3.95 ms` median / `4.94 ms` p95.
- The benchmark isolates Better UI processing; a real Analyzer provider may spend additional time inside its own `getSummary()` implementation.
- Hidden-ingest soak with the source itself held to the same rolling 32-row window: **5,000 polls**, Cards DOM stable at **257 nodes**, post-GC heap delta **-0.15 MB** (`mid -0.15 MB`); no cumulative Better UI growth observed.
- Full repository suite: **717/717 PASS**.
- `npm audit --audit-level=high`: **0 vulnerabilities**.
- Build PASS; release contract PASS for `v0.2.193`; `git diff --check` PASS.
- Exact local artifact: `dist/pokepixel-better-ui.user.js`, SHA-256 `248B9C04681AC86087480A02219F38250D586CC2EFDD86CB1378B4AAECDC7220`.

## Explicit limitation

The Analyzer public contract exposes a bounded rolling window, not a cumulative loot ledger. If more than 32 previously unseen loot rows are produced between two 1-second observations, or the public source remains unavailable long enough for rows to age out before Better UI sees them, exact recovery is impossible from the available API. Candidate `0.2.193` preserves all rows it actually observes and does not claim to reconstruct data never exposed to it. Eliminating this limit would require a separate Analyzer public cumulative/event contract.

## Gate state

- Implementation: complete in local `0.2.193` candidate; no public push/tag/release performed.
- Focused author verification: **70/70 PASS**.
- Full verification: **717/717 PASS**, audit/build/release/diff PASS; exact hash recorded above.
- Independent Technical QA: **TECH READY** in two exact-current READ-ONLY reviews; `P0=0 P1=0 P2=0`. Reviewers independently verified that Game mode touches only the bounded loot reader/ingest path, Cards keeps the full exact Story signature fast path, session identity hydration/reset semantics are fail-closed, rolling row state remains bounded, evictions are not subtracted, and duplicate/reorder/correction handling is idempotent. One reviewer ran an independent fallback-startedAt → generation hydration + correction + eviction scenario and observed the exact expected cumulative quantity; another reran Card Mode integration **63/63 PASS**, `git diff --check` and exact SHA parity.
- Residual `P3` only: provider-side `getSummary()` may itself eagerly build data before Better UI receives it, so the measured sub-0.1 ms hidden Better UI path cannot eliminate cost owned by the Hunt Analyzer provider. The separate upstream 32-row recoverability limit remains explicitly documented above.
- Product Owner live validation: **PASS / APPROVED — 2026-10-09**. The Product Owner tested the exact `0.2.193` candidate and explicitly replied “validado e aprovado”.

## PM decision

`PRODUCT OWNER APPROVED — exact 0.2.193 accepted for release flow`

Automated verification, audit, benchmark/soak and independent Technical QA are green, and the Product Owner validated and approved the exact `0.2.193` artifact in game. The prior authorization for commit/push/merge/release remains active. This gate is closed for private-main promotion, public mirror parity verification, tag and GitHub Release publication.
