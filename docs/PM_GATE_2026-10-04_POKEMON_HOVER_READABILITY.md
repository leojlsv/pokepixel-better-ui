# Pokémon Card Hover — Readability / Usability Redesign

## Intake

- Product Owner request: redesign the Pokémon hover with focus on readability and usability.
- Reference evidence: Product Owner screenshot from 2026-10-04 showing the enriched native PokémonCard with identity, status/actions, HP/EXP, Current Moves, Battle Stats, Genetics and the adjacent details surface.
- Runtime ownership: the native `.pokemon-card--hover/.pokemon-card--pinned/.pokemon-card--sheet` remains authoritative. Better UI may decorate/reorder existing native nodes and add its owned Current Moves/Profile affordance, but must preserve native handlers, state and cleanup.
- Live validation remains Product Owner-owned. Local preview/tests can establish technical and representative visual readiness only.

## Acceptance & Evidence Matrix

| ID | Requirement | Must preserve | Evidence | Owner | Reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-PH-01 | Identity reads first: portrait/name/species remain the strongest anchor, followed by level/rarity/IV/power in a compact, scannable rail without duplicate operational status. | Native identity/status semantics and exact authoritative values. | Local render + source/DOM inspection. | Feature Engineer | UX/Visual QA | met |
| AC-PH-02 | Pinned/sheet action controls remain readable and operable without clipped labels; the transient pointer hover remains read-only. | Native action nodes/listeners/disabled state; Profile opens the exact creature only where an action dock exists. | DOM regression + narrow local render. | Feature Engineer | Technical + UX QA | met |
| AC-PH-03 | HP/EXP keep exact text values and clear rails with consistent label/value alignment. | Native meter values and semantic HP color. | Local render + DOM inspection. | Feature Engineer | UX/Visual QA | met |
| AC-PH-04 | Current Moves is a primary data block: four moves remain in authoritative order, with icon, move name and Element/Power metadata readable at normal width. | Existing move read/hydration/cache lifecycle; no parallel gameplay state. | Focused regression + local render. | Feature Engineer | Technical + UX/Visual QA | met |
| AC-PH-05 | Battle Stats and Genetics use consistent section rhythm, readable labels and tabular/right-aligned values; total IV appears once in the top badge rail and is not repeated in Battle Stats. | Native section/row content and stat semantics. | Local render + DOM/source inspection. | Feature Engineer | UX/Visual QA | met |
| AC-PH-06 | Card content has no horizontal clipping at representative 320/360/390px card widths; layouts reflow before labels become unreadable. | Native card positioning/host ownership; no global viewport rules. | Deterministic local preview at 320/360/390. | Feature Engineer | Visual QA | met |
| AC-PH-07 | Keyboard focus remains visible on interactive pinned/sheet controls and native handlers still fire exactly once after Better UI reorders/styles the card. | 2px focus contract, original nodes/listeners, cleanup restoration, rerender idempotence. | Focused DOM tests + adversarial QA. | Feature Engineer | Technical + UX QA | met |
| AC-PH-08 | Neutral chrome follows MASTER current-game surfaces/1px lines while gameplay colors stay semantic; the redesign avoids nested decorative framing. | Current palette/tokens and native domain colors. | Local render + design-contract review. | Feature Engineer | UX/Visual QA | met |

## Design contract

- Treat the card as four reading bands: **identity/status → actions/vitals → current moves → combat/genetics**.
- Preserve the native header and its portrait/name/species. Use spacing and type scale to make it the first visual stop.
- Keep level/rarity/status/power compact. Status icons retain accessible names; semantic color may identify gameplay meaning but neutral chrome stays on the shared current-game palette.
- Pinned/sheet actions use a stable wrapping grid with readable labels; transient hover receives no invented action.
- Current Moves keeps the existing two-column order at normal card width. At constrained width it may stack to one column rather than force horizontal overflow.
- Native data sections share one heading/row rhythm: 12px heading role, quieter labels, tabular values, 1px separators and no extra nested boxes.
- The native card becomes its own inline-size container so reflow follows actual card width instead of a generic device breakpoint.

