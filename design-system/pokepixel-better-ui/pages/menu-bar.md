# Menu Bar customization editor

Version `0.2.183`, freedom/capacity adjustment validated and approved in-game by the
Product Owner at 2026-10-07T17:03:19Z: “Bar custom validada e aprovada.”
Previous `0.2.182` functionality is also approved in-game.
Global MASTER governs tokens, dense-game typography, focus and neutral surfaces.

## Composition

One modal uses a title/profile header, scrolling content and persistent action footer.
The top preview expresses the logical main-rail sequence; horizontal miniature tiles
show icons above complete labels and vertical previews preserve top-to-bottom order.
Groups and item details share a workspace on desktop. Narrow viewports scroll the
content inside the modal, retain action buttons, and keep an explicit way to reach
the selected item's editing controls.

Slots offers 10 through 15 beside Orientation. The counter reports occupied slots
against the selected capacity; an overfull draft keeps its items and editing controls
while explaining the number to free. Save remains unavailable until the draft fits.
The configured capacity controls main-rail geometry, with reserved space for the
native drag/collapse controls. Existing font/icon sizes remain unchanged.

Use existing Better UI 1px lines, 8px window/5px control corners, 10px preview metadata,
11–12px body/controls and system font stacks. Meaning is conveyed through labels,
position numbers, selection outline and insertion indicators; color is supplementary.
Destination names/icons remain from the available native nodes. Missing/restricted
destinations are not disclosed by reading static catalog metadata into the editor.

## Operation

Preview tiles are passive selection controls, not cloned game actions. Explicit
Previous/Next and Move to / Position / Apply provide the keyboard equivalent to
drag-and-drop. Focus remains on a logical current control after real updates; stable
sync preserves DOM identity. Native menu capture shortcuts are suspended only while
the modal is open through its documented scoped integration adapter.

Save applies a draft; Cancel/Escape discards it. Restore default edits the draft.
External changes, persistence failure and protected records use visible status and
explicit resolution controls. Unsaved drafts survive same-trainer native rebuilds,
but are invalidated on trainer change/logout. Every action destination, including
Cards/Game and Better UI, can leave the rail and use any group. Only category
containers remain first-level and contextual Return keeps its native lifecycle.
Grouped Better UI opens the same preferences panel through a marked portal; its
controls and editor remain reachable even after the parent dropdown closes.

## Evidence

Local fixture: `work/menu-layout-183/preview-fixture.js`, with the production Menu Bar,
editor, Module Controls and Card Mode modules, full retained native stylesheet and
static native icon shapes. Test data and dispatch handlers are synthetic. CSP blocks
external access. `render-cdp.mjs` uses one isolated local Chromium profile and exact
viewport emulation; it does not use the player's browser/game session.

Final rendered/source fingerprints and local verdicts are recorded in
`docs/PM_GATE_2026-10-07_MENU_FREEDOM.md`. Local evidence does not establish live approval.
