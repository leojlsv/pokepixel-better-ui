# Team-family Redesign — PM Status

Recorded: 2026-09-17

## Current stage

`historical Team/HUD validations preserved — Full Team information hierarchy explicitly reopened on 2026-09-23 as a Pokémon dossier; local dossier gates tracked separately in docs/TEAM_PROFILE_STATUS.md`

### 2026-09-23 Full Team override

The Product Owner later **reopened only the Full Team information hierarchy** and requested a
well-developed Pokémon ficha/profile. The six-slot Battle Line remains native navigation, but is no
longer the dominant information surface in the Full Team window. The selected Pokémon dossier now
owns identity, native commands, Current Moveset, Saved Movesets and read-only Saved Team membership;
the full Saved Teams manager remains the subordinate maintenance surface. This supersedes the
historical “No accepted structure is reopened” wording below for Full Team only. Team HUD, Add
Pokémon, gameplay and Saved Team persistence contracts remain preserved. Exact current acceptance
and render evidence are recorded in `docs/TEAM_PROFILE_STATUS.md`.

The Product Owner explicitly rejected the prior Team / Team HUD / Saved Team
candidate in live validation on 2026-09-16 and then rejected the broader white/warm
master direction. The first Miyazaki 16 distribution was also rejected because large
`#5F5854` surfaces rendered pastel/taupe. The corrected charcoal-dominant distribution
was live-reviewed on 2026-09-16/17 and the Product Owner explicitly approved the **color**.
That approval is now carried forward independently from the remaining layout gate.

Subsequent corrective candidates closed Wallet, Search, Add Pokémon and Backpack issues.
On 2026-09-17 the Product Owner explicitly declared **“Estrutura validada.”** That closes
the structural/layout gate for the current composition. The new task is a bounded visual
polish only: Sort +15px, Add Pokémon pixel scrollbar, project-wide square Element icon
standardization and rarity-box polish. No accepted structure is reopened.

The Product Owner later opened a **new additive Saved Teams feature**, not a redesign of those
accepted surfaces: the full manager must be able to author a Saved Team directly from Backpack
Pokémon without first equipping them into the live Team. Exact candidate `0.2.22` implements that
flow while preserving `Save current`, HUD quick recall, storage v2 and the existing Apply path.

The first frozen feature candidate, `0.2.19` (618,656 bytes, SHA-256
`99FC619182C201B83D909A85C31C28685132F0F4F80A4419DC5789BF19E5B5CD`), was **blocked before
Product Owner handoff** by independent Technical QA (`P1=1`). An explicit successful Backpack
refresh could remove a selected Pokémon from the candidate pool while leaving that stale ID in
the authored formation with Save still enabled. `0.2.20` supersedes it: every successful refresh
now reconciles selected IDs against the newly confirmed Backpack, refreshes retained member
snapshots, removes unavailable members, and repairs active/selected state. Failed refreshes leave
the draft untouched.

Exact `0.2.20` closed that stale-refresh P1, but one bounded true-empty Backpack presentation bug
remained: after asynchronous loading completed, the empty candidate area could leave its explanatory
message hidden. `0.2.21` corrected the successful-empty path, but UX pre-gate then exposed that the
same empty message could be visible while the first Backpack read was still pending or after that
read failed, incorrectly conflating “unknown” with “empty”; the initial filter selects also had no
fallback option before a successful response. `0.2.22` keeps the empty message hidden during loading
and failure, exposes it only after a confirmed successful empty result, and initializes the filter
selects with their localized All options. Authoring, storage v2 and Apply semantics are unchanged.

## Manual Saved Team from Backpack — current candidate `0.2.22`

- branch: `refactor/team-pixel-art`
- userscript: `dist/pokepixel-better-ui.user.js`
- userscript version: `0.2.22`
- size: `619,967` bytes
- SHA-256:
  `44D8DC6CB172D3FF5BBDB8B0E3FE21660F471C62A48AEAFEDD89F2B041866776`
- full automated suite: `284/284` passed
- composer-focused verification: `7/7` passed
- broader Team Presets / performance / Apply regression set: passed
- build: passed
- `git diff --check`: passed; existing LF/CRLF warnings only
- render-first evidence:
  - `work/team-composer-0.2.22-six.png` — normal manager width, six selected, SHA-256 `4F0BE53DF7BA81A3EBED598F1E658192E308419BED327637067A32F4B1A85847`
  - `work/team-composer-0.2.22-narrow.png` — approximately 340px host minimum, SHA-256 `7689F8D9CEA116D32FC32FA0C049F4EFC5BA14BC357CF577EFBF83F0AC02E4BB`
  - `work/team-composer-0.2.22-noresults.png` — filtered no-results state, SHA-256 `B0B4CD9302A4AF73A1AD517CC14E24F1F99A105A0CB413D46BB6AF5F6BC99D48`
  - `work/team-composer-0.2.22-empty.png` — confirmed true-empty Backpack state, SHA-256 `FA900F5F0EECFBDFE115BC757DE9E2A45956F5D88B5AD95122A7DF1F5D86327A`
  - `work/team-composer-0.2.22-error.png` — initial Backpack load failure without false empty-state copy, SHA-256 `ECC9995A79CB41FA2D3447A89D4326A5BA65555DB2409794B9A611D7BE0CB144`
