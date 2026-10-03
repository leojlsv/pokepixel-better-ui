# PM Gate — Card Mode 4×6 Production Layout

Date: 2026-10-03
Status: TECH READY · UX READY · VISUAL READY · Product Owner VALIDATED

The Product Owner selected the following Card Mode geometry in the approved 4×6
playground. This task applies that geometry to the production Card Mode and the
subsequent Product Owner Story/Battle refinements without changing Analyzer state,
gameplay actions, authoritative game values or the approved outer coordinates.

## Acceptance & Evidence Matrix

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| AC-CARD-4X6-01 | Wide desktop Card Mode (1180px+) uses four equal logical columns and the six top-level surfaces occupy the approved coordinates. | source + structural tests + rendered evidence | pass |
| AC-CARD-4X6-02 | Battle is the same existing battle DOM surface, moved into the shared layout grid rather than cloned or recreated. | source + DOM test | pass |
| AC-CARD-4X6-03 | Desktop placement is Battle 1/1/2/1; Hunt Summary 1/2/2/1; Capture 1/3/2/1; Captured/Seen 3/1/2/1; Economy/XP 1/4/2/1; History 3/2/2/3. | CSS contract test | pass |
| AC-CARD-4X6-04 | Existing responsive behavior remains usable: 900–1179px keeps the prior three-column overview, 520–899px keeps the two-column flow, and below 520px uses one column. Desktop coordinates do not leak into narrower layouts. | source + responsive tests + rendered evidence | pass |
| AC-CARD-4X6-05 | Existing Card Mode controls, focus behavior, Story tabs/result/Shiny filtering, Team switch and data rendering remain functional; the rarity control is intentionally expanded to the seven canonical values plus All. | existing coupled-workspace suites | pass |
| AC-CARD-4X6-06 | Production build and bundle checks pass; live in-game validation remains Product Owner-owned. | build/test evidence + Product Owner validation | pass; PO live validated 2026-10-03 |
| AC-CARD-4X6-07 | At 1180px+ the Story surface consumes the vertical space allocated by rows 2–4, while Hunt/Loot keep local scroll ownership and no root horizontal overflow is introduced. | CSS contract + rendered evidence | pass |
| AC-CARD-4X6-08 | Hunt Story exposes All plus Weak, Common, Uncommon, Rare, Epic, Legendary and Mythical as visible rarity filters; Unknown is not user-facing. | DOM/interaction tests + rendered evidence | pass |
| AC-CARD-4X6-09 | Hunt Story main columns are exactly TIME · POKÉMON · RARITY · QUALITY · IV TOTAL · RESULT · BALL · CHANCE in that order. | DOM contract test + rendered evidence | pass |
| AC-CARD-4X6-10 | Captured attempt detail contains Gender, Nature and the six individual IVs only; the literal Genetics label and repeated IV Total are absent. | DOM/content test | pass |
| AC-CARD-4X6-11 | Female and Male remain text-identifiable and receive scoped light-pink / baby-blue styling respectively, so color is not the sole cue. | DOM/CSS test + rendered evidence | pass |
| AC-CARD-4X6-12 | Active Pokémon and Target use the existing authoritative identity/level/type/moves/rarity/shiny data with denser visual hierarchy and no invented gameplay values. | source + tests + rendered evidence | pass |
| AC-CARD-4X6-13 | Performance evidence distinguishes confirmed module/render-work suppression from unmeasured live FPS/GPU impact; no numeric live gain is claimed by agent-side validation. | source/test audit + synthetic performance regressions | pass |
| AC-CARD-4X6-14 | Standalone Card Mode is bounded to the dynamic viewport (`100dvh`), keeps body overflow closed and owns vertical scrolling itself instead of growing the document past the viewport. | standalone DOM/CSS test + 760×214 / 760×720 renders + independent re-review | pass |
| AC-CARD-4X6-15 | Standalone Active/Target shows authoritative static combat art (or an explicit empty Target placeholder) while secondary graphical type/Story sprites remain suppressed by text-only mode. | standalone integration test + rendered evidence + independent re-review | pass |
| AC-CARD-4X6-16 | Hunt Story `POKÉMON` header uses the same left alignment as Pokémon values. | CSS contract + rendered evidence + independent re-review | pass |
| AC-CARD-4X6-17 | Standalone Card Mode uses the **usable** viewport above a bottom horizontal Poké Hub: Cards and its vertical scrollbar end before the toolbar instead of rendering underneath it; vertical/collapsed toolbar modes do not reserve a full-width bottom strip. | standalone geometry regression + representative browser render + independent re-review | pass |
| AC-CARD-4X6-18 | At the current desktop validation viewport class (~1728×874 and larger), all six top-level Card Mode surfaces — including Economy / XP — are simultaneously visible above the Poké Hub without root Card Mode vertical scrolling. Story retains local table scrolling. | CSS regression + Chromium geometry metrics + representative browser renders + independent re-review | pass |
| AC-CARD-4X6-19 | In Hunt Story, a Shiny Pokémon name keeps explicit `✦ SHINY` text but uses the encounter rarity color instead of a fixed Shiny accent; e.g. Shiny Legendary uses Legendary color. Non-Shiny names remain unchanged. | CSS contract + representative render + independent re-review | pass |
| AC-CARD-4X6-20 | In Hunt Story, the `Rarity` value on a Shiny row uses the same encounter rarity color as the Shiny Pokémon name; no higher-specificity fixed Shiny accent may override the rarity token. | CSS contract + representative render + independent re-review | pass |

