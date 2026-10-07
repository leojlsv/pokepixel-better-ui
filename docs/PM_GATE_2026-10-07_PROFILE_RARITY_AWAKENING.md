# Pokémon Card — Rarity / Awakening summary

Scope: compact read-only summary beside the native HP / Experience meters in the
Better UI-decorated actionable PokémonCard. Native gameplay, Awakening actions and
server rules remain authoritative.

## Product Owner validation — 0.2.181

On 2026-10-07 the Product Owner clarified that the missing-bar screenshot was
captured with an outdated userscript and explicitly confirmed:
“A barra de raridade está aparecendo corretamente”. The relative rarity bar in the
delivered 0.2.181 candidate is **user-validated in-game**.

The exploratory 0.2.182 integration change was cancelled. Only that round's
experimental source/test delta was restored to the saved 0.2.181 baseline; the
delivered userscript was never rebuilt or replaced. Its SHA-256 remains
`381A2B059C9AA3E604A28521BFCB632A5F4248546717C86ADDF4D0B6E0FDEA7C`.
No commit, merge or publication is authorized by this validation record.

## Follow-up 0.2.181 — relative progress within each rarity

Product Owner correction on 2026-10-07: fill must be relative to the minimum and
maximum of each rarity. This supersedes the current/max formula of 0.2.180 only;
the existing composition, rarity color, HP/XP track and Awakening states remain.

| AC | Observable result | Evidence required | Status |
| --- | --- | --- | --- |
| `AC-PRA-13` | Fill is `(current - min) / (max - min)`, bounded to 0–100%. Legendary 1.62 in 1.55–1.69 is 50%; min is empty and max is full. | Numeric DOM regression and local rendered endpoints/midpoint | PASS; TECH/local VISUAL READY |
| `AC-PRA-14` | Both endpoints come from the same native Normal/Shiny `qualityBand()` result. Missing, non-finite, equal or reversed endpoints omit the bar. ARIA min/max/now use the same range and clamped value. | Normal/Shiny, clamp, invalid range and accessibility regressions | PASS; TECH/UX READY |
| `AC-PRA-15` | The adjustment changes only fill scale and accessible minimum. Existing visible values, rarity color, geometry, Awakening behavior and API count remain intact. | Bounded baseline diff and independent Technical/UX/Visual review | PASS; TECH/UX/local VISUAL READY |

The before-source snapshot and updated local fixture live in
`work/profile-rarity-181/`. No new gameplay rule, fixed production range or request
is introduced. In-game validation remains user-owned.

Evidence for the exact 0.2.181 candidate:

- Two focused ratio assertions failed against the old formula, then passed after
  the relative-range correction. Final focused Profile/progress suite: `48/48 PASS`;
  full product suite: `605/605 PASS`.
- Build, release contract (`v0.2.181`) and `git diff --check`: PASS.
- Userscript: `dist/pokepixel-better-ui.user.js`, `1,358,486` bytes, SHA-256
  `381A2B059C9AA3E604A28521BFCB632A5F4248546717C86ADDF4D0B6E0FDEA7C`.
- Render command: `node work/profile-rarity-181/render.mjs`, using retained native
  CSS snapshots and the existing isolated headless profile; fixture CSP blocks
  network access. Twelve cases at 320/360/390px retain same-row boxes, zero measured
  horizontal overflow, 6px tracks and matching rarity fill/label colors.
- Rendered fractions include Legendary 1.62 in 1.55–1.69 = 50%, Legendary minimum =
  0%, Epic maximum = 100%, and a synthetic Shiny range 2.50–2.99 at 2.75 = 51.02%.
  Fixture ranges are test inputs, not production tuning or new gameplay authority.
- `preview.png` SHA-256:
  `697D7F147486AFADF22164F4A7A92F70EE98659E61B1E57FBB05AC39FD2031AC`.
- `metrics.json` binds the render to controller SHA-256
  `0C6F22F83D1DA48F477DAF5E0EF8C3D6E3C16D7D5E4450495BF16B9B020833D5`;
  `dom.js` remains unchanged. `delivery-preview.png` is an unscaled pixel crop.
- Independent **TECH READY**, **UX READY** and **VISUAL READY (local Chromium
  evidence)**, no P0/P1/P2. Review confirms only ratio/native minimum changes,
  preserved geometry/state, and matching source/render fingerprints. Technical QA
  added numeric-string endpoints/current, lower/upper clamp and equal-range checks.
- Product Owner subsequently confirmed the rarity bar is correct in-game, as
  recorded above. No commit, merge or publication is performed.

## Historical follow-up 0.2.180 — proportional rarity bar

Product Owner scope on 2026-10-07: add only the missing rarity fill bar, reusing
the HP/XP track structure and the rarity color. The 0.2.179 layout and Awakening
states remain the baseline for this addition.