- Product Owner live validation: **pending for this new feature only**

Current contract:

- `Create team` exists only in the full Saved Teams manager; the Team HUD remains quick recall.
- Existing `Save current` remains unchanged.
- Composer candidate source is `PokeIdle.Api.getCreatures("inventory")`.
- The user explicitly authors 1–6 unique members, Battle order, active member and name.
- Saved snapshots remain `ppbui:team-presets:v2` and are marked `orderVerified:true`.
- Authoring/saving performs no `addTeamMember`, `removeTeamMember`, `setTeamLeader` or
  `setTeamOrder`; the real Team is unchanged until the existing Apply action is invoked.
- Backpack data is cached across close/reopen and reloaded only through explicit
  `Refresh Backpack`; a successful refresh reconciles/prunes the authored selection while a
  failed refresh preserves it; stable composer sync is DOM-mutation-free.
- The normal and narrow render-first pass keeps the existing manager cards/footer intact,
  bounds candidate scrolling, preserves square Miyazaki 16 controls and does not reopen the HUD.

Independent local gates are complete on this exact artifact:

- Technical/Architecture QA: `P0=0 P1=0 P2=0 P3=0`, **TECH READY**; reviewer reproduced
  `50/50` focused Team Presets checks and independently confirmed cache/stale-refresh,
  order/active snapshot, stable-sync, cleanup and zero-Team-mutation authoring contracts.
- UX/A11y QA: `P0=0 P1=0 P2=0 P3=0`, **UX READY**; reviewer reproduced `37/37` focused checks
  and closed keyboard/focus, cap/disabled semantics, loading/failure/true-empty/no-results,
  status/live feedback and explicit “Team unchanged until Apply” copy.
- Visual Regression QA: `P0=0 P1=0 P2=0 P3=0`, **VISUAL READY** on the exact rendered evidence;
  normal/narrow/no-results are unchanged from the accepted local baseline, while true-empty and
  initial-load-error are now distinct and the error state keeps populated filter labels.

These local gates do not substitute for Product Owner in-game validation.

## Earlier Product Owner live-rejected candidate

- branch: `refactor/team-pixel-art`
- userscript: `dist/pokepixel-better-ui.user.js`
- size: `543,760` bytes
- SHA-256:
  `E56CAABCC578324384221D1A05019F95CD17B41EA79512FA116305244B513DCE`
- full automated suite: `249/249` passed
- build and `git diff --check`: passed; existing LF/CRLF warnings only
- Product Owner live result: **other reviewed modules validated; Backpack rejected on
  Sort width, vertical scrollbar and More filters edge spacing**

The machine READY verdicts remain evidence for that exact artifact only and do not
override the Product Owner's live rejection.

## Structurally live-validated baseline

- branch: `refactor/team-pixel-art`
- userscript: `dist/pokepixel-better-ui.user.js`
- userscript version: `0.2.1`
- size: `547,658` bytes
- SHA-256:
  `ADF824A047C231B12BBF9C5F228EC70EBF52FDB1593575AE2810D60756EC4F99`
- full automated suite: `251/251` passed
- focused Inventory/Pokémon Tools verification: `42/42` passed
- build: passed
- `git diff --check`: passed; existing LF/CRLF warnings only
- Independent QA: `P0=0 P1=0 P2=0 P3=1`, **READY**; the P3 was stale candidate
  documentation and has been corrected after review
- UX/A11y & Design QA: `P0=0 P1=0 P2=0 P3=0`, **READY**, exact hash
- Product Owner live validation: **structure validated on 2026-09-17**

Corrections in this exact candidate:

- The userscript advances to `0.2.1`; `scripts/build.mjs` now derives the userscript header
  version from `package.json`. This removes the identified stale-candidate delivery risk
  where different builds all exposed `@version 0.2.0` to Tampermonkey.
- Backpack Sort keeps its bounded `160–220px` anchor, applies measured proxy width/max-width
  with `!important`, and now also has a scoped hard CSS fallback on the actual select.
- Inventory scrollbar styling applies to the window and any descendant scroller, not only
  guessed root/body/grid owners. In Blink/WebKit it restores `scrollbar-color:auto` after
  the higher-specificity owned-surface rules so `::-webkit-scrollbar-*` can enforce square
  10px track/thumb geometry; native scrollbar arrow buttons are explicitly removed.
- Inventory scopes a physical 8px horizontal margin onto Pokémon Tools / **More filters**,
  aligning it with the utility rails without changing validated Trade or other contexts.

## Live-rejected visual-polish candidate

- branch: `refactor/team-pixel-art`
- userscript: `dist/pokepixel-better-ui.user.js`
- userscript version: `0.2.6`
- size: `561,349` bytes
- SHA-256:
  `7B3C7BA6C8A9435D0226F498BC52554F310A8247B76EFB35178191B1BAC8CF05`
- focused affected-module verification: `119/119` passed
- full automated suite: `263/263` passed
- build: passed
- `git diff --check`: passed; existing LF/CRLF warnings only
- Independent Technical/Architecture QA: `P0=0 P1=0 P2=0 P3=0`, **TECH READY** on the
  exact `0.2.6` hash after adversarial detached-node, stale-color, cross-scope,
  scoped/legacy, nested-scope and exact-restore checks
