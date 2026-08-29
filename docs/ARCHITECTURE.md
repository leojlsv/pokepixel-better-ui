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
