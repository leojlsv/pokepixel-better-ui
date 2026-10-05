# Menu bar — F5 geometry and City shortcuts

Date: 2026-10-02

## Task

- Request: make the Poké Hub usable immediately after F5 without requiring a drag,
  and add `Geneticista`, `Nature` and `Evolution Center` to City.
- Branch / worktree: current `/pokepixel-better-ui` task branch; preserve unrelated
  working-tree changes.
- Previously Product Owner validated scope: existing menu-bar organization, native
  drag/collapse controls and the adaptive buff dock.
- Write owner: Feature / Module Engineer for `src/modules/menu-bar/**`, focused tests
  and this task record.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-MENU-F5-01 | After the Better UI menu bar mounts on a freshly loaded native Poké Hub, its root geometry is normalized inside the viewport and grouped hover/click menus do not require a prior drag to use viewport-positioned popups. | Native visual position as closely as possible, 8px native viewport margin, horizontal/vertical Better UI orientation. | Regression fixture with initial native transform/bottom anchor plus source review; Product Owner live F5 check. | Feature Engineer | Technical QA + Product Owner | `pass` |
| AC-MENU-F5-02 | Native drag, keyboard movement, collapse and later host geometry changes continue to work; cleanup does not roll back a position the host/user changed after Better UI mounted. | Native handlers and host-owned runtime geometry. | Node-identity/handler regression and post-interaction cleanup regression. | Feature Engineer | Technical QA | `pass` |
| AC-MENU-CITY-01 | City contains exactly one Better UI shortcut each named `Geneticista`, `Nature` and `Evolution Center`. | Existing native City destinations and their original nodes/listeners remain intact and unique. | DOM/order regression, cleanup regression and Product Owner live validation. | Feature Engineer | Technical QA + UX/A11y QA + Product Owner | `pass` |
| AC-MENU-CITY-02 | The three City shortcuts invoke the game's exposed `PokeIdle.NPC.open()` with the same native NPC kinds used by `NpcInteraction`: `iv`, `nature`, `evolution`. | Server/game validation and the native NPC controller remain authoritative; no network interception or duplicated gameplay state. | Public native-source contract review plus invocation regression using a stubbed NPC controller. | Feature Engineer | Technical QA | `pass` |
| AC-MENU-CITY-03 | The new City entries remain reachable by pointer and existing group keyboard navigation, and disappear on module cleanup without changing native destination IDs. | Escape/Home/End/Arrow navigation, focus behavior and native action count. | Focus/keyboard/cleanup regression. | Feature Engineer | UX/A11y QA | `pass` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| R-01 | The host starts the toolbar with a transformed/edge anchor; Better UI fixed-position dropdown coordinates can then be resolved against the transformed ancestor until native `moveHub()` runs. | Synthetic transformed-root fixture must work before any drag, including late measurable layout. | `pass` |
| R-02 | Restoring the initial root style on cleanup after a native drag or silent host geometry write could snap/mix the toolbar back into its F5 position. | Change geometry after handle interaction and by silent host write, stop Better UI, verify the authoritative geometry survives atomically. | `pass` |
| R-03 | Better UI-owned City buttons could accidentally enter the native `data-menu-id` lifecycle, duplicate during reconciliation or remain stale when `PokeIdle.NPC` hydrates late. | Stable reconciliation/native-action-count regressions plus late native-controller hydration. | `pass` |

## Gate results

- Author verification: menu-bar 33/33 PASS; buff-strip 10/10 PASS; combined
  build/menu/buff contract 44/44 PASS; full repository suite 602/602 PASS;
  `npm run build` PASS; `git diff --check` PASS.
- `TECH READY / TECH NOT READY`: `TECH READY` — exact 0.2.134 re-review found no
  remaining P0/P1/P2/P3; atomic geometry cleanup, late measurable layout, late NPC
  hydration, first-key keyboard recovery, remount/isIntact and buff-strip interaction
  passed independent review.
- `UX READY / UX NOT READY`: `UX READY` — exact 0.2.134 re-review found no
  remaining P0/P1/P2/P3; SVG/disabled states, late NPC hydration, first-key
  keyboard navigation, focus and cleanup passed review.
- `VISUAL READY / VISUAL NOT READY / VISUAL EVIDENCE INSUFFICIENT`:
  local pre-live evidence remained insufficient, but the Product Owner subsequently
  validated the implemented adjustments in the live client on 2026-10-02.
- Exact artifact/version/hash under final independent re-review: `0.2.134`,
  `dist/pokepixel-better-ui.user.js`, SHA-256
  `38837A0928588288BB5E59C1696690C486622F02D72AF20F86E59EC6F419D773`.
- Product Owner live gate: `PASS` for the validated 2026-10-02 adjustments.

PM handoff decision: `USER-VALIDATED` — `TECH READY`, `UX READY`, with Product Owner
live validation closing AC-MENU-F5-01 and the rendered City composition on 2026-10-02.

## Product Owner validation checklist

- F5 with the bar in the reported bottom-edge state: hover/click City before dragging.
- Confirm an 8px viewport gap and that dragging/collapse still behave normally.
- Open City and exercise `Geneticista`, `Nature` and `Evolution Center` once each.
