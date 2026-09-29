# PokePixel Idle Better UI

Functional UI/UX and QoL layer for PokePixel Idle.

## Principle

Better UI prioritizes functional layout, clear controls, responsiveness and safe
native integration while preserving the game rules and authoritative state.
Better UI now follows the current game's visual language instead of maintaining a
separate pixel-art chrome: shared Game Palette surfaces, game typography and one
global `Squared` / `Rounded` corner preference apply across owned modules.

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

## Development

Requirements:

- Node.js `^22.22.2 || ^24.15.0 || >=26.0.0` (matches the pinned jsdom toolchain)
- npm
- Python 3.10+ for sprite tooling and its offline tests
- Windows PowerShell 5.1 and .NET Framework 4.x for the optional native WebView2 builder

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

Offline developer validation on Windows (no live game or browser):

```powershell
npm run validate:offline:win
```

`npm test` checks the JS application and game-evidence tools. The combined gate
also runs the Python cache tests, an isolated PowerShell/Python launcher fixture
and the userscript build. The WebView2 C# compile is a separate **isolated
candidate** gate: do not rebuild the normal, previously accepted host merely
to validate source changes. On other operating systems, run `npm test`,
`npm run test:python` and `npm run build` separately. The Python cache tests
import NumPy, Pillow, Requests and Beautiful Soup; they require those packages
already installed in the selected Python interpreter (or the corresponding
isolated tool venv). The offline gate deliberately does not fetch dependencies.

Generated userscript:

```text
dist/pokepixel-better-ui.user.js
```

Generated-artifact retention and safe cleanup: `docs/REPOSITORY_LAYOUT.md`.
Use `npm run clean:generated` to preview disposable files; adding `-- --apply`
removes only the allowlisted temporary outputs.

For Tampermonkey validation, replace/re-import the installed script with this generated file after a
build. The local userscript currently has no `@updateURL` / `@downloadURL`, so rebuilding the repository
does not update an already-installed older Tampermonkey copy automatically.

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

### Coupled Workspace

The supported multi-account desktop host is the native WinForms + WebView2
implementation under `tools/coupled-workspace-webview2/`. It supports one or two
isolated account sessions in one frame, semantic 1:2 / 1:1 / 2:1 layouts,
Swap/Focus, scoped Home/Reload controls, explicit health state and a Better
UI-native Maintenance Drawer without mirroring gameplay input.

The legacy `tools/coupled-workspace/Start-CoupledWorkspace.ps1` entry point is a
compatibility wrapper to the WebView2 host; the superseded Electron prototype
and its extension mirror have been removed. See `docs/COUPLED_WORKSPACE_STATUS.md` and
`design-system/pokepixel-better-ui/pages/coupled-workspace.md` for the final
acceptance and design records.

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
Menu bar can be enabled or disabled immediately, and **Aparência → Cantos** selects
exactly one global Better UI geometry: `Squared` (`0px`) or game-style `Rounded`.
The selected mode applies consistently to Better UI-owned/opted-in surfaces without
changing unrelated host-game geometry. Choices are saved in this browser. The preferences
icon remains available when Menu bar is disabled.
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