- Independent UX/A11y QA: `P0=0 P1=0 P2=0 P3=0`, **UX READY** on the exact `0.2.6`
  hash after hostile generated-icon focusability plus native ARIA/focus/reparent checks
- Visual Regression QA: `P0=0 P1=0 P2=0 P3=0`, **VISUAL EVIDENCE INSUFFICIENT**.
  `AC-01` through `AC-04` pass on the exact current local render; `AC-05` remains partial
  because historical independent Team and Add Pokémon live screenshots are available but
  no valid independent post-fix `0.2.1` Backpack capture was recovered
- current local render: `work/visual-qa-0.2.6.png`, SHA-256
  `DFBA87645658C169309B1ABF134B0766971213FF51ACAA190F19DF4BC47C9DCB`
- PM decision: **PRE-LIVE DIAGNOSTIC CANDIDATE**. The missing Backpack baseline is now
  classified as a genuine live-only evidence gap: no independent post-fix `0.2.1`
  Backpack capture is available, the `0.2.1` source state was never committed, and Git
  history/reflog cannot reconstruct that exact working-tree candidate. A synthetic baseline
  derived from current source remains invalid as acceptance evidence. `PM ACCEPTED` is still
  not permitted while `AC-05` / Visual Regression remains open.
- Product Owner live validation: **narrow diagnostic requested only for Backpack neighboring
  composition on exact `0.2.6`; previously validated Team/Add Pokémon structure remains closed
  except for the explicitly requested four polish deltas**

### Product Owner live result — `0.2.6` rejected

The Product Owner's diagnostic run exposed five concrete defects, so `0.2.6` is superseded
and must not be delivered again:

- Saved Team capture can mistake Shared Stone status art for the Pokémon identity sprite;
- the shared Element tile uses too much of the same canonical color as the native symbol,
  collapsing symbol and backing into a visually solid block;
- Shared Stone count presentation is not sized safely for `×10+` in compact Team/HUD slots;
- Add Pokémon Search still exposes rounded native/UA search chrome;
- Add Pokémon scrollbar geometry is pixelized, but legacy host gold/navy colors still win.

The corrective source was subsequently frozen as `0.2.7` after the five findings passed
focused/full automated verification and the required independent Technical, UX/A11y and
render-first Visual Regression gates. Product Owner live validation remains separate and pending.

### Acceptance & Evidence Matrix — superseded `0.2.6`

This matrix was added after the governance reset. Prior test/review results are
supporting evidence only and do not satisfy the new gates by themselves.

| ID | Observable requirement | Must preserve | Required evidence | Current status |
| --- | --- | --- | --- | --- |
| `AC-01` | Backpack Sort renders exactly +15px wider than validated baseline: 235px normal target/max | min 160px, utility-rail structure, proxy ownership, tab order | technical regression + representative render at runtime scale | `pass` — exact `0.2.6` render measures 235px with no visible neighboring collision |
| `AC-02` | Add Pokémon vertical scrollbar visibly uses the shared 10px square pixel chrome and Miyazaki scrollbar colors | picker structure/order/actions/filter behavior | technical hostile-host coverage + representative browser render showing actual scroller | `fail` on `0.2.6` live — geometry is pixelized but legacy host color remains |
| `AC-03` | Element icons render with a square canonical-color swatch/edge and darker tinted well consistently in Team, Add Pokémon, Team HUD and Hunts | canonical Element semantics/artwork, visible symbol/background separation, no host-global reset | cross-module source audit + representative renders of all affected surfaces | `fail` on `0.2.6` live — backing and native glyph visually collapse into a same-color block |
| `AC-04` | Team rarity/quality box has the approved square dark treatment with canonical rarity edge | rarity text, multiplier, IV and domain color meaning | semantic/source check + representative selected-member render | `pass` — exact `0.2.6` render shows the dark square badge and canonical rarity edge |
| `AC-05` | Previously validated Backpack/Team/Add Pokémon structure has no unintended visual shift from this polish | Product Owner's “Estrutura validada” baseline | visual before/after comparison of neighboring composition + diff scope review | `live-only` — independent Team/Add Pokémon baseline evidence exists; exact post-fix `0.2.1` Backpack baseline cannot be reconstructed, so only Product Owner live comparison can close the remaining Backpack portion |
| `AC-06` | Element-icon migration preserves accessible naming/hidden semantics and focus/tab behavior | existing keyboard/ARIA contracts | independent UX/A11y review with negative/edge checks | `pass` — UX QA independently verified hostile tabindex removal plus native ARIA/focus preservation on exact `0.2.6` |

PM record ownership: Project Manager. Requirements/domain reviewers may contribute
evidence and findings but do not own or close this matrix independently.

Changes relative to the live-validated `ADF824A…` baseline:

- Backpack Sort normal target/max is 235px (+15px) while its 160px minimum, proxy
  positioning, tab order and surrounding rails remain unchanged.
- Add Pokémon uses the shared `ppbui-scroll-scope`, so root/body/grid and any actual nested
  scroller receive the same 10px square scrollbar family without a host-global reset.
