# Professions

## Scope

This override applies only to the native Miner/Farmer workforce manager enhanced
by Better UI. Fishing remains native.

## Approved direction

- Keep the native three-slot workforce model and all gameplay state/actions.
- Worker cards use one stable action row: Collect, Swap, Remove.
- Swap is progressive disclosure inside the selected worker card. It must identify
  the slot and show Current, New and Difference before the native confirmation.
- Empty slots align their controls toward the top instead of vertically centering
  large unused space.
- The native candidate select keeps its original order; Better UI marks only the
  top three efficiencies and adds one compact explanatory line.
- Better UI copy follows the language visibly used by the Professions surface.
  The current native workforce renderer is Portuguese-only, so the enhancement
  must not introduce an English island when the surrounding surface is Portuguese.
- Use existing PPBUI button/select/focus primitives. Do not introduce a new palette
  or card family for this module.
- Do not add animation to worker-card height changes. The management surface favors
  stable, immediate state transitions.

## Responsive behavior

- Prefer flexible tracks over viewport-specific layout changes.
- The action row remains one row where each worker card has enough width; at the
  module's narrow threshold it may stack.
- Swap content must never create horizontal scrolling in the worker card.
