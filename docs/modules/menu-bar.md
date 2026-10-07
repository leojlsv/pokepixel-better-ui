# Menu bar

Status: **0.2.183 — freely placed destinations and 10–15 slots per trainer;
validated and approved in-game by the Product Owner at 2026-10-07T17:03:19Z**.
The Product Owner approved the 0.2.182 functionality on 2026-10-07 and explicitly
replaced its fixed-destination/13-slot restrictions. Current gate:
`docs/PM_GATE_2026-10-07_MENU_FREEDOM.md`; prior evidence remains in `MENU_LAYOUT`.

## Customize for the signed-in trainer

Open **Better UI > Menu bar > Personalizar menu bar / Customize menu bar**.
The editor identifies the active trainer and offers a passive preview, groups and
item details. Drag to reorder, or use Previous/Next and Move to / Position / Apply.
Only Save applies the draft to the real bar. Cancel/Escape discard it; Restore
default changes the draft and still requires Save. It works in both Game and Cards.

The player selects a capacity from ten to fifteen logical main positions using
Slots. The initial value is thirteen, preserving the previous arrangement. Reducing
capacity below current occupancy keeps an editable draft, shows the excess and
disables Save/Overwrite until the player frees space or increases capacity. Nothing
is moved or hidden automatically to satisfy the new limit.

All catalog action destinations may move among groups or onto the bar, including
Inventory, Hunts, Mailbox, Settings, the rewards trio, Cards/Game and Better UI.
There is no mandatory system tail or direct-action lock. Empty groups remain
available as editor destinations and can be repopulated without restoring defaults;
their runtime triggers may be hidden until they contain an available item.
Each destination has one location. Return to City remains a contextual first entry of City and is
never stored as a customizable destination. No manual hiding, duplicate shortcuts,
custom groups, nested groups, renamed icons, cloud sync or multiple named presets.

The trainer's native ID scopes `ppbui:menu-layout:v1:<encoded trainer ID>`, containing
only a versioned arrangement, slot capacity, orientation and position. Layout version
2 reads version 1 arrangements with capacity thirteen, preserving their existing
order and geometry. Reading does not rewrite saved bytes; an explicit save upgrades
the inner layout. The outer storage record/key format remains version 1.
Native hidden/disabled and
permission state remain authoritative. Unknown native destinations retain their
containers. An incompatible main-rail capacity suspends customization while preserving
native access; visibility or structural changes can restore it without retry churn.

Missing known items keep their saved position for their return. Identity pending or
disagreement uses the default without an anonymous write. Logout/account changes
discard the old editor draft; native toolbar rebuilds for the same owner preserve it.
Legacy global position can migrate once to the first confirmed trainer, leaving
`ppbui:menu-bar-position:v1` intact. Orientation is a new owner-scoped preference.

Blocked storage retains choices in memory for that trainer and reports session-only
application. Corrupt, oversized or future records require explicit replacement.
External revisions conflict with stale drafts; session overlays remember their base
record so a later external edit is not hidden. Detectable interleavings are rejected;
localStorage does not provide atomic compare-and-set across windows.

Menu Bar owns placement of registered system participants while their original
modules own creation and handlers. The expected layout follows the saved arrangement,
not a mandatory static order. Native action nodes, badges and shortcut attributes are
preserved; no game action is triggered by editing.

Grouped Cards/Game uses the same toggle and remains available through its selected
group in both modes. Grouped Better UI temporarily mounts its existing preferences
panel as a body-level portal while open, avoiding clipping or hiding when its parent
dropdown closes. Card Mode admits only this marked panel. Escape/Cancel returns
focus through the current group; teardown removes/restores the owned surface.

## Default composition

The rejected Wallet candidate 0.2.184 briefly introduced the optional IDs
`wallet:menu` and `wallet:shop`. Candidate 0.2.185+ retires both completely: Wallet no
longer registers Menu Bar participants or exposes Menu/Shop locations. Layout validation
accepts those two IDs only as migration input and normalizes them away without changing
the remaining order, groups or 10–15 slot capacity. They never join defaults or
missing-item normalization.

Category: Rearrange. The default retains the organization authorized on 2026-08-31:

Inventory | Hunts | Trainer | City | Goals | Events | Social | Mailbox |
Tools | Shop | Settings.

The complete mapping of 33 client-defined destinations is in `menu-bar-plan.md`.
Shop contains Premium Shop, Pack and Gacha. Missing **native destinations** are
never recreated. City additionally owns four explicit Better UI shortcuts:
`Geneticista`, `Nature`, `Evolution Center` and `Gyms`. They are separate Better UI
nodes without `data-menu-id`. The three NPC services delegate to the game's exposed
`PokeIdle.NPC.open()` controller using the native NPC kinds `iv`, `nature` and
`evolution`. `Gyms` delegates to the native `SceneManager.push(Scene_Gym)` navigation
contract and leaves the scene's default region untouched; it does not start a Gym
battle. None of these shortcuts replaces or impersonates host toolbar actions. Each existing
native action still appears once, with its original node, children, label, shortcut
and listeners. Existing group wrappers, triggers, icons and badges are reused.
Unknown native actions remain available in their native containers.

The City popup also exposes one documented contextual-action integration surface for
dependent Better UI modules. `getGroupTarget("city")` returns the current City group,
trigger and popup identities, and `ppbui:menu-before-teardown` is emitted before Menu
Bar restores/removes those nodes. Contextual actions use
`data-ppbui-menu-context-action` / `data-ppbui-menu-context-visible`; they participate
in the same Arrow/Home/End navigation without being treated as Menu Bar-owned City
shortcuts. Hunt Controls is the first consumer of this contract.

The Product Owner-provided menu artwork is stored in `assets/`: `betterui.png`,
`genetics.png`, `nature.png`, `trainer.png`, `evolution.png` and `gym.png`. Runtime
96×96 derivatives in `assets/runtime-icons/` are embedded as data URLs so the
self-contained userscript does not carry the original multi-megabyte PNG payload.
Better UI owns the Trainer group icon while mounted and restores the native icon on
cleanup. The Better UI preferences trigger likewise uses the provided Better UI art.

Group labels follow the read-only `PokeIdle.Localization.get()` language,
with document language as fallback. Portuguese, English, Spanish and Chinese
are supported. Destination labels are never translated or renamed by Better UI.
Only a missing group container/trigger is created, using passive presentation
from an existing action. That trigger has its own events and no action ID.
Opening a group never forwards a click to a game action.

Toolbar and dropdown classes are adapted to the destination's new position.
Managed triggers use the native standalone button class: the group-trigger
class wraps longer labels into adjacent flex columns. Main-rail columns use the
selected capacity. The vertical rail reserves its drag/collapse regions and shares
the remaining height among the selected rows without changing font/icon sizes.
The explicitly requested Better UI,
Trainer and City-service icons are the icon-level exception. Temporary inline `display:none` masks preserve native hidden
states after moving nodes and suppress empty groups; cleanup restores the
previous inline display value.

Destination badges remain their original nodes and are updated by the native game.
When reward destinations leave Goals, its original aggregate is reversibly masked
to avoid reporting rewards at the wrong location. Current groups receive a compact
`!` indicator whose tooltip and accessible group label quote each visible native
badge literally (for example `Mailbox: 7; Quests: 99+`). Counts are not recomputed
from display strings. `groupAriaLabel()` composes this summary with Hunt Controls'
Return to City context, so the later contextual update cannot erase notifications.

## Lifecycle and interaction

Core reconciliation tracks DOM replacements and native hidden/disabled/ARIA state
changes. Menu Bar rebuilds its native-node integration internally when the toolbar,
actions or group identities change; its body-scoped lifecycle keeps the same-owner
editor draft alive. Stable reconciliation does not rewrite the editor or arrangement.
No polling, additional DOM observer or network interception is introduced.

The native TopToolbar installs `handleShortcut` through a window-capture listener,
before a modal's bubbling listener could intercept it. While the editor is open,
`layout-shortcut-guard.js` temporarily adapts only the exposed
`PokeIdle.PersistentHud._toolbar.handleShortcut` instance method. It suppresses menu
shortcut dispatch while the editor owns the interaction and delegates normally as
soon as the editor closes. Replacement/cleanup restores only the method it still
owns, including inherited-property semantics; stale captured adapters are inert.
This narrowly scoped native UI adapter is justified by the modal's passive-editing
contract. Browser event APIs, network, navigation APIs and combat are not patched.