- `ppbui-element-icons` / `ppbui-element-icon` become the project-wide Element icon
  standard: 24px base / 20px compact, square canonical Element-color swatch/edge over a
  darker element-tinted well so the native symbol remains distinct, with retained
  native/domain art. Team selected member, Add Pokémon, Team HUD and Hunts are migrated;
  Hunts no longer owns a separate Element-icon family.
- Team rarity/quality adopts `ppbui-quality-badge`: dark square surface with canonical
  rarity edge, leaving rarity text, multiplier, IV and gameplay meaning untouched.

## Superseded corrective candidate — `0.2.7`

- branch: `refactor/team-pixel-art`
- userscript: `dist/pokepixel-better-ui.user.js`
- userscript version: `0.2.7`
- size: `565,526` bytes
- SHA-256:
  `1C78391D28FCB6496F6CC92D5C2BD4AC9EA4F3C757673A4EF362EFBC546F77C7`
- focused corrective verification: `153/153` passed
- full automated suite: `264/264` passed
- build: passed
- `git diff --check`: passed; existing LF/CRLF warnings only
- Independent Technical/Architecture QA: `P0=0 P1=0 P2=0 P3=0`, **TECH READY** on the
  exact `0.2.7` hash, including adversarial Shared Stone ordering/fallback, `×1/×10/×999`,
  Element swatch ownership, picker Search scope and picker scrollbar-scope checks
- Independent UX/A11y QA: `P0=0 P1=0 P2=0 P3=0`, **UX READY** on the exact `0.2.7`
  hash after `80/80` focused checks covering Shared Stone semantics/tab stops, sprite-capture
  metadata/focus preservation, hostile generated Element image semantics, reparent/cleanup,
  Search type/label/focus/tab order and scrollbar CSS-only behavior
- Visual Regression QA: `P0=0 P1=0 P2=0 P3=0`, **VISUAL READY** for the local visual gate,
  after render-first comparison of the Product Owner's `0.2.6` live-rejection screenshot with
  the adversarial local `0.2.7` render. This is representative synthetic evidence, not live-game proof
- current corrective render: `work/visual-qa-0.2.7.png`, SHA-256
  `A263F7C0A0FD0577EBED0E033F48B5B0E78B5BB3D3C5EBC2E3DB550B734BB3E1`
- Product Owner live validation: **rejected on 2026-09-17 on two additional polish defects**:
  a native Shared Stone placeholder became visibly empty when no stone applied, and Pokémon Tools
  still exposed the long `Min Quality Multiplier` label plus rounded More Filters fields.

### Acceptance & Evidence Matrix — reviewed `0.2.7`

| ID | Observable requirement | Must preserve | Required evidence | Current status |
| --- | --- | --- | --- | --- |
| `AC-01` | Backpack Sort remains at the requested 235px normal target/max | min 160px and validated neighboring composition | regression + representative render | `pass` locally; live baseline gap remains governed separately by `AC-05` |
| `AC-02` | Add Pokémon actual vertical scroller is 10px square and uses Miyazaki track/thumb/hover colors instead of legacy gold/navy | picker actions/order/filter behavior; no host-global reset | hostile-host regression + render of actual overflow scroller | `pass` — Visual QA confirmed the actual visible scroller uses square Miyazaki charcoal/stone chrome despite hostile legacy `!important` CSS |
| `AC-03` | Shared Element primitive keeps canonical color identity while native symbol remains visually distinct from its darker tinted square backing in Team, Add Pokémon, HUD and Hunts | 20/24px geometry, domain artwork/colors, shared ownership/lifecycle | design-system regression + cross-surface render | `pass` — Visual QA confirmed symbol/backing separation across Team, picker, HUD and Hunts, including hostile same-color canonical artwork |
| `AC-04` | Team rarity/quality badge remains square/dark with canonical rarity edge | rarity text/data/meaning | semantic regression + selected-member render | `pass` locally; unchanged by corrective source |
| `AC-05` | Previously validated Backpack/Team/Add Pokémon composition has no unrelated structural shift | Product Owner's “Estrutura validada” baseline | independent before/after or Product Owner live comparison | `live-only` for the unrecoverable Backpack baseline portion |
| `AC-06` | Accessibility/focus/ARIA contracts remain intact | native naming, keyboard order and generated decorative semantics | independent UX/A11y adversarial review | `pass` — UX QA closed `P0–P3=0` on exact `0.2.7`, including native metadata/focus preservation and no added Shared Stone tab stops |
| `AC-07` | Saving/previewing a Team whose live HUD contains Shared Stone preserves the Pokémon identity sprite; status art never becomes the member sprite | member id/name/order and sprite fallback/cache behavior | synthetic capture with Pokémon visual + stone IMG + independent Technical review + render | `pass` — Technical adversarial extraction cases and Visual QA both confirm Pokémon identity art is preserved and Shared Stone is not selected as the saved sprite |
| `AC-08` | Shared Stone carrier count remains usable for `×1`, `×10`, `×99+` without clipping, neighbor overlap or Battle Line reflow | native badge/count node/value and six-slot geometry | multi-digit regression + representative Team/HUD render | `pass` — Technical QA verified `×1/×10/×999` lifecycle preservation and Visual QA confirmed `×99` without clipping, overlap, wrap or row-height growth |
| `AC-09` | Add Pokémon Search is square in normal/focus states even under hostile native searchfield appearance | input type/search semantics, toolbar order and focus | hostile-host CSS regression + representative render | `pass` — Visual QA confirmed square chrome under hostile rounded `!important` CSS; UX QA confirmed type=search, aria-label, focus and Tab order remain intact |

