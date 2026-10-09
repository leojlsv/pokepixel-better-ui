# PM Acceptance & Evidence Record — Runtime performance regression

## Task

- Request: investigate and correct the reported FPS drop / frame freeze affecting the game while Better UI is active.
- Branch / worktree: `fix/runtime-performance` / `work/perf-runtime`.
- Baseline artifact / version: Better UI `0.2.189` (`a3553ff`).
- Candidate version: Better UI `0.2.190` (local pre-live candidate; not published).
- Previously Product Owner validated scope: PokémonCard hierarchy and hover/pinned information introduced in `0.2.188` and corrected in `0.2.189`.
- Explicitly out of scope: visual redesign, gameplay behavior changes, live-game inspection by agents.
- Write owners: Project Manager for this record; assigned implementation engineer for `src/core/**` and tests after Architecture Gate.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Internal native PokémonCard rerenders must not wake document-wide Better UI reconciliation. | PokémonCard decoration itself continues to render through the existing native wrapper. | Observer regression proving repeated internal card churn schedules zero global callbacks. | Feature / Core Engineer | Technical QA | `pass` |
| AC-02 | Adding or removing a PokémonCard root must remain lifecycle-visible. | SPA/card root discovery outside the card subtree remains global. | Observer regression for root attach/detach. | Feature / Core Engineer | Technical QA | `pass` |
| AC-03 | Existing `0.2.189` PokémonCard behavior remains intact. | Battle Stats → Genetics → Element Mastery → Current Moves; hover Rarity/Awakening; pinned actions; cleanup/re-render ownership. | Existing focused Pokémon Profile regressions plus exact diff review. | Feature / Core Engineer | Technical QA | `pass` |
| AC-04 | The candidate must remain technically clean. | Current Better UI behavior outside the observer boundary. | Focused tests, full tests, build and `git diff --check`. | Feature / Core Engineer | Technical QA | `pass` |
| AC-05 | The reported FPS drop/frame freeze is materially reduced in the live game. | No visible/functional regression. | Product Owner live comparison with the exact candidate. | Product Owner | Project Manager | `pass` |
| AC-06 | Stable Mark’s Shop reconciliation remains bounded with a 500-Pokémon native list. | Native rows/checkboxes, grouping, selection, all four tabs and cleanup. | Same-fixture before/after benchmark plus focused regression. | Feature / Module Engineer | Technical QA | `pass` |
| AC-07 | Card Mode polling remains bounded for the current 32-entry Analyzer contract and previous full-session special-history producers. | Full special history, middle corrections, relative time refresh and incremental row identity. | Public-contract benchmark at 32/5,000 entries plus sanitized-history regression. | Feature / Module Engineer | Technical QA | `pass` |
| AC-08 | Repeated stable reconciliation/polling does not accumulate DOM or retained heap. | Cleanup, timers, native Bus bindings and existing session behavior. | GC soak plus lifecycle source/test audit. | Feature / Module Engineer | Technical QA | `pass` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| R-01 | A Better UI module may consume mutations inside native PokémonCard and lose updates if the subtree is ignored. | Cross-repo source search plus Architecture Gate review of all `.pokemon-card*` consumers. | `pass` |
| R-02 | Root attach/detach could be filtered accidentally, preventing lifecycle discovery. | Dedicated body-level add/remove regression. | `pass` |
| R-03 | PokémonCard churn may be only one contributor and not the complete live regression. | Deterministic observer fan-out evidence locally; exact-candidate in-game validation for the remaining causal gap. | `pass` |
| R-04 | Mark’s Shop can scan hundreds of Pokémon during unrelated global reconciliation. | 25/100/250/500 scaling benchmark against `0.2.189` baseline and stale-checkbox negative regression. | `pass` |
| R-05 | Previous Analyzer protocol-1 producers can expose full-session special history, making the 1-second Cards poll scale with thousands of DOM rows. | Exact sanitized-source poll/append benchmark at 5,000 entries and row-identity regression. | `pass` |
| R-06 | Long sessions may accumulate timers/listeners/nodes even when individual syncs are fast. | Worker lifecycle audit plus GC soak with stable DOM/heap and first-half/second-half timing. | `pass` |