Group interaction supports clicks, outside pointer, focus transitions,
Arrow Up/Down, Home/End and Escape. Existing native hover/focus CSS still
applies: closing explicit open state does not disable native hover behavior.
Click handlers are attached to original nodes, including actions whose native
handlers stop event propagation. No game action is automated.

For the draggable native Poké Hub, Better UI materializes the first valid rendered
rectangle into the same explicit `left`/`top`, `bottom:auto` and `transform:none`
geometry that the host's `moveHub()` establishes after a drag/resize, clamped to
the host's 8px viewport margin. This removes the transformed/edge-anchored startup
state before fixed-position dropdowns are used. If the host/user subsequently
moves the hub by its native handle, that later geometry remains authoritative and
is not rolled back during Better UI cleanup.

The host's native `Main menu position` setting is redundant while Better UI owns this
freely draggable Poké Hub. During Menu Bar ownership, the unique native Settings row
whose select contract is exactly `top` / `bottom` is hidden and the corresponding
`body.pokeidle-toolbar-bottom` geometry flag is neutralized. Identification is based
on that native option contract plus the valid `InterfacePreferences.toolbarPosition`
state, never translated label text or row ordinal, and fails closed when ambiguous.
Better UI does not mutate the host preference value or native storage. If the native
preference changes programmatically, its event updates the desired state while Better
UI keeps drag geometry authoritative. Disabling Menu Bar restores both the Settings
row and the latest native top/bottom preference behavior.

Cleanup restores original positions/classes without resurrecting removed
actions. Replacements and updated native labels are retained. Native badge
references remain intact so the game can continue updating their counts.

## Evidence and validation scope

- Historical `pokepixel-custom-ui/research/captures/2026-08-13/dom/main-screen.html`:
  native toolbar contract with 27 destinations; the current test fixture is a
  synthetic reconstruction of the required structure.
- Historical `pokepixel-custom-ui/src/bridge/navigation.ts`: destination identifiers.
- Public `/play/js/plugins/PersistentHUD.js`, re-inspected 2026-10-02:
  33 destination definitions, alternative native groupings/event contracts and the
  Poké Hub `moveHub()` geometry normalization used after drag/resize.
- Public `/play/js/plugins/NpcInteraction.js`, inspected 2026-10-02:
  exposed `PokeIdle.NPC.open()` dispatch for `iv`, `nature` and `evolution`.
- Public `/play/css/persistent/top-toolbar.css`: native styles and dropdowns.
- Public `/play/js/plugins/Localization.js`: supported game languages/getter.

`node --test test/menu-bar.test.js`: focused tests cover foundation lifecycle,
node/listener preservation, all 33 native destinations, native badges, original
shortcut attributes, locale changes, hidden controls/empty groups, alternate
composition, cleanup/restart, full/partial replacements, item reordering, mutation
stability, F5 geometry normalization/late layout, host-owned geometry cleanup and
the four City shortcuts including native Gym-scene delegation and requested icon ownership.
It also covers native Main-menu-position suppression/restoration, stale Settings
select values and ambiguous lookalikes. Hunt-specific contextual integration is
covered separately by `test/hunt-controls.test.js`.
The six newer destinations in tests are synthetic contract fixtures, not an
updated authenticated capture. Destination clicks in tests use mock handlers.

Local browser checks used the 27-destination capture and native CSS at
1280 x 720: toolbar labels, Trainer/Tools/Shop dropdowns, menu switching,
simulated destination dispatch and arrow-key navigation. No new visual
overlap was observed at that viewport; this does not certify all viewports.

Historical note: the pre-2026-10-02 menu organization and native drag/collapse
behavior were approved before the later F5 geometry/City-shortcut changes; those
changes were recorded as pending at their earlier delivery. The current custom-bar
`0.2.183` feature was explicitly approved at 2026-10-07T17:03:19Z: “Bar custom validada
e aprovada.” Its live-validation pending status is closed in
`docs/PM_GATE_2026-10-07_MENU_FREEDOM.md`; the recorded local viewport coverage remains
unchanged.
