# Changelog

All notable project changes are recorded in this file.

## Unreleased

- Changed the project-wide UI direction from a vanilla/native visual baseline to
  an owned pixel-art design system. Native game UI remains authoritative for
  functional state, rules and safe integrations, but no longer constrains Better
  UI styling. Added mandatory `.skills/ui_ux_pro.md` review governance and made
  live in-game interface validation explicitly user-only. Existing modules remain
  legacy visual implementations until individually reviewed/migrated.

- Reworked desktop Hunts interaction around explicit selection: native marker
  click/keyboard activation now opens a right-side dossier instead of starting a
  Hunt, and hover/focus no longer opens the floating information tooltip while
  Better UI is active. The dossier reuses native visual tokens for Elements,
  exact Weakness/Resistance/Immunity multipliers and valued Drops; Locate opens
  the same dossier without changing zoom. The original Classic/Platform toggle
  node is moved intact into the dossier footer and an explicit Hunt button calls
  the native `_selectedIndex` + `startHunt()` flow. Refresh, filtering, world
  changes, cleanup and full window replacement are covered by regressions. The
  window controls are now grouped into a compact reversible deck using the native
  toolbar, area counter and element filters; empty notices no longer reserve
  space. Native refresh while the dossier is open now preserves relative zoom and
  map center instead of reinterpreting the state against a transient full-width
  viewport.

- Added an optional Buff strip module that turns the native buff/status strip into
  a compact one-line status rail attached to the top toolbar. Timers stay inline
  with their effect, the standalone shadow/blur is removed, and the original
  buff/ticker nodes and state remain intact with reversible cleanup. Docking now
  flips below the toolbar when the native Menu Bar is positioned at the top of
  the viewport, preventing the rail from disappearing off-screen. BOTTOM docking
  now explicitly wins over the game's native higher-specificity `!important`
  buff positioning rule, removing the persistent gap without offset hacks.

- Removed the Auto Helper initial native-UI flash while its settings/inventory
  bootstrap requests are pending. Native pickers and destination grids are hidden
  immediately and the Better UI surface shows an explicit loading state until the
  enhanced controls are ready.

- Refined Trade: item categories combine with search without replacing quantity handlers; inventory uses four slots per row, with a 1000px window minimum. Balance shares the offer currency block, cancellation is secondary, status text is legible, and added Trade controls match the native Portuguese screen.

- Trade: moved Pokémon filters into a bounded four-column dialog with clear/close controls and a persistent result toolbar; aligned offer grids, moved balance below own actions, and normalized tab contrast and action heights. Native trade handlers remain unchanged.

- Fixed Pokémon Center selected rarity borders against the master theme’s explicit gold `border-color: !important` override; the previous variable-only fix did not override that rule.

- Added a persistent Interface toggle to disable Pokémon hover details while retaining native right-click cards. Disabled by default; reversible without reloading.

### Storage refinement

- Storage: preserve rarity borders on selection; fixed four-column extra filters, 980px minimum window width (Backpack: 560px). Filtered deposit/withdraw uses a confirmed snapshot across result pages and native individual transfers; stops on failure.

### Documentation

- Recorded the user's final in-game validation of Buff strip in both Menu Bar
  positions. TOP and BOTTOM docking are approved after the native BOTTOM
  `!important` positioning conflict was corrected in `825c95d`; no validation
  remains pending for this feature.

- Recorded the user's final in-game validation of the `feature/pokemon-tags`
  delivery: fixed Pokémon tags and shared filters across Backpack/Storage/Trade,
  the Trade filter/layout refinements, the Pokémon hover toggle and the latest
  Storage refinements. No additional in-game validation remains pending for this
  delivery.

- Recorded the user’s in-game validation of Storage through 8a4097a: independent filters, occupied pagination, sprites, selection footers, empty states, capacity/results, focus/scroll and bulk confirmation clarity. No validation remains pending for this delivery.

- Recorded the user's in-game validation of Auto Helper in `38b41a7`, including grouped settings, save/close/reopen behavior, consumable selection and per-quality destinations. No in-game validation remains pending for this delivery.

- Recorded the user's in-game validation of `01fbda9`: independently collapsible module themes, enabled/total counters and persisted expansion state. No validation remains pending for this refinement.

