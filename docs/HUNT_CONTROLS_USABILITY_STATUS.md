# Hunt controls usability — Acceptance & Evidence Record

## Task

- Request: simplify the active-Hunt controls, credit Better UI as `by Rhyxus`, and remove the native fixed top/bottom menu-position choice while Better UI owns the draggable Poké Hub.
- Branch / worktree: `task/hunt-controls-usability` / `G:/pokepixel-better-ui`.
- Baseline artifact / version: `0.2.166` on `main` before this task.
- Product Owner functional validation: candidate `0.2.167` validated in-game on 2026-10-05; follow-up request was limited to centering the `Return to City` button label.
- Product Owner final validation: corrective candidate `0.2.168` approved and validated in-game on 2026-10-05, including the centered `Return to City` label.
- Previously Product Owner validated scope: current draggable/collapsible Poké Hub, Better UI module panel, and existing Hunt gameplay behavior outside this delta.
- Explicitly out of scope: capture rules, capture queue/body prompts, revive behavior, Hunt session/server logic, network traffic, and native drag/collapse implementation.
- Write owners: Project Manager for this record; Feature / Module Engineer for source/tests/docs. Independent reviewers are read-only.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | The persistent global `Capture` action is absent during a Hunt. | Per-body capture prompts and native capture/server behavior remain untouched; Revive remains available when the game exposes it. | Native-contract source review; synthetic DOM identity/lifecycle regression; representative render. | Feature / Module Engineer | Technical QA + UX/A11y QA + Visual Regression QA | `accepted` |
| AC-02 | `Return to City` becomes one compact, friendly contextual navigation action outside the central gameplay lane. | The original native button and its existing `stopHunt()` handler/disabled pending state remain authoritative; no duplicated exit action. | Native-node identity/handler regression; focus/state checks; representative desktop/narrow render. | Feature / Module Engineer | Technical QA + UX/A11y QA + Visual Regression QA | `accepted` |
| AC-03 | The Better UI preferences panel shows `by Rhyxus` at the top with clear but subordinate visual hierarchy. | Existing title, module disclosure, status, close behavior, focus order and panel bounds remain usable. | DOM/a11y regression plus representative panel render. | Feature / Module Engineer | UX/A11y QA + Visual Regression QA | `accepted` |
| AC-04 | `Main menu position` is absent from the native Settings UI while Better UI owns the menu bar, and the native top/bottom positioning effect cannot move the draggable Poké Hub. | Native settings outside this row remain intact; Better UI drag-position persistence and native drag/collapse keep working; disabling Menu Bar restores the game's current native preference behavior. | Public native settings contract; synthetic Settings fixture; event/reconcile/cleanup regression; menu-bar regression. | Feature / Module Engineer | Technical QA + UX/A11y QA | `accepted` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| R-01 | The host rebuilds the Hunt action bar or Settings rows after Better UI mounts, which could restore `Capture` or the menu-position row. | Replace/rebuild native nodes in a synthetic fixture, reconcile through the central lifecycle, and verify ownership transfers without duplicates/stale masks. | `closed` — replacement/reconcile/teardown coverage PASS; Technical QA adversarial replacement race PASS. |
| R-02 | Removing `pokeidle-toolbar-bottom` once is insufficient because `InterfacePreferences.apply()` can re-add it later. | Dispatch the native interface-preferences event after re-adding the class and verify Better UI neutralizes only that positioning flag while mounted, then restores native behavior on cleanup. | `closed` — event ordering verified against current native contract; suppression/re-enable/cleanup race PASS. |
| R-03 | Repositioning the whole action bar can make conditional `Revive` unreachable or overlap persistent HUD surfaces at narrow widths. | Render default + Revive-visible states at representative desktop and narrow widths; keyboard reachability review. | `closed` — independent Visual QA confirms Revive centered/readable at 900px and 390px; UX/A11y gate reports no material reachability finding. |
| R-04 | Hiding settings by translated visible text becomes fragile across locale changes. | Identify the control from its native select contract/structure and verify locale-independent matching plus teardown. | `closed` — structural top/bottom select matcher fails closed on ambiguity; no translated-label dependency. |

## Gate results

- Author verification: exact corrective candidate `0.2.168`: `npm test` 1326/1326 PASS; focused Hunt Controls 9/9 PASS; `npm run build` PASS; `git diff --check` PASS.
- `TECH READY / TECH NOT READY`: `TECH READY` — independent exact-candidate follow-up for `0.2.168` found no P0/P1/material findings. Relative to approved 0.2.167 behavior, only Return-label alignment CSS plus its regression assertion/version metadata changed; controller, lifecycle and accessibility semantics are unchanged. Focused Hunt Controls is 9/9 PASS and the full suite is 1326/1326 PASS.
- `UX READY / UX NOT READY / not triggered`: `UX READY` — independent UX/A11y QA found no material finding; focused independent run 64/64 PASS.
- `VISUAL READY / VISUAL NOT READY / VISUAL EVIDENCE INSUFFICIENT / not visible`: `VISUAL READY` — independent Visual Regression QA for exact candidate `0.2.168` confirms the `Return to City` label is horizontally centered at both 900px and 390px, with no new clipping, overlap, wrapping, button geometry shift, popup/grid regression or badge collision. Prior 0.2.167 visual findings for the rest of the task remain unchanged.
- Exact artifact/version/hash reviewed: corrective candidate `0.2.168`, `dist/pokepixel-better-ui.user.js`, SHA-256 `C9DD6F7961E30B2DFBE7B9E8E53654159F3BF37335CBEB53B20F44ED8C10429B`.
- Representative corrective renders: `work/hunt-controls-city-900-0.2.168.png`, `work/hunt-controls-city-390-0.2.168.png`; baseline task renders remain `work/hunt-controls-revive-900.png`, `work/hunt-controls-revive-390-final.png`, `work/hunt-controls-panel-900.png`, `work/hunt-controls-panel-390-final.png`. These are deterministic synthetic renders using the exact built userscript, not live-game evidence.
- Live-game evidence: Product Owner approved and validated corrective candidate `0.2.168` on 2026-10-05.

## PM evidence audit

All four acceptance criteria have implementation evidence and required independent gates. Product Owner validated the functionality in-game on `0.2.167`, then approved and validated the final `0.2.168` corrective alignment in-game. Full tests/build remain green, independent Technical QA and Visual Regression QA are ready on the exact corrective candidate, and no P0/P1/material review finding remains open.

## PM decision

`PM ACCEPTED — 0.2.168 approved and validated by the Product Owner.`

Product Owner validation is complete. No commit/push/merge/tag is authorized by this task.

## Product Owner validation checklist

Functional behavior below was validated by the Product Owner on `0.2.167`; the final `0.2.168` visual correction was subsequently approved and validated in-game.

Validated functional surfaces:

- During a classic Hunt, the persistent global `Capture` action is absent, while normal per-body/manual capture still works when offered by the game.
- `Return to City` appears as the first full-width contextual item in the Poké Hub > City popup and uses the native action; the small `Return`/`Voltar` availability badge on City is noninteractive.
- When the companion is down, native `Revive` remains reachable and behaves normally.
- The Better UI modules panel shows `by Rhyxus` at the top, visually subordinate to the Better UI title.
- Native Settings no longer shows `Main menu position` while Better UI's draggable Menu Bar owns the Poké Hub, and changing/reapplying the old top/bottom preference does not jump the draggable bar.
- Disabling the Better UI Menu Bar restores the game's authoritative native top/bottom preference behavior.
