# Project Management Workflow

## Purpose

This document is the operational lifecycle for PokePixel Better UI. The Project
Manager is not only a coordinator: the PM is the **delivery gatekeeper** and is
accountable for deciding whether the available evidence justifies progressing a
candidate to the Product Owner.

The Product Owner remains the final product authority and the only live in-game
validator. Agent gates may establish technical, UX/accessibility, design-contract
or visual-evidence readiness; none of those is live approval.

## PM accountability

The PM MUST block progression when evidence is weaker than the claim being made.
In particular:

- green tests do not prove visual correctness;
- correct CSS/tokens/classes do not prove rendered correctness;
- multiple reviewers repeating the same evidence do not create independent
  confidence;
- a reviewer `READY` outside that reviewer's domain cannot satisfy another gate;
- unresolved `NOT READY` findings cannot be waived by the PM;
- `VISUAL EVIDENCE INSUFFICIENT` is a legitimate result and must be surfaced, not
  converted into `READY` for convenience.

The PM may progress a candidate with an unavoidable live-only visual uncertainty
only as an explicitly labelled **pre-live diagnostic candidate with visual evidence
gaps**, after documenting why representative local evidence cannot reasonably close
the criterion. The PM must name those gaps in the handoff. It must never be
described as visually approved, normal release-ready or fully READY.

## Core task record — Acceptance & Evidence Matrix

Every task starts with a PM-owned record. Each user-visible requirement receives a
stable acceptance ID (`AC-01`, `AC-02`, ...).

Use `docs/PM_GATE_TEMPLATE.md` for the task record unless an existing project status
document already contains the same fields explicitly.

For each acceptance criterion record:

| Field | Required content |
| --- | --- |
| Requirement | observable Product Owner requirement |
| Must preserve | behavior/layout/state that must not regress |
| Evidence type | source, automated, browser render, screenshot comparison, a11y, lifecycle, live-only |
| Owner | role responsible for producing the evidence |
| Reviewer | independent role responsible for judging it |
| Status | `open`, `pass`, `fail`, `evidence-insufficient`, `live-only` |

The matrix is the PM's primary gate record. Test totals are supporting evidence,
not a substitute for criterion-level evidence.

## Lifecycle

### 1. INTAKE

The PM captures explicit requirements, current repository state, prior Product
Owner approvals/rejections, dirty-tree boundaries and delivery authorization.

Exit: scope is concrete and previous live evidence is classified accurately.

### 2. ACCEPTANCE CONTRACT

The PM creates the Acceptance & Evidence Matrix before implementation. Activate
Requirements Analyst when behavior is new, ambiguous or complex.

For visual work, criteria must be observable. Avoid acceptance language such as
"uses the correct class" when the actual requirement is "renders as a 24px square
Element icon".

Exit: implementation does not need to invent success criteria.

### 3. RESEARCH

Use Technical Researcher for uncertain native DOM/CSS/runtime behavior. Research
returns facts, failure hypotheses and evidence gaps. It does not approve a
solution.

Exit: decision roles have sufficient evidence or uncertainty is explicitly
recorded.

### 4. ARCHITECTURE GATE

Architecture & Integration Lead is mandatory for core/lifecycle, cross-module,
shared runtime/state, persistence, performance-sensitive observation and cleanup
risk.

Exit: implementation mechanism, ownership, failure modes and required technical
regressions are approved.

### 5. DESIGN CONTRACT

Every visible or interaction change activates Lead UI/UX Designer / Pixel Art
Director. The designer defines the expected **rendered result**, not only token or
class usage. Shared-component changes also activate Design-System Engineer for
implementation.

The design handoff must include, where applicable:

- exact geometry and spacing intent;
- component/state family;
- default/hover/pressed/selected/focus/disabled states;
- overflow/scrollbar/wrapping behavior;
- reference screenshot or explicit visual comparison target;
- which details are domain-colored and which are design-system chrome.

Exit: Visual QA can judge the result without reading the implementation author's
intent into the pixels.

### 6. TASK SLICING / OWNERSHIP

The PM assigns one writer per shared authority surface and separates authoring from
review. Review roles must not share responsibility for producing the diff they
judge.

Exit: every write surface and every gate has an owner.

### 7. IMPLEMENTATION

Feature / Module Engineer and, when activated, Design-System Engineer implement the
approved contracts. Author-written tests are required but are **author evidence**.
They do not constitute independent QA by themselves.

Exit: focused author verification passes and the engineer provides a criterion-by-
criterion handoff.

### 8. ENGINEERING VERIFICATION — `TECH-CANDIDATE`

Run focused tests, relevant regressions, syntax/static checks, build and
`git diff --check` as appropriate.

For bug fixes, add a regression that would fail on the faulty behavior whenever
practical. For non-trivial work, the engineer must identify at least one plausible
failure mode not covered by the happy path.

Exit: candidate may enter independent review. This stage never grants visual
readiness.

### 9. TECHNICAL QA — `TECH READY / NOT READY`

Independent QA Reviewer is read-only. The reviewer must inspect the diff and
perform independent/adversarial verification rather than only re-running the
author's test command.

