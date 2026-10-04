# Geneticista — extraction UX redesign

Date: 2026-10-04

## Task

- Request: complete UI/UX review of Geneticista; remove the redundant `Genetic Materials`
  tab because `Trainer > Genetic Vault` owns that inventory surface; make Pokémon
  extraction selection faster with a card/menu workflow consistent with Mark's Shop;
  remove the extraction animation.
- Branch / worktree: `feat/geneticist-ui` / `G:/pokepixel-better-ui`.
- Baseline artifact / version: `0.2.158`; extraction redesign `0.2.159`; current
  filter/discovery follow-up candidate `0.2.160`.
- Previously Product Owner validated scope: Nature/Geneticista Hunt-performance fixes,
  City Geneticista shortcut and Trainer `Genetic Vault` navigation remain authoritative.
- Explicitly out of scope: changing extraction yield, eligibility, protection/unlock,
  server permissions, rarity filters, Genetic Vault, Awakening/Exchange, IV reroll rules,
  or creating a new cross-species destructive transaction.
- Write owner: Feature / Module Engineer for `src/modules/geneticist/**`, registry/module
  controls, focused tests, design override and this task record.

## Product Owner checkpoint

The Product Owner validated candidate `0.2.159` in-game on 2026-10-04. The follow-up
request is to improve `IV Reroll` and `Extract Material` filters, use one effective
filter structure across all four remaining tabs, and center the primary tab labels.

“Same structure” is implemented as a shared visual/discovery grammar. Native capabilities
remain authoritative: Awakening exposes only Search. Exchange has no complete native
source-filter API/state and its source load is bounded, so Better UI adds discovery chrome
around the native source list without fabricating Search/facets over an incomplete catalog.
Target radios, Units and transaction state remain native.

## Native contract findings

Current public `NpcInteraction.js` and `ApiClient.js` were re-inspected without opening
the game client. The Geneticista root is `.npc-iv-window`. Extraction already supports
selecting multiple individual creatures and `all_filtered`, but every destructive call
is scoped to exactly one `species_id`:

`POST /creatures/genetics/extractions { species_id, selection }`.

The native flow owns the snapshot, `SELECTION_CHANGED` recovery, per-attempt
Idempotency-Key, retry classification, confirmation, protection/unlock behavior and
post-commit refresh/events. There is no observed atomic or batch cross-species endpoint.
The redesign therefore keeps one active species per commit and improves species switching
and individual selection without synthesizing a multi-request destructive batch.

The native `Genetic Materials` primary tab is a read-only material browser. Its data is
already available through the separate Genetic Vault requested by the Product Owner, so
Better UI removes this duplicate navigation surface while active.

