# Coupled Workspace — PM Acceptance & Evidence Record

> **Current status — 2026-10-02:** PPTools Recommendation and the Coupled
> Workspace PPTools relay were removed by Product Owner decision. All PPTools
> sections and hashes below are historical evidence only and do not describe
> current runtime capabilities, build targets or pending acceptance work.

## Standalone Tampermonkey PPTools variant — 2026-09-29, 0.2.120 (historical; cancelled)

> **Historical evidence only.** This experimental variant was cancelled and is
> not part of current Better UI `0.2.122`. The following paragraphs record the
> state of the former `0.2.120` candidate at the time of its synthetic QA, not
> installation instructions or approval for the current build.

The Product Owner accepted a **temporary, inactive auxiliary browser tab** as
an alternative to the Coupled Workspace's invisible WebView2 runner. A
single Better UI userscript now matches both PokePixel and the exact public
PPTools Hunt Analyzer worker route. The game bootstraps Better UI modules only
on PokePixel; a manually opened PPTools page stays untouched. Without a
Coupled Workspace bridge, a PPTools Recommendation click posts a strictly
allowlisted attacker to unique Tampermonkey GM storage, opens the PPTools
route via `GM_openInTab({active:false})`, runs a build-time adaptation of the
**unchanged** version-pinned WebView2 runner, receives correlated Top3 data,
and closes only its own tab. The user may see that tab in the browser tab
strip briefly. Coupled Workspace transport retains priority if available.
All result/leader/profile/timeout, EXP ×1 approximation and native list
**Search** guards are inherited from the prior accepted widget.

The extension storage is per-request, the URL fragment exposes only a random
128-bit request ID, and the helper removes it with `history.replaceState`.
The bridge strips unknown/private fields, bounds result sizes, removes
listeners and keys on completion/cancel, and prunes old interrupted requests.
Independent Technical/Security QA reproduced a P1 cancellation race between
worker GM read/subscription (old request could simulate after cancellation),
which was fixed with a second exact job read after subscribing, before starting
the runner. Regression was **RED then GREEN**. Independent QA re-review found
no remaining source-level P0/P1/P2 in its scope. TM/browser behavior remains
unverified in the actual user's game and is not presumed accepted.

Historical evidence and setup: `docs/archive/PPTOOLS_TAMPERMONKEY_0.2.120_CANCELLED.md`,
the former `test/pptools-tampermonkey.test.js` (not retained in the current
checkout; its historical result is not rerunnable from this tree), and offline Edge render
`tools/coupled-workspace-webview2/bin/pptools-tampermonkey-candidate/oneclick-states.png`
(235/410/680 px, idle/loading/result/error). Local full suite **559/559 PASS**;
`npm run build` PASS; existing native host `--pptools-privacy-smoke` PASS.
The historical `0.2.120` build (then located at
`dist/pokepixel-better-ui.user.js`) and its immutable snapshot at the former
`tools/pptools-tampermonkey/bin/PokePixelBetterUI.pptools-tampermonkey.0.2.120.user.js`
were **1,232,421 bytes**, SHA-256
`401D53B3CC2138F5D3754F974D6AC12442706A3103F632A753E4B60519FEFDDC`.
The old snapshot is now compressed in ignored local archive
`.local-evidence/deep-clean/cancelled-tampermonkey-0.2.120-20260929.zip`;
the current `dist/` output is a separate build.
The existing opt-in Coupled Workspace host remains unchanged at SHA-256
`8054F36A9763A69A790ABF01FD77D139DAEBE06E2805706357DBCC22407C1098`.
Independent technical and UX/A11y reviews report no remaining concrete
P0/P1/P2 after fixes. Offline visual readiness covers only the shown
synthetic widths/states; other interaction states and actual Tampermonkey
operation are still unverified. No normal host promotion, gameplay commands,
Tampermonkey installation or live game/browser validation was performed by
the agent.

## Historical — PPTools Recommendation approved; Search list follow-up — 2026-09-29

The Product Owner explicitly **approved the existing one-click PPTools
Recommendation functionality in the game** at 16:57 UTC, then clarified that
the current Hunts interface has no interactive map. The requested follow-up
is a **Search** button for each recommendation in the existing native Hunt
LIST, not map positioning or automatic gameplay.

Search is wired into the existing widget only in current LIST mode. A click
rechecks leader, session, profile, and current list/world context; resolves a
single editable native search input in the same Hunt window; writes the
recommended `huntName`, dispatches its bubbling `input` event and focuses
the native field. Filtering stays native. Search remains available when the
recommended row is filtered out, and makes no promise that a matching Hunt
exists in the current world/level/element filters. It never clicks Hunt,
Details or a world tab, and leaves the legacy MAP Locate untouched. If the
world changes during an asynchronous step, Search rejects that attempt.

This follow-up is awaiting new user-owned **in-game validation**, separate
from the already accepted PPTools query flow. The exact current Better UI
`dist/pokepixel-better-ui.user.js` and isolated copy
`bin/pptools-search-candidate/pokepixel-better-ui.pptools-search-v0.2.119.user.js`
are **1,204,047 bytes**, SHA-256
`17445A5B0410A443D0D03C473C2EB0755BE1DBD286551ABB39DC0DDA25DA6A64`.
Local `npm test` **545/545 PASS**, `npm run build` PASS, focused Search tests
**29/29 PASS**. Independent technical and UX reviews found no confirmed P0/P1
in the Search change. The current offline Edge screenshot
`bin/pptools-search-candidate/oneclick-states.png` shows enabled Search buttons
without observed overflow or clipping at 235/410/680 px; this is synthetic
visual evidence, not in-game validation. The existing opt-in host is unchanged
(SHA-256 `8054F36A9763A69A790ABF01FD77D139DAEBE06E2805706357DBCC22407C1098`).
The approved functionality is not a verification of the simulator's active buff
assumptions.

## Historical — PPTools neutral-EXP correction — 2026-09-29, diagnostic handoff

The Product Owner supplied a sample from PokePixel's native **COPIAR JSON** for
an Entei at level 32. The creature document includes species, level, quality,
exact multiplier, IVs, nature, gender and Shiny status, but **neither**
`trainer.exp_buff` **nor** `is_starter`. Private sample identifiers were not
retained in fixtures or artifacts. The former mandatory `trainer.exp_buff`
read caused the observed pre-query error.

The pinned public PPTools importer accepts absent `expBuff` and applies the
neutral EXP factor `1` by default; its fresh form uses `isStarter=false` if
unspecified. Better UI now emits `expBuff:1`, independently of any unverified
native trainer buff, and uses `isStarter:false` only when the native Boolean is
absent. An explicit native starter Boolean remains authoritative. The results
render a separate, polite-live note warning that **XP/h and recommendation order
may differ** under real buffs or unknown starter state. This is a **diagnostic
estimate**, not proved parity with the game's full buff or combat formulas.

The current Better UI `dist/pokepixel-better-ui.user.js` (`0.2.119`) has
**1,201,461 bytes**, SHA-256
`1DA24AAFE6470EFAC43A880EF7339FA99E9D636E95BD006F8DB58BB7FB47C886`.
The unchanged opt-in host
`bin/PokePixelCoupledWorkspace.pptools.20260929-verified.exe` has SHA-256
`8054F36A9763A69A790ABF01FD77D139DAEBE06E2805706357DBCC22407C1098`.
The JS build succeeds; **541/541 tests PASS** (including anonymized Entei
projection, request isolation and gameplay-free Locate). Existing host
`--pptools-privacy-smoke` **PASS**. Independent technical/security review found
no new P0/P1; independent UX/A11y/visual review found no remaining P0/P1/P2 in
its scoped review. A refreshed **offline** Entei fixture was rendered and
reviewed at **235/410/680 px**, with no visible clipping or overlap; the
evidence is in
`bin/pptools-neutral-exp-candidate/{oneclick-preview.html,oneclick-states.png}`.
It does not constitute live game, screen reader, or exact host visual evidence.

The existing normal host has not been promoted or replaced. The actual
one-click result in PokePixel still requires user-owned in-game validation.

## Historical — PPTools one-click — isolated diagnostic candidate, 2026-09-29

The Product Owner's corrected requirement is a single Better UI `PPTools
Recommendation` click for the **current native leader**, answered by the real
public PPTools simulator through an **invisible** auxiliary WebView2. The
manual `0.2.118-r2` transfer was rejected for this requirement. The new
implementation is confined to an opt-in PPTools host variant: it is **not
promoted**, and the Product Owner has not validated it in the live game.

Exact local evidence after security/timeout corrections:

| Component | Isolated artifact | SHA-256 |
| --- | --- | --- |
| Host | `bin/PokePixelCoupledWorkspace.pptools.candidate.exe` (352256 B) | `C84533B41BB684A8452121B26021E6E4C934C34BE4F0BAF0EC3B60973BABB991` |
| Better UI | `dist/pokepixel-better-ui.user.js` (1200010 B; `0.2.119`) | `E72C3572223356F33BA0CFF637FF15A8FDC35D2C4F4A8324BC1CE80EB629329B` |
| Public site runner | `bin/pptools-runner.js` (13367 B; same as source) | `607D7A3190CE29B77E81E5264B0D67C61362569346F75CFA31783C00C8A69C45` |

Local `npm test` **539/539 PASS**; `npm run build` PASS; x64 C# compile
PASS without warnings. The exact host binary passed
`--pptools-privacy-smoke`, `--smoke-close-during-init`,
`--smoke-close-during-switch`, general `--smoke`, and **real public
PPTools site** `--pptools-runner-smoke` (entirely synthetic Charmander,
Top 3 rows), with empty stderr on the latest run. General `--smoke`
was **intermittent under the local 12-second watchdog** in earlier runs
(also reproduced on an earlier binary), so its latest green result is
not evidence of deterministic timing. Independent source-only QA found no
additional demonstrated P0/P1/P2 after correcting the privacy relay,
deadline handling, native startup quota, late-fault observation and
ephemeral-folder cleanup. The normal host and existing `candidate.exe`
have not been replaced.
The exact final binary additionally passed `--pptools-full-input-smoke`:
the *real public* PPTools site accepted a richer synthetic Wartortle
attacker with quality, exact multiplier, IVs, nature, gender, starter,
Shiny and EXP factor, then returned three ranked results. This proves
public import/simulation compatibility for that synthetic object, **not**
equivalence to actual PokePixel hover JSON or all runtime field values.
Six consecutive synthetic site runs also passed after the runner corrected
an intermittent Next.js route-script issue: `document.scripts` sometimes
dropped the pinned loaded tag, while Resource Timing retained a single
exact-URL `script` resource. The fallback proves a matching resource
**request**, not independently verified script bytes; URL, origin and
live UI/result structure continue to be checked.

**Acceptance remains blocked on AUTO-02 and AUTO-07:** the game's native hover
`COPIAR JSON` has not been captured as a matching reference. The PPTools
public importer interprets `expBuff` as an EXP multiplier (`1.5` = 150%),
but native `trainer.exp_buff` semantics are not yet established; the public
importer also derives Shiny from quality multiplier bands. The output UI
explicitly states that native JSON equivalence is unproved. Synthetic
success is not proof that live recommendations use the correct native input.

## Post-candidate111 QoL batch — 2026-09-29 (Product Owner approved all)

The Product Owner confirmed the candidate111 account-selection and host-visual
features working in the live game and then approved **all** additional QoLs
identified in the follow-up analysis. The previously deprecated Fast Leader
A/B study, Hunt/context rail and Professions HUD stay retired. The preceding
candidate111 paragraphs are historical evidence; this new batch has its own
handoff/QA gate, and no live-game work belongs to an agent.

| Criterion | Observable acceptance requirement | Required evidence | Gate |
| --- | --- | --- | --- |
| `AC-QOL01` | Hunt Story at 1180px Dual 1:1, 1:2 and 2:1 shows all eight fields without horizontal scrolling; captured-only genetics remain directly visible, filters and full accessible text survive; wide tables unchanged | DOM/filter tests, actual synthetic 1180/1600 scrolled screenshots, independent UX+Visual QA | JS tests / rendered 100% screenshots PASS; independent first-pass UX/VISUAL READY; live pending |
| `AC-QOL02` | Team and battle text at narrow widths becomes readable, retains six members and full player/target semantics inside the <=200px combat budget | CSS/geometry tests and rendered comparison at 1180 Dual, Focus, 125/150% DPI if available | `0.2.113` explicit narrow target rarity/Shiny text, six Team members and HP/EXP layout verified by JS tests and independent UX/VISUAL READY on refreshed candidate114 1180px 100% 1:1, 1:2, 2:1 and Focus renders; 125/150% DPI VISUAL EVIDENCE INSUFFICIENT; live pending |
| `AC-QOL03` | A scroll-dependent, keyboard-accessible section navigator jumps to Summary, Economy, Story and top without another permanent row, stealing external focus or changing another account's scroll | Card DOM/navigation, double-panel isolation and scroll/cleanup tests, rendered narrow/wide | Tests scroll/focus/cleanup PASS, visible synthetic Story nav PASS; live pending |
| `AC-QOL04` | Hunt Story result All/Captured/Failed is a labeled three-choice segmented control, filters correctly with rarity/Shiny and exposes selected state to assistive technology | UI/filter and keyboard tests, 1:2 responsive render | JS keyboard, aria-pressed and filtering tests PASS; rendered synthetic PASS; live pending |
| `AC-QOL05` | Copy summary exports bounded **displayed authoritative** session KPIs, respects locale, reports clipboard success/denial and never exports secrets or stale/unavailable fabricated values | Clipboard fixture success/denial/unavailable + cleanup tests | JS 61/61 focused, 481/481 full PASS including denial, late settlement and authority loss; rendered success/denial status evidence insufficient and live clipboard behavior pending |
| `AC-QOL06` | Seven configurable Game Dock quick slots replace existing slots (not an extra permanent row); choices stay in the native bridge allowlist and retain active-only, available/disabled, overflow and persistence semantics | Host settings migration/negative tests, responsive 1180/offline and focus/swap smoke | C# v1→v2/malformed/mixed-case canonical ID/swap/bridge synthetic PASS; dark 33-item popup and scrolling editor rendered, but slots 5–7 were not simultaneously shown in the reviewed frame; live pending |
| `AC-QOL07` | Failed explicit native menu open gives brief account+destination feedback with accessible text, no retry or cross-account side effects | Correlated bridge success/failure/stale-response negative smoke | C# correlated, out-of-order and account-isolation synthetic PASS; UX source checks pass, but OPEN FAILED visual-state screenshot absent; live pending |
| `AC-QOL08` | Per-profile reader zoom exposes safe presets, survives restart/Single/Dual/Swap/recovery and respects two isolated WebView2 contexts | Zoom-by-profile settings and actual WebView2 zoom smoke, 1180 and DPI visual QA | C# zoom factor/restore/profile/lazy-init and both live WebViews returning to 100% on Reset layout synthetic PASS; actual zoomed-pane 90/110/125% and rendered 125/150% DPI VISUAL EVIDENCE INSUFFICIENT; live pending |
| `AC-QOL09` | Maintenance Drawer shows read-only health/error for both profiles; recovery remains explicitly active-only | Dual healthy/error/offline smoke and drawer screenshot | C#/read-only drawer screenshot PASS; live pending |
| `AC-QOL10` | Game Dock remains a stable 44px line with minimal horizontal movement when menus go offline; warning and all primary controls remain visible | 1180 online/offline side-by-side geometry, no-clipping asserts | Exact synthetic 1180 ready/offline screenshot + geometry PASS, first-pass VISUAL READY; live pending |
| `AC-QOL11` | Command Deck reduces redundant chrome while retaining Single/Dual, ratios, Swap, Focus, scope, Home/Reload, keyboard access and statuses | 1180/1600/Focus/Single synthetic screenshots + UX/A11y review | Exact synthetic wide/narrow/Focus/Single + host smoke PASS, first-pass UX READY; live pending |
| `AC-QOL12` | In narrow Hunt Story, each attempt uses a readable visual hierarchy: Pokémon and Rarity are identifiable first; Time, Quality, Result, Ball, Chance and IV Total all remain individually visible and labeled down to ~235px, including failed/unknown values and Shiny, with no horizontal clipping; captured genetics remains inline and wide layout remains unchanged | Product Owner 2026-09-29 screenshot, independent UX design, real synthetic rendered ~235px and 1180 Dual 1:2/2:1/1:1 screenshots, browser geometry for all eight fields, source/locale tests and independent Technical + Visual QA | Better UI `0.2.114` / candidate115 synthetic 235px first/captured/Shiny eight-field geometry PASS; 1180px ratios PASS; JS 481/481 and host smokes PASS; independent TECH READY / UX READY / VISUAL READY for the reviewed local synthetic render scope, P0/P1/P2=0 observed; Product Owner visual/in-game approval pending |

Only the Product Owner can approve in-game behavior. No normal host promotion,
Git commit, push or live PokePixel browser action is part of this batch.

**Post-feedback candidate115 local evidence (2026-09-29):** Better UI `0.2.114`
userscript SHA-256 `0C5E6603809524189AAE9E3911A442C7138E9A922710CF9A193A79EC2BC07873`;
isolated `bin/PokePixelCoupledWorkspace.candidate115.exe` (291,328 bytes),
SHA-256 `09E3D7988DDEAEB19F64659345EFFE651555E312B93F0D8A4475C7B8407A0675`,
identical to the `candidate.exe` alias. JS tests **481/481 PASS**; build and
`git diff --check` PASS. Exact C# `--smoke`, `--smoke-close-during-init` and
`--smoke-close-during-switch` **PASS**, normal host hash preserved. The new
`workspace-cards-history-235.png` and `workspace-cards-history-235-shiny.png`
are WebView2 synthetic 100%-scale captures, alongside refreshed 1180px Dual
1:1/1:2/2:1 screenshots. The 235px fixture verifies two CSS columns with
all eight field rectangles visible for the first, captured and Shiny attempts;
it does not constitute live-game or 125/150% DPI evidence. Previous reviewer
approval of candidate114's two-line history is superseded by the Owner's actual
visual rejection. Independent candidate115 read-only re-gate: **TECH READY**,
**UX/A11Y READY** and **VISUAL READY scoped to the rendered synthetic 235px
and 1180px ratio evidence**, P0/P1/P2=0 observed. Reviewer inspected the
refreshed 235px normal/Shiny/captured genetics PNGs and 1180px Dual 1:1,
1:2, 2:1 PNGs before source and confirmed visible labels, stable grouping,
no trailing-field clipping, accessible named field groups and an untouched
wide eight-column table. Its source review is independent; reviewer did not
rerun the PM's build/tests/smokes. Unverified: live 235px composition,
longest localized species text, actual assistive-technology announcement,
PT-BR 235px render and high-DPI/125% zoom. Captured Genetics keeps the
preexisting dense 9px detail typography (P3 evidence/legibility caution).
**Handoff for this UX correction:** isolated pre-live diagnostic candidate,
pending the Product Owner's live visual acceptance; normal host preserved.

**Historical candidate114 evidence:** Better UI `0.2.113`, focused coupled
tests **61/61 PASS**, full suite **481/481 PASS**, build PASS; dist SHA-256
`02DE8F441D8B442D1A29AA15B747877AE4FF1CE9B6295C84C91F93276CA82781`.
Exact isolated `bin/PokePixelCoupledWorkspace.candidate114.exe` (283,136 bytes),
SHA-256 `3FE0382F7288B37DAA4C19A2FA02F41D0F9FA50EF35E318D2201FCC06A4FDE73`.
The standard candidate alias has the same hash. Exact candidate114 `--smoke`,
`--smoke-close-during-init`, and `--smoke-close-during-switch` all **PASS**.
The untouched normal host remains SHA-256
`924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.

