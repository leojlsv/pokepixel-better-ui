# Project Roles

## Purpose

This project uses explicit roles so product decisions, design direction,
architecture, implementation and approval do not collapse into one agent.

Roles are **responsibility boundaries**, not permanent identities. One agent may
cover more than one role on a small task only when that does not create a review
conflict. An author must never provide the final independent approval of their
own design or implementation.

The user's explicit requirements and approvals remain above every role.

## Role model

### Product authority

| Role | Type | Owns |
| --- | --- | --- |
| Product Owner / Live Validator | human authority | product intent, scope/design approval, in-game validation, merge/publish authorization |

### Standing agent roles

These are the stable responsibilities used repeatedly across development. A task
activates only the standing roles that are relevant.

| Role | Owns | Must not own |
| --- | --- | --- |
| Project Lead / Coordinator | planning, decomposition, scope, role activation, handoffs, conflict escalation | silently override architecture/design/QA |
| Architecture & Integration Lead | functional/native integration, core/runtime architecture, lifecycle/state boundaries | product or aesthetic decisions |
| Lead UI/UX Designer / Pixel Art Director | information hierarchy, UX presentation, design-system/art direction, component treatment | production feature code or self-approval |
| Feature / Module Engineer | module production code, module tests, local integration/layout implementation | redefine requirements/design to justify code |
| Independent QA Reviewer | read-only technical gate, regression evidence, automated-ready verdict | edit the implementation under review |

### Specialist roles

Specialists solve a specific class of risk. Do not activate them mechanically on
every task.

| Role | Trigger | Owns |
| --- | --- | --- |
| Requirements Analyst | new/ambiguous/high-complexity workflow | detailed functional contract and acceptance criteria |
| UX/A11y & Design QA Reviewer | major redesign, accessibility risk, design-conformance uncertainty | independent visual/UX/accessibility gate |
| Design-System Engineer | shared `src/styles/**` or design-system runtime changes | implementation of approved shared visual primitives |
| Technical Researcher | evidence is incomplete or disputed | read-only source/fixture investigation |
| Pixel Artist / Asset Producer | approved brief says `ASSET NEEDED` | bespoke pixel/raster asset production |
| Release / Docs Integrator | candidate/release/merge preparation | version/changelog/build metadata and final handoff |

## Authority matrix

`F` = final human approval/validation, `O` = domain decision owner inside already
approved authorities, `E` = executor, `C` = consulted, `V` = independent verifier.
`O*` means the owner is conditional: activate only one contract owner for that
task stage.

| Decision / activity | Product Owner | Project Lead | Req. Analyst | Architect | Lead Designer | Feature Eng. | Design-System Eng. | UX/Design QA | QA | Release |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Product scope / feature intent | F | O/E | C | C | C | C | - | - | - | - |
| Functional contract | F for semantic change | O* ordinary | O* when activated | C/O for native constraints | C | C | - | V | V | - |
| Architecture / integration | F for material product tradeoff | C | C | O | C | E | C | - | V | - |
| Global/module visual direction | F for material new direction | C | C | C | O | C | C | V | C | - |
| Module implementation | - | C | C | C | C | O/E | - | V | V | - |
| Shared visual runtime implementation | - | C | - | C | C | C | O/E | V | V | - |
| Automated-ready verdict | - | C | - | C | C | - | - | V | O/V | - |
| In-game validation | F/E | - | - | - | - | - | - | - | - | - |
| Version/build/release candidate | F for publish/merge | C | - | - | - | C | C | - | V | O/E |

No role may use this matrix to override the source-of-truth order in `AGENTS.md`.
The matrix uses shortened column labels only for width; delegated tasks must use
the exact canonical role names listed above.

## Standard workflow

```text
Product Owner request
        |
        v
Project Lead: scope + role activation
        |
        v
Functional contract
(Project Lead, or Requirements Analyst when triggered)
        |
        +--------------------+
        |                    |
        v                    v
Architecture & Integration Lead    Lead UI/UX Designer / Pixel Art Director
(when triggered)         (UI/UX work)
        |                    |
        +----------+---------+
                   v
         Feature / Module Engineer
        (+ Design-System Engineer when shared runtime changes)
                   |
          +--------+--------+
          v                 v
 UX/A11y & Design QA Reviewer   Independent QA Reviewer
        (when triggered)          (technical)
          +--------+--------+
                   v
       [Release / Docs Integrator]
        (only for an actual release candidate)
                   |
                   v
        Product Owner in-game validation
                   |
                   v
           merge/publish when authorized
```

The Technical Researcher may be inserted before any decision role when evidence
is incomplete. The Pixel Artist / Asset Producer is inserted under the Lead UI/UX
Designer / Pixel Art Director only when an approved asset brief calls for bespoke
raster artwork.

## Activation rules

### New module or major redesign