- Recorded the user's in-game validation of `a1dafef`: minimizing Team HUD hides the preset section and restoring it preserves its previous disclosure state. No validation remains pending for this fix.

- Recorded the user's in-game validation of `a97f199`: applying presets from the HUD without opening Team, including composition, order, active Pokémon and backpack updates. No in-game validation remains pending for this fix.

- Recorded the user's in-game approval of the compact Team profile labels and uniform button sizing in `4ff2f4c`. Validation is complete for this refinement, including active and non-active Pokémon states.

- Recorded the user's approval of native rounding in Team preset cards and tiles.

- Recorded the user's in-game approval of the Team > Saved teams controls in `c6d8e41`, following confirmation that the FPS regression is resolved. No validation remains pending for these two fixes; no runtime changes in this entry.

- Recorded the user's final in-game validation and approval of Team, including compact profile actions, collapsed comparison, equipped-Pokémon information flow and Add Pokémon name/element/rarity filters; no validation remains pending for this scope.
- Recorded the user's final in-game validation and approval of Hunts (Map), including locate/reset focus, Johto level correction, compact effectiveness badges and valued Drops; no validation remains pending for the implemented scope.
- Recorded the user's final validation and approval of Chat, including native tab management, fixed header actions, keyboard adjustments and the horizontal-scroll/window-growth fix; no validation remains pending for this scope.
- Mapped the Custom UI persistent Chat implementation and proposed native-preserving reuse for Better UI, including fixed-channel visibility, private-tab handling and privacy constraints; no Chat runtime changes yet.
- Recorded the user's final validation and approval of the Inventory module, including all three views, two-row controls, scroll preservation, sorting and item/Pokémon prices; no remaining validation pending for this scope.
- Collected inventory/backpack UX references and native Inventory evidence for scope refinement; no Inventory runtime changes implemented.
- Recorded the user's final validation of the complete menu-bar module; further QoL work is deferred.
- Recorded a future module-control panel requirement, accessible through an icon; no runtime implementation added.
- Recorded the user's validation of the Pack + Premium Shop grouping on 2026-08-31.
- Recorded authorization and implementation of the menu-bar organization plan covering 33 client-defined destinations.

### Changed

- Replaced custom/multiple Pokémon tags with the ten fixed named, colored symbols requested by the user, one per Pokémon. Alt + left click opens assignment/removal without triggering native slot actions. Removed tag editor fields; Tag now lives beside Gender inside More Filters. Added non-destructive v1 migration and interaction regressions.

- Added personal Pokémon tags shared by Backpack, Storage and Trade using trainer-scoped local persistence and individual creature IDs. Added native-looking tag editing, single slot markers/list labels, tag filters and Pokémon-specific rarity/element/advanced filters. Preserved native Trade eligibility and offer contents, Storage transfers and Backpack item filters.

- Recorded the approved Storage design direction. Added stable selection footers, separate result/capacity counters, distinct empty/filter states, pagination selection clearing and focus/scroll restoration. Removed the redundant management banner and enriched the existing bulk confirmation with quantity, destination and unfiltered scope.

- Gave Backpack and Pokémon Center independent search, rarity, element, sort and Clear controls. Removed the visible lower detail panel; selection now places its native transfer button and Pokémon name in the corresponding column. Hover, double-click and bulk transfer semantics remain unchanged.

- Fixed Storage module discovery for native non-blocking windows: resolve the scene from ReactiveWindows by its panel body as well as SceneManager, allowing the enhancement to mount while the map stays active.

- Added the optional Storage module: name/species search across both inventories before pagination, occupied-result page counts, individual native sprite URLs with icon fallback, and a compact empty selection panel. Native slots, transfer actions, bulk scope, capacity, filters and sorting remain intact. In-game validation is pending.

- Raised the toolbar stacking context to the maximum layer while the Better UI menu is open, keeping its preferences above game windows and restoring native stacking when closed.

- Replaced Auto Helper destination dropdowns with a compact Keep/Sell/Extract radio matrix. Rarity labels reuse native quality colors, paused states appear in column headers, and explanations stay in How it works. Exclusive assignments, license locks and saving behavior are preserved.

- Aligned Auto Helper Battle Support into function, consumable and condition rows. Combined Sell/Extraction toggles, license time and per-quality destinations in one native section, with collapsed explanations and explicit paused labels when a master is disabled. Assignments and saving semantics are unchanged; in-game visual validation is pending.

