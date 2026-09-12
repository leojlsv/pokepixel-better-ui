# Buff strip

Status: implemented on `feature/buff-strip-docked`; automated validation complete, in-game validation pending.

## Scope

Keep the native buff strip visible immediately above the top toolbar without redesigning it. The Better UI module reuses the existing `.pokeidle-buff-strip`, `.pokeidle-buff-list` and `.pokeidle-event-ticker` nodes and does not copy buff state or handlers.

The strip remains in its original DOM parent. Better UI only applies scoped geometry: center on the current toolbar, sit 5px above it, shrink to content width and cap to the toolbar/viewport. The native HUD already lays buff pills and event pills out as one flex row, so their internal layout is left untouched. Native colors, typography, borders, shadows and ticker content remain unchanged.

## Lifecycle

The module tracks the current toolbar and buff-strip nodes as its mount key. Toolbar or strip replacement causes normal central lifecycle remounting. Resize and `visualViewport.resize` update geometry without polling or a feature MutationObserver.

Cleanup removes Better UI CSS, markers and custom properties only. The game may continue updating native inline `left`, `top` and `width` values while the module is active; those values are intentionally preserved when the module is disabled.

## Validation

Automated coverage verifies native-node identity, no reparenting, compact one-line composition, geometry updates on resize, exact preservation of current native inline geometry and mount-key replacement behavior.
