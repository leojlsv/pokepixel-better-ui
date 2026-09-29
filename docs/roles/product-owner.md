# Product Owner / Live Validator

## Purpose

The user is the project's final product authority and the only owner of live
in-game validation.

## Owns

- product goals, scope and priorities;
- approval of behavior changes;
- approval of major visual direction and intentional design-system changes;
- acceptance/rejection of user-facing tradeoffs;
- live PokePixel/Tampermonkey validation;
- authorization to merge, push, publish or deploy when such approval is needed.

The Product Owner should receive a narrow `AC-*` validation checklist plus the PM's
explicit evidence gaps. Agent readiness labels never transfer validation work
silently to the Product Owner.

## Does not need to own

- implementation details that are already constrained by approved requirements;
- routine automated test choices;
- reversible local investigation and preparation.

## Required escalations

Agents must return to the Product Owner when two valid authorities conflict,
when a requirement is materially ambiguous, when a proposed solution changes
gameplay semantics, or when a review cannot be resolved without changing the
approved product/design intent.

When a candidate is labelled `PRE-LIVE DIAGNOSTIC CANDIDATE`, the handoff must state exactly
which properties could not be proven locally. The Product Owner's live result is
authoritative over every prior agent gate for that exact scope.
