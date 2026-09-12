# PokePixel Better UI — Pixel-Art Design System

Status: **approved**
Version: **1.0**
Runtime adoption: **approved for implementation**

This document is the global visual source of truth for PokePixel Idle
Better UI. It defines reusable design decisions. Module-specific exceptions must
live under `pages/<module>.md`, be explicitly marked `approved`, and must not
silently redefine global tokens. Draft page files have no design authority.

## 1. Review provenance

This approved design system follows the mandatory `.skills/ui_ux_pro.md` workflow.
The skill's referenced searchable `search.py`, `quick-reference.md` and
`pro-rules.md` resources are not available in this workspace and no
`CLAUDE_PLUGIN_ROOT` is configured. Therefore this version uses the skill's
documented fallback priorities only; it does **not** claim a generated palette,
style match or catalog search result.

Context used for the fallback review:

- product: browser game UI + dense management/tooling layer;
- primary context: desktop game session with many compact windows and data-heavy
  controls;
- target feel: pixel-art RPG, dark, structured, readable, purposeful;
- implementation: framework-free DOM/CSS userscript layered over an SPA;
- density: high;
- motion: low;
- visual variance: moderate;
- accessibility, interaction clarity and performance take priority over ornament.

Project-selected design dials, using the skill's 1–10 vocabulary as a descriptive
aid rather than generated output:

| Dial | Value | Meaning |
| --- | ---: | --- |
| Density | 8 | Dense game/tool UI; compact but not cramped |
| Motion | 2 | Mostly state feedback; no decorative choreography |
| Variance | 5 | Distinct pixel identity with predictable component grammar |

## 2. Design statement

**Modern dense pixel-RPG interface.** Better UI should look intentionally built
for a game rather than like a generic web dashboard, while retaining contemporary
information hierarchy, keyboard operation and readable data presentation.

The pixel-art identity comes from geometry, edges, sprites, hard shadows, compact
spacing and state language — not from making every piece of text tiny or adding
retro decoration everywhere.

### Desired qualities

- game-native in *purpose*, not copied from the host's appearance;
- dark, high-contrast and readable during long sessions;
- compact and information-dense;
- strong grouping and clear primary actions;
- sharp/pixel geometry rather than soft app-card styling;
- consistent across HUD surfaces, windows, dialogs and tools;
- obvious selected/focus/disabled/error states;
- restrained animation;
- reversible integration with host functionality.

### Avoid

- glassmorphism and blurred translucent panels;
- soft SaaS/card-dashboard styling;
- excessive rounded pills;
- decorative gradients used as default surface treatment;
- glow on every element;
- fake scanlines/noise that harms text;
- emoji used as interface icons;
- tiny text used merely to appear retro;
- color-only status communication;
- rebuilding game behavior solely for visual reasons.

## 3. Pixel geometry

### Base unit

Use a **2px pixel unit** for borders, hard shadows and fine alignment. Layout
spacing generally uses multiples of 2px, with the preferred spacing scale below.

### Spacing scale

| Token | Value | Typical use |
| --- | ---: | --- |
| `--ppbui-space-1` | 2px | icon/text micro-gap, pixel edge |
| `--ppbui-space-2` | 4px | compact internal gap |
| `--ppbui-space-3` | 6px | dense row gap |
| `--ppbui-space-4` | 8px | default component padding/gap |
| `--ppbui-space-5` | 12px | section padding |
| `--ppbui-space-6` | 16px | major group separation |
| `--ppbui-space-7` | 24px | rare large separation |

Do not invent one-off values when this scale fits. Functional map positioning,
sprite coordinates and integration geometry are exempt.

### Borders and corners

- standard component border: **2px**;
- subtle internal separator: **1px** only when a 2px divider is visually heavy;
- default corner: **0px**;
- compact badges/chips may use **2px** radius when the shape improves grouping;
- larger rounded cards/pills are not part of the default language;
- stepped/cut pixel corners may be introduced as a reusable component primitive,
  never reimplemented ad hoc per module.

### Shadows

Shadows are hard and non-blurred:

- standard elevation: `2px 2px 0` dark shadow;
- raised overlay/dialog: `4px 4px 0` dark shadow;
- pressed controls may invert to an inset hard shadow;
- blurred drop shadows are reserved for domain assets such as map sprites when
  needed for legibility, not general panel chrome.

## 4. Color system

The palette is intentionally independent from the host's `--ui-*` palette.
Runtime tokens must use `--ppbui-*` names.

### Neutral surfaces

