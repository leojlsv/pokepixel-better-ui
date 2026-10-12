# Trade — Dense Exchange Workstation Override

Status: **Product Owner validated in-game; release authorized for 0.2.195.** The final Trade candidate preserves the accepted density/action layout, native Rarities authority, More Filters candidate-set composition, and native quantity prompt with Max.
Direction: **compact offers + high-density inventory**
Recorded: **2026-10-04**

This page specializes `../MASTER.md` for Trade. It preserves the native trade rules,
offer nodes, inventory nodes, handlers and authoritative state. The Product Owner's
2026-10-04 live screenshot is the current defect reference: empty offer slots stretch
into oversized cards while the inventory remains artificially limited to four columns.

## Information hierarchy

Trade is a three-part exchange workstation:

1. received offer — compact review surface;
2. own offer — compact editable offer plus confirmation controls;
3. inventory — the primary browsing surface and therefore the largest flexible desktop region.

The two offer surfaces contain twenty original native slots. Their size must match the
Backpack's actual item slot, not the game's oversized Trade card height. The native
inventory remains the high-density browsing surface with its own vertical scrolling.

## Geometry contract

- The Trade window must NOT offer a resize handle. Its bounds are automatically
  limited to `1160×620px` or the viewport minus 16px, whichever is smaller;
  native mobile fullscreen rules remain authoritative where applicable.
- At Trade container widths above `1139px`, retain three semantic columns;
  at `760–1139px`, keep the two offer columns and place inventory below; below
  `760px`, stack all three sections. Do not overflow the root horizontally.
- On the normal three-column desktop composition the two offer panels and inventory
  stretch to the same bounded workspace height. Offer status rows settle at the bottom
  while content fits; an offer panel gains its own vertical scroll only when long
  content genuinely exceeds that height.
- Both offer and inventory cells are exactly `56×56px` on desktop and `50×50px`
  at viewport widths `<=560px`, matching archived native Backpack sizing. Native
  image/quantity/handler nodes remain present; long name and metadata elements
  are visually hidden while remaining available to assistive technologies.
  Full twenty-slot capacity is retained even when mobile native CSS hides empties.
- Offer grids use five columns where space allows, four or three when necessary.
  Rows remain square even for filled Pokémon with long localized names.
- Inventory uses fixed-size `auto-fill` card tracks, aligned from the start.
  The list itself owns vertical scrolling; expanding inventory width must never create
  root-level horizontal scrolling.
- The native `.pokeidle-panel__body` is **not a Trade scroll owner**. It is a bounded
  viewport with no scrollbar and no reserved scrollbar gutter. On the normal desktop
  three-column composition, offer panels stretch to equal height and status rows settle
  at the bottom; inventory consumes the remaining column height and owns its list scroll.
  At narrower/shorter sizes, only the affected offer/inventory region may scroll.
- Native Confirmar/Cancelar nodes remain under their original native Trade side
  and shell. An empty Better UI-owned footer reserves space; scoped absolute
  positioning displays the native buttons in that footer without reparenting.
  Original delegated handlers and native ancestor queries remain functional.
- The player's balance belongs with the editable currency row when that row is
  discoverable. Reuse/move the native node; never clone it.

## Responsive contract

- `<=1139px` container: two offer columns; inventory follows below.
- `<=759px` container: one semantic column with scrolling content.
- `<=390px` container: reduce desktop offer grid to four tracks;
  `<=290px`: reduce to three. With mobile `50px` tiles, use four tracks
  below `350px` and three below `290px`.
- Search, item category, Pokémon filter disclosure and result counts remain reachable
  before the scrollable inventory list.
- No breakpoint may introduce horizontal page/root overflow.

## Interaction and states

- Keep native Trade add/remove, amount, confirm and cancel handlers unchanged.
- The player's action buttons remain directly visible on-screen at the bottom,
  without requiring a scroll to find them, even when the internal Trade content is tall.
