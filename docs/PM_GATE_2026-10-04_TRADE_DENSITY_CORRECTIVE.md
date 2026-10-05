# PM Acceptance & Evidence Record — Trade density corrective

## Task

- Request: analyze and correct the Trade module from the Product Owner live screenshot supplied on 2026-10-04.
- Branch / worktree: `fix/trade-density-0.2.158` in the primary repository working tree.
- Baseline artifact / version: Better UI `0.2.156` (`main` at `2cfd5cb`).
- Previously Product Owner validated scope: no current visual-ready claim is reused for this corrective. Native offer actions, inventory add/remove handlers, Pokémon filters/tags and item-category filtering from `main` remain the functional baseline and must not regress; the 2026-10-04 screenshot explicitly reopens Trade layout/density.
- Explicitly out of scope: trade rules, server/network behavior, offer eligibility/payloads, item quantities, Pokémon filtering semantics, global theme changes, unrelated modules, live-game inspection by agents, commit/push/merge.
- Write owners: Project Manager / Module Engineer (prime). Independent Technical QA, UX/A11y QA and Visual Regression reviewers are read-only.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | At desktop Trade widths, each twenty-slot offer grid renders as `5×4` fixed 56px columns. Empty rows stay at least 56px while rows containing taller native cards grow intrinsically; filled cards never overlap the next row. | Native slot nodes, ordering, offer contents and handlers. | Source + focused regression + representative local render with filled items. | Module Engineer | Technical QA + Visual Regression | `pass` |
| AC-02 | The Trade inventory uses the available horizontal space instead of staying hard-capped at four columns; 56px native inventory cards auto-fill the list while the list remains the owned scrolling surface. | Native item/Pokémon cards, quantity handlers, tabs, search and category/filter behavior. | Source + focused regression + representative local render. | Module Engineer | Technical QA + Visual Regression | `pass` |
| AC-03 | The desktop shell keeps received offer, own offer and inventory as the three semantic columns, but the Trade window has a bounded preferred width (`1280px`) and does not automatically fill a wider viewport. The inventory receives the largest flexible share without causing root horizontal overflow. | 0.2.82 semantic order and native headings/actions/status. | Source + responsive render measurements at representative wide desktop and split widths. | Module Engineer | UX/A11y + Visual Regression | `pass` |
| AC-04 | The player's balance is colocated with the editable currency row when that row exists, instead of remaining in a detached empty band. | Native balance node and currency input/action listeners; no cloned gameplay node. | Synthetic DOM regression covering multiple gold rows + representative render. | Module Engineer | Technical QA + UX/A11y | `pass` |
| AC-05 | At container widths `<=959px`, the two offers remain side by side and inventory spans the next row; `<=519px` becomes one semantic column; offer capacity stays reachable without horizontal clipping, using 4/5/4 fixed columns at the established breakpoints. | Existing 0.2.82 responsive semantics and no document-level horizontal scroll. | Focused CSS contract + representative local narrow renders if available. | Module Engineer | UX/A11y + Visual Regression | `pass` |
| AC-06 | Trade filters/dialog retain keyboard focus, result counts and cleanup; disabling/unmounting the module removes only Better UI-owned styles/classes/scroll claims and restores wrapped scene methods. | Existing lifecycle and accessibility behavior. | Focused tests + lifecycle/source review. | Module Engineer | Technical QA + UX/A11y | `pass` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| R-01 | Host Trade CSS changed since the original 0.2.82 corrective, so relying on native grid tracks can regress again. | Explicit scoped grid columns/rows plus adversarial host-style render. | `pass` |
| R-06 | A fixed 56px auto-row can be smaller than a populated native card and cause visual overlap with the following offer row. | Twenty-slot render with two tall populated cards followed by empty rows. | `pass` |
| R-07 | `width:100%` can make the Trade window consume the entire desktop viewport even when its content does not require it. | Wide render in a ~1900px viewport proving bounded window width. | `pass` |
| R-02 | Auto-fill inventory tracks could overflow if host card/gap minimums exceed the assumed 56px cell width. | Narrow render/measurement and no-root-overflow assertion. | `pass` |
| R-03 | Moving balance to the wrong `.trade-gold-row` could detach it from the editable offer amount when multiple rows exist. | Regression fixture with two gold rows, only one containing an input. | `pass` |
| R-04 | `align-items:start` could expose native height assumptions for status/actions. | Representative render checking action/status reachability and nearby composition. | `pass` |
| R-05 | A source-only green test could falsely imply the visual defect is fixed. | Mandatory rendered Visual Regression evidence or explicit `VISUAL EVIDENCE INSUFFICIENT`. | `pass` |

## Product Owner live revalidation — `0.2.157` rejection

On 2026-10-04 the Product Owner rejected the exact `0.2.157` candidate in-game with
two concrete findings: the Trade window still auto-stretched to the full available
width, and item slots inside the offer visually overlapped. The new live screenshot
also established that the native offer capacity is twenty slots (`5×4` desktop), not
the ten-slot assumption used by the original synthetic fixture. All prior `0.2.157`
TECH/UX/VISUAL verdicts remain historical evidence only and do not authorize handoff.

