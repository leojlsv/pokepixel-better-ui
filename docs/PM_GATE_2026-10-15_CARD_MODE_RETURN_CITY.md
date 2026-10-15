# PM Gate — Card Mode Return to City

## Task

- Request: Product Owner reported in 2026-10-15 that the **Return to City** action
  is missing in the City popup during Card Mode (live screenshot supplied).
- Branch: `fix/card-mode-return-city-0.2.201`; baseline includes the **user-validated**
  0.2.200 Inventory pagination candidate without altering its functional code.
- Exact preceding approved Inventory artifact:
  `dist/pokepixel-better-ui-0.2.200-inventory-native-pages-candidate.user.js`,
  SHA-256 `48C1EAC8C8533C5029AFEB7A7BD324A62ABFF48B1FEA9BF81F4B4F73333BCADF`.
- Scope: classic `.pokeidle-map-action-bar` integration with the native Return button;
  the independent `PlatformHunt` renderer has a different contract and is out of scope.
- Write owner: Feature Engineer (implementation/tests) and PM (release/docs).

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Evidence | Owner / review | Status |
| --- | --- | --- | --- | --- | --- |
| `AC-CR-01` | In active classic Hunt, `Return to City` remains first and visible in City during Game and Cards | Original native node, labels, handler, disabled state | Integrated lifecycle regression Game → Cards; native node identity and context | Engineer / Technical QA | `pass` (automated; PO approved corrective in-game) |
| `AC-CR-02` | Selecting Return while Cards is active makes Game visible before the native action executes | No duplicate stopHunt or synthetic click | Native handler observes Game; one call; disabled action does nothing | Engineer / Technical QA | `pass` (automated; PO approved corrective in-game) |
| `AC-CR-03` | Inactive Hunt never exposes Return; focus on disappearing Return returns to City without stealing other focus; badge/keyboard state and native node restore | Native visibility, contextual City keyboard contract and cleanup | Hidden/ARIA-hidden Hunt, Home focus, active→inactive focus and menu lifecycle regressions | Engineer / UX/A11y QA | `pass` (automated; scope-level PO approval, no claim of individual live edge-case tests) |
| `AC-CR-04` | No regression to pre-approved Inventory 0.2.200 or other Card Mode/Menu Bar behavior | Existing tests, source and userscript artifact integrity | Focused suites, full validation/build, independent review | PM / Technical QA | `pass` (**TECH READY**) |
| `AC-CR-05` | Return fits City popup on Card Mode at the user's viewport, with accessible label/interaction | Existing City popup layout, Return as full-width row | Pre-fix live screenshot; offline Chromium renders at 1280×900, 390×844 and 320×568; PO approval of exact candidate in-game on 2026-10-15 | PM / Visual QA + PO | `user-validated` (scope-level; no claim of live verification at every viewport) |

## Root cause and negative evidence

- Core `src/core/bootstrap.js` excludes modules without `runsInCardMode` while
  `<html data-ppbui-card-mode="cards">` is active. Menu Bar opts in, Hunt Controls
  did not. After Card Mode's mode-change event, Hunt Controls cleanup returned the
  original Return button to the native map-action bar, hidden behind Cards styling.
  The City popup consequently contained only the ordinary eight shortcuts.
- Before the fix, `Card Mode retains the native Return to City action and returns
  to Game before its handler` failed because City had lost the original Return node.
- Card Mode navigation detection also excluded `data-ppbui-menu-context-action`
  so preserving the button alone would not return to Game before native dispatch.
- Remediation is scoped to Hunt Controls' Card Mode opt-in and the exact
  `hunt-return` contextual action in Card Mode's native-action selector.
- Independent UX review exposed another Cards-specific failure: if a native Hunt
  ended while Return retained focus, hiding the control stranded keyboard focus.
  A transition-only fallback now focuses the existing City trigger; focus in
  unrelated controls is untouched. This regression was RED before and GREEN after.

## Risks and gates

| Risk | Verification | Status |
| --- | --- | --- |
| Hidden/disabled native Return becomes spuriously actionable | Native bar hidden and native disabled regression | `pass` (synthetic) |
| Duplicate Return/action after toggling Card Mode or Menu Bar | Exact node, single call, menu disable/re-enable regression | `pass` (synthetic) |
| Context lost, badge or keyboard focus broken on Cards | Home focus, contextual `aria-label`, active/inactive visibility | `pass` (synthetic) |
| Return becomes hidden while keyboard focus is on it | Native Hunt active→inactive moves focus to City, but unrelated focus stays intact | `pass` (synthetic RED→GREEN) |
| CSS paint/clipping differs in the authenticated browser | Independent representative render or PO screenshot | `live-only` |

- Author regressions: missing Return and keyboard-focus-on-hidden-Return were
  independently identified, **RED** before their respective fixes and **GREEN** after.
- Author focused suites: `55/55 PASS` (Card Mode, Hunt Controls, Menu Bar
  layout/runtime and module registry).