| Role | Token | Value |
| --- | --- | --- |
| Canvas/deep background | `--ppbui-bg-0` | `#0B0E14` |
| Primary surface | `--ppbui-bg-1` | `#141922` |
| Raised surface | `--ppbui-bg-2` | `#1B2230` |
| Interactive/selected surface | `--ppbui-bg-3` | `#252E3D` |
| Border | `--ppbui-border` | `#46566C` |
| Strong border | `--ppbui-border-strong` | `#7387A5` |

### Text

| Role | Token | Value |
| --- | --- | --- |
| Primary text | `--ppbui-text` | `#F3F6FA` |
| Secondary text | `--ppbui-text-muted` | `#AAB4C3` |
| Tertiary metadata | `--ppbui-text-subtle` | `#8F9CAF` |
| Inverse text | `--ppbui-text-inverse` | `#0B0E14` |

Against `#141922`, the primary, muted and subtle text colors remain comfortably
above normal-text contrast requirements. `--ppbui-text-subtle` also stays above
4.5:1 on `--ppbui-bg-3`, so 11px metadata can be used across the permitted
surface hierarchy without a hidden contrast exception. Meaningful text must not
be dimmed below readable contrast merely to look secondary.

### Brand/action accent

| Role | Token | Value |
| --- | --- | --- |
| Primary accent | `--ppbui-accent` | `#F3C969` |
| Accent hover/highlight | `--ppbui-accent-hi` | `#FFE3A0` |
| Accent pressed/deep | `--ppbui-accent-low` | `#C99A3A` |
| Keyboard focus | `--ppbui-focus` | `#70D6FF` |

Gold is the Better UI action/selection accent. Cyan is reserved for keyboard
focus and should not be reused as the normal selected color.

### Semantic feedback

| Meaning | Token | Value |
| --- | --- | --- |
| Success | `--ppbui-success` | `#72D572` |
| Warning | `--ppbui-warning` | `#F0B84B` |
| Danger | `--ppbui-danger` | `#F06A6A` |
| Informational | `--ppbui-info` | `#6EAEFF` |

Semantic color must be paired with text/icon/state when the distinction matters.

### Domain colors

Pokémon element colors, rarity/quality colors, HP/EXP colors and other gameplay
data colors are **domain semantics**, not Better UI brand tokens. Preserve a
verified canonical source when the color itself carries game meaning. Better UI
may change the surrounding surface/border/layout but must not remap data meaning
for aesthetic consistency.

## 5. Typography

The first design-system version must remain self-contained and must not fetch a
remote font. A dedicated bundled pixel font may be evaluated later only with
asset/license/performance review.

### Font roles

- body/control text: `system-ui, "Segoe UI", Arial, sans-serif`;
- numeric/data/compact labels when tabular alignment matters:
  `ui-monospace, "Cascadia Mono", Consolas, monospace`;
- game sprites/logotypes are assets, not typography substitutes.

The pixel identity should come primarily from component geometry. Do not force a
hard-to-read novelty pixel font across dense descriptions or tables.

### Type scale

| Role | Size | Weight | Line height |
| --- | ---: | ---: | ---: |
| Window/title | 16px | 700 | 1.25 |
| Section title | 13px | 700 | 1.25 |
| Body/control | 13px | 400–600 | 1.35 |
| Secondary | 12px | 400–600 | 1.35 |
| Metadata | 11px | 600 | 1.3 |

11px is for short metadata only, never paragraphs, descriptions or primary
interaction labels. Longer localized text must wrap instead of being shrunk.

Use tabular numerals for timers, prices, levels, counts and statistics where
alignment improves scanning.

## 6. Surface hierarchy

Use a small number of depth levels:

1. **Canvas** — `bg-0`, world/background behind tools.
2. **Window surface** — `bg-1`, main Better UI window/panel.
3. **Section/card surface** — `bg-2`, grouped content within a window.
4. **Interactive/selected surface** — `bg-3`, active rows and controls.

Do not nest framed cards indefinitely. Prefer spacing + one separator when a
fourth nested container would be purely decorative.

## 7. Control sizing and interaction

The product is desktop-first because it is an overlay on a desktop-oriented game,
not a generic mobile-first website.

### Desktop baseline

- standard control height: **32px**;
- primary/destructive action height: **36px**;
- compact icon button: **32×32px**;
- default horizontal control padding: **8–10px**;
- adjacent interactive controls: target **6–8px** separation when space allows.

These values intentionally differ from the skill's generic 44×44 touch target
because the primary environment is a dense pointer/keyboard desktop game.

For coarse-pointer/touch contexts, a module should increase important targets
toward **40–44px** or provide an equivalent accessible interaction. Do not solve
touch usability by globally scaling every desktop window.

### States

Every interactive component needs deliberate states:

- default;
- hover (pointer only);
- active/pressed;
- selected/current when applicable;
- focus-visible;
- disabled;
- loading/pending when an async action exists;
- error where an action can fail.

