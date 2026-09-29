# Project Rules

## Product definition

PokePixel Idle Better UI is an independent functional UI/UX and QoL layer for
PokePixel Idle. It may redesign game surfaces while keeping the underlying game
rules, permissions and authoritative state intact.

Current product priority is functional layout, usability, responsiveness,
maintainability and native-contract compatibility. The historical pixel-art
design system is optional legacy guidance rather than an acceptance requirement.

## Decision order

For a feature or redesign, decide in this order:

1. explicit user requirement;
2. gameplay/safety and architecture invariants in `AGENTS.md`, this file and
   `docs/ARCHITECTURE.md`;
3. module functional contract;
4. safest integration with the current game implementation;
5. the global design system/module override only when visual or art-direction
   work is explicitly part of the task.

`.skills/ui_ux_pro.md` is mandatory review methodology throughout the process; it
does not become a second visual source of truth.

Multi-agent responsibilities follow `docs/roles/README.md`. Domain ownership does
not change the source-of-truth order: roles execute and verify decisions; they do
not create a parallel authority hierarchy.

Task progression and gate states follow `docs/PROJECT_WORKFLOW.md`. Role methods
and supplemental external skills are mapped in `docs/SKILLS_MATRIX.md`; skills do
not create authority or bypass review/live-validation gates.

Reuse native behavior when it reduces risk. Reuse native styling only when it is
also the intended Better UI design.

## Design governance

- `design-system/pokepixel-better-ui/MASTER.md` documents the legacy/shared
  visual system and is authoritative only for tasks that explicitly adopt it.
- `design-system/pokepixel-better-ui/pages/<module>.md` may override MASTER only
  for that module, must state why, and has authority only when its status is
  explicitly `approved`.
- `.skills/ui_ux_pro.md` is mandatory for UI/UX analysis and review. It provides
  recommendations; adopted decisions must fit the product context.
- `.skills/pixel_art_direction.md` is mandatory for pixel-art redesign/art
  direction. It structures visual production but does not override MASTER.
- External image/art tools may produce references or assets, but are optional and
  never become design authorities or required project infrastructure. See
  `docs/DESIGN_TOOLING.md`.
- Legacy module docs may describe native-looking implementations historically.
  They do not override current design governance.
- Existing pixel-art styling may remain when harmless. Do not migrate or preserve
  it merely for theme consistency; simplify it when it causes functional layout
  or compatibility problems.

## Functional safety

- Gameplay automation requires explicit feature scope and acceptance criteria. It
  must preserve server/client eligibility, permissions and authoritative state,
  define bounded failure/retry behavior, and provide a clear user control or
  override path appropriate to the feature.
- Do not silently change game actions.
- Preserve server/client eligibility, permissions and authoritative state.
- Do not destroy original DOM/state without a safe lifecycle/cleanup strategy
  when reversibility is part of the module contract.
- Do not rely on unstable generated selectors without documenting the risk.
- Do not duplicate game state when it can be read safely from the source.
- Do not intercept or modify network traffic without explicit feature scope and
  approval.

## Styling safety

- Better UI tokens use the `--ppbui-*` namespace.
- Better UI-owned selectors use `ppbui-*` / `data-ppbui-*` ownership.
- Do not globally redefine host game tokens or use broad element resets.
- Keep dynamic gameplay/integration values local when they are not reusable
  design decisions.
- Shared appearance should remain scoped and maintainable; convergence on the
  legacy design system is optional unless explicitly required by the task.

## Review gates

### Technical readiness

A candidate may receive `TECH READY` when:

- behavior covered by the task still works in automated/synthetic validation;
- SPA rerenders do not duplicate the UI;
- repeated reconciliation is safe;
- cleanup/lifecycle behavior is covered where applicable;
- keyboard/focus/ARIA behavior is covered where applicable;
- styling ownership is scoped and technically conforms to the design system or
  documented override;
- tests/build/static checks pass.

Technical readiness does not prove rendered appearance.

### UX/A11y readiness

When interaction/accessibility/information behavior changes, an independent
reviewer must return `UX READY`. Source-level conformance is not a visual-fidelity
verdict.

### Visual readiness

Visual Regression QA is required when a change can materially affect layout,
readability, clipping, reachability, control state or interaction. `VISUAL READY`
requires representative rendered evidence for those claims. Pure theme fidelity
to the legacy pixel-art system is not a release requirement.

When the affected behavior can only be proven in the Product Owner's live game,
the correct pre-live state is `VISUAL EVIDENCE INSUFFICIENT` / `live-only`, not a
fabricated visual pass. The PM may hand off such a candidate only with the evidence
gap explicitly named.

### PM handoff authorization

The PM audits the Acceptance & Evidence Matrix. A normal handoff requires no
unresolved domain `NOT READY` finding, exact-candidate traceability and evidence
appropriate to every claim. Reviewer quantity does not compensate for weak or
duplicated evidence.

### User-validated

Only the user may perform and approve in-game interface validation. The agent
must not operate the game/browser/Tampermonkey for this purpose. Until explicit
user approval is received, documentation must say `pending in-game validation`.
