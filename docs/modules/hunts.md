# Hunts (Map) — pixel-art pilot, selection and explicit entry

Status: **Hunt Atlas behavior and current project structure are historically/live validated;
the current shared Element-icon polish is pending Product Owner visual validation**. The Product Owner approved the
in-game Hunt Atlas result through `3faa712` on 2026-09-12 with **All green**. That
record remains evidence for the interaction/lifecycle contract, but the 2026-09-16
project-wide Miyazaki 16 migration changes visible chrome and therefore requires a
new live validation cycle.

Historical visual references: `design-system/pokepixel-better-ui/MASTER.md` and
`design-system/pokepixel-better-ui/pages/hunts.md`. Per `AGENTS.md` and
`docs/PROJECT_RULES.md`, these become mandatory visual authority only when the
task expressly includes art direction; native gameplay/functional contracts
remain authoritative in all cases.

## Functional contract

Hunts separates inspection from gameplay. Native map markers remain the source
for zones, but pointer click and keyboard activation select a Hunt and open the
attached Inspector; they do not call `startHunt()`.

Hover/focus no longer opens the floating information tooltip while Better UI is
active. The Inspector exposes the useful data persistently: Hunt name, level,
Elements, exact Weakness/Resistance/Immunity multipliers and Drops with NPC sell
value. The only Better UI gameplay entry is the explicit `Entrar na Hunt` action.

Element/relation rows now consume MASTER's global `ppbui-element-icon` primitive. Hunts
still extracts the raw native/domain image rather than nesting the host's circular wrapper;
the square color well and sizes are therefore identical to Team/Picker/HUD rather than a
Hunts-specific icon family.

## Hunt Atlas composition

The previous two-card Filters/Target command deck is superseded by the approved
map-first Hunt Atlas composition:

1. **Atlas rail** — world tabs define context and zoom remains a compact map
   utility on the same structural rail.
2. **Finder rail** — Search, level range, Clear, element filters, Hunt selector,
   native result count, Locate, Reset and status feedback form one supporting
   surface attached to the map rather than separate cards.
3. **Map workspace** — visually dominant, framed by the Better UI pixel-art
   system without recoloring the native map itself.
4. **Attached Inspector** — selected Hunt identity/data, native presentation mode
   and the explicit primary `Entrar na Hunt` action.

The current visual FIX keeps each Pokémon sprite on a transparent marker substrate;
only a compact dark caption carries Selected/Located/Focus state, so there is no
opaque card/plate behind the sprite. Element and defensive-relation rows extract the
native PNG itself from decorative host wrappers and align that PNG directly with
label/multiplier content; the old circle-inside-badge presentation is intentionally
not reproduced.

The shared `--ppbui-*` palette, square 2px borders, hard shadows, compact type
scale and focus/state language come from the global design-system runtime.
Hunts owns only its module-specific layout/integration CSS.

At constrained container widths Finder controls wrap by semantic group. The open
Inspector remains side-by-side while usable, then stacks below the map at the
module's fit threshold; no project-wide mobile breakpoint or global game-window
scale is introduced.

## Native integration preserved

- Search, level inputs, Clear, world tabs, zoom, area count and element-filter
  nodes stay native and keep their handlers.
- The original `.hunt-presentation-toggle` is moved intact into the Inspector; it
  is never cloned or recreated.
- The native map viewport is moved intact into a reversible workspace; pan/zoom
  listeners and map markers are not cloned.
- Styling native nodes is scoped through `.ppbui-hunts-enhanced`; global Better
  UI CSS remains opt-in and does not restyle host controls broadly.
- No feature-specific MutationObserver, network interception or synthetic Hunt
  marker click is used. The historic map/Inspector mode does not patch
  `startHunt()`. The current native **list** adapter wraps the scene's
  `startHunt()` narrowly to preserve zone context across native commands and
  restores the original descriptor on cleanup (`src/modules/hunts/controller.js`);
  this is not an automatic Hunt action.

Cleanup restores the native toolbar/count/element order, viewport placement,
presentation control and native marker click/hover behavior.

## Selection and navigation

- **Marker click:** selects/highlights and opens/updates the Inspector only.
- **Keyboard activation:** performs the same selection and moves focus into the
  Inspector sequence.
