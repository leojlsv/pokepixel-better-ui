# Team / Team HUD — Battle Line / Management

Status: **Team is restored as the normal formation-management surface. The 0.2.63/0.2.64
Full-Team dossier experiment is historical and superseded. Pokémon dossier content now belongs
to the independent `Pokémon Profile` surface; Team HUD/Add Pokémon/Shared Stone/Saved Team HUD
contracts remain authoritative.**
Direction: **Battle Line / Field Command**
Product Owner approval: **2026-09-14**
Migration classification: **redesign**
Validation status: **historical functional/Battle Line behavior remains validated, but the
latest white/warm visual candidate was rejected by the Product Owner on 2026-09-16.
The Product Owner subsequently approved the corrected charcoal-dominant Miyazaki 16
color distribution and, after the corrective candidate, explicitly declared
**“Estrutura validada.”** The current Team/Add Pokémon composition is therefore closed.
The open pass is visual polish/correction only: Saved Team identity extraction excludes Shared
Stone/status art; Shared Stone counts grow intrinsically without changing the six-slot structure;
Add Pokémon Search defeats hostile rounded host chrome; the actual picker scrollbar uses scoped
Miyazaki colors; and Team/Picker/HUD consume MASTER's square Element primitive with a canonical
edge plus darker tinted well so native artwork remains distinct. Native candidate nodes/actions/
order and the validated `Search | Element | Rarity | Clear` rail stay unchanged.**

**Current visual authority — 2026-10-01:** the Product Owner now requires Better UI to
blend into the current PokéPixel as part of the game. Any older instruction on this page
that prescribes Miyazaki 16 neutral chrome, mandatory square controls, 0px radii, 2px
structural borders or pixel-depth shadows is historical. Preserve the validated Team
behavior/information structure, but use current MASTER/native visual grammar for chrome.

This page defines the approved visual family for the full Team window, persistent
Team HUD and Team Presets. It specializes `../MASTER.md` for this module family.
The current validated runtime and frozen functional contracts remain authoritative
for behavior not explicitly changed by this approval.

## 2026-09-23 final Product Owner override — Team restored, dossier is dedicated

The final direction supersedes the earlier same-day Full-Team dossier override below:

- **Team window = manage formation.** Keep the native six-member roster, Vitals/Stats,
  official order, active state, Details/Remove and other native Team actions readable and intact.
- **Pokémon Profile = inspect one owned Pokémon.** Identity, ordered Current Moves, Saved
  Movesets and Saved Teams participation live in their own independent window/menu.
- Team does not host the dossier chapters and does not become the navigation shell for Profile.
- The Profile selector reads exact owned instances from Team + Backpack and uses exact
  `creatureId` semantics.
- Pokémon Profile **Configurar moves** delegates that exact `creatureId` to the game's
  existing `PokeIdle.MovesetConfig.open(...)` editor. Profile must not render or persist
  a parallel four-move editor; Saved Movesets remain a separate Better UI preset layer
  over the native authoritative moveset contract.
- Contextual Pokémon hover may lead into the dedicated Profile, but must not take ownership of
  unrelated Trade/NPC surfaces.
- The prior 0.2.64 dossier render/hash records remain historical evidence only and must not be
  treated as the current product layout.

Dedicated Profile design/runtime contract: `docs/modules/pokemon-profile.md`.

## Historical 2026-09-23 override — Full Team as Pokémon dossier (superseded)

The Product Owner explicitly reopened the **full Team window** information hierarchy:
the selected Pokémon is now the page subject and Team must behave as a well-developed
Pokémon profile/dossier. This override supersedes older full-Team wording below that
describes the Battle Line as the strongest repeated visual family or the previous
selected-member composition as closed. It does **not** reopen Team HUD, Team gameplay,
Saved Team persistence, native actions or Add Pokémon behavior.

For the full Team window the authoritative top-to-bottom composition is now:

1. **Roster navigator** — the six original native Team slots remain visible and fully
   interactive, but serve primarily as compact navigation between Pokémon dossiers.
2. **Selected Pokémon dossier** — identity/portrait and authoritative native facts are
   the dominant subject.
3. **Native command dock** — official Battle position/order, Activate/Active, Details
   and Remove stay attached to that Pokémon and preserve their original nodes/handlers.
4. **Current Moveset** — a first-class read-only view of the native authoritative
   ordered moveset, with the original native Moveset editor action retained.
5. **Saved Movesets** — exact-creature `M#` presets and their existing Apply/Update/
   Delete/Save-current behavior.
6. **Saved Teams containing this Pokémon** — a read-only projection of canonical
   Team Presets v2 filtered by exact creature id. It shows saved formation context and
   links to management; it is not another persistence or editing surface.
7. **Full Saved Teams manager** — remains below the dossier as the progressive-
   disclosure maintenance surface for all formations.

The full-Team visual priority is therefore **selected Pokémon identity + Current
Moveset → native commands → Saved Movesets → participating Saved Teams → roster
navigation → collapsed global Saved Teams manager**. The old instruction that the
Battle Line must dominate the full Team window is historical for this surface.

Only facts already available from authoritative runtime/native state may be shown.
Do not fabricate Ability, held Item, base stats or other profile data for visual
completeness. Native Vitals/Attributes remain hidden unless a later Product Owner
decision explicitly reopens them.

The roster keeps selected-gold, active-green, fainted-danger, position and focus-
cyan semantics, but avoids becoming a second telemetry dashboard. Normal width keeps
the six slots in one row; the established narrow layout may use `3×2`. The Team body
remains the single vertical scroll owner.

### 2026-09-23 readability/layout corrective override

The first dossier proved the right information but remained too compressed and too
uniform visually. For the Full Team window, the normal auto-fit width is therefore
**560px** rather than 480px; the minimum supported width stays 340px and manual-resize
ownership remains native.

The page must not read as stacked equal-weight cards:

- **Identity hero** is the primary subject anchor, using the larger normal portrait and
  stronger Pokémon-name hierarchy.
- **Native commands** form one bounded contextual toolbar directly tied to the subject;
  they are actions, not another content chapter.
- **Current Moveset** is the strongest data surface: 2px major edge, bg-2, stable
  2x2 move grid and larger move cells.