Hover must never be the only way to discover required information or trigger a
required action.

### Shared state matrix

Unless an approved module override states otherwise, shared controls use this
state mapping:

| State | Surface | Border/text | Additional cue |
| --- | --- | --- | --- |
| Default | `bg-2` | `border-strong` + `text` | hard 2px elevation where appropriate |
| Hover | `bg-3` | `accent-hi` for primary, `border-strong` otherwise | pointer-only; no meaning depends on it |
| Pressed | `bg-0` or inset `bg-1` | same semantic edge as default | inset hard shadow / 2px depth shift |
| Selected/current | `bg-3` | `accent` edge + `text` | explicit edge/surface change, not color-only text |
| Focus-visible | current state surface | current state border | independent 2px `focus` outline |
| Disabled | `bg-1` | `text-subtle` + `border` | disabled semantics/attribute; no hover elevation |
| Loading/pending | current semantic surface | current semantic edge | `aria-busy`/status copy; block duplicate submission |
| Error | `bg-2` | `danger` edge + readable text | adjacent error/status message or icon + text |

For primary buttons, replace the default neutral edge with `accent`; for danger
buttons use `danger`. Inputs use `bg-0`/`bg-1` as their default well, adopt
`border-strong` on hover, `focus` outline on focus-visible, and `danger` plus an
adjacent message for invalid state. Tabs use the selected mapping for the current
tab while keyboard focus remains independently visible.

### Focus

Focus uses a **2px cyan (`--ppbui-focus`) outline** with sufficient separation
from the component border. Focus styling must remain visible over selected/gold
states. Never remove focus rings without a Better UI replacement.

## 8. Core component grammar

### Buttons

**Primary:** gold border/accent, high-contrast label, reserved for the main action
in the current context. Avoid multiple equal primary actions in one small panel.

**Secondary:** neutral surface + strong neutral border. Used for navigation,
filters, utility actions and reversible operations.

**Ghost/compact:** minimal surface but still visible focus/hover boundary. Use for
small chrome actions such as close or disclosure, not major actions.

**Danger:** red semantic edge/text or surface treatment. Keep spatial distance
from the primary action when accidental activation is costly.

Pressed buttons may shift visual depth through an inset hard shadow; avoid scale
animations that make surrounding pixel alignment shimmer.

### Inputs and selects

- 2px border;
- `bg-0`/`bg-1` input well against a raised section;
- visible label when the meaning is not self-evident;
- placeholder is supplemental, never the sole label for ambiguous forms;
- search should expose clear/reset when persistent filtering can hide results;
- invalid/error state uses danger + message, not border color alone.

### Tabs and segmented controls

- selected state must change more than text color: surface/border/edge position;
- maintain one visual baseline so tabs read as navigation, not unrelated buttons;
- keyboard focus is independent from selected state;
- do not use rounded pill navigation as the default pixel-art pattern.

### Chips/badges

Use for concise states, elements, rarities and counters. Keep the label on one
line where possible. A badge must not become the only source of a critical label.
Gameplay semantic colors may override the brand accent inside the badge.

### Panels/cards

- 2px border + hard shadow when elevated;
- header identifies context and may own window-level actions;
- body groups related information without unnecessary nested boxes;
- footer is reserved for persistent actions/status when useful;
- cards representing selectable entities need explicit selected + focus states.

### Dialogs/popovers

- visually above the source surface with a 4px hard shadow;
- clear title/context;
- Escape closes when safe;
- Close/Cancel remains discoverable;
- destructive confirmation states the object/action being affected;
- non-modal popovers must not trap Tab unless the interaction is intentionally
  modal.

### Tooltips

Tooltips are supplemental. Required decision data belongs in a persistent or
keyboard-accessible surface. Do not design workflows that depend on pointer hover.

### Scrollbars

Better UI-owned scroll containers may receive a compact pixel-art scrollbar that
uses neutral surfaces and accent only on active/hover states. Do not restyle the
entire host application's scrollbar globally.

### Progress/status bars

Use a hard-edged track and fill. Numeric text should remain available when the
exact value matters. HP/EXP/etc. use domain semantic colors rather than being
recolored gold for brand consistency.

## 9. Icons, sprites and imagery

- Prefer local/bundled assets; no remote icon-library dependency by default.
- Better UI raster icons should follow a consistent pixel grid (normally 16, 20,
  24 or 32px source dimensions).
- Pixel raster assets use `image-rendering: pixelated` when scaling would
  otherwise blur intentional pixels.
- Existing Pokémon/item/game sprites may be reused as domain assets even when
  surrounding chrome is redesigned.
- Do not use emoji as interface icons.
- Icon-only actions require an accessible name and visible hover/focus feedback.