- Reworked Auto Helper visuals after the user rejected the consumable tile layout: compact native selects show resource names and quantities with a selected-item icon; function states share the checkbox row, and redundant Selected lines are removed. Saving and destination semantics are unchanged. Visual approval is pending.

- Added the optional Auto Helper UI module: grouped native controls, visible save status with serialized saves/retry and close flushing, exclusive per-quality sell/extract destinations, full consumable names and selected states, event/manual inventory refresh, and pending-draft/context restoration across native panel recreation. No gameplay actions are added; in-game validation is pending.

- Made module themes independently collapsible using native disclosures. Headers show enabled/total counts even when closed, and each theme remembers its expansion state in separate browser storage. Module enablement, bounded scrolling and fixed footer remain unchanged.

- Bounded the module preferences panel to 480px or the available viewport height. Only the grouped checkbox list scrolls, with native gold/graphite scrollbar styling; title, persistence status and Close remain visible as modules are added.

- Replaced oversized module toggle tiles with compact labeled checkboxes grouped into Interface, Team, and Activities & items. Preserved preference persistence, keyboard focus, dismissal and live reconciliation; descriptions remain visible beside each checkbox.

- Hide the complete Team presets section when the native desktop Team HUD is minimized, using its existing collapsed state and mobile exception. Restoring the HUD preserves the preset disclosure state.

- Decoupled Apply from the Team window/scene. Reused the native PokemonCardHost Equip/Unequip API and event flow, with authoritative Team/inventory reloads and native leader/order operations. Added a regression running Apply with no Team DOM or scene and checking equip/remove/leader/order event payloads.

- Replaced simulated Apply clicks with awaited native Team methods for equip, removal, active selection and complete order persistence. No backpack picker or profile control rendering is required. Verify final state even when native handlers swallow errors; reject unsupported runtimes before changing composition. Added no-click and native-rejection/rollback regressions.

- Fixed preset application across different team sizes: refresh native inventory before preflight, select slots by displayed creature order, wait for membership/order/inventory agreement after equip/remove, and wait for native order persistence to finish instead of accepting optimistic order. Increased action confirmation timeout to eight seconds. Added delayed-update and stale-backpack regressions; saved preset storage is unchanged.

- Refined the Team HUD disclosure into one line: localized Team formations on the left and a subdued saved count on the right, preserving native expansion and management controls.

- Shortened the Team order label to localized `Position X`, preserving native arrow behavior and restoring native text on cleanup. Completely removed Compare with active, including rendering, stat reads, signatures, styles and translations.

- Replaced the browser confirmation for saved-team deletion with the same `PokeIdle.Dialog.confirm` API used by Mark’s Shop sales, including the preset name and destructive-action option. Cancellation, unavailable/failed dialogs and module cleanup never delete a preset; concurrent prompts are suppressed.
- Aligned the native Battle order label with the profile buttons using the same 10px typography, normal weight and spacing instead of the tiny, letter-spaced label.

- Shortened the native active-state profile button to `⚔ Active` (localized) and kept the removal button label concise even when blocked. Full native explanations remain in tooltips and accessible descriptions; disabled rules and handlers remain native. Unified profile controls at 26px height with aligned icons/text and wrapping between controls rather than within their labels. Cleanup restores original text and attributes.

- Grouped all native Pokémon profile actions together: Battle order, Make active, Details and Remove from team now share the compact profile control area. Removed the separate Details/Remove container styling, retained the native destructive treatment and original buttons/handlers, and allowed natural wrapping at narrow widths. Cleanup and SPA refresh preserve original placement and state.

- Restored native rounding to Team preset previews: 4px outer HUD cards and 3px Pokémon tiles, matching the existing HUD rather than imposing square edges. Existing native manager section rounding remains intact.
- Moved the original Team Battle order label/arrows and active-state action beside the Pokémon profile information in a compact wrapping group. Removed the full-width order box while preserving original nodes, handlers, disabled state, translations and native Apply selectors; cleanup restores their original positions.

