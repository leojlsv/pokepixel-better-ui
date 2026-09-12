# Auto Helper

Status: implemented and validated in game, including grouped settings,
save/close/reopen behavior, compact consumable selection and per-quality
Keep/Sell/Extract destinations.

## Scope

Enhance the native Auto Helper settings editor, without running gameplay actions. Support, Capture and Pokémon destination are independent native disclosures. The existing potion/revive, capture, license, threshold and species controls are moved with their nodes intact. The species filter stays next to capture.

The editor uses existing native styles and window geometry. Selected consumables use compact native selects with names, quantities, a selected-item icon and keyboard focus. Support uses aligned function, consumable and condition rows without redundant enabled/disabled labels. Exceptional states remain visible beside their toggles. Stock refreshes on the native inventory.updated event or explicit Refresh resources; idle reconciliation makes no requests. Enabled, disabled, missing stock and blocked states are distinguished locally.

A compact native radio matrix provides Keep/Sell/Extract columns with one destination per quality. Rarity labels use the game’s --quality-* tokens. Keep means neither list includes that quality. Sell and Extract only operate when their native master toggle and entitlement allow them; changing a destination does not enable either function. Disabled masters show paused in their column header and accessible control labels without clearing assignments. Master toggles and license time share the table section; explanations use a native disclosure. Genetic extraction remains absent on unsupported servers.

## Saving contract

The native editor keeps save timers and selected item IDs in private closures. The enhancement therefore handles user changes at the existing controls in the capture phase and replaces only the item pickers and destination selectors. No game global, API method or network transport is patched.

Only explicit user edits call the existing PokeIdle.Api.updateHuntSettings with the native payload schema. Checkbox/selection changes save immediately; species typing uses a 450 ms debounce. Requests are serialized and coalesced to the latest draft. Closing flushes pending edits. A failed draft remains available for explicit Retry, including after a native panel reconstruction. A failure after closing uses the native error toast when available.

Native settings/Premium events may still recreate the window. The module retains the pending draft, group expansion, scroll and editor focus across that reconstruction. It does not suppress native events. Disabling the module restores its nodes and reloads the existing native editor after pending saves settle, because original item handlers retain private selected IDs.

## Native baseline consulted

- https://pokepixel.nietore.com/play/js/plugins/AutoHelper.js
- https://pokepixel.nietore.com/play/js/plugins/ApiClient.js

## Validation

Automated coverage: serialized saves, pending text on close, error/retry, exclusive quality destinations, native-handler suppression, stock refresh without writes, blocked controls, mutation-free idle sync, pending drafts across reconstruction and module lifecycle.

Local preview uses the native AutoHelper script with mock settings and inventory, including a narrow view. No real hunt settings were changed during development.

The current grouped editor, save lifecycle, consumable selection and per-quality
destinations were validated in game by the user. No validation remains pending
for the current Auto Helper delivery.
