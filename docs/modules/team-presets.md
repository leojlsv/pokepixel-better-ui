# Team presets

Status: implementation branch; requires build/tests and in-game validation before merge.

## Goal

Add manually triggered saved Team compositions to the persistent Team HUD without replacing the native Team window or introducing direct network calls.

## Behavior

- `Times/Teams` is an independent optional module attached to `.pokeidle-team-hud`.
- `Salvar atual/Save current` snapshots the currently loaded HUD team using creature instance `id`, display name and current leader.
- Saving the same preset name updates that preset instead of creating a duplicate.
- Presets can be renamed inline and deleted.
- Applying a preset first validates every saved creature against the current Team plus the native Team scene `_available` collection.
- If any creature is no longer available, no composition change is started.
- The native Team window is opened through its existing `button[data-menu-id="team"]` action when necessary.
- Removal, active-member changes and additions reuse the existing Team slots/actions, `requestEquipPicker()` and native `.team-equip-card` nodes.
- Actions are executed sequentially and each step must be reflected by the original Team scene before the next step starts.
- A full team where the current leader must leave uses a retained living target member as a temporary leader when required.
- The final member set and leader are verified before success is reported.

## Persistence

Presets are stored in `localStorage` under `ppbui:team-presets:v1`.

The stored model is deliberately small:

```json
{
  "id": "...",
  "name": "Hunt",
  "members": [{ "id": "creature-instance-id", "name": "Pikachu" }],
  "leaderId": "creature-instance-id",
  "createdAt": 0,
  "updatedAt": 0
}
```

`name` is presentation metadata. Creature instance `id` is the identity used for validation/application.

If browser storage is unavailable, the module remains usable in memory for the current page session and exposes a warning.

## Intentional limits

- Preset application is only started by an explicit user click. There is no scheduled, hunt-driven, combat-driven or background team switching.
- No HTTP/WebSocket endpoint is called or intercepted by Better UI.
- Native disabled states remain authoritative. A fainted target leader or blocked remove/active action stops the operation.
- Team order is not forced. The original Team client does not expose a reorder action, so a preset guarantees member composition plus leader, not slot ordering.
- A native failure after some confirmed steps can leave a partially changed Team. The module pre-validates availability and stops at the first failure, but the original client does not expose an atomic whole-Team transaction.
- The Team window is intentionally left open after Apply so the user can inspect the authoritative final state or recover from a blocked step.

## Regression scope

`test/team-presets.test.js` covers:

- local persistence and instance-ID preservation;
- HUD snapshot and leader capture;
- sequential native apply;
- full-team current-leader replacement;
- pre-validation that aborts before mutation when a saved creature is unavailable.

## Required in-game validation

1. Save a partial and a full team from the HUD.
2. Reload and confirm persistence.
3. Apply with Team closed and confirm the native Team window opens.
4. Apply a full 6/6 preset with a different active Pokémon.
5. Apply a preset where the current active Pokémon is not in the target team.
6. Confirm a sold/unavailable Pokémon blocks Apply before any member changes.
7. Confirm a fainted target leader is blocked by the native rule.
8. Rename/delete presets and verify no Team action fires.
9. Disable the module in Better UI and confirm the Team HUD returns to its native/Team-HUD-enhanced state without leftover nodes.