- Only the native `Adicionar item à troca` quantity prompt is eligible for the
  separate width/scroll corrective: recognize either the native `pokeidle-dialog`
  family or the actual archived **UIFormHelper** family (`.pokeidle-overlay >
  .pokeidle-form-box` with `.pokeidle-form-title`) by its exact native title
  after inventory activation/focus, mark only that overlay and remove ownership
  on cleanup. Never globally modify arbitrary game dialogs or submit actions.
- Keep native tab semantics and Better UI focus-visible treatment.
- Pokémon filters remain in the existing bounded modal; Escape/cancel restores focus
  to the trigger and filter rerenders preserve the focused field.
- Disabled/hover/pressed/selected styling continues to use the shared MASTER primitives.
- Cleanup removes only Better UI-owned styles/classes/scroll claims and restores scene
  wrappers deterministically.

## Render acceptance checks

1. At a desktop composition comparable to the Product Owner screenshot, twenty offer
   slots appear as four rows of five Backpack-sized **squares**. Native mobile
   content/card minimum heights cannot enlarge those cells.
2. Inventory visibly uses the width available to it and presents more than four columns
   when the panel can fit them.
3. The original Confirmar/Cancelar actions remain visible in a fixed native-action
   dock, not merely reachable by scrolling.
4. Balance is visually associated with the editable currency control rather than an
   isolated empty band.
5. The `1139/759/390/290px` container transitions remain coherent and
   no root horizontal scrollbar appears.
6. On a wide desktop the Trade window remains bounded; no native resize handle
   is offered, and on a narrow or short viewport the native actions remain visible.
7. Focus, disabled states, text wrapping and the inventory scrollbar remain legible.
8. No far-right scrollbar/gutter is visible on the Trade window itself. Scrolling
   hundreds of items changes only the inventory list; scrolling exceptionally tall
   offer content changes only that offer region.
9. `Adicionar item à troca` has no horizontal scrollbar and no vertical scrollbar
   at normal prompt heights. If the viewport is genuinely too short, the compact native
   form box may vertically scroll as the single owner so original actions remain reachable.

## 2026-10-11 — Rejected scroll-reachability corrective (historical)

**New Product Owner finding:** resizing the Trade window still concealed native Confirm/Cancel in the local `0.2.194` build. Prior CSS-presence assertions and 721 project tests did **not** prove the buttons were reachable; they must not be cited as visual approval.

The host panel is an absolute flex column, with a clipped outer window and a scrollable body (`work/profile-rarity-182/game-ui.css` snapshot, lines 208–270). The earlier Trade integration constrained width and inventory scrolling, but allowed the Trade shell/offer grid to grow without ensuring a scroll path to the original action buttons. The exact *current* live Trade-specific CSS and rendered DOM remain a client boundary, not a fact proved by the archived stylesheet.

The local corrective scopes the native `.pokeidle-panel__body` to `min-height:0` and `overflow-y:auto`, lets `.trade-shell` expand into that scroll area without clipping, and caps both large inventory and tall offer-slot grids with valid scroll dimensions. Offer scrolling chains to the native window body at its boundary instead of trapping the wheel. A higher-specificity scoped rule keeps offer scroll enabled despite the archived host's `body.pokeidle-mobile-portrait .trade-side .trade-slots {overflow:visible!important}` rule. The original Confirm/Cancel DOM nodes, their order, disabled states and handlers are untouched. The preferred initial `1280px` width now yields to native inline dimensions on resize; a no-movement pointerup/pointercancel restores the previous width, and a completed manual resize retains native width across Better UI cleanup/remount on the same window.

**Previous acceptance evidence (superseded by the later screenshot):**

- At desktop, intermediate, one-column and very narrow Trade window widths, shrink the Trade window vertically and scroll to Confirm/Cancel (superseded: the Trade window must no longer be manually resizable and actions must remain visible).
- Exercise the twenty slots with oversized localized Pokémon/item names, a long trade status, and hundreds of inventory items; list scrolling must remain independent and actions must not become inaccessible.
- On native width drag, the panel should follow its resize handle (superseded: the handle is not offered in the redesign); after disabling Better UI, native controls/handlers must remain intact.
- Verify the user-installed Tampermonkey script includes the latest local `dist/pokepixel-better-ui.user.js` bytes; reinstall manually when rebuilding the same `0.2.194` metadata version, because version matching alone does not refresh a local script.