## Evidence boundary

The external UI/UX search script referenced by the selected skill is not present in the installed `/skills/ui_ux_pro` package in this workspace. No database search result is claimed. This task therefore uses the verified project-native guidance in `.skills/ui_ux_pro.md`, MASTER, the Team/Profile contracts, the Product Owner screenshot, deterministic local preview renders and independent review.

## Candidate evidence — 0.2.162

- Focused Pokémon Profile regression: `39/39 PASS` after the final focus-outline correction.
- Full repository suite before the final CSS-only focus correction: `1312/1312 PASS`; the affected focused suite was rerun green after that correction.
- Build: `PASS`.
- `git diff --check`: exit `0`; only repository LF/CRLF conversion warnings.
- Deterministic native-card renders:
  - `work/pokemon-hover-390-final.png` — 360 px outer card, `clientWidth=358`, `scrollWidth=358`;
  - `work/pokemon-hover-360-final.png` — 344 px outer card, `clientWidth=342`, `scrollWidth=342`;
  - `work/pokemon-hover-320-final.png` — 304 px outer card, `clientWidth=302`, `scrollWidth=302`;
  - `work/pokemon-hover-390-focus-final.png` — Profile action with the explicit 2 px cyan focus ring and 2 px separation.
- All three responsive renders keep six representative actions reachable and retain the four Current Moves without horizontal root/card overflow.
- Exact delivery artifact: `dist/pokepixel-better-ui.user.js`, `@version 0.2.162`, `1,317,437` bytes, SHA-256 `224222E1CAA11ADB9B9CFEF6B31F1E13DFDA59BC28E802B974F5C6EECC28C544`.
- User-owned in-game validation: **APPROVED on 2026-10-04**.

## Independent gate verdict

Read-only independent review of the final worktree and exact-current renders returned:

- **TECH READY** — native renderer delegates once; rerender releases prior decoration; moved action nodes/listeners remain native; cleanup restores action placement, hidden state, owned attributes/nodes and renderer ownership; stale move hydration remains token/epoch guarded.
- **UX READY** — hierarchy, action reachability, exact HP/EXP values, four Current Moves, Battle Stats/IV, Genetics and explicit keyboard focus satisfy the recorded contract without inventing a second interactive hover.
- **VISUAL READY** — exact-current 320/360/390 renders show no clipping/collision or horizontal overflow; six representative actions reflow cleanly and the 390 focus render shows the required cyan 2 px focus indicator.

PM handoff is authorized for Product Owner in-game validation of candidate `0.2.162`. Merge/integration remains gated on that user-owned result.

## Corrective candidate — 0.2.163

Product Owner review identified two remaining information-weight problems in `0.2.162`:

- `ACTIVE/PROTECTED` repeated states already represented by Equip and Lock/Unlock actions;
- IV was visually demoted into Battle Stats despite being a high-value Pokémon-quality fact.

`0.2.163` applies the corrective rule:

- pinned/sheet with native actions: Active/Protected are hidden and fully reversible;
- transient hover without actions: those statuses remain compact/read-only;
- IV is promoted immediately after rarity as a light-green chip and removed from the Battle Stats heading.

The responsive/layout contract from `0.2.162` remains unchanged and must be revalidated on the exact
`0.2.163` artifact before Product Owner handoff.

### 0.2.163 evidence

- Focused Pokémon Profile regression: `39/39 PASS`.
- Full repository suite: `1312/1312 PASS`.
- Build: `PASS`.
- `git diff --check`: exit `0`; only repository LF/CRLF conversion warnings.
- Exact-current renders:
  - `work/pokemon-hover-0163-320.png` — no horizontal clipping/collision;
  - `work/pokemon-hover-0163-360.png` — no horizontal clipping/collision;
  - `work/pokemon-hover-0163-390.png` — no horizontal clipping/collision.