- **Saved Movesets** are an editorial list. Presets use light 1px separators, transparent
  row backgrounds by default, compact identity on the left and move comparison on the
  right; only the exact-current row earns semantic success emphasis.
- **Saved Teams containing the Pokémon** are still lighter read-only context rows,
  not cards. Team name must never collapse behind saved position/Active/order-warning
  metadata. A legacy-order warning owns its own wrapping line.
- **Global Saved Teams manager** remains collapsed and visually subordinate.

At <=419px, saved/context rows stack to one column without changing semantic order.
This override changes presentation density only; storage, exact-creature identity,
native handlers, async ownership, refresh/cleanup and scroll contracts remain unchanged.

Master-style migration note (2026-09-16): the Product Owner explicitly rejected the
intermediate light/warm master, later rejected the Sweetie 16 color distribution in live
inspection, and selected official Miyazaki 16 as the project-wide palette. Any older
Team-specific color prescription below is subordinate to MASTER's Miyazaki 16 role
tokens. The shared 28px control geometry, approved monospace,
Team-specific information hierarchy, state semantics and screenshot-backed composition
corrections remain authoritative.

`Battle Line` is the design concept name. Runtime labels remain the game's
localized Team/formation labels; the redesign must not rename native product
surfaces merely to expose the concept name.

## Review provenance

This direction follows `.skills/ui_ux_pro.md` and `.skills/pixel_art_direction.md`
using the project-native fallback already documented in MASTER. The referenced
`references/quick-reference.md` and `references/pro-rules.md` resources are not
present in this repository, so no unexecuted external checklist/search result is
claimed. The delivery review therefore uses MASTER, this approved override,
accessibility/focus, responsive fit, lifecycle, regression and CSS-ownership gates.

## Design intent

**Team is the player's battle formation: six Pokémon form one readable line, the
selected member becomes the command workspace, and the HUD echoes the same state in
the smallest useful field view.**

The surfaces have different jobs:

1. **Team window — manage.** Read official order, select a member, inspect state,
   change order/active member, add/remove Pokémon and maintain saved formations.
2. **Team HUD — monitor.** Read trainer resources, active Pokémon and the six-member
   team at a glance while playing; direct card activation remains native.
3. **Team Presets — recall.** Quickly apply a verified saved formation from the HUD;
   full rename/member-order/active/delete maintenance stays in the Team window.

The redesign must make **official battle position**, **selected member** and
**active/Hunt Pokémon** visually distinct. These are different states and must not
collapse into one color or one marker.

## Non-visual constraints

The following behavior is frozen unless the Product Owner separately changes the
functional contract.

### Team window

- Preserve all six original `.team-slot` nodes, their order, selection behavior,
  empty-slot behavior and original handlers.
- Preserve official battle order from the native Team state. Active/Hunt Pokémon is
  independent from position 1.
- Preserve the native Battle-order controls and their disabled rules. Better UI may
  move them reversibly but must not recreate their gameplay behavior.
- Preserve the native active-state action, Details and Remove controls, including
  their nodes, listeners, disabled states and native explanations.
- Preserve the already validated removal of Compare with Active. The redesign must
  not restore comparison UI or comparison stat reads.
- Preserve Team member level/HP information and the explicit fainted state, but do
  not require the previous multi-row/full-width metadata box. Full Team roster slots
  may use a richer split-facts presentation than the HUD when width permits.
- Preserve Add Pokémon through the native picker/cards/actions. Better UI search,
  Element, Rarity and Clear operate only on already-loaded native candidates.
- Do not alter Team capacity, eligibility, composition rules, leader rules,
  calculations, network calls or game permissions.

### Team HUD

- Preserve trainer information, map/location context, stamina, active Pokémon,
  collapse/minimize behavior and native Team-card interactions.
- Preserve original compact Team card nodes. Keyboard Enter/Space may continue to
  forward one explicit click only where the existing module already permits it.
- Preserve HP, current-level EXP and stamina values sourced from the authoritative
  HUD/runtime state. Trainer/active-Pokémon numeric values remain visible where
  exposed. Per Product Owner correction at 20:20, compact live-member cards prioritize
  **position + sprite + visible Level**; HP remains a thin vitality rail instead of
  competing as repeated percentage text.
  Active/Fainted remain structural/accessibility states rather than text banners.
- Preserve fainted/disabled safeguards; a fainted card must not become activatable
  through Better UI keyboard handling.
- Do not change Team state, leader, combat, game calls or HUD gameplay behavior.

### Team Presets

- Preserve the canonical v2 model: composition, official `member_ids[]` order and
  active `leader_id` are independent pieces of state.
- Preserve `ppbui:team-presets:v2`, v1 migration and `orderVerified` safeguards.
- Preserve manual Apply only; no hunt/combat/background/scheduled switching.
- Preserve native Team API methods/events and final-state verification used by
  Apply. Do not replace them with a custom HTTP/WebSocket flow or simulated UI
  clicking.
- Preserve the HUD as quick access and the Team window as the maintenance surface.
- Remove saved-preset list ↑/↓ ordering from the HUD. Product Owner approval on
  2026-09-14 resolves the prior runtime/documentation mismatch in favor of keeping
  preset-list ordering exclusively in the full Team manager.
- Preserve the native confirmation dialog for destructive preset deletion.
- Preserve current performance safeguards: stable HUD sync must not repeatedly
  resolve/serialize sprites or rebuild unchanged previews.
- Manual preset authoring belongs only in the full Team manager. It may read native
  Backpack inventory and write the existing Saved Team storage, but it must not equip,
  remove, reorder or change the leader of the live Team while composing. `Apply` remains
  the only path that mutates native Team composition/order/active state.

### Lifecycle and architecture

- Use the centralized Better UI observer/reconciler; add no per-feature
  MutationObserver or polling loop.
- Preserve the native Team `.pokeidle-panel__body` node identity. Team scene lookup
  binds `scene._panel.body` to that exact node; replacing the body can sever the
  native scene/runtime association even if equivalent markup is recreated.
- Team, Team HUD and Team Presets remain independently toggleable modules. The
  visual redesign may coordinate their language, but each surface must remain
  correct when either sibling enhancement is disabled.
