# AGENTS.md — PokePixel Idle Better UI

## Project identity

PokePixel Idle Better UI is a functional UI/UX and QoL layer for PokePixel Idle.
Its primary product goals are clear layout, usable controls, responsive behavior,
maintainable native integration and accurate state. The original game UI is the
authoritative functional host and data/behavior reference.

The historical pixel-art/Miyazaki design system may remain where it is harmless,
but visual-theme fidelity is no longer a product requirement or acceptance gate.
Simplify legacy styling when it interferes with layout, compatibility or
maintainability. Functional game rules, permissions, state and server constraints
remain authoritative.

## Source-of-truth order

For UI/UX work, resolve decisions in this order:

1. explicit user requirements and approvals;
2. safety, gameplay and architecture invariants in this file,
   `docs/PROJECT_RULES.md` and `docs/ARCHITECTURE.md`;
3. the module functional contract/documentation;
4. the current/native implementation as technical evidence;
5. `design-system/pokepixel-better-ui/MASTER.md` and approved module overrides
   only when a task explicitly includes visual/art-direction work.

`.skills/ui_ux_pro.md` is a mandatory review gate across this decision process,
not a competing visual source of truth. Generic recommendations must be evaluated
against the game context and recorded in the design system when adopted.

## Role governance

`docs/roles/README.md` defines the project roles, authority matrix, activation
rules, write ownership and handoff contract for multi-agent work.
`docs/PROJECT_WORKFLOW.md` defines the Project Manager lifecycle, gates and task
states. `docs/SKILLS_MATRIX.md` maps approved project-native and supplemental
external skills to each role without making third-party catalogs project
authorities.

- Every delegated task must name the active role.
- The Project Manager / Coordinator owns the Acceptance & Evidence Matrix, task
  orchestration, gate progression and **handoff authorization**. The PM is
  accountable for false readiness and must reject evidence that does not prove
  the claimed result.
- One shared authority surface has one write owner per task/run.
- Design authors do not approve their own design as UX/A11y QA or Visual
  Regression QA.
- Implementation authors do not provide the final QA verdict for their own diff.
- Reviewers report findings back to the owning role rather than editing the work
  under review.
- Visual Regression QA is required when a change can materially affect layout,
  readability, clipping, reachability, control state or interaction. Theme/style
  fidelity by itself is not a release blocker.
- Generic `READY` is not a valid project status. Readiness must be domain-specific:
  `TECH READY`, `UX READY`, `VISUAL READY`; missing representative visual evidence
  is `VISUAL EVIDENCE INSUFFICIENT`.
- Unresolved conflicts between valid authorities are escalated to the user.

## Mandatory UI/UX workflow

For every task that changes how an interface looks, feels, moves or is operated:

1. Project Manager records observable `AC-*` acceptance criteria and required
   evidence before implementation.
2. Read the global design-system MASTER/module override only when visual or
   art-direction work is explicitly in scope.
3. Read `.skills/ui_ux_pro.md` when design/UX judgment is required.
4. For pixel-art redesign/art-direction work, also read
   `.skills/pixel_art_direction.md`.
5. Separate functional/native constraints from visual choices.
6. Record reusable product-wide decisions in MASTER; record module-only
   exceptions in the module page override.
7. When bespoke artwork is justified, follow `docs/DESIGN_TOOLING.md`; external
   generators are optional production tools, never a required pipeline stage or
   a design authority.
8. Implement with scoped Better UI ownership and preserve game behavior unless
   the approved feature explicitly changes an interaction.
9. Run Technical QA and any triggered UX/A11y QA.
10. When layout/readability/reachability/clipping/control-state risk is material,
    run Visual Regression QA against qualifying rendered evidence. Do not block
    functional compatibility work solely on legacy theme fidelity.
11. PM audits criterion-level evidence and authorizes the handoff class.
12. Deliver the exact candidate and stop for user-owned in-game validation.

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
- Gameplay automation is allowed only when it is explicitly in the approved feature
  scope. It must preserve server/game permissions, eligibility and authoritative
  state, define deterministic failure/retry behavior, and remain user-controllable.
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

- Better UI may define scoped palette, typography, spacing, borders, shadows,
  component dimensions and responsive behavior when those choices improve the
  current interface; no specific historical visual theme is mandatory.
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
Better UI in the live PokePixel game, the user's game browser, or Tampermonkey.
This boundary applies regardless of whether the action is described as
validation, research, debugging, design review or implementation support. Live
visual and functional validation belongs exclusively to the user.

Allowed agent validation includes unit/integration tests, synthetic DOM fixtures,
static analysis, source inspection, build checks and other non-game local checks.
A UI delivery remains `pending in-game validation` until the user explicitly
reports a green light. Never infer in-game approval from automated tests, local
renders or reviewer verdicts. Likewise, never infer visual correctness from source
inspection or test totals.

## Git workflow

- `main` is stable.
- Work in task/feature/refactor branches.
- Do not merge a UI delivery into `main` while its required user in-game
  validation is pending.
- Keep automated validation status and user in-game validation status distinct in
  documentation and commits.
