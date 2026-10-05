# Pokémon Profile / Dossier — dedicated surface

> Update (`0.2.124`): Custom Pokéball has been removed at the Product Owner's
> request. Its icon and paired test evidence below document the historical
> `0.2.77` freeze; the Pokémon Profile icon remains in the current implementation.

Status: **Better UI 0.2.77 / candidate76 is locally frozen with the requested Pokémon Profile menu
PNG applied on top of the approved 0.2.76 Game Palette + Alpha result. Team remains restored and
Pokémon Profile remains dedicated; the Profile behavior/layout contract is unchanged.**

## Current direction — dedicated Pokémon Profile (2026-09-23)

Final Product Owner direction changed after the 0.2.64 Team dossier: **do not keep the dossier
inside Team**. Team is again its normal management window; Pokémon Profile is a separate
window/menu and consumes owned Pokémon from Team + Backpack.

Current implementation contract:

- exact subject identity by `creatureId`;
- selector `Todos / Team / Backpack`;
- Current Moves in unmistakable linear `1–4` order;
- Saved Movesets for the same exact creature, each in linear `1–4` order;
- Saved Teams containing that exact creature;
- native `PokeIdle.PokemonCard` remains the hover/card authority: SALE, duplicate Total IV and
  duplicate Rarity highlight cells are hidden; compact Total Power stays in the Level/Rarity badge
  row; Current Moves are added with native move icons; overall IV is shown beside Battle Stats;
- pinned/sheet native cards move their existing native action row to the top intact and gain a
  Profile action for the exact `creatureId`; the transient native hover remains read-only and no
  replacement hover/listener interception exists;
- canonical shared Team Preset + Moveset stores;
- Team restored with Vitals/Stats and without dossier projection.

### 0.2.77 Pokémon Profile menu-icon micro-delta

The Product Owner requested the repository asset `assets/menu-poke-profile-icon.png` as the
Pokémon Profile menu icon. The menu now renders that asset through the same native toolbar bitmap
class used elsewhere (`img.pokeidle-top-toolbar__icon`), with decorative image semantics and without
changing `data-menu-id="pokemon-profile"`, grouping, label, click handling or dossier lifecycle.
The build embeds the exact PNG into the self-contained userscript; the direct `/assets/...` path is
only the source/test fallback.

This micro-delta was frozen together with the requested Custom Pokéball PNG replacement. Focused
Profile + Custom Pokéball verification is `31/31 PASS`; full suite `420/420 PASS`; build PASS;
exact-current visual gate **READY P0=P1=P2=P3=0** with both PNGs centered and undistorted in the
native toolbar icon slot and no Custom Pokéball vector icon visible.
Better UI `0.2.77`: `1087375` bytes / SHA-256
`3E4FE83D7FAAFF673FF8E917B8742020E5A167E2AEBF6BA20387B963DF493442`.
candidate76 remains the byte-identical JS-loading host line at `240640` bytes / SHA-256
`C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`; all three lifecycle
smokes exit `0`. Normal host remains unchanged at `146944` bytes / SHA-256
`924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.

### 0.2.74 native PokémonCard corrective

The Product Owner clarified on 2026-09-24 that "hover" means the game's standard PokémonCard,
not a separate Better UI card. Production now post-processes the native renderer rather than
intercepting contextual hover events:

- native hover/pinned/sheet DOM remains owned by `PokeIdle.PokemonCard`;
- SALE is removed from presentation without replacing the native highlights section;
- the exact rendered Total Power value is promoted to the Level/Rarity row on the right;
- four authoritative current moves are added with the existing native move icons;
- pinned/sheet cards add a Profile action beside the existing native action row and preserve exact
  `creatureId` semantics; transient hover remains read-only;
- cleanup is composable with later wrappers and restores only Profile-owned nodes/state.

Exact local freeze: focused Profile `20/20 PASS`, combined Profile/Team/Movesets/HUD
`69/69 PASS`, full suite `416/416 PASS`, build/diff-check PASS. Better UI `0.2.74`:
`987571` bytes / SHA-256
`A15BBF9B858A41CEDCC0453DB6BD289D4234F6F9B4F00D26EDB22775A255EB0D`.
candidate73 remains the byte-identical JS-loading host line at `240640` bytes / SHA-256
`C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`; all three lifecycle
smokes exit `0` with empty stdout/stderr. Normal host remains unchanged.

### 0.2.76 native PokémonCard compact-top refinement

The Product Owner's 2026-09-24 follow-up identified the remaining native-card issue as top-area
wrapping and duplicate summary information. The same native card remains authoritative; this is a
reversible layout/presentation refinement only:

- `ACTIVE` and `PROTECTED` native badges are compacted to icon presentation while their original
  text remains the accessible label/title;
- promoted Total Power uses `⚡ value` in the badge row while title/ARIA retain the full native
  label/value;
- the existing native `EQUIP / LOCK / CHAT` action container is moved intact immediately below the
  badge row, then receives the existing Better UI Profile action; native nodes and handlers are not
  recreated;
- native `TOTAL IV` and `RARITY` highlight cells are hidden from presentation; the exact rendered IV
  total moves beside `BATTLE STATS` as `· IV n/186`;
- the approved Game Palette uses `#161D20` for Window/Value, `#232C2E` for Interactive and
  `#6B6543` for all module lines, fixed at `1px`;