The Product Owner's later live result supersedes the candidate-level handoff despite `AC-01` through
`AC-09` remaining useful evidence for their own scopes. `0.2.7` must not be delivered again.

## Product Owner live result — `0.2.9` rejected

- branch: `refactor/team-pixel-art`
- userscript: `dist/pokepixel-better-ui.user.js`
- userscript version: `0.2.9`
- size: `566,484` bytes
- SHA-256:
  `194D0873E50264401424FC665D1F7F25C4BE27CDE10DE228442A82DF28F20369`
- focused latest-fix verification: `34/34` passed
- broader affected verification: `132/132` passed
- full automated suite: `266/266` passed
- build: passed
- `git diff --check`: passed; existing LF/CRLF warnings only
- current corrective render: `work/visual-qa-0.2.9.png`, SHA-256
  `4CB7D1DBAE56959EC8F3C1DAD9ADBC9503F4050A408EBDBFD9288748CE63C051`
- Independent Technical QA: `P0=0 P1=0 P2=0 P3=0`, **TECH READY** on exact `0.2.9` after
  independent `34/34` focused and `266/266` full verification plus adversarial hidden→visible→hidden
  Shared Stone lifecycle and post-render hostile-field specificity checks
- Independent UX/A11y QA: `P0=0 P1=0 P2=0 P3=0`, **UX READY** on exact `0.2.9`; reviewer
  confirmed the hidden placeholder is excluded from normal focus/accessibility exposure, the real
  Shared Stone badge retains native semantics, `Min Quality` remains attached through its label,
  numeric validity/filter behavior is unchanged, natural tab order remains intact, and the shared
  `:focus-visible` outline is not suppressed by the square-chrome reset
- Visual Regression QA: `P0=0 P1=0 P2=0 P3=0`, **VISUAL READY** for the local visual gate on
  canonical `work/visual-qa-0.2.9.png` (`4CB7D1DB…`); this is representative local evidence only,
  not Product Owner live proof
- Product Owner live validation: **rejected**. Saved Teams still rendered the persisted Shared Stone
  image as the member identity sprite. The live screenshot showed the current HUD Pokémon art
  correctly while the saved-preview cells reused the Shared Stone icon.

The first implementation attempt was frozen locally as `0.2.8` (`566,134` bytes, SHA-256
`28573CE96D07CE8589AD1F565B619FEE5C27470E890869CB99BB4DA2EBC51231`) but was **blocked before
handoff** by render-first preflight. `work/visual-qa-0.2.8.png` visibly showed More Filters fields
still rounded under stronger hostile host specificity. That source was hardened and versioned again;
`0.2.8` is not a deliverable candidate.

Visual-evidence traceability note: an earlier hash was read while the one-shot headless screenshot
process was still settling the same `0.2.9` output path. The settled canonical PNG above is 195,414
bytes and hashes to `4CB7D1DB…`; the transient earlier hash is withdrawn and is not acceptance evidence.

### Acceptance & Evidence Matrix — `0.2.9`

The previously reviewed `AC-01` through `AC-09` remain regression context. The new live rejection
adds the following explicit criteria:

| ID | Observable requirement | Must preserve | Required evidence | Current status |
| --- | --- | --- | --- | --- |
| `AC-10` | When neither carrier nor recipient uses Shared Stone, its native hidden presentation placeholder is completely absent; no empty badge/slot chrome is visible | native `hidden` ownership, carrier/recipient badge and count, six-slot Battle Line, reconciliation/cleanup | hidden→visible edge regression + representative HUD render + independent Technical/Visual review | `pass` — Technical lifecycle checks and canonical local render both pass; live validation still pending |
| `AC-11` | Pokémon Tools More Filters shows `Min Quality` and every PPBUI-owned input/select remains square even against hostile rounded host CSS | underlying `quality_multiplier` filter behavior, `type=number`, `step=.01`, focus/tab semantics, no host-global form reset | hostile-specificity regression + representative render + independent Technical/UX/Visual review | `pass` — Technical, UX/A11y and canonical local Visual reviews all pass; Product Owner live validation remains pending |

`0.2.9` is superseded. Its green local gates remain evidence for that exact artifact only and do not
override the Product Owner's live rejection.

## Blocked corrective candidate — `0.2.10`

- branch: `refactor/team-pixel-art`
- userscript: `dist/pokepixel-better-ui.user.js`
- userscript version: `0.2.10`
- size: `567,546` bytes
- SHA-256:
  `04DE4BB9CD7FDCF5933186E5826BD74AC37EBFE3280EF852FE915438C47A9B2E`
- focused Team Presets verification: `42/42` passed
- full automated suite: `269/269` passed
- build: passed
- `git diff --check`: passed; existing LF/CRLF warnings only
- canonical local render: `work/visual-qa-0.2.10.png`, `216,759` bytes, SHA-256
  `8BA64A7F0D894BCCEC180CEF71BD9D131714BF4EA0FBAF84810B577B51AB85A5`
