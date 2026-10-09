# PM Acceptance & Evidence Record — Residual runtime hiccups

## Task

- Product Owner follow-up after Hunt Favorites approval: “Ainda noto alguns hiccups no jogo.”
- Candidate: Better UI `0.2.192`, local/unpublished, based on the Product Owner-approved `0.2.191` Favorites candidate and the previously approved `0.2.190` performance work.
- Goal: reduce remaining Better UI main-thread bursts without changing approved gameplay/UI behavior or attributing all host-game stutter to Better UI without evidence.
- Explicitly out of scope: live-game inspection by agents, gameplay automation changes, Hunt Favorites redesign, commit/push/merge/release.

## Confirmed local findings

1. **Backpack stable reconcile**
   - The native-node merge used repeated `baseline.includes()` while walking all children, producing quadratic membership work.
   - Even in the default `Original + Grid` state, stable reconciles still called the full slot parse/sort/render path although that mode requires no reordering or metadata calculation when the grid is unchanged.
   - Corrective: use a `Set` for stable membership and skip per-slot sort/render only when `Original + Grid`, scope is unchanged, native baseline is unchanged and the same layout was already rendered.
   - Full path is forced again on grid replacement, native insertion/removal, scope change, sort/view change or first render.

2. **Buff Strip observer fan-out**
   - Buff Strip is a shared native surface and was intentionally kept globally observable, but that also meant internal pill/ticker child churn could schedule a document-wide Better UI reconcile.
   - Corrective: internal Buff Strip mutations now use `observer:buff-strip`; only the Buff Strip module opts into that scope.
   - Root attach/detach remains global. Replacing native `.pokeidle-buff-list` or `.pokeidle-event-ticker` remains global because it changes the module mount contract.
   - Menu Bar geometry remains synchronized through the existing `ppbui:buff-strip-geometry-change` event emitted by Buff Strip `sync()`.

## Evidence so far

- Affected focused tests: Inventory + Foundation + Buff Strip **63/63 PASS**.
- New regressions prove stable `Original + Grid` does not reparse each inventory slot and Buff Strip pill churn reconciles only opted-in scoped modules.
- Same-environment 500-slot Backpack benchmark:
  - pre-follow-up exact `0.2.191`: `Original` median ~**10.49 ms**, p95 ~**14.02 ms**;
  - after membership optimization only: median ~**9.51 ms**, p95 ~**11.43 ms**;
  - final stable fast path: median ~**2.55 ms**, p95 ~**3.54 ms**.
- Exact `0.2.192` soak remains stable: Marks Shop 500 keeps `4985 → 4985` nodes with `-0.09 MB` retained-heap delta; Cards 32 keeps `1122 → 1122` nodes with `+0.38 MB`; Cards legacy 5,000 keeps `133602 → 133602` nodes with `-0.06 MB`. No cumulative DOM growth was observed.

## Gate state

- Implementation: complete in local candidate `0.2.192`; no commit/push/merge/release performed.
- Full repository verification: **714/714 PASS**; build PASS; release contract PASS; `git diff --check` PASS.
- Exact artifact: `dist/pokepixel-better-ui.user.js`, SHA-256 `00CB7FF5AE79027810576456DDF623398F8B1DF5D2AAF26E185C72E85075213A`.
- Independent Technical QA: **TECH READY** in two READ-ONLY exact-current reviews; no confirmed `P0/P1/P2`. Both reviewers independently verified the Inventory invalidation boundaries and Buff Strip scope promotion. One reviewer reran Foundation + Inventory **53/53 PASS** and confirmed the exact artifact hash; another adversarial synthetic check combined an internal Buff mutation with an unrelated outside mutation in one frame and observed exactly one promoted `global` callback.
- Residual `P3` only: an in-place native reorder of the exact same slot-node set under unchanged `Original + Grid` is retained as native authority instead of forcing the old cached baseline order; this is consistent with Original-mode semantics. An exotic Buff Strip root replacement nested inside another Buff Strip subtree is outside the current host contract. Neither is a release blocker.
- Product Owner live smoothness validation: **PASS / APPROVED — 2026-10-09**. The Product Owner tested the exact `0.2.192` candidate and explicitly replied “Aprovado.”

## PM decision

`PRODUCT OWNER APPROVED — exact 0.2.192 accepted for release flow`

Automated verification, soak and independent Technical QA are green. Synthetic/local evidence proved less Better UI work without over-attributing host-game stutter, and the Product Owner then validated the exact `0.2.192` candidate in game and approved it. The Product Owner subsequently authorized commit, push, merge and release. This gate is therefore closed for repository/release completion.

## Release reconciliation note

Private repository completion for `0.2.192` was performed (`release` commit + private `main` merge) under Product Owner authorization. Before any public tag/release was created, mirror preparation exposed an older public-only `0.2.178` Loot Story session-aggregation behavior that was absent from the private candidate. Publishing the naïve public cherry-pick would both change the Product Owner-approved artifact and reintroduce full Analyzer polling in Game mode. Public publication was therefore stopped before push/tag. Candidate `0.2.193` reconciles that historical product requirement with the approved performance boundary and owns a separate exact-candidate gate.