- alpha is surface-only and independent from color: Window `92%`, Interactive `96%`, Values
  `85%`; text, line, Pokémon type and rarity colors remain opaque/semantic;
- Hero and Current Moves use the Interactive surface from the approved export; Search/List remains
  `108px`, move metadata stays `Element → TYPE → Cooldown → PW`, and the approved Search grid is
  Name row 1, Sprite/Elements row 2, Rarity row 3 and Level row 4;
- the native card keeps its normal 360px width at 760/420 but is constrained by
  `max-width:100%` on narrow parents, eliminating the prior 340px horizontal clipping;
- transient hover still has no action row/Profile CTA, exact `creatureId` semantics are unchanged,
  and cleanup restores the native action-row location, status badges and hidden highlight cells.

Exact local automated freeze: focused Profile `24/24 PASS`, full suite `420/420 PASS`,
build/diff-check PASS, and exact-current visual re-gate **READY P0=P1=P2=P3=0**. Better UI
`0.2.76`: `1001837` bytes / SHA-256
`11C2CB82C189F7573B0A1AA24736445C32463D2C9B416DC7380E28F57EEBF928`.
candidate75 is the byte-identical JS-loading host line at `240640` bytes / SHA-256
`C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`; all three lifecycle
smokes exit `0`. Normal host remains unchanged at `146944` bytes / SHA-256
`924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.

### 0.2.71 approved Obsidian Playground promotion

Product Owner approved the Playground layout and authorized promotion on 2026-09-24. Production
now carries the approved visual/layout contract directly:

- Search/List is `108px` wide and uses the approved `2×4` composition: Name full row 1, Sprite and
  Elements independently placed on row 2, Rarity detached into its own DOM object spanning row 3,
  and Level spanning row 4;
- Current/Saved/Hover move metadata DOM order is `Element → TYPE → Cooldown → PW`; PW stays 44px;
- Current/Saved rails remain explicit horizontal `1→4`, fill the complete available box width and
  use `scrollbar-gutter:auto`, preserving local/focusable horizontal overflow only when required;
- approved Obsidian styling is scoped to Profile/Hover: deep blue-green shell, lightly contrasted
  section boxes, restrained gold hierarchy and softer steel/green-gray separators; redundant inner
  Name/PW move borders are removed;
- dedicated Profile architecture, exact `creatureId`, Team + Backpack ownership, filters, Configure
  Moves, canonical Saved Moveset/Team stores and Team native management ownership are unchanged.

Exact local evidence:

- focused Profile + Team Movesets: `31/31 PASS`; full suite: `414/414 PASS`; build PASS;
- Better UI 0.2.71: `982232` bytes, SHA-256
  `2B2721C39C53B2BC2C76FEE88D0FAC92DFA7B4AB1A17E5CC8BE806050F560AA9`;
- candidate70: `240640` bytes, SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate69 because there is no C# delta and the host loads the current dist;
- candidate70 normal / close-during-init / close-during-switch smokes: PASS, exit `0`, stderr `0`;
- final independent TECH/ARCH, UX/A11y and VISUAL gates: READY, `P0=P1=P2=P3=0`;
- normal host remains unchanged: `146944` bytes, SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.

Normal-host promotion and Git history remain separate gates.

### 0.2.70 hover parity corrective

- Hover Current Moves now reuses the dossier renderer with Element icon, Phys/Spec/Status,
  fixed 44px PW XXX and numeric Cooldown.
- Ordered 1→4 behavior is unchanged. Narrow layouts keep overflow in the focusable local rail.
- Hover max width is 580px. Header Power N remains Pokémon aggregate Power; PW is move-specific.
- Focused Profile + Team Movesets: 31/31 PASS; full suite: 414/414 PASS; build/diff-check PASS.
- Better UI 0.2.70: 981354 bytes, SHA-256
  87B22ED120CC1FBEB0E1D92725C2AC02142EB3E5C184A3DA89F829843F8525B7.
- candidate69: 240640 bytes, SHA-256
  C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD.
- Normal, close-during-init and close-during-switch smokes: PASS, exit 0, stderr 0.
- TECH/ARCH, UX/A11y and VISUAL render-first: READY, P0=P1=P2=P3=0.

### 0.2.69 final Search / Power micro-corrective

- Search/List no longer includes IV; the small owned-Pokémon card ends at Level and shrinks from
  `128px` to `116px` normalized width. The selected dossier still owns IV.
- Current/Saved move Power renders as `PW XXX` in a fixed `44px` bordered chip. Metadata columns are
  `22px / minmax(30px,1fr) / 44px / minmax(22px,auto)`; move-card minimum is `136px`.
- Explicit `Phys/Spec/Status` remains intact; Cooldown stays numeric. Full semantic Power/Cooldown
  names and seconds remain in title/ARIA.
- Horizontal `1→4` order and focusable local narrow scrolling remain unchanged.

Exact freeze evidence:

- focused Profile + Team Movesets: `31/31 PASS`; full suite: `414/414 PASS`;
- build PASS; diff-check exit `0`, existing LF/CRLF warnings only;
- independent TECH/ARCH + UX/A11y + render-first VISUAL: **READY**, `P0=P1=P2=P3=0`;
- exact Better UI `0.2.69`: `981996` bytes, SHA-256
  `838A4F84CD7F6F606609247A12B8A45DBCEDD8F4C3D597A434386CF8D6D9C223`;
- candidate68: `240640` bytes, SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate67 because host C# is unchanged;
- close-during-init and close-during-switch smokes: PASS, exit `0`, stderr `0`;
- normal smoke: one initial cold-start timeout, then PASS; candidate67/candidate68 parity rerun against
  the same current dist passed for both with empty stderr, isolating the event as startup/harness
  flakiness rather than a product delta.

candidate67 is superseded for this Profile validation. Normal-host promotion and Git history remain
separate and unauthorized.

### 0.2.68 final Profile hierarchy corrective

- Search/List is now `[Sprite] / Name / [Element][Element] [Rarity] / Lv. - IV`; Quality Number is
  gone and unavailable rarity renders neutral `—` instead of fabricated `Common`.
- Selected Element presentation is icon-only bordered with an adjacent plain name. Selected facts
  expose Rarity, Gender, Nature and IV; rarity multiplier is removed and Gender uses cyan/salmon/muted
  non-Element semantics.
- Current/Saved move rails remain horizontal `1→4`; TYPE remains explicit `Phys/Spec/Status`.
  Power and Cooldown are visually numeric-only while title/ARIA retains semantic labels and cooldown
  seconds. Power uses Miyazaki ivory; Cooldown uses muted/steel.
- Final geometry keeps the complete `Status` label readable and preserves local focusable horizontal
  scroll at 340px.

Exact freeze evidence:

- focused Profile + Team Movesets: `31/31 PASS`; full suite: `414/414 PASS`;
- build PASS; diff-check exit `0`, existing LF/CRLF warnings only;
- independent TECH/ARCH + UX/A11y + render-first VISUAL: **READY**, `P0=P1=P2=P3=0`;
- exact Better UI `0.2.68`: `982022` bytes, SHA-256
  `4987131954AA5D835CEAAC120A0E6E16D9736C1FC8D59260D3A3A045C324F328`;
- candidate67: `240640` bytes, SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate66 because host C# is unchanged;
- candidate67 normal / close-during-init / close-during-switch smokes: PASS, exit `0`, stderr `0`.

candidate66 is superseded for this Profile validation. Normal-host promotion and Git history remain
separate and unauthorized.

### 0.2.67 corrective closure after candidate64 live feedback

The Product Owner rejected candidate64 as the final UX because Profile still lacked Team's visual
identity, rich move facts, collapse controls and Configure Moves, while Team's Active/order controls
looked disconnected. The exact-current corrective closes those points without changing the dedicated
Profile architecture:

- picker + hero reuse canonical Pokémon sprite, Element color/icon and quality primitives;
- all owned Team + Backpack choices are species-enriched before picker rendering so raw native
  inventory records without sprite metadata do not remain text-only;
- Current/Saved move rails remain horizontal `1→4` and add native move icon, Element identity and
  authoritative `PWR`; `PokemonCardData.loadDetail()` supplies native `move.power` only when the
  moveset payload lacks it, including saved-only IDs;
- Configure Moves targets the exact selected `creatureId`, including Backpack, through the existing
  `applyTeamMoveset` fresh-revision/availability/final-verification contract;
- Saved Movesets and Saved Teams have independent native-button collapses with contextual
  `aria-expanded` and per-creature session state;
- Team native Edit Moves / Active-or-Activate / `#N` / arrow controls stay in native ownership and
  are aligned into one compact row; first/last disabled arrows remain native and visually readable.

