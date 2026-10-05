# Hunt controls

Category: Contextual navigation. This adapter applies only to the classic Hunt HUD
contract exposed by `PersistentHUD` through `.pokeidle-map-action-bar`. The separate
`PlatformHunt` renderer owns its own header/actions and is outside this module's scope.

## Product behavior

While Menu Bar is enabled, the original native `Return to City` button is moved intact
to the beginning of the Better UI `City` popup. It spans the popup width as a compact
secondary navigation action. The City trigger receives a small localized `Voltar` /
`Return` availability badge while the classic Hunt action bar is active, and its
accessible name also exposes the available return action. Outside an active Hunt the
same native button stays in the popup but is context-hidden and skipped by keyboard
menu navigation.

The persistent global `Capture` button remains connected to its native action bar but
is visually suppressed while Better UI owns this adapter. Better UI does not call its
handler, replace its node or alter capture rules. Per-Pokémon capture prompts remain
native and are not consumed by this module.

Conditional `Revive` remains in `.pokeidle-map-action-bar` with its native node,
handler, `hidden` state and disabled state. With Return moved and Capture suppressed,
Revive is the only possible control in that lane. Better UI removes the action-bar
shell chrome and pointer hitbox; when native Revive is hidden, the shell therefore
collapses to no visible control. The classic action lane is kept bottom-centre and no
longer follows the retired fixed top/bottom menu-position preference.

## Native authority and lifecycle

Public `PersistentHUD.js` was inspected for the current contract: Return has its own
direct click listener and delegates to the native `HuntSimStage.stopHunt()` path;
Capture delegates to `throwBestCapsule()`; Revive is independently synchronized by
the host. Moving the exact Return node therefore preserves its handler and host-driven
disabled/pending state. No gameplay state, network traffic or game globals are patched.

The module mounts only when both the native classic action bar and the current Better
UI City integration target exist. Menu Bar exposes that target explicitly and emits
`ppbui:menu-before-teardown` before restoring/removing its groups. Hunt Controls uses
that hook to return the exact Return node through a comment origin while the native
bar is still connected. If the origin/action bar is already detached, the stale moved
node is discarded instead of being inserted into a replacement bar; the replacement
host must supply its own current Return node.

The mount key tracks the action bar, exact Return and Capture nodes plus City group,
trigger and popup identities. Revive is rediscovered during reconciliation because
its conditional availability does not define adapter identity. Menu Bar disable,
toolbar replacement, action-bar replacement and normal cleanup are therefore all
reversible without cloning handlers or resurrecting stale controls.

## Keyboard and accessibility

The moved Return button uses Menu Bar's explicit contextual-action contract rather
than impersonating a native destination or Better UI-owned City shortcut. In an active
Hunt it is the first City popup item for Arrow/Home keyboard navigation. When the Hunt
is inactive, the contextual visibility contract removes it from that navigation set.
The availability badge is non-interactive and hidden from assistive technology; the
City trigger's accessible label carries the same availability context and is restored
through Menu Bar ownership on teardown.

The button keeps its native localized text and disabled state. Better UI supplies only
secondary-navigation presentation, the shared 2px focus treatment and a larger minimum
target for coarse pointers.

## Validation scope

`test/hunt-controls.test.js` covers exact native node/listener preservation, Capture
masking, untouched per-body capture UI, Revive ownership, active/inactive keyboard
availability, cleanup, runtime Menu Bar disable/re-enable, native action-bar replacement,
toolbar replacement and stable reconciliation.

Live game validation remains Product Owner-owned.