- Full suite: `800/800 PASS` in `npm run validate`; build PASS.
- `npm run release:check -- v0.2.201`: PASS after updating the version authority
  in `userscript/metadata.txt` alongside package/package-lock.
- `git diff --check`: PASS (informational Windows LF→CRLF warnings only).
- Technical QA: **TECH READY** from independent read-only review of final SHA
  `63E1520E...A71AD3A`, P0/P1/P2=0. Reviewer checked equal rebuild bytes,
  55/55 focused tests, active/inactive focus, rapid Cards/Game, native bar/toolbar
  replacement, disable/re-enable, stable reconciliation and original native handler.
  Independent diff of approved 0.2.200 vs candidate executable confirmed only
  contextual Return changes and version metadata; Inventory executable unchanged.
- UX/A11y QA: **UX READY** from independent read-only review of exact final
  binary SHA `63E1520E...A71AD3A`, with no known P1/P2. Reviewer inspected the
  built focus handoff and independently exercised Home/Escape navigation, inactive
  Hunt, disabled Return, `aria-hidden`, focus preservation outside City, native
  click exactly once and Game-before-handler.
- Visual QA: **VISUAL EVIDENCE INSUFFICIENT** for the authenticated game; initial
  reviewer observed the desktop-only synthetic render. Follow-up offline Chromium
  captures from a regenerated current-source fixture are available at
  `work/card-return-201/{desktop,mobile,compact}.png`, with measurements recorded
  in `work/card-return-201/metrics.json` (1280×900, 390×844, 320×568). Each
  viewport shows Return first, occupying the full City row, visible, inside the
  viewport, center hit-testable and with **zero popup horizontal overflow**.
  The native action bar is CSS-hidden while Cards is active. These measurements
  are **synthetic local evidence**, not proof of the authenticated game's real
  toolbar anchoring, overlays or interaction. The independent read-only Visual QA
  reviewer inspected all three PNGs and their matching metrics, confirmed a
  legible, centered, full-width first Return row with no observed clipping and
  returned **LOCAL DESKTOP/NARROW LAYOUT PASS** as a subset. The overall result
  remains **VISUAL EVIDENCE INSUFFICIENT**: synthetic background icon artifacts
  are not production defects, and actual native popup anchoring/docking,
  pointer-coarse 40px target state, focus paint and gameplay are not verified.
  PO live observation is still required.
- Candidate: `dist/pokepixel-better-ui-0.2.201-card-return-city-candidate.user.js`,
  **1,697,452 bytes**, SHA-256
  `63E1520EBAB7531A33AB9E102A1C591A6BFC7A3B3D153BF9A533660B4A71AD3A`
  (identical to the generated default `dist/pokepixel-better-ui.user.js`).
- PO in-game approval of this Card Mode delta: **user-validated, 2026-10-15**.
- Commit, push, merge and release: **not performed or implied by previous approval**.

## PM evidence audit and handoff

Technical and UX evidence support AC-CR-01..04 on the exact built candidate and
independent reviewers found no remaining P0/P1/P2. No source changed after their
final binary review; documentation-only additions do not alter artifact bytes.
The earlier 0.2.200 executable was compared independently with the exact new
binary: only Return integration/focus and version metadata differ, preserving the
user-validated Inventory fix. `0.2.201` is newer than the validated `0.2.200`.

At the pre-live handoff, AC-CR-05 was **live-only**, not `VISUAL READY`:
desktop/mobile/compact offline screenshots covered synthetic responsive geometry,
but could not reproduce all authenticated native runtime styles, toolbar docking,
focus paint and Hunt state. The independent visual verdict remains historically
**VISUAL EVIDENCE INSUFFICIENT**; it is not retroactively converted to `VISUAL
READY`. The Product Owner subsequently validated the **exact** candidate in-game
on 2026-10-15, moving the approved corrective scope to **user-validated**. No
individual live tests of all viewport, input or assistive-tech variants were
reported. This is an acceptance decision, not authorization for repository release.

## Product Owner live acceptance — 2026-10-15

- Response: **"validado"** after delivery of the final 0.2.201 userscript.
- Scope: Card Mode / City contextual native `Return to City` corrective, including
  the focus recovery in the delivered candidate; the previously approved Inventory
  pagination 0.2.200 remains a distinct prior live acceptance.
- Approved artifact: `dist/pokepixel-better-ui-0.2.201-card-return-city-candidate.user.js`,
  **1,697,452 bytes**, SHA-256
  `63E1520EBAB7531A33AB9E102A1C591A6BFC7A3B3D153BF9A533660B4A71AD3A`.
- Status: **user-validated** for this corrective. Commit/push/merge/release remain
  pending applicable authorization; no GitHub release implied.

## Product Owner handoff checklist (historical)

With active classic Hunt and Cards displayed, open **City** and confirm **Return
to City** is the first, full-width action. Select it and verify one native return
to the city and switching from Cards to Game. When no Hunt is active, Return must
not be offered. Verify that other City shortcuts remain intact.