Exact freeze evidence:

- focused Profile + Team + Team Movesets: `49/49 PASS`;
- full suite: `413/413 PASS`;
- build: PASS; `git diff --check`: exit `0`, existing LF/CRLF warnings only;
- independent TECH/ARCH + UX/A11y: **READY, P0=P1=P2=P3=0**;
- independent render-first VISUAL: **READY, P0=P1=P2=P3=0**;
- narrow Profile: root/body `320/320` and `310/310`; move rails remain local horizontal scroll
  Current `268/454`, Saved Hunt `280/454`, Saved Boss `284/454`;
- Better UI `0.2.67`: `972808` bytes, SHA-256
  `BA880C4BC407E530063407B577E0F76906F037902B4244B617CBA25C6830883E`;
- candidate65: `240640` bytes, SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate64 because host C# is outside this corrective;
- candidate65 normal / close-during-init / close-during-switch smokes: PASS, exit `0`, stderr `0`.

`candidate64` is superseded for promotion. Product Owner live validation of candidate65 is the next
runtime gate. Git history, normal-host promotion and release remain separate and unauthorized.

Historical 0.2.65 local freeze evidence:

- focused Profile/Team/Hover/Movesets/Presets: `64/64 PASS`;
- full suite: `407/407 PASS`;
- build: PASS on Better UI `0.2.65`;
- `git diff --check`: exit `0`, existing LF/CRLF warnings only;
- visual pre-gate: READY on the dedicated Profile/restored Team renders; the later corrective
  UX delta changes focus/ARIA semantics only and does not change geometry/style;
