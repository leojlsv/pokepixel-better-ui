# PokePixel Idle Better UI

Better UI is a Tampermonkey userscript that refines PokePixel Idle with a cleaner,
more consistent interface and focused quality-of-life improvements. It reorganizes
existing game surfaces, adds clearer information and practical controls, and keeps
the native game state and rules authoritative.

[![CI](https://github.com/leojlsv/pokepixel-better-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/leojlsv/pokepixel-better-ui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Better UI is an independent community project. It is not affiliated with or
endorsed by PokePixel, Pokémon, Nintendo, Game Freak or The Pokémon Company.

Maintained by **Rhyxus**.

## Principle

Better UI prioritizes functional layout, clear controls, responsiveness and safe
native integration while preserving the game rules and authoritative state.
Better UI now follows the current game's visual language instead of maintaining a
separate pixel-art chrome: shared Game Palette surfaces, game typography and the
current PokéPixel corner geometry apply across owned modules.

## Scope

- QoL improvements
- interface redesign and restructuring
- rearrangement of existing controls
- additional information
- search/filter helpers
- reduced interaction friction
- accessible, maintainable interface components

Not in scope:

- gameplay automation
- bypassing game/server restrictions
- unrelated replacement of game logic or state

## Installation

Better UI is distributed as a Tampermonkey-compatible userscript. Use a tagged
release artifact from the repository's
[Releases](https://github.com/leojlsv/pokepixel-better-ui/releases) page when
available, or build the current source and import:

```text
dist/pokepixel-better-ui.user.js
```

Starting with `v0.2.178`, the production userscript delegates update discovery to
Tampermonkey through a lightweight release metadata asset. Installations on
`v0.2.177` or older need one final manual update to `v0.2.178`; after that,
Tampermonkey can detect newer published releases according to the extension's
own update settings.

The npm package is intentionally marked `private`; GitHub Releases are the
supported binary distribution channel.

## Development

Requirements:

- Node.js `^22.22.2 || ^24.15.0 || >=26.0.0` (matches the pinned jsdom toolchain)
- npm

Install:

```powershell
npm ci
```

Build:

```powershell
npm run build
```

Watch:

```powershell
npm run watch
```

Offline validation (no live game or browser):

```powershell
npm run validate
```

`npm test` checks the Better UI JavaScript application. `npm run validate` runs
the product test suite and rebuilds the userscript.

Release tags use the exact package version (`vX.Y.Z`). The release workflow
revalidates the repository, audits dependencies, verifies userscript license,
version and update metadata, and publishes the generated `.meta.js`, `.user.js`
and SHA-256 checksum.

Generated release files:

```text
dist/pokepixel-better-ui.meta.js
dist/pokepixel-better-ui.user.js
```

Repository layout and generated-artifact policy: `docs/REPOSITORY_LAYOUT.md`.

For Tampermonkey validation, replace/re-import the installed script with this generated file after a
build.

Hunt Story's failed-attempt **IV Total** column requires Hunt Analyzer `1.13.6` or newer, because that
version is the first public-summary build to expose the already-authoritative terminal `ivTotal` scalar
for failed captures.

## Architecture

See:

- `docs/PROJECT_RULES.md`
- `docs/PROJECT_WORKFLOW.md`
- `docs/SKILLS_MATRIX.md`
- `docs/roles/README.md`
- `docs/DESIGN_GOVERNANCE.md`
- `docs/DESIGN_TOOLING.md`
- `docs/ARCHITECTURE.md`
- `design-system/pokepixel-better-ui/MASTER.md`

UI/UX changes use `.skills/ui_ux_pro.md` when design/interaction judgment is
material. Pixel-art redesign/art-direction work uses
`.skills/pixel_art_direction.md` only when that visual direction is explicitly
part of the task.
Project execution is coordinated through the role/gate lifecycle in
`docs/PROJECT_WORKFLOW.md`; external skills referenced by `docs/SKILLS_MATRIX.md`
are supplemental methods and are not vendored into the repository.
Changes that can materially affect layout, readability, clipping, reachability,
control state or interaction require render-first Visual Regression QA;
source/CSS/JSDOM/test evidence cannot by itself establish those rendered claims.
The PM uses `docs/PM_GATE_TEMPLATE.md` to track criterion-level evidence and
authorize handoff.
In-game interface validation is performed exclusively by the user; automated
tests/builds do not count as an in-game green light.

## Status

Existing modules were built under the previous native/vanilla visual policy and
remain legacy visual implementations until they are individually reviewed as
Keep, Refine or Redesign. Their functional behavior and historical user
validations remain evidence; a future visual migration reopens validation only
for the changed delivery.

The shared runtime provides namespaced Better UI tokens and opt-in
surface/button/field/state primitives without globally restyling the host game.
Owned modules consume the project-wide Game Palette and native typography roles;
semantic gameplay colors remain independent.

The menu-bar module implements the approved organization of up to 33 native
actions, including Premium Shop, Pack and Gacha under Shop. It reuses action
nodes, native groups and styling, preserves conditional access, and restores
the original structure on cleanup.

The Better UI icon at the end of the native toolbar opens module preferences.
Menu bar and the other optional modules can be enabled or disabled immediately.
Corner geometry is not configurable: Better UI-owned surfaces use the current game-style
geometry (8px windows, 5px controls/cards and 4px badges) without changing unrelated
host-game geometry. Module choices are saved in this browser. The preferences icon remains
available when Menu bar is disabled.
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

Hunts (Map) uses the shared Better UI design system while retaining the proven
native map/action integration. Marker click selects/inspects instead of starting
gameplay; the Hunt action is explicit inside the dossier, which also owns the
original Classic/Platform selector. See `docs/modules/hunts.md` and
`design-system/pokepixel-better-ui/pages/hunts.md`.

Team adds compact level/HP tracking to the six native slots
and brings the original action block beside
the profile without replacing its controls. See `docs/modules/team.md` and the
current PM gate record in `docs/TEAM_REDESIGN_STATUS.md`.

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and pull-request rules.
Security issues should follow [SECURITY.md](SECURITY.md), not public exploit
disclosure.

## License

Better UI is licensed under the [MIT License](LICENSE). Third-party attribution
and trademark boundaries are documented in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