- Matched the Team HUD saved-team scrollbar to the native theme, centered owned button icons and exposed preset Up/Down ordering in the HUD using the same saved order as the manager. Replaced preview HP/EXP meters with the native primary-element color, retaining level and fainted state; capture/update stores optional color metadata without changing preset IDs, order, migration or Apply behavior. Older presets use known live colors until updated.
- Raised only the enhanced Team window minimum width to 340px so 260px Saved teams cards, native section padding and the scrollbar fit without horizontal clipping. Other window dimensions are unchanged.

- User confirmed the Team Presets FPS regression is resolved in-game. Replaced cramped per-slot controls with one selected-member toolbar per card; native sprite buttons select the target, while Update/Apply share the footer and preset controls have explicit compact dimensions. Sprite sync, Apply, Battle Order and storage semantics are unchanged.

- Fixed the critical Team Presets sync performance regression: Save availability no longer captures a snapshot; live preview sync indexes HUD cards once and reads cached/persisted sprites without computed styles, canvas exports or descendant sprite scans; collapsed previews skip the index entirely. Saved-team change detection compares fields directly without serializing sprite payloads. Unchanged sync produces no DOM mutations, including relative sprite URLs.
- Native sprite extraction remains in capture/update and bounded render/open fallback, with shared weak caches for successful and missing sources. Explicitly reopening retries missing assets, and new snapshots take priority over cached visuals. Apply, Battle Order and storage semantics are unchanged.
- Fitted six Pokémon and their separate maintenance rows inside the Team > Saved teams 260x124 card by constraining slot/button sizing and placing Update/Apply beside metadata. Keyboard focus reveals member controls. Added repeated-sync and layout regressions; real in-game FPS and native visual validation remain pending.

