# Project Rules

## Product definition

PokePixel Idle Better UI is an independent UI/UX layer for PokePixel Idle with a
project-wide pixel-art design system. It may redesign game surfaces while keeping
the underlying game rules, permissions and authoritative state intact.

The native client is a functional integration target, not the visual source of
truth.

## Decision order

For a feature or redesign, decide in this order:

1. explicit user requirement;
2. gameplay/safety and architecture invariants in `AGENTS.md`, this file and
   `docs/ARCHITECTURE.md`;
3. the global pixel-art design system, specialized by an approved module page
   override when one exists;
4. module functional contract;
5. safest integration with the current game implementation.

`.skills/ui_ux_pro.md` is mandatory review methodology throughout the process; it
does not become a second visual source of truth.

Multi-agent responsibilities follow `docs/roles/README.md`. Domain ownership does
not change the source-of-truth order: roles execute and verify decisions; they do
not create a parallel authority hierarchy.

Reuse native behavior when it reduces risk. Reuse native styling only when it is
also the intended Better UI design.

## Design governance

- `design-system/pokepixel-better-ui/MASTER.md` is the global visual source of
  truth.
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
- A module that has not yet migrated may remain a legacy visual implementation;
  migration is progressive, not an automatic whole-project rewrite.

## Functional safety

- Do not automate gameplay.
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
- Shared appearance should converge on the design system rather than being
  duplicated independently across modules.

## Review gates

### Automated-ready

A UI feature may be handed to the user when:

- behavior covered by the task still works in automated/synthetic validation;
- SPA rerenders do not duplicate the UI;
- repeated reconciliation is safe;
- cleanup/lifecycle behavior is covered where applicable;
- keyboard/focus/ARIA behavior is covered where applicable;
- styling is scoped and conforms to the design system or documented override;
- relevant `.skills/ui_ux_pro.md` checks were considered;
- relevant role-owned review gates in `docs/roles/README.md` are READY;
- tests/build/static checks pass.

### User-validated

Only the user may perform and approve in-game interface validation. The agent
must not operate the game/browser/Tampermonkey for this purpose. Until explicit
user approval is received, documentation must say `pending in-game validation`.