## 10. Layout and information hierarchy

### General structure

Prefer this reading order inside major windows:

1. context/title/navigation;
2. discovery/filter controls;
3. primary workspace/content;
4. selected detail/inspection area when needed;
5. persistent primary/destructive actions.

This is not a mandatory five-row layout. Combine levels when doing so improves
scanability and available workspace.

### Dense UI rules

- group by task/intent rather than by implementation origin;
- keep related label/control pairs visually close;
- prefer progressive disclosure for uncommon advanced filters;
- retain stable positions for frequently repeated actions;
- avoid moving content merely because selection changes;
- reserve space for async/error feedback when it is likely to appear;
- use empty states that explain whether content is absent or filtered out.

## 11. Responsive and window behavior

There is **no project-wide mobile-first breakpoint**. Better UI runs inside game
windows whose available dimensions vary independently of viewport width.

Rules:

- module layout thresholds must be derived from the module's functional minimum,
  not copied from generic device breakpoints;
- prefer flexible grid/flex tracks before adding a breakpoint;
- avoid horizontal scrolling for primary workflows when a sensible stack exists;
- data grids/maps may scroll when preserving scale/context is more useful than
  stacking;
- do not globally resize all game windows;
- a module may intentionally change its own window geometry when the approved UX
  requires it and cleanup/integration remain safe;
- use coarse-pointer media features for touch-size adaptation where relevant;
- no interaction may become hover-only at a narrower size.

## 12. Motion

Motion exists to explain state change, not decorate the interface.

- common feedback: **80–140ms**;
- disclosure/panel transitions: **120–180ms** when animation adds continuity;
- avoid continuous ambient animation in management UI;
- avoid animating large width/height changes when a discrete transition works;
- `prefers-reduced-motion: reduce` must remove non-essential motion;
- loading indicators may animate only while actual work is pending.

## 13. Content and localization

- UI copy should be concise and action-oriented;
- labels should state the action (`Entrar na Hunt`) instead of generic `OK` where
  context could be ambiguous;
- preserve the game's supported locales when the module already localizes;
- never shrink fonts solely to fit a longer translation;
- numeric alignment, separators and units must remain understandable per locale;
- use sentence case for body/actions unless a compact pixel label intentionally
  uses uppercase as a secondary visual role.

## 14. Better UI CSS contract

Runtime implementation follows these rules:

- all global design tokens are `--ppbui-*`;
- Better UI global styles are opt-in through `ppbui-*` classes or
  `data-ppbui-*` ownership;
- no `*` reset or unscoped `button/input/select` restyling;
- no global rewrite of host `--ui-*`, `--quality-*` or element variables;
- component CSS contains appearance; module CSS retains integration/layout rules
  that are genuinely module-specific;
- dynamic inline variables are allowed for runtime geometry/domain state;
- shared constants discovered in three or more surfaces should be promoted to a
  token/component rather than copied again.

## 15. Component adoption strategy

Do not perform a big-bang rewrite. When a module is revisited, classify it after
the mandatory UI/UX review:

- **Keep:** current layout is intentionally retained; only system tokens/states
  are adopted where useful.
- **Refine:** information architecture remains, visual/component structure is
  migrated.
- **Redesign:** layout/interaction hierarchy is reworked while preserving the
  agreed functional contract.

Hunts is the first full pilot for this approved MASTER. Its current
functional work (selection vs gameplay, Locate, dossier data, explicit Hunt,
stable identity, map state preservation and lifecycle) is an integration asset,
not a requirement to keep its present visual composition.

## 16. Validation contract

Before a build is handed to the user:

- mandatory `.skills/ui_ux_pro.md` review completed;
- `.skills/pixel_art_direction.md` completed when the task changes pixel-art
  direction, performs a substantial visual redesign or introduces bespoke pixel
  artwork;
- design-system/page override checked;
- required role-owned review gates in `docs/roles/README.md` are `READY`,
  including Independent QA and UX/A11y & Design QA when that specialist gate is
  triggered;
- keyboard/focus/ARIA checked with automated/synthetic evidence where possible;
- lifecycle/reconciliation/cleanup regressions pass;
- build and diff checks pass;
- no unrelated host UI is restyled.

Then **stop**. The agent must not open/control/reload the live game or Tampermonkey
for interface validation. The delivery remains `pending in-game validation` until
the user explicitly approves it.

## 17. Approval gate

Approval was granted by the user on 2026-09-12. Runtime adoption proceeds in
small, testable stages:

1. implement the shared design-system runtime/tokens/components;
2. create an approved `pages/hunts.md` from a Hunts-specific UI/UX review;
3. redesign Hunts as the first full pilot;
4. run automated validation/build/static review;
5. hand the build to the user and stop for in-game validation.