- **Localizar no mapa:** selects the same zone, opens the Inspector and pans through
  native map state without changing perceived zoom or starting gameplay.
- **Reset:** clears selected/located/Inspector state without changing filters or
  intentionally moving the map.
- **Esc / ×:** closes the Inspector and returns focus to the selected marker when
  possible.
- **World/filter change:** clears a selection that is no longer valid.

Selected and Located remain separate states. Locate may dim other marker labels;
selecting another marker does not silently redefine the located target.

## Map-state preservation

Opening or closing the Inspector changes the available viewport width. The
controller converts the current native state to semantic zoom ratio + focal
center, applies the new geometry and reconstructs scale/x/y so the player does
not experience a zoom jump.

Native refresh can temporarily recreate a full-width viewport and schedule its
own clamp. While the Inspector is open, Better UI keeps a reference to the prior
open map state and geometry so the subsequent reconciliation restores the same
relative zoom and focal center instead of accepting the transient clamp as the
new intent.

## Stable Hunt identity

Selection is tracked by world + stable zone id when available, with the zone
object as fallback. On native reorder/refresh the current index is reacquired.
If the zone disappears, Better UI clears the Inspector rather than reusing a stale
index and potentially entering another Hunt.

## Explicit Hunt action

`Entrar na Hunt` validates the current selected zone, assigns the reacquired
native `_selectedIndex` and calls the existing `scene.startHunt()`. The button
uses pending/disabled state while the returned operation is unresolved.

No custom gameplay request is sent and no gameplay automation is added.

## Accessibility and design-system review

- Finder controls retain explicit accessible labels/group semantics without the
  obsolete visible Filters/Target card headings.
- Inspector is labelled by the selected Hunt title.
- Close has a localized accessible label.
- Keyboard focus uses the independent Better UI cyan focus state.
- Primary action/selected state uses more than text color alone.
- Required information is persistent; workflows do not depend on hover.
- Long names remain recoverable through title/accessibility metadata.
- Locate flash is removed under `prefers-reduced-motion: reduce`.
- Metadata uses the approved contrast-safe `--ppbui-text-subtle` token.

The optional UI/UX Pro search/catalog/checklist files referenced by
`.skills/ui_ux_pro.md` are unavailable in this workspace. The project-native
fallback review was used; no external search/checklist result is claimed.

## Automated validation

Focused Hunts coverage verifies:

- marker click/keyboard selection cannot start gameplay;
- explicit Hunt calls the native flow exactly once with the current index;
- hover/focus native tooltip handlers are suppressed only while enhanced;
- presentation toggle identity/listeners survive relocation and cleanup;
- Finder/Atlas composition moves native filters/count/elements without cloning
  them;
- Hunt Atlas consumes shared PPBUI tokens/components with scoped CSS;
- Locate/Reset/selected-vs-located semantics;
- Inspector defensive relations and valued Drops;
- search/world invalidation and stable-zone refresh/reorder behavior;
- semantic zoom/focal preservation, including the native rAF clamp race;
- mutation-free stable reconciliation;
- full native DOM restoration on cleanup;
- complete native window replacement/remount without duplicate Better UI UI.

Historical Hunts suite: **31/31 tests**; the `3faa712` closure used **214/214**
full tests, and the later Miyazaki 16 review recorded **249/249** at that time.
The current 2026-09-29 working tree verifies **43/43 Hunts tests** and
**518/518 full-suite tests**; its PPTools F0/F1/F2/Hunts focused total is
**80/80**. The exact PPTools diagnostic candidate and hashes are tracked in
`docs/PPTOOLS_HUNT_RECOMMENDATIONS_PLAN.md`; historical Team redesign hashes
remain in `docs/TEAM_REDESIGN_STATUS.md`. Automated checks do not constitute
in-game validation.

## Final live-validation closure

The Product Owner's first 2026-09-12 live pass identified unfinished shell/control
ownership, weak Locate dimming and insufficient primary-action hierarchy. A second
pass identified Search/Level rounding, Atlas/zoom alignment and incomplete selected
tab fill. The visible `PRESENTATION` heading was then removed, the window was renamed
to `HUNT ATLAS`, and the title typography was corrected against the actual nested
host title owner after the first typography attempt passed tests but failed in-game.