Independent exact-candidate114 source QA: **TECH READY**, P0/P1/P2=0 observed.
`candidate113` was superseded after reviewers found two P2 regressions: Reset
layout changed stored zoom to 100% without applying that zoom to existing WebViews,
and the narrow target lost textual rarity/Shiny identification. Candidate114
applies live zoom to both panes and asserts 125%/90% → Reset layout → both live
and stored 100%. Refreshed synthetic 1180px 100%-scale 1:1/1:2/2:1 and Focus
captures preserve explicit target `EPIC`/`✦ SHINY` labels, six Team rows and
bounded combat layout; independent reviewer: **UX READY / VISUAL READY within
those 100%-scale scenes**. The mixed-case favorite ID, dropdown arrow and
Team-heading issues caught before candidate113 remain corrected. One nonblocking
P3 remains: an older correlated failed menu result could temporarily remove its
destination from availability until the next capability handshake; synchronous
page-local bridge responses and subsequent capability refresh make runtime
occurrence unproven.

**Handoff classification: pre-live diagnostic candidate with visual evidence
gaps**, pending Product Owner in-game validation. Independent actual rendered
125–150% DPI, 90/110/125% zoomed WebView composition, `OPEN FAILED` visual state,
clipboard feedback, and full seven-slot editor scroll were not established by the
reviewed screenshots: **VISUAL EVIDENCE INSUFFICIENT** for those sub-gates.
No PokePixel game/browser/Tampermonkey inspection, normal host promotion or
repository publication was performed. `candidate112` and `candidate113` are
historical/pre-correction evidence only.

## Account navigation and host chrome — 2026-09-29 (owner functional validation)

The Product Owner reported that the host's pixel-art chrome is visually inconsistent
and that opening a lower Game Dock menu for the other account requires travelling
to the top Command Deck to switch accounts. This slice addresses the **workspace
account** (Rhyxus/Rhyosa), independently of the native six-Pokémon Team leader.

| Criterion | Observable acceptance requirement | Required local evidence | Gate |
| --- | --- | --- | --- |
| `AC-DK01` | In Dual mode, each account can become the Game Dock target directly from the persistent lower bar; current account and keyboard focus have separate visible/text states | Interactive host smoke for Rhyxus → Rhyosa → Rhyxus; keyboard and accessibility inspection; synthetic dock render | Source/control route reviewed, state/100% renders PASS, UX READY; actual click/AT in game pending |
| `AC-DK02` | Selection synchronizes with Command Deck, WebView focus, Swap and Focus/Restore; no session ownership, Cards/Game view or splitter ratio changes merely from selecting a different account | Host state assertions, bridge-routing and lifecycle smoke, source QA | Host bridge/lifecycle smoke PASS, TECH READY; in-game pending |
| `AC-DK03` | In Single mode the dock identifies the sole visible account without offering an inactive account as a no-op; switching profiles continues through the existing Single-mode control | Single/Dual/Focus smoke and corresponding dock captures | Synthetic 100% renders PASS, UX READY; in-game pending |
| `AC-DK04` | Game Dock remains a 44px single row with no clipped selectors or native menus at 1180×600, 1600 and DPI 125–150%; when the bridge is unavailable its module actions fail closed but account switching and Cards/Game remain usable | Responsive/offline geometry asserts, synthetic visual captures and independent Visual Regression QA | 1180/1600 100% VISUAL READY; real rendered 125/150% DPI VISUAL EVIDENCE INSUFFICIENT; in-game pending |
| `AC-DK05` | WinForms host chrome follows MASTER 3.0's game palette, Segoe UI fallback, 1px neutral lines, gold selected/current and independently visible 2px cyan focus; sprites and native game UI are unchanged | Design-token/source audit, normal/focus/offline rendered host captures, independent UX/A11y QA | TECH/UX READY, synthetic 100% VISUAL READY; in-game pending |
| `AC-DK06` | Dock actions remain scoped to the selected account and existing native menu bridge; no Both navigation, gameplay automation or cross-account session copying | Exact selected-account bridge smoke, overflow/capability recovery tests and independent Technical QA | TECH READY, bridge smoke PASS; in-game pending |

The Product Owner confirmed the candidate111 **functional changes** validated in
the live game on 2026-09-29. The previous synthetic 125/150% DPI screenshots and
manual assistive technology evidence remain unproven independently. Existing
working-tree changes and the installed/normal host were untouched during QA.

Local candidate evidence (2026-09-29):

- Exact source build: `bin/PokePixelCoupledWorkspace.candidate111.exe`, SHA-256
  `A35B70C781F31FD74605F3653DA30204F301BF46E7424F2777EAA224BAAD416C`;
  original `PokePixelCoupledWorkspace.exe` remains SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.
- Exact candidate `--smoke`, `--smoke-close-during-init` and
  `--smoke-close-during-switch` **PASS**.
  Better UI JavaScript suite **476/476 PASS**; no Better UI JavaScript bundle or
  Analyzer implementation was changed for this host-only slice.
- Synthetic renders at 1180 and 1600 include `game-dock-dual-1180.png`,
  `game-dock-rhyosa-1180.png`, `game-dock-account-focus-1180.png`,
  `game-dock-offline-1180.png`, `game-dock-single-1180.png` and the existing
  Dual/Focus/mixed/Single composite matrix. Synthetic control text and bounds
  assertions now cover account names and the compact offline copy.
- The smoke orchestrator already owns the workspace mutation gate; it tests
  `SetActiveProfile` state propagation rather than re-entering the asynchronous
  `Button.PerformClick` event under the same gate. This is a known coverage limit
  of the smoke fixture, not evidence of a live click failure. DPI 120/144
  scaling arithmetic is covered, but representative **rendered** 125/150% DPI
  evidence remains pending as a separate visual sub-gate.
- Independent Architecture/Technical source QA: **TECH READY**, P0/P1=0 observed;
  no live game, browser or Tampermonkey access was performed. The referenced
  supplemental `.skills/ui_ux_pro.md` pro-rules/search resources were not
  present in this checkout; project-native UX, focus, geometry and visual
  checks were applied instead.
- Independent render-first review of the final candidate's nine 100%-scale
  screenshots and pre-change baselines: **UX READY / VISUAL READY** for the
  shown Single, Dual, Focus, offline and keyboard-focus states, no P0–P2.
  A nonblocking P3 remains: the centered row shifts horizontally by roughly
  59px when `MENUS OFFLINE` appears; no clipping was observed. Manual assistive
  technology operation and actual 125–150% DPI rendering were not tested.

## Product Owner removal — Better UI 0.2.108 (2026-09-28)

| Criterion | Observable result | Local evidence | Status |
| --- | --- | --- | --- |
| `AC-RM01` | Better UI no longer registers, mounts or offers a setting for the Professions HUD; the native Professions menu remains | `src/index.js`, module controls, absence of `src/modules/professions-hud/`; native menu test | Source verified; in-game pending |
| `AC-RM02` | The host has no Hunt metrics footbar in Cards, Game or mixed modes; its vertical rows are 44px Command Deck / flexible panes / 44px Game Dock | `CoupledWorkspace.cs` layout and direct pane-to-dock seam assertions; synthetic host smoke | Source and local smoke verified; in-game pending |
| `AC-RM03` | The host no longer caches/receives Analyzer summaries; Cards continues using the bounded page-local public summary and the native Hunt Analyzer remains navigable | coupled adapter sanitizer/negative relay tests, Game Dock native action tests | Source and local unit tests verified; in-game pending |
| `AC-RM04` | No shutdown timer, host DTO or old rail geometry assertions remain; pane lifecycle and source builds stay functional | C# compile, synthetic host lifecycle/smoke, userscript build | Source and local smoke verified; in-game pending |

The retired `CW-33`/`CW-34`/`CW-35` requirements below refer to earlier builds.
No automated result constitutes Product Owner validation in the live game.

Local verification for this change: Better UI focused tests **67/67 PASS**,
full suite **502/502 PASS**, userscript `0.2.108` build **PASS**;
separate WebView2 `candidate108.exe` C# compilation **PASS**,
`--smoke` **PASS**, shutdown-during-init and shutdown-during-switch
smokes **PASS**. The synthetic visual matrix includes
`workspace-mixed-cards-game-1180.png` as well as Cards Dual/Focus and
Game Dual; gameplay and live layout still require Product Owner validation.