**Local evidence (not live approval):** A red/green JSDOM regression test and native-handler rerender test, including no-drag/cancel and same-root resize remount checks; a synthetic headless Chromium smoke with an explicitly hostile native-like clipping fixture. The initial 32-case sweep yielded 0/32 reachable before and 32/32 after. An expanded 88-case-per-variant sweep targeting rendered widths immediately around the `959/519/339px` container-query boundaries yielded 0/88 before and 88/88 after, under *that fixture*. A separate synthetic mobile-portrait cascade check observed baseline `overflow-y:visible` and corrected `overflow-y:auto` for offer slots. The expanded sweep also detected small horizontal overruns (`5–13px`) inside the shell or offer scroller at five sampled widths, without loss of action reachability; that remains a P2 edge to assess against real host geometry rather than silently asserting a no-overflow visual gate. `work/trade-resize-smoke/results.json` retains the local observations. Neither JSDOM nor the synthetic Chromium host proves the current game's exact DOM, CSS cascade, drag manager or final visual appearance. **Live validation remains blocked pending the Product Owner's new result.**

## 2026-10-11 — Non-resizable responsive corrective (CURRENT CANDIDATE)

The Product Owner's newest screenshot of the actual installed `dist/pokepixel-better-ui.user.js` explicitly **rejected** the previous same-version candidate. It demonstrates that Confirmar/Cancelar disappear when Trade height is reduced; the user additionally requires **no resize**, Backpack-sized slots, coherent compact menus, and a proper quantity dialog, using WoW Trade as a simplicity/structural reference, not a literal theme clone.

The current candidate removes Better UI's manual-resize listener/WeakSet entirely and hides only Trade's native handle with scoped CSS. Viewport-bounded dimensions replace manual sizing. The exact native Confirmar/Cancelar nodes remain under the original Trade side and shell; positioned against the root panel, they occupy the 51px bottom shelf even while native content scrolls. No action is cloned or reparented, preserving direct and ancestor-delegated listeners, native selectors and state. The adapter restores focus after a whole-scene native render only when an action previously had focus and the old node has been detached without another control taking focus. Cleanup removes the empty shelf and its styling, leaving the original native buttons in place. Backpack-sized square Trade slots and inventory cards override native oversized mobile card minimums and native hidden empty slots.

The document-level quantity prompt is owned only after the native `Adicionar item à troca` title has been matched, so other game dialogs are not restyled. Its header/actions remain fixed while its body alone may scroll vertically; horizontal overflow is suppressed without replacing any native form control or action callback. Exact current live modal DOM and browser CSS are still an integration assumption and require Product Owner confirmation.

**New local evidence (not live approval):** Five JSDOM Trade tests cover unchanged direct and delegated native actions, no resize, CSS, native scene replacement/focus/terminal cleanup, and narrowly scoped quantity dialog. A source-executing synthetic Chromium fixture checks 19 widths × five heights = 95 cases, including 260px viewport, hostile mobile minimums, 20 offered slots per side, 180 inventory items, native action hit testing before/after scrolling, no horizontal overrun, exact Backpack-sized cards, hidden resize affordance, and a simulated quantity dialog. Last observed result: 95/95 PASS in this constructed host. It is not the current game's exact runtime/native stylesheet or live UX acceptance.

**New acceptance gate:** Reinstall the exact latest bundled local userscript despite unchanged version metadata, open Trade, confirm no visible resize handle, inspect `56×56` desktop/`50×50` mobile slots, verify both actions are **visible without scrolling** at wide, narrow and short viewports, exercise full offers/large inventory, quantity modal overflow, native click/keyboard/disabled/focus semantics, and cleanup. Local automated evidence can support technical readiness but **cannot** establish in-game acceptance. Status: `VISUAL EVIDENCE INSUFFICIENT`; no commit/release authorization.