- Reconciliation must remain idempotent and stable passes mutation-free where the
  existing contract guarantees it.
- Native nodes that carry handlers/private state are moved, styled or wrapped
  reversibly rather than cloned for appearance.
- Cleanup restores the latest legitimate native state and does not resurrect stale
  Team/HUD nodes.
- No network interception, gameplay automation or game-global monkey patch is
  introduced by the redesign.

## Information architecture

### Full Team window

The Team window should read top-to-bottom as one command surface:

1. **Team shell** — Better UI window context and title chrome.
2. **Battle Line** — six official positions, always the strongest repeated visual
   family in the window.
3. **Selected Member workspace** — identity and state for the currently selected
   Pokémon.
4. **Command rail** — Battle order, active-state action, Details and Remove attached
   to the selected member context.
5. **Saved Formations** — progressive-disclosure maintenance area after the live
   Team, visually secondary to the current formation.

The Add Pokémon picker remains a separate native workflow. Its Better UI toolbar is
treated as a compact discovery rail above the native candidate grid.

### Team HUD

The persistent HUD is a field-status surface:

1. **Trainer strip** — trainer identity/resources, visually quiet.
2. **Active Pokémon** — strongest single state block, with readable HP/EXP.
3. **Compact Battle Line** — six Team members using the same position/state language
   as the full Team window at reduced density.
4. **Saved formations disclosure** — collapsed by default; Apply is discoverable
   after expansion, maintenance remains in Team.

Do not add full stats, Battle-order editing, rename/delete, comparison or a second
detail inspector to the HUD.

## State language

Three states require separate cues:

- **Battle position:** persistent numeric `1..6`, neutral/tabular metadata.
- **Selected in Team window:** Better UI gold structural edge/surface.
- **Active/Hunt Pokémon:** gameplay/status cue using the existing verified active
  semantic. In the full Team workspace, the localized Active/Ativo action/status
  remains explicit. In the compact HUD Battle Line, do not render a full-width
  Active label; use the native leader state plus a structural edge/rail and retain
  the explicit state in accessible text/title.
- **Keyboard focus:** independent 2px cyan focus outline over every other state.
- **Fainted:** shared danger structural state plus reduced vitality treatment, with
  `Derrotado`/Fainted retained in accessible state text; never opacity alone.

Selected and Active may coexist on the same Pokémon and must remain distinguishable.

## Component inventory and migration classification

| Component family | Classification | Direction |
| --- | --- | --- |
| Team window shell/title chrome | **REDESIGN** | Adopt MASTER surfaces, square geometry and scoped window ownership |
| Native Close/title action | **REFINE** | Preserve native handler; compact Better UI title action |
| Six-slot Team roster | **REDESIGN** | One Battle Line with explicit positions and stable selection/state grammar |
| Original Team slot nodes/actions | **MATCH behavior / REDESIGN chrome** | Keep exact nodes/handlers; restyle only inside Team ownership |
| Pokémon sprites | **MATCH** | Preserve domain sprites and pixel rendering |
| Position marker | **REFINE** | Neutral `1..6` marker, always readable and distinct from active/selected |
| Level + HP slot facts | **REFINE** | Full Team may show split tabular Level/HP facts; HUD shows Level as the primary compact fact and reduces HP to the vitality rail |
| Empty Team slots | **REFINE** | Clear add affordance without looking like a disabled occupied slot |
| Selected-member identity/profile | **REDESIGN** | Main command workspace below Battle Line |
| Active-state control | **REFINE** | Native action; explicit active state and primary action only when actionable |
| Battle-order arrows/label | **REFINE** | Attached utility control, native disabled rules intact |
| Details action | **REFINE** | Secondary action in member command rail |
| Remove action | **REFINE** | Danger action with spatial separation and native disabled semantics |
| Vitals section | **REMOVE** | Product Owner removed the selected-member HP/EXP rows from Better UI; preserve the native node only for cleanup/reversibility |
| Attributes section | **REMOVE** | Product Owner removed Attack/Defense/SpA/SpD/Speed from the Better UI Team presentation; preserve the native node only for reversibility |
| Add Pokémon picker toolbar | **REDESIGN** | One compact Search / Element / Rarity / Clear rail using Better UI fields |
| Native Add Pokémon cards/actions | **REFINE** | Preserve actions/data; harmonize visual state only within picker scope |
| Team HUD shell | **REDESIGN** | Compact field panel using MASTER hierarchy without growing gameplay footprint unnecessarily |
| Trainer EXP / stamina rows | **REFINE** | Keep exact values; use shared label-beside-bar meter rows; hide the native stamina warning note only while enhanced |
| Active Pokémon HUD block | **REDESIGN** | Strongest HUD block; sprite/name/level + HP/EXP state hierarchy |
| Compact HUD Team cards | **REDESIGN** | HUD micro-slot: position + centered sprite + compact Level + thin HP rail; no repeated HP% sentence |
| HUD native card activation | **MATCH** | Keep native click/keyboard forwarding contract |
| HUD saved-formations disclosure | **REDESIGN** | Flat attached rail, collapsed by default |
| HUD preset preview row | **REDESIGN** | Six stable identity/order tokens in official order; no live HP telemetry; Apply remains clear, management subordinate |
| HUD preset-list ↑/↓ ordering | **REMOVE** | Product Owner approved removing this maintenance from HUD; preset ordering remains in the full Team manager |
| Preset manager disclosure | **REDESIGN** | Better UI progressive disclosure after live roster |
| Preset cards | **REDESIGN** | Square formation cards with clearer hierarchy and no native rounded-card carryover |
| Preset member cells | **REDESIGN** | Six crisp identity/order tokens, explicit position and active state; no live combat telemetry |
| Preset maintenance icon actions | **REFINE** | Shared PPBUI actions; member-level left/right, preset-level reorder and destructive Delete use the standard 28px desktop icon target; hide preset-order controls when only one preset exists |
| Preset Apply | **REFINE** | Clear primary action for a verified preset |
| Preset Update / Confirm order | **REFINE** | Secondary / warning-resolution actions according to state |
| Preset Delete | **REFINE** | Danger action; native confirmation remains authoritative |
| Rounded native-style preset cards | **REMOVE** | Superseded by square MASTER geometry for this redesign |
| Host `--ui-*` visual dependencies in Team-owned additions | **REMOVE** | Migrate owned chrome to `--ppbui-*` tokens |
| Comparison UI | **REMOVE** | Already removed and remains outside the contract |
| Bespoke raster frame/icon set | **ASSET NEEDED: NO** | Domain sprites provide identity; DOM/CSS is sufficient |

