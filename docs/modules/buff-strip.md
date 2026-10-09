# Buff strip

Status: implemented and validated in game on `feature/buff-strip-docked`.

## Scope

Keep the native buff strip visible and visually integrated with the top toolbar without recreating it. The Better UI module reuses the existing `.pokeidle-buff-strip`, `.pokeidle-buff-list` and `.pokeidle-event-ticker` nodes and does not copy buff state or handlers.

Better UI moves the existing strip node next to the current toolbar under the toolbar's own DOM parent, so the chips and menu bar share the same structural UI layer instead of approximating that relationship with `z-index`. The original DOM position is held by an inert comment anchor and restored on cleanup; buff/list/ticker nodes, state and listeners are never recreated. Better UI then centers the strip on the toolbar and turns the native two-row pills into a compact one-line status rail: name, multiplier/effect and timer remain visible on the same row. Docking is adaptive: with the toolbar at the bottom the rail attaches to its upper edge; with the toolbar at the top it flips to the lower edge so it stays inside the viewport. Menu dropdown placement treats the current buff rectangle as an obstacle: a popup moves fully above or below the chips with a 4px gap, and if neither full placement fits it uses the larger free region with its existing vertical scroll. Buff geometry changes notify an already-open menu so it cannot become overlapped after chips are added, removed or resized. Native BOTTOM mode also ships a higher-specificity `top:auto !important` / `bottom:52px !important` rule for the buff strip; Better UI explicitly overrides that positioning before applying its geometry instead of relying on pixel compensation. The rail uses content width capped to the toolbar/viewport, shared PPBUI separators and the metadata scale for timers. It removes standalone wrapper paint so only the chips remain visible. Native text, buff/event state and update behavior remain authoritative.

## Lifecycle

The module tracks the current toolbar and buff-strip nodes as its mount key. Toolbar or strip replacement causes normal central lifecycle remounting. Internal native pill/ticker mutations use the central observer's `buff-strip` scope so only this mounted module is reconciled instead of waking document-wide discovery. Replacing `.pokeidle-buff-list` or `.pokeidle-event-ticker` remains a global lifecycle event because those nodes are part of the mount contract. Resize and `visualViewport.resize` update geometry without polling or a feature MutationObserver.

Cleanup removes Better UI CSS, markers and custom properties and returns the strip to its original DOM anchor when Better UI still owns its layer placement. The game may continue updating native inline `left`, `top` and `width` values while the module is active; those values are intentionally preserved when the module is disabled.

## Validation

Automated coverage verifies native-node identity, structural reparenting into the toolbar layer with exact cleanup restoration, compact one-line composition, automatic above/below docking for bottom/top toolbar positions, precedence over the native BOTTOM `!important` positioning rule, geometry updates on resize, exact preservation of current native inline geometry, mount-key replacement behavior and observer-scope isolation for ordinary internal churn. Final rendered behavior remains user-validated in game.