## 2026-10-11 — Outer-scroll/alignment corrective (CURRENT)

The Product Owner's next live screenshots show the non-resizable/Backpack-slot direction
working, but the Trade still reads like a page inside a window because the native panel
body exposes a far-right vertical scrollbar. The native quantity prompt also still shows
both outer vertical and horizontal bars. This is not accepted UX.

The current local corrective removes Trade body scroll ownership entirely (`overflow:hidden`
plus `scrollbar-gutter:auto`). The shell fills the bounded body and the three desktop regions
stretch into one aligned workstation. Offer status rows use the remaining panel space and
align at the bottom; inventory list is the primary internal scroll surface. Intermediate and
narrow layouts divide the same fixed body into bounded grid rows rather than growing a second
page-level scroll container.

The modal screenshot matches archived `UIFormHelper.js` CSS more closely than the previously
assumed `.pokeidle-dialog`: `.pokeidle-form-box` has native `min-width:320px`, generous padding,
`max-height:90%` and `overflow:auto`, a combination that can produce both external bars. The
Trade integration now recognizes that exact form family and scopes the fix to the exact
`Adicionar item à troca` title. It removes horizontal overflow/min-width pressure and uses a
compact form box; vertical `auto` remains only as a short-viewport safety fallback. Native
field/actions, validation/busy behavior and callbacks are not replaced or moved.

**Local evidence after this corrective:** seven focused JSDOM Trade tests pass, including a
UIFormHelper-specific prompt fixture. The source-bound Chromium matrix covers 95 width/height
cases and asserts zero Trade-body vertical overflow, zero horizontal root/shell overflow,
Backpack-sized cards, visible native actions, compact dialog/UIFormHelper prompts, a
reachable inventory item through the correct internal scroll owner, and reachability of
the last offer slot plus status text through offer-local scrolling when needed. This is
still constructed-host evidence, not in-game visual approval.

## 2026-10-11 — First-open balance, native Rarities and Backpack Pokémon corrective (CURRENT)

The Product Owner's next live capture shows three remaining issues on the otherwise improved
Trade: on the **first open**, the native `trade-gold-balance` can arrive before the integration
has moved it to the editable money row, temporarily pushing the own-offer heading/box down;
the native **Rarities** control visually conflicts with Better UI and selecting it makes
`Mais filtros` stop applying; Pokémon cards still do not read as the same inventory objects
used by Backpack.

The current local corrective keeps the native game as the authority:

- a balance that is still outside the editable `.trade-gold-row` is hidden from layout, then
  bounded reconciliation (immediate + microtask + animation frame + retries through 3 s)
  moves the original node into the row. No cloned balance/state is created and cleanup cancels
  every outstanding retry;
- Trade does **not** render a second Better UI rarity selector. The native `Rarities` control
  remains the sole rarity authority and only receives module-scoped field chrome. `Mais filtros`
  retains the additive Pokémon filters such as Element, levels, IV/quality, shiny, locked,
  team, nature, gender and tags;
- when native Rarities returns a strict subset, the Trade adapter no longer requires
  `cards.length === allCreatures.length` and never infers creature identity from list order or
  equal cardinality. It associates a card only from `data-creature-id` or from one unique
  visible identity, cross-checked against native rarity/level evidence when those are present.
  Numeric/species-id substring guesses and unproven `data-pokemon-id` ownership are excluded.
  Ambiguous cards are deliberately left unfiltered/untagged rather than being attached to the
  wrong Pokémon;
- native Trade Pokémon buttons are **not replaced**. Every card can receive identity-independent
  Backpack presentation classes (`inventory-slot`, `inventory-slot--pokemon` plus native
  level/sprite positioning); only proven identities receive creature-specific shiny/rarity/tag
  decoration and Better UI predicate filtering. Original click handlers, disabled state and
  Trade ownership remain intact. Detached cards and replaced native Rarities controls release
  Better UI-owned classes on each render instead of being retained until session cleanup.