## Art direction

Battle Line uses MASTER's **modern dense pixel-RPG** grammar with the feel of a
compact party/formation command screen.

- Canvas/deep wells: `--ppbui-bg-0`.
- Team/HUD primary shell: charcoal `--ppbui-bg-1`; stone/weathered belongs to edges and transient neutral interaction, not a large pastel fill.
- Battle Line and selected-member support surfaces: `--ppbui-bg-2`.
- Hover/selected/current control surfaces: `--ppbui-bg-3`.
- Major shell/section boundaries remain 2px; dense controls and internal separators use 1px so
  command rows do not feel overframed. Keyboard focus remains independently visible at 2px.
- Default corners: square. No rounded preset cards or pill navigation.
- One hard 2px elevation for a major shell/raised surface where needed; avoid a
  shadow around every member tile.
- Gold = Better UI selected/current semantic.
- Blue/cyan = action emphasis and keyboard focus; persistent selection does not use blue.
- HP, EXP, element, rarity and other game data keep their verified domain colors.
- Active Pokémon may use success/green as a status cue, never as a replacement for
  the selected state or the position number; do not use a green glow.
- Pokémon sprites remain the brightest/clearest repeated visual anchors.
- Better UI-owned labels and metadata follow MASTER's current type scale; do not
  carry the historical 7–9px preset text into redesigned surfaces. Use the shared
  metadata token rather than a Team-specific font-size floor.
- Ornament stays low. No decorative gradients, scanlines, faux metal/leather,
  glowing frames or raster command-console background.

## Component + state treatment

### Full Team Battle Line

- Six equal position cells remain spatially stable.
- Position number sits in a consistent corner/edge and uses tabular numerals.
- Sprite is the dominant object. Full Team has more room than the HUD and therefore
  uses a medium roster slot with Level and HP as separate compact facts instead of a
  compound sentence. Near the 340px minimum the six positions may become an ordered
  `3×2` roster so those facts remain readable; this exception is Full Team-only.
- **Default:** `bg-2`, 2px neutral edge.
- **Hover:** `bg-3`, stronger neutral edge.
- **Pressed:** inset/depth shift without scale animation.
- **Selected:** gold structural edge/surface cue.
- **Active:** explicit active indicator/status cue independent from Selected.
- **Selected + Active:** both cues remain visible simultaneously.
- **Focus-visible:** independent 2px cyan outline.
- **Fainted:** shared danger structural edge + drained HP treatment; the state remains
  explicit in accessibility metadata without adding another visible badge to the slot.
- **Empty:** recessed add cell with clear native add affordance; no false Pokémon
  metadata.

### Selected Member workspace

The selected member section should behave as one workspace, not a stack of equally
elevated cards.

- Identity/sprite/name/level lead the section.
- Active/Fainted status appears beside identity rather than in a detached banner.
- Command rail sits directly under or beside identity according to available width.
- The selected-member Vitals HP/EXP rows are not displayed by Better UI. The native
  Vitals node remains intact for cleanup/reversibility, matching the treatment of
  the hidden Attributes node.
- If native data is unavailable, retain the native omission/placeholder behavior;
  do not infer stats.

### Command rail

- The selected-member profile and commands are one inspector/workspace. Do not add a
  second heavy bordered control box beneath the identity block.
- Battle order is compressed to `#N` plus the native arrows. At normal Team-window width,
  `#N` + arrows + Active/status + Details + Remove occupy one attached command row.
- At constrained width, the action dock may wrap while retaining action order and
  hierarchy. The order utility remains visually subordinate to the commands.
- `Tornar ativo` is the primary action only when it is an available state-changing
  action. In that state it receives the shared PPBUI dark-surface + blue/cyan action primary
  treatment. When already active, the same native node reads as a compact green status with
  the same square button geometry/depth, not as another primary command competing with
  Details/Remove.
- Details is secondary.
- Details stays adjacent to activation as the secondary member command. Remove is danger
  and receives a clear spatial break from that primary/secondary cluster.
- Do not stretch every command to the same width merely to fill the row. At comfortable
  width activation/status and Details remain grouped while Remove is pushed to the far edge
  of the same dock; constrained widths stack by tier without changing semantic order.
- Native disabled states stay readable and suppress hover elevation.
- Pointer targets follow MASTER's 28px desktop baseline for Better UI-owned chrome;
  coarse-pointer contexts move important targets toward 40–44px.

### Add Pokémon picker

Toolbar order:

**Search | Element | Rarity | Clear**

- One attached discovery rail above native candidates.
- Search gets the flexible track.
- Selects use Better UI square field chrome; OS/browser popup remains native.
- Clear disables when there is no Better UI filter state if the implementation can
  determine that without changing semantics.
- No-results feedback is text-first and occupies no permanent card when empty.
- Candidate cards keep their original action nodes and game eligibility.
- Preserve native candidate-card order. The current filter contract maps loaded
  `_available[]` entries to native picker cards by index; visual reordering requires
  a separately verified stable-identity mapping before it can be safe.

### Team HUD

The HUD must remain faster to parse than the Team window.

- Trainer/resource information is compact and quiet. `EXP` and `STA` sit directly
  beside their bars through the shared PPBUI meter-row primitive; the native stamina
  warning sentence is hidden only inside enhanced Team HUD ownership.
- Native trainer bars originally span `grid-column: 1 / -1`; after moving them into
  the shared meter row, Better UI explicitly releases that placement so `EXP | bar`
  and `STA | bar` remain horizontal rather than stacking again.
- Active Pokémon receives the strongest single HUD treatment.
- The six compact members read as one attached Battle Line rather than six unrelated
  mini-cards. Normal desktop HUD remains `6×1`; only materially narrower containers
  may wrap. The HUD uses its own micro-slot proportions instead of shrinking the Full
  Team roster slot.