- Fixed Team preset sprite sourcing and member maintenance layout after in-game rejection: HUD/manager previews now resolve the native sprite from `<img>`, canvas, CSS `background-image`/`content`, or loaded runtime fields and persist the resolved sprite on new snapshots; per-Pokémon `← ★ →` controls now occupy a dedicated row below the visual tile instead of overlaying sprite/level content.
- Corrected the Team > Saved teams manager after in-game visual rejection: member cards now recover sprite/current level from the live Team HUD when older saved metadata is incomplete, keep composition as the dominant visual, and hide `← ★ →` maintenance controls until hover/focus while preserving keyboard access and all existing actions.
- Refined the Team preset manager to mirror the approved Team HUD member language with solid slots, visible Battle-order position and `Lv.X`, green active-state treatment, and more subordinate preset/member maintenance controls; functional preset behavior remains unchanged.
- Team HUD preset previews now mirror the existing Team HUD card language instead of generic mini-slots: native sprite/level presentation, compact card proportions, live HP/EXP bars for members currently present in the HUD, fainted state and green active border. Native `.pokeidle-team-card` nodes are never cloned, so original Team HUD actions/selectors remain isolated.
- Refined Team HUD preset cards into a strict two-row hierarchy: team name/count and discreet Manage/Apply controls on the first row, followed by six equal Pokémon slots in official Battle order with level, position and active-state cues on the second row. Functional Team preset behavior remains unchanged; in-game visual validation remains pending.
- Refined Team presets UI after functional approval and UI/UX rejection: fixed HUD collapse visibility, restored readable dark-theme text hierarchy, reused the established gold/gray native palette, compacted secondary actions to icon buttons, and aligned Team manager cards with the visual density used by Team, Hunts and Chat. In-game visual validation remains pending.
- Team presets now preserve official `team.member_ids[]` Battle order separately from the active/Hunt Pokémon, apply native Battle order controls sequentially, migrate v1 presets as unverified, keep HUD access collapsed by default, and add a native Team manager with 260x124 minimum cards for rename/reorder/update/apply/delete maintenance. In-game validation remains pending.
- Fully removed the abandoned Team HUD wallet enhancement and its remaining test fixture and obsolete documentation; the game owns the wallet entirely, with no Better UI controls or deferred wallet features.
- Added `assets/better-ui-icon.png` as an editable local copy of the native Settings icon currently cloned by the Better UI module control; runtime behavior remains unchanged.
- Integrated the approved custom `assets/better-ui-logo.png` into the Better UI module button as an embedded PNG data URL, keeping the userscript self-contained and the native toolbar icon geometry.
- Added an optional Team HUD enhancement with compact HP bars, visible fainted state and keyboard activation for occupied native cards. It reads native CSS state, preserves leader/hover/empty-slot actions and adds no combat or network behavior.
- Exposed current-level Pokémon EXP as absolute progress and percentage in Team HUD bars, using the loaded PersistentHud creature fields while retaining the native percentage text underneath for reversible cleanup.
- Fixed the Team HUD absolute EXP label contrast and stacking so it remains legible above the native blue progress fill.
- Reused the native HP bar text classes for absolute EXP so its font size, weight, color and alignment match HP exactly.
- Applied locale-aware thousands separators to current and maximum HP in Team HUD while preserving the native bar text underneath for cleanup.
- Standardized Team HUD HP and EXP thousands grouping with commas and spaces around `/` (`current / maximum`).
- Added trainer absolute EXP, moved trainer `EXP` and compact `STA` labels beside their native bars, and exposed full values on hover for all Team HUD HP/EXP/STA bars.
- Matched trainer EXP/STA to the Pokémon stat-row structure and native active-bar classes, giving both full-width rows with identical label, bar, fill and text geometry.
- Enforced the trainer EXP/STA two-column row so each full-width bar sits directly beside its label, matching the Pokémon HP/EXP alignment.
- Added the optional Team module for the approved Track, Compare and Build journeys: compact level/HP state in occupied native slots, contextual selected-versus-active stat comparison, and relocation of the original action node beside the profile. Native handlers, disabled rules, order, live rerenders and cleanup remain intact; no gameplay action or network request is added.
- Refined Team density and hierarchy by grouping the original active/details/remove controls in one compact action row and making comparison typography inherit the native window. Added name, element and Ready/Fainted filters plus Clear to the original Add Pokémon picker, operating only on loaded native cards.
- Fixed Add Pokémon filtering against native card display rules, made Compare with Active initially collapsed, and reordered equipped-Pokémon information into profile, vitals, comparison, attributes and compact secondary actions; Make Active remains attached to the profile.
- Returned compact Details/Remove actions to the profile area and replaced the Add Pokémon Ready/Fainted filter with native Pokémon rarity.
- Refined Hunts (Map): Johto is recognized through its native world configuration even when its internal ID differs, and now exposes and initially applies level 1 instead of hiding lower-level hunts behind 100; locating triggers one 800 ms gold sprite flash, then keeps the marker above its neighbors with a thin gold label border and gold text while other names recede to 35% opacity; a native Reset button clears the focus and returns selection to `All (X)` without changing filters or map state; compact relation badges retain only their icon and multiplier over the type-colored background while accessible labels preserve the type name; each Drop is presented as one compact `icon name (currency value)` unit in the native two-column density (77 tests total).
- Extended Hunts (Map) with a located-marker text highlight and a clearer native hover card: Pokémon title, existing Elements, exact defensive Weakness/Resistance/Immunity multipliers and existing Drops. Reused game element badges, constrained the taller card to the viewport, preserved native scrolling/position cleanup and added dual-type/card regressions (75 tests total).
- Added optional Hunts (Map) filtered-result navigation using native markers and controls: compact result selection, explicit locate without starting a hunt, native zoom/pan state integration, empty/error feedback and search/caret preservation through native refreshes. Live game validation remains pending for Hunts only.
- Prevented Chat horizontal-scrollbar pointer presses from reaching the native window-drag starter, which reapplies border-inclusive dimensions and can grow the window on each press. Preserved scrollbar default behavior, native tab actions and drag outside the scrollbar; added repeated-press and cleanup regression coverage (65 tests).
- Kept Chat restore/collapse controls fixed beside the scrollable native tabs in one header row. Stabilized restore-menu ordering to match native channels, returned focus to the selected channel after hiding an inactive tab, and resumed Tab/Shift+Tab navigation from the menu trigger. Verified 64 tests, native window dimensions and collapsed presentation in a synthetic browser preview.
- Added optional native Chat tab management: hide fixed channels with ×, restore with +, retain a visible fixed channel and persist only known channel keys. Preserved original messages, drafts, private tabs and sending; reused native styles and the central lifecycle. Verified 60 tests and a synthetic browser preview; in-game validation remains pending.
- Added per-unit NPC sell prices to Inventory List and descending Price/Rarity sort criteria, using loaded sell_price values and native rarity classes. Standardized Sort option capitalization; retained stable ordering, unknown-value safeguards and original actions (49 tests total).
- Organized Inventory into two rows: Search/category/Clear Filters and Sort/Re-Sort/view buttons; retained native styles and keyboard order. Verified the compact-window horizontal overflow without introducing breakpoints or changing window size.
- Shortened the Inventory placeholder to Search and removed the redundant Sort/Category summary; retained actionable warnings only.
- Added optional List and Category-block views alongside the original grid, reusing native slot nodes, buttons and grid styles; exposed available item/Pokémon facts without loading data or triggering actions. Added view, grouping, refresh and cleanup coverage (43 tests total).
- Increased Inventory search width by 10%, reduced the category's share of flexible space by about 10%, and exposed Re-Sort/Clear Filters as native buttons directly below the sorting row; preserved keyboard order.
- Recorded user validation of the initial Inventory module; placed Sort beside the native category and reduced native search width to 96px as requested.
- Added Pokémon Highest IV and Highest Quality sorting from already-loaded native creature data, with unavailable-value feedback and no API requests.
- Applied the approved Trainer, City, Goals, Events, Social, Tools and Shop organization, with Inventory, Hunts, Mailbox and Settings direct.
- Shop now contains Premium Shop, Pack and Gacha; group labels follow the game language.
- Reused native group triggers and badges; preserved hidden controls and suppressed empty groups without new stylesheets.
- Extended the central lifecycle with optional in-place reconciliation and filtered native-state observation.
- Expanded regression coverage to 21 tests, including all 33 destinations, native event propagation, locale changes and partial action/group replacements.

