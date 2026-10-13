# Buff tracker

Status: **0.2.196 local visual/default corrective pending Product Owner in-game validation.**
The 0.2.195 anti-flicker behavior remains the accepted baseline; automated browser/DOM evidence
for this follow-up is supporting evidence only.

Use the existing native `.pokeidle-buff-strip` as the tracker root. Keep the exact native
`.pokeidle-buff-list`, `.pokeidle-event-ticker`, pills, timers and event handlers. Better
UI adds only a compact tracker header and presentation/position ownership; it never copies
buff state or reconstructs actions.

The structural reference is the World of Warcraft quest tracker: one compact floating
block with a **Buffs** heading, active-count badge and collapse control, followed by one
horizontal row per active effect. Each row keeps name, effect/multiplier and remaining
time readable on the same line. This is a structural reference, not a literal WoW skin.

The tracker follows the **rendered Team HUD width** whenever the Team HUD is available,
rather than maintaining a second unrelated width. Its outer padding, window border/radius,
control-row height, metadata typography and card-like effect rows use the same Better UI
tokens as the enhanced Team HUD. The title/drag handle is compact uppercase body/meta
typography with the shared accent drag glyph, not a decorative serif heading.

The native buff-list and shared event-ticker are separate presentation authorities. Give
buff-list rows the cyan/accent edge and event-ticker rows the selected/gold edge plus a
slightly distinct value surface. Do not infer provenance from names, durations or
multipliers. The archived native source evidence calls the ticker a shared active-events
surface, so code should continue classifying by native container rather than invented
text rules.

The tracker is independent from Poké Hub orientation. Dragging its header moves it freely
within an 8px viewport margin; Arrow keys also move the focused drag handle, with Shift
for a larger step. Position and collapse state use the versioned
`ppbui:buff-panel:v1` record and fail closed on corrupt or future versions. Resize,
collapse and content changes clamp the panel back inside the viewport.

Keep the central Buff Strip observer scope; do not add a feature MutationObserver.
Stable reconciliation must be mutation-free. Continue publishing
`ppbui:buff-strip-geometry-change` for consumers, but free trackers do not constrain
Poké Hub popup height because menu popups render above the tracker.

Collapse hides only the native list/ticker presentation while keeping the header and
active count available. A native `[hidden]` on the entire strip remains authoritative.
Cleanup removes only Better UI-owned header, styles, attributes and listeners and restores
the native strip to its original anchor.

The module is an ordinary optional Better UI module and must always expose a visible
**Buff Tracker** checkbox in the **Interface** section of the Better UI preferences panel.

## 2026-10-12 - final native-strip flicker corrective

The original native strip has its own one-second geometry writer:
BuffEffectsHUD.render() calls attach(), which keeps native style.top aligned to the
current toolbar before updating countdown text. Better UI must not compete for that same
inline top/bottom ownership.

When the Tracker is off and the free Menu Bar needs clearance, Better UI therefore owns only
data-ppbui-menu-native-buff-clearance plus --ppbui-menu-native-buff-clearance-y.
The scoped Menu Bar rule applies that value as presentation-only margin-top; native top,
bottom, classes, timers and nodes remain authoritative. Ordinary timer churn uses the existing
central buff-strip observer scope to recalculate only that clearance, without a feature-specific
observer or a full Menu Bar rebuild.

The final local regression models the native one-second attach() writer and countdown update.
A Chromium smoke held the same native root/list/ticker/pill/handler through 12 ticks with the
native top/priority unchanged, a stable 4 px rendered gap and zero attribute mutations.
The Product Owner then validated the original strip in-game and reported the flicker resolved.

## 2026-10-12 - native strip attachment refinement

When Buff Tracker is disabled and Menu Bar is horizontal, the original native strip should read as
one attached stack with the main bar instead of a second floating window. Better UI therefore:

- uses zero visual gap between the two bars;
- keeps the native strip's own top/bottom geometry authoritative;
- applies the shared Better UI surface/line treatment only while Menu Bar owns the native-strip
  clearance presentation;
- removes the border on the shared seam and keeps radius only on the outer corners;
- flattens the matching Menu Bar corners on the attached side;
- removes the native strip's independent shadow/backdrop blur while attached.

The attachment side is derived from the existing above/below placement calculation and is restored
on Tracker ownership, vertical Menu Bar, hidden/embedded state or cleanup.

Buff Tracker itself is now **opt-in by default**. The default applies only when no persisted module
preference exists; an existing explicit enabled/disabled choice remains authoritative.