Recorded: 2026-09-20

## Task

- Request: evolve the live-functional WebView2 coupled workspace into an advanced Better UI-native account workspace.
- Product Owner approval: plan explicitly approved on 2026-09-20.
- Baseline runtime: WinForms + WebView2 host under `tools/coupled-workspace-webview2/`; Product Owner confirmed both panes functional on 2026-09-20.
- Design source: approved `design-system/pokepixel-better-ui/MASTER.md`, `.skills/ui_ux_pro.md`, `.skills/pixel_art_direction.md`, and candidate `pages/coupled-workspace.md`.
- Previously Product Owner validated scope: two independent WebView2 account sessions load and operate in one frame; Better UI injection works through the native host.
- Explicitly out of scope: gameplay automation, mirrored/cross-account gameplay input,
  network interception/modification, credential storage, server/API changes, reopening
  validated in-game Better UI module designs. This does not prohibit a bounded page-local
  Cards control from executing one explicitly user-selected native Hunt action/preference
  in the current account; such controls must never be Analyzer-driven or fan out to Both.
- Write owner: coupled-workspace host implementation under PM-controlled task slicing.

## Product decisions frozen by approval

1. Workspace supports **1 account or 2 accounts**.
2. Dual mode supports semantic layout presets **1:2 / 1:1 / 2:1** plus native splitter movement.
3. A selected/active pane is explicit and drives contextual host controls.
4. Host-level controls may target Active or Both only when they do not perform gameplay actions.
5. Account/profile state stays isolated per WebView2 user-data folder.
6. Historical 2026-09-20 direction was Miyazaki 16; **superseded 2026-09-29** by the Product Owner-validated Game Palette / Segoe UI / 1px host chrome in MASTER 3.0. No decorative SaaS styling is introduced.
7. Low-frequency maintenance actions move out of the primary command deck.
8. Electron remains superseded; WebView2 is the active runtime.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `CW-01` | User can switch between **1 Account** and **2 Accounts** without restarting the host | Dual→Single keeps active profile live and disposes inactive pane; Single→Dual restores last dual mapping and lazily creates only the missing account; UDF isolation/no credentials remain | unit/state tests + repeated lifecycle smoke + UX QA | Host Engineer | Technical + UX QA | `accepted` |
| `CW-02` | Single mode exposes a profile selector and renders exactly one initialized account viewport | selected profile persistence; switching profile disposes current pane and initializes only selected profile from its own UDF | lifecycle tests + representative render | Host Engineer | Technical + Visual QA | `accepted` |
| `CW-03` | Dual mode exposes **1:2 / 1:1 / 2:1** presets and a native draggable splitter | both panes remain usable; nominal 20–80 applies only where each pane stays >=320px; last ratio persists | layout tests + wide/narrow render | Host Engineer | UX + Visual QA | `accepted` |
| `CW-04` | Releasing the splitter within **24px** of 1:2 / 1:1 / 2:1 snaps to that preset; other release positions remain custom | no magnetic snap while dragging; pointer continuity | interaction test + render/recording | Host Engineer | UX QA | `accepted` |
| `CW-05` | **Swap** exchanges profile↔side mapping without exchanging/copying account storage; Active follows the active profile to its new side | independent UDFs/cookies; Active-scoped commands still target the same account | state/lifecycle tests | Host Engineer | Technical QA | `accepted` |
| `CW-06` | **Focus** temporarily promotes one pane to 100% and **Restore** returns the previous dual layout | both session processes remain valid; hidden pane is not navigated/disposed/recreated; previous ratio/order | lifecycle + layout tests + render | Host Engineer | Technical + Visual QA | `accepted` |
| `CW-07` | Exactly one pane is visually/semantically active in dual mode and the active state is keyboard reachable | cyan focus remains independent from gold selected/current | keyboard tests + state render | Host Engineer | UX + Visual QA | `accepted` |
| `CW-08` | Primary command deck stays compact and adapts between single and dual modes | primary content surface remains dominant; no permanent maintenance clutter | representative renders at target widths | UI Engineer | Visual QA | `accepted` |
| `CW-09` | Home/Reload and other approved host commands can target **Active** or **Both** explicitly | commands remain host/browser operations only; no gameplay command fan-out | command-scope tests + UX QA | Host Engineer | Technical + UX QA | `accepted` |
| `CW-10` | DevTools and low-frequency maintenance actions live in a progressive-disclosure maintenance surface | keyboard access; no hidden required primary action | keyboard/accessibility test + render | UI Engineer | UX + Visual QA | `accepted` |
| `CW-11` | Pane health distinguishes initializing/loading/ready/UI-ready/error/process-failed/blocked-url without color-only meaning | `UI READY` requires a post-success bundle execution marker, never only the pre-run idempotence marker; current WebView2 diagnostics and fail-closed navigation remain | state tests + injected-success/failure fixtures + error render | Host Engineer | Technical + UX QA | `accepted` |
| `CW-12` | Workspace state persists structurally across launches (mode, profiles/order, active profile, ratios, focus state, command scope, per-profile zoom, per-profile Cards/Game view and maintenance-drawer expanded state) | no secrets/tokens; invalid or missing per-profile view state fails safely to Cards | serialization/adversarial tests | Host Engineer | Technical QA | `accepted` |
| `CW-13` | Profile registry contains non-secret identity/display/UDF metadata only | credentials remain WebView2-owned | source audit + serialization test | Host Engineer | Technical QA | `accepted` |
| `CW-14` | Command deck uses MASTER Miyazaki 16 geometry, state language and typography | no changes to in-game module styling | render + design-contract audit | UI Engineer | Design + Visual QA | `accepted` |
| `CW-15` | Single/dual/focus layouts remain operable at the supported minimum host width without clipped primary controls | game view remains usable; no horizontal primary toolbar scroll | narrow render + keyboard pass | UI Engineer | UX + Visual QA | `accepted` |
| `CW-16` | Keyboard shortcuts, if introduced, use modifiers and do not relay raw input to game panes | browser/game shortcuts remain authoritative unless explicitly scoped | shortcut conflict tests | Host Engineer | UX QA | `not introduced` |
| `CW-17` | Better UI injection remains top-frame, exact-origin, document-idle and per-document idempotent for every initialized pane | current injection security/timing contract | smoke + source audit | Host Engineer | Technical QA | `accepted` |
| `CW-18` | Normal workspace operation never mirrors clicks, keys or gameplay actions between accounts | gameplay autonomy and project no-automation invariant | source audit + negative tests | Host Engineer | Technical QA | `accepted` |
| `CW-19` | Pane creation/disposal/recovery never reuses another profile's CoreWebView2Environment/UDF | login/session isolation | adversarial lifecycle tests | Host Engineer | Technical QA | `accepted` |
| `CW-20` | Superseded Electron implementation is not used by the normal launcher | existing launcher compatibility | launcher smoke | Host Engineer | Technical QA | `accepted` |
| `CW-21` | Coupled mode is entered only from an explicit WebView2 host marker and can be removed without reloading | standalone Better UI keeps its normal toolbar and behavior | adapter unit tests + injection/source audit | Integration Engineer | Technical QA | `accepted` |
| `CW-22` | In coupled mode each WebView keeps its native menu nodes/handlers but the duplicated persistent toolbar is visually removed | no cloned handlers; cleanup restores standalone presentation | DOM lifecycle tests + render evidence | Integration Engineer | Technical + Visual QA | `accepted` |
| `CW-23` | One host Game Dock exposes high-frequency game navigation for the active account only | no Both/gameplay fan-out; UDF/session isolation unchanged | bridge smoke + active/swap/focus tests + render evidence | Host Engineer | Technical + UX QA | `accepted` |
| `CW-24` | Game Dock destinations are enabled only when the active page advertises the corresponding native capability | unavailable/late-hydrated destinations fail closed instead of synthetic navigation | adapter/host capability tests | Integration Engineer | Technical QA | `accepted` |
| `CW-25` | The Game Dock stays a single 44px logical row at the supported 1180px minimum and uses Miyazaki 16 current/focus semantics | Cards/Game content remains dominant; no horizontal dock scrolling | 1180/1600 render matrix + keyboard pass | UI Engineer | UX + Visual QA | `accepted` |
| `CW-26` | The native game `hunt-analyzer` menu action is the CW-M3 navigation target and is exposed through Game Dock only for the active profile | no external userscript target substitution; no Both fan-out | capability/action fixture + active/swap/focus bridge smoke | Integration + Host Engineer | Technical QA | `open` |
| `CW-27` | Hunt Analyzer activation delegates to the exact native `data-menu-id="hunt-analyzer"` node and otherwise fails closed | no synthetic navigation, scene recreation or gameplay logic | adapter identity/click tests + source audit | Integration Engineer | Architecture + Technical QA | `open` |
| `CW-28` | The native duplicated `ANALISADOR DE CAÇADA / Expandir` bottom strip is suppressed only after a reliable native structural selector is proven | no selector guessing; full native Hunt Analyzer remains reachable in the WebView | static DOM evidence or PO-run diagnostic probe + lifecycle tests | Integration Engineer | Technical + UX QA | `open` |
| `CW-29` | Any native strip suppression is coupled-only, reversible and keeps the original native element/listeners mounted | bridge failure or cleanup restores native access; standalone Better UI is unchanged | fallback/cleanup tests + render evidence | Integration Engineer | Technical + Visual QA | `open` |
| `CW-30` | The first corrected native CW-M3 slice does not ingest Hunt metrics or create a host Context Rail | this bounded candidate6 rule was later superseded by explicit Product Owner direction to incorporate the separate Analyzer project's information | candidate6 source/gates | Host + Integration Engineer | Architecture + Technical QA | `superseded by PO` |
| `CW-31` | `pokepixel-hunt-analyzer` remains the sole owner of Hunt protocol observation, persistence and metric formulas | no copied WebSocket parsing, IndexedDB reads or analytics formulas in Better UI/host | cross-repo source audit + Analyzer tests | Integration Engineer | Architecture + Technical QA | `locally gated; pending PO live validation` |
| `CW-32` | Analyzer embed mode is explicit, document-start and UI-less; it exposes only a versioned read-only Current summary | no accidental external panel/HUD duplication; no broad diagnostics bridge in embed mode | Analyzer public-summary + real embed-runtime tests + build audit | Analyzer Engineer | Technical QA | `locally gated; pending PO live validation` |
| `CW-33` | Historical: Better UI relayed only allowlisted bounded fields from `__POKEPIXEL_HUNT_ANALYZER_PUBLIC__` | session IDs, encounter rows, raw traffic and storage interfaces never cross the bridge | adapter unit tests + negative schema audit | Integration Engineer | Architecture + Technical QA | `retired by PO: no Hunt telemetry relay in 0.2.108` |
| `CW-34` | Historical: Analyzer host context was ephemeral and profile-owned across Dual/Single/Swap/Focus | no stale data, persistence or cross-account copying | host bridge/lifecycle/smoke | Host Engineer | Technical + UX QA | `retired by PO: no host Analyzer summary/cache in 0.2.108` |
| `CW-35` | Historical: the 32px read-only Context Rail was Game-profile only | Cards and native Game views retain access to Analyzer through their own surfaces | old mixed-view smoke + 1180 Game render | UI Engineer | UX + Visual QA | `retired by PO: three-row host without metrics footbar in 0.2.108` |
| `CW-36` | Coupled mode defaults to a data-first Cards dashboard while preserving explicit Game access | entire battle pair <=200px; no platform/gallery dominance; no fabricated target HP/chance | real-bundle WebView2 smoke + Dual/Single/Focus render matrix | Integration + UI Engineer | Architecture + UX + Visual QA | `locally gated; pending PO live validation` |
| `CW-37` | Epic attempts are visible first-class history with bounded canonical fields | max 8 newest-first; no encounter/session ids, raw rows or unused sprites cross the public projection | Analyzer contract tests + Better UI DOM tests + renders | Analyzer + Integration Engineer | Architecture + UX QA | `locally gated; pending PO live validation` |
| `CW-38` | Game Dock remains persistent when the native page bridge is unavailable | Cards/Game stay enabled; module buttons remain visible disabled/fail-closed; visible offline copy replaces tooltip-only failure | host smoke + dock geometry | Host Engineer | Technical + UX QA | `locally gated; pending PO live validation` |
| `CW-39` | `Cards | Game` is profile-owned: the host selector affects only Active, changing Active never mutates either profile's view, and native Game Dock activation forces only its active target to Game | divergent Rhyxus/Rhyosa view modes survive Swap, Focus/Restore, Single/Dual recreation and pane recovery; no Both fan-out | mixed-view bridge smoke + settings/lifecycle/recovery smoke | Host Engineer | Technical + UX QA | `locally gated; pending PO live validation` |
| `CW-40` | Cards overview presents **Hunt summary → Capture → Captured / Seen** and omits the impossible user-facing Unknown rarity tile | seven canonical rarity counters remain Analyzer-owned; no metric fabrication | Cards DOM/order + rarity projection tests | UI + Integration Engineer | UX QA | `locally gated; pending PO live validation` |
| `CW-41` | Cards identifies the Hunt target from Analyzer state without requiring Hunts/Atlas to have been opened, and keeps that identity readable between encounters | native species metadata only for art; no synthesized asset path; Hunt-zone memory is optional enrichment | no-Hunts target regression + native-species fallback tests | Integration Engineer | Architecture + Technical QA | `locally gated; pending PO live validation` |
| `CW-42` | Team switch clears transient `Team indisponível` after runtime hydration and keeps all six members actionable according to native availability/fainted state | explicit switch result feedback is not cleared; active identity does not depend on one HUD DOM instance | 0→6 hydration + explicit switch tests | UI Engineer | Technical + UX QA | `locally gated; pending PO live validation` |
| `CW-43` | Hunt Story shows Pokémon visual/identity, Rarity, continuous Quality, outcome, Ball/Chance, authoritative IV Total and inline captured genetics without a per-row disclosure | terminal `ivTotal` stays bounded 0–186; failed rows expose only that scalar, not captured-only genetics; no raw encounter/session payload | Analyzer public-summary tests + Cards history DOM tests | Analyzer + UI Engineer | Architecture + UX QA | `locally gated; pending PO live validation` |
| `CW-44` | Loot Story exposes dropped item identity/quantity, explicit financial labels and item-rarity filtering | Analyzer carries only authoritative itemId/qty; name/rarity enrichment is read-only native metadata; missing rarity remains visible/unclassified | Analyzer loot-contract tests + Cards native-metadata/filter tests | Analyzer + Integration Engineer | Architecture + UX QA | `locally gated; pending PO live validation` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| `R-CW-01` | Lazy second-account creation may accidentally create/dispose the wrong UDF or lose a live session during mode switches | repeated single→dual→single lifecycle test checking profile/UDF identity | `closed locally` |
| `R-CW-02` | Swapping visual panes could be implemented by swapping profile data instead of controls, contaminating account ownership | adversarial swap test asserting environment/UserDataFolder identity never changes | `closed locally` |
| `R-CW-03` | Focus mode can accidentally dispose or navigate the hidden pane rather than merely changing layout | focus/restore test with preserved URL/environment/state | `closed locally` |
| `R-CW-04` | A generic “Both” command path could become an accidental gameplay automation surface | command registry allowlist audit; negative test rejects unknown/gameplay commands | `closed locally` |
| `R-CW-05` | Persisted malformed JSON/state can make the workspace fail at startup | corrupt/partial/future-version state fixtures with safe default fallback | `closed locally` |
| `R-CW-06` | Compact toolbar can overflow once profile names/status/error copy expand | representative 1180px + stress-label render | `closed locally` |
| `R-CW-07` | Gold active-pane treatment and cyan keyboard focus can collapse into one ambiguous signal | selected+focus render matrix | `closed locally` |
| `R-CW-08` | Health polling/diagnostics could become a host↔page bridge broader than required | source/API audit; only minimal marker/status script reads allowed | `closed locally` |
| `R-CW-09` | Dynamic WebView2 reparent/show-hide can expose WinForms disposal/handle-order bugs | repeated mode/layout smoke with ProcessFailed and handle assertions | `closed locally; Product Owner live validation functional` |
| `R-CW-10` | Split persistence from the old `split.txt` can conflict with new structured settings | migration test and one-way import/delete-or-ignore policy | `closed locally` |
| `R-CW-11` | Hiding the native menu could also remove the only working action handlers | keep original nodes mounted and delegate activation to those exact nodes | adapter DOM identity/click tests | `closed locally` |
| `R-CW-12` | A generic bridge could grow into gameplay automation or leak account state | narrow versioned allowlist: capability discovery + explicit single-account surface activation only | source audit + negative-message tests | `closed locally` |
| `R-CW-13` | Confusing the external userscript with the native game Hunt Analyzer can produce a coherent but product-invalid integration | native target identity must be proven from game menu/DOM evidence; external `#pokepixel-hunt-analyzer-root` and `#pha-toggle` are out of scope | target-identity source audit | `open` |
| `R-CW-14` | Guessing the native bottom-strip selector could hide unrelated game UI or remove the only native Analyzer access path | require stable structural evidence; keep node/listeners mounted; use a read-only diagnostic probe when evidence is insufficient | selector evidence + fallback/cleanup tests | `open` |
| `R-CW-15` | Embedding the external Analyzer could create a second analytics implementation in the Coupled Workspace | inject the Analyzer engine itself; consume only its versioned public summary API | cross-repo source audit | `closed locally` |
| `R-CW-16` | A broad Analyzer bridge could leak encounter/session/account state across panes | public API excludes rows/session IDs/raw frames; Better UI re-allowlists fields; host stores summary only on the source `AccountPane` | unit/schema/isolation smoke | `closed locally` |
| `R-CW-17` | A stopped/remounted Analyzer could leave misleading metrics visible | explicit unavailable plus ~3s host freshness lease and lifecycle resets | expiry/navigation/process/dispose smoke | `closed locally` |
| `R-CW-18` | Another script already executing in the same allowed top-level game document could post a syntactically valid Analyzer summary directly to `chrome.webview` and bypass Better UI's source-timestamp check for the host receive lease | host source/current-document gate + per-pane ephemeral state; no persistence, cross-pane copy or gameplay action; future hardening may add sender authentication/nonce | architecture review | `P3 accepted for local candidate; same-pane read-only display only` |

