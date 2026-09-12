# Design Tooling

## Purpose

Better UI may use external design tooling to explore visual direction and produce
pixel-art assets. Tool output supports the project design system; it does not
replace `design-system/pokepixel-better-ui/MASTER.md` or an approved module page
override.

## Authority

Resolve a UI decision in this order:

1. explicit user requirement and approval;
2. gameplay/safety and architecture invariants;
3. MASTER plus an approved module page override;
4. module functional contract;
5. external concept/reference output;
6. current/native implementation as technical evidence.

`.skills/ui_ux_pro.md` remains the mandatory UI/UX analysis and delivery review
method. SpriteCook is optional visual concept/asset tooling.

## SpriteCook usage

Use SpriteCook when a module needs stronger art direction than tokens/component
CSS alone provide, or when a bespoke pixel-art asset materially improves the UI.

Preferred skills:

- `spritecook-build-ui-kits` + `spritecook-workflow-essentials` for a complete
  window, HUD, dialog, menu or cohesive UI system;
- `spritecook-generate-sprites` for an isolated icon, badge, button decoration,
  divider, frame or ornament;
- `spritecook-upload-assets` when an approved local screenshot/reference needs to
  become an owned SpriteCook reference asset.

Do not vendor the SpriteCook MCP, plugin or official skills into this repository.
They are user-level development tooling and should remain independently
updatable.

## UI-kit workflow

For a complete module redesign:

1. read MASTER, the module page override and `.skills/ui_ux_pro.md`;
2. freeze the functional/integration constraints that the concept must preserve;
3. check SpriteCook credit balance before any multi-image workflow;
4. create one UI kit and establish one coherent concept;
5. present the concept/direction for explicit user adoption before treating it as
   Better UI design guidance;
6. generate/extract component sheets only from the adopted concept when reusable
   visual assets are actually useful;
7. inspect SpriteCook's extraction quality summary and resolve relevant warnings;
8. inventory the current module against the adopted direction using:
   `MATCH`, `REFINE`, `REDESIGN`, `ASSET NEEDED`, `REMOVE`;
9. record reusable adopted rules in MASTER and module-only decisions in the
   approved page override;
10. implement with DOM/CSS as the default and add raster assets only where their
    artistic value justifies the maintenance/runtime cost;
11. run automated/local validation and stop for user-owned in-game validation.

If the UI-kit MCP tools are unavailable in the active agent session, stop the
generation portion and reconnect/restart the SpriteCook MCP integration. Do not
simulate a UI kit by generating unrelated standalone controls.

## Reference and asset storage

Store approved visual references under:

`design-system/pokepixel-better-ui/references/<module>/`

Keep exploratory/rejected generations outside the repository. A committed
reference should explain an adopted direction or preserve evidence needed to
reproduce it.

When SpriteCook assets are adopted, keep a module-local
`spritecook-assets.json` beside the approved references with the minimum stable
metadata needed to recover them:

```json
{
  "assets": [
    {
      "asset_id": "...",
      "sha12": "...",
      "label": "..."
    }
  ]
}
```

`asset_id` is the stable external identifier; `sha12` is the first 12 characters
of the local file's SHA-256. Never store API keys, authorization headers,
presigned URLs or other credentials in the repository.

Production assets that ship with Better UI belong in the project's normal
`assets/` pipeline. The design-system reference folder is not a runtime asset
bucket.

## DOM/CSS versus raster

Keep these as DOM/CSS by default:

- panels and layout;
- buttons, inputs, selects and tabs;
- text, labels and numeric data;
- focus/hover/pressed/disabled/loading/error states;
- responsive/container behavior;
- ordinary borders, shadows and separators.

Raster assets are appropriate for elements such as bespoke icons, emblems,
ornamental frames, decals, thematic separators and other pixel artwork that
cannot be represented cleanly with maintainable CSS.

## Validation boundary

SpriteCook concept review does not replace Better UI validation. Automated/local
checks remain agent-owned; live PokePixel/Tampermonkey validation remains
user-owned under `AGENTS.md`.