**New local evidence:** focused Pokémon-tools + Trade coverage verifies the first-open late
balance race (including the bounded long-tail retry), native Rarities followed by `Mais filtros`,
no duplicate rarity field, native add-handler preservation, ambiguous-card fail-closed behavior,
per-render presentation/Rarities ownership cleanup, Backpack class ownership and 56×56 slot
geometry. A separate
source-bundled Chromium fixture executes the real Trade adapter and verifies that selecting
native Epic Rarities still allows `Mais filtros` to eliminate that subset, while the resulting
Pokémon cards remain original clickable nodes with Backpack presentation. This remains
synthetic-host evidence; the Product Owner's next live result is the visual/interaction gate.

## 2026-10-11 — Live follow-up: balance accepted, preserve Rarities + causal quantity Max (CURRENT)

The Product Owner validated the first-open balance behavior in the actual PokePixel client:
`Seu saldo` no longer displaces the own-offer layout. The same live pass still reproduced a
problem when combining native `Rarities` with `Mais filtros`, and the native quantity prompt
for an item such as `Baga Nutritiva · máximo 3111` still exposed awkward scrolling and no
fast path for selecting the full quantity.

The next local corrective changes the integration boundary rather than duplicating native state:

- Pokémon filter edits no longer request a full `scene.render()` when the native Trade scene
  exposes `updateInventoryList()`. Better UI calls that native list-refresh path instead, so a
  `Rarities` control whose selected value is owned by the live DOM is not destroyed/recreated by
  `Mais filtros`. Full render remains only a compatibility fallback when no list refresh exists.
  The native `Rarities` selector is still the sole rarity authority and the original control,
  value and listener are preserved when the native list refresh itself preserves them;
- card filtering remains conservative after the native renderer: Better UI never swaps or
  rewrites `scene._creatures`, never changes offer state, and still refuses to infer ambiguous
  Pokémon identity by card position. Unidentified duplicate cards therefore remain fail-closed
  rather than acquiring the wrong tag/filter identity;
- the quantity portal is adopted only after a causal click on an enabled, non-Pokémon Trade
  inventory item. The clicked item name must exactly match the native form label shaped like
  `<item> · máximo N`, the prompt must expose one quantity input and exactly two native action
  buttons, and a portal that existed before the click must actually change before it can be
  adopted. Short-lived intent epochs prevent a stale prompt from inheriting a later item click;
- Better UI adds one owned `Max` button to the validated prompt's action row. `Max` never submits
  the trade action: it only writes the native quantity input and dispatches bubbling `input` and
  `change` events. A valid integer `input.max` is authoritative; otherwise the anchored native
  `máximo N` label is used, including grouped values such as `3.111`. Disabled/read-only/busy
  inputs, invalid maxima and mismatched/reused prompts fail closed. Native `Adicionar` and
  `Cancelar` nodes, handlers and validation remain untouched;
- an empty native `.pokeidle-form-error` no longer reserves vertical space inside this exact
  Trade quantity prompt. Vertical scrolling remains available only as a short-viewport fallback;
  no global form/dialog styling is introduced.

**Local evidence after this live corrective:** focused Pokémon-tools + Trade tests cover DOM-owned
`Rarities` surviving the same-node list refresh, exact-item quantity correlation, stale/reused
portal rejection/re-adoption, `Max` event semantics and native action preservation. The general
source-bound Trade Chromium matrix remains `95/95`, and the Pokémon smoke explicitly reports
`rarityPreserved: true` while applying `Mais filtros` on an Epic native subset. The full repository
suite is green. These are synthetic/local checks only; the newest `Rarities` interaction, `Max`
placement and quantity scrollbar still require Product Owner validation in the actual client.

### 2026-10-11 — Second live follow-up

The Product Owner validated the item quantity interaction and `Max` button in the real client,
but reported two remaining issues:

- the UIFormHelper box still looked taller than its content and exposed an apparent vertical
  scrollbar. The scoped Trade rule now explicitly shrink-wraps the form with
  `height:max-content`, keeps the native `min-height` neutralized and retains `overflow-y:auto`
  only as a real overflow fallback. Native validation, `Max`, `Adicionar` and `Cancelar` remain
  reachable and unchanged;
- `Mais filtros` still worked only while native `Rarities` was unselected. A new regression
  reproduced the missing composition with two same-name Pokémon across Rare/Epic when the native
  Epic subset rendered a card without `data-creature-id`, rarity class or level metadata. The
  adapter now narrows the **identity candidate pool only** from one unambiguous native Rarities
  `<select>` in the same Trade inventory panel before name/level resolution. It never narrows by
  Better UI advanced predicates, never mutates `_creatures`, never guesses by position, ignores
  rarity classes previously added by Better UI itself, and refuses unknown/conflicting native
  selections. An explicit native creature id always wins; if that id conflicts with the selected
  rarity subset, the card remains unresolved rather than falling back to a namesake.

Focused coverage now includes the exact Rare/Epic same-name no-id case plus negative explicit-ID
conflict and unknown multi-select cases. Same-rarity duplicate Pokémon without stable identity
remain deliberately fail-closed. This corrective remains pending Product Owner validation in the
actual client; local/synthetic success does not establish visual or native-runtime acceptance.

### 2026-10-11 — Third live follow-up: advanced filters still ineffective with Rarities = All

The Product Owner then demonstrated a stronger failure in the real client: with native
`Rarities = All`, `Mais filtros · 2` showed `Elemento = Water` and `Nível mínimo = 150`, while a
visible **Donphan Nv.1** remained in the Trade inventory. This proves the remaining defect is not
limited to preservation/composition of the native Rarities control.

The source cause is the previous all-or-nothing identity contract. A Trade card can correspond to
multiple compatible `_creatures` rows (for example two Donphan of the same level) and therefore
cannot safely be assigned to one creature for tags/tooltips. The prior fail-closed branch kept that
card untouched, which also meant **all advanced filtering was skipped**.

The current corrective separates two decisions:

- **filtering candidates:** a card gets the complete conservative set of creatures compatible
  with authoritative evidence already on the native card (explicit creature id when present,
  semantic name/species evidence, native rarity class and native level). Native `Rarities` may
  restrict this set because it is the authority for which rarity subset the native list displays;
- **individual identity:** tags, creature-specific tooltip decoration and other per-instance
  behavior still require exactly one candidate without reusing an already-bound creature id.
  Native Rarities alone is never used to manufacture a unique instance identity.

When a card has multiple compatible candidates, Better UI now removes it **only when every one of
those candidates fails the active `Mais filtros` predicates**. If any compatible candidate could
pass, the card stays visible. This preserves the fail-closed safety guarantee while allowing
deterministic filters such as Water and minimum level to eliminate duplicate Donphan cards without
guessing which Donphan instance the native button owns. An explicit native creature id that cannot
be reconciled remains unresolved rather than falling back to a namesake.

New regression evidence models the live report directly: two `Donphan`, both Ground and Nv.1,
render without creature ids beside a Water `Blastoise` Nv.160. With `Rarities = All`,
`Elemento = Water` and `Nível mínimo = 150`, only Blastoise remains and its original native click
handler is preserved. The same scenario is also included in the source-bundled Chromium smoke.
Ambiguous per-instance filters such as tags remain conservative: if candidates disagree, the card
is kept rather than assigned to the wrong Pokémon.

### 2026-10-12 - final acceptance

The Product Owner validated the final Trade behavior in the live client. The accepted scope keeps:

- no manual Trade resize and no outer Trade scrollbar;
- Backpack-density slots and the original native Confirm/Cancel nodes;
- native Rarities as the sole rarity control;
- conservative candidate-set composition for More Filters, without guessing ambiguous
  per-instance identity;
- the native item-quantity prompt with Max, original validation, and action handlers.

This closes the live Trade gate for the 0.2.195 release flow.
