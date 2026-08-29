# AGENTS.md — PokePixel Idle Better UI

## Project identity

PokePixel Idle Better UI is a **vanilla+ / native enhancement** project.

It is NOT a redesign.

The original PokePixel Idle interface is the mandatory visual baseline. New
features must look and behave as if they could have shipped with the original
game UI.

## Non-negotiable visual rules

1. Preserve the original visual language.
2. Reuse existing game classes, variables and DOM structures when safe.
3. Prefer moving an existing DOM node over recreating it when the original
   behavior must be preserved.
4. Do not assume `cloneNode()` preserves behavior. Event listeners registered
   with `addEventListener()` are not copied.
5. Add CSS only when the original styles cannot produce the required result.
6. Do not introduce:
   - new visual themes;
   - external fonts;
   - external icon libraries;
   - glassmorphism;
   - blur;
   - new gradients;
   - arbitrary border-radius changes;
   - global scale changes;
   - global window-size changes;
   - new responsive behavior;
   - aesthetic modernization.
7. Any intentional visual deviation requires explicit approval.

## Functional goals

Changes should primarily fall into one of these categories:

- Expose: surface useful information already available.
- Rearrange: move or regroup existing controls.
- Reduce: reduce clicks or navigation friction.
- Extend: add native-looking QoL functionality.

If a change is primarily a redesign, stop and reassess.

## Architecture

- Keep modules independent.
- Use one centralized DOM observer.
- Do not create one MutationObserver per feature.
- Modules must tolerate SPA re-renders.
- A module must be mountable, unmountable and safe to reconcile repeatedly.
- DOM selectors belong in module config/dom files, not scattered across logic.
- Avoid monkey-patching game globals unless explicitly justified.
- Never automate gameplay.
- Never intercept or modify network traffic unless explicitly scoped and
  approved for a feature.
- Prefer progressive enhancement over replacement of game screens.

## Module contract

A module exports:

- `id`
- `shouldMount()`
- `mount()`

`mount()` may return a cleanup function.

The core reconciler decides when modules mount and unmount.

## Code rules

- Keep production code concise.
- Comments explain non-obvious constraints, not change history.
- Do not write changelog entries inside source files.
- Record project changes only in `CHANGELOG.md`.
- Avoid broad catch-all CSS selectors.
- Prefix Better UI-owned classes and attributes with `ppbui-` or `data-ppbui-*`.
- Do not add feature code to `src/core/` unless it is truly cross-module
  infrastructure.

## Git workflow

- `main` is stable.
- Work in feature branches.
- Foundation work uses `feature/foundation`.
- Do not merge into `main` without validation.