- Member position `1..6` remains visible across every supported HUD layout. The
  micro-slot contains position + centered sprite + compact visible `Lv.N` + a thin HP
  rail. The repeated HP percentage is removed from the slot because the Product Owner
  explicitly ranked Level above HP for this surface. Exact HP remains in native/runtime
  state and the vitality rail; Active/Fainted remain structural and available in
  ARIA/title; member EXP remains omitted.
- Active-Pokémon HP/EXP bars and trainer EXP/STA stay hard-edged. Normal values remain
  exact in visible text; large values may use compact `K/M/B/T` notation to protect the
  fixed meter geometry, with the exact value preserved in the same bar's title/ARIA.
- HUD collapse/minimize must remove Better UI preset content from layout exactly as
  the current contract requires.
- No new action buttons are layered over Pokémon cards.

### HUD saved formations

- Collapsed by default.
- Header reads as one integrated disclosure toolbar with saved count and the single
  section-level Manage action separated by one internal divider, not two adjacent
  boxed buttons.
- Expanded rows show preset name/count + six official-order identity tokens + one
  clear **shared primary Apply** action for verified presets. Primary means light PPBUI
  surface + blue/cyan action edge/text, not a solid fill. Do not duplicate Manage on every row
  or give Manage the same visual weight as Apply.
- The preview always preserves a six-position skeleton, including empty positions for
  partial formations. Tokens contain position + sprite/fallback + structural active
  cue. They do not inject live HP, fainted state or HP meters into a saved snapshot.
- Rename, member-order editing, member active selection, Update and Delete remain
  Team-window maintenance tasks.
- Saved-preset list ↑/↓ ordering is removed from the HUD by Product Owner approval.
  Ordering remains available in the full Team manager, keeping the HUD focused on
  Save current, preview, Apply and Manage.
- Unverified legacy order exposes a warning/review state and blocks Apply exactly as
  today.

### Preset manager

- Keep progressive disclosure below the live Team.
- `Create team` is a secondary authoring entry for assembling a Saved Team from the
  current Backpack. It coexists with `Save current`; it does not replace that shortcut or
  move composition editing into the Team HUD.
- The composer exposes name, six ordered selection slots, selected-member reorder/active/
  remove controls, Search/Element/Rarity/Clear discovery controls and a bounded Backpack
  candidate list. Copy must state that saving the composition leaves the current Team
  unchanged until Apply.
- At the 340px Team minimum, preserve six authored positions and control readability by
  wrapping filters/actions and using a vertical bounded candidate list rather than
  horizontal scrolling or shrinking metadata below MASTER.
- Formation composition is visually dominant inside every preset card.
- Preset name and high-level actions occupy the header. The editable name always has
  a persistent visible label; do not rely on the input value/placeholder as its only
  affordance. Preset reorder controls are shown only when multiple presets make ordering
  meaningful, and Delete is spatially separated as danger. Shared `.ppbui-button`,
  `.ppbui-action-row` and icon-button primitives own common geometry; module CSS must
  not blanket-restyle every button again.
- Six identity tokens remain a stable position skeleton in saved official order,
  including empty positions for partial formations.
- Member tokens share Position/Selected/Active/Focus semantics with the live surfaces
  but intentionally omit live HP/Fainted telemetry because a preset is a saved
  composition, not a combat monitor.
- Selected member maintenance controls attach to the chosen member and remain
  subordinate to the six-member formation. The selected tile itself is the visible
  selection cue; do not repeat `Selected: Pokémon · N/6` as another text tier. Use
  standard 28px left / Set active-or-Active / right controls at the left of the footer.
  `Set active` is primary only while actionable; when the chosen member is already current,
  the same control reads `Active` as status instead of a disabled-looking command.
  `Update saved team` and Apply occupy the same footer command row to the right of the
  member controls at normal width; responsive layouts may wrap the action group rather
  than shrinking targets or truncating labels.
- Apply is the clearest footer action when the preset is verified.
- `Update saved team` and Confirm order are contextual secondary/resolution actions;
  the update label must make clear that the saved snapshot will be overwritten.
- Delete is danger, still confirmed through the native game dialog.
- Apply/Update own their pending state: conflicting manager controls are disabled while
  the operation is running, the triggering action exposes busy state, and pending/success/
  error feedback appears inside the affected preset card rather than only at manager level.
- Rename validation/failure is also reported next to the affected preset instead of
  silently reverting the input.
- Do not preserve historical rounded corners simply because the old implementation
  once matched native Team styling; this migration intentionally adopts MASTER.
- Replace historical UI glyphs such as `⚙`, `▶` and `★` with localized text,
  CSS-owned directional affordances or a separately approved local pixel icon. The
  proposed implementation requires no new raster icon family.

## DOM/CSS vs asset plan

This redesign is **DOM/CSS first**.

Use DOM/CSS for:

- Team and HUD ownership hooks/surfaces;
- Battle Line layout and position/state markers;
- selected-member composition and command rail;
- Better UI field/button/disclosure states;
- reversible suppression of native selected-member Vitals and combat Attributes;
- Add Pokémon filter rail;
- HUD trainer/active/team hierarchy;
- saved-formations disclosure, preset cards and maintenance controls;
- pixel scrollbars owned by Team/Presets when required;
- responsive wrapping, focus and reduced-motion behavior.

Reuse native/domain visual assets for:

- Pokémon sprites;
- element/rarity/gameplay icons already supplied by the game;
- HP/EXP/other domain-semantic colors.

`ASSET NEEDED`: **none for the proposed implementation**.

## Responsive and accessibility constraints

### Full Team window

- Preserve **340px as the current proven functional minimum and redesign target**.
  Implementation must demonstrate that the six-slot Battle Line, MASTER's 10px
  metadata role and supported localized command labels remain usable at 340px.
  Increase the minimum only if concrete layout evidence shows the approved
  composition cannot fit without harming the primary workflow; any material geometry
  change remains subject to Product Owner review.
- Prefer flexible tracks and wrapping before increasing the minimum width.
- Six-member formation identity must remain intact at the minimum width; do not
  horizontally scroll the primary live Team merely to preserve decoration. Full Team
  may switch its richer roster from `6×1` to ordered `3×2` near the minimum width.
- Command controls may wrap as clusters, but their reading/order semantics must stay
  stable.