For non-trivial changes the review must contain at least one reviewer-selected
negative/edge check not supplied as the author's primary proof.

Exit outcomes:

- `TECH READY`
- `TECH NOT READY`

### 10. UX/A11Y QA — `UX READY / NOT READY`

Required for interaction, focus, keyboard, accessibility, responsive semantics or
meaningful information-hierarchy changes. This reviewer judges UX/accessibility
behavior and design-contract consistency. It does **not** issue a visual-fidelity
verdict from source code.

Exit outcomes:

- `UX READY`
- `UX NOT READY`

### 11. VISUAL REGRESSION QA — `VISUAL READY / NOT READY / EVIDENCE INSUFFICIENT`

Mandatory for **every visible UI change**, even small polish.

The Visual Regression Reviewer is independent and render-first. The first pass must
use the acceptance criteria plus actual visual evidence; source/test inspection may
follow only to diagnose findings.

Acceptable visual evidence, strongest first:

1. Product Owner supplied live screenshot/recording of the exact candidate;
2. representative local browser render using the real/snapshotted host CSS/DOM;
3. deterministic component preview that reproduces the affected host constraints.

Source code, CSS text, DOM strings, test counts and token assertions are **not
visual evidence**.

The reviewer checks at minimum the changed component and nearby composition for:
geometry, spacing, alignment, clipping, overflow, scrollbar chrome, text wrapping,
state visuals, host-style leakage, pixel crispness and unintended visual change.

If representative rendered evidence does not exist, the reviewer returns
`VISUAL EVIDENCE INSUFFICIENT`; they do not infer `VISUAL READY` from code.

### 12. PM ACCEPTANCE — HANDOFF AUTHORIZATION

The PM reviews the Acceptance & Evidence Matrix, not just reviewer labels.

The PM may authorize a normal Product Owner validation candidate only when:

- every acceptance criterion has the required evidence;
- there is no unresolved `TECH NOT READY`, `UX NOT READY` or `VISUAL NOT READY`;
- reviewer verdicts apply to the exact candidate/artifact;
- no reviewer relied on an out-of-domain proof (for example tests as proof of
  visual correctness);
- documentation accurately distinguishes validated facts from remaining live-only
  uncertainty;
- candidate versioning prevents stale userscript delivery.

If Visual QA returned `EVIDENCE INSUFFICIENT`, the PM has two choices:

1. obtain a better local/rendered artifact and repeat Visual QA; or
2. when the missing evidence is inherently live-only and no reasonable local
   render can close it, hand off a **pre-live diagnostic candidate with visual
   evidence gaps**, explicitly listing each unverified item.

The PM must not label option 2 `VISUAL READY`, `fully READY`, `approved`, or imply
that independent QA proved appearance.

### 13. RELEASE CANDIDATE PREPARATION

Release / Docs Integrator records version/artifact/hash and runs final reproducible
checks. Every changed live-validation userscript uses a newer `@version` than the
previous delivered candidate.

Release preparation cannot repair feature code; findings return to implementation
and invalidate downstream verdicts as appropriate.

### 14. PRODUCT OWNER LIVE VALIDATION

Only the Product Owner installs/opens/reloads/controls the live game/Tampermonkey.
Agents provide the exact candidate and a narrowly defined validation checklist.

Product Owner rejection overrides all agent readiness labels and returns the task
to the earliest affected contract/implementation/review stage.

Approval changes the exact candidate to `user-validated` only for the explicitly
validated scope.

### 15. REPOSITORY / HISTORY COMPLETION

Commit/push/merge/publish only under applicable authorization. UI work awaiting a
required Product Owner gate does not merge to `main`.

## Canonical states

| State | Meaning |
| --- | --- |
| `intake` | request captured; evidence/gates unresolved |
| `contracting` | acceptance/architecture/design contracts being defined |
| `implementation` | authorized code/design-system implementation |
| `tech-candidate` | author verification complete; independent review pending |
| `review-reset` | prior review evidence is historical/invalidated; required gates must be re-run under the current candidate/governance |
| `tech-ready` | independent technical QA passed exact candidate |
| `ux-ready` | required UX/A11y QA passed exact candidate |
| `visual-ready` | representative rendered visual evidence passed Visual QA |
| `visual-evidence-insufficient` | no adequate render exists; appearance is not agent-validated |
| `pm-accepted` | PM has audited evidence and authorized the handoff class |
| `pending in-game validation` | exact candidate awaiting Product Owner live validation |
| `user-validated` | Product Owner approved exact candidate/scope in game |
| `repository-completion` | authorized history/release actions in progress |
| `done` | required delivery/history actions complete |

There is no generic project-wide `READY`. Every readiness claim must name its gate.

## Rejection loop

```text
FINDING -> owning contract/implementation role -> focused verification
        -> same independent gate that found it -> downstream gates as invalidated
```

Any source change after an exact-candidate review invalidates every downstream
artifact/hash-dependent verdict. Documentation-only changes do not invalidate the
artifact but must be separately checked for traceability.

## Skill usage

`docs/SKILLS_MATRIX.md` defines methods, not authority. A skill cannot convert
missing evidence into a pass, collapse independent roles, or bypass Product Owner
validation.