## Gate state

- Intake: **complete**.
- Product plan approval: **complete**.
- F0 Acceptance Contract: **DESIGN READY + ARCH READY**.
- F1 Host refactor: **TECH READY**.
- F2 lifecycle / structured persistence: **implemented and covered by repeated smoke**.
- F3 layout engine: **TECH READY**.
- F4 Command Deck: **TECH READY + UX READY + VISUAL READY**.
- F5 health / diagnostics / Maintenance Drawer: **TECH READY + UX READY + VISUAL READY**.
- Original candidate TECH / UX / VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0** before the later keyboard-boundary audit.
- Product Owner live validation of original candidate: **functional on 2026-09-20**.
- Post-live F6-F8 audit found one Maintenance Drawer Tab-boundary defect in the original candidate; the Product Owner's functional report was not an itemized keyboard-accessibility certification.
- Corrected `candidate2` TECH QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Corrected `candidate2` A11Y/QOL QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Corrected `candidate2` UX/VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0**; approved render hashes are byte-identical to the prior candidate.
- Product Owner live revalidation of corrected `candidate2`: **COMPLETE — functional on 2026-09-20**.
- A later Product Owner UI/UX audit reopened the visual gate after visible alignment defects were reported in the Command Deck.
- Alignment correction `candidate3` TECH-UI QA: **READY — P0=0, P1=0, P2=0, P3=0** on exact artifact SHA `A304E45F55152350A569EB6AA0816779154A11287A8D1062DAEA4E64E4CAF830`.
- Alignment correction `candidate3` UX/A11Y QA: **READY — P0=0, P1=0, P2=0, P3=0** on the same exact artifact.
- Alignment correction `candidate3` VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0** on the same exact artifact and its fresh 20-render matrix.
- Proper blocking `candidate3` smoke (`Start-Process -Wait`) after the final keyboard-routing fix: **PASS**, exit `0`, stderr empty; all 20 local render artifacts regenerated from that run.
- Product Owner live validation of exact `candidate3`: **COMPLETE — validated on 2026-09-20**.
- Final normal-host promotion from the `candidate3` source: **COMPLETE**.
- Final normal-host build / blocking local smoke / compatibility-wrapper validation: **PASS**.
- Final independent release audit on the newly promoted host: **RELEASE READY — P0=0, P1=0, P2=0, P3=0**.
- Game Dock `candidate4` local implementation: **complete for CW-M1 + first CW-M2 slice; independent local closure complete**.
- Game Dock `candidate4` exact artifact: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate4.exe`, SHA-256 `E7BC1DA7083B3E095836BB20F99F57571814199317E612F75E4A007EE4A8D924`.
- Game Dock Better UI bundle SHA-256: `87078A53369F3ED15CEF093A583C7CE52596BF5F2ED3D1E88C3B75BEF4CB026B`.
- Game Dock focused adapter/menu tests: **25/25 PASS**; full Better UI suite: **307/307 PASS**.
- Game Dock exact `candidate4` TECH/ARCH QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Game Dock exact `candidate4` UX/A11Y QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Game Dock exact `candidate4` VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0** on the fresh 25-render matrix.
- Game Dock candidate build + final exact `candidate4` blocking smoke (`Start-Process -Wait`): **PASS**, exit `0`, stderr empty.
- Product Owner live validation of exact Game Dock `candidate4`: **COMPLETE — functional on 2026-09-20**.
- Game Dock source promotion to normal host: **COMPLETE**; `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.exe` SHA-256 `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.
- Promoted normal-host blocking smoke: **PASS**, exit `0`, stderr empty.
- Direct WebView2 launcher `-SkipBuild -Smoke`: **PASS**; compatibility wrapper `-SkipBuild -ValidateOnly`: **PASS**.
- `candidate2`, `candidate3` and exact validated `candidate4` remain preserved byte-identical after promotion.
- Runtime release state: **user-validated and promoted locally**; exact normal-host smoke/launcher/wrapper validation passes on the current worktree.
- Repository/history release audit: **NOT READY — P0=0, P1=1, P2=0, P3=0**. The validated bundle `87078A53369F3ED15CEF093A583C7CE52596BF5F2ED3D1E88C3B75BEF4CB026B` also depends on pre-existing Better UI/build inputs outside the Game Dock slice, so the Game Dock source alone cannot byte-reproduce the Product Owner-validated runtime from a clean checkout.
- Repository/history completion therefore remains pending both a reproducible Better UI baseline and explicit Product Owner authorization for Git history. Do not mass-stage unrelated work merely to close this provenance gap.
- CW-M3 external-analyzer experiment `candidate5` is **SUPERSEDED / PRODUCT-INVALID**. It targeted the external `#pokepixel-hunt-analyzer-root`, while the Product Owner screenshot shows the native game `ANALISADOR DE CAÇADA / Expandir` surface and the native menu exposes `data-menu-id="hunt-analyzer"`.
- Superseded artifact is preserved for provenance only: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate5.exe`, SHA-256 `44E3274191E67442BF4274E99B0865B7371CBF3B08D8D3214EB6DC5513D50775`; its local 28/28, 310/310 and smoke results prove only internal coherence of the wrong target and are not release evidence.
- External-analyzer source/Context Rail rollback: **COMPLETE**. Focused Coupled/Menu tests returned **25/25 PASS**; full Better UI suite returned **307/307 PASS**; build **PASS**.
- Post-rollback Better UI bundle exactly reproduces the Product Owner-validated Game Dock SHA-256 `87078A53369F3ED15CEF093A583C7CE52596BF5F2ED3D1E88C3B75BEF4CB026B`.
- Safe rollback host verification artifact `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.rollback-check.exe` compiled and authoritative `Start-Process -Wait --smoke` passed with exit `0` and empty stderr.
- Normal promoted Game Dock host remains unchanged at SHA-256 `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`; validated `candidate4` remains unchanged at `E7BC1DA7083B3E095836BB20F99F57571814199317E612F75E4A007EE4A8D924`.
- Candidate6 correction established the native `hunt-analyzer` Game Dock destination and the no-guess rule for the duplicated native bottom strip. Its temporary "no host Context Rail / no external Analyzer data" scope was later superseded by explicit Product Owner direction to incorporate information from `G:/pokepixel-hunt-analyzer` through a new Analyzer-owned public API.
- Corrected native CW-M3 Game Dock slice is frozen as `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate6.exe`, SHA-256 `5B575EA6A644A6ED876AD58EC064616D6643695E026385559E42ED82B2560DDD`; Better UI bundle remains the Product Owner-validated Game Dock SHA-256 `87078A53369F3ED15CEF093A583C7CE52596BF5F2ED3D1E88C3B75BEF4CB026B`.
- Candidate6 scope is deliberately narrow: add the native `hunt-analyzer` destination to the active-account-only Game Dock and delegate to the exact existing native `data-menu-id`; the native `ANALISADOR DE CAÇADA / Expandir` bottom strip is still untouched because no reliable structural selector exists in repository/static evidence.
- Candidate6 automated verification: focused Coupled/Menu **25/25 PASS**; full Better UI suite **307/307 PASS**; build **PASS**; authoritative candidate6 `Start-Process -Wait --smoke` **PASS**, exit `0`, stderr empty.
- Candidate6 independent TECH/ARCH QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Candidate6 independent UX/A11Y QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Candidate6 independent VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0** on the fresh exact-candidate render matrix. At 1180px the seven destinations remain one 28px row with exact 6px gaps; `Hunt Analyzer` has no clipping/overflow, active gold and keyboard-focus cyan remain independent, and the viewport flows directly into the 44px Game Dock with no stale Context Rail.
- Candidate6 local handoff state: **TECH/ARCH READY + UX/A11Y READY + VISUAL READY; pending Product Owner live validation**. The normal host is intentionally not promoted yet.
- A separate read-only diagnostic probe exists at `tools/coupled-workspace-webview2/native-hunt-analyzer-probe.js` for Product Owner execution only if native bottom-strip selector evidence is still needed. It is not injected or referenced by runtime code.
- Product Owner subsequently expanded scope: information from `G:/pokepixel-hunt-analyzer` is now intentionally incorporated, while native Hunt Analyzer navigation remains a separate game-owned destination. Candidate5 remains invalid because it scraped/identified the wrong UI surface; the new integration uses an explicit Analyzer-owned public API instead.
- Analyzer-side public summary/embed implementation after the real embed-hydration correction: **418/418 PASS**, production userscript build **PASS**, userscript release verification **PASS**. `tests/integration/embedRuntime.test.js` bundles and executes the real Analyzer entry point in an exact-origin simulated embed with fake IndexedDB, proves the public summary reaches `available:true` without mounting Analyzer UI/diagnostics, and proves the scheduled 1s refresh advances Analyzer-owned `capturedAtMs`. Embed mode skips Analyzer UI/audio/gallery/history controls and the broad diagnostics global while retaining its canonical passive analytics engine.
- Better UI adapter now relays only the versioned public summary allowlist and requires the Analyzer-owned `capturedAtMs` to be current (<=3s old and not future-dated) before renewing host context. A frozen/missing/future source timestamp fails closed even if the public API remains callable. Focused Coupled/Menu tests are **30/30 PASS** and full Better UI suite is **312/312 PASS**; Better UI build **PASS**.
- Host development smoke with the 32px Analyzer Context Rail: **PASS**, exit `0`, stderr empty. Candidate7 was intentionally superseded before delivery after a source-freshness edge was found. Candidate8 was then independently rejected (**TECH/ARCH NOT READY, P1=1**) because `performCurrentLoad()` still required the optional Analyzer `ui`, while embed mode intentionally does not mount that UI; its real public summary therefore never hydrated. Candidate8 is provenance-only and must not be delivered.
- Corrected external-analytics candidate is frozen as `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate9.exe`, SHA-256 `82D857FC4FEEABD21B69F1886A396395AAD9F3E15A4446E989C1B64D2048955C`.
- Exact Better UI bundle for candidate9: SHA-256 `5565A7C6928EE2F0B5461EB829F5BF93B4444109C62DEB3B90A6EE1114C84008`. Exact embedded Analyzer bundle: SHA-256 `1CD491AEDB790A07A8CAC4952564CCC2A469A084E46DF58A36BDACD0CC729CA0`; it is byte-identical to the Analyzer repository's rebuilt production userscript.
- Candidate9 fixes the candidate8 P1 by making Current hydration depend only on the Analyzer repositories; UI/HUD rendering is optional. The real embed-runtime integration test closes the corresponding execution-evidence gap without changing candidate9 runtime bytes.
- Authoritative candidate9 `Start-Process -Wait --smoke`: **PASS**, exit `0`, stdout includes `WebView2 coupled workspace smoke: PASS`, stderr empty. Fresh candidate9 Analyzer-rail renders were regenerated at approximately `2026-09-20 23:15:10 -03:00` and exclude the stale candidate5 `context-rail-*` evidence.
- Candidate9 independent UX/A11Y QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Candidate9 independent VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0** on the fresh candidate9 render matrix; Dual 1600/1180/1:2, Single and Focus preserve the 32px rail, live splitter alignment, no overflow/stale divider and the existing gold-current/cyan-focus semantics.
- Candidate9 independent TECH/ARCH QA after dynamic embed coverage: **READY — P0=0, P1=0, P2=0, P3=1**. The only remaining P3 is same-document transient summary spoofing described by `R-CW-18`; it cannot persist state, cross profiles or trigger gameplay.
- Candidate9 local handoff state: **TECH/ARCH READY + UX/A11Y READY + VISUAL READY; Product Owner live validation functional on 2026-09-21**. The normal host remains unchanged at SHA-256 `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`; candidate9 was not promoted before the richer candidate12 follow-up began.
- Product Owner live validation of candidate9 on 2026-09-21: **functional**. The follow-up requirement is to surface more of the Product Owner's own `pokepixel-hunt-analyzer` features in the host, specifically Seen by rarity and capture chance, while retaining the existing native-vs-external Analyzer separation.
- The richer summary remains Analyzer-owned. `Seen` by rarity is projected from canonical `metrics.rarities`; `LAST CH` is the chance on the latest **completed** capture attempt, not the Current-Hunt aggregate capture rate and not a prediction for the current target. The latest-attempt scalar is cached inside the Analyzer so the ordinary 1s refresh remains O(1); an O(N) derivation occurs only on the existing encounter-list reload path and terminal changes update the cache incrementally.
- Candidate10 (`B7EFE689958B82D8311F26A635CC87683269D28C71A6A7F03DAD42AC02293F13`) is **SUPERSEDED / NOT FOR DELIVERY**. UX/A11Y found that the narrow <430px branch abbreviated latest chance as `CH`, which was visibly ambiguous at the supported 1180px 1:2 layout. Candidate11 (`E7C9C0595F65CC7C99276F8F3D5DE27526596C48407AA89AB70B42734A16EF02`) fixed the visible copy to `LAST CH` but is also **SUPERSEDED / NOT FOR DELIVERY** because TECH/ARCH found `Number(null) -> 0` coercion could fabricate `LAST CH 0.000%` for unavailable data.
- Candidate12 closes both findings with strict numeric boundaries: null/undefined/empty/string/nonfinite/out-of-range latest chance remains unavailable (`—`), while a real numeric zero remains a valid `0.000%`. The same strict boundary preserves nullable aggregate rates instead of fabricating zero values.
- Candidate12 host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate12.exe`, SHA-256 `872EDAA247C216FC19AA160264546185A5F3BBC84ECAC2926960F0261C4C4C1D`.
- Candidate12 Better UI bundle SHA-256: `CC25C78681862239094A78693C3DECA8506640A5EE569193AE7FFDAE14EA167B`. Analyzer embed SHA-256: `5B2A83863F9C00569B318D53B589B45347A13BAF29E0161AC186D891D83908F1`, byte-identical to the Analyzer production build.
- Candidate12 automated verification: Analyzer **424/424 PASS** with production build/release verification PASS; Better UI **314/314 PASS**; focused strict-null/latest-attempt/bridge coverage PASS; exact candidate12 `Start-Process -Wait --smoke` **PASS**, exit `0`, stderr empty.
- Candidate12 fresh Analyzer-rail render evidence was independently regenerated during Visual review at approximately `2026-09-21 09:25:56–57 -03:00`. The rail remains 32px and the supported matrix covers Dual 1600/1180/1:2, Single 1180 and Focus-right 1180.
- Candidate12 independent TECH/ARCH QA: **READY — P0=0, P1=0, P2=0, P3=1**. The existing `R-CW-18` same-document transient read-only display-spoof edge is unchanged; no persistence, cross-profile state or gameplay action is reachable through it.
- Candidate12 independent UX/A11Y QA: **READY — P0=0, P1=0, P2=0, P3=0**. `LAST CH` remains explicit at every width tier; aggregate `Capture rate` remains separately named; full rarity names and latest-completed-attempt semantics remain in accessibility/tooltip text.
- Candidate12 independent VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0**. At 1180px 1:2 the 385px narrow cell visibly retains W/C/U/R/E/L/M plus explicit `LAST CH` on one line with no ellipsis/collision; Dual/Single/Focus divider geometry and adjacent Command Deck/Game Dock semantics remain unchanged. The synthetic fixture uses `Unknown=0`, so the conditional `?N` branch is covered structurally/tests rather than by this render matrix.
- Candidate12 local gates were **TECH/ARCH READY + UX/A11Y READY + VISUAL READY**. Product Owner live validation on 2026-09-21 found it **functional**, but explicitly rejected its rail/platform-dominant presentation as not adding enough visual value. Candidate12 is therefore a functional historical reference, not the final product direction. The normal host remained preserved and unmodified.
- Product Owner approved the next card-mode visual direction on 2026-09-21. New hard requirements: replace the large platform/game presentation with data-first cards; represent the battle only as an extremely simple **card × card** strip capped at 200px logical height for the entire strip (not 200px per Pokémon and not a sprite gallery); surface Epic attempt history directly; and keep Command Deck/Game Dock/module menus easy, persistent and intuitive. Essential analytics must not depend on dense tooltips.
- Card-mode implementation verification: Analyzer **430/430 PASS** plus production build/release verification PASS; Better UI **321/321 PASS** plus production build PASS.
- Analyzer card projection keeps current target fail-closed (`exactly one` active target) and Epic history bounded newest-first to `{atMs, species, chance, result, ball}`. Target HP/current capture chance are not fabricated; encounter/session IDs, raw rows and unused Epic sprites are excluded. Analyzer production userscript and Coupled embed are byte-identical at SHA-256 `C8B6E1A75C2D27EAC92CA27C9D16D069006CCA4EC44E2C76F4A469746CAAE814`.
- Better UI card dashboard consumes the nested target/history fields **inside the page only**; the native host relay remains the bounded scalar Analyzer summary.
- Candidate13 is **REJECTED / NOT FOR DELIVERY**: its first exact smoke correctly failed because an obsolete regression assertion still required the 32px Analyzer rail to be visible while Cards mode intentionally collapses it.
- Candidate14 passed after the smoke contract was corrected for Cards mode. It is superseded by candidate15, which adds explicit bridge-unavailable Dock verification.
- Candidate15 artifact: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate15.exe`, SHA-256 `DA146BF619FCF9AC1DBDEB0846822F7597D054C6DF2CE8A5745634E5A9D726DC`, size 194560 bytes; Better UI SHA-256 `18E197B6EE8DE6B1B67B15EEF2CE3FC876C70B63BFCE68DA7DBD6F717A7763E4`.
- Exact candidate15 blocking `--smoke`: **PASS**, exit `0`, stdout includes `WebView2 coupled workspace smoke: PASS`, stderr empty. The visual smoke executes the real Better UI bundle on local synthetic pages and requires the Cards root visible, battle strip `>0 && <=200px`, no horizontal overflow and exactly 8 Epic rows. It also proves Cards→Game→Cards switching and persistent 44px Dock behavior while bridge capabilities are unavailable/recovered.
- Candidate15 fresh render matrix covers Cards Dual 1600/1180/1:2, Single 1180, Focus left/right 1180 and distinct Game Dual 1180. Independent VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Candidate15 independent TECH/ARCH QA: **READY — P0=0, P1=0, P2=0, P3=1**. Only the pre-existing `R-CW-18` same-document transient read-only display-spoof edge remains; it cannot persist state, cross profiles or trigger gameplay.
- Candidate15 independent UX/A11Y final gate: **NOT READY — P0=0, P1=1, P2 findings present, P3=0**. Concrete blockers: Focus-right visible order and natural Tab order diverged; Cards/Game current view was color-only to assistive technology; decorative sprite fallback `?` leaked to AT; the Unknown rarity was visible only as `?`; and Epic history had incomplete ARIA table semantics. Candidate15 is therefore **REJECTED / NOT FOR DELIVERY** despite its TECH/ARCH and VISUAL gates.
- Candidate16 closes the candidate15 UX/A11Y findings without changing Analyzer ownership or analytics logic: dynamic `TabIndex` follows the visible Dual/Focus hierarchy; Cards/Game accessible names explicitly expose the current view and emit accessibility state change only when that accessible state changes; decorative fallback glyphs are `aria-hidden`; the rarity card visibly names `Unknown`; Epic history exposes complete table/rowgroup/row/columnheader/cell semantics, including an empty-state row/cell.
- Current frozen card-mode artifact: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate16.exe`, SHA-256 `D387372C5589A34585D6EDB28C6B1E4687B16A42724FE66659F0408CF4B102E1`, size 195584 bytes. Exact Better UI production bundle SHA-256: `49911D2A78867C406C47E973BB4BBC5B9908DDC0C66B5968818E75E7B14972D2`; Analyzer PROD/embed remains `C8B6E1A75C2D27EAC92CA27C9D16D069006CCA4EC44E2C76F4A469746CAAE814`.
- Exact candidate16 blocking `--smoke`: **PASS**, exit `0`, stdout includes `WebView2 coupled workspace smoke: PASS`, stderr empty. Better UI remains **321/321 PASS + build PASS**; Analyzer remains **430/430 PASS + build/release verification PASS**.
- Candidate16 independent UX/A11Y QA: **READY — P0=0, P1=0, P2=0, P3=0**. It specifically verifies the Focus-right traversal closure, non-color-only Cards/Game current state, decorative fallback ownership, visible Unknown meaning, complete Epic table semantics and the original card-mode navigation/data hierarchy.
- Candidate16 independent VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0** on fresh 11:27 local renders. At 1180px 1:2, visible `Unknown` and its count fit the narrow rarity tile without clipping/collision; no horizontal overflow is introduced, and the Epic semantics change leaves table geometry unchanged.
- Candidate16 independent TECH/ARCH final gate: **READY — P0=0, P1=0, P2=0, P3=1**. The candidate16 accessibility-only delta does not alter Analyzer ownership, bridge payload shape, navigation scope, UDF lifecycle, persistence or gameplay behavior. The sole P3 remains pre-existing `R-CW-18`: a script already executing in the same allowed top-level game document can forge a syntactically valid scalar Analyzer summary and transiently spoof same-pane read-only display state; no persistence, cross-profile copy, credential access or gameplay action is reachable.
- Candidate16 independent local acceptance: **ACCEPTED for Product Owner live validation — P0=0, P1=0, P2=0, P3=1**. The sole P3 is the already-documented `R-CW-18`; it is not a local-handoff blocker. Artifact/source timestamps are coherent, both repositories have empty Git indexes, and no post-build runtime-code drift exists after candidate16 generation.
- Candidate16 local handoff state before live: **TECH/ARCH READY + UX/A11Y READY + VISUAL READY + ACCEPTED for Product Owner live validation**. That local acceptance did not constitute Product Owner product approval.
- Product Owner live validation of candidate16 on 2026-09-21: **REJECTED AS FINAL PRODUCT DIRECTION / NOT FOR PROMOTION**. The card-first information architecture and persistent navigation were retained, but the visible result was judged too homogeneous, simplistic and CMD-like, with weak section identity and uneven card rhythm. Live also exposed a missing active-player sprite, Epic-only history as too narrow, and an economy surface that showed `$/h` without total profit or loot value. The normal host was not promoted.
- Post-candidate16 corrective cycle requirements: preserve the simple card-first structure and complete battle strip `<=200px`; make all-rarity attempt history first-class with visible filters; expose Analyzer-owned total revenue, revenue/h, expenses, profit, profit/h and canonical loot **sell value** (itemized loot is not retained by the canonical encounter pipeline); show total and hourly XP; fix real Team HUD sprite hydration without inventing target art; and strengthen visual hierarchy using Miyazaki16 plus canonical `--quality-*` rarity accents while keeping square geometry and no decorative animation.
- Corrective implementation now replaces the page-local Epic-only projection with bounded newest-first `attemptHistory` (max 32) carrying only `{atMs, species, rarity, shiny, chance, result, ball}`. It keeps the exact-one-current-target fail-closed rule and continues to strip nested history/current-target data before the native host relay. Analyzer protocol v1 retains a derived bounded `epicAttempts` compatibility field for older page-local consumers; the new Cards UI does not depend on it.
- Analyzer economics are now additive and Analyzer-owned: existing `gold/goldPerHour` semantics remain gross-revenue compatibility aliases while canonical `directGold`, `lootSellValue`, realized `autoSellValue`, `revenue/revenuePerHour`, `expenses/expensesPerHour`, and signed `profit/profitPerHour` are computed in full, refresh and incremental paths. No item names/quantities are fabricated from `lootSellValue`.
- Corrective focused verification so far: Analyzer economics/history/public-summary **29/29 PASS**; Better UI coupled workspace **22/22 PASS**, including active Team HUD portrait fallback, late compact-sprite hydration, all-rarity history filters, scalar-only host relay and expanded economy rendering. Full suites/candidate17 smoke and independent gates remain pending; no corrective candidate is approved yet.
- Candidate17 (`E2DB7ACD20AD39E7731E570B3FD6175BB47F52511943A51D5537CA53BDFD28B3`, 198144 bytes) closed the functional/data redesign and passed Analyzer **430/430 + build/release verify**, Better UI **323/323 + build**, exact smoke, TECH/ARCH **READY P0=0 P1=0 P2=0 P3=0** and UX/A11Y **READY P0=0 P1=0 P2=0 P3=0**. Before Product Owner delivery, render review exposed a remaining density flaw: all 32 history rows expanded inline ahead of `Economia / XP`, making the newly added revenue/profit/loot totals unnecessarily deep in the page. Candidate17 is therefore **SUPERSEDED / NOT FOR DELIVERY**, preserved unchanged as evidence.
- Candidate18 addresses only that density defect while preserving the complete 32-row page-local history contract and filters: the attempt table is a bounded square internal scroll surface (`224px`, `252px` on `<520px`) with a sticky column header. This keeps recent attempts directly visible while avoiding a ~32-row wall before Economy; no analytics are discarded or re-aggregated in Better UI.
- Candidate18 exact host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate18.exe`, SHA-256 `7724DF12512D48030740FD79AD293C73FC140FD22F1B1A887309C130771A6D82`, size 198656 bytes. Better UI bundle SHA-256: `E913528A3A5C5654DA1B3AD1553E4AB5817142457FBD77A4FE58A81DCFCA7D98`, size 724077 bytes. Analyzer PROD/embed remains byte-identical at `0B44BA73617DF37D94082A208D3497363D87A65042FDE4006C0F379A2F979DDA`.
- Candidate18 automated verification: Better UI focused coupled **22/22 PASS**, full **323/323 PASS + build PASS**; exact candidate18 `--smoke` **PASS**, exit `0`, stderr empty. The smoke now additionally requires the 32-row history to overflow vertically inside its bounded table (`scrollHeight > clientHeight`, client height `<=252px`, `overflow-y:auto`) while the Economy surface remains present. Independent candidate18 VISUAL/TECH/UX delta gates remain pending; it is not yet Product Owner-approved or promoted.
- Candidate19 is preserved as the final data/economy/history visual predecessor. Product Owner live feedback on 2026-09-21 confirmed that the direction was on the right path but expanded the requirement: Cards is the screen used for roughly 95% of Hunt play and must become the primary Hunt operating surface, including useful active-Team and Ball controls plus explicit Shiny treatment. Candidate19 was therefore not promoted.
- Candidate20 (`0.2.30`) implements that Hunt-console delta without moving Analyzer ownership: explicit target/history Shiny state, native/server-metadata player sprite fallback, player HP rail, active-Team selection and persistent Auto Ball preference inside the complete `<=200px` battle/control module. The two write paths are user-initiated page-local actions only; Analyzer target data never selects a Team member, Ball or Normal/Shiny editing scope.
- Candidate20 hardening closes two pre-freeze review findings: Auto Ball validates inventory **before** reading the latest Hunt settings immediately before the native full-payload update, preventing a slow inventory request from replaying an older unrelated-settings snapshot; the earlier `inventory.updated` listener was removed, passive settings/inventory reads are bounded by a 30s cache, and failed species-sprite metadata lookup is capped at four attempts per player identity.
- Current exact candidate20 host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate20.exe`, SHA-256 `2EF0D771998A2091C5411F84C1764B86303ED655B574219F208A6168075586D5`, size 210944 bytes. Better UI bundle SHA-256: `2343D6D126D35B6C5AF898FB9396E7C9BD4DFD51BCF4A84CA62712FA766E02EE`, size 748544 bytes. Analyzer PROD/embed remains byte-identical at `0B44BA73617DF37D94082A208D3497363D87A65042FDE4006C0F379A2F979DDA`.
- Candidate20 automated verification on the exact corrected snapshot: coupled focused **30/30 PASS**, full Better UI **331/331 PASS**, build PASS and exact `--smoke` **PASS** with exit `0`/empty stderr. Smoke now also creates a required scrolled History render containing Shiny and non-Shiny rows with a non-zero internal table scroll, in addition to the Dual/Single/Focus/1:2 matrix and no-horizontal-overflow checks. Independent exact TECH/ARCH, UX/A11Y and VISUAL final gates are required before Product Owner live handoff.
- Candidate20 exact TECH/ARCH final gate: **READY — P0=0, P1=0, P2=0, P3=0**. The prior stale-settings overwrite and cleanup-listener findings are closed; source mtimes precede the frozen dist/host, Team/Auto Ball remain explicit same-page actions, Analyzer ownership/host scalar relay remain intact, and no scheduled, mirrored or cross-account write path exists.
- Candidate20 exact VISUAL final gate: **READY — P0=0, P1=0, P2=0, P3=0** on fresh `18:17:17–19Z` evidence. Hardest 1:2 keeps textual `EPIC` plus explicit `SHINY`, wrapped exact player HP, the full battle/control module below 200px and no horizontal overflow. The dedicated History capture proves shiny/non-shiny rows, structural Shiny treatment, sticky header and an already-scrolled internal table.
- Candidate20 exact UX/A11Y final gate: **READY — P0=0, P1=0, P2=0, P3=0**. Natural keyboard order is Team -> Auto Ball scope -> Ball -> History filters; controls have explicit context-rich labels, mutation feedback is textual through polite live regions, busy controls disable during native writes, fainted Team members remain disabled and text-labelled, and no essential rarity/Shiny/result state depends on color or tooltip. History retains table/rowgroup/row/cell semantics with per-cell column context even in the compact narrow rendering.
- Candidate20 independent local acceptance: **ACCEPTED for Product Owner live validation — P0=0, P1=0, P2=0, P3=0**. Exact host/Better UI/Analyzer hashes match the frozen record, source/runtime timestamps remain coherent, the Git index is empty, all three final gates are READY, and the normal host remains unchanged. This acceptance authorizes only Product Owner live validation; it does **not** authorize promotion or Git history changes.
- Product Owner live validation then **REJECTED candidate20 for promotion**: target art and the rest of the Hunt console were present, but the active Rhydon/Gyarados player slots remained visually blank. The live evidence supersedes the prior local acceptance for sprite correctness; candidate20 remains preserved only as the Hunt-console baseline.
- Candidate21 (`0.2.31`) was a first sprite-only corrective. It added a strict canonical PokémonDB fallback from `species_id`, bounded failed native `getSpecies()` metadata reads to four attempts and rejected a fully transparent native active-portrait canvas before serialization. Focused **32/32**, full **333/333**, build and exact smoke passed; exact VISUAL gate was **READY P0=0 P1=0 P2=0 P3=0**, while TECH/ARCH found no runtime defect and only a P3 documentation-traceability gap.
- Before candidate21 could be handed back to live validation, a new targeted regression reproduced a second transparent-canvas path in the shared `teamPresetVisualReader`: `spriteFromCard()` could serialize a fully transparent compact Team-card canvas into a truthy `data:image/png`, which then took precedence over the corrected active portrait and canonical species fallback. That regression failed on candidate21 with the blank data URL and therefore superseded candidate21 before delivery.
- Candidate22 (`0.2.32`) fixes only that remaining path. The shared Team-card canvas extractor now performs the same bounded alpha inspection used by Cards: width/height must be positive; canvases up to 65,536 pixels are rejected only when every alpha byte is zero; larger canvases and tainted/unavailable readback keep the prior conservative native path. This also prevents Saved Teams/HUD capture from persisting a canvas proven empty without changing valid image/CSS/object sprite precedence.
- Current exact candidate22 host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate22.exe`, SHA-256 `F91576512EC39C3FAE970089D3A7395A6333B75D77EA2E7EFA4FBF968EA9A014`, size 210432 bytes. Better UI `0.2.32` bundle SHA-256: `EF8D30057C0B7548C53FF839CE41C432982C3141D1A2E6A3D230879BC334EBA0`, size 750416 bytes. Analyzer PROD/embed remains byte-identical at `0B44BA73617DF37D94082A208D3497363D87A65042FDE4006C0F379A2F979DDA`.
- Candidate22 automated verification on the frozen runtime: coupled focused **33/33 PASS**, full Better UI **334/334 PASS**, build **PASS**, and exact `candidate22 --smoke` **PASS** with exit `0` / stdout ending `WebView2 coupled workspace smoke: PASS` / empty stderr. The synthetic smoke now includes a fully transparent compact active-Team canvas on both panes; Rhyxus must bypass it and retain visible native Rhydon portrait art, while Rhyosa has both compact and active-portrait canvases transparent and must reach exactly `https://img.pokemondb.net/sprites/black-white/normal/gyarados.png`.
- Candidate22 exact TECH/ARCH corrective gate: **READY — P0=0, P1=0, P2=0, P3=0**. Exact hashes/sizes/version match; focused **33/33**, full **334/334** and the relevant Saved Teams focused set **40/40** pass independently. The shared resolver change is limited to canvas identity extraction, preserves stable-sync caching/no polling, rejects only proven all-alpha-zero canvases under the 65,536-pixel readback cap and conservatively preserves the old path for large/tainted/unavailable readback. Cards/Analyzer/host ownership and Team/Auto Ball write boundaries are unchanged.
- Candidate22 exact VISUAL corrective gate: **READY — P0=0, P1=0, P2=0, P3=0** on fresh `18:58:57–59Z` renders. Dual 1180, 1:2 and Focus Right all show visible player art: Rhyxus retains Rhydon through the visible active-portrait path and Rhyosa renders Gyarados after both transparent native canvas paths fall through. No blank card, clipping or horizontal-scroll regression was found; the battle/action region remains approximately 188–191px and therefore within the complete `<=200px` budget.
- Candidate22 exact UX/A11Y delta gate: **READY — P0=0, P1=0, P2=0, P3=0**. Player art remains decorative/non-focusable (`alt=""`, `aria-hidden="true"`); essential active Pokémon identity, level and HP remain textual. The sprite-source correction does not alter accessible DOM, Team/Auto Ball control order, explicit labels, polite status feedback, focus visibility or disabled/busy semantics.
- Candidate22 independent local acceptance: **ACCEPTED for Product Owner live sprite validation only — P0=0, P1=0, P2=0, P3=0**. Exact host/Better UI/Analyzer bytes match the frozen record, source→dist→host timestamps remain coherent, Git index is empty, all three corrective gates are READY, and the normal host remains unchanged. This acceptance does **not** authorize normal-host promotion, Git history or release.
- Product Owner live validation of candidate22 on 2026-09-21 **confirmed the player-sprite blocker closed**: Rhydon and Gyarados both rendered. Candidate22 was nevertheless **NOT APPROVED FOR PROMOTION** because the live result mixed native art with PokémonDB art, one Gyarados account showed metrics but no current target, Team selection lacked levels, History remained too tall/single-rarity, and Cards had no Pause/Reset control for leaving Hunt tracking behind in the city.
- Candidate23 (`0.2.33`, Analyzer `1.13.1`) implemented the Product Owner delta: Cards removes PokémonDB as an art source and accepts only game-provided Team HUD/canvas or native `getSpecies()` metadata; target projection now carries bounded `speciesId`/`zoneId` only for native visual resolution and no longer exports a target sprite URL; Team options include `Lv.`; History adds multi-rarity checkboxes and `Shiny: Todos/Sim/Não`; the page exposes explicit Analyzer-owned Pause/Resume/Reset; Reset starts a fresh zeroed session and immediately manually pauses/locks it so automatic combat activity cannot silently resume it in the city. Analyzer target presentation now tracks a current-runtime `liveActiveEncounterKeys` provenance set so persisted unresolved `started`/`looted` rows do not become active merely through hydration while exact-one-live-target fail-closed behavior is retained.
- Candidate23 was **SUPERSEDED BEFORE DELIVERY** by exact smoke: the new general History cap was correct, but the old narrow `<520px` media rule still overrode it at `252px`, so the 1:2 layout did not satisfy the new five-visible-record density requirement. No Product Owner live was performed on candidate23.
- Candidate24 (`0.2.34`) fixes only that responsive History override and its smoke/test contract. Wide/table presentation resolves to a `174px` bounded History surface; narrow presentation uses `50px` attempt rows inside a `250px` surface, preserving five visible records before internal vertical scrolling. Smoke measures the actual row/header geometry instead of assuming one absolute height for both layouts.
- Exact candidate24 host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate24.exe`, SHA-256 `375ECC9C5695F4786C3D8D089CAFE74AF22923AB1867A1B6893280AAF353A2C2`, size 215552 bytes. Better UI `0.2.34` bundle SHA-256: `59D3ECA7268C527A797474EE5F4044780FA468A95E0B6AE3E24EA714EAFD2C62`, size 757711 bytes. Hunt Analyzer `1.13.1` PROD/embed SHA-256: `3739926742578790C231AB9B5EB26F42A35AEFBC35FA8879DF59B644F4150B34`, size 1515824 bytes.
- Candidate24 automated verification: Hunt Analyzer **434/434 PASS + build/verify PASS**; Better UI coupled focused **35/35 PASS**, full **336/336 PASS**, build **PASS**; exact `candidate24 --smoke` **PASS** with exit `0` / stdout ending `WebView2 coupled workspace smoke: PASS` / empty stderr. Fresh visual evidence is timestamped `20:17:05–08Z`. `git diff --check` has no whitespace errors and the Git index remains empty.
- Candidate24 exact TECH/ARCH gate: **READY — P0=0, P1=0, P2=0, P3=0**. Exact host/Better UI/Analyzer hashes and byte-identical PROD/embed Analyzer were independently confirmed. Native-only Cards art rejects PokémonDB and synthesizes no external asset path; runtime-proven active encounter keys prevent persisted unresolved rows from self-promoting while preserving exact-one-live-target fail-closed semantics; public target/history remain bounded and stripped from the host relay; embedded Pause/Resume/Reset remains Analyzer-owned and leadership-gated; Reset creates a fresh zeroed paused+locked session and clears presentation provenance. Focused independent reruns were Better UI **35/35** and Analyzer card/public/embed **18/18**, with no polling/listener or ownership regression found.
- Candidate24 exact VISUAL gate: **READY — P0=0, P1=0, P2=0, P3=0**. Fresh exact `20:17:05–08Z` renders show visible native-only player/target art in Dual, 1:2 and Focus Right; both panes carry targets; Team options include levels; Pause/Reset are visible; History is bounded to about five rows with internal vertical scroll and multi-rarity/Shiny/result filtering; Economy / XP precedes History; the battle module remains `<=200px` with no dashboard horizontal overflow; Miyazaki16 hierarchy is preserved without CMD/SaaS regression.
- Candidate24 exact UX/A11Y gate: **READY — P0=0, P1=0, P2=0, P3=0**. Team options expose name + level while fainted choices remain textually identified and disabled; rarity uses native details/fieldset/eight labelled checkboxes with explicit focus; Shiny uses a labelled tri-state native select; History retains table/rowgroup/row/cell semantics, per-cell column context, sticky header where visible and bounded vertical-only scroll; Pause/Resume/Reset are explicit user actions with busy/disabled states and polite textual status; Reset copy does not imply History deletion; Pokémon images remain decorative/non-focusable while essential identity/state is textual; no essential information depends on tooltip or color alone.
- Candidate24 independent local acceptance: **ACCEPTED for Product Owner live validation only — P0=0, P1=0, P2=0, P3=0**. Exact host/Better UI/Analyzer hashes and sizes match; Analyzer PROD/embed are byte-identical; both Git indexes are empty; diff-check is clean; normal host remains SHA `924D3E...498F`. The acceptance independently confirmed native-only Cards art, runtime-proven exact-one live target semantics, Team levels, eight-way multi-rarity + Shiny filters, responsive five-record History caps, and explicit Analyzer-owned Pause/Resume/Reset with Reset producing a fresh paused+locked state. This gate authorizes only Product Owner live validation and does **not** authorize normal-host promotion, Git history or release.
- Product Owner live review after candidate24 superseded that local acceptance as final product state. Candidate25 (`Better UI 0.2.35`, Analyzer `1.13.2`) introduced Captured/Seen (`C/V`) plus per-rarity Shiny C/V, a true `epicPlusFailed` metric that excludes Rare, full-current-session `specialHistory` containing Epic/Legendary/Mythical plus any Shiny without the generic 32-row eviction problem, compact large-number rendering with exact accessible values, a primary Pokémon XP/h KPI and active-Pokémon level EXP progress. Candidate25 was **REJECTED FOR PROMOTION** in live review because the EXP text wrapped unnecessarily, the requested Elixir semantics actually meant Heal Potion rather than EXP boost, and the current target sprite still failed to appear in the live page.
- Live read-only diagnostics then established that the game itself had already loaded the target sprite under same-origin `/play/img/characters/<species>.png` and its `shiny-<species>.png` variant. Candidate26 therefore adds a native-only resource reuse path over `performance.getEntriesByType("resource")`: it accepts only an already-observed same-origin resource under `/img/characters/` with an exact canonical basename/normal-Shiny match and png/webp/gif extension. It never constructs that path from `speciesId`; PokémonDB cannot pass this path. Existing zone-bound Hunt Map and native `getSpecies()` fallbacks remain fail-closed.
- Candidate26 also forces the active EXP value/current-required-percent copy to a single line and replaces the incorrect EXP-Elixir readout with an explicit **Heal Potion** selector. Potion choices come only from native inventory rows with `type="potion"` and positive stock. An explicit change validates stock first, reads the latest `getHuntSettings()` only immediately before persistence, changes only `auto_potion.potion_item_id`, and preserves potion enabled/threshold/revive plus capture/sell/extract settings. It does not trigger healing or other gameplay automation.
- Exact candidate26 host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate26.exe`, SHA-256 `98C751F09B7FA23DF4F39558143A217C27E1744EF620A233B201B2F380DF305A`, size 220672 bytes. Better UI `0.2.36` bundle SHA-256 `8FDAC0D66BCFBF631D3D3DD22D0389B1985BE765B633CBF32785ABCB08E08DDB`, size 774469 bytes. Hunt Analyzer `1.13.2` PROD/embed are byte-identical at SHA-256 `0E3DFABDB64780E3C04EC659C353D09ACB4C9D7979908E715DA07826F22A29F5`, size 1517756 bytes.
- Candidate26 automated verification: Better UI coupled focused **41/41 PASS**, full **342/342 PASS**, build **PASS**; Analyzer remains **435/435 PASS + build/verify PASS**; exact candidate26 smoke **PASS** with exit `0`, stdout ending `WebView2 coupled workspace smoke: PASS`, and empty stderr. TECH/ARCH and UX/A11Y independent corrective gates are **READY — P0=0, P1=0, P2=0, P3=0**. Product Owner live validation of candidate26 remains a separate gate; normal-host promotion, Git history and release are not authorized.
- Product Owner live use then found a separate **candidate26 host shutdown blocker**: closing the application repeatedly raised a .NET `System.NullReferenceException` through `System.Windows.Forms.ToolTip.CreateHandle/Get_TopLevelControl/CreateRegion/HandleCreated/SetToolTipInternal`. Source review identified two converging lifecycle hazards: the 1s Analyzer freshness timer remained active until `FormClosed`, and `FormClosed` disposed the shared `ToolTip` before `AccountPane/View.Dispose()`, whose teardown callbacks could still refresh host labels while the form was closing.
- Candidate27 is a **host-only lifecycle correction**; Better UI stays `0.2.36` and Hunt Analyzer stays `1.13.2` with the exact candidate26 bundle hashes. `FormClosing` now sets a closing quarantine before teardown, stops both WinForms timers, hides the maintenance drawer and calls `ToolTip.RemoveAll()` while the owner/controls are still valid. Both tooltip sinks go through a guarded `SetToolTipSafe`; analyzer rail, health/deck/dock/drawer paths plus relevant WebView2/mutation callbacks fail closed while closing. `FormClosed` clears the pane registry before WebView disposal, then disposes drawer/timers and the ToolTip last.
- Exact candidate27 host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate27.exe`, SHA-256 `660CCD887CE20713A5526242B6C73EFBC041A28921A3A27F4B33A5DE2DE638A9`, size 222720 bytes. Its exact settled-close smoke passed, but the independent lifecycle re-gate returned **NOT READY — P0=0, P1=0, P2=1, P3=1**: an `EnsurePaneAsync` already in flight before `FormClosing` could still resume after an await, and the non-smoke initialization catch could still touch/show UI while closing. Candidate27 is therefore preserved only as the first ToolTip-race correction and is superseded before live delivery.
- Candidate28 closes that residual async lifecycle gap with explicit `_isClosing`/current-pane checks after `pane.InitializeAsync` and each script-registration await, before `ConfigureView`, `NavigateHome`, post-init layout/enable work, and after the Better UI health await. Initialization exceptions during closing now return without label mutation or modal error UI. A dedicated `--smoke-close-during-init` path starts pane initialization, queues graceful close, forces the lifecycle action to yield while initialization is in flight, and keeps `Application.ThreadException` fatal.
- Exact candidate28 host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate28.exe`, SHA-256 `FF3F4CC576A825192CF700532A4FEE193B8CD084FAE3AD67DBE94CC774504AF6`, size 223744 bytes. Source timestamp precedes the frozen artifact. Its normal and close-during-init smokes passed, but the independent re-gate returned **NOT READY — P0=0, P1=0, P2=1, P3=1** because an already-entered Single/Dual mutation could resume after close and invoke another `EnsurePaneAsync`; Ensure itself still had no closing guard at method entry.
- Candidate29 closes the remaining mutation boundary: `EnsurePaneAsync`, Recover, Single/profile switch and Dual switch now fail closed at entry once shutdown begins; Recover/Single/Dual retain post-await guards before any follow-on update/persistence; `PersistWorkspaceState` explicitly no-ops during shutdown. The settled shutdown smoke also invokes late Ensure/Recover/Single/Dual calls after registry clear and fails if any pane is recreated. New `--smoke-close-during-switch` starts from Single on the right profile, begins Dual with the left pane absent, queues graceful close while that first missing pane initializes, and prevents the second/follow-on mutation path.
- Exact candidate29 host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate29.exe`, SHA-256 `A23D78A644BC04958D1C2C3CF2D2D9D8A1812374988C557C5C031DC1C344D729`, size 225792 bytes. Source timestamp precedes the artifact. Isolated/sequential exact validation: normal smoke **PASS**, close-during-init **20/20 PASS**, close-during-switch **20/20 PASS**, all exit `0` with empty stderr. Independent lifecycle re-gate returned **READY — P0=0, P1=0, P2=0, P3=0**. It was nevertheless superseded before live delivery because its blanket closing persistence guard also suppressed the pre-existing intentional final shutdown snapshot.
- Candidate30 changes only that persistence semantic. `PersistWorkspaceState(bool allowDuringClosing=false)` still blocks every ordinary mutation save after `FormClosing`, while `CompleteShutdown` alone calls it with `true` before pane registry clear/disposal, preserving the final coherent workspace preference without reopening late lifecycle work. Exact candidate30 host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate30.exe`, SHA-256 `EDEE495C4F49E9F01107CD91B72EC9BB2FF31E35C47DAE1F37FF567D3F6A96F6`, size 225792 bytes. Source timestamp precedes the artifact. Exact isolated validation: normal smoke **PASS**, close-during-init **20/20 PASS**, close-during-switch **20/20 PASS**, all exit `0` with empty stderr. Candidate30 independent TECH/lifecycle re-gate: **READY — P0=0, P1=0, P2=0, P3=0**. Better UI remains **0.2.36** at SHA `8FDAC0D...08DDB`; Analyzer remains **1.13.2** PROD/embed SHA `0E3DFABD...29F5`. Real Product Owner close validation remains the final runtime gate.
- The normal host remains intentionally unchanged at SHA-256 `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`; no card-mode candidate has been promoted.

