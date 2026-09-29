# PokePixel Better UI — Game-Integrated Design System

Status: **current Product Owner-approved direction for Better UI 0.2.78+**
Version: **3.0**
Runtime adoption: **project-wide baseline**

This document is the global visual source of truth for PokePixel Idle Better UI.
The goal is no longer to maintain a separate pixel-art UI identity. Better UI-owned
features should read as a coherent extension of the current game while preserving
clear ownership, accessibility, responsive behavior and reversible integration.

**Supersession rule:** any later historical wording in this document that still
mentions Miyazaki 16 as the neutral surface authority, generic monospace as the
project font, mandatory square/pixel geometry, 2px structural borders or pixel
inset shadows is superseded by sections 2–5 below. Historical module evidence may
remain, but it is not current design authority.

## 1. Review provenance

The 3.0 baseline is based on the Product Owner's approved Pokémon Profile Game
Palette and a local read-only inspection of the current game's native CSS. The
reference game typography is:

- body/controls: `Inter, "Segoe UI", Arial, sans-serif`;
- window/title display: `Cinzel, Georgia, serif`;
- native reference geometry: 8px window radius, 5px cards/controls, 4px pills.

The product remains a dense browser-game UI with low decorative motion and strong
information hierarchy. Functional/native integration constraints remain higher
priority than visual imitation.

## 2. Design statement

**Integrated game UI.** Better UI uses the current game's typographic language and
a Product Owner-approved neutral surface system rather than a separate retro/pixel
chrome. New and migrated features should feel like they belong to PokePixel itself,
while remaining clearly structured, maintainable and accessible.

Required qualities:

- compact, dark and readable during long sessions;
- consistent surface hierarchy across modules;
- game-native typography;
- semantic Pokémon Type/Rarity/status colors remain meaningful and opaque;
- all normal structural lines use one neutral line system;
- no ornamental pixel inset shadows, fake scanlines or retro typography;
- sprites and domain artwork may retain pixel rendering when that belongs to the
  source asset rather than the UI chrome;
- no gameplay behavior is rebuilt solely for appearance.

## 3. Geometry and spacing

The existing compact spacing scale remains valid (`2/4/6/8/12/16/24px`), but it is
no longer evidence of a pixel-art identity.

### Lines

- all normal Better UI structural borders/separators: **1px**;
- line color: **`#6B6543`**, always **100% opaque**;
- semantic selected/focus/error/type/rarity cues may use their semantic color as a
  compact edge/outline/badge when the color communicates state rather than neutral
  structure;
- multi-pixel strokes remain allowed inside domain artwork or tiny CSS glyphs
  (for example arrows or the illustrated Pokéball), not as panel chrome.

### Corner preference

Corner geometry is a **global persisted Better UI preference**, exposed under
**Better UI → Appearance/Aparência → Corners/Cantos**:

| Mode | Window | Card/control | Badge/pill |
| --- | ---: | ---: | ---: |
| `Squared` | 0px | 0px | 0px |
| `Rounded` | 8px | 5px | 4px |

`Squared` is the migration/default mode so existing users are not silently switched.
`Rounded` follows the current game reference geometry. The preference is exclusive:
one mode owns all Better UI structural corner geometry at a time. Both modes use
identical palette, alpha, typography, semantics and interaction behavior.

Better UI must never enforce this preference on arbitrary host-game elements. Only
Better UI-owned/opted-in surfaces consume these radius tokens.

### Shadows

- normal buttons and data surfaces are flat;
- pressed controls do not use the old `inset 2px 2px` pixel-depth treatment;
- overlays may use a restrained blurred elevation shadow for separation;
- domain sprites may use a small drop shadow when needed for legibility.

## 4. Color system

Neutral UI chrome uses exactly four Product Owner-approved roles:

| Role | Canonical token | Value |
| --- | --- | --- |
| Window | `--ppbui-surface-window` / `--ppbui-bg-1` | `rgba(22, 29, 32, .92)` = `#161D20` @ 92% |
| Interactive | `--ppbui-surface-interactive` / `--ppbui-bg-2` | `rgba(35, 44, 46, .96)` = `#232C2E` @ 96% |
| Values | `--ppbui-surface-values` / `--ppbui-bg-0` | `rgba(22, 29, 32, .85)` = `#161D20` @ 85% |
| Lines | `--ppbui-line` / border aliases | `#6B6543` @ 100%, 1px |

