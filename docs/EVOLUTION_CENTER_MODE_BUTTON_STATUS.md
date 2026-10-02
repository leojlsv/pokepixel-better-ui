# Evolution Center — mode buttons

Date: 2026-10-02
Candidate: Better UI `0.2.140`

## Product Owner request

Improve Evolution Center UI/UX without adding gameplay functionality. The native
`All Evolutions` mode dropdown must become an actual button-based control. The visible
button labels are `All`, `Normal` and `Mega`, and a newly opened Evolution Center must
start with `Normal` selected.

## Acceptance & Evidence Matrix

| ID | Requirement | Must preserve | Evidence | Status |
| --- | --- | --- | --- | --- |
| AC-EVO-01 | Evolution mode is presented as buttons rather than a dropdown | Native mode select and change handler remain authoritative | JSDOM integration + local browser render | pass |
| AC-EVO-02 | A newly opened Evolution Center starts on `Normal Evolution` | No evolution action is executed; only filter mode changes | JSDOM native-change regression, including host preselect override | pass |
| AC-EVO-03 | `All`, `Normal` and `Mega` retain the existing three filter states | Clear Filters can still return to native `All`; no new gameplay state | JSDOM rerender/clear regression | pass |
| AC-EVO-04 | Current mode is explicit and keyboard focus remains visible | Shared `aria-pressed` selected state + project focus ring | Browser computed style + focused render | pass |
| AC-EVO-05 | Mode buttons fit the existing Evolution filter grid without clipping/overflow | Existing search/filter/result layout remains unchanged | Browser render at 1100×820 and 720×900 | pass |
| AC-EVO-06 | Better UI cleanup restores the native select | No cloned game logic or stale proxy survives teardown | cleanup regression | pass |

## Integration approach

Better UI keeps the native `<select>` connected and its original `change` listener
authoritative, but visually replaces it with a three-button proxy (`All`, `Normal`,
`Mega`). Button activation only sets the native value and dispatches the native change
event. `Normal` is applied once on the initial enhancement of a newly opened Evolution
Center; subsequent native rerenders preserve their own state, including Clear Filters
returning to `All`.

## Verification

- Better UI: `0.2.140`
- Userscript SHA-256: `174FDDA960480F864A601470A26978CCED8E196E61FA842D79808D5C24085544`
- Evolution Center + registry focused tests: `8/8 PASS`
- Full repository suite: `616/616 PASS`
- Build: `PASS`
- `git diff --check`: `PASS`
- Render evidence:
  - `work/evolution-center-mode-1100.png`
  - `work/evolution-center-mode-720.png`
  - `work/evolution-center-mode-focus-1100.png`
- Computed selected state: border `rgb(227, 192, 84)` (`--ppbui-selected`), text `rgb(235, 236, 220)`
- Computed focused state: outline `rgb(84, 186, 210)` (`--ppbui-focus`)
- Independent technical QA: `P0/P1/P2/P3 = 0`, `TECH READY` on exact `0.2.140`
- Render-first UX/visual gate: `PASS` on the regenerated 1100/720/focus evidence
- Product Owner in-game validation: `PASS` — exact `0.2.140` adjustments validated on 2026-10-02.