The final title-owner correction in historical `3faa712` applies authoritative inline
`!important` typography while preserving and restoring the native title owner's
exact text/style/class state. Independent Design QA and technical QA returned
P0/P1/P2/P3 = none / READY, and the Product Owner then gave the final in-game
verdict **Hunt Atlas validado. All green.** No Hunt Atlas visual-completion item
from that historical cycle remains open; the later Miyazaki 16 visual migration is
a separate candidate and remains pending fresh live validation.

## In-game validation boundary

The coding agent does not open/control/reload PokePixel, the user's browser or
Tampermonkey to validate this interface. The Product Owner supplied the required
green light on 2026-09-12 for the delivery through `3faa712`. Any future live
appearance/behavior change reopens validation only for the changed scope.

## PPTools Hunt Recommendations — one-click diagnostic candidate

**Tampermonkey 0.2.120 candidate:** a user-approved temporary background PPTools
tab enables the same one-click Top3 calculation outside Coupled Workspace,
through the same userscript installed on PokePixel and the dedicated PPTools
route. The addon closes only its own tab and returns to the current leader's
Hunt list Search workflow. Its new browser/Tampermonkey behavior still awaits
Product Owner in-game validation; the existing Coupled host path is unchanged.

**Atualização 2026-09-29:** O Product Owner confirmou o funcionamento em jogo de
`PPTools Recommendation`. Como a versão atual oferece a LISTA de Hunts sem mapa
interativo, cada recomendação usa o botão `Search` para preencher o campo de
busca nativo por hunt, disparar seu evento `input` e focá-lo. O filtro atual
de mundo/nível/elementos permanece intacto; se a hunt não aparecer, o status
orienta a verificar esses filtros. Nenhuma Hunt é iniciada e nenhuma linha é
selecionada automaticamente. O novo Search aguarda validação exclusiva do PO.

**PO correction (2026-09-29): the following manual workflow is rejected and
historical.** The required behavior is one click on `PPTools Recommendation`
for the *current native leader*, followed by an actual PPTools simulation and
automatic presentation of the recommended wild Pokémon/hunt within Better UI.
The user must not copy or paste JSON, visit PPTools manually, or export its
results. The manual `0.2.118-r2` candidate does not satisfy this contract and
is **NOT READY**. The authoritative correction and new acceptance criteria
are recorded at the top of
[`docs/PPTOOLS_HUNT_RECOMMENDATIONS_PLAN.md`](../PPTOOLS_HUNT_RECOMMENDATIONS_PLAN.md).
The Product Owner further specified a silent background browser **within the
Coupled Workspace** (or equivalent): no Docker requirement, visible tab,
external window, or second user action. Better UI `0.2.119` now implements
the one-click Hunt Atlas widget and an opt-in Coupled Workspace host executor:
an isolated invisible/InPrivate WebView2 executes the public PPTools form and
simulation and returns a correlated XP/h Top 3. A synthetic attacker completed
the public site's simulation in local host smoke. This is **diagnostic only**:
native `COPIAR JSON` parity, particularly the native trainer EXP bonus versus
PPTools's multiplicative `expBuff` semantics and inferred Shiny range, remains
unproved. Live game integration still needs Product Owner validation.

**Historical manual path (superseded by the one-click correction):** the
Product Owner originally requested an API-free import of the first three result rows
after running a simulation in the external PPTools Hunt Analyzer. The scope,
versioned transport proposal, phased plan, risks and acceptance/evidence matrix
are registered in
[`docs/PPTOOLS_HUNT_RECOMMENDATIONS_PLAN.md`](../PPTOOLS_HUNT_RECOMMENDATIONS_PLAN.md).
State: Better UI `0.2.117` / external PPTools exporter `0.1.0` have a frozen
isolated diagnostic candidate, synthetic tests and source QA. The Product Owner
already copies the **current leader's** JSON through PokePixel's native hover
button, manually simulates that Pokémon on PPTools and copies the recommended
hunts back. The importer requires user-confirmed provenance, binds results to
the unique native leader instance/level/species and invalidates them on a
leader, profile or level change; the PPTools site cannot independently verify
the attacker ID. Both map and list preserve explicit `startHunt()` and
per-WebView profile isolation. Native game and live PPTools simulation remain
pending Product Owner validation; synthetic renders do not approve the host.