## Gate results

- Author verification: expanded focused performance regressions PASS; full suite **697/697 PASS**; build PASS; release contract `0.2.190` PASS; `git diff --check` PASS. Same-environment baseline/candidate probes: PokémonCard internal repaint callbacks `60 → 0`; Mark’s Shop 500 stable sync median `41.01 ms → ~6.9 ms`; Cards 32 poll `3.209 ms → ~1.5 ms`; Cards legacy 5,000 poll `221.337 ms → ~8.6 ms`, append-one `207.529 ms → ~15 ms`. GC soak kept node counts stable and retained heap materially flat.
- `TECH READY / TECH NOT READY`: `TECH READY` — two independent exact-current reviews found no P0/P1/P2 blocker. Reviewer-selected adversarial checks covered locale/filter invalidation, exact Story signature changes, stale/replaced native checkboxes, observer boundaries and lifecycle ownership. Residual P3 only: full-session legacy Story sanitization remains O(N), and Cards assumes its owned Story body is stable for the lifetime of one mount.
- `UX READY / UX NOT READY / not triggered`: not triggered; no interaction or information behavior change intended.
- `VISUAL READY / VISUAL NOT READY / VISUAL EVIDENCE INSUFFICIENT / not visible`: not visible; no rendered-output change intended.
- Exact artifact/version/hash reviewed: final expanded local candidate `0.2.190`; `dist/pokepixel-better-ui.user.js` SHA-256 `F86459516F34FC37C00DE8EE479BD663956919CFD822C1218EFE08A628DDDC3D`; both independent exact-current reviews returned `TECH READY`.
- Product Owner live evidence: on 2026-10-09 the exact `0.2.190` candidate was exercised in-game and no FPS drop/frame freeze or functional regression was observed; Product Owner explicitly considered the candidate approved.

## PM evidence audit

1. AC-01 through AC-08 are satisfied; AC-05 is supported by explicit Product Owner in-game approval of the exact candidate.
2. No rendered-appearance claim is being made; the runtime diff is not intended to change rendered output.
3. The original Architecture review plus two expanded independent Technical QA reviews cover AC-01–08; reviewers added adversarial checks rather than only replaying author tests.
4. The expanded runtime source reviewed by QA matches artifact SHA-256 `F86459516F34FC37C00DE8EE479BD663956919CFD822C1218EFE08A628DDDC3D`; only this PM evidence record changed after the artifact build/review.
5. The live performance gap is closed by Product Owner evidence; agents did not inspect or control the live game.
6. Candidate `0.2.190` is newer than the delivered `0.2.189` userscript.
7. Previously validated PokémonCard information hierarchy/content remains covered by focused regressions and was not reopened.

## PM decision

`PRODUCT OWNER APPROVED — exact candidate accepted for release flow`

Rationale: the expanded investigation found and corrected all locally reproduced material hotspots. Full automated verification, same-environment before/after benchmarks, GC soak and two independent exact-current Technical QA reviews are green. Product Owner then validated the exact candidate in-game, observed no further degradation, and explicitly approved it.

## Product Owner validation checklist

- Compare gameplay smoothness / frame freezes with the exact candidate in the same scenario that reproduces the issue on `0.2.189`.
- Confirm PokémonCard hover/pinned content and ordering still behave as previously approved.
- With Mark’s Shop Pokémon tab open on a large inventory, confirm scrolling/selection remains responsive and native Sell behavior is unchanged.
- In Cards mode, confirm Hunt Story continues to retain prior special encounters and updates normally.

Validation status: **PASS / APPROVED — 2026-10-09**.