### Fixed

- Removed non-native `linear-gradient` and `border-radius` styling from Team preset HUD previews to comply with the project's vanilla+ visual rules; added regressions for prohibited CSS and live HP/EXP/level/fainted synchronization without rebuilding preview nodes.
- Included Pokémon native sell_value (with sell_price fallback) in List prices and shared item/Pokémon price sorting; added creature-ID, precedence, zero-value and missing-value coverage (50 tests total).
- Preserve Inventory scroll through loot-driven body rebuilds by rejecting stale-grid scroll events and restoring after rendering, using a unique visible slot anchor when possible. Added scroll/reset/anchor/layout regressions (46 tests total) and verified repeated refreshes in a real browser.
- Keep the Inventory sort select on the stable panel during native body rebuilds and avoid resetting a focused selection; added refresh, keyboard and advanced-sort regressions (39 tests total).
- Cancel pending DOM reconciliation when stopping the application.
- Complete all module cleanups before propagating a teardown error.

### Added

- Added optional Team presets to the persistent Team HUD. Presets store creature instance IDs and leader locally, reuse the native Team window/actions to apply composition changes sequentially, pre-validate unavailable Pokémon before mutation, preserve native disabled rules, and add regression coverage for persistence, idempotent reconciliation, full-team leader replacement and failure-safe validation. In-game validation remains pending.
- Added optional Mark’s Shop with a native item-purchase list, List/Cards switching, expandable Pokémon species groups, group checkbox selection and a hidden-selection summary. Reuses original controls and native sale batches; no direct requests or automatic sales. Added 12 regression tests and a synthetic native-CSS preview; in-game validation remains pending.
- Inventory module with native search/category reuse, collapsible explicit sorting, filter reset and result scope/count.
- Inventory ordering preference, stable ordering during native updates and reversible cleanup; separately configurable in the Better UI panel.
- Eight Inventory regression tests for ordering, native events, synchronous filter rerenders, localized slot data, new items and cleanup.
- Independent Better UI toolbar icon and native-styled module panel, with immediate menu-bar toggling and restoration through the central lifecycle.
- Versioned module preferences in a dedicated localStorage key, cross-tab synchronization and a visible session-only fallback when storage fails.
- Six regression tests for module controls, persistence, keyboard access and integration with menu-bar.
- Native menu-bar grouping of Pack and Premium Shop using the existing action buttons, with reversible cleanup and no added CSS.
- Optional module mount keys for DOM replacement during SPA rerenders.
- Menu-bar DOM regression coverage and a toolbar fixture reused from the original UI capture.

- Foundation regression tests for teardown, restart, mutation coalescing and repeated reconciliation.

- Initial project foundation.
- Modular lifecycle/bootstrap architecture.
- Centralized DOM observer.
- Visual-fidelity and project rules.
- Userscript build pipeline.
