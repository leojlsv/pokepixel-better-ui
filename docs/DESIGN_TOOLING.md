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

### Pixel-art direction

`.skills/pixel_art_direction.md` is mandatory when a task redesigns a module's
pixel-art identity or introduces bespoke pixel artwork.

The Lead UI/UX Designer / Pixel Art Director uses both methods. Neither skill
overrides explicit user requirements, architecture/safety invariants, MASTER or
an approved page override.

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

UX/A11y & Design QA reviews the asset family before Feature/Design-System
Engineering integrates it.

## Validation boundary

Concept/asset review does not replace runtime validation. Automated/local checks
remain agent-owned; live PokePixel/Tampermonkey validation remains exclusively
user-owned under `AGENTS.md`.
