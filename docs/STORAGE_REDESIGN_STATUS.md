# Storage Redesign — PM Acceptance & Evidence Record

Recorded: 2026-09-17

## Task

- Request: advance from the live-validated Team `0.2.12` candidate to Storage.
- Branch / worktree: `refactor/team-pixel-art` / existing dirty redesign worktree.
- Baseline artifact: exact Product Owner-live-validated `0.2.12`, 567,955 bytes,
  SHA-256 `3623CFAF3E04A730D00DEFCADD243BD6E8BEB530EE8B92D629E969C8BB42E270`.
- Visual baseline: Product Owner live Storage screenshot supplied 2026-09-17 plus
  representative local host-snapshot render `work/storage-0.2.12-baseline.png`.
- Previously validated Storage scope: functional two-column transfer/search/filter/
  pagination behavior recorded in `docs/modules/storage.md`.
- Explicitly out of scope: gameplay rules, network/API flow, transfer semantics,
  storage capacity, Team-family UI, new raster assets.
- Write owner: Feature/Module implementation through PM-controlled task slicing.
- Design source: approved MASTER + candidate Storage page override.

## Baseline findings

The current live screen is functionally strong but still carries legacy host visual
language: rounded slots, repeated full-color borders, gold/brown header emphasis,
native gradients and mixed control geometry. The fixed 7×6 grids are also visually
small inside the wide live vaults, while the overall window can leave unused space
below the vaults after resize. The redesign must improve hierarchy without replacing
the validated two-vault workflow.

Baseline focused Storage tests: `17/17 PASS` before redesign work.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Evidence | Status |
| --- | --- | --- | --- | --- |
| `ST-01` | Two equal side-by-side vaults remain the primary workspace and align vertically | Backpack↔Warehouse workflow | browser render + Technical QA | `open` |
| `ST-02` | Headers use MASTER charcoal/neutral hierarchy; count and bulk action remain stable/right-aligned | native titles, counts, bulk actions | browser render + source/lifecycle | `open` |
| `ST-03` | Search rows align and result count does not shift while typing | per-side search/focus/caret | render + focused interaction regression | `open` |
| `ST-04` | Rarity/Element/Sort/Clear use square shared controls with no host radius/gradient leakage | independent per-side filter state and native option values | hostile-host regression + render | `open` |
| `ST-05` | More Filters closed/open states remain compact, labeled and unclipped | Pokémon Tools filter semantics/tab order | open/closed render + UX QA | `open` |
| `ST-06` | Normal full page remains 42 occupied Pokémon in a 7×6 equal-slot matrix at representative live width | pagination/capacity/off-page filtering | focused tests + render | `open` |
| `ST-07` | Default slot family is neutral; rarity remains a compact domain cue; selected state is independently gold | canonical quality meaning + selected member identity | state render + source regression | `open` |
| `ST-08` | Native Pokémon sprites remain 40px, crisp, centered and not stretched | native sprite URL/fallback | render + error-fallback regression | `open` |
| `ST-09` | Level, lock/equipped/tag markers remain readable without collisions | native marker semantics | representative/hostile fixture render | `open` |
| `ST-10` | Hover/pressed/selected/focus/disabled states are distinct; focus cyan remains visible over selection | keyboard/focus/native disabled semantics | state render + UX QA | `open` |
| `ST-11` | Pager stays centered with shared 28px square nav controls and stable label | page logic, side-local selection clearing | focused tests + render | `open` |
| `ST-12` | Idle and selected transfer footer keep identical 48px height; content swap causes no layout jump | original transfer button/listener | selected-state render + listener regression | `open` |
| `ST-13` | Empty source vs filtered no-results remain distinct; Clear appears only for no-results | empty/filter logic | focused tests + render | `open` |
| `ST-14` | Scrollbars use shared 10px square Miyazaki chrome | scroll ownership/cleanup | browser render + lifecycle regression | `open` |
| `ST-15` | Native click/double-click/tooltip/transfer behavior and filtered-bulk confirmation remain unchanged | authoritative scene methods and transfer API | focused + adversarial Technical QA | `open` |
| `ST-16` | No new raster assets, remote fonts, decorative gradients or blurred shadows | MASTER art direction | source audit + Visual QA | `open` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| `R-ST-01` | Scene refresh may replace `_panel.body`; current wrapper can move `ppbui-scroll` but restore scrollTop onto the detached old body | replacement-body regression checking current-body scroll position | `open` |
| `R-ST-02` | `findStorage()` currently checks cached windows before active scene; a stale cached scene sharing the same body can win discovery | stale-cached + active-scene adversarial discovery test | `open` |
| `R-ST-03` | Multiple wrappers around the same scene methods can resurrect a stale Storage wrapper after cleanup | ownership/cleanup audit; no new wrapper layer in redesign | `open` |
| `R-ST-04` | Native host `!important`, gradients/radius/selected styles can leak through stylesheet order | hostile-host browser fixture | `open` |
| `R-ST-05` | Rarity border and selected/focus cues can collapse into one color-only signal | selected+rarity+focus render matrix | `open` |
| `R-ST-06` | Resizing may leave large exterior dead area or cause grid/footer clipping | wide/min-width browser renders | `open` |