- Independent Technical QA: `P0=0 P1=0 P2=1 P3=0`, **TECH NOT READY**. The initial
  `isSharedStoneAsset()` heuristic inspected the entire URL, so a legitimate Pokémon sprite such as
  `rhydon.png?note=shared-stone` could be falsely rejected even when it did not match the native
  Shared Stone badge.
- Visual Regression QA: the local pixels passed on exact `0.2.10`, but that visual result cannot
  authorize delivery after the Technical blocker and was invalidated by the subsequent source fix.
- Product Owner live validation: **not requested; `0.2.10` was blocked before handoff**

The missing `0.2.9` case was **legacy persisted contamination**. New snapshots already excluded
Shared Stone status art, but `teamPresetVisualReader()` trusted a previously stored `member.sprite`
before attempting live recovery. `0.2.10` rejects known Shared Stone asset paths and, during explicit
sprite-resolution passes, also rejects an opaque saved URL when it exactly matches the native
`.pokeidle-team-card__xp-share img`. The existing Pokémon-only extraction path then recovers current
identity art when available; otherwise the preview falls back to text instead of displaying the
Shared Stone. Normal saved Pokémon sprites still bypass extraction, and stable sync retains the
existing no-reserialization/no-rescan behavior.

Visual-evidence traceability note: an earlier size/hash was read while the one-shot headless
screenshot process was still settling the same `0.2.10` output path. The settled canonical PNG is
the `216,759`-byte / `8BA64A7F…` file above; the transient earlier identity is withdrawn.

### Acceptance & Evidence Matrix — blocked `0.2.10`

| ID | Observable requirement | Must preserve | Required evidence | Current status |
| --- | --- | --- | --- | --- |
| `AC-12` | A Saved Team must never display Shared Stone/status art as a Pokémon member sprite, including presets already persisted by an older candidate | saved member identity/order/active metadata, current HUD Shared Stone badge/count, six-slot Saved Team structure, normal saved Pokémon-sprite fast path, stable-sync performance | regression with contaminated persisted sprite + opaque auxiliary URL edge case + representative render + independent Technical/Visual review | `fail on 0.2.10 Technical QA` — legacy repair worked, but genuine saved sprite false-positive violated the preserved fast path |

## Shared Stone corrective candidate — `0.2.11`

- branch: `refactor/team-pixel-art`
- userscript: `dist/pokepixel-better-ui.user.js`
- userscript version: `0.2.11`
- size: `567,847` bytes
- SHA-256:
  `8AF4C8993FDFBAB969B90A56967C22427CF0ED8CF3A1A5EA36FCFBF3AB0DC096`
- focused Team Presets verification: `43/43` passed
- full automated suite: `270/270` passed
- build: passed
- `git diff --check`: passed; existing LF/CRLF warnings only
- canonical local render: `work/visual-qa-0.2.11.png`, `216,544` bytes, SHA-256
  `7953EBE916EBDEA384D8E8E3EFB6D6C79C0243BD2B5F0DB747A495348745F8FF`
- Independent Technical QA: `P0=0 P1=0 P2=0 P3=0`, **TECH READY** on exact `0.2.11`.
  Reviewer independently reran `43/43` focused and `270/270` full verification and closed the
  `0.2.10` false-positive: genuine Pokémon sprite URLs containing `shared-stone` only outside the
  asset basename remain untouched with zero canvas serialization. Shared Stone basename variants,
  relative/absolute opaque badge equivalence, off-team known contamination and cache reuse also pass.
- Visual Regression QA: `P0=0 P1=0 P2=0 P3=0`, **VISUAL READY** for the local rendered-evidence
  gate on canonical `work/visual-qa-0.2.11.png`. The intentionally contaminated persisted preset
  renders Pokémon identity rather than Shared Stone; the real HUD `×99` badge remains visible and
  correct; Saved Team composition and prior visible fixes remain unchanged.
- Product Owner live validation: **passed**. The Product Owner explicitly reported
  **“Shared stone comportamento validado.”** on 2026-09-17.

`0.2.11` keeps the legacy recovery behavior but narrows the path heuristic to the actual asset
basename after URL parsing/query/hash removal. A genuine Pokémon sprite may therefore contain the
text `shared-stone` in a directory, query or fragment without being classified as status art. Opaque
assets remain rejected only when they exactly match the current native Shared Stone badge during an
explicit resolution pass.

### Acceptance & Evidence Matrix — latest `0.2.11` correction

| ID | Observable requirement | Must preserve | Required evidence | Current status |
| --- | --- | --- | --- | --- |
| `AC-12` | A Saved Team must never display Shared Stone/status art as a Pokémon member sprite, including presets already persisted by an older candidate | saved member identity/order/active metadata, current HUD Shared Stone badge/count, six-slot Saved Team structure, genuine saved Pokémon-sprite fast path even when unrelated URL text contains `shared-stone`, stable-sync performance | contaminated persisted sprite regression + opaque badge-match edge case + false-positive URL regression + representative render + independent Technical/Visual review + Product Owner live validation | `closed` — exact `0.2.11` is TECH READY and locally VISUAL READY, and the Product Owner subsequently validated Shared Stone behavior live |

## Current corrective candidate — `0.2.12`

