# Team presets

Status: the existing Team/Saved-Team behavior, Shared Stone correction and Saved Team HUD
width correction remain Product Owner live-validated. Exact candidate **0.2.22** adds one
new authoring path in the **full Team manager only**: `Create team` builds a Saved Team from
Pokémon currently in Backpack without equipping or otherwise changing the live Team. The
existing `Save current`, HUD quick recall and Apply behavior remain unchanged. Local functional,
Technical, UX/A11y and render-first Visual gates are green on the exact candidate; Product Owner
live validation of this new manual-creation flow is still pending.

The 2026-09-23 Full Team dossier adds a second **presentation only** use of the same canonical
v2 store: inside the selected Pokémon profile, `team-presets` filters presets by exact member
`creatureId` and renders saved position, saved active state, legacy-order warning and the compact
formation strip. This projection has no Apply/Rename/Delete/Reorder controls; its sole Manage
action opens the existing full manager. It is rebuilt when native Team refresh replaces the
profile and remains independent of the Saved Movesets module.

The current Miyazaki 16 manager keeps the dense footer contract
(`< Active > + Update saved team + Apply`), full-width manager rows and the contiguous
six-member formation. Scoped high-specificity rules keep native fields/controls square.
The 19:57 Product Owner review rejected the universal 60px Team-family composition. Saved Team
now uses dedicated identity/order tokens instead of projecting live-combat telemetry into a
snapshot: six stable positions, sprite/fallback and active state, with no live HP/Fainted meter.
The HUD exposes one section-level Manage action and one Apply action per preset. After the
20:20 live review, disclosure + Manage render as one integrated toolbar instead of adjacent
boxed buttons. The 20:30 review rejected the remaining button chrome, so verified Apply now
uses the shared dark-surface/blue-action primary rather than a solid fill. The full manager
keeps preset maintenance, member maintenance and footer actions as separate hierarchy levels.
The 21:08 partial approval retained that direction and requested square PPBUI chrome for the
Team-name and Saved-Team rename fields plus a lighter 1px normal control edge. The 21:17 review
then showed that styling alone was insufficient: the rename field still lacked clear affordance and
the maintenance/actions were competing as undifferentiated button clusters. The manager now uses a
persistent visible Team-name label, hides irrelevant preset reorder controls, separates Delete,
distinguishes actionable `Set active` from current `Active`, and reports Apply/Update pending/error/
success state locally on the affected preset card.
Preset behavior, the FPS fix and canonical Apply contract remain unchanged.

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
- presses **Update saved team**, which captures the current canonical Team order.

## HUD quick access

The Team HUD exposes a compact, collapsed-by-default `Teams` section:

- expand/collapse;
- Save current;
- quick Apply for verified presets;
- Manage, which opens the native Team window and expands the preset manager.

The HUD list shows saved official positions (`1..6`) and a distinct active-member
state. By Product Owner approval on 2026-09-14, preset-list `↑/↓` ordering controls
were removed from the HUD. Rename/delete/reorder maintenance is available only in
the full Team manager; the HUD is limited to Save current, preview, Apply and Manage.
Member previews share the common Team position/active/focus grammar but use the dedicated
Saved Formation token geometry. Every row renders six position cells, including empty cells
for partial teams, so order remains spatially stable. A preset never reads current HP/Fainted
state merely for visual parity; live combat hits and faint/revive transitions therefore do not
rebuild or mutate the saved identity tokens. Sprite art may still be resolved from the current
native HUD when missing from older saved metadata, without turning that HUD into the source of
truth for saved order or identity metadata.

## Pokémon dossier projection

The profile projection is read-only context, not another manager. Membership is determined only
by `preset.members.some(member => String(member.id) === selectedCreatureId)`; species identity is
never a fallback. The same `store` instance owned by Team Presets supplies both this projection and
the full manager, so no second localStorage reader or formation source is introduced.

The projection sits after Saved Movesets when that module is present, otherwise after the selected
Pokémon command controls/hero. Native profile replacement is handled by reacquiring the new profile
and inserting a fresh owned node; the persistent full-manager body guard never preserves a stale
profile projection. Stable sync is signature-gated and mutation-free when selection/store data did
not change.

## Team manager

The native Team window keeps the full Saved Teams manager below the Pokémon dossier. Native Vitals and Attributes are both intentionally hidden
by the current Team redesign while their DOM nodes remain preserved. The manager follows
the approved square PPBUI visual grammar; with no saved presets it keeps the native
`<details>` disclosure semantics while reducing empty-state padding/weight. It does not resize the Team window beyond
the existing 340px minimum.

