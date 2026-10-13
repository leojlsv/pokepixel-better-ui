# PM Acceptance & Evidence Record — Geneticist Extract continuity

## Task

- Request: prevent a successful Geneticist material extraction from dumping the user back into the initial species-card browser; correct Extract filter density, rarity facet sizing and semantic rarity recognition from the supplied in-game screenshots.
- Branch: `fix/geneticist-extract-continuity-ux`; baseline `0.2.196` (`42b1bda`).
- Previously Product Owner validated: native extraction/confirmation/Skip flow, persistent species sidebar, four primary tabs and existing Geneticist feature behavior through `0.2.169`; current screenshots reopen only the post-success transition and filter/facet presentation.
- Scope boundary: Better UI-only DOM interaction and styles; retain native per-species POST, eligibility, snapshot, selection, busy/retry, protected Pokémon, other Geneticist tabs and material refresh. No native/game/browser changes or git publish operations.
- Write owner: PM + Geneticist Module Engineer (prime). Independent Technical QA, UX/A11y QA and Visual Regression QA read-only.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Evidence required | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | After an Extract POST succeeds, the same species is selected again once refreshed native species results are ready; the split chooser stays in use and current eligible Pokémon and material balance come from the native reload. | Server-authoritative commit, fresh native `loadExtractable`, no old selected Pokémon/snapshots or automatic second extraction. | Native source trace + simulated successful async transition and event identity tests; live owner check. | Module Engineer | Technical QA + UX/A11y | `open` |
| AC-02 | Canceled/failed extraction, retry, explicit Back, other tabs and missing species remain native; no accidental automatic reentry or extra POST. | Native retry key, server validation, manual navigation and error feedback. | Negative/edge simulated DOM and event tests. | Module Engineer | Technical QA | `open` |
| AC-03 | Preserved sidebar cannot switch species during native busy/loading, including pointer and keyboard; native control states and cleanup are restored after completion. | No new observer/global listener or gameplay state. | Busy-state synthetic regression, stale-button click guard, cleanup. | Module Engineer | Technical QA + UX/A11y | `open` |
| AC-04 | Extract species Search/Element/Location/Sort fit one desktop filter row; selected species Search/Location/Sort use the width without orphaned fields; narrow layouts wrap without clipping. | Exact native input/select nodes, their native listeners, query/sort/facet state. | Scoped CSS/DOM checks and representative local render if available; owner screenshot. | Module Engineer | UX/A11y + Visual Regression | `open` |
| AC-05 | All seven rarity facets are compact, consistently tall, clearly checked and distinguishable by native rarity colors; checkbox labels, focus and disabled states remain legible. | Native `weak` through `mythical` order and accessibility. | CSS/DOM/focus checks and representative local render if available; owner screenshot. | Module Engineer | UX/A11y + Visual Regression | `open` |
| AC-06 | Mount/reconcile/cleanup and bus identity changes remain idempotent, bounded and reversible. | SPA native rerenders, Materials hiding, separate Awakening/Exchange/Reroll behavior. | Focused and broader regressions, build, diff check and independent review. | Module Engineer | Technical QA | `open` |

## Risks / failure hypotheses

| Risk | Cause | Detection | Status |
| --- | --- | --- | --- |
| R-01 | Native success resets `extractStep` and clears `extractSpecies` before refresh; merely keeping the old DOM sidebar would show stale materials. | Auto-reentry uses current native species button and fresh native creature load, never saved creature data. | `open` |
| R-02 | Reparented old species buttons do not inherit busy/disabled state from later native renders, enabling competing species requests. | Inert sidebar and capture-phase guard while the fresh native Extract controls report busy. | `open` |
| R-03 | Another Bus event or a failed/canceled attempt could trigger unintended species reentry. | A native extraction-specific success event must match a user-initiated Extract action in the active panel. | `open` |
| R-04 | Native refresh may no longer return the selected species (filtered/depleted), or the panel/bus may be replaced. | Single bounded recovery attempt; graceful native species fallback and exact-bus cleanup. | `open` |
| R-05 | Screenshot/JS tests do not establish responsive CSS geometry. | Representative offline component render or record `VISUAL EVIDENCE INSUFFICIENT`. | `open` |

## Gate results

- Author verification: pending.
- Technical QA: pending.
- UX/A11y QA: pending.
- Visual Regression QA: pending.
- Exact candidate: pending.
- Product Owner in-game validation: **pending**.

## PM decision

Pending evidence and independent gates. No commit/push/merge/release is authorized by this task.

## Product Owner validation checklist

1. With several extractable Pokémon of one species, extract one and use the native Skip/Continue; verify the same species stays open with its **new** count/balance and no Pokémon preselected.
2. Cancel one confirmation and provoke a native validation failure if practical; ensure the selection does not unexpectedly change.
3. Confirm the seven rarity facets are compact, aligned, individually color-coded and readable with unchecked/checked/focus states.
4. Verify initial species Search/Element/Location/Sort and selected-species Search/Location/Sort at normal and narrow widths, including Back and switching species.
