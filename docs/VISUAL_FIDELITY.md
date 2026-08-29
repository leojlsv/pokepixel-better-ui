# Visual Fidelity

## Core rule

A Better UI feature must look native to PokePixel Idle.

## Preserve

- typography
- palette
- borders
- shadows
- iconography
- sprites
- component density
- spacing language
- control proportions
- hierarchy
- interaction feedback

## Prefer native reuse

Use existing game classes and component patterns whenever safe.

When behavior matters, moving an existing node is usually safer than cloning
it. `cloneNode()` copies attributes and descendants but does not copy listeners
registered through `addEventListener()`.

## CSS policy

Add the smallest possible CSS surface.

Preferred order:

1. existing game class;
2. existing CSS variable/token;
3. composition/layout rule;
4. new `ppbui-*` style as last resort.

Avoid broad selectors such as:

```css
button {}
.modal div {}
[class*="button"] {}
```

Prefer owned selectors:

```css
[data-ppbui-module="example"] {}
.ppbui-example__control {}
```

## Requires explicit approval

- new colors not derived from the original UI;
- new font;
- new icon family;
- changed window dimensions;
- changed global scaling;
- new responsive layout behavior;
- visual modernization;
- decorative effects absent from the original UI.