## Product Owner live outcome — 2026-09-17

The Product Owner explicitly closed the behavioral/structural scope with:

> “Funcionalidade e estrutura aprovados.”

The same live pass rejected only the field chrome:

> “Filtros iniciais nem Search receberam o estilo novo.”

Therefore the current corrective loop must not reopen the two-vault structure,
filter/search semantics, More Filters structure, 42/page grid, pagination, transfer
footers, bulk behavior or native listeners. The open requirement is visual ownership
of Search and filter fields under the live `.pokeidle-panel` host stylesheet.

## Current gate state

- Intake: complete.
- Design contract: complete; candidate page override created.
- Architecture audit: complete; the two audit findings are covered by current regressions:
  active scene wins over a stale cached scene sharing the body, and scroll restoration
  targets the current body when native refresh replaces `_panel.body` in-flight.
- Implementation: frozen as exact visual-correction candidate `0.2.16`.
- Exact userscript: `578,005` bytes, SHA-256
  `8148431ADA318843CF8BE325CE0241D0F9895A312C3B7C78C648FC11189608FD`.
- Focused Storage verification: `22/22 PASS`.
- Full automated suite: `275/275 PASS`.
- Build: PASS. `git diff --check`: PASS apart from the repository's existing LF/CRLF warnings.
- Render-first author evidence:
  - `work/storage-0.2.16.png`, `48,377` bytes, SHA-256
    `BF199E432FB9855319831E8B79EA0E20F5DD0E21EA0AEE9F464133ADC1AB6DBC`;
  - `work/storage-0.2.16-states.png`, `54,583` bytes, SHA-256
    `C22F47CB5EB93AB2874B3CFDFD9BE2CC196C303DAB461C5A51C1E6C55F99043D`.
- The first 0.2.13 state render exposed a genuine pre-review layout blocker: the
  4-column advanced-filter grid produced three field rows and clipped the fixed
  transfer footer. The candidate was corrected before independent review by using
  five Storage-scoped advanced-filter columns (9 fields → 2 rows). The final state
  render keeps the pager and 48px transfer footer visible while preserving field
  order and behavior.
- `0.2.13` was superseded after Technical QA found wrapper-chain cleanup could
  resurrect Storage ownership. `0.2.14` made stale captured adapters inert and passed
  independent Technical QA, but the Product Owner live pass then exposed the initial
  Search/filter host-style leak.
- The previous local harness omitted the live `.pokeidle-panel` host class, which is
  why generic `.ppbui-input/.ppbui-select` appeared correct locally while the live
  master stylesheet still won with `!important`. The corrected harness now includes
  the real host class and native master CSS.
- `0.2.15` added the Storage-specific Search/initial-select bridge. Its corrected
  host harness then exposed the same black native fill on More Filters fields before
  Product Owner handoff; that internal candidate was superseded.
- Exact `0.2.16` applies the same higher-specificity Storage-only visual bridge to
  More Filters inputs/selects. It does not replace controls or change values, event
  listeners, caret, tab order or filtering behavior.
- Technical QA: **TECH READY** on exact `0.2.16`, `P0=0 P1=0 P2=0 P3=0`.
  The independent reviewer reran `22/22` Storage tests and confirmed the production
  delta from the prior cleanup-ready candidate is limited to Storage-scoped field
  chrome plus regressions. Reviewer-selected checks confirmed native initial-select
  identity/options, Search type/label/caret/focus preservation, natural tab stops for
  initial and More Filters controls, and the existing stale-wrapper cleanup guarantee.
  The live host selector specificity was also checked directly: the Storage bridge
  outranks the same-origin `!important` `.pokeidle-panel` field/focus rules without
  changing behavior or lifecycle.
- UX/A11y QA: **UX READY** on exact `0.2.16`, `P0=0 P1=0 P2=0 P3=0`.
  The independent reviewer reran `22/22` Storage tests and an adversarial hostile-host
  semantic/focus check. Search remains `type=search` with its explicit accessible label,
  focus/caret restoration remains intact, the initial filters remain native `select`
  nodes with their original options/change behavior, More Filters remains native
  `details/summary` with unchanged DOM/tab order, and the Storage-scoped focus-visible
  bridge preserves the cyan keyboard outline even against the host `outline:0!important`.
  No new tab stops or focus-flow regressions were found.
- Visual Regression QA: **VISUAL READY** on exact `0.2.16`, `P0=0 P1=0 P2=0 P3=0`.
  The independent render-first reviewer reverified the exact artifact and both
  host-realistic render identities. Search and the initial Rarity/Element/Sort
  controls are square Miyazaki fields with neutral/stone hard borders and no
  rounded/black host leakage; open More Filters uses the same owned field chrome,
  remains 5-column/2-row and unclipped; Clear/header/grid/pager/footer are unchanged;
  selected gold and independent cyan focus remain intact. This was the local rendered
  evidence used before the separate Product Owner live pass recorded below.
- Product Owner live validation: **PASSED** on exact `0.2.16`. The Product Owner confirmed
  the corrected live Storage result with **“Storage validado”** on 2026-09-17. This closes
  the remaining field-chrome gate; functionality, structure and current visual presentation
  are all accepted for this candidate.