- UX corrective re-gate: **UX READY, P0=P1=P2=P3=0**. The reviewer independently
  re-probed all four former blockers and reran the exact focused `64/64` suite;
- final TECH/ARCH re-gate: **READY, P0=P1=P2=P3=0**, independent focused `79/79 PASS`;
- final render-first VISUAL re-gate: **READY, P0=P1=P2=P3=0**, all nine dedicated
  Profile/restored Team renders remain representative;
- exact Better UI 0.2.65 bundle: `946788` bytes, SHA-256
  `EDD901556C769DDE15B9930C63CBCBCFA280F322A6F4F832AB9408F54CA0836C`.

The 0.2.64 Team-dossier bundle remains historical only. No Git history or live
release is authorized by these local checks.

### 0.2.65 PM decision

`LOCAL ACCEPTED — TECH READY + UX READY + VISUAL READY, all P0-P3 = 0, on Better UI 0.2.65
946788 bytes / SHA-256 EDD901556C769DDE15B9930C63CBCBCFA280F322A6F4F832AB9408F54CA0836C.`

### Product Owner live result after 0.2.65

`SUPERSEDED FOR PROMOTION` — the dedicated Profile direction remains approved, but the Product
Owner rejected the vertical move presentation and requested discovery filters for rarity,
element, level range and tags. Corrective implementation is underway after 0.2.65; that delivery
must not be promoted as the final artifact.

### 0.2.66 corrective closure

