# PM gate — /code-review hardening — local candidate v0.2.204

**Date:** 2026-10-16 (UTC).
**State:** TECH READY — independent QA completed. **Product Owner in-game acceptance VALIDATED for the exact `v0.2.204` r2 candidate.**
**Publication:** Conditionally authorized by the Product Owner on 2026-10-20 at 14:39:14 UTC, specifically if the /code-review corrections were genuinely complete. Publication execution remains subject to the exact-artifact and public CI gates described below.

## Provenance and isolation

- Public baseline: `v0.2.203`, `public/main@374d3f30200eb117cd5996d55bc6730868241f80`.
- Isolated local worktree: `G:\pokepixel-better-ui\work\code-review-fixes-203`.
- Working branch: `fix/code-review-hardening-203` (source of the separately authorized local commit).
- Published `v0.2.203` and the unrelated dirty root worktree were preserved.
- `v0.2.202` remains the historical withdrawn/Draft release and is not reused.

## Authorized changes in the local candidate

1. Auto Helper: prevent writes from stale trainer drafts, abandoned native API reads, retired module sessions, and observed A→B→A transitions.
2. Professions: stop stale Collect All and Swap actions after cleanup or trainer change, including A→B→A and clicks on pre-switch buttons before UI reconciliation.
3. Saved Teams/Movesets: trainer-scoped storage, unique recovered preset IDs, per-entry persistence, optimistic conflict checks and serialized owner-scoped Web Locks for cross-tab writes.
4. Legacy data: never auto-assign unscoped v1/v2 presets to an account; offer an explicit owner-confirmed import only when safe cross-tab locking is supported. Original legacy keys remain unchanged.
5. UI: cancel queued writes after cleanup/owner change, prevent stale Team/Profile controls invoking native methods, synchronize another tab's updated presets and report session-only storage in affected surfaces.
6. Maintenance: remove confirmed unused bindings/helpers, correct the Card Mode `--ppbui-surface-values` CSS token reference and reconcile historical/current documentation.

If `navigator.locks` is unavailable, new Saved Team/Moveset edits remain **session-only** rather than performing unsafe shared persistent writes. Session fallback does not guarantee survival after browser reload; this limitation is communicated in the UI.

## Exact local artifact

| Property | Value |
| --- | --- |
| Version | `0.2.204` |
| File | `dist/pokepixel-better-ui-0.2.204-code-review-candidate-r2.user.js` |
| Size | `1,757,884 bytes` |
| SHA-256 | `384DDCCD9C6537C09CD15F3D47D5C802753DFF13C5C0DAD105F412681B5AD6E4` |
| Checksum sidecar | `dist/pokepixel-better-ui-0.2.204-code-review-candidate-r2.user.js.sha256` |
| Deterministic rebuild | PASS — two independent local builds produce exactly the same SHA-256 |

Earlier local intermediate artifacts are superseded. Only the exact `-r2` file and hash above were validated in-game by the Product Owner.

## Automated validation and independent QA

- Complete Node test suite: **898/898 PASS**, 0 failures.
- Source syntax: **129/129 JavaScript files PASS**.
- esbuild userscript build: **PASS**.
- `git diff --check`: **PASS** (Windows LF→CRLF warnings only).
- Independent storage re-gate: **TECH READY**, P0=0/P1=0/P2=0 identified in the reviewed storage scope.
- Independent final integrated QA: **TECH READY**, P0=0/P1=0/P2=0 remaining in the reviewed patch. The previously reproduced Professions pre-sync stale Collect All bug was re-probed after correction and produced no native API calls.
- Regression fixtures simulate owner transitions and native API responses; none is a claim of in-game testing.

## Release lock — gate prepared after conditional approval

Before the 2026-10-20 conditional authorization, `userscript/release-lock.json` intentionally remained bound to the published `0.2.203` and its checksum; `release:check` for `v0.2.204` correctly failed. In this isolated release-preparation commit, the lock is advanced to **`0.2.204` / `384DDCCD9C6537C09CD15F3D47D5C802753DFF13C5C0DAD105F412681B5AD6E4`**, matching the exact PO-approved `-r2` artifact. The prior `0.2.203` lock remains in Git history and its public release is not overwritten. Changing this JSON/documentation must not change the generated userscript bytes.

## Product Owner in-game acceptance — completed

**Acceptance record:** On **2026-10-16 at 02:58:51 UTC** (2026-10-15 at 23:58:51 BRT), the Product Owner replied **`validado`** directly after receiving the technical handoff for the exact **`0.2.204` `-r2`** bundle. This records the Product Owner's in-game validation of that candidate; no individual scenario-by-scenario test results were supplied.

The signed-off artifact remains `dist/pokepixel-better-ui-0.2.204-code-review-candidate-r2.user.js`, **1,757,884 bytes**, SHA-256 **`384DDCCD9C6537C09CD15F3D47D5C802753DFF13C5C0DAD105F412681B5AD6E4`**. The validation does **not** authorize replacing this artifact or performing Git/publication actions.

The Product Owner, not an agent, owns the real PokePixel Idle/Tampermonkey validation. The candidate's suggested acceptance checklist was:

1. Auto Helper: normal edit/save/retry and account A→B→A without obsolete settings being written.
2. Professions: Collect All and manual Swap continue working normally; pre-switch buttons and pending confirmations remain inert after changing accounts.
3. Saved Teams/Movesets: current trainer's newly saved data is isolated, names/order/updates/deletions behave correctly; another trainer cannot view it.
4. Legacy import: the explicit import action is available for previously unscoped saved data, requires confirmation, and preserves the existing records.
5. Two-tab behavior: independent records are retained, conflicting edits of the same preset are rejected rather than overwritten; inability to use Web Locks is explained as session-only storage.
6. Spot-check existing Team/Hunts/Card Mode/Backpack interactions for regressions.

## Subsequent local Git authorization — granted

On **2026-10-16 at 03:53:52 UTC**, in response to the explicit request to commit the corrections and integrate locally with `public/main`, while withholding push and publication, the Product Owner replied **`autorizado`**. This grants only the local commit and fast-forward preparation/integration of the approved changes. The local integration branch is to track the public lineage; the remote-tracking `public/main` ref must not be advanced locally to misrepresent the remote state. The private `main`/`origin/main` lineage and all unrelated worktrees remain untouched.

## Conditional publication authorization — 2026-10-20

The Product Owner asked **`Tudo ja foi corrigido? Apenas se sim, de fato, está aprovado`** on **2026-10-20 at 14:39:14 UTC**. This authorizes publication **only if** the identified `/code-review` findings are closed, not the unrelated active development in other worktrees. Fresh checks of the `v0.2.204 -r2` candidate confirmed **898/898** Node tests PASS; **180** JavaScript syntax checks without errors; `npm audit --audit-level=high` with **zero vulnerabilities**; unchanged clean source commit `cffcd9f`; and deterministic rebuild to the **same 1,757,884 bytes and SHA-256 on Windows and on Linux (clean committed-source `git archive`, Node 24, `npm ci`, esbuild)**. Historical independent final QA remains TECH READY with no open P0/P1/P2 in the reviewed patch.

The permitted next actions are: commit this release-lock preparation, push **only the public-lineage fast-forward** to public `main`, require public `main` CI success, then create/push the `v0.2.204` tag and verify the GitHub Release's assets against the approved SHA. If a mandatory gate fails, **do not tag or publish**. Do not merge dirty root-worktree work, rewrite published tags, modify private `main` or `origin/main`, or overwrite historical `v0.2.202`/`v0.2.203` releases. The release's final remote state must be independently verified; this document records authorization and preparation, not a claim that publication already occurred.