- Saved preset cards fill the available Team manager width; their six saved positions
  form one contiguous strip rather than a narrow inset card. The scoped Team minimum
  remains 340px and the footer may wrap only when that width genuinely requires it.

### Team HUD

- Do not globally enlarge the HUD or game windows.
- Preserve the native collapse/minimize contract and portrait/mobile exception used
  by the existing preset module.
- Use flexible ordered tracks for the six members. Product Owner live validation
  rejected both `2×3` and `3×2` as too dominant at the normal ~320px desktop HUD
  width. The normal desktop composition is therefore one attached `6×1` Battle
  Line; only materially narrower containers may wrap to `3×2`. Position `1..6`, a
  centered sprite, compact Level and a thin HP rail remain required in each live
  micro-slot. Repeated HP% text, member EXP and text banners for Active/Fainted are
  intentionally omitted to control pressure.
- Reduce ornament before hiding required state.
- No required information or action becomes hover-only.

### Keyboard / focus

- Original Team slots/cards keep their native semantics plus existing Better UI
  keyboard enhancement where applicable.
- Every Better UI-owned button/input/select/disclosure requires visible cyan
  focus-visible treatment.
- Focus remains distinguishable from Selected gold and Active status cues.
- Reconciliation must not focus detached nodes or reset focus on stable refreshes.
- Preset destructive confirmation returns focus to the initiating control when it
  remains connected.

### Localization

- Keep existing Team/Team HUD/Team Presets locales and native localized labels.
- Do not shrink primary text below MASTER to fit translations; wrap command groups
  before making labels unreadable.
- Position/level/HP/EXP/count numerals use tabular alignment where useful.

### Motion

- 80–140ms state feedback only where it clarifies hover/pressed/disclosure changes.
- No ambient animation on sprites, HP bars or Team slots.
- Pressed state uses hard depth/inset treatment instead of scale.
- `prefers-reduced-motion: reduce` removes non-essential transitions.

## Implementation brief

After explicit Product Owner approval, engineering should:

1. Add scoped Team/Team HUD ownership hooks and migrate owned appearance to
   `--ppbui-*` tokens without globally restyling host Team classes.
2. Preserve all current native Team nodes/handlers/API contracts and exact cleanup.
   In particular, do not replace the native Team panel body used as the scene
   identity anchor.
3. Recompose the six native Team slots into the Battle Line presentation without
   cloning or replacing their action nodes.
4. Expose official position separately from Selected and Active state; test every
   combination including Selected + Active and Fainted.
5. Restyle the selected-member profile as one workspace, suppress both native Vitals
   and combat Attributes from Better UI presentation without deleting or rewriting
   either native node, and keep Level/HP only in the compact roster metadata.
6. Keep native Battle-order, active, Details and Remove nodes in the existing
   reversible profile-control strategy; migrate their chrome/states to MASTER.
7. Migrate Add Pokémon Search/Element/Rarity/Clear to Better UI fields and keep the
   already-loaded-only filtering contract and native candidate order.
   Its owned picker root uses MASTER's shared `ppbui-scroll-scope`, while native Element
   lists opt into the shared square `ppbui-element-icon` primitive; do not create Team-local
   scrollbar or Element-icon families.
8. Redesign the Team HUD as a compact field-status surface while preserving native
   trainer/active/cards/collapse behavior. Trainer/active exact values remain; compact
   member cards use position + sprite + visible compact Level + thin HP rail, with HP
   exact value and state details retained in native/accessibility metadata.
9. Keep Team HUD presets collapsed by default and retain the quick-Apply/Manage
   responsibility split. Remove preset-list ordering controls from the HUD; ordering
   remains in the full Team manager per Product Owner approval.
10. Redesign preset previews and manager cards with square MASTER geometry while
    preserving composition/order/active identity, migration safeguards, persistence
    and performance behavior.
11. Replace Team-owned `--ui-*` colors and historical native-style rounded corners
    with approved `--ppbui-*` component grammar. Preserve domain colors.
12. Keep stable reconciliation mutation-free and retain the current sprite-resolution
    performance safeguards.
13. Extend regression tests around visual ownership/state combinations, focus,
    lifecycle and cleanup without weakening existing functional tests.
14. Run independent UX/A11y & Design QA plus Independent QA before Product Owner
    handoff.
15. Deliver a userscript build and stop for user-owned in-game validation.

## Design acceptance checks

The approved implementation is ready for independent Design QA only when all are
true:

1. The six-member Battle Line is the strongest repeated visual structure in Team.
2. Official position, Selected, Active and Focus are all distinguishable and can
   coexist without ambiguity.
3. Original Team slots/actions remain the authoritative action nodes.
4. Empty slots retain the native Add Pokémon flow.
5. Selected member identity + command controls read as one workspace.
6. Battle-order controls preserve exact native state/order semantics.
7. Active-state action preserves leader rules and never implies position 1 equals
   active.
8. Details/Remove preserve native handlers and disabled states; Remove remains
   visually destructive.
9. Compare with Active remains absent.
10. Native selected-member HP/EXP Vitals and combat Attributes are both absent from
    Better UI presentation while their nodes remain intact for cleanup.
11. Add Pokémon filters act only on loaded native cards and preserve add handlers.
12. Team window remains usable at the proven 340px minimum or any separately
    approved replacement minimum, with automated/synthetic evidence covering the
    six-slot line, 10px metadata role and representative localized command labels.
13. Team HUD is faster to scan than Team and does not become a maintenance screen.
14. Trainer EXP/stamina and active-Pokémon HP/EXP remain numerically accurate and
    retain domain-semantic colors; large values may use compact notation visibly while
    preserving the exact value in bar title/ARIA. Live compact member cells show compact Level plus one
    thin HP rail; they do not repeat HP%, member EXP or Active/Fainted text banners.
15. Fainted state remains explicit and cannot be bypassed by keyboard enhancement.
16. HUD native card clicks, empty slots, collapse/minimize and game-owned behavior
    remain unchanged.
17. Official position `1..6` remains visible for every occupied HUD member across
    supported layouts; secondary ornament/metadata yields first under pressure.
18. HUD saved formations stay collapsed by default and verified Apply remains the
    primary expanded action.
