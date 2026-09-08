# Menu bar

Category: Rearrange. Implements the organization authorized on 2026-08-31:

Inventory | Hunts | Trainer | City | Goals | Events | Social | Mailbox |
Tools | Shop | Settings.

The complete mapping of 33 client-defined destinations is in `menu-bar-plan.md`.
Shop contains Premium Shop, Pack and Gacha. Missing destinations are never
created; City is absent in the older 27-destination capture. Each existing
action appears once, with its original node, children, label, shortcut and
listeners. Existing group wrappers, triggers, icons and badges are reused.
Unknown native actions remain available in their native containers.

Group labels follow the read-only `PokeIdle.Localization.get()` language,
with document language as fallback. Portuguese, English, Spanish and Chinese
are supported. Destination labels are never translated or renamed by Better UI.
Only a missing group container/trigger is created, using passive presentation
from an existing action. That trigger has its own events and no action ID.
Opening a group never forwards a click to a game action.

Toolbar and dropdown classes are adapted to the destination's new position.
Managed triggers use the native standalone button class: the group-trigger
class wraps longer labels into adjacent flex columns. Dimensions, icons,
fonts, palette and native responsive rules are unchanged. There is no added
stylesheet. Temporary inline `display:none` masks preserve native hidden
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

Cleanup restores original positions/classes without resurrecting removed
actions. Replacements and updated native labels are retained. Native badge
references remain intact so the game can continue updating their counts.

## Evidence and validation scope

- `G:/pokepixel-custom-ui/research/captures/2026-08-13/dom/main-screen.html`:
  native toolbar with 27 destinations; its subtree is `test/fixtures/menu-bar.html`.
- `G:/pokepixel-custom-ui/src/bridge/navigation.ts`: destination identifiers.
- Public `/play/js/plugins/PersistentHUD.js`, inspected 2026-08-31:
  33 destination definitions, alternative native groupings and event contracts.
- Public `/play/css/persistent/top-toolbar.css`: native styles and dropdowns.
- Public `/play/js/plugins/Localization.js`: supported game languages/getter.

`npm test`: 21 passing tests covering foundation lifecycle, node/listener
preservation, all 33 mapped destinations, native badges, original shortcut
attributes, locale changes, hidden controls/empty groups, alternate composition,
cleanup/restart, full/partial replacements, item reordering and mutation stability.
The six newer destinations in tests are synthetic contract fixtures, not an
updated authenticated capture. Destination clicks in tests use mock handlers.

Local browser checks used the 27-destination capture and native CSS at
1280 x 720: toolbar labels, Trainer/Tools/Shop dropdowns, menu switching,
simulated destination dispatch and arrow-key navigation. No new visual
overlap was observed at that viewport; this does not certify all viewports.

The user explicitly validated the complete implementation and confirmed that
menu-bar is functional and adjusted. This closes the module's current validation
stage; further QoL changes are deferred. This acceptance is user-reported, not
a claim of authenticated testing by the agent. The local evidence above retains
its original scope.
