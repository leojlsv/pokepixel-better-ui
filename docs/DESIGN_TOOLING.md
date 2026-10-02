# Design Production and Tooling

## Purpose

Better UI separates **design direction** from **art production tooling**.
Project-native skills and approved design documents define the direction. Image
generators/editors are optional tools used only when a concrete asset brief needs
them.

## Required design methods

### UI/UX review

`.skills/ui_ux_pro.md` is mandatory for any task that changes layout, styling,
interaction, feedback, accessibility, motion, responsiveness, typography, color
or visual hierarchy.

### Game-integrated visual direction

Normal Better UI chrome follows the current game-integrated MASTER baseline; a
separate pixel-art identity is no longer a product goal. `.skills/pixel_art_direction.md`
is relevant only when a task explicitly introduces or edits domain pixel artwork
(for example a sprite or illustrated game asset), not for ordinary panels,
controls, typography or layout.

No design method overrides explicit user requirements, architecture/safety
invariants, MASTER or an approved page override.

## Concept-first rule

For a complete module/screen redesign:

1. freeze functional/native integration constraints;
2. establish one coherent visual concept;
3. inventory every visible component family;
4. classify each existing family as `MATCH`, `REFINE`, `REDESIGN`,
   `ASSET NEEDED` or `REMOVE`;
5. define complete interaction-state treatment;
6. decide what stays DOM/CSS and what genuinely requires artwork;
7. record reusable rules in MASTER and module-only rules in the approved page
   override;
8. hand a concrete implementation brief to engineering.

Do not assemble a screen from unrelated generated controls and then treat the
result as a design system.

## DOM/CSS versus raster

Keep these as DOM/CSS by default:

- panels and layout;
- buttons, inputs, selects and tabs;
- text, labels and numeric data;
- focus/hover/pressed/selected/disabled/loading/error states;
- responsive/container behavior;
- ordinary borders, shadows and separators.

Raster assets are appropriate for:

- bespoke icons/emblems;
- decals and identity marks;
- ornamental frames or thematic separators;
- pixel illustrations whose value cannot be represented cleanly with
  maintainable CSS.

Raster artwork must never replace live text/semantics merely for aesthetics.

## External tools

The project has **no required external art-generation integration**. SpriteCook,
image-generation systems, graphics editors or other tools may be used by the
Pixel Artist / Asset Producer when they help execute an approved brief.

Rules:

- external tooling is never a design authority;
- no MCP/plugin/tool server is required for normal development;
- do not vendor third-party skill repositories into `.skills/`;
- do not store credentials, authorization headers or expiring URLs in the repo;
- output remains a candidate until design review/adoption;
- rejected/exploratory generations stay outside the repository.

## Reference and asset storage

Store approved visual references under:

`design-system/pokepixel-better-ui/references/<module>/`

Production assets that ship with Better UI belong in the normal `assets/`
pipeline, not in the design-reference folder.

When an adopted asset needs provenance/recovery metadata, use a small module-local
`asset-manifest.json` containing only stable non-secret fields, for example:

```json
{
  "assets": [
    {
      "file": "marker-emblem.png",
      "sha12": "...",
      "source": "generated-or-authored",
      "label": "Hunt marker emblem"
    }
  ]
}
```

Tool-specific stable IDs may be added when useful, but the manifest format must
not make one external provider a project dependency.

## Asset handoff

The Pixel Artist / Asset Producer returns:

- candidate files;
- intended runtime size/grid;
- state/variant relationships;
- transparency/scaling notes;
- provenance/license information when relevant;
- hash/manifest metadata for adopted files.

Visual Regression Reviewer reviews the rendered asset family before
Feature/Design-System Engineering integrates it. UX/A11y QA is additionally
required when the asset changes interaction semantics, labels or accessibility.

## Validation boundary

Concept/asset review does not replace runtime validation. Automated/local checks
remain agent-owned; live PokePixel/Tampermonkey validation remains exclusively
user-owned under `AGENTS.md`.

## Project-wide Game Palette baseline

The Product Owner-approved Pokémon Profile palette is now the project-wide Better
UI baseline for every owned module:

- Window: `#161D20` at `92%` alpha;
- Interactive: `#232C2E` at `96%` alpha;
- Values: `#161D20` at `85%` alpha;
- Lines: `#6B6543`, `1px`, `100%` opaque.

Text and semantic gameplay colors remain opaque. Body/controls follow the current
game stack `Inter, "Segoe UI", Arial, sans-serif`; display/window titles use
`Cinzel, Georgia, serif`. Better UI uses one fixed corner geometry matching the current
PokéPixel reference: 8px windows, 5px controls/cards and 4px badges. There is no corner
mode selector or persisted appearance choice; legacy `ppbui:appearance:v1` data is
retired and removed during startup.

## Pokémon Profile Color Lab

`tools/pokemon-profile-playground/pokemon-profile-playground.html` is the local design sandbox for Pokémon
Profile and the augmented native PokémonCard. `Game Palette` starts from the
Product Owner-approved production baseline; subsequent playground edits remain
preview-only until a new export is explicitly approved for implementation.

The Color Lab exposes role-based colors instead of one-off selector colors. Its
Game Palette now mirrors the project-wide runtime baseline above. Pokémon type and
rarity colors stay semantic/native rather than being flattened into the neutral
palette.
Surface transparency is controlled independently from color through three inherited
alpha roles: Window `92%`, Interactive `96%`, Values `85%`. Alpha never applies to
text, semantic type/rarity colors or the `1px` line system.

Use **Copiar paleta** for the compact role/value handoff or **Copiar CSS** when an
exact preview snapshot is needed. Current/Obsidian remain comparison skins; only an
explicitly approved exported palette should be promoted to runtime CSS.