Use Project Lead / Coordinator, Architecture & Integration Lead, Lead UI/UX
Designer / Pixel Art Director, Feature / Module Engineer and Independent QA
Reviewer. Add Requirements Analyst only when the
workflow/behavior contract is ambiguous or unusually complex. Major redesigns
also require UX/A11y & Design QA Reviewer. Add Design-System Engineer only if shared
runtime/primitives change. Add Release/Docs Integrator only when preparing an
actual release candidate/version/changelog/merge or publish handoff.

### Existing-module visual refinement with no behavior change

Use Project Lead / Coordinator, Lead UI/UX Designer / Pixel Art Director,
Feature / Module Engineer and Independent QA Reviewer.
Requirements Analyst is needed only when the existing functional contract is
unclear. Use a separate UX/A11y & Design QA Reviewer when the refinement is
high-risk, accessibility-sensitive or substantial enough to warrant a distinct
design gate; otherwise the Independent QA Reviewer may perform the documented
dual-lens review. Release/Docs Integrator is activated only for release-candidate
preparation.

### Functional bug fix with no visual change

Use Project Lead / Coordinator, Feature / Module Engineer and Independent QA
Reviewer. Add Requirements
Analyst for ambiguous expected behavior and Architecture & Integration Lead when
lifecycle/core/native-integration boundaries are involved.

### Core/runtime/cross-module change

Architecture & Integration Lead is mandatory before implementation. Lead UI/UX
Designer / Pixel Art Director is needed only when the change alters visible or
interactive behavior. Shared
design-system runtime changes additionally activate Design-System Engineer.

### Asset-only task

Use Lead UI/UX Designer / Pixel Art Director -> Pixel Artist / Asset Producer ->
UX/A11y & Design QA Reviewer. Add Feature / Module Engineer only when the asset
must be integrated into a module; add Design-System
Engineer only when it becomes a shared visual primitive.

### Documentation/governance-only change

Use Project Lead / Coordinator plus the owner of the affected domain and an Independent QA
Reviewer. Do not activate implementation roles mechanically.

## Non-negotiable separation of duties

- Product Owner approval cannot be inferred from an agent verdict.
- A Lead UI/UX Designer / Pixel Art Director may not approve their own design as
  UX/A11y & Design QA Reviewer.
- A Feature/Design-System Engineer may not provide the final QA verdict for their
  own diff.
- An Independent QA Reviewer is read-only for the work under review. Findings go back to an
  implementation role for correction.
- A Project Lead / Coordinator coordinates disagreements; they do not silently
  overrule the Architecture & Integration Lead, Lead UI/UX Designer / Pixel Art
  Director or Independent QA Reviewer. Escalate unresolved conflicts to the user.
- A Release/Docs Integrator must not fix feature code opportunistically.
  Release-blocking code findings return to the owning Engineer.
- No agent role may install, open, reload, control, inspect or validate Better UI
  in the live game, the user's browser or Tampermonkey. This applies to research,
  debugging, design review and validation alike; live interaction is exclusively
  user-owned.

## Shared-surface write ownership

Concurrent agents must not write the same shared authority surface. For each
task/run, the Project Lead assigns one write owner for:

- `design-system/**` — Lead UI/UX Designer / Pixel Art Director;
- `src/core/**` except `src/core/design-system.js` — Architecture & Integration
  Lead or an explicitly assigned Engineer working under its approved plan;
- `src/styles/**` and `src/core/design-system.js` — Design-System Engineer, with
  Architecture & Integration Lead review when injection/lifecycle changes;
- `src/modules/<feature>/**` — Feature / Module Engineer;
- release/status files such as `CHANGELOG.md`/README status — Release/Docs
  Integrator.

Other roles may review these surfaces but do not write them concurrently.

## Role switching

An agent may switch roles only when the switch is explicit in the task record.
For tiny low-risk work, Designer/Engineer or Architect/Engineer may be sequential
hats, but the independent review must remain separate.

The following combinations are prohibited for the same work item:

- implementation author + final Independent QA Reviewer;
- design author + final UX/A11y & Design QA Reviewer;
- feature author + Release/Docs Integrator when release work would require judging
  the author's own unresolved findings.

A single independent reviewer may perform both Design QA and technical QA for a
small UI task if that reviewer authored neither the design direction nor the
implementation and reports both review lenses explicitly.

## Conflict resolution

1. User requirement/approval wins.
2. Hard safety/gameplay/architecture invariant beats a visual preference.
3. Inside the safe solution set, approved MASTER/page direction controls visual
   decisions.
4. Interaction-contract changes return to the Product Owner.
5. QA reports noncompliance; QA does not redesign the feature to make it pass.
6. If two role owners cannot resolve a legitimate conflict from existing
   authorities, Project Lead escalates the decision to the user.

## Canonical handoff

Every role handoff should be concise and use these sections when applicable:

```text
ROLE
TASK / SCOPE
AUTHORITIES READ
RESULT
CHANGES
VALIDATION / EVIDENCE
FINDINGS OR RISKS
DECISIONS NEEDED
BLOCKERS
NEXT ROLE
```

Review roles additionally return `P0 / P1 / P2 / P3` findings and a
`READY / NOT READY` verdict. The verdict refers only to that review gate, never
to user-owned in-game validation.