## Frozen candidate evidence — 2026-09-20

- Host artifact: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate.exe`
- Host SHA-256: `07DC9364C13F77530ED9FAAF9458FD99ED292E259E7539878A8BB52F1AF70FE8`
- Live result: **functional overall**, with no itemized exception reported at the time.
- Later F6-F8 audit found a keyboard-only Maintenance Drawer boundary issue in this artifact: WinForms consumed Tab as a dialog key before the old `KeyDown` handler could transfer focus out of the drawer.
- Historical baseline normal host SHA-256 before candidate2 promotion: `491728E202737BED44FF051C3BE5205F13942B045560C0376787DD523A520846`
- Better UI bundle SHA-256: `A520A0444D4FF47EA06922BCE5956EDBEE319100DFDFE4D313E651C081BE57DD`
- Candidate build: **PASS**.
- Local WebView2 coupled-workspace smoke: **PASS**.
- Normal-host build from the same frozen source: **PASS**.
- Normal-host local smoke: **PASS**.
- Compatibility wrapper `tools/coupled-workspace/Start-CoupledWorkspace.ps1 -SkipBuild -ValidateOnly`: **PASS**.
- Automated/independent gates did **not** open or operate live PokePixel; live validation was performed separately by the Product Owner.
- Normal-output executable may remain locked by an older running workspace; candidate output is intentionally independent of that lock.

### Post-live accessibility correction candidate

- Review artifact: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate2.exe`
- SHA-256: `638A7AB9BF1F3A49CB21E86B70B9F2CDC39407C4D2566A634913F6D4FDBBFD88`
- Runtime delta: Maintenance Drawer Tab/Shift+Tab boundary handling moved from `KeyDown` to the WinForms `ProcessDialogKey` path.
- Regression evidence: forward Tab from the final Reset control is exercised through the focused control's real `PreProcessMessage(WM_KEYDOWN Tab)` route; Shift+Tab from the first Recover control is exercised through the overridden dialog-key path.
- Direct candidate2 build: **PASS**.
- Candidate2 local smoke: **PASS**.
- Independent focused TECH re-QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Independent focused A11Y/QOL re-QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Independent focused UX/VISUAL carry-forward: **READY — P0=0, P1=0, P2=0, P3=0**.
- Product Owner live revalidation: **functional** on 2026-09-20.
- Candidate2-era promoted normal host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.exe`
- Candidate2-era promoted normal-host SHA-256: `052D146BED95045FED641A56CD1A8C64178CFAD9AEB570800A7C0CF9AF609F81`
- Candidate2-era normal-host build from the corrected source: **PASS**.
- Candidate2-era normal-host local smoke: **PASS**.
- Candidate2-era compatibility-wrapper validation: **PASS**.

### Post-audit alignment / UX correction candidate

- Review artifact: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate3.exe`
- SHA-256: `A304E45F55152350A569EB6AA0816779154A11287A8D1062DAEA4E64E4CAF830`
- Product Owner trigger: a complete UI/UX audit was requested after visible element misalignment was reported.
- Corrected Command Deck geometry: 44px logical row; 32px logical inner groups; 28px logical controls; 6–8px dense gaps; no default WinForms margin seam before the viewport.
- Center layout now resolves responsive visibility before measurement, then physically centers the dual-layout group when space permits and clamps it away from the side groups when required.
- Native ComboBox chrome was replaced by a square Better UI select/dropdown using the Miyazaki 16 palette; keyboard commands are handled through WinForms `ProcessCmdKey`, and the custom accessibility object exposes ComboBox role/name/value/default action plus expanded/collapsed state.
- Dual health remains visible at the supported 1180px logical minimum with compact deck labels and full status through accessibility/tooltip/diagnostics.
- WebView keyboard focus keeps selected/current gold semantics while adding the independent cyan focus cue required by the design contract.
- Focus mode order is `active identity -> health -> Restore` for either physical side.
- DPI policy is Per-Monitor V2 + `AutoScaleMode.Dpi`; logical metrics are reapplied on DPI changes without constructor-time double scaling; Maintenance Drawer placement uses the monitor containing the `⋯` trigger and clamps correctly across signed multi-monitor coordinates.
- Blocking local smoke after the final `ProcessCmdKey` fix: **PASS**, exit `0`, stderr empty, stdout ends `WebView2 coupled workspace smoke: PASS`.
- Fresh render matrix contains 20 PNGs, including 1180/1200/1280/1600 dual layouts, compact/expanded threshold renders, single mode, focus-left/right, keyboard focus, WebView focus, select dropdown, drawer and workspace composites.
- Independent TECH-UI QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Independent UX/A11Y QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Independent VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Product Owner live validation: **validated** on 2026-09-20.
- Promoted normal host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.exe`
- Promoted normal-host SHA-256: `3C904395CACB17CD8B467FDDEEFC46170B4441B7C88D6BB599100DF32CF84C27`
- Promoted normal-host blocking smoke: **PASS**, exit `0`, stderr empty.
- Compatibility wrapper `tools/coupled-workspace/Start-CoupledWorkspace.ps1 -SkipBuild -ValidateOnly`: **PASS**.
- Final independent release audit on the promoted normal host: **RELEASE READY — P0=0, P1=0, P2=0, P3=0**.

Representative local-only render evidence from the final `candidate3` correction pass:

- `bin/smoke/visual/workspace-dual-composite-1180.png` — SHA-256 `E54593E6161B94332920C88B29E6338B9D7661F23029D59C88B1C6EC7C9C1043`
- `bin/smoke/visual/workspace-focus-composite-1180.png` — SHA-256 `3AF7F841C05095D887468C190E2BD71D9D070B988AF4F620D1467E78FF0FA22A`
- `bin/smoke/visual/workspace-drawer-composite-1180.png` — SHA-256 `755020C9A76565D4C7B8E3E77B930F72BD23FCACE063450FE8B5BE77312ADD58`
- `bin/smoke/visual/command-deck-scope-dropdown.png` — SHA-256 `71625588F80752CBFAED44983571B67D5686401253793C24BEBF19E64E00F643`
- `bin/smoke/visual/command-deck-webview-focus-1180.png` — SHA-256 `C7DC6993F9F5A56EE4F64E58421DF1156D0A8F41B9A22F88631FBD4E47F5C0F2`
- Composite pages are synthetic local WebView2 pages. `CapturePreviewAsync` is used only by smoke evidence; no live-game claim is inferred from them.
- Dual composite proves the active gold and inactive strong-neutral cues are **2px top rails** immediately above actual WebView2 preview content.
- Focus composite proves the focused Active account remains a full viewport with the same quiet 2px rail rather than a gold frame.
- Drawer composite proves the materialized 360px Maintenance Drawer overlays the workspace at the `⋯` trigger anchor without resizing pane geometry.
- Maintenance Drawer uses a 10px square Better UI scrollbar: charcoal track, stone thumb, strong-neutral hover/drag; native WinForms light scrollbar is hidden.

## Current per-profile Cards/Game corrective

- Product correction: `Cards | Game` is **per profile/window**, not one host-global mode.
- `candidate60` is the frozen validation artifact for this host-only correction:
  SHA-256 `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`,
  size `240640` bytes.
- Exact host validation: normal smoke **PASS**, close-during-init **PASS** and
  close-during-switch **PASS**, all exit `0`. The smoke explicitly proves divergent
  Rhyxus/Rhyosa views, Active-selector-only changes, active-only Game Dock forcing,
  Swap/Focus preservation, Single/Dual recreation, settings round-trip and recovery.
- Better UI runtime is unchanged at `0.2.62`: Coupled focused **48/48 PASS**, full
  **388/388 PASS**, build **PASS**, and exact dist remains `920762` bytes at SHA-256
  `B854CB036107D4F9B11460731559790EE9C3DE13D635CEE9CF7A78C91D9D8D26`.
- The normal host remains untouched at SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.
- This local corrective candidate is **not promoted by this gate**; live promotion remains
  a separate Product Owner action.

## Current Card Mode post-live corrective — candidate94

- Product Owner feedback dated 2026-09-27 requires Target / Captured-Seen crop alignment, removes XP
  from Target, fixes the real Loot rarity filter, exposes selected moves on the Active Pokémon card,
  checks whether Target has additional useful authoritative data, and prevents Hunt Story field-wrap in
  the `1:2` / `2:1` workspace layouts. Candidate93 / Better UI `0.2.92` is therefore preserved as the
  previous local-validation checkpoint and superseded for this handoff.
- Better UI `0.2.93`: `1127312` bytes, SHA-256
  `E75399C22C62C6385153C2441B7772C45114F26E5B184949DDE222D7A07FC29E`; archived extension mirror
  is byte-identical and the generated userscript header is `@version 0.2.93`. Exact-current Card
  Mode/Coupled tests are **68/68 PASS**, affected suites **170/170 PASS**, full Better UI
  **455/455 PASS**, build/syntax and `git diff --check` PASS.
- Target now omits encounter XP. The retained target context is the useful server/Analyzer-authoritative
  subset already available without speculative derivation: Pokémon identity, level/range, rarity,
  Shiny, element types and native art. Zone ids remain implementation identity and no prospective
  capture chance is invented. At `>=900px`, Target and the third overview card (Captured / Seen) share
  the same left/right grid boundary for screenshot cropping.
- The Active Pokémon card reads the exact current native `getMoveset` payload, renders up to four
  selected move icons through the existing native move-icon mapping, and invalidates the read-only cache
  on `moveset.saved`. Request settlement is creature-id/epoch scoped and disposal guarded; no gameplay
  write or Analyzer-triggered action is introduced.
- Loot native metadata normalization now supports both flat inventory entries and nested `item` objects,
  and translates only explicit localized rarity labels to the existing canonical rarity keys. The
  WebView2 smoke actively selects Rare and requires all surviving item chips to be `rare`, closing the
  previous test gap where only filter presence/options were checked.
- Hunt Story keeps `Time`, `Rarity`, `Pokémon`, `Quality`, `Result`, `Ball`, `Chance` and `IV Total` in one row at
  every supported pane width. Narrow `1:2` / `2:1` panes own horizontal scrolling instead of reflowing
  those fields to a second line; the narrow Hunt viewport is capped to approximately six entries.
  Dedicated fresh renders are captured as `workspace-cards-history-dual-1-2-1180.png` and
  `workspace-cards-history-dual-2-1-1180.png`.
- Hunt Analyzer remains `1.13.5`, embed `1529301` bytes / SHA-256
  `BF81D945D852F1FC3B628CA099A47AC2A177EEC1995335DE5D798E9515C1C841`.
- Exact host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate94.exe`,
  `261120` bytes, SHA-256
  `8737FCAB9DE0D9BFE986D46C58F612C52C15E8A9992BFFF8B30C3E77E75F8E79`; the `candidate.exe` alias is
  byte-identical. Normal, `--smoke-close-during-init` and `--smoke-close-during-switch` all PASS with
  empty stderr; normal stdout ends in `WebView2 coupled workspace smoke: PASS`.
