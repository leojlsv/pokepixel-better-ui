# Project Roles

## Principle

Roles exist to create **different kinds of evidence**, not more copies of the same
review. A role is activated only when its domain is needed. More reviewers are not
better if they all inspect the same tests and source.

The Product Owner is the final product authority and only live validator. The
Project Manager is the delivery gatekeeper and is accountable for whether the
evidence justifies progression.

## Canonical roles

### Product authority

| Role | Owns |
| --- | --- |
| Product Owner / Live Validator | product intent, priorities, material behavior/design approval, live validation, merge/publish authorization |

### Delivery authority

| Role | Owns | Cannot substitute for |
| --- | --- | --- |
| Project Manager / Coordinator | acceptance matrix, scope, role activation, evidence audit, gate progression, handoff authorization | Product Owner live approval or domain review evidence |

### Contract / implementation roles

| Role | Activate when | Owns |
| --- | --- | --- |
| Requirements Analyst | behavior is new/ambiguous/complex | observable acceptance criteria, states, invariants, edge cases |
| Technical Researcher | native/runtime facts are uncertain | read-only evidence and uncertainty reduction |
| Architecture & Integration Lead | core/lifecycle/shared state/native integration risk | lifecycle, state ownership, integration mechanism, failure modes |
| Lead UI/UX Designer / Pixel Art Director | a visual/interaction decision must be invented or materially redesigned | rendered design contract, hierarchy, states, art direction |
| Design-System Engineer | shared visual primitive/runtime changes | shared `src/styles/**` / design-system implementation |
| Feature / Module Engineer | module implementation changes | production module code and author regression tests |
| Pixel Artist / Asset Producer | approved brief says `ASSET NEEDED` | bespoke pixel/raster assets |

### Independent review roles

These roles must produce distinct evidence.

| Role | Gate | Primary evidence |
| --- | --- | --- |
| Independent QA Reviewer | `TECH READY / TECH NOT READY` | code/diff, lifecycle, behavior, independent edge checks, builds/tests |
| UX/A11y QA Reviewer | `UX READY / UX NOT READY` | interaction semantics, focus/keyboard/ARIA, responsive information behavior |
| Visual Regression Reviewer | `VISUAL READY / VISUAL NOT READY / VISUAL EVIDENCE INSUFFICIENT` | actual rendered screenshots/recordings/previews; never source/tests alone |
| Release / Docs Integrator | exact candidate traceability | version, artifact/hash, reproducible checks, status docs |

## Critical separation of duties

1. **Implementation author != Technical QA.**
2. **Design author != UX/A11y QA or Visual QA.**
3. **Visual QA is a separate discipline.** Technical QA and UX/A11y QA cannot
   issue `VISUAL READY` unless explicitly acting as a separate Visual Regression
   Reviewer and using qualifying rendered evidence. For visible changes, prefer a
   different reviewer to avoid confirmation bias.
4. **PM does not manufacture evidence.** The PM may reject a gate as insufficient
   even if the reviewer wrote `READY`.
5. **Release does not fix code.** Any feature finding invalidates the relevant
   downstream review and returns to the owning engineer.
6. **No agent performs live validation.** Product Owner only.

## Minimal role activation

### Exact visual polish, no behavior change

Example: "Sort +15px", "make this icon square", "fix scrollbar chrome".

Required:

```text
PM -> Feature Engineer (+ Design-System Engineer if shared primitive)
   -> Technical QA -> Visual Regression QA -> PM handoff
```

Lead Designer is **not** reactivated when the Product Owner requirement and
approved design system already determine the visual answer. UX/A11y QA is added
only if interaction/accessibility/information behavior changes.

### Visual decision or redesign required

```text
PM -> Lead Designer -> Engineer(s)
   -> Technical QA + UX/A11y QA (if interaction/semantics) + Visual Regression QA
   -> PM handoff
```

### Functional bug, no visible change

```text
PM -> Feature Engineer -> Technical QA -> PM handoff
```

Add Requirements Analyst if expected behavior is ambiguous. Add Architecture Lead
for lifecycle/core/native integration risk.

### Core/runtime/cross-module change

```text
PM -> Architecture Lead -> owning Engineer -> Technical QA
```

Add design/visual gates only when user-visible output changes.

### Shared visual primitive