Role mapping:

- **Window:** outer windows, panels, dialogs, HUD/shell containers;
- **Interactive:** titlebars, toolbars, buttons, tabs, selectable/editable action
  surfaces and section headers;
- **Values:** input/select wells, passive metrics/stats, portraits, meters, lists and
  read-only data/content bays;
- **Lines:** all neutral structural separators and borders.

Alpha is applied to surfaces only. Text, Lines, focus indicators and semantic colors
remain opaque.

### Semantic colors

Existing verified gameplay/status colors remain independent of the neutral palette:
Pokémon Types, rarity/quality, selected/current, focus, success/active, warning,
danger, Shiny and other domain meaning. Prefer semantic text/icon/compact edge/badge
over large tinted backgrounds. Broad semantic-tinted panel fills are not the default.

Legacy Miyazaki swatches may remain as compatibility/semantic variables where an
existing state depends on them; they are **not** neutral surface authority.

## 5. Typography

Better UI follows the current game's typography and does not fetch a remote font.
It relies on the same local/system fallbacks the game declares:

- `--ppbui-font-body`: `Inter, "Segoe UI", Arial, sans-serif`;
- `--ppbui-font-data`: same body stack, with tabular numerals when useful;
- `--ppbui-font-display`: `Cinzel, Georgia, serif` for window/title display roles.

Do not introduce generic monospace as a project identity. Module-local typography
must consume these shared roles unless a verified native/domain asset has a specific
reason not to. Sprite/logotype artwork is not a typography substitute.

Current compact scale remains approximately 10px metadata, 11–12px controls/body,
12px section headings and 15px game-style window titles. Longer localized text wraps
or reflows; it is not shrunk merely to preserve a retro composition.

## 6. Surface hierarchy

Use a small number of depth levels:

1. **Game/world canvas** — host content behind Better UI; Better UI does not
   repaint the world.
2. **Window surface** — `bg-1`, charcoal shell distinguished structurally rather than by a light fill.
3. **Section/card surface** — `bg-2`, grouped content within a window.
4. **Input/control well** — `bg-0`, deepest dark field/control interior.
5. **Hover/pressed surface** — `bg-3`, transient stone interaction feedback; never a large static panel fill.

Do not nest framed cards indefinitely. Prefer spacing + one separator when a
fourth nested container would be purely decorative.

## 7. Control sizing and interaction

The product is desktop-first because it is an overlay on a desktop-oriented game,
not a generic mobile-first website.

### Desktop baseline

- standard control height: **28px**;
- standard action height: **28px** (`.ppbui-button--action` does not create a
  separate taller visual family);
- canonical **1:1** button: **28×28px**;
- canonical **2:1** button: **56×28px**;
- compact maintenance control/icon button: **24px / 24×24px**;
- default horizontal control padding: **8–10px**;
- adjacent interactive controls: target **6–8px** separation when space allows.

Dense maintenance surfaces may opt into the shared compact-control variant when the
action is secondary, repetitive and pointer/keyboard-oriented: **24px** control
height, **24×24px** icon buttons and **5px** horizontal padding. Compact variants
must remain explicit (`.ppbui-button--compact` / `.ppbui-icon-button--compact`),
must not replace the default globally, and still expand to the coarse-pointer target.

`.ppbui-button` owns its own box/display alignment. Its default minimum footprint
is the 2:1 token; `.ppbui-button--1x1` and `.ppbui-button--2x1` make exact ratios
explicit. Wider text actions may expand horizontally while retaining the 28px
height. Modules must not rely on host
button classes for centering or inline-flex behavior, because mixed native + Better
UI classes otherwise produce inconsistent geometry across modules. Use the shared
`.ppbui-action-row` primitive for dense groups of related actions instead of
re-implementing flex/wrap/gap rules per module.