- Promoted normal host remains untouched at `146944` bytes / SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.
- Fresh synthetic renders cover the wide crop alignment, Loot Story, and both asymmetric Hunt Story
  layouts. Independent exact-current re-gates close **TECH READY**, **UX/A11Y READY** and
  **VISUAL READY**, all with `P0=0 P1=0 P2=0 P3=0`; Product Owner in-game visual/functional
  validation remains the final runtime gate.

## Standalone / Tampermonkey Card Mode corrective — Better UI 0.2.94

- Product Owner live feedback on 2026-09-27 reports that standalone Card Mode still does not work in
  Tampermonkey and that the `Cards | Game` selector overlays the independent server selector.
- The userscript now explicitly requests the page runtime with `@sandbox raw` + `@grant unsafeWindow`.
  Standalone ownership resolves that page window before testing the native toolbar or consuming
  `PokeIdle` / `__POKEPIXEL_HUNT_ANALYZER_PUBLIC__`; coupled WebView2 ownership remains excluded by the
  existing host marker/bridge contract.
- Game mode no longer appends `Cards | Game` to `.pokeidle-top-toolbar`. It uses a Better UI-owned
  body-level dock centered against the measured toolbar, below a top toolbar or above a bottom toolbar,
  clamped to the viewport. Reconciliation and ResizeObserver reacquire a reconstructed native toolbar
  without moving the selector back into native navigation. Cards mode keeps the same switch inside the
  textual Cards document surface and preserves keyboard focus while moving between owners.
