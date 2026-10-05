# Menu bar

Category: Rearrange. Implements the organization authorized on 2026-08-31:

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
class wraps longer labels into adjacent flex columns. Dimensions, fonts, palette
and native responsive rules are unchanged; the explicitly requested Better UI,
Trainer and City-service icons are the icon-level exception. Temporary inline `display:none` masks preserve native hidden
states after moving nodes and suppress empty groups; cleanup restores the
previous inline display value. No new badge aggregation is introduced.

## Lifecycle and interaction

The core's single observer schedules reconciliation for DOM replacements and
native hidden/disabled/ARIA state changes. The optional mount key tracks the
toolbar, action nodes and native group structure; the optional reconcile hook
updates labels and visibility without remounting an intact toolbar. No polling,
feature observer, game-global patching or network interception is used.

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

The user previously validated the pre-2026-10-02 menu-bar organization and native
drag/collapse behavior. The 2026-10-02 F5 geometry fix and City shortcuts are a new
candidate scope and remain pending Product Owner in-game validation. The prior
acceptance does not certify the new post-F5 pointer behavior or final rendered City
composition.