- Product feedback closed: Current Moves, Saved Movesets and hover are horizontal `1→4`;
- discovery: source + search + Rarity + Element + Level Min/Max + Tags;
- canonical Pokémon Tools `matchesPokemon`/`tagService` reused; no duplicate tag persistence;
- invalid level range cannot retain a hidden stale bound; `aria-invalid` and Clear state stay coherent;
- narrow move rails are local `ppbui-scroll` regions, focusable/named and use square cyan focus;
- focused corrective verification `77/77 PASS`; exact full suite `408/408 PASS`; build PASS;
- TECH/UX-A11y: **READY, P0=P1=P2=P3=0**;
- VISUAL: **READY, P0=P1=P2=P3=0**;
- Better UI `0.2.66`: `953762` bytes, SHA-256
  `6F2230B70EBC36F2396F9535EE91472E74825772780D8E6390766A225276C2FE`;
- candidate64: `240640` bytes, SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`;
- candidate64 normal / close-during-init / close-during-switch smokes: PASS, exit `0`, stderr `0`.

Historical 0.2.66 decision at that time:
`LOCAL ACCEPTED — candidate64 is prepared for Product Owner live validation only. Git history,
normal-host promotion and release remain separate gates.` candidate64 was later superseded by the
0.2.67 corrective recorded above.

## Historical delivery — Team-as-dossier 0.2.63 / 0.2.64

## Task

- Request: turn the full Team window into a Pokémon profile/dossier page. The six-member roster remains navigation; the selected Pokémon becomes the primary subject.
- Baseline runtime: Better UI `0.2.62`.
- Previously Product Owner validated scope to preserve: native Team nodes/actions/order, Add Pokémon workflow, Team Presets v2 behavior, Saved Movesets per creature instance, Team HUD contracts, cleanup/reconciliation ownership.
- Explicitly out of scope: fabricated stats/Ability/Item data, a replacement native moveset editor, a second Saved Team persistence model, species-level Saved Movesets/participation, changes to Team gameplay rules.
- Write owners: `team` owns roster/profile/native command presentation; `team-movesets` owns current + saved movesets; `team-presets` owns Saved Team membership projection and full Saved Teams maintenance.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `TP-01` | Team reads as one selected-Pokémon dossier; the six native Team slots are compact navigation rather than the dominant data surface | exact native slot order, click/keyboard handlers, selected/active/fainted/position semantics | DOM lifecycle tests + representative normal/narrow render | Feature Engineer | UX + Visual QA | `PASS` |
| `TP-02` | Profile identity leads with native portrait/name/Level/Element/quality and only authoritative Team facts | no inferred Ability/Item/stats; native portrait/tags remain authoritative | source audit + representative render | Feature Engineer | UX + Visual QA | `PASS` |
| `TP-03` | Current Moveset is a first-class block with the authoritative ordered current moves and the original native Moveset editor action | native `getMoveset` / editor node and handlers; stale async result isolation | focused async/state tests + render | Feature Engineer | Technical + UX + Visual QA | `PASS` |
| `TP-04` | Saved Movesets stay scoped to the exact creature id, keep stable `M#`, exact-current matching and existing Apply/Update/Delete behavior | `ppbui:team-movesets:v1`, final authoritative reread, native save contract | focused regression tests + render | Feature Engineer | Technical + UX QA | `PASS` |
| `TP-05` | Saved Teams section shows only canonical v2 presets containing the exact selected creature id, with saved position/active/order state | `ppbui:team-presets:v2` remains the only formation source; no species conflation or inverse persistence | exact-ID regressions + render | Feature Engineer | Technical + UX + Visual QA | `PASS` |
| `TP-06` | Pokémon-profile Saved Teams is read-only context with one section-level Manage action; all edit/apply/delete/reorder operations remain in the existing full manager | full Saved Teams manager behavior, composer, confirmations and ordering | interaction tests + keyboard review + render | Feature Engineer | UX QA | `PASS` |
| `TP-07` | Switching selected Pokémon updates identity, current/saved movesets and Saved Team memberships without stale cross-Pokémon data | central reconcile, no new polling/observer, async epoch isolation | adversarial selection/race/native-refresh tests | Feature Engineer | Technical QA | `PASS` |
| `TP-08` | Normal Team width and 340px minimum remain usable with one vertical body scroll and no horizontal primary-workflow overflow | manual resize ownership; Add Pokémon geometry | representative 560px + 340/419px renders | Feature Engineer | UX + Visual QA | `PASS` |
| `TP-09` | Focus, keyboard order, labels, loading/empty/error states and async status remain explicit and non-color-only | native keyboard behavior and PPBUI 2px focus ring | accessibility/state tests + UX review | Feature Engineer | UX QA | `PASS` |
| `TP-10` | Native full refresh and module cleanup reacquire/remove only owned profile additions and restore native nodes/handlers exactly | `.pokeidle-panel__body` identity; independent module toggles | lifecycle/cleanup regressions | Feature Engineer | Technical QA | `PASS` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| `R-TP-01` | The previous Team design contract says Battle Line is visually dominant | design override + render review | `closed by contract` |
| `R-TP-02` | Current Moveset read is async and previous implementation swallowed read failures | selection-race + failure/Retry tests | `closed by tests + error render` |
| `R-TP-03` | Same-species creatures can be incorrectly conflated by a species-based membership lookup | two same-species/different-id test | `closed by exact-id regression` |
| `R-TP-04` | Native Team refresh replaces the profile DOM while Saved Teams manager is intentionally preserved | native-refresh re-acquisition test | `closed by lifecycle regression` |
| `R-TP-05` | A taller dossier can create nested or horizontal scroll at 340px | 560px/340px browser renders + constrained-height scroll probe | `closed by render metrics` |

