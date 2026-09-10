# Storage

Status: implemented on feature/storage; awaiting in-game validation.

## Scope

The optional Storage module appears under Activities & items. It enhances the native two-column Pokémon Center without modifying transfers or making API calls.

- Each column has independent search, rarity, element, sorting and Clear controls. Changing one column resets only its page.
- Search matches name, nickname, species and the native display name, ignoring case and accents. It combines with native rarity/element filters and sorting before pagination, resets the corresponding page, and clears through the original Clear button.
- Pages reflect occupied results (42 per page), not the 100/2000 capacity. Capacity counters and deposit limits remain native. Overflow Pokémon beyond capacity remain reachable.
- Slots display the existing normal/shiny species sprite URL. If absent or loading fails, the original icon remains. The slot node and its click, double-click and native tooltip listeners are retained.
- The lower selection panel is hidden. Its native transfer button moves into a compact name/action strip in the selected column; hover and double-click remain available. A hidden native selection anchor preserves the original slot selection handler.

## Integration

The native scene builds filtered lists before rendering and closes over its page count in navigation listeners. DOM-only filtering would miss off-page Pokémon. The module therefore installs reversible adapters on the current scene instance's filter and render methods. No scene prototype, global API or transfer method is patched. Page position is clamped before the original vault renderer runs; only the returned page label and Next availability are corrected. The real storage capacity is never modified.

Scene discovery checks the native methods and associated panel body in ReactiveWindows.cached() and SceneManager._scene, including non-blocking windows over the active map. The centralized reconciler mounts the adapter once; idle reconciliation does not scan cards, resolve sprites, refresh the scene or make requests. Disabling restores method descriptors and refreshes the native screen.

Bulk transfers retain their native all-Pokémon scope, including hidden search results. The existing native confirmation receives a scoped informational note with the source count as an upper bound, destination and explicit unfiltered scope. It does not add a second confirmation or replace the transfer handler/API.

## Validation

Tests cover occupied pagination, empty and overflow storage, off-page/accent-insensitive search, Clear and focus, transfer listeners, image failure fallback, cleanup and scene guards. The public native renderer was also previewed locally with mock Pokémon and native CSS.

In game: search a Pokémon beyond page one, combine search with rarity/element filters, clear, navigate the final occupied page, select and double-click a Pokémon, and disable/re-enable the module. Check normal/shiny sprites and that the selected details retain their original layout.

Native sources: https://pokepixel.nietore.com/play/js/plugins/CreatureStorageScene.js and the game's inventory-slots.css / pokecentro-filters.css. The source inspection confirmed that unfiltered pagination used warehouse capacity rather than occupied count.

The approved direction is saved in `.interface-design/system.md`. Both columns reserve 48px for the selected action/idle hint. Capacity stays in the header; result counts sit beside search. Empty sources and no matches have distinct messages. Pagination clears selection only on the selected side. Refresh preserves scroll and control focus (falling back to search when a control becomes disabled). The redundant management banner is hidden reversibly.