## Gate results — `0.2.158`

- Author verification: focused Trade/Pokémon Tools/Design System `43/43 PASS`; full `npm test` `641/641 PASS`; `npm run build` PASS; `git diff --check` PASS (repository LF/CRLF warnings only).
- `TECH READY / TECH NOT READY`: **TECH READY** — independent delta review found P0/P1/P2/P3 = `0/0/0/0`; the bounded root width and intrinsic offer-row growth directly address the two `0.2.157` live failures without reopening native handlers/state/lifecycle.
- `UX READY / UX NOT READY / not triggered`: **UX READY** — independent delta review found P0/P1/P2/P3 = `0/0/0/0`; the change remains CSS-only and preserves DOM/tab order, native offer nodes/handlers, dialog/filter logic and focus restoration.
- `VISUAL READY / VISUAL NOT READY / VISUAL EVIDENCE INSUFFICIENT / not visible`: **VISUAL READY** — independent render-first review found P0/P1/P2/P3 = `0/0/0/0`. At `1907px` the window is visibly bounded to ~`1280px`; `5×4` twenty-slot offers show tall populated cards without row overlap; split/500/320 remain contained without horizontal clipping or collisions.
- Exact artifact/version/hash reviewed: candidate `0.2.158`, `dist/pokepixel-better-ui.user.js`, `1,274,949` bytes, SHA-256 `CBF550AF97F93E3DD9DD34C1E34D8B6D874FB59BC20840ACE4CEB80E40AA0049`; exact identity independently confirmed.
- Evidence unavailable: live PokePixel inspection is intentionally unavailable to agents; Product Owner owns the final in-game gate.

### Local visual evidence — `0.2.158` corrective

- `.local-evidence/trade-0158-wide.png` — `1907×700`, SHA-256 `7415D6152995D5A8DFFD2A8AD3B0D1A4926433DE156DDCE7BA420DA6251A6870`; hostile host attempts full width, twenty-slot offers, two populated tall item cards.
- `.local-evidence/trade-0158-split.png` — `760×1100`, SHA-256 `02E8146519019945F5996FAC86F43F6EE6126504A0B6C5EF0DB19ECDDDF6B3F1`; split layout with twenty-slot offers.
- `.local-evidence/trade-0158-narrow.png` — `500×1400`, SHA-256 `2090A90CDCECD11EC0BC35FF67041616E006ACB7F33703C4758EF44D675363F5`; single-column layout with populated offer cards.
- `.local-evidence/trade-0158-320.png` — screenshot `500×1400` with fixture constrained to `320px`, SHA-256 `510F6D8E0983EE59231AF11042FF0B1760B3C99CB3EF0C9316655D38FB54DB63`.

The preview imports the current `createTradeUI()` source and deliberately supplies hostile host geometry matching the reported failure modes: full-width root, flexible/stretched host rows, twenty native offer slots, tall populated cards, host minimum height, and a four-column native inventory baseline. It is representative component evidence, not live-game evidence.

## PM evidence audit — `0.2.158`

1. The two live `0.2.157` failures have direct corrective evidence: **yes** — bounded wide-window render and populated twenty-slot offer render.
2. Technical integration remained unchanged outside the Trade presentation delta: **yes** — no adapter/gameplay/native-handler changes.
3. Fresh independent review covered the exact `0.2.158` artifact: **yes** — TECH READY, UX READY, VISUAL READY, all P0-P3 zero.
4. Visual verdict used actual new renders with twenty slots and populated cards: **yes**.
5. Responsive coverage includes wide `1907px`, split `760px`, narrow `500px`, and constrained `320px`: **yes**.
6. Live PokePixel validation is still distinct and Product Owner-owned: **yes**.

## PM decision

`PM ACCEPTED — exact 0.2.158 candidate authorized for Product Owner validation`

Rationale: `0.2.157` was rejected in-game; `0.2.158` directly corrects both newly evidenced root causes and has passed fresh TECH/UX/VISUAL delta gates with no P0-P3 findings. Repository completion remains unauthorized until Product Owner live validation.

## Product Owner validation checklist

After fresh gates, validate only the reopened Trade surfaces on exact candidate `0.2.158`:

1. Open a wide desktop Trade: the window must remain visibly bounded instead of filling the full viewport; both twenty-slot offers should be `5×4` and filled item cards must not overlap the next row.
2. Confirm `Seu saldo` is visually attached to the editable dollar row and updates normally when the native Trade rerenders.
3. Add/remove one item and one Pokémon, edit the dollar amount, then use Confirm/Cancel as appropriate; native actions and filtering must still behave exactly as before.
4. If the Trade pane is narrowed, confirm the split layout keeps both offers side by side with inventory below, then the narrow layout becomes one column without horizontal clipping.