## Approved desktop layout

| Stable layout ID | Column | Row | Width | Height |
| --- | ---: | ---: | ---: | ---: |
| battle | 1 | 1 | 2 | 1 |
| hunt-summary | 1 | 2 | 2 | 1 |
| capture | 1 | 3 | 2 | 1 |
| captured-seen | 3 | 1 | 2 | 1 |
| economy-xp | 1 | 4 | 2 | 1 |
| history | 3 | 2 | 2 | 3 |

The approved 4×6 placement activates at 1180px and above. The production grid does
not manufacture visible empty rows 5–6. Those rows were
useful playground capacity; because no approved surface occupies them, production
ends after the occupied fourth row.

## Final local evidence

- Branch/worktree: feat/card-mode-layout-4x6 in .worktrees/card-mode-layout-4x6.
- Latest viewport-safe Card/Coupled/Menu regression: 124/124 pass.
- Final 0.2.144 coupled + Card/idempotence re-gate: 91/91 pass.
- Full repository suite: 611/611 pass.
- npm run build: pass for package 0.2.144.
- Built userscript SHA256:
  826464DA9A2A2A5CAFD04D29DEE1D048FAE36472C9555BE9EF8FAEA49D2D1878.
- git diff --check: pass.
- Product Owner live screenshots on 2026-10-03 rejected 0.2.140 because `100dvh`
  still included the screen strip occupied by the fixed bottom Poké Hub/HUD; Card
  content and its scrollbar visibly continued underneath that persistent chrome.
- New representative browser renders: work/card-mode-viewport-safe-1440x900.png and
  work/card-mode-viewport-safe-1915x975.png.
  The Cards surface and its vertical scrollbar visibly terminate above the bottom
  horizontal toolbar with the specified 8px separation instead of continuing behind it.
- Revised standalone renders: work/card-mode-live-feedback-760x214.png,
  work/card-mode-live-feedback-760x720.png and
  work/card-mode-live-feedback-1180x1000.png.
- The 760x214 render exercises the short-height case reported by the Product Owner:
  Active and Target art remain visible and the Cards surface owns the vertical
  scrollbar instead of extending the document past the viewport.
- The 1180x1000 render preserves the approved 4×6 geometry and shows the
  POKÉMON header left-aligned with the Pokémon row values.
- At 1180px, Story retains its pre-existing local horizontal scroll ownership
  for the 662px minimum attempt table; there is no root-level horizontal overflow.
- The <=640 compact Story explicitly returns to a zero-min-width three-track
  record, then the later <=320 container rule takes precedence and reflows it to
  two tracks. The regression test asserts declaration order as well as the layout.
- Standalone Cards structurally hides native presentation and unmounts Better UI
  modules that do not opt into Card Mode. Cards rendering is incremental and reaches
  observer quiescence for unchanged data. Existing WebView2 performance evidence is
  synthetic and explicitly does not establish a live CPU/RAM/FPS/GPU improvement;
  live graphical impact remains unmeasured.
- The first independent Tech/UX re-review of the live-feedback revision found two
  P2 issues: focus loss when a native toolbar replacement rehomed the Cards/Game
  toggle, and a shiny live Target resolving its normal native sprite. Both were
  corrected with explicit regressions before the final build.
- The 0.2.140 independent readiness verdict is historical after the Product Owner's
  viewport rejection. The first 0.2.141 Tech/UX re-gate found one P2: a horizontal
  toolbar dragged well away from the bottom but still in the lower half could reserve
  excessive height. The predicate was tightened to require actual bottom proximity and
  a regression now covers that floating-toolbar case.