## Design contract

Normal composition:

1. native titlebar;
2. compact six-slot roster navigator;
3. one continuous selected-Pokémon dossier:
   - identity hero;
   - native command dock (`#N`, order arrows, Activate/Active, Details, Remove);
   - **Current Moveset**;
   - **Saved Movesets**;
   - **Saved Teams** containing this exact creature;
4. existing full Saved Teams manager, collapsed/subordinate, remains the maintenance surface.

Visual emphasis is **identity + Current Moveset** first, then Saved Movesets and participating Saved Teams; in DOM/reading order the native command dock stays immediately after identity so member actions remain attached to their subject. Roster is navigation and the global Saved Teams manager is subordinate. Miyazaki 16, square geometry, 2px major edges, 1px internal separators and MASTER typography remain authoritative. Domain colors are used only for gameplay semantics.

At the normal Team width, the roster stays `6×1`; at the established narrow threshold it may become `3×2`. The dossier body is the only vertical scroll owner. Current moves are presented as an ordered `2×2` primary block; saved-loadout move chips may remain denser and reflow at narrow widths. Participating Saved Teams are context rows, not a second manager.

## Gate results

- Exact local candidate: Better UI `0.2.63`, `dist/pokepixel-better-ui.user.js`, `944768` bytes, SHA-256 `15721E23B8B7EC82C890F26700818197D254ECCEA2E32658C9C58B7D6C483077`.
- Author verification: **PASS** — full suite `394/394`, build PASS, `git diff --check` exit `0` with existing LF/CRLF warnings only.
- Corrective closure after first independent gates: Team cleanup now removes shared Pokémon-card state only from native `.team-slot` nodes, so disabling `team` cannot mutate sibling Team Presets cards; Saved Movesets Retry moves logical focus to a persistent labelled Current region while its persistent child status announces Loading/Error, and Apply/Update move focus to the persistent polite operation status. Current/Saved section labels now use `h3` semantics.
- Focused dossier regressions cover Current loading/error/Retry/empty, Retry/Apply/Update focus continuity, exact-current `M#`, exact-creature Saved Team membership including same-species/different-id separation, independent module cleanup, native refresh reacquisition, independent no-movesets projection fallback and mutation-free stable sync.
- Render-first evidence:
  - `work/team-profile-preview-480.png` — populated normal; `51629` bytes; SHA-256 `E50EE116CA41FEF11E5571FA4AE07AFBD514D152C627BB7C8E94CEBE113E3C87`.
  - `work/team-profile-preview-340.png` — populated minimum; `48075` bytes; SHA-256 `E378FF4391BC55B7C1CAF15F2D9178865E174E3C545BDF019A9E418807C5D5F1`.
  - `work/team-profile-preview-empty.png` — zero Saved Movesets / zero participating Saved Teams; `33258` bytes; SHA-256 `A2B7F2D987CA1D2390C3F19BDFF8FEF21BF33B39708E95933BA5CCD231508F6F`.
  - `work/team-profile-preview-error.png` — Current Moveset read failure + Retry with native editor retained; `49560` bytes; SHA-256 `E72BB19AC6CC4CFB2B34C6F672B4368F22FFECE6DFE1ADB467756A7C56B6CD45`.
  - `work/team-profile-preview-focus.png` — explicit cyan `:focus-visible` on Manage; `50227` bytes; SHA-256 `2EA2B41F2C68A0C84A639106A47CB974DA6E39CD8F94AB53EDD35EA4DE7730C9`.
  - `work/team-profile-preview-roster-focus.png` — selected roster slot with explicit keyboard-focus state while selected/active semantics remain present; `48191` bytes; SHA-256 `DE87D060A4881FC03AEC06E3C9646418A633A5C898A27E30BA1713693C832C8D`.
  - `work/team-profile-preview-current-status-focus.png` — persistent Current Moveset region with explicit cyan focus while the child live-status exposes the read error; `47009` bytes; SHA-256 `B3F30DFC9E229953580543FBE1D7A2761B0FEE419C8F6E15357FA5F83C41E20B`.
  - `work/team-profile-preview-scroll.png` — constrained-height proof; `34915` bytes; SHA-256 `552C8EEA40290BBD31D6B78E95CDEEFEF253411B75283ED3D7B7F23DA9DE2A8E`.