```text
PM -> existing approved design contract OR Lead Designer if new decision needed
   -> Architecture Lead when src/core/**, injection/lifecycle or cross-module
      runtime behavior is touched
   -> Design-System Engineer (+ module engineer for adoption)
   -> Technical QA -> Visual Regression QA -> PM handoff
```

### Asset-only

```text
PM -> Lead Designer -> Pixel Artist -> Visual Regression QA
```

Feature Engineer is added only for runtime integration.

### Governance/documentation-only

```text
PM -> relevant domain owner/reviewer -> Independent QA
```

No implementation roles are activated mechanically.

## Authority matrix

`F` final human authority, `O` domain owner, `E` executor, `V` independent
verifier, `G` gatekeeper, `C` consulted.

| Activity | PO | PM | Req | Arch | Designer | Feature Eng | DS Eng | Tech QA | UX/A11y QA | Visual QA | Release |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Product intent/scope | F | G/O | C | C | C | C | - | - | - | - | - |
| Acceptance matrix | F for semantic change | O/G | C/E when activated | C | C | C | C | V | V | V | - |
| Architecture/integration | F for material tradeoff | G | C | O | C | E | C | V | - | - | - |
| New visual direction | F | G | C | C | O | C | C | - | V | V | - |
| Module implementation | - | G | - | C | C | O/E | - | V | V if triggered | V if visible | - |
| Shared visual implementation | - | G | - | C | C | C | O/E | V | V if triggered | V | - |
| Technical readiness | - | G | - | C | - | - | - | O/V | - | - | - |
| UX/A11y readiness | - | G | - | C | C | - | - | - | O/V | - | - |
| Visual readiness | - | G | - | - | C | - | - | - | C | O/V | - |
| Handoff authorization | F may reject | O/G | - | - | - | - | - | C | C | C | C |
| Live validation | F/E | - | - | - | - | - | - | - | - | - | - |
| Release metadata | F for publish/merge | G | - | - | - | C | C | V | - | - | O/E |

## Reviewer verdict vocabulary

Generic `READY` is prohibited in final project status. Reviewers return only their
domain-specific verdict:

- `TECH READY` / `TECH NOT READY`
- `UX READY` / `UX NOT READY`
- `VISUAL READY` / `VISUAL NOT READY` / `VISUAL EVIDENCE INSUFFICIENT`

P0-P3 severity is still reported. A visible violation of an explicit Product Owner
requirement is normally blocking for the visual gate even when technically harmless.

## Evidence independence

Independent review means more than a different agent name.

- Technical QA must add at least one reviewer-selected adversarial/edge check for
  non-trivial work rather than only re-run author tests.
- Visual QA starts from criteria + renders, not implementation source.
- UX/A11y QA tests semantics/operation, not whether token names appear in CSS.
- Reviewers must state what evidence they did **not** have.
- If two reviewers rely on the same evidence, the PM must not count them as two
  independent proofs of the same claim.

## Shared-surface write ownership

One write owner per task/run:

- `design-system/**` — Lead Designer when a design decision must be invented;
  Project Manager may record an explicit Product Owner-approved visual decision;
  Design-System Engineer may update implementation-facing primitive documentation
  for an already-approved decision, but neither may invent new visual direction
  through documentation;
- `src/core/**` — Architecture Lead or assigned Engineer under approved architecture;
- `src/styles/**`, shared visual runtime — Design-System Engineer;
- `src/modules/<feature>/**` — Feature / Module Engineer;
- release metadata/status — Release / Docs Integrator or PM when no separate
  release role is needed.

Review roles are read-only for the work they judge.

## Role switching

An agent may sequentially cover compatible author roles when explicit, but it
cannot later independently approve that work. For visible changes, the Visual
Regression Reviewer should be separate from the design and implementation authors.

## Conflict resolution

1. Product Owner requirement/approval wins.
2. Safety/gameplay/architecture invariants constrain the solution space.
3. Approved design system controls visual decisions inside that safe space.
4. Reviewer findings are not design authority; they identify failed criteria.
5. PM coordinates but cannot override a domain `NOT READY` into a pass.
6. Unresolvable authority conflict returns to Product Owner.

## Canonical handoff

```text
ROLE
TASK / AC-* SCOPE
AUTHORITIES READ
EVIDENCE USED
EVIDENCE NOT AVAILABLE
RESULT / DOMAIN VERDICT
FINDINGS P0-P3
RISKS / GAPS
NEXT ROLE
```

Every handoff must distinguish observed facts from inference. Review counts and
test totals never stand in for criterion-level evidence.
