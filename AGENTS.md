# AGENTS.md — PokePixel Idle Better UI

## Project identity

PokePixel Idle Better UI is a full UI/UX layer for PokePixel Idle with its own
coherent pixel-art visual identity. The original game UI is a functional host and
data/behavior reference; it is not the visual baseline for Better UI.

Visual redesign is allowed when it improves the approved experience and follows
the project design system. Functional game rules, permissions, state and server
constraints remain authoritative.

## Source-of-truth order

For UI/UX work, resolve decisions in this order:

1. explicit user requirements and approvals;
2. safety, gameplay and architecture invariants in this file,
   `docs/PROJECT_RULES.md` and `docs/ARCHITECTURE.md`;
3. `design-system/pokepixel-better-ui/MASTER.md`, specialized locally by a
   module override in `design-system/pokepixel-better-ui/pages/` only when that
   override is explicitly marked approved;
4. the module contract/documentation;
5. the current/native implementation as technical evidence.

`.skills/ui_ux_pro.md` is a mandatory review gate across this decision process,
not a competing visual source of truth. Generic recommendations must be evaluated
against the game context and recorded in the design system when adopted.

## Mandatory UI/UX workflow

For every task that changes how an interface looks, feels, moves or is operated:

1. Read the global design-system MASTER and the module override, if one exists.
2. Read `.skills/ui_ux_pro.md` and perform the relevant analysis/review.
3. Separate functional/native constraints from visual choices.
4. Record reusable product-wide decisions in MASTER; record module-only
   exceptions in the module page override.
5. When external visual tooling is useful, follow `docs/DESIGN_TOOLING.md`.
   Generated concepts/assets are references until explicitly adopted by the
   user and recorded in MASTER or the approved module page override.
6. Implement with scoped Better UI ownership and preserve game behavior unless
   the approved feature explicitly changes an interaction.
7. Run automated/local validation only.
8. Deliver a build and stop for user-owned in-game validation.

If the search data/tools or referenced checklists such as `pro-rules.md` are not
available, use only the verified guidance present in `.skills/ui_ux_pro.md`,
record which referenced resource was unavailable, and complete a project-native
pre-delivery review against MASTER, the module override, accessibility, focus,
responsive behavior, lifecycle and regression checks. Never invent search or
checklist results.

## Functional and architecture invariants

- Keep modules independent.
- Use one centralized DOM observer; do not create one MutationObserver per
  feature.
- Modules must tolerate SPA re-renders and be safe to mount, reconcile and
  unmount repeatedly.
- DOM selectors belong in module config/dom files, not scattered across logic.
- Avoid monkey-patching game globals unless explicitly justified by the feature.
- Never automate gameplay.
- Never intercept or modify network traffic unless explicitly scoped and
  approved for a feature.
- Preserve server/game permissions, eligibility rules and authoritative state.
- Do not create parallel copies of game state when the original state can be
  read safely.
- Reuse native nodes, handlers or APIs when that is the safest way to preserve
  behavior. Native appearance alone is not a reason to reuse a component.
- Prefer moving an existing node over recreating it when original listeners or
  private state must survive. `cloneNode()` does not copy `addEventListener()`
  listeners.
- Every structural enhancement needs a deterministic cleanup path where the
  module contract requires reversibility.

## Visual ownership rules

- Better UI owns its pixel-art design system and may define its own palette,
  typography, spacing, borders, shadows, component dimensions and responsive
  behavior.
- Use `--ppbui-*` for Better UI design tokens.
- Prefix Better UI-owned classes and attributes with `ppbui-` or
  `data-ppbui-*`.
- Do not globally rewrite host `--ui-*`, `--quality-*` or other game tokens.
- Do not use broad catch-all host selectors or a global CSS reset.
- Style native nodes through explicit Better UI scope/classes when they are kept
  for behavioral reasons.
- Dynamic functional geometry/state may remain module-local; shared visual
  decisions belong in the design system.
- Accessibility, focus visibility, keyboard operation, readable contrast and
  reduced-motion behavior are product requirements, not optional polish.

## Module contract

A module exports:

- `id`
- `shouldMount()`
- `mount()`

`mount()` may return a cleanup function. The core reconciler decides when
modules mount and unmount.

## Code rules

- Keep production code concise.
- Comments explain non-obvious constraints, not change history.
- Do not write changelog entries inside source files.
- Record project changes only in `CHANGELOG.md`.
- Do not add feature code to `src/core/` unless it is truly cross-module
  infrastructure.

## Validation ownership — non-negotiable

The coding agent must never install, open, reload, control, inspect or validate
Better UI in the live PokePixel game, the user's game browser, or Tampermonkey as
part of interface validation. In-game visual and functional validation belongs
exclusively to the user.

Allowed agent validation includes unit/integration tests, synthetic DOM fixtures,
static analysis, source inspection, build checks and other non-game local checks.
A UI delivery remains `pending in-game validation` until the user explicitly
reports a green light. Never infer in-game approval from automated tests.

## Git workflow

- `main` is stable.
- Work in task/feature/refactor branches.
- Do not merge a UI delivery into `main` while its required user in-game
  validation is pending.
- Keep automated validation status and user in-game validation status distinct in
  documentation and commits.