- Exact-current affected validation is **95/95 PASS**, full Better UI **457/457 PASS**, build/syntax and
  `git diff --check` PASS. A built-userscript standalone execution smoke verifies Cards mount + Analyzer
  read + Game switch + dedicated dock. The unchanged `candidate94` binary passes both forced-shutdown
  lifecycle smokes with the current `0.2.94` bundle. Repeated normal visual-evidence smoke runs exposed
  intermittent host-harness timing failures at two different pre-existing evidence waits (History
  scroll positioning and bridge/Analyzer fixture settlement); no C# or coupled-owned runtime belongs to
  this delta, so those harness races are recorded rather than silently converted into a new host
  candidate. This is a userscript corrective; no C# host promotion is performed.
- Final `0.2.94` userscript and archived extension mirror are byte-identical at `1130792` bytes,
  SHA-256 `282603BACA5310F792D1CA3D4B18535B54714C52C5444A3683C6687DA06FD926`.
- Product Owner live Tampermonkey validation of the generated `0.2.94` userscript remains pending.

## Hunt Story IV Total — Better UI 0.2.95 / Hunt Analyzer 1.13.6

- Product Owner requested the total IV already known for failed capture attempts to be visible in Hunt
  Story. Analyzer remains the authority: terminal encounter `ivTotal` is projected as one bounded scalar
  (0–186) for both captured and failed attempts through the existing protocol-v1 public summary.
  Individual IVs, gender and nature remain captured-only; Better UI does not read Analyzer IndexedDB or
  raw encounter rows.