- Independent follow-up review: **TECH READY / UX READY / VISUAL READY**, with no material findings.
- Exact delivery artifact: `dist/pokepixel-better-ui.user.js`, `@version 0.2.163`, `1,317,656` bytes, SHA-256 `1C928CB3BAFB732646C667088BF2F7B6FC8F4C2F1B3643307BCF0C7C8868C883`.
- User-owned in-game validation: **pending**.

PM handoff is authorized for Product Owner in-game validation of candidate `0.2.163`. Merge/integration remains gated on that result.

## Corrective candidate — 0.2.164

Product Owner in-game evidence showed the IV chip still rendering with neutral visual weight despite
the intended light-green palette. Source inspection found the cause: the generic neutral badge rule
had higher specificity and overrode the IV colors.

`0.2.164` excludes `.is-iv` from the generic neutral badge selector and applies the IV palette as:

- border `#9bd589`;
- background `rgba(111,182,88,.24)`;
- text `#d8f5ce`.

Focused Pokémon Profile regression: `39/39 PASS`. Build and `git diff --check`: `PASS`.
Exact-current renders `work/pokemon-hover-0164-320.png` and `work/pokemon-hover-0164-390.png` show
the chip as visibly light-green with unchanged geometry and no clipping.

Exact delivery artifact: `dist/pokepixel-better-ui.user.js`, `@version 0.2.164`, `1,317,668` bytes,
SHA-256 `B9D4315E92C1AF9BCEF926FF77486E59971C6432D03A6A9A42041D0F1E5A0243`.
User-owned in-game validation: **pending**.

Independent follow-up review: **TECH READY / UX READY / VISUAL READY**. The reviewer confirmed that
the neutral badge selector no longer overrides `.is-iv`, no later production rule supersedes the IV
palette, and the exact-current 320/390 renders show the intended light-green weight without clipping
or hierarchy regression.

PM handoff is authorized for Product Owner in-game validation of candidate `0.2.164`.

## Corrective candidate — 0.2.165

Product Owner requested the PokémonCard vertical scrollbar to follow the same approved visual family
used elsewhere in Better UI. `0.2.165` adds the shared `ppbui-scroll-scope` to the enriched native
PokémonCard with reversible ownership. This changes scrollbar chrome only; overflow, scrollTop,
height, positioning and gutter remain native.

- Focused Pokémon Profile regression: `39/39 PASS`.
- Full repository suite: `1312/1312 PASS`.
- Build and `git diff --check`: `PASS`.
- Deterministic overflow render: `work/pokemon-hover-0165-scroll-390.png`.
- Render metrics: card outer width `360`, `clientWidth=348`, `scrollWidth=348`, visible height `470`,
  content `scrollHeight=700`; no horizontal overflow introduced.
- Exact delivery artifact: `dist/pokepixel-better-ui.user.js`, `@version 0.2.165`, `1,318,096` bytes,
  SHA-256 `4494E90C45A74BAB84171D5923847269547C432A59A77A899CB24AEA0D5E9AEE`.
- User-owned in-game validation: **APPROVED on 2026-10-04**.

Independent follow-up review: **TECH READY / UX READY / VISUAL READY**. The reviewer confirmed that
`ppbui-scroll-scope` changes only scrollbar chrome, preserves pre-existing class ownership, and does
not set overflow, height, max-height or gutter. The exact overflow render shows the intended 10 px
dark-track / structural-thumb presentation without content shift, clipping or overlap.

Product Owner in-game validation completed successfully on 2026-10-04. Candidate `0.2.165` is
**TECH READY / UX READY / VISUAL READY / USER VALIDATED**. The UI-delivery gate is closed; repository
integration remains a separate user-authorized Git step.