| AC | Observable result | Evidence required | Status |
| --- | --- | --- | --- |
| `AC-PRA-10` | A native-style track below the rarity label/value fills by current Quality / maximum of that rarity: 1.62/1.69 = 95.86%, 1.54/1.54 = 100%. | DOM numeric checks and local render | PASS; TECH READY |
| `AC-PRA-11` | The fill uses the same canonical rarity color as its label; track height, spacing and rounding match HP/XP. Both boxes remain aligned. | Chromium renders at 320/360/390px and independent Visual QA | PASS; local VISUAL READY |
| `AC-PRA-12` | Missing/invalid Quality or band maximum does not fabricate a percentage. Normal/Shiny use their native band; rerender and cleanup leave no duplicate bar or new API reads. | Focused regression and Technical QA | PASS; TECH/UX READY |

The fraction uses the displayed current and maximum, without subtracting the band
minimum or deriving an Awakening counter. Only visual fill is clamped to 0–100%.

Evidence for the exact 0.2.180 candidate:

- Focused Profile/progress tests: `48/48 PASS`; full product suite: `605/605 PASS`.
- Build, release contract (`v0.2.180`) and `git diff --check`: PASS.
- Userscript: `dist/pokepixel-better-ui.user.js`, `1,358,249` bytes, SHA-256
  `0167C106AA0F7BFDD5D6C10D19B4FB1DEBB6FF3862CB165078F2D85F35FA0B77`.
- Local render: `node work/profile-rarity-180/render.mjs`, reusing the existing
  isolated headless fixture profile; native CSS snapshots, network blocked by CSP.
- `preview.png` SHA-256:
  `4C32BC32DAEDE36189637668A5F2BED3DA9528256CD37ABD7638286C7B6286BF`.
- `metrics.json` binds the render to controller SHA-256
  `033DE38B6303CE50206F7A84D0CE56D04CF6DD6715383C3CC23350530C3CA319`;
  the Awakening parser in `dom.js` remains unchanged from 0.2.179.
- Eleven 320/360/390px cases have aligned boxes and zero measured horizontal
  overflow. Rarity and HP tracks are both 6px; rendered fill and label colors match.
  Normal/Shiny partial fractions and a full Epic bar match their input ratios.
- `delivery-preview.png` is an unscaled crop of the rendered Epic/Legendary pair.
- Independent Technical QA: **TECH READY**; reviewer-selected numeric-string
  over-cap check clamps to 100%. Independent UX/Visual QA: **UX READY** and
  **VISUAL READY (local Chromium evidence)**, no material P0/P1/P2.
- PM authorizes this exact candidate for user validation; in-game validation is
  pending. No commit, merge or publication is performed by this follow-up.

## Product Owner rejection and corrective 0.2.179

The Product Owner rejected 0.2.178 on 2026-10-07: the two boxes lacked deliberate
hierarchy/spacing and squeezed the HP/Experience text; an Epic at `1.54/1.54`
displayed an empty `Awakening —`. Earlier readiness is historical, not acceptance
of this corrective. Prime owns implementation and documentation; independent
Technical QA and UX/Visual QA review the corrected candidate.

| AC | Corrective requirement | Evidence required | Status |
| --- | --- | --- | --- |
| `AC-PRA-06` | Native HP/Experience values stay fully readable inside the left box; meter children cannot force their grid track wider than its allocated column. | Browser render and measured overflow at 320/360/390px; DOM restoration test | PASS; independent local VISUAL READY |
| `AC-PRA-07` | The right box has two deliberate label/value rows, a subtle divider, canonical rarity color and tabular numerals; numeric suffixes do not clip or touch the borders. | Representative browser render of Legendary example and rejected Epic cap state | PASS; independent local VISUAL READY |
| `AC-PRA-08` | A valid native non-AWK stage (rarity cap, challenge or God Tier) is displayed explicitly, rather than treated as missing data solely because `preview.awk` is absent. No fixed total or gameplay rule is invented. | Native-source evidence and regressions for stage variants | PASS; independent TECH READY |
| `AC-PRA-09` | Loading, failed read and valid completed stages are visibly distinct; async stale responses and cleanup cannot restore obsolete summary values. | Async regressions and state renders | PASS; independent UX/local VISUAL READY |

Both boxes remain side by side. Label/value wrapping is local and preserves full
native text; no smaller font is used to hide a space problem. A representative
local Chromium render is required before this corrective is handed off.

## Historical 0.2.178 Acceptance & Evidence Matrix

| AC | Observable result | Authority preserved | Required evidence | Status |
| --- | --- | --- | --- | --- |
| `AC-PRA-01` | The actionable PokémonCard shows two adjacent boxes on the progress row: native HP / Experience on the left and Rarity / Awakening on the right. | Native meter DOM and handlers remain owned by the game. | DOM regression + representative render | DOM PASS; render pending |
| `AC-PRA-02` | Rarity reads as `<Rarity> x<current>/<band max>`; e.g. `Legendary x1.62/1.69`. | `quality`, `quality_multiplier` and `PokemonCardData.qualityBand()` are the only value sources; missing data renders unavailable instead of being inferred. | Source + DOM regression | PASS |
| `AC-PRA-03` | Awakening reads as `Awakening <index>/<total>`; e.g. `Awakening 3/5`. | `Api.getAwakeningPreview().awk.index/total` is authoritative. Hover cards do not request previews; unavailable/failed previews fail closed. | Async DOM/API regression | PASS |
| `AC-PRA-04` | Native rerender and module cleanup restore the canonical meter placement before returning control to the host renderer. | No duplicate native state, no extra observer, no action interception. | Rerender + cleanup regression | PASS |
| `AC-PRA-05` | Both boxes remain in one row across the supported native card widths without horizontal overflow; long localized values may wrap inside their row and are never hidden or rewritten. | Existing container-responsive card behavior remains intact. | CSS contract + representative render | CSS PASS; render pending |

