# Professions — manual swap + Top 3

Date: 2026-10-13

## Scope

Add two bounded Better UI enhancements to the native Mine/Farm workforce manager:

- mark the three highest-efficiency candidates in the native empty-slot select;
- add an explicit manual worker swap flow to occupied slots.

The native workforce payload and native `PokeIdle.Api` methods remain authoritative.
Fishing is outside this scope.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Required evidence |
| --- | --- | --- |
| AC-PROF-01 | Mine/Farm workforce surfaces receive one enhancement mount per native `.profession-workforce` root and cleanup removes Better UI-owned controls/labels. | Lifecycle DOM test + source review |
| AC-PROF-02 | Empty-slot selects mark only the three highest parsed efficiencies as `#1`, `#2`, `#3`, preserving native option order, values and current selection without issuing an API request. | DOM regression |
| AC-PROF-03 | Each occupied unlocked worker card receives exactly one `Trocar Pokémon` action; empty/locked cards do not receive it. | DOM regression |
| AC-PROF-04 | Opening swap reads the current profession workforce and offers currently available candidates without mutating gameplay. | API spy + DOM regression |
| AC-PROF-05 | After explicit confirmation and immediately before writes, swap re-reads workforce and requires the same worker in the same slot, the chosen candidate still available, and the slot within current `max_slots`. | Stale-state regression |
| AC-PROF-06 | A valid swap executes sequentially: collect stored production when present, remove current worker, assign chosen candidate to the same slot. No step runs before confirmation. | Ordered API spy |
| AC-PROF-07 | If assignment errors after removal, there is no automatic retry/rollback; the outcome is reported conservatively as unconfirmed and the native profession surface is refreshed before another attempt. | Failure-path regression |
| AC-PROF-08 | Successful/partial writes request native workforce refresh and emit the same inventory/creature invalidation events used by the native workforce manager. | Integration regression |
| AC-PROF-09 | Better UI controls use native button/select semantics, visible project focus primitives and a bounded inline chooser that remains reachable on narrow layouts. | UX/A11y source review + user live validation |
| AC-PROF-10 | Actual game layout, clipping, focus painting and interaction remain Product Owner validation. | User in-game validation |
| AC-PROF-11 | Miner/Farmer worker cards keep Collect, Swap and Remove in one stable action band; opening swap does not move those repeated actions to a different hierarchy. | Screenshot comparison + DOM/CSS regression |
| AC-PROF-12 | Swap disclosure names the slot and presents Current, New and Difference as distinct facts before confirmation. | DOM regression + user live validation |
| AC-PROF-13 | Empty slots align their assignment controls toward the top and expose a compact Top 3 efficiency hint without changing native order or selection. | DOM/CSS regression + user live validation |
| AC-PROF-14 | Better UI copy follows the language visibly used by the native Professions surface; the current Portuguese native renderer must not be mixed with English Better UI controls. | Locale regression + screenshot comparison |

## Native contract used

Current extracted client evidence exposes `getMiningWorkforce`,
`assignMiningWorker(creatureId, slotIndex)`, `removeMiningWorker(slotIndex)`,
`collectMiningRewards(slotIndex)` and the equivalent Farm methods. The current
worker renderer identifies occupied cards through `.profession-worker[data-slot-index]`,
places native actions in `.profession-worker__actions`, and renders empty-slot
candidate options with an `Eficiência X%` suffix.

## Gate

Implementation and automated checks may establish TECH/UX source readiness.
Visible correctness remains `VISUAL EVIDENCE INSUFFICIENT` until the Product Owner
validates the exact candidate in game.

### Exact-current independent re-gate — 2026-10-14

- `TECH READY` — independent read-only Technical QA found no remaining material
  P0/P1/P2. The final DOM-order correction preserves the native Collect/Remove
  nodes and listeners, moves/creates only the Better UI Swap action immediately
  before Remove, remains mutation-free after a settled sync, and does not alter
  the fresh-read/confirmation/collect → remove → assign transaction fences.
- `UX READY` — independent read-only UX/A11y QA found no remaining material
  P0/P1/P2. The prior keyboard-order P2 is closed: real DOM order, visual order
  and Tab order are all Collect → Swap → Remove, with no CSS-only `order`
  reordering. Locale coherence, worker+slot accessible naming, Escape/focus return,
  Top 3 hinting, Current/New/Difference hierarchy and responsive source contracts
  were also re-reviewed.
- `VISUAL EVIDENCE INSUFFICIENT` — the local synthetic render had no obvious
  clipping, but it is not the live PokePixel surface. Product Owner in-game
  validation is still required before merge/release.

Exact candidate evidence supplied to the reviewers: Professions focused tests
`15/15 PASS`, full suite `782/782 PASS`, build `PASS`, and `git diff --check`
`PASS`. Reviewers did not rerun tests/build/browser/live. Current critical SHA256:

- `config.js`: `06179E07BFA5B05E24462FAE2A2001911128583760B29DE5A06980DB123F8E55`
- `controller.js`: `8DB4DF45CE43D366BAD70BB76034C8B4D3B06742B352454FEE72628E42AC0B3B`
- `styles.js`: `FABE662A5AF664047E450ACDFC49BCAE4184BB6255439AB5A34ED8AC4B070F2E`
- `test/professions-hud.test.js`: `EC36E417C00AA99467111938BF46D7B62FE7DE4E745430195FD84844A216AB53`

## UI/UX corrective from Product Owner screenshot

The 2026-10-14 live screenshot showed a valid functional swap flow but exposed
four presentation defects: English swap copy inside a Portuguese native surface,
Collect/Remove plus a separate full-width Swap row, a weakly separated swap
disclosure, and vertically centered empty slots leaving excessive dead space.
The Professions page override records the corrective hierarchy shared by Miner
and Farmer. The packaged UI/UX skill references `quick-reference.md` and
`pro-rules.md`, but those supporting files are not present in the installed
`/skills/ui_ux_pro` package; review therefore uses the verified SKILL.md guidance,
project MASTER and the Product Owner screenshot.
