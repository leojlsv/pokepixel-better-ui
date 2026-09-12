# Buff strip

Status: implemented on `feature/buff-strip-docked`; automated validation complete, in-game validation pending.

## Scope

Keep the native buff strip visible and visually integrated with the top toolbar without recreating it. The Better UI module reuses the existing `.pokeidle-buff-strip`, `.pokeidle-buff-list` and `.pokeidle-event-ticker` nodes and does not copy buff state or handlers.

The strip remains in its original DOM parent. Better UI centers it on the current toolbar and turns the native two-row pills into a compact one-line status rail: name, multiplier/effect and timer remain visible on the same row. The rail uses content width capped to the toolbar/viewport, a 22px minimum pill height, top-only rounding, subtle separators, and removes the standalone shadow/backdrop blur so it reads as part of the toolbar rather than as a second floating panel. Native typography, palette, text and state remain unchanged.

## Lifecycle

The module tracks the current toolbar and buff-strip nodes as its mount key. Toolbar or strip replacement causes normal central lifecycle remounting. Resize and `visualViewport.resize` update geometry without polling or a feature MutationObserver.

Cleanup removes Better UI CSS, markers and custom properties only. The game may continue updating native inline `left`, `top` and `width` values while the module is active; those values are intentionally preserved when the module is disabled.

## Validation

Automated coverage verifies native-node identity, no reparenting, compact one-line composition, geometry updates on resize, exact preservation of current native inline geometry and mount-key replacement behavior.
