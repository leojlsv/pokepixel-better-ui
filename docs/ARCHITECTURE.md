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
change or create feature-specific observers.

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