19. HUD preset-list ↑/↓ ordering controls are absent; saved-preset ordering remains
    available in the full Team manager.
20. Preset official order and active member stay independent visually and in state.
21. Legacy unverified presets remain blocked from Apply until reviewed/updated.
22. Preset cards use square Better UI geometry; obsolete native-style rounding is
    absent from the redesigned owned surfaces.
23. Better UI-owned Team controls use `--ppbui-*` visual tokens and do not globally
    rewrite host `--ui-*` tokens.
24. Pokémon/domain sprites/colors retain their gameplay meaning.
25. Better UI-owned Team/Presets metadata is not reduced below MASTER's 10px
    metadata role merely to preserve the legacy compact layout.
26. Required controls have complete default/hover/pressed/selected/focus/disabled
    treatment where applicable.
27. No required interaction or information is hover-only.
28. Stable reconciliation does not create repeated DOM/style mutations or sprite
    resolution work.
29. Full native Team/HUD replacement remounts cleanly and cleanup restores the
    current legitimate native state.
30. Team, Team HUD and Team Presets remain usable when their sibling enhancements
    are independently disabled.
31. Native Add Pokémon candidate order is preserved unless a stable identity-based
    filter mapping is implemented and independently verified first.
32. No extra MutationObserver, polling, gameplay automation or network interception
    is introduced.
33. Independent UX/A11y & Design QA and Independent QA both report READY before
    Product Owner handoff.
34. In-game appearance/function remains pending until the Product Owner explicitly
    validates the implemented candidate.

## Product Owner decision record

The current HUD implementation exposes ↑/↓ controls to reorder the saved-preset
list, while the written Team Presets contract says rename/delete/reorder maintenance
is intentionally not duplicated in the HUD. On 2026-09-14 the Product Owner approved
removing those ↑/↓ controls from the HUD and keeping saved-preset ordering in the
full Team manager. The approved HUD responsibility is quick access: Save current,
formation preview, Apply and Manage.

The Product Owner rejected the first four implemented live reviews on 2026-09-14.
The second, third and fourth reviews covered both Team HUD and the full Team window. Live
evidence showed the HUD formation consuming too much visual attention and the full
Team carrying unnecessary vertical weight. After the third rejection, the Product
Owner explicitly removed Pokémon combat Attributes from the Team presentation. The
fifth live candidate was then explicitly marked **not yet validated**, so it must not
be treated as acceptance evidence. That superseded revision kept the normal HUD as one
attached six-slot line and simplified the full Team to Battle Line → selected-member
identity/commands → compact HP/EXP → Saved teams. The current revision removes the
selected-member Vitals rows from Better UI presentation; native Vitals and Attributes
nodes remain intact solely for cleanup and reversibility.

The fourth live review specifically identified the Team HUD as visually incomplete and
the full Team as misaligned with inconsistent typography. The next revision therefore
migrates the entire HUD surface to PPBUI (controls, trainer, active member, formation,
Saved Formations and wallet) and explicitly resets the Team's native slot pedestals,
transforms, rounded portrait/tag chrome, serif selected-name typography and inconsistent
meter/command styling.

After the fifth candidate remained unvalidated, the next narrow refinement moved the
HUD Active state out of the position marker's horizontal space, added explicit stacking
for Active + Fainted coexistence, reduced the selected portrait, aligned native Team
commands as one grid workspace, and compacted the empty Saved teams disclosure. These
changes preserve the 6×1 HUD, 340px Team minimum, native nodes/listeners and exact
HP/EXP/STA visibility.

The Product Owner then explicitly rejected the following live candidate at 18:27. The
screenshot showed three remaining hierarchy defects: the native 680px Team window left a
large empty lower region after the compact content, the selected-member commands were
visually split by an expanding grid track, and the HUD line displayed native leader-first
card order as `1, 4, 3, 2` instead of reading left-to-right as the official Battle Line.
The current revision makes Team content-fit by default with a viewport cap, hands height
control back to the native resize interaction as soon as the resize handle is used, replaces
the expanding command grid with a tight wrapping flex rail, and reorders the same native HUD
card nodes to canonical `member_ids[]` presentation/keyboard order. Cleanup restores the
current native leader-first HUD order; gameplay state and card listeners are unchanged.

The Product Owner then reviewed that candidate at 18:46 and explicitly rejected continuing
with isolated object-by-object fixes. The feedback identified the same style drift across
multiple objects and modules, so the next revision moves common geometry into MASTER/runtime
primitives instead: PPBUI buttons own their display/alignment, repetitive maintenance gets an
explicit compact variant, related actions use one shared action-row grammar, and label|bar
resource rows use one meter-row primitive. Within Team, the compact HUD line is reduced to
position + sprite + HP line (Level/Active/Fainted/member EXP remain accessible/state data),
trainer EXP/STA labels sit beside their bars and the stamina warning is suppressed while
enhanced. Full Team collapses Level/HP to one bottom line and removes selected-member Vitals
from Better UI presentation. Saved Team controls consume those shared primitives rather than
redefining generic button geometry locally. This revision is a new candidate and carries no
Product Owner live approval until separately validated in game.

The next live review at 19:11 rejected that candidate as well. The screenshot confirmed
three remaining systemic defects: trainer `EXP`/`STA` labels still stacked above their
bars because the moved native bars retained `grid-column: 1 / -1`; Team profile buttons
were visually inconsistent and compressed into one uneven rail; and Pokémon mini-cards
used different shell/state behavior across Team HUD, Saved Team and Full Team. The current
revision therefore releases the native trainer-bar grid span, separates button semantics
from size (`--primary`/`--danger` versus explicit `--action`), organizes Full Team order
utilities and commands into distinct rows, and promotes a shared `ppbui-pokemon-card`
shell/state grammar consumed by all three Team-family surfaces. Full Team no longer renders
duplicate visible Active/Fainted badges inside roster cells; those states remain structural
and accessible. This is another new candidate and remains pending Product Owner live
validation.

