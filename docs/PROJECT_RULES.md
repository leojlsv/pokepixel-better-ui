# Project Rules

## Product definition

PokePixel Idle Better UI enhances the existing interface without replacing its
identity.

The original PokePixel Idle UI is not inspiration. It is the baseline.

## Decision order

When implementing a feature, prefer:

1. Reuse existing behavior and styling.
2. Move/regroup existing elements.
3. Add a small native-looking extension.
4. Recreate a component only when reuse is unsafe or impossible.

## Feature categories

Every feature should primarily be one of:

- **Expose** — show useful existing information.
- **Rearrange** — reposition or regroup.
- **Reduce** — remove unnecessary interaction steps.
- **Extend** — add a QoL capability.

Changes categorized mainly as **Redesign** require explicit approval.

## Safety

- Do not automate gameplay.
- Do not silently change game actions.
- Do not destroy original DOM state without a reversible cleanup path.
- Do not rely on unstable generated class names without documenting the risk.
- Do not create parallel copies of game state when the original state can be
  read safely.

## Review gate

A feature is ready only when:

- original behavior still works;
- original visual identity is preserved;
- SPA rerenders do not duplicate UI;
- mounting twice does not duplicate UI;
- cleanup is possible where applicable;
- selectors are localized;
- no unrelated global CSS is introduced.