Button **semantics do not imply geometry**. `.ppbui-button--primary` and
`.ppbui-button--danger` own semantic edge/text treatment only. Add
`.ppbui-button--action` for semantic layout hooks without introducing a second
height system; keep icon/delete utilities at their explicit standard or compact
icon size. This prevents actions from drifting into unrelated geometries.

For compact resource/status meters that need a short label beside a bar, use the
shared `.ppbui-meter-row` + `.ppbui-meter-row__label` primitive. The default label
track is 32px and may be overridden through `--ppbui-meter-label-width` when a
verified localized label requires it. Modules own the actual domain bar/fill and
its value; they should not duplicate label|bar grid geometry or magic label widths.
When a moved native bar carries its own grid placement (for example `grid-column:
1 / -1`), the integration layer must explicitly release that host placement so the
shared meter row can actually own the label/bar axis.

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
| Default | `bg-0`/`bg-2` | 2px `border-strong` + `text` | flat control surface |
| Hover | `bg-3` | `accent-hi` for primary, `border-strong` otherwise | pointer-only; no meaning depends on it |
| Pressed | `bg-3` | same semantic family as default; primary may use `accent-low` for compact-text contrast | subtle inset 2px depth cue |
| Selected/current | `bg-3` | `selected` edge + `text` | explicit edge/surface change, not color-only text |
| Focus-visible | current state surface | current state border | independent 2px `focus` outline |
| Disabled | `bg-1` | `text-subtle` + `border` | disabled semantics/attribute; no hover elevation |
| Loading/pending | current semantic surface | current semantic edge | `aria-busy`/status copy; block duplicate submission |
| Error | `bg-2` | `danger` edge + readable text | adjacent error/status message or icon + text |

For primary buttons, replace the default neutral edge with `accent` and use readable
`accent-hi` text. Hover/pressed states use `action-bg` with `accent-hi` edge/text so
12px labels retain WCAG text contrast. Do not add a separate lower rail or a filled-gold
button family. For danger buttons use
`danger`. Inputs use the dark `bg-0` well and a 2px hard edge, adopt the normal
focus outline on focus-visible, and use `danger` plus an adjacent message for
invalid state. Tabs use the selected mapping for the current tab while keyboard
focus remains independently visible.

### Focus

Focus uses a **2px cyan (`--ppbui-focus`) outline** with sufficient separation
from the component border. Focus styling must remain visible over selected/gold
states. Never remove focus rings without a Better UI replacement.

## 8. Core component grammar

### Buttons

**Primary:** dark PPBUI surface with blue/cyan action border/text, reserved for the main
action in the current context. Hover/pressed may use the navy action surface while
gold remains reserved for persistent selected/current state. Avoid multiple equal primary
actions in one small panel.

**Secondary:** neutral surface + strong neutral border. Used for navigation,
filters, utility actions and reversible operations.

**Ghost/compact:** minimal surface but still visible focus/hover boundary. Use for
small chrome actions such as close or disclosure, not major actions.

**Danger:** red semantic edge/text or surface treatment. Keep spatial distance
from the primary action when accidental activation is costly.

Pressed buttons use a subtle hard inset depth; never inherit native scale/translate
animation. Standard buttons and fields use the same 2px Miyazaki 16 hard-edge
grammar. Internal separators may use 1px.
Base `.ppbui-button` provides the square pixel-control defaults. When a native game button is
enhanced, the exact dual-class `.pokeidle-btn.ppbui-button` host bridge owns `appearance`,
gradient/background-image, text shadow, filter and native transform with stronger `!important`
specificity so host chrome cannot leak back regardless of stylesheet order. Pure Better UI
module buttons remain deliberately overridable by scoped module CSS for an approved local
surface/shadow/pressed-motion pattern; that module ownership must not mutate the shared primitive.
Team-family controls consume the shared primary/secondary/danger semantics instead of repainting
them locally.

### Inputs and selects

- 2px hard control border;
- dark `bg-0` input well against the raised Miyazaki 16 section surface;
- native `game-window__search` / `game-window__select` controls that opt into PPBUI must release
  host height/radius/background chrome so Team-family fields remain square and visually consistent;
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

