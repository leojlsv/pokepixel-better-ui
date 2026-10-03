# PM Acceptance & Evidence Record — Better UI module panel viewport

## Task

- Request: keep the preferences/options panel opened by the `Better UI` toolbar button inside the visible viewport.
- Branch / worktree: `fix/menu-popup-viewport` / `.worktrees/menu-popup-viewport`.
- Baseline artifact / version: `main` at `5bcdcfe`, package/userscript candidate `0.2.152`.
- Product Owner rejection evidence: live screenshots supplied 2026-10-03 show the Better UI panel leaving the screen with a vertical toolbar at the left edge and with a horizontal toolbar near the top edge. The rejected `0.2.153` correction targeted grouped native menu dropdowns instead of this component and is not part of the corrected diff.
- Previously Product Owner validated scope: module toggles, orientation selector, persisted disclosure state, keyboard/Escape behavior, outside close, toolbar orientation/drag/collapse and existing menu destinations.
- Explicitly out of scope: grouped native menu dropdown positioning, menu destinations/content, visual restyling, gameplay behavior and live-game automation.
- Write owners: Feature / Module Engineer for `src/modules/module-controls/**`, author regression tests and this gate record; Release / Docs Integrator for version/changelog/artifact metadata.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | With a vertical toolbar at the left or right viewport edge, the Better UI panel opens on the available side and the rendered rectangle stays within all four viewport edges. | Existing module content, toolbar orientation and native toolbar behavior. | Red/green geometry regression + Product Owner live validation on exact candidate. | Feature / Module Engineer | Independent QA + Visual Regression Reviewer | `pass — automated + Product Owner live` |
| AC-02 | With a horizontal toolbar near the top or bottom edge, the panel flips below/above as needed and stays within the viewport. | Existing panel dimensions/density and module content. | Red/green geometry regression + Product Owner live validation on exact candidate. | Feature / Module Engineer | Independent QA + Visual Regression Reviewer | `pass — automated + Product Owner live` |
| AC-03 | Resize and orientation changes recompute placement; if neither vertical side can fit full height, the panel shrinks to available height and its existing internal list remains scrollable. | No page-level overflow; module list remains the scroll owner. | Focused resize/geometry regression + source contract. | Feature / Module Engineer | Independent QA + UX/A11y QA | `pass` |
| AC-04 | Opening still moves focus into the panel; Escape restores focus; outside click closes; changing orientation/preferences remains functional. | Current ARIA, persistence and cleanup semantics. | Existing Module Controls interaction suite + relevant Menu Bar/Card Mode regressions. | Feature / Module Engineer | UX/A11y QA | `pass` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| R-01 | The old `right:0 / bottom:calc(100% + 4px)` absolute anchor always opens left/up, exactly matching the two rejected edge failures. | Two screenshot-shaped regressions fail before the fix and pass after it. | `closed locally` |
| R-02 | A transformed/contained toolbar can make fixed CSS coordinates differ from rendered viewport coordinates. | Adversarial regression adds a synthetic containing-block offset and requires the final rendered rectangle to remain bounded before and after resize. | `closed locally` |
| R-03 | Dynamic placement could break focus/Escape/outside-close or orientation persistence. | Existing interaction/persistence suite plus combined Module Controls/Menu Bar/Buff Strip/Card Mode run. | `closed locally` |
| R-04 | Source/JSDOM geometry cannot prove final game pixels. | Product Owner live validation of exact `0.2.154`. | `closed — Product Owner live validated` |

## Gate results

- Author verification: the two Product Owner screenshot-shaped regressions were RED before the fix (`left=-160` for vertical-left, negative `top` for horizontal-top) and GREEN after it. Module Controls `16/16` PASS; focused panel geometry `5/5` PASS; combined Module Controls/Menu Bar/Buff Strip/Card Mode `76/76` PASS; full suite `638/638` PASS; `npm run build` PASS; `git diff --check` PASS.
- `TECH READY / TECH NOT READY`: pending.
- `UX READY / UX NOT READY / not triggered`: pending.
- `VISUAL READY / VISUAL NOT READY / VISUAL EVIDENCE INSUFFICIENT / not visible`: independent Visual Regression Reviewer did not run, so no reviewer verdict is claimed. Product Owner live validation of the exact `0.2.154` candidate passed on 2026-10-03.
- Exact artifact/version/hash reviewed: candidate `0.2.154`, `dist/pokepixel-better-ui.user.js`, SHA-256 `1A5404EE0E1FA6BF76EA286D917E9A9D03B986ED83F0B3A573A033BA04E8F6E3`; independent review pending.
- Evidence unavailable: agent-side live PokePixel/Tampermonkey validation is prohibited; independent worker startup also failed earlier in this task, so no independent verdict is claimed yet.
- Product Owner live validation: **PASS / approved in-game on 2026-10-03** for the Better UI menu viewport correction.

## PM decision

`PRODUCT OWNER VALIDATED` — the exact `0.2.154` candidate was visually validated and approved in-game on 2026-10-03. Independent TECH/UX/Visual reviewer labels remain unclaimed because those reviewers did not run on this snapshot.

## Product Owner validation checklist

- Completed by Product Owner on exact candidate `0.2.154`; no further live validation remains for this correction.
