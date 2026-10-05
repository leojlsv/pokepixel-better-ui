---
name: pixel-art-direction
description: "Project-native art-direction method for designing and reviewing coherent pixel-art UI systems, component families and bespoke assets for PokePixel Better UI."
---

# Pixel Art Direction

Use this skill with `.skills/ui_ux_pro.md` whenever a Better UI task changes the
pixel-art visual language, redesigns a complete module/screen, or introduces a
bespoke visual asset.

This skill is an art-direction method. It does not override the user, project
architecture, MASTER or an approved page override.

## 1. Freeze non-visual constraints

Before drawing direction, list what cannot change:

- functional contract and authoritative game behavior;
- integration/lifecycle constraints;
- accessibility and localization requirements;
- available content/data;
- runtime/performance constraints.

Never solve a visual problem by silently changing gameplay or rebuilding trusted
native behavior.

## 2. Establish one coherent concept

For a full module/screen, define one visual concept before treating components
individually. State:

- visual theme in one sentence;
- hierarchy and focal surface;
- density and spacing character;
- edge/border/shadow language;
- use of brand versus domain-semantic color;
- ornament level;
- what deliberately stays visually quiet.

Do not generate unrelated controls independently and then call the result a
design system.

## 3. Inventory every visible component family

List all visible objects, including mundane ones that are often forgotten:

- shell/title/navigation;
- tabs/segmented controls;
- search, inputs, selects and native browser affordances;
- filter chips/badges;
- primary/secondary/ghost/destructive actions;
- map/list/card rows and labels;
- markers/sprites/icons;
- detail/dossier/dialog surfaces;
- empty/loading/error/status feedback;
- scrollbars and separators;
- tooltips/popovers;
- responsive/touch adaptations.

Every visible family must receive an intentional treatment or an explicit
decision to preserve the native/domain presentation.

## 4. Classify migration state

When redesigning an existing module, classify each family:

- `MATCH` — already expresses the approved direction;
- `REFINE` — structure is sound but treatment/state hierarchy is incomplete;
- `REDESIGN` — visual/interaction composition must change;
- `ASSET NEEDED` — bespoke raster artwork adds value CSS/DOM cannot express well;
- `REMOVE` — redundant, conflicting or host-leaking presentation should disappear.

Do not use `ASSET NEEDED` as a shortcut for ordinary controls, text, borders or
layout.

## 5. Design complete state families

For every interactive component specify, when applicable:

- default;
- hover;
- pressed;
- selected/current;
- focus-visible independent of selected state;
- disabled;
- loading/pending;
- error/success/warning.

State families must remain recognizable as the same component. Do not create a
different art style per state.

## 6. Use pixel-art principles intentionally

- follow MASTER's pixel unit and spacing rhythm;
- prefer crisp hard edges and deliberate stepped geometry;
- use hard shadows/elevation with a consistent light/depth model;
- reserve ornament for hierarchy, identity or affordance;
- avoid visual noise, faux-retro effects and tiny text used only for nostalgia;
- keep sprites/icons on consistent source grids and scale pixel-perfectly;
- maintain clear silhouettes at actual runtime size;
- let domain-semantic colors remain semantic rather than recoloring everything to
  the brand accent.

Pixel-art identity comes from a coherent grammar, not from adding more pixels.

## 7. Decide DOM/CSS versus raster

Prefer DOM/CSS for live text, layout, buttons, fields, tabs, focus/state feedback,
responsive behavior, ordinary borders/shadows and dynamic data.

Use raster artwork for bespoke icons, emblems, decals, ornamental frames,
thematic separators or other art whose visual value cannot be maintained cleanly
with CSS.

Raster artwork must never hide accessibility semantics or force text into an
image.

## 8. Review hierarchy before polish

Before approving decorative detail, verify:

- the primary workspace is visually dominant;
- utility chrome does not compete with content;
- selected/focus/current states are unmistakable;
- frequently repeated actions remain spatially stable;
- nested borders/cards do not flatten hierarchy;
- small-window/touch behavior preserves the task flow.

## 9. Required Lead Designer output

For a module redesign return:

```text
DESIGN INTENT
NON-VISUAL CONSTRAINTS
COMPONENT INVENTORY
MIGRATION CLASSIFICATION
ART DIRECTION
COMPONENT + STATE TREATMENT
DOM/CSS VS ASSET PLAN
RESPONSIVE / ACCESSIBILITY CONSTRAINTS
IMPLEMENTATION BRIEF
DESIGN ACCEPTANCE CHECKS
```

The implementation brief must be concrete enough that an engineer does not need
to invent the visual hierarchy while coding.

## 10. Rendered-result verification boundary

Art direction is a specification, not proof that the implementation rendered
correctly. Never approve a visible implementation merely because its CSS uses the
right palette, radius, spacing tokens or pixel classes.

For every changed visible family, the implementation handoff should make a
representative rendered comparison possible when practical. Visual Regression QA
then checks the actual result at runtime scale for:

- silhouette and pixel crispness;
- exact geometry, seams and alignment;
- spacing and hierarchy;
- hover/pressed/selected/focus/disabled visuals;
- clipping, overflow, wrapping and scrollbar treatment;
- host-style leakage;
- unintended changes to already-approved neighboring surfaces.

If no representative render exists, the correct result is `VISUAL EVIDENCE
INSUFFICIENT`, not approval inferred from source or automated tests.
