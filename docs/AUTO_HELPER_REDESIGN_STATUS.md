# Auto Helper Redesign — PM Acceptance & Evidence Record

Recorded: 2026-09-17

## Task

- Request: Product Owner advanced the redesign sequence from live-validated Storage
  `0.2.16` to **Auto-Helper**.
- Branch / worktree: `refactor/team-pixel-art` / existing intentionally dirty redesign worktree.
- Baseline userscript: exact `0.2.16`, 578,005 bytes, SHA-256
  `8148431ADA318843CF8BE325CE0241D0F9895A312C3B7C78C648FC11189608FD`.
- Baseline focused Auto Helper verification: `11/11 PASS`.
- Historically Product Owner-validated functional scope: grouped settings,
  save/close/reopen behavior, compact consumable selection and per-quality
  Keep/Sell/Extract destinations.
- Explicitly out of scope: new gameplay automation, new server/API behavior,
  payload/schema changes, entitlement changes, new assets, reopening Storage/Team.
- Design source: approved MASTER plus candidate `pages/auto-helper.md` implementation contract.

## Baseline finding

The current enhanced Auto Helper is functionally mature but only partially migrated
to the project visual system. Module-local CSS already consumes several `--ppbui-*`
tokens, yet the enhanced root does not currently establish the same full PPBUI
window/root/scroll ownership used by migrated modules. The native Auto Helper baseline
still defines olive/green rounded sections, Arial typography, 4–7px radii and native
field/button chrome. The migration must remove that presentation leakage without
changing the validated settings/save lifecycle.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Status |
| --- | --- | --- | --- | --- |
| `AH-01` | Auto Helper shell/body is charcoal, square and uses project typography | native window geometry/close behavior | host-realistic render + source ownership audit | `pass` |
| `AH-02` | Save/resource rail has stable Loading/Saved/Pending/Error presentation and square actions | serialized saver, Retry/Refresh behavior, live region | state render + focused tests + UX QA | `pass` |
| `AH-03` | Support is two aligned Function/Consumable/Condition rows | native potion/revive/HP controls and item IDs | render + node/listener regression | `pass` |
| `AH-04` | Capture keeps Normal/Shiny peer hierarchy and full-width species filter | premium/disabled logic, species debounce/value | render + focused tests | `pass` (`0.2.18`) |
| `AH-05` | All enhanced fields/selects/buttons are square PPBUI chrome with no host radius/olive leakage | native values, keyboard order, disabled state | hostile-host render + specificity regression | `pass` |
| `AH-06` | Destination master/license rail remains compact above the matrix | native master toggles/entitlements | render + semantic regression | `pass` |
| `AH-07` | Destination matrix stays one quality per row with one Keep/Sell/Extract selection while avoiding excessive internal ruling | exclusivity, assignments, paused semantics | render + focused tests + UX QA | `pass` (`0.2.18`) |
| `AH-08` | Rarity color remains a compact domain cue, not broad card coloration | native quality identity/order | state render + source audit | `pass` |
| `AH-09` | Locked/paused/unavailable states remain readable without opacity-only meaning | disabled native controls and assignments | state render + UX QA | `pass` |
| `AH-10` | Loading/reconstruction never flashes hidden native pickers/grids | pending draft + inert/bootstrap contract | focused adversarial test | `pass` |
| `AH-11` | Focus/caret/scroll/disclosure state survives native reconstruction | session focus/selection/scroll/groups | focused adversarial test + UX QA | `pass` |
| `AH-12` | Narrow layout has no primary-workflow clipping/horizontal overflow | DOM/tab order and controls | narrow render | `pass` |
| `AH-13` | Auto Helper subtree uses shared 10px square scrollbar only within owned scope | unrelated host scrollbars | render + cleanup/source audit | `pass` |
| `AH-14` | Cleanup leaves no PPBUI classes/styles or stale enhanced behavior | native editor reload + original DOM | lifecycle regression + TECH QA | `pass` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| `R-AH-01` | Native Auto Helper CSS has rounded olive sections/fields and host master rules may use stronger selectors/`!important` | corrected host-snapshot render plus computed-style/specificity probe | `closed` |
| `R-AH-02` | Adding root PPBUI ownership without exact cleanup could leak classes/scrollbar styling after disable | cleanup regression and class snapshot | `closed` |
| `R-AH-03` | Visual control replacement could accidentally bypass native checked/disabled state or saver capture handlers | node identity/value/listener tests | `closed` |
| `R-AH-04` | Bootstrap/reconstruction changes can expose original pickers or restore focus to the wrong control | slow-init + reconstruction adversarial tests | `closed` |
| `R-AH-05` | Destination redesign can accidentally make locked Keep/Sell/Extract appear actionable or alter one-per-row exclusivity | disabled-state render + exclusive-value regression | `closed` |
| `R-AH-06` | Desktop-only spacing can clip the 760px/native window or narrow layouts | representative + narrow renders | `closed` |

## Current gate state

- Intake: complete.
- Previously validated functional contract: frozen unless a concrete regression is found.
- Design contract: candidate page created under approved MASTER; independent pre-implementation design audit completed with `P0=0`, no design blocker.
- Baseline focused Auto Helper: `11/11 PASS` on exact `0.2.16`.
- Exact `0.2.17` passed local TECH/UX/VISUAL gates but was live-rejected by the Product
  Owner on 2026-09-17 for bounded visual issues only: Normal/Shiny composition, weak
  Shiny visual distinction and excessive destination-matrix line density. Functional
  behavior was not reopened.
