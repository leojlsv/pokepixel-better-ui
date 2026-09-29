# Buff strip

Status: implemented and validated in game on `feature/buff-strip-docked`.

## Scope

Keep the native buff strip visible and visually integrated with the top toolbar without recreating it. The Better UI module reuses the existing `.pokeidle-buff-strip`, `.pokeidle-buff-list` and `.pokeidle-event-ticker` nodes and does not copy buff state or handlers.

The strip remains in its original DOM parent. Better UI centers it on the current toolbar and turns the native two-row pills into a compact one-line status rail: name, multiplier/effect and timer remain visible on the same row. Docking is adaptive: with the toolbar at the bottom the rail attaches to its upper edge; with the toolbar at the top it flips to the lower edge so it stays inside the viewport. Native BOTTOM mode also ships a higher-specificity `top:auto !important` / `bottom:52px !important` rule for the buff strip; Better UI explicitly overrides that positioning before applying its geometry instead of relying on pixel compensation. The rail uses content width capped to the toolbar/viewport, a 22px minimum pill height, square 0px dock geometry, shared PPBUI separators and the 10px metadata scale for timers. It removes the standalone shadow/backdrop blur so it reads as part of the toolbar rather than as a second floating panel. Native text, buff/event state and update behavior remain authoritative.

## Lifecycle

The module tracks the current toolbar and buff-strip nodes as its mount key. Toolbar or strip replacement causes normal central lifecycle remounting. Resize and `visualViewport.resize` update geometry without polling or a feature MutationObserver.

Cleanup removes Better UI CSS, markers and custom properties only. The game may continue updating native inline `left`, `top` and `width` values while the module is active; those values are intentionally preserved when the module is disabled.

## Validation

Automated coverage verifies native-node identity, no reparenting, compact one-line composition, automatic above/below docking for bottom/top toolbar positions, precedence over the native BOTTOM `!important` positioning rule, geometry updates on resize, exact preservation of current native inline geometry and mount-key replacement behavior. Final TOP and BOTTOM behavior was validated in game by the user after the native BOTTOM positioning conflict was corrected in `825c95d`.