The 19:34 live review rejected that candidate too, with the explicit assessment that there
was **no meaningful visual advance**. That review supersedes the previous “same shell”
approach: sharing classes is insufficient when each surface still composes the member card
differently. The current revision now gives Team HUD, Full Team and Saved Team the same
visible compact geometry: 60px height, same position marker, same centered sprite well,
same bottom metadata strip, the same thin live-HP meter, and identical Selected/Active/
Fainted/Focus behavior. Saved members with no current live HP keep the same geometry but
omit the unavailable HP datum rather than persisting stale values. The Full Team command
surface also becomes a bordered command bar with a separated order cluster and aligned
standard action controls. HUD Saved Team Manage/Apply and manager Update/Apply now use one
standard action height instead of visibly mismatched compact/action heights. This candidate
was submitted for Product Owner live validation.

The Product Owner then explicitly rejected that 60px candidate at 19:57. The live screenshot
showed that forced geometric parity was itself the wrong abstraction: the normal HUD gives
each of six slots only about one sprite-width of horizontal room, so `Lv.X · HP%` inevitably
truncated and the nested card/meta/meter frames overwhelmed the sprite. The same live-combat
payload also made Saved Team previews noisy even though presets are identity/order snapshots,
while Full Team wasted its wider management surface on HUD-scale slots. The command bar still
read as unrelated controls inside one box and Saved Team exposed competing action tiers.

The replacement contract at that point kept one **semantic/state grammar** but introduced three
role-specific compositions: (1) HUD micro-slots with position + sprite + HP%/thin HP rail and
no visible Level sentence; (2) medium Full Team roster slots with split Level/HP facts and
responsive `6×1`/`3×2` geometry; and (3) Saved Formation identity tokens with position +
sprite + active cue, a stable six-position skeleton and no live HP/Fainted telemetry. The
selected-member controls become an integrated inspector with a quiet order utility row and a
separate action dock. HUD quick recall keeps one section-level Manage and one Apply per preset;
the full manager separates preset-header maintenance, formation identity, member maintenance
and footer actions. That 19:57-response candidate was then superseded by the 20:20 correction below.

The next Product Owner live review at 20:20 corrected two parts of that replacement. First,
the HUD hierarchy had the wrong telemetry priority: **Level is more important than HP** in the
six compact Team slots. The current contract therefore keeps `Lv.N` as the only repeated text
fact and demotes HP to the thin vitality rail; exact HP remains available in the active block
and accessibility/native state. Second, Team-family controls still read as a collection of
misadjusted boxes. The current button pass therefore treats disclosure + Manage as one toolbar,
uses a primary Apply/activation only for the actual state-changing action, renders already-active
as status-like rather than a fake command, and stops stretching every Full Team command to an
equal-width segmented strip. That candidate was rejected at 20:30 because the button chrome
itself still looked wrong.

The 20:30 live review isolates the remaining systemic issue: Team controls were still visually
mixing native/modern button treatment with PPBUI semantics. `Apply` in particular became a solid
yellow rounded-looking block, while Details, Manage, Save current, Active and Remove read as
separate component families. The replacement is now owned by the **shared PPBUI button primitive**,
not Team-local repainting: square geometry, no background gradient/image, no native scale/translate,
700-weight PPBUI typography and hard pixel depth. Primary uses a dark surface with blue/cyan action edge/text,
secondary uses the neutral light surface/strong edge, danger uses red edge/text on the same light
surface, and disabled/status states remain visually distinct. Team modules only assign semantics
and layout; they no longer fill primary buttons gold locally. This revision remains pending
Product Owner live validation.

On 2026-09-16 the Product Owner explicitly rejected the latest Team candidate again and then
supplied screenshot-backed correction details covering HUD numeric pressure/shadow/Apply/Shared
Stone, Full Team Active/Shared Stone/#N/top spacing, and Saved Team field/Apply/footer composition.
The previous automated and independent `READY` verdicts remain evidence only for that rejected
exact candidate. The corrected exact candidate has since completed fresh automated verification,
UX/A11y Design QA and technical QA and is ready for a new Product Owner live-validation pass.

The following Product Owner live pass on 2026-09-17 explicitly closed that structural
gate with **“Estrutura validada.”** Subsequent work must preserve the accepted composition;
only the separately requested shared visual polish is open.

After the later `0.2.6` live rejection exposed five polish regressions, exact corrective candidate
`0.2.7` completed fresh Technical, UX/A11y and render-first Visual Regression review with
`P0=0 P1=0 P2=0 P3=0` in each gate. The local visual verdict is representative synthetic evidence
only. The following Product Owner live pass still exposed two additional polish defects: hidden
Shared Stone placeholders could become visible as empty badges, and Pokémon Tools More Filters kept
the long quality label plus rounded host chrome. The first local correction (`0.2.8`) was itself
blocked by adversarial render-first evidence before handoff; the hardened correction is `0.2.9` and
passed its local gates. Product Owner live validation then exposed a separate legacy-data case:
Saved Teams that already contained a contaminated `member.sprite` continued rendering Shared Stone
instead of Pokémon identity art. `0.2.10` added legacy sprite rejection/recovery but was blocked by
Technical QA because the first path heuristic could falsely reject a genuine Pokémon sprite when
`shared-stone` appeared only in unrelated URL text. `0.2.11` narrows that detection to the actual
asset basename; exact-candidate Technical and local Visual Regression gates both pass with no findings.
The Product Owner subsequently live-validated the Shared Stone behavior. That live pass exposed only
a Saved Team HUD width issue: a full six-member preview stopped before the right edge because a false
vertical overflow could create a real scrollbar. Exact `0.2.12` keeps the outer list genuinely
scrollable when multiple presets exceed its height, but contains decorative overflow inside the
noninteractive six-member preview. Its measured local `6/6` strip has zero left/right gap, equal
tracks, no wrap and no scrollbar; independent Technical and Visual gates close at `P0-P3=0`.
The Product Owner subsequently validated the live `0.2.12` width correction. No Team-family gate remains open.

## Approval boundary

This module override is **approved for implementation** and the current structure has
explicit Product Owner live validation. Shared Stone behavior is explicitly live-validated on
`0.2.11`, and the Saved Team HUD `6/6` width correction is explicitly live-validated on `0.2.12`.
The previously validated Team-family structure remains closed. Exact `0.2.22` reopens only the
new manual Saved Team authoring capability described above; its live approval does not require
revalidating unrelated Team/HUD/Shared Stone surfaces unless a regression is observed.