- Independent final re-review of the corrected 0.2.141 SHA above: P0/P1/P2/P3 none;
  TECH READY and UX READY. The reviewer independently reproduced the bottom-docked,
  floating-horizontal, vertical/collapsed and cleanup/recompute cases and confirmed the
  prior P2 is resolved.
- Independent final Visual Regression QA of the exact corrected candidate: P0/P1/P2/P3
  none; VISUAL READY. The 1915×975 render shows the Cards surface and its vertical
  scrollbar ending above the bottom Poké Hub with the intended separation, with no
  clipping/root horizontal overflow and no regression to the approved 4×6 composition.
- Product Owner live validation then rejected 0.2.141 because reaching Economy / XP still
  required scrolling the Card Mode root. Chromium reproduced the structural cause before
  the 0.2.142 fix: at 1915×975 the usable Cards root was 887px high while the auto-row grid
  expanded to 1382px, with rows approximately 206 / 371 / 364 / 417px.
- Corrected 0.2.142 Chromium geometry after the bounded row budget: 1915×975 root
  887/887 client/scroll height; 1728×874 root 786/786; 1680×877 root 789/789. Economy / XP
  is fully visible in each render and the only vertical scroll owner is the Story attempt
  table. A 1440×800 short-height probe intentionally retains a small root-scroll fallback
  rather than clipping or hiding content.
- Representative 0.2.142 desktop-fit renders: work/card-mode-fit-after-1915x975.png,
  work/card-mode-fit-after-1728x874.png and work/card-mode-fit-after-1680x877.png.
- Independent 0.2.142 Tech/UX re-gate: P0/P1/P2/P3 none; TECH READY and UX READY.
  Reviewer confirmed that bounded desktop rows prevent Story from inflating the root,
  all six surfaces remain in the same semantic DOM order, no facts are removed, and
  root `overflow:auto` remains available as a short-height fallback rather than clipping.
- Independent 0.2.142 Visual Regression QA: P0/P1/P2/P3 none; VISUAL READY. The
  1728×874 and 1680×877 renders show all six top-level surfaces simultaneously above
  the Poké Hub, Economy / XP fully visible/readable, Story scrolling locally, and no
  root vertical scrollbar, clipping, horizontal overflow or 4×6 placement regression.
- Product Owner then explicitly validated the 0.2.142 layout and requested one isolated
  visual follow-up: Shiny Pokémon names in Hunt Story must inherit their rarity color.
  Candidate 0.2.143 changes only that color source from the fixed selected accent to
  `--rarity-color`; layout, text marker and ARIA semantics are unchanged. Representative
  render: work/card-mode-shiny-legendary-1728x874.png.
- Independent 0.2.143 Tech/UX re-gate: P0/P1/P2/P3 none; TECH READY and UX READY.
  Reviewer confirmed the Shiny selector inherits the row rarity token, non-Shiny names
  keep the unchanged normal text rule, and marker/ARIA/DOM/layout behavior is untouched.
- Independent 0.2.143 Visual Regression QA: P0/P1/P2/P3 none; VISUAL READY. The
  representative render shows `Makuhita ✦ SHINY` using the same Legendary rarity color
  source as its rarity cell, with the validated 0.2.142 layout unchanged.
- Product Owner live validation then exposed a stale higher-specificity Story rule that
  still recolored column 2 (`Rarity`) with `--ppbui-selected` on Shiny rows. Candidate
  0.2.144 replaces that override with `--rarity-color`, so Pokémon name and rarity value
  share the same rarity token.
- Independent 0.2.144 Tech/UX re-gate: P0/P1/P2/P3 none; TECH READY and UX READY.
  Reviewer confirmed the higher-specificity Shiny rarity selector now resolves through
  `--rarity-color`, the old fixed selected-accent override is absent and explicitly
  regression-tested, and non-Shiny/ARIA/DOM/layout behavior is unchanged.
- Independent 0.2.144 Visual Regression QA: P0/P1/P2/P3 none; VISUAL READY. In
  work/card-mode-shiny-legendary-144-1728x874.png, `Makuhita ✦ SHINY` and `Legendary`
  visibly use the same Legendary rarity color; the validated desktop geometry remains unchanged.
- Product Owner explicitly validated candidate 0.2.144 in-game on 2026-10-03 and
  authorized commit, push and merge. Agent-side live game/Tampermonkey interaction
  was not performed.