- branch: `refactor/team-pixel-art`
- userscript: `dist/pokepixel-better-ui.user.js`
- userscript version: `0.2.12`
- size: `567,955` bytes
- SHA-256:
  `3623CFAF3E04A730D00DEFCADD243BD6E8BEB530EE8B92D629E969C8BB42E270`
- focused Team Presets verification: `43/43` passed
- full automated suite: `270/270` passed
- build: passed
- `git diff --check`: passed; existing LF/CRLF warnings only
- canonical local render: `work/visual-qa-0.2.12.png`, `263,016` bytes, SHA-256
  `3980AB84EB82801351C42D7D897FD331733973E17C6B61752707590F92E2C2A4`
- local six-slot diagnostics: `476px` preview/list width, `0px` left gap, `0px` gap after
  member 6, `0px` gap to the panel content edge, six equal `~79.33px` tracks on one row,
  `scrollbar-gutter:auto`, and no horizontal or vertical scrollbar in the one-preset fixture
- Independent Technical/Architecture QA: `P0=0 P1=0 P2=0 P3=0`, **TECH READY** on exact
  `0.2.12`. The reviewer independently reverified artifact identity, `43/43` focused and `270/270`
  full tests, and used a multi-preset adversarial probe to confirm the outer list still owns genuine
  `overflow:auto` / `max-height:220px` scrolling while only the noninteractive six-member preview
  contains decorative overflow.
- Visual Regression QA: `P0=0 P1=0 P2=0 P3=0`, **VISUAL READY** for the exact local render.
  The reviewer reconfirmed the PNG/artifact identities and visually verified six equal contiguous
  slots reaching the right edge with no blank strip, wrap or visible scrollbar; header/Apply and the
  previously accepted visible regressions remain intact.
- Product Owner live validation: **passed on 2026-09-17; Product Owner said “Validado.” after the 0.2.12 Saved Team width correction**

The live screenshot after Shared Stone acceptance exposed a right-side strip after member 6. The
initial stable-gutter hypothesis was incomplete: after changing the list to `scrollbar-gutter:auto`,
the local browser still measured `78px` client height versus `80px` scroll height. A decorative
`.ppbui-pokemon-card__visual` descendant extended `2px` below the fixed preview cell, creating a real
vertical scrollbar on Windows and consuming `15px` of horizontal width. The final correction keeps
the outer preset list scrollable for real multi-preset overflow and confines only the generated,
noninteractive six-member preview with `overflow:hidden`. No Saved Team structure, order, sprite
size, header or Apply composition changes.

### Acceptance & Evidence Matrix — `0.2.12` width correction

| ID | Observable requirement | Must preserve | Required evidence | Current status |
| --- | --- | --- | --- | --- |
| `AC-13` | A full `6/6` Saved Team preview in the Team HUD fills the complete usable row width: member 1 starts at the left boundary, member 6 reaches the right boundary, all six cells remain equal/contiguous and do not wrap; no false scrollbar/reserved strip appears when the list does not actually overflow | six-member identity/order, Saved Team Pokémon sprites, header/Apply placement, Shared Stone behavior already live-validated in `0.2.11`, and genuine outer-list scrolling when multiple presets exceed `220px` | CSS regression + measured 6/6 browser harness + canonical render + independent Technical/Visual review + Product Owner live validation | `pass / live validated` — exact `0.2.12` completed TECH READY + local VISUAL READY and the Product Owner subsequently validated the live result |

## Earlier rejected candidate

- branch: `refactor/team-pixel-art`
- userscript: `dist/pokepixel-better-ui.user.js`
- recorded build SHA-256:
  `2ECBAAF6E9348B024FD774D75DD793DD09A92B7D73F59A6E888C2F6533239F22`
- artifact hash re-checked on 2026-09-16 after the governance update: exact match
- focused Team + Presets verification: `31/31` passed
- full automated suite: `232/232` passed
- build: passed
- `git diff --check`: passed; repository retains its existing LF/CRLF warnings
- Independent UX review: `P0=0 P1=0 P2=0 P3=0`, `READY`
- Independent technical review: `P0=0 P1=0 P2=0 P3=0`, `READY`

These results describe the candidate produced before the PM governance
reorganization. The governance update did not rebuild or modify the userscript;
the recorded artifact hash was re-checked and still matches. Re-check the hash
again only when comparing against this historical rejected candidate.

## Product contract carried forward

- Team HUD remains Level-first: visible `Lv.N`, HP as a secondary thin rail.
- Full Team normal-width command row remains
  `#N + Battle Order arrows + Active + Details + Remove`.
- Saved Team does not restore the redundant `Selected: Pokémon · N/6` sentence.
- Saved Team normal-width footer keeps member controls left and
  `Update saved team + Apply` on the same row.
- shared primary remains dark PPBUI surface with blue/cyan action edge/text, not a solid fill.
- Hunt Atlas module-owned action styling must not regress from shared primitive
  specificity.
- responsive command/footer wrapping must be driven by actual content pressure;
  the rejected candidate's broad 539px forced-wrap behavior is no longer carried
  forward.

## Corrected candidate after live feedback

The correction batch includes both the source-audit issues and the Product
Owner's explicit screenshot feedback:

