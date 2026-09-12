# Team presets

Status: implemented in the current Better UI baseline. HUD Apply, HUD collapse,
manager controls, native rounding and the resolved FPS regression were validated
in game during the implementation sequence recorded in `CHANGELOG.md`.

## Goal

Save and restore a Team as three independent pieces of state:

1. member composition;
2. official Battle order (`team.member_ids[]`);
3. active/Hunt Pokémon (`team.leader_id`).

The persistent Team HUD is only the quick-access surface. Full maintenance lives inside the native Team window.

## Canonical state

The compact HUD is **not** the source of truth for order. Its creature list may present the active Pokémon first even when that Pokémon occupies another official battle position.

A saved snapshot therefore:

- reads current creature instance IDs from the HUD;
- resolves the same set against a native Team scene/runtime;
- stores members in `team.member_ids[]` order;
- stores the active Pokémon separately as `activeId`;
- stores presentation metadata (`name`, optional `sprite`, optional `level`) only for preview.

If canonical order is not already available, `Save current` opens/reuses the native Team window before saving so an unverified HUD order is never persisted as official.

## Persistence and migration

Current storage key: `ppbui:team-presets:v2`.

Version 1 (`ppbui:team-presets:v1`) is migrated automatically. Because v1 used HUD order, migrated presets are marked `orderVerified: false` and Apply is blocked until the user either:

- reviews/reorders the six members and presses **Confirm order**; or
- presses **Update current**, which captures the current canonical Team order.

## HUD quick access

The Team HUD exposes a compact, collapsed-by-default `Teams` section:

- expand/collapse;
- Save current;
- quick Apply for verified presets;
- Manage, which opens the native Team window and expands the preset manager.

The HUD list shows the saved official positions (`1..6`) and marks the saved active Pokémon with `*`. Rename/delete/reorder maintenance is intentionally not duplicated here.

## Team manager

The native Team window receives an independent Better UI section after the roster. It follows existing native styling and does not resize the window.

Each preset card has a minimum footprint of `260x124` and displays up to six Pokémon side by side in saved Battle order.

Management actions:

- rename preset;
- move preset up/down in the saved list;
- move a Pokémon left/right in saved Battle order;
- choose the saved active Pokémon independently from position;
- confirm migrated legacy order;
- Update current;
- Apply;
- Delete.

## Apply contract

Apply is manually triggered only. It uses the existing `PokeIdle.Api` methods and `team.updated` event payloads used by PokemonCardHost Equip/Unequip. It creates no custom HTTP/WebSocket client and requires no Team window or scene.

Sequence:

1. validate preset and verified order;
2. load Team and inventory through the native API without opening any window;
3. validate all saved creature instance IDs against current Team + native Add Pokémon candidates;
4. await native `removeTeamMember` / `addTeamMember`, emit the native card events and reload confirmed state;
5. preserve the existing full-Team active-transition safeguard when the current active member must leave;
6. await native `setTeamOrder` once with the complete target order;
7. verify `team.member_ids[]` after persistence finishes, including rollback on failure;
8. await native `setTeamLeader` and confirm the saved active Pokémon independently;
9. validate exact final composition, order and active ID.

A failure stops the sequence at the first unconfirmed native action. Because the original client does not expose an atomic whole-Team transaction, a native failure after confirmed steps may still leave a partially changed Team.

## Intentional limits

- No scheduled, hunt-driven, combat-driven or background team switching.
- No network interception or custom Team endpoint.
- Native action/server restrictions remain authoritative; preflight preserves capacity, active-removal and fainted-leader safeguards.
- Creature instance ID is the only identity used for Apply; species name is never used as a substitute.
- Legacy order is never trusted silently.
- The Team window remains open after Apply/Manage so the authoritative result is visible.

## Regression scope

`test/team-presets.test.js` covers:

- v1 -> v2 migration and order verification;
- official order and active ID persistence;
- the reported case where HUD active order differs from `member_ids[]`;
- collapsed HUD and mutation-free stable reconciliation;
- manager `260x124` minimum card and manual saved-order editing;
- exact composition + Battle order + active Apply;
- order-only Apply with active Pokémon outside position 1;
- full 6/6 active replacement followed by order restoration;
- zero-mutation abort for legacy/unavailable presets.

## In-game validation record

The implementation was iterated and validated in game across the main user
flows: applying from the HUD without opening Team, composition/order/active
restoration, HUD minimization behavior, manager controls, visual hierarchy,
native rounding and performance after the sync regression fix. Automated tests
continue covering migration, unavailable members, order verification, exact
final state and cleanup.