- Browser metrics: normal root/body `476/476` and `466/466`; narrow root/body `336/336` and `326/326`; narrow roster computes to three columns; constrained-height scan finds exactly one overflowing `auto|scroll` owner: `.pokeidle-panel__body.ppbui-scroll`.
- First independent TECH gate: `TECH NOT READY`, P2 cross-module cleanup ownership; corrected before refreeze.
- Corrective TECH re-gate on exact `944768`-byte / `15721E23...C483077` artifact: **TECH READY**, `P0=0 P1=0 P2=0 P3=0`; reviewer reran `89/89` focused relevant checks and verified exact artifact traceability.
- First independent UX gate: `UX NOT READY`, P1 async focus/live-status continuity; corrected before refreeze.
- Corrective UX/A11y re-gate on the same exact artifact: **UX READY**, `P0=0 P1=0 P2=0 P3=0`; reviewer independently reran the full `394/394` suite and matched the updated Current-focus evidence hash.
- Independent render-first Visual gate on the same exact artifact/evidence set: **VISUAL READY**, `P0=0 P1=0 P2=0 P3=0`; reviewer verified all eight render hashes and the dossier hierarchy, 6×1/3×2 geometry, narrow wrapping, explicit empty/error/focus states, square Miyazaki16 seams and single Team-body scroll ownership.
- Exact artifact/version/hash independently reviewed: **PASS** — TECH, UX/A11y and Visual reviews all target Better UI `0.2.63`, `944768` bytes, SHA-256 `15721E23B8B7EC82C890F26700818197D254ECCEA2E32658C9C58B7D6C483077`.
- Product Owner live validation: pending; local gates do not substitute for it.

## PM decision

`LOCAL ACCEPTED — TECH READY + UX READY + VISUAL READY, all P0–P3 = 0, on one exact artifact. Next gate is Product Owner live validation only; no live promotion or Git history is authorized.`

## 2026-09-23 usability/readability corrective pass — Better UI 0.2.64

Product Owner feedback after opening the dossier: **the information is sufficient, but
the screen does not deliver good reading or layout**. The corrective pass deliberately
does not add facts or gameplay behavior.

Observable layout changes:

- normal auto-fit Team width: 480px → 560px; 340px minimum unchanged;
- roster attached to the dossier with a major divider instead of floating above it;
- normal identity portrait: 96px → 104px, with stronger 18px subject heading;
- native member actions grouped into one framed contextual toolbar;
- Current Moveset remains the primary data block and its ordered move cells grow to
  36px with larger internal spacing;
- Saved Movesets are flattened to editorial rows with 1px separators, two-column
  identity/moves composition at normal width and one-column fallback <=419px;
- participating Saved Teams are flattened into lighter context rows;
- legacy-order warnings wrap on their own row so team identity cannot disappear;
- collapsed full Saved Teams manager remains the maintenance-only footer.

Pre-freeze evidence:

- work/team-profile-ux2-560.png;
- work/team-profile-ux2-340.png;
- work/team-profile-ux2-empty.png;
- work/team-profile-ux2-error.png.

