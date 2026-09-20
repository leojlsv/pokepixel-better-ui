# PokePixel Idle Better UI

Pixel-art UI/UX and QoL layer for PokePixel Idle.

## Principle

Better UI owns a coherent pixel-art interface system while preserving the game
rules, authoritative state and safe native integrations underneath it. The
original client is a functional reference, not the visual source of truth.

## Scope

- QoL improvements
- interface redesign and restructuring
- rearrangement of existing controls
- additional information
- search/filter helpers
- reduced interaction friction
- accessible, consistent pixel-art components

Not in scope:

- gameplay automation
- bypassing game/server restrictions
- unrelated replacement of game logic or state

## Development

Requirements:

- Node.js
- npm
- Tampermonkey-compatible browser

Install:

```powershell
npm install
```

Build:

```powershell
npm run build
```

Watch:

```powershell
npm run watch
```

Generated userscript:

```text
dist/pokepixel-better-ui.user.js
```

## Architecture

See:

- `docs/PROJECT_RULES.md`
- `docs/roles/README.md`
- `docs/DESIGN_GOVERNANCE.md`
- `docs/DESIGN_TOOLING.md`
- `docs/ARCHITECTURE.md`
- `design-system/pokepixel-better-ui/MASTER.md`

Every UI/UX change must also pass the review process in `.skills/ui_ux_pro.md`.
Pixel-art redesign/art-direction work additionally uses
`.skills/pixel_art_direction.md`.
In-game interface validation is performed exclusively by the user; automated
tests/builds do not count as an in-game green light.

### Coupled Workspace

The supported multi-account desktop host is the native WinForms + WebView2
implementation under `tools/coupled-workspace-webview2/`. It supports one or two
isolated account sessions in one frame, semantic 1:2 / 1:1 / 2:1 layouts,
Swap/Focus, scoped Home/Reload controls, explicit health state and a Better
UI-native Maintenance Drawer without mirroring gameplay input.

The legacy `tools/coupled-workspace/Start-CoupledWorkspace.ps1` entry point is a
compatibility wrapper to the WebView2 host; the Electron implementation in that
directory is archived/superseded. See `docs/COUPLED_WORKSPACE_STATUS.md` and
`design-system/pokepixel-better-ui/pages/coupled-workspace.md` for the final
acceptance and design records.

## Status

Existing modules were built under the previous native/vanilla visual policy and
remain legacy visual implementations until they are individually reviewed as
Keep, Refine or Redesign. Their functional behavior and historical user
validations remain evidence; a future visual migration reopens validation only
for the changed delivery.

The shared pixel-art runtime now provides namespaced Better UI tokens and opt-in
surface/button/field/state primitives without globally restyling the host game.
Hunts is the first module migrated as a full `reviewed / redesign` pilot.

The menu-bar module implements the approved organization of up to 33 native
actions, including Premium Shop, Pack and Gacha under Shop. It reuses action
nodes, native groups and styling, preserves conditional access, and restores
the original structure on cleanup. The example module is still disabled.

The Better UI icon at the end of the native toolbar opens module preferences.
Menu bar can be enabled or disabled immediately, with choices saved in this
browser. The preferences icon remains available when Menu bar is disabled.
See `docs/modules/module-controls-plan.md` for behavior and validation scope.

Buff strip keeps the game's native buff HUD in a compact single-line surface
immediately above the toolbar, without cloning its state or visual language.
See `docs/modules/buff-strip.md`.

Run `npm test` for the complete regression suite across the core and production
modules.

Inventory groups Search/category/Clear Filters in one row and Sort/Re-Sort/view
buttons in a second row, and preserves the reading position during loot refreshes.
Name, item quantity, Pokémon level, Highest IV, Highest Quality, NPC unit price
and rarity ordering are
available, with original order and always-visible re-sort/reset buttons.
Optional List and Category views preserve native slot actions; the original
grid remains the default. See `docs/modules/inventory.md` for
behavior, persistence and validation limits.

See `docs/modules/menu-bar.md` for the behavior, evidence and validation scope.

Chat adds native controls to hide fixed tabs with × and restore them with +.
It preserves messages, drafts and private tabs, and can be disabled independently
in Better UI. Only fixed-channel keys are persisted. See
`docs/modules/chat-plan.md` for verification. The user has validated and approved the implemented Chat scope; no validation remains pending.

Hunts (Map) is the first full pixel-art pilot. World navigation, a two-group
Filters/Target command deck, the map workspace and the right-side dossier now
share the Better UI design system while retaining the proven native map/action
integration. Marker click selects/inspects instead of starting gameplay; the
Hunt action is explicit inside the dossier, which also owns the original
Classic/Platform selector. Automated validation is complete; user in-game
validation is pending. See `docs/modules/hunts.md` and
`design-system/pokepixel-better-ui/pages/hunts.md`.

Team adds compact level/HP tracking to the six native slots
and brings the original action block beside
the profile without replacing its controls. See `docs/modules/team.md`.

Team HUD adds compact HP visibility, fainted state and keyboard access to occupied
native HUD cards without changing combat or leader actions. See `docs/modules/team-hud.md`.

Mark’s Shop adds List/Cards for item purchases and expandable species groups for
Pokémon sales, preserving native checkboxes, purchase controls and sale confirmation.
Group selection reports partial state and selections outside native filters.
See `docs/modules/marks-shop.md` for scope and pending in-game validation.

Auto Helper groups the native settings editor into Support, Capture and Pokémon destination, with visible save/retry state, resource availability and one destination per quality. See `docs/modules/auto-helper.md`.

Storage adds independent Backpack/Pokémon Center search and filtering, occupied
pagination and native transfer refinements. Pokémon Tools provides the validated
fixed-tag catalog and shared filters across Backpack, Storage and Trade. Trade
also includes the validated filter dialog, item categories and aligned offer
layout. See `docs/modules/storage.md` and `docs/modules/pokemon-tools.md`.

The current Hunts dossier revision, Team HUD and Mark's Shop still require their
explicit in-game closure; automated coverage is already in place.