- Better UI revalidates the scalar and adds **IV Total** as the eighth visible/accessibly labelled
  direct-read field. Missing or invalid totals render `—`. The table remains one horizontal row with a
  local scroll surface at narrow widths rather than reflowing into a second line.
- Analyzer `1.13.6` is **453/453 PASS** with production build and update-invariant verification PASS.
  Its standalone userscript and `dist/pokepixel-hunt-analyzer.embed.js` are byte-identical at
  `1529448` bytes / SHA-256
  `0131E53D542949D84E4677736CF3A50FF90573EF10407866ACE3AA4DA2A8EE60`.
- Better UI `0.2.95` Card/Coupled focused validation is **70/70 PASS**, full suite **457/457 PASS**,
  syntax/build/`git diff --check` PASS. Dist and extension mirror are byte-identical at `1131335`
  bytes / SHA-256 `141397FA4757392CDB57B510B13C562CAE6EA07FC8CEEE0D1ACBC69E01A4C14D`.
- `candidate94` C# bytes are unchanged. The host loads both JS bundles from `dist/` at runtime, so this
  additive presentation/Analyzer contract delta does not require relabelling or promoting the historical
  `candidate94 / Better UI 0.2.93 / Analyzer 1.13.5` validation tuple.

## PM evidence audit — final handoff

1. Every approved product behavior has an observable criterion: **yes**.
2. Existing live-functional WebView2 baseline is treated as behavior evidence, not visual approval of the redesign: **yes**.
3. Previously validated Better UI game modules are outside this host redesign and must not be reopened: **yes**.
4. Gameplay automation/mirrored input is explicitly prohibited: **yes**.
5. Visible claims have representative local rendered evidence before PM handoff: **yes**.

## Repository integration hygiene

- Root `README.md` points the supported multi-account host to `tools/coupled-workspace-webview2/`.
- The superseded Electron implementation and extension mirror were removed in repository cleanup; `tools/coupled-workspace/Start-CoupledWorkspace.ps1` remains as a compatibility wrapper to WebView2. Historical validation and hashes remain documented in this file and Git history.
- The superseded Dual Edge tiler was also retired from the working tree; its implementation remains recoverable from Git history.
- Ignore coverage remains for WebView2 `bin/`, smoke runtime data and extracted SDK. NuGet package ignores use version-agnostic `Microsoft.Web.WebView2.*.nupkg` / `.nupkg.zip` patterns.
- The versionable file audit contains the active host source, compatibility launcher, scripts, docs and required lock/config files; generated runtime artifacts and retired Electron sources are excluded.
- No Git history operation was performed as part of this delivery.

## Product Owner live validation record

Original frozen-candidate live result: **functional**. A later audit identified the keyboard-only Drawer boundary defect described above.

Corrected `candidate2` live revalidation result: **functional**. No live blocker was reported by the Product Owner on 2026-09-20, and the corrected source was subsequently promoted to the normal host path.

After the later UI/UX alignment audit and `candidate3` correction pass, the Product Owner validated the exact `candidate3` artifact on 2026-09-20. That source was then promoted to the normal host path only after the live validation; `candidate2` was preserved as the previous known-good reference artifact.

The approved live-validation checklist for that frozen candidate was:

1. 1 Account ↔ 2 Accounts switching with correct sessions.
2. Single-account profile selection.
3. 1:2 / 1:1 / 2:1 + drag/snap behavior.
4. Swap and Focus/Restore.
5. Active-pane clarity and scoped common controls.
6. Maintenance/diagnostic surface usefulness.
7. Overall visual efficiency and consistency with Better UI during real use.

The Product Owner reported the candidate **functional** overall and did not report an itemized exception to this checklist.

Do not ask the Product Owner to revalidate unrelated already-closed Better UI modules unless a concrete regression is observed.