Element artwork uses one project-wide opt-in primitive instead of module-specific
circles/plates. `.ppbui-element-icons` is the list wrapper and
`.ppbui-element-icon` is a **24×24px square** domain-color well; compact contexts use
`.ppbui-element-icon--small` at **20×20px**. The background/border color comes from
the canonical game Element definition (`PokeIdle.ElementIcons.definition(type).color`)
or the native `--element-color`; Better UI must not remap Element meaning to brand
colors. Native/domain artwork remains centered and pixelated. Rounded/circular Element
chrome and per-module Element-icon families are not allowed.

Rarity/quality labels that opt into `.ppbui-quality-badge` use the same square dark
surface with a canonical `--quality-*` structural edge. The primitive changes chrome
only; rarity names, multipliers, ordering and gameplay meaning remain authoritative.

### Panels/cards

- 2px border + hard shadow when elevated;
- header identifies context and may own window-level actions;
- body groups related information without unnecessary nested boxes;
- footer is reserved for persistent actions/status when useful;
- cards representing selectable entities need explicit selected + focus states.

For compact Pokémon representations reused across Team-family surfaces, use the
shared `.ppbui-pokemon-card` **semantic/state shell** instead of redefining selected,
active, fainted or focus behavior per module. Geometry is deliberately role-specific:

- `.ppbui-pokemon-card--hud` — narrow live-monitor micro-slot;
- `.ppbui-pokemon-card--roster` — richer Full Team management slot;
- `.ppbui-pokemon-card--preset` — saved formation identity/order token;
- `.ppbui-pokemon-card__position` — official/order marker;
- `.ppbui-pokemon-card__visual` — centered sprite well whose bounds follow the role;
- `.ppbui-pokemon-card__meta` — optional facts area for a role that needs text;
- `.ppbui-pokemon-card__meter` — optional live-vitality rail, not a required card part;
- `--selected` — gold structural edge;
- `--active` — green **right** structural edge independent from selected/order;
- `--fainted` — danger edge on live surfaces;
- focus/hover/pressed behavior is shared for interactive cards only.

Do not force identical dimensions or telemetry into materially different contexts. In
particular, Team HUD keeps compact visible `Lv.N` as its repeated text fact and demotes HP
to the thin vitality rail, while a Saved Formation token must not project live HP/fainted
state merely to resemble a combat card. Full Team may use richer facts and responsive
geometry because it is a management surface. Shared consistency means common state
semantics, position language, typography roles and pixel-art chrome—not one universal
information payload.

Integration may keep overflow visible where an existing native status affordance is
intentionally positioned outside the card frame (for example Full Team XP Share badges).
That exception must not change the shared state semantics or corrupt the native affordance.

### Dialogs/popovers

- visually above the source surface with the shared restrained hard shadow;
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

Every Better UI-owned scroll container uses the shared pixel scrollbar primitive:
**10px** horizontal/vertical track, square corners, charcoal track and a stone
2px hard-edged thumb with a weathered-neutral hover state. Horizontal and vertical
scroll use the same grammar. Modules may add a scoped specificity bridge when host
scrollbar rules would otherwise override this primitive, but must not ship a separate
scrollbar palette/rounding unless an approved exception exists. Do not restyle the
entire host application's scrollbar globally.

When the host may move `overflow` to an unknown descendant, opt the owned root into
`.ppbui-scroll-scope`; it extends the same primitive through that subtree, removes native
WebKit arrow buttons and yields standardized `scrollbar-color` in Blink/WebKit so the
square `::-webkit-scrollbar-*` geometry remains authoritative. This scope is reversible
and must never be applied to an unrelated host subtree.

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

The Product Owner changed the rollout strategy on 2026-09-16: **all shared visual
objects are standardized first, then modules migrate in consolidated batches by
gameplay impact.** No module may invent a new button/input/box/scrollbar/dropdown
style while the master primitive exists. When a module is migrated, classify it
after the mandatory UI/UX review:

- **Keep:** current layout is intentionally retained; only system tokens/states
  are adopted where useful.
- **Refine:** information architecture remains, visual/component structure is
  migrated.
- **Redesign:** layout/interaction hierarchy is reworked while preserving the
  agreed functional contract.

Migration order is impact-driven rather than module-by-module approval driven:

1. shared foundation: typography, panels/boxes, buttons, fields/dropdowns,
   horizontal/vertical scrollbars and states;
2. high-frequency/high-gameplay surfaces: Hunts, Team HUD/Team/Presets, Storage,
   Inventory and Trade;
3. secondary utilities: Module Controls, Auto Helper, Pokémon Tools, Marks Shop,
   Chat and Buff Strip;
4. independent UX/A11y + technical QA over a consolidated candidate;
5. Product Owner performs the only live in-game validation gate.

Existing functional work in these modules remains an integration asset. Visual
migration must preserve native behavior, lifecycle and authoritative game state.

## 16. Validation contract

Before a build is handed to the user, the Project Manager applies
`docs/PROJECT_WORKFLOW.md` and audits criterion-level evidence:

- mandatory `.skills/ui_ux_pro.md` review completed;
- `.skills/pixel_art_direction.md` completed when the task changes pixel-art
  direction, performs a substantial visual redesign or introduces bespoke pixel
  artwork;
- design-system/page override checked;
- Independent QA returns `TECH READY` for the exact candidate;
- triggered UX/A11y review returns `UX READY`;
- every visible change receives Visual Regression review against qualifying
  rendered evidence. Source/CSS/tests/JSDOM are not visual evidence. The result is
  `VISUAL READY`, `VISUAL NOT READY` or `VISUAL EVIDENCE INSUFFICIENT`;
- keyboard/focus/ARIA checked with automated/synthetic evidence where possible;
- lifecycle/reconciliation/cleanup regressions pass;
- build and diff checks pass;
- no unrelated host UI is restyled.

The PM must not convert missing render evidence into a visual pass. When a visual
property is inherently live-only, the candidate may be handed off only as an
explicit pre-live candidate with that evidence gap named; it must not be described
as visually ready or fully approved.

Then **stop**. The agent must not open/control/reload the live game or Tampermonkey
for interface validation. The delivery remains `pending in-game validation` until
the user explicitly approves it.

## 17. Approval gate

The original design-system approval was granted on 2026-09-12. On 2026-09-16 the
Product Owner explicitly superseded the module-by-module validation strategy and
approved autonomous implementation until the next live gate. Later that day the
Product Owner explicitly rejected the white/warm master, then later rejected the
resulting Sweetie 16 color distribution after live inspection and selected the official
Miyazaki 16 palette as the new project-wide color authority. The approved monospace,
square/pixel geometry, density, state language and reversible integration contracts
remain in force. Miyazaki 16 supersedes the earlier Sweetie 16 candidate; blue is now
interaction/focus, gold is selected, and green is active/success.

On 2026-09-17 the Product Owner explicitly reported **“Estrutura validada.”** The
Backpack/Team/Add Pokémon composition therefore stays closed. The current gate is a
visual-polish pass only: Backpack Sort +15px, the Add Pokémon pixel scrollbar, shared
square Element icon adoption project-wide and rarity-box chrome. Structural redesign is
out of scope unless a later Product Owner instruction explicitly reopens it.

The 2026-09-17 live review further clarified the Element primitive: canonical Element color
must remain visible as the square swatch/edge, but the backing must be a darker element-tinted
well rather than the same full-strength color behind the native symbol. The symbol and backing
must remain visually separable at 20px and 24px. This clarification does not remap domain
colors to Miyazaki roles and does not reopen the approved structure.

The later correction sequence reinforces the evidence boundary: local Technical/UX/Visual readiness
never equals in-game approval. Exact `0.2.11` ultimately closed the legacy Shared Stone contamination
case and was explicitly live-validated by the Product Owner. The subsequent live screenshot reopened
only one bounded presentation issue: the Saved Team HUD `6/6` preview left unused width after member 6.
Exact `0.2.12` preserves the accepted structure, removes the false scrollbar/right-strip condition,
completed fresh Technical and local render-first Visual gates at `P0-P3=0`, and was subsequently
validated live by the Product Owner. The Team-family correction sequence is closed unless a later
instruction explicitly reopens it.

Agents continue through foundation, module migration, automated verification and
independent review without pausing for intermediate Product Owner authorization.
The next human gate is the consolidated in-game validation candidate.