The native extraction cinematic is presentation around the same authoritative request.
Its own `Skip` control preserves pending/result/focus semantics and the `finished`
completion promise. Better UI will activate that native path immediately rather than
suppressing the modal DOM, replacing `AnimeFX` globally or bypassing completion.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-GEN-01` | `Genetic Materials` is absent from Geneticista primary navigation while Better UI is enabled. Reroll, Extract and any native Awakening/Exchange tabs remain reachable. | Genetic Vault and all native tab handlers/state outside the removed duplicate surface. | DOM lifecycle regression + representative render + Product Owner live check. | Feature Engineer | Technical QA + Visual QA + Product Owner | `pass — 0.2.159 live validated` |
| `AC-GEN-02` | Extraction species selection is a compact, scan-friendly card/menu surface consistent with Mark's Shop: sprite/name first, eligibility/material facts secondary, filters/search retained. | Native species query/filter/sort results and native species-selection click handler. | DOM/node-identity regression + UX review + representative render. | Feature Engineer | UX/A11y QA + Visual QA | `pass` |
| `AC-GEN-03` | Within the active species, different eligible Pokémon can be selected/deselected directly as clear selectable cards; selected, protected, disabled and keyboard-focus states are distinct. | Native `selectedExtractIDs`/`all_filtered`, unlock confirmation, selection count, pagination and `PokemonCard.bindSlot`. | Interaction regression + UX/A11y review + representative render. | Feature Engineer | Technical QA + UX/A11y QA + Visual QA | `pass` |
| `AC-GEN-04` | Changing species stays a short, obvious action and does not imply that selections from different species will be committed atomically. | One-species native POST contract and server snapshot/idempotency semantics. | Source contract review + interaction regression + UX copy/state review. | Feature Engineer | Architecture + UX/A11y QA | `pass` |
| `AC-GEN-05` | Confirming extraction immediately takes the native Skip path, so no extraction sequence must be watched; the user still receives its static pending/result surface and can continue normally. | Native confirmation, POST, retry, post-commit refresh/events, result completion and focus restoration. | Regression proving Skip is invoked exactly once + native completion-path fixture + render. | Feature Engineer | Technical QA + UX/A11y QA + Visual QA | `pass` |
| `AC-GEN-06` | The redesigned extraction surface remains usable at normal and narrow Geneticista widths without primary horizontal scrolling or clipped actions. | Native window sizing/scroll ownership and localized labels. | Deterministic wide/narrow render + geometry/overflow checks. | Feature Engineer | UX/A11y QA + Visual QA | `pass` |
| `AC-GEN-07` | Stable reconcile is mutation-free; root/content replacement is reacquired; disabling Better UI restores native tabs/classes/animation function without overwriting newer host ownership. | Central observer architecture, native node identity/listeners and host runtime changes. | Lifecycle/identity/adversarial regression. | Feature Engineer | Technical QA | `pass` |
| `AC-GEN-08` | Reroll uses the shared filter surface with native Search plus Quality/Element/Location/Variant/Sort in a readable responsive composition. | Original select/search nodes, listeners and server-backed filtering semantics. | Native-node identity regression + wide/narrow render. | Feature Engineer | Technical QA + UX/A11y QA + Visual QA | `pass` |
| `AC-GEN-09` | Extract species/creature steps use the same grammar with only their native controls; quality checkboxes remain checkbox facets rather than text inputs. | Native Search/select/facet state, debounced reloads, selection and pagination. | DOM semantic regression + representative render. | Feature Engineer | Technical QA + UX/A11y QA + Visual QA | `pass` |
| `AC-GEN-10` | Awakening presents its native Search in the shared surface and does not add Quality/Location/Sort controls over the capped rendered subset. | Native quality sort, 120-result render cap and picker behavior. | DOM regression + representative render. | Feature Engineer | Technical QA + UX/A11y QA + Visual QA | `pass` |
| `AC-GEN-11` | Exchange keeps its native source/target transaction controls and receives discovery hierarchy only; no incomplete source filters are created. | Native material source load/sort, source click handlers, target radios, Units and exchange transaction semantics. | DOM/rerender regression + desktop/stacked render. | Feature Engineer | Technical QA + UX/A11y QA + Visual QA | `pass` |
| `AC-GEN-12` | The four remaining primary tab labels are centered at normal width and retain the narrow 2×2 layout. | Native tab order, active state and click handlers. | CSS/DOM regression + wide/narrow render. | Feature Engineer | UX/A11y QA + Visual QA | `pass` |
| `AC-GEN-13` | Native filter controls that lack an accessible name receive one without replacing the control or changing its listener identity. | Native control nodes, labels/placeholders, disabled/busy state. | Accessibility/identity regression. | Feature Engineer | Technical QA + UX/A11y QA | `pass` |
| `AC-GEN-14` | Repeated reconciliation and native rerenders do not duplicate headings/ownership or mutate detached host renders during cleanup. | Central observer lifecycle and newer host ownership. | Reconcile/cleanup adversarial regression. | Feature Engineer | Technical QA | `pass` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| `R-GEN-01` | Hiding a tab by fixed index would remove the wrong feature when Awakening/Exchange availability changes. | Resolve `Genetic Materials` by current localized native label and test alternate tab sets/order. | `pass` |
| `R-GEN-02` | Removing the cinematic DOM or CSS-hiding it can leave `cinematic.finished` unresolved after a committed extraction. | Exercise the native static fallback contract and prove the completion promise/result action still resolves. | `pass` |
| `R-GEN-03` | Reconcile could click Skip repeatedly while the cinematic is settling. | Exact-once marker regression across repeated reconcile calls. | `pass` |
| `R-GEN-04` | Repeated native rerenders can leave stale PPBUI ownership or duplicate styling. | Replace primary tabs/content repeatedly; stable sync and cleanup checks. | `pass` |
| `R-GEN-05` | A Mark's-Shop-like redesign could accidentally imply cross-species atomic extraction. | UX review verifies active-species context remains explicit and selection count is scoped to it. | `pass` |
| `R-GEN-06` | Filtering only the bounded Exchange source load could imply that the visible subset represents the whole material catalog. | No Better UI source Search/facets are created; regression preserves the native source list, target radios and Units controls. | `pass` |
| `R-GEN-07` | Exchange material cards reuse `.npc-genetic__species` / `.npc-genetic__species-list`, so an unscoped Extract capture handler could reparent Exchange DOM before its native click handler runs. | Capture handling is gated by the native active Extract tab; regression clicks an Exchange source and proves its Exchange ancestor/original parent remain intact during the native handler. | `pass — P1 found and fixed during independent TECH QA` |

## Completed gate results — candidate 0.2.159

- Author verification: focused Geneticista + design/registry **32/32 PASS**; full repository
  **650/650 PASS**; `npm run build` PASS; `git diff --check` PASS.
- `TECH READY / TECH NOT READY`: **TECH READY** — independent exact-candidate review found
  P0/P1/P2/P3 = 0. Detached native nodes have only PPBUI-owned class/tab/species/
  cinematic-marker state restored before ownership references are pruned; connected native
  state and newer host ownership remain protected.
- `UX READY / UX NOT READY`: **UX READY** — independent source/A11y review found
  P0/P1/P2/P3 = 0. Species context remains explicit, native destructive semantics remain
  species-scoped, and selected/protected/focus states remain distinct.
- `VISUAL READY / VISUAL NOT READY / VISUAL EVIDENCE INSUFFICIENT`: **VISUAL READY** —
  deterministic host-realistic renders at 920, 696, 390 and 320 px show the persistent/
  stacked species selector, remaining primary tabs, reachable extraction action and no
  horizontal clipping. Static post-Skip result renders at 920 and 390 px remain readable.
- Exact artifact/version/hash reviewed: `0.2.159`, `dist/pokepixel-better-ui.user.js`,
  **1,296,341 bytes**, SHA-256
  **`F278940E8A68591E16D13E70DDECF0DDE23422DE132FE64C5E580AB6CE6FFC9E`**.
- Evidence unavailable: the external `/ui_ux_pro` searchable skill database/script is not
  present in this workspace. Review uses the project copy `.skills/ui_ux_pro.md`, current
  `MASTER.md`, native static source and project-native QA workflow.

## PM decision

`PM ACCEPTED — exact candidate authorized for Product Owner validation`.

Product Owner in-game validation: **PASS on 2026-10-04**.

## Current gate state — 0.2.161 validated

Product Owner validation of `0.2.160` found one visual regression: the native
`Genetic Materials` button became visible again. The button still had `hidden=true`;
the new centered-tab rule applied `display:flex!important`, overriding the browser hidden
rendering. Candidate `0.2.161` adds an explicit scoped `[hidden] { display:none!important; }`
rule and regression coverage for both the initial tab and a synchronously rebuilt native tab.

The `0.2.160` filter/discovery implementation remains otherwise unchanged.

Author verification for `0.2.161`:

- Geneticist focused: **15/15 PASS**.
- Geneticist + design-system + app-registry: **38/38 PASS**.
- Full repository: **1312/1312 PASS**.
- `npm run build`: **PASS**.
- `git diff --check`: **PASS**.
- Synthetic native-tab preview includes `Genetic Materials` in the DOM and proves at both
  920 px and 390 px that it remains `hidden=true`, computes to `display:none`, has width `0`,
  and does not disturb the four visible centered tabs or narrow 2×2 layout.
- Exact candidate artifact: `0.2.161`, `dist/pokepixel-better-ui.user.js`,
  **1,309,168 bytes**, SHA-256
  **`C233CB12E911048322BA2DBA4E22B62295C2A2623EE601AF438B55E305D041E2`**.

Independent review of exact candidate `0.2.161`:

- Technical QA: **P0/P1/P2/P3 = 0/0/0/0 — TECH READY**.
- UX/A11y QA: **P0/P1/P2/P3 = 0/0/0/0 — UX READY**.
- Visual Regression QA: **P0/P1/P2/P3 = 0/0/0/0 — VISUAL READY**.
- Technical review confirmed the production delta from `0.2.160` is limited to the version
  bump and the scoped `[hidden] { display:none!important; }` primary-tab rule.
- Visual review confirmed `Genetic Materials` is absent at 920 px and 390 px while the four
  valid tabs retain centered single-row / narrow 2×2 layout without clipping or overflow.

### PM / Product Owner decision — 0.2.161

`PM ACCEPTED — exact candidate validated and approved in-game by Product Owner`.

Product Owner in-game validation: **PASS — validated and approved on 2026-10-04**.

### Previous local gate — candidate 0.2.160

Author verification is complete after the independent TECH review found and the author
fixed an Exchange click-ownership P1. The full regression ran on the isolated stable task
snapshot; the shared delivery branch was then synchronized with **12/12 task-file SHA-256
matches** and re-gated on its standard build surface:

- Geneticist focused tests: **15/15 PASS**.
- Geneticist + design-system + app-registry gate: **38/38 PASS**.
- Full repository: **656/656 PASS**.
- `npm run build`: **PASS**.
- `git diff --check`: **PASS**.
- Shared delivery branch focused Geneticist: **15/15 PASS**; Geneticist + design-system +
  app-registry: **38/38 PASS**.
- The P1 fix scopes persistent species capture to the active native Extract tab. A dedicated
  regression clicks an Exchange material source and verifies its `.genetic-exchange`
  ancestry and original source-list ownership are intact while the native click handler runs.
- Critical Geneticist source/test SHA-256 values were identical before and after the full
  repository run, proving the gate did not span concurrent source revisions.
- Deterministic renders cover Reroll 920/390, Extract 920/390, Awakening 390 and Exchange
  920/696/390. Geometry checks show no root/content/filter horizontal overflow, primary tab
  labels centered, narrow 2×2 tabs, and Exchange switching from two columns to one below
  the 724 px breakpoint without clipping.
- Exact delivery artifact: `0.2.160`, `dist/pokepixel-better-ui.user.js`,
  **1,309,051 bytes**, SHA-256
  **`890F9C5D46DBEE7F9E472E05EB421DACC959EBA31FEBE8BE0BABDA01258EE504`**.
- The isolated checkout and shared branch store some unchanged global CSS with different
  CRLF/LF representations. Independent TECH QA verified the two bundles become byte-identical
  after normalizing only those literal CSS newline escapes; no task JavaScript differs.

Independent final review of the post-fix exact artifact:

- Technical QA: **P0/P1/P2/P3 = 0/0/0/0 — TECH READY**.
- UX/A11y QA: **P0/P1/P2/P3 = 0/0/0/0 — UX READY**.
- Visual Regression QA: **P0/P1/P2/P3 = 0/0/0/0 — VISUAL READY**.
- The final shared-branch renders were recaptured after the standard build and correspond to
  the exact delivery artifact tuple above.

### PM decision — candidate 0.2.160

`PM ACCEPTED — exact candidate authorized for Product Owner validation`.

Product Owner in-game validation of `0.2.160` found the hidden-tab regression described
above; that exact candidate is superseded by `0.2.161`.

## Product Owner validation checklist

- Open Geneticista and confirm the primary tabs are `Reroll IVs`, `Extract`, `Awakening`
  and `Exchange` when those native features are available; `Genetic Materials` is absent.
- In `Extract`, choose one species, select/deselect several individual Pokémon, then switch
  species from the persistent selector and confirm the new native individual list loads.
- Confirm protected Pokémon still use the native unlock confirmation and bulk selection/
  selection counts remain correct.
- Confirm extraction confirmation still appears, the cinematic is skipped immediately to
  its static result, `Continue` works and focus/Geneticista interaction resumes normally.
- Check the Geneticista at your normal window size and one narrow size for clipping or
  unexpected horizontal scroll.
- In `Exchange`, confirm no Better UI Search/facet controls were added above the bounded
  native source list and that source selection, target radios and Units still behave
  normally.

Live validation remains exclusively with the Product Owner and is not inferred from the
local TECH/UX/VISUAL gates.