Visual acceptance requires rendered evidence. Automated DOM/CSS checks can prove
structure and lifecycle only; final in-game validation remains Product Owner-owned.

## Candidate 0.2.178 evidence

- Focused Pokémon Profile: `43/43 PASS`.
- Full repository suite: `600/600 PASS`.
- `npm run build`: PASS.
- `npm run release:check`: PASS (`v0.2.178`).
- `git diff --check`: exit `0`; only repository LF/CRLF conversion warnings.
- Exact userscript: `dist/pokepixel-better-ui.user.js`, `1,350,311` bytes,
  SHA-256 `E3C1F543FD9D2F41B3B85CDD81F1AE3F6E0A13691E89F3C1A80481077F2AAE47`.
- Regression covers the requested `Legendary x1.62/1.69` + `Awakening 3/5`, no
  Awakening request on hover or when the native AWK action is absent, shared cache,
  negative cache after API failure, explicit invalidation, out-of-order response
  fencing, native rerender restoration and cleanup restoration.

## Historical 0.2.178 independent gates

- **UX READY** — no remaining P0/P1/P2. Summary text remains visible/wrappable;
  locale follows the game; asynchronous Awakening exposes polite status and busy
  semantics without adding focus targets; actionable cards retain Rarity even when
  native Awakening is unavailable.
- **VISUAL EVIDENCE INSUFFICIENT** — no trustworthy exact-current Chromium render is
  available in this workspace after the local preview tooling was retired. Source,
  CSS and JSDOM evidence do not prove real card fit/clipping/overflow.
- **TECH READY** — no remaining P0/P1/P2. Native renderer delegation and DOM
  restoration remain reversible; Awakening cache invalidation, negative caching and
  out-of-order fencing are bounded; hover and cards without native AWK action do not
  issue preview requests.

The historical pre-live handoff was subsequently rejected by the Product Owner.
Those verdicts do not approve 0.2.179.

## Corrective 0.2.179 evidence

- Native contract: static-public `GeneticAwakening.js`, `renderStage` (618-630),
  `renderAWK` (758-771), `renderChallenge` / `renderGodTier` (813-851), and native
  branch selection (888-891), independently inspected 2026-10-07. `ApiClient.js`
  `getAwakeningPreview` returns the preview directly. No live game inspection.
- Focused Profile + progress-state tests: `47/47 PASS`.
- Full product suite: `604/604 PASS`; build/release contract/diff checks PASS.
- Exact userscript: `dist/pokepixel-better-ui.user.js`, `@version 0.2.179`,
  `1,356,830` bytes, SHA-256
  `660CA479282859A851A78BEB52533A314F8409C1C372E42F9C39383E4378100D`.
- Current production source fingerprints:
  - controller: `BF52D5E14620D2544F9BC15E6AA5D1E59229AF624010ADB8E0E48E7B26392E3E`;
  - dom: `99C53A81EBBC712694EBFB3097C908919C2050395834E97BF5924256BF37C2A1`.
- Render command: `node work/profile-rarity-179/render.mjs`. One isolated headless
  Chromium profile; static local HTML, native CSS snapshots and the current module.
  All network access is blocked by the fixture CSP. No game session is loaded.
- `work/profile-rarity-179/preview.png`: actual 320/360/390px component renders;
  SHA-256 `2F91C296675B8407F34AFA7F2520586B663F69906B00686249C655CDB5EDA103`.
  `metrics.json` records matching source fingerprints, same-row/equal-height boxes
  and zero measured horizontal overflow in all ten cases.
- `work/profile-rarity-179/delivery-preview.png` is an unscaled pixel crop of the
  360px Epic and Legendary cases, with explanatory labels outside the component.
- Independent **TECH READY**, no P0/P1/P2; reviewer-selected branch-precedence
  probe confirms `awk > challenge > god_tier` when multiple branches are supplied.
- Independent **UX READY** and **VISUAL READY (local component evidence)**, no
  P0/P1/P2. Reviewer inspected the renders before source, verified image/source
  fingerprints, and confirmed full readable meter text, hierarchy and local wrapping.
  The ten rendered cases cover AWK counters, Challenge, God Tier Challenge, MAX,
  loading and failed read. Terminal `God Tier` behavior is covered by source/DOM
  regression, not by a separate screenshot in this set.
- PM authorizes handoff of the exact 0.2.179 candidate for user validation.
  In-game acceptance remains **pending Product Owner**. No commit/merge/publication
  is performed by this corrective.
