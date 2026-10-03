# Architecture

## Runtime model

```text
PokePixel DOM
     |
     v
central MutationObserver
     |
     v
scheduled reconcile
     |
     v
module.shouldMount()
     |
  +--+--+
  |     |
mount  cleanup
```

## Core responsibilities

### bootstrap

Owns module registration, reconciliation and mounted state.

### observer

Owns the single application-level `MutationObserver`.

Mutations are coalesced before reconciliation to avoid running every module for
every individual DOM mutation.

### lifecycle

Tracks cleanup functions and guarantees safe teardown.

### preferences

Stores explicitly registered optional-module choices in `ppbui:modules:v1`.
Bootstrap checks these preferences before mounting and subscribes while running;
disabling a module invokes its existing cleanup. Stopping unsubscribes before
teardown. Unknown preference IDs never configure infrastructure modules.
The module-controls UI is independent of menu-bar and cannot disable itself.

### logger

Provides namespaced development diagnostics.

## Module responsibilities

Each module owns:

- selectors/configuration;
- DOM queries;
- feature behavior;
- feature-specific styles;
- cleanup.

A module must not depend on DOM created by another feature unless that
dependency is explicitly modeled.

### Registration and runtime contracts

`src/app/module-registry.js` is the one source for the ordered list of runtime
modules, preference descriptors and persisted defaults. `src/index.js` only
assembles the app dependencies and appends the non-configurable settings panel.
An optional setting must correspond to a registered module ID; infrastructure
modules such as standalone Card Mode and Coupled Workspace have no user toggle.
The contract is checked in `test/app-module-registry.test.js`.

### External Hunt Analyzer boundary

Card Mode may consume only explicit versioned page-global contracts owned by the
standalone `pokepixel-hunt-analyzer` project. The Analyzer remains the authority for
analytics, persistence and session actions; Better UI must not read its IndexedDB,
Shadow DOM, raw WebSocket state or reproduce its formulas.

- `__POKEPIXEL_HUNT_ANALYZER_PUBLIC__` protocol 1 supplies the bounded Current
  presentation summary and Analyzer-owned freshness timestamp.
- `__POKEPIXEL_HUNT_ANALYZER_CONTROL__` protocol 1 supplies only the existing
  Pause/Resume/Reset session actions.
- `__POKEPIXEL_HUNT_ANALYZER_UI__` protocol 1 is optional and standalone-only. Card
  Mode capability-detects it and may navigate to semantic detail destinations; it
  never uses Analyzer DOM selectors or the Coupled Workspace's native
  `hunt-analyzer` game-menu route for this purpose.

Every integration must fail closed when the Analyzer is absent, late, stale or on an
unsupported protocol. Additive Analyzer changes may be consumed opportunistically;
Better UI must remain usable against the previous Analyzer contract until a deliberate
breaking-protocol migration is completed.

Game-owned `PokeIdle.Bus` may change identity during rehydration. Feature
consumers must detach listeners from the **exact** object they subscribed to,
not whatever Bus happens to be current at cleanup. Shared
`src/core/native-event-bus.js` supplies this lifecycle to Pokémon Profile and
Auto Helper; other consumers with an existing identity-aware contract should
retain their own equivalent guard until they are migrated with tests.

Do not emit identical `textContent`, `hidden` or `disabled` mutations during
an otherwise unchanged render. The central observer watches these, including
all child-list mutations; a render that rewrites its own DOM can continuously
schedule another reconciliation. The Card Mode quiescence regression is in
`test/cards-render-idempotence.test.js`.

## Visual architecture

Visual decisions follow the functional and safety constraints in `AGENTS.md` and
`docs/PROJECT_RULES.md`. When a task explicitly adopts art direction, shared
visual rules live in `design-system/pokepixel-better-ui/MASTER.md`, with approved
module overrides under `design-system/pokepixel-better-ui/pages/`. UI/UX work
must pass the review process in `.skills/ui_ux_pro.md`.

During the migration, legacy modules may continue injecting module-local styles.
The approved shared Better UI tokens and component primitives are injected once
through the cross-module design-system runtime; dynamic integration geometry and
domain/game state remain owned by their modules.

Global Better UI styling must be opt-in and namespaced. It must not introduce a
host-wide reset or globally rewrite game `--ui-*`, `--quality-*` or equivalent
tokens.

## Ownership markers

Better UI-created nodes should use:

```text
data-ppbui-module="<module-id>"
```

Optional internal classes use:

```text
ppbui-*
```

This keeps cleanup deterministic and avoids confusing native DOM with injected
DOM.

## Reconciliation

Reconciliation must be idempotent.

A module may expose `getMountKey()` to identify the DOM nodes it enhances.
The key must stay stable while those nodes remain valid. When it changes, the
core runs cleanup before mounting again. This handles SPA replacements even
when `shouldMount()` stays true; modules without this optional method retain
the boolean lifecycle.

A mounted module may also expose `reconcile()` for idempotent updates that
do not require teardown, such as native visibility or label changes.
The central observer watches child-list changes and the filtered attributes
`hidden`, `disabled`, `aria-hidden`, `aria-disabled`, and `lang`. The same
observer watches the document language; it does not observe every class/style
change or create feature-specific observers. Native Hunt subtrees that no Better UI
module consumes are filtered before scheduling reconciliation when their mutations
only affect Hunt-local rendering or native capture controls. This includes nameplates,
hit/move effects and the current classic/Platform capture surfaces. Mutations outside
those explicitly scoped subtrees continue through the normal lifecycle path.

The active Platform Hunt renderer is game-owned except for explicitly shared native
surfaces. Once `.platform-hunt` is attached, child/attribute mutations whose target is
inside that root are ignored by the central observer unless they touch
`.pokeidle-buff-strip`, which Better UI deliberately enhances/reparents. The root
lifecycle remains observable because insertion/removal records target `body`, so
entering/leaving Platform Hunt still runs full reconciliation.

The native Team HUD Wallet and mobile-party button are siblings rather than descendants
of the Team HUD root. Their internal vitals-driven rerenders are observer-irrelevant to
Better UI and are ignored, while adding/removing/replacing either root remains visible
through the parent MutationRecord. Inventory Wallet ownership depends on the wallet root
identity/placement, not on observing its native value-text mutations.

An already enhanced persistent Team HUD is a narrower invalidation domain. Ordinary
child/attribute churn inside that root is routed only to mounted modules that declare
the `team-hud` observer scope instead of re-running document-wide discovery. Replacing
the native `.pokeidle-team-hud__list` mount sentinel, or coalescing any unrelated
global mutation in the same frame, promotes the batch back to full reconciliation.

Repeated DOM mutations must not:

- duplicate controls;
- register duplicate listeners;
- duplicate timers;
- create nested copies of the same wrapper.

## Performance

- one central observer;
- coalesce mutation bursts;
- avoid scanning the entire document when a local root is known;
- avoid continuous polling when DOM observation is sufficient.