- Implementation: corrective exact `0.2.18` candidate. The migration retains reversible
  PPBUI window/body/scroll ownership, square Miyazaki shell/disclosures/fields,
  semantic save-state rail, neutral destination matrix and window-width container
  fallback without changing native settings controls or saver/payload behavior.
- Exact userscript: `590,517` bytes, SHA-256
  `A37CF2191FD7A47DE48EBAB05A5372E2A944BECF44DDD370931AA35F44389D71`.
- Focused Auto Helper verification: `13/13 PASS`.
- Full automated suite: `277/277 PASS`.
- Build: PASS.
- Render-first author preflight found and corrected one real regression before review:
  applying the shared `.ppbui-button` primitive to Retry made its flex display defeat
  the native `hidden` attribute in Saved state. The final candidate explicitly
  preserves `[hidden]` and a regression covers the state.
- Host-realistic `0.2.18` render evidence loads both native `.pokeidle-panel` master
  CSS and the captured native AutoHelper CSS:
  - `work/auto-helper-0.2.18.png`, `43,895` bytes, SHA-256
    `ACF860152266D8FF77BE463530B8EE104FA506F6BAD065068B98791444AFD658`;
  - `work/auto-helper-0.2.18-capture.png`, `40,820` bytes, SHA-256
    `423ECF43DFD4E09C537D0111FE4F3F03D08232F37C58CACC128821EA2F634C27`;
  - `work/auto-helper-0.2.18-matrix.png`, `35,604` bytes, SHA-256
    `4A5D577280B1522BDA21CF357FC5DC0F279CFC822078282BEA0D5E848157F917`;
  - `work/auto-helper-0.2.18-narrow.png`, `34,906` bytes, SHA-256
    `5CB5F02D7354D374844E793E68D03CCBFF4DEC3F9DEAA05E7E67EE0DE9B733A2`.
- Author render inspection: Normal/Shiny are side-by-side at the 760px live-like
  width and stack only at the 520px true-narrow render; Shiny has stronger cyan
  typographic identity; destination body grid lines are removed while row alignment,
  gold selection, cyan focus and paused copy remain readable.
- Technical QA for exact `0.2.18`: **TECH READY**, `P0=0 P1=0 P2=0 P3=0`.
  Reviewer reconfirmed the exact artifact and `13/13` focused suite, then passed an
  adversarial unsupported-Extract/cleanup probe: Keep/Sell-only rendering remained
  correct, 10 idle syncs caused no new requests, native input identity/listeners were
  restored, module-owned Shiny class was released while a preexisting class survived,
  and group/scroll state persisted. No CSS selector escaped Auto Helper ownership.
- Historical Technical QA on exact `0.2.17`: **TECH READY**, `P0=0 P1=0 P2=0 P3=0`.
  The independent reviewer reconfirmed the exact dist identity and `13/13` focused
  suite, then ran an unsupported-Extract/cleanup adversarial probe. Keep/Sell-only
  rendering remained correct, native checkbox/species nodes retained identity,
  repeated idle `sync()` caused no new requests, focus/selection/group/scroll state
  persisted, and cleanup restored native listeners/inert state while removing owned
  PPBUI/matrix state.
- UX/A11y QA for exact `0.2.18`: **UX READY**, `P0=0 P1=0 P2=0 P3=0`.
  Native capture sections, checkbox/radio/select/text semantics, details/summary,
  paused/disabled ARIA and saver/focus/caret contracts remain unchanged. Reviewer
  found no synthetic tabindex and confirmed focus does not alter the selected
  destination radio.
- Historical UX/A11y QA on exact `0.2.17`: **UX READY**, `P0=0 P1=0 P2=0 P3=0`.
  Reviewer-selected reconstruction/focus probing confirmed no synthetic tab stops,
  disabled destination radios remain unavailable, pending species edits preserve
  focus/caret, native details/summary and form semantics remain intact, and the
  status/`aria-busy`/paused-state contracts remain meaningful.
- Visual Regression QA for exact `0.2.18`: **VISUAL READY**, `P0=0 P1=0 P2=0 P3=0`.
  Exact render identities were independently verified. Normal/Shiny remain equal
  side-by-side peers at the live-like 760px width and stack cleanly at true narrow;
  Shiny's cyan uppercase/small-caps heading is visibly distinct without reading as an
  action/focus state; destination body grid lines are gone, subtle row bands reduce
  visual fatigue, while gold selection, cyan focus and paused copy remain clear.
- Historical Visual Regression QA on exact `0.2.17`: **VISUAL READY**, `P0=0 P1=0 P2=0 P3=0`.
  The independent reviewer verified all four exact render identities. No legacy
  olive/rounded host chrome leaks into the enhanced surface; Saved/Error rails,
  aligned Support, desktop/narrow Capture, species field, crisp item art, destination
  matrix, paused/locked states, independent gold selection/cyan focus and square
  scrollbar all remain coherent without clipping/overflow blocker. This is local
  render evidence, not live proof.
- Product Owner live validation: exact `0.2.17` was rejected on bounded visual scope;
  exact `0.2.18` was subsequently live-validated by the Product Owner with
  **“Auto-Helper validado!”** on 2026-09-17. The Auto Helper gate is closed for this
  candidate: previously approved functionality remains intact and the corrected visual
  composition/density is accepted live.
