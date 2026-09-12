# Design Governance

## Purpose

PokePixel Idle Better UI has its own pixel-art visual language. This document
defines how design decisions are made; the actual visual tokens and component
specification live in `design-system/pokepixel-better-ui/MASTER.md`.

## Authorities

1. Explicit user requirement and approval.
2. Functional/safety architecture in `AGENTS.md`, `docs/PROJECT_RULES.md` and
   `docs/ARCHITECTURE.md`.
3. Global visual decisions in the design-system MASTER, with an approved page
   override taking precedence only inside its named module.
4. Module functional contracts.

`.skills/ui_ux_pro.md` is the required analysis/review method applied across
those authorities; it is not a separate styling authority.

The native PokePixel interface supplies technical evidence about data, handlers,
state and constraints. It does not constrain Better UI to the game's styling.

## UI/UX Pro gate

Any task that changes layout, styling, interaction, feedback, accessibility,
motion, responsiveness, typography, color or visual hierarchy must review
`.skills/ui_ux_pro.md` before implementation and again before delivery.

Recommendations from the skill are contextual inputs. Generic web/mobile values
such as a specific base font size, target size or mobile-first breakpoint are not
copied mechanically into a dense desktop game UI. When the project adopts a
different contextual value, that decision belongs in MASTER or a page override.

If the searchable data/scripts referenced by the skill are unavailable, use its
documented fallback and explicitly avoid claiming unexecuted search results. If
a referenced mandatory checklist such as `pro-rules.md` is also unavailable,
record that limitation and run the project-native delivery review instead:
MASTER/page-override consistency, keyboard/focus/ARIA, contrast, responsive
behavior, reduced motion, lifecycle/cleanup, regression tests, build and scoped
CSS ownership. Do not claim the missing checklist was executed.

## Master + page overrides

`MASTER.md` contains reusable decisions: color roles, type scale, spacing,
pixel geometry, component states, focus, motion, responsive principles and
shared component contracts.

Page overrides contain only genuine module-specific exceptions. They should not
copy the whole MASTER. A reusable exception discovered during module work should
be promoted back into MASTER.

## Native integration versus visual ownership

Keep native nodes/APIs/handlers when they are behaviorally authoritative or
safer than reconstruction. Better UI may apply its own classes and visual system
to those nodes. Recreating a control is acceptable only when behavior/state is
preserved deliberately and the integration risk is justified.

Do not confuse these concerns:

- **functional authority:** game state, actions, permissions, server rules;
- **visual authority:** Better UI design system;
- **interaction changes:** require an explicit feature contract;
- **integration mechanism:** choose the safest reversible implementation.

## CSS ownership

- Shared tokens use `--ppbui-*`.
- Global Better UI CSS must be opt-in/scoped; no host-wide reset.
- Do not redefine game `--ui-*`/`--quality-*` variables globally.
- Avoid bare `button`, `input`, `.modal div` or substring selectors that can
  restyle unrelated game UI.
- Dynamic geometry and state values that belong to one integration stay local.
- Shared visual constants should not be hard-coded repeatedly inside modules.

## Accessibility and motion

Pixel-art styling never removes semantic clarity. Maintain visible keyboard
focus, non-color state cues where required, useful labels, predictable Escape/
close behavior, readable contrast, reduced-motion fallbacks and content that
remains usable when text is longer than the nominal design.

## Migration states

Existing modules are not redesigned automatically. Track two independent axes.

**Migration classification:**

- `legacy visual` — old appearance retained and not yet reviewed;
- `reviewed / keep` — current presentation intentionally retained;
- `reviewed / refine` — targeted design-system migration;
- `reviewed / redesign` — full visual/UX restructuring.

**Validation status:**

- `automated pending` — implementation/review is not yet ready for handoff;
- `pending in-game validation` — automated work complete, user validation open;
- `user validated` — user explicitly approved the current delivery.

Historical user validations remain historical facts. If a validated module is
visually changed later, its previous functional evidence remains useful but the
new visual delivery returns to `pending in-game validation`.

## In-game validation boundary

The coding agent does not perform live in-game UI validation and does not operate
the user's game browser or Tampermonkey to validate a delivery. Automated tests,
synthetic fixtures, builds and static reviews may prepare a candidate; the user
alone supplies the in-game green light.