Each preset card fills the available manager width and displays six stable position tokens
side by side as one contiguous formation strip in saved Battle order, including empty positions for partial formations. The Team manager retains its scoped **340px** minimum. Shared PPBUI
controls own alignment and spacing: preset-level reorder/Delete and member-level left/right controls
use the standard **28px** desktop icon target, while coarse-pointer variants expand to 40px.
Preset reorder is omitted when only one preset exists. The editable saved-team name has a persistent
visible label. Selection is already shown by the pressed/selected formation token, so the manager
does not add a second `Selected: Pokémon · N/6` text row. `Set active` is a standard-height primary
only while actionable; for the current member the same control reads `Active` as a green status.
The footer keeps `← / Active / →` at the left and places secondary `Update saved team` plus the
dark-surface/blue-action primary Apply on the same row at normal width. Delete is spatially isolated
from reorder controls rather than reading as a third navigation icon.

Management actions:

- rename preset;
- move preset up/down in the saved list;
- move a Pokémon left/right in saved Battle order;
- choose the saved active Pokémon independently from position;
- confirm migrated legacy order;
- Update saved team;
- Apply;
- Delete.

### Manual creation from Backpack

The full manager also exposes **Create team** beside the Saved Teams disclosure. This is an
additive authoring flow; it does not replace `Save current` and it is intentionally absent from
the persistent Team HUD.

The composer:

- reads candidates through the existing native `PokeIdle.Api.getCreatures("inventory")` source;
- lets the user choose **1–6 unique creature instance IDs** without invoking the native Add
  Pokémon cards;
- keeps selected members in an explicit authored Battle order and lets the user choose the
  saved active Pokémon independently;
- requires a Saved Team name and persists the resulting snapshot through the existing
  `ppbui:team-presets:v2` storage as `orderVerified: true`;
- preserves the live Team throughout authoring and saving. It never calls
  `addTeamMember`, `removeTeamMember`, `setTeamLeader` or `setTeamOrder`;
- changes the real Team only if the user later presses the existing **Apply** action on the
  saved preset.

Backpack candidates are cached for the lifetime of the mounted composer after the first
successful load so closing/reopening the authoring panel does not create idle API traffic.
**Refresh Backpack** is the explicit reload path. Candidate IDs are deduplicated defensively,
filters operate only on the loaded Backpack snapshot, the list is bounded/scrollable, and empty
Backpack versus no-filter-results states are reported separately. Rebuilding candidate/formation
rows preserves keyboard focus on the corresponding logical member when possible.

Apply and Update disable conflicting manager controls while pending, mark the triggering action and
manager as busy, and expose pending/success/error feedback in the same preset card. Rename failure is
also reported locally instead of silently reverting the field.

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
- full-width manager/contiguous six-member formation and manual saved-order editing;
- exact composition + Battle order + active Apply;
- order-only Apply with active Pokémon outside position 1;
- full 6/6 active replacement followed by order restoration;
- zero-mutation abort for legacy/unavailable presets.

`test/team-presets-composer.test.js` additionally covers manual Backpack authoring:

- ordered verified snapshots with no live-Team mutation calls;
- filtering and the six-member cap;
- Backpack cache/reopen plus explicit refresh;
- duplicate-ID normalization, focus preservation and deterministic active replacement;
- empty Backpack copy and stable composer sync with zero DOM mutations;
- loading/failure/confirmed-empty separation plus initialized filter fallbacks before the first
  successful Backpack response.

## In-game validation record

The **pre-redesign functional baseline** was iterated and validated in game across
the main user flows: applying from the HUD without opening Team,
composition/order/active restoration, HUD minimization behavior, manager controls
and performance after the sync regression fix. Those historical checks included
the former native-rounded presentation. The 2026-09-14 Battle Line / Field Command
visual migration replaced that geometry and then went through the corrective/live-validation
sequence recorded in `docs/TEAM_REDESIGN_STATUS.md`. Shared Stone behavior and the later Saved
Team HUD six-slot width correction are now live-validated. The new manual Backpack composer is
covered by the current **284/284** suite and host-realistic normal/narrow/no-results/empty/error
renders, but its own Product Owner live gate remains open until the exact `0.2.22` flow is exercised
in game.
