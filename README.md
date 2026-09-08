# PokePixel Idle Better UI

Vanilla+ UI/QoL enhancement layer for PokePixel Idle.

## Principle

The player should notice that the interface became better before noticing that
its design changed.

The original game UI is the visual source of truth.

## Scope

- QoL improvements
- rearrangement of existing controls
- additional information
- search/filter helpers
- reduced interaction friction
- native-looking extensions

Not in scope:

- visual redesign
- gameplay automation
- replacement of game assets

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
- `docs/VISUAL_FIDELITY.md`
- `docs/ARCHITECTURE.md`

## Status

The menu-bar module implements the approved organization of up to 33 native
actions, including Premium Shop, Pack and Gacha under Shop. It reuses action
nodes, native groups and styling, preserves conditional access, and restores
the original structure on cleanup. The example module is still disabled.

The Better UI icon at the end of the native toolbar opens module preferences.
Menu bar can be enabled or disabled immediately, with choices saved in this
browser. The preferences icon remains available when Menu bar is disabled.
See `docs/modules/module-controls-plan.md` for behavior and validation scope.

Run `npm test` for foundation, menu-bar, module-controls, Inventory and Chat regression checks.

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

Hunts (Map) adds compact filtered results and an explicit Locate on map action.
It reuses native filters and markers, preserves zoom, and never starts a hunt.
See `docs/modules/hunts.md` for the native navigation contract and pending
in-game validation.

Team adds compact level/HP tracking to the six native slots, contextual comparison
between selected and active Pokémon, and brings the original action block beside
the profile without replacing its controls. See `docs/modules/team.md`.

Team HUD adds compact HP visibility, fainted state and keyboard access to occupied
native HUD cards without changing combat or leader actions. See `docs/modules/team-hud.md`.

Mark’s Shop adds List/Cards for item purchases and expandable species groups for
Pokémon sales, preserving native checkboxes, purchase controls and sale confirmation.
Group selection reports partial state and selections outside native filters.
See `docs/modules/marks-shop.md` for scope and pending in-game validation.