The initial visual pre-gate was **VISUAL READY, P0=P1=P2=P3=0**. UX pre-gate found one
P1 in the first 560px render: a long legacy-order warning could collapse the Saved
Team name to zero width. The row now reserves name space and moves the warning to its
own wrapping line; the blocker-only UX re-gate is **UX READY, P0=P1=P2=P3=0**, and
focused Team-family verification is 50/50 PASS.

Exact 0.2.64 refreeze evidence:

- `dist/pokepixel-better-ui.user.js`: `945418` bytes, SHA-256
  `217FFDA0122E2E6419ED87E86C771369B7446966F7868B40AE4B5F918D1ACD38`;
- package, lockfile root and userscript metadata: `0.2.64`;
- full suite: `394/394 PASS`;
- build: PASS;
- `git diff --check`: exit `0`, with only the repository's existing LF/CRLF warnings;
- final browser metrics: 560px root/body `556/556` and `546/546`; 340px root/body
  `340/340` and `330/330`; narrow roster computes to three columns; constrained-height
  scan finds exactly one overflowing owner: `.pokeidle-panel__body.ppbui-scroll`.

Final render-first evidence:

- `work/team-profile-0.2.64-560.png` — `54382` bytes — SHA-256 `62F2F923B5C7BCE8A2C21E48E66486CC22A67F3BFEF957E73B4CECE77F2C9F37`;
- `work/team-profile-0.2.64-340.png` — `49755` bytes — SHA-256 `1464818F7F20D3ED8E61316038591FF1338CD8271A886132B4D9BA09884D550E`;
- `work/team-profile-0.2.64-empty.png` — `36016` bytes — SHA-256 `99CC66FD1F1115E280372BD2CC784CE801B0878B59BD94F4DF5223003A698053`;
- `work/team-profile-0.2.64-error.png` — `53232` bytes — SHA-256 `048CAE3C64802E9868BDC19BF6F985896DF354AE7592D5D062111D15A29F5BFD`;
- `work/team-profile-0.2.64-manage-focus.png` — `54425` bytes — SHA-256 `D8D51EC1D8DBE78D2BEA6C29101E698EC1F47A4C11DC2FCD74D0930E9CE074CD`;
- `work/team-profile-0.2.64-roster-focus.png` — `54405` bytes — SHA-256 `6A9312A7CC88E690041825F2397D78A63D5C8C324E48EB1896D92144EA969807`;
- `work/team-profile-0.2.64-current-focus.png` — `53267` bytes — SHA-256 `DDF21C2CF3808701CF1B88BE928A7908B7B696EC452105796C118DFDF9E136D5`;
- `work/team-profile-0.2.64-scroll.png` — `25789` bytes — SHA-256 `E2AF10654AA92DB0C7D486364261FE2297B78C78826706A0D1E03B7306F33514`.

Final exact-artifact independent gates so far:

- **TECH READY — P0=0 P1=0 P2=0 P3=0**. Reviewer independently reverified the artifact,
  reran `66/66` focused Team/team-movesets/team-presets checks and confirmed the corrective
  delta is presentation-only with native ownership, exact-ID semantics, manual ordered moveset
  verification, async isolation, cleanup/reacquisition, resize handoff and one-scroll ownership intact.
- **UX READY — P0=0 P1=0 P2=0 P3=0**. Reviewer inspected all eight final renders, independently
  reran `394/394`, and confirmed hierarchy/readability, 340px behavior, legacy-team wrapping,
  focus-visible, empty/error/Retry, native keyboard semantics and coarse-pointer conventions.
- **VISUAL READY — P0=0 P1=0 P2=0 P3=0**. Reviewer independently verified the exact
  artifact identity and inspected all eight final screenshots render-first: 560/340 hierarchy,
  Legacy Ground name/position/warning separation, explicit focus states, empty/error rhythm and
  constrained-height body clipping all remain coherent with no visual blocker.

### 0.2.64 PM decision

`LOCAL ACCEPTED — TECH READY + UX READY + VISUAL READY, all P0–P3 = 0, on Better UI 0.2.64
945418 bytes / SHA-256 217FFDA0122E2E6419ED87E86C771369B7446966F7868B40AE4B5F918D1ACD38.
The 0.2.64 delivery is prepared for Product Owner live validation only.`

Promotion and Git history remain separate gates.