- Full Team still reserved oversized fixed command widths and used a 539px
  breakpoint derived from that old footprint. The corrected command dock now
  uses intrinsic button widths and natural flex wrapping, so
  `#N + arrows + Active + Details + Remove` stays on one row whenever it actually
  fits and wraps only under real width pressure.
- Saved Team used a two-column `minmax(260px, 1fr)` manager grid while also forcing
  every card at or below 539px to split its footer. That made the approved
  same-row member controls + `Update saved team` + Apply composition unreachable
  in many normal Team-window layouts. The corrected manager gives each preset the
  full available row and lets the footer wrap from intrinsic fit; Update + Apply
  remain one action group.
- The later Sweetie 16 FIX goes further than that earlier layout correction: preset
  cards/manager rows now fill the full available Team width with flattened nesting,
  and the six saved positions form one contiguous strip rather than six inset cards.
- Full Team opens at a compact 480px before manual resize, reduces the top gap above
  the roster and removes redundant roster/profile boxes. Pointer-down on the native
  resize handle snapshots the current width/height and hands geometry ownership back
  to the native `UIPanel`.
- Team HUD minimize/collapse remains entirely native. Better UI now overrides only
  the exact trainer/active/list/preset children when native `is-collapsed` is set,
  closing the previous `display:grid!important` precedence bug without adding a
  competing click handler or state store.
- Team HUD EXP/HP/STA values now use metadata-scale numerals and bounded one-line
  presentation. Pairs reaching the million range use compact `K/M/B/T` visible
  notation while the exact value remains on the same bar's title/ARIA, preventing
  future digit growth from wrapping outside the 14px meter.
- Project shadow depth is standardized to the restrained `2px 2px` PPBUI shadow;
  Team HUD and its Wallet now use the same distance.
- Shared primary buttons use blue/cyan action edge/text semantics and the same dark
  bottom depth as secondary controls. Apply therefore no longer reads as a
  separate gold-underlined component family.
- Team HUD and Full Team reuse and restyle the native Shared Stone / XP Share
  badge inside the card boundary, preserving its native image, direction and
  count while preventing clipping.
- Full Team `Active` / `Make Pokémon active` now shares PPBUI button geometry;
  the current Active state uses success semantics without the former special
  left-rail treatment.
- The Full Team `#N` position marker is larger and vertically centered with its
  order/action row, and the excessive top padding above the roster is reduced.
- Team-name inputs are square, accent-bordered PPBUI edit fields with no gray
  inset treatment.
- Saved Team keeps `< Active >`, `Update saved team` and Apply on one normal-width
  footer row; only genuinely narrow cards may wrap.

Engineering verification for the superseded first Miyazaki 16 candidate:

- full suite: `247/247` passed
- build: passed, 537,092 bytes
- `git diff --check`: passed; existing LF/CRLF warnings only
- userscript SHA-256:
  `7405CC0FBBB1111C29D481A39801644F8321623D301DC3A2163E98C2A990C95B`
- Independent Architecture/Integration QA: `P0=0 P1=0 P2=0 P3=0`, `READY` on the
  exact 537,092-byte artifact; reviewer-focused regression coverage: `165/165` passed.
- Independent UX/A11y & Design QA: `P0=0 P1=0 P2=0 P3=0`, `READY` on the exact
  artifact. The runtime review passed `95/95` focused checks and a separate read-only
  documentation closure confirmed the final two P3 wording fixes.
- those machine gates were complete for that superseded exact artifact only.

The previous Sweetie 16 artifact metrics below are retained as superseded historical evidence.

Engineering verification for the superseded Sweetie 16 candidate:

- full suite: `244/244` passed
- build: passed, 534,385 bytes (`521.9 KB`)
- `git diff --check`: passed; existing LF/CRLF warnings only
- userscript SHA-256:
  `4F3A23F9FA7BEAA29787F6A9F99DF2BBBF0AD171D0FD418F6F59A3F9F042F92F`
- Independent Architecture/Integration QA: `P0=0 P1=0 P2=0 P3=0`, `READY` on the
  exact current artifact.
- Independent UX/A11y & Design QA: `P0=0 P1=0 P2=0 P3=0`, `READY` on the exact
  current artifact.
- Both reviewers independently re-confirmed the 534,385-byte /
  `4F3A23F9FA7BEAA29787F6A9F99DF2BBBF0AD171D0FD418F6F59A3F9F042F92F` userscript
  and the full `244/244` suite after the final P3 hardening.

The superseded Sweetie candidate was ready for its Product Owner gate before being rejected on
color distribution. Automated/review readiness never implied in-game approval.

## Remaining gate

Shared Stone behavior is closed by explicit Product Owner live validation on `0.2.11`; the Saved Team
HUD `6/6` width correction is closed by the later Product Owner validation of exact `0.2.12`; accepted
Team/Add Pokémon structure remains closed.

The only new open product gate is manual Saved Team authoring from Backpack on exact `0.2.22` after
its independent local reviews finish. Live validation should be narrowly scoped to selecting 1–6
Backpack Pokémon, ordering them, choosing the active member, saving without changing the current
Team, and then applying the saved preset to reproduce composition/order/active exactly. Automated,
independent and local rendered evidence do not substitute for this live gate.

Live game/browser/Tampermonkey validation remains Product Owner-only.
