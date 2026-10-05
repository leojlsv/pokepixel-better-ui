# Role and Skills Matrix

## Purpose

Skills are execution methods and review aids. They do not create project
authority. The precedence in `AGENTS.md`, domain ownership in
`docs/roles/README.md` and Product Owner approvals remain authoritative.

Project-native skills live in `.skills/`. External skills are referenced only;
they are not copied into this repository and must be re-checked at use time when
their current contents matter.

## Research provenance

The approved PM reorganization reviewed the three catalogs requested by the
Product Owner:

- SkillsMP: <https://skillsmp.com/>
- awesome-agent-skills: <https://github.com/heilcheng/awesome-agent-skills>
- skills.sh: <https://skills.sh/>

Catalog presence is not certification. Selection is based on fit with this
repository's separation of duties, browser/userscript architecture, UI/UX scope
and authorization boundaries.

## Matrix

| Role | Required project-native method | Supplemental external method | Use |
| --- | --- | --- | --- |
| Product Owner / Live Validator | project validation contract | none | product authority and live validation stay human-owned |
| Project Manager / Coordinator | `docs/PROJECT_WORKFLOW.md`, Acceptance & Evidence Matrix, role activation rules | `deanpeters/product-manager-skills: roadmap-planning`, `obra/superpowers: writing-plans`; `deanpeters/product-manager-skills: prd-development` for complex initiatives | criterion-level evidence planning, decomposition, sequencing, dependencies, gatekeeping |
| Requirements Analyst | project requirements contract | `deanpeters/product-manager-skills: prd-development` | acceptance criteria, states, edge cases and product invariants |
| Technical Researcher | read-only evidence contract | `mattpocock/skills: research` | primary-source investigation with facts separated from inference; PM controls delegation |
| Architecture & Integration Lead | `AGENTS.md`, `docs/ARCHITECTURE.md` | `obra/superpowers: systematic-debugging` when diagnosing complex failures | lifecycle, state ownership, integration and failure-mode analysis |
| Lead UI/UX Designer / Pixel Art Director | `.skills/ui_ux_pro.md`; `.skills/pixel_art_direction.md` when triggered | `anthropics/skills: frontend-design` as supplemental reference | hierarchy, interaction, design system and coherent visual direction |
| Design-System Engineer | approved MASTER/page contracts | implementation guidance only when compatible with project CSS rules | shared tokens/components/states and cross-module CSS ownership |
| Feature / Module Engineer | module/architecture/design contracts | `obra/superpowers: systematic-debugging` for non-trivial defects | scoped DOM/CSS/JS implementation and regression tests |
| UX/A11y QA Reviewer | `.skills/ui_ux_pro.md` + approved interaction authority | `openai/plugins: web-design-guidelines` as supplemental checklist after source review | focus, keyboard, ARIA, information semantics and responsive interaction review |
| Visual Regression Reviewer | `docs/roles/visual-regression-reviewer.md`, approved design authority | visual-diff tooling only when it operates on representative rendered artifacts | render-first geometry, spacing, state, overflow, scrollbar and host-style regression review |
| Independent QA Reviewer | `docs/roles/qa-reviewer.md` | `obra/superpowers: requesting-code-review`, `obra/superpowers: verification-before-completion` | independent technical evidence, adversarial regression review and exact-candidate technical readiness |
| Release / Docs Integrator | release role contract | `obra/superpowers: verification-before-completion`; `obra/superpowers: using-git-worktrees` only when isolation is useful | reproducible candidate/history preparation and final checks |
| Pixel Artist / Asset Producer | `.skills/pixel_art_direction.md` | optional production tooling from an approved asset brief | bespoke raster assets only after `ASSET NEEDED` |

External names above identify the source repository and researched catalog skill;
they are not mandatory dependencies. Project-native methods remain sufficient
when a third-party skill cannot be verified or does not fit the active task. Use
the useful method rather than inheriting unrelated automation, nested-agent,
commit or release behavior from an external skill.

## Selection rules

The Project Manager applies these filters before using an external skill:

1. It must add a concrete planning, research, implementation or verification
   capability relevant to the task.
2. It must not change the authority order or give a reviewer write ownership of
   the diff under review.
3. It must not auto-merge, auto-push, publish or create external side effects
   beyond the authorization already granted for the task.
4. Generic web guidance must be reconciled with the dense desktop-game decisions
   already approved in MASTER; generic breakpoint, target-size, typography or
   visual defaults are not copied mechanically.
5. A skill tied to an unrelated issue tracker, framework or release pipeline is
   skipped unless that dependency is actually part of the task.
6. Missing or unverifiable external guidance is reported as unavailable; no
   result or checklist is invented.
7. No skill may convert source/test evidence into visual evidence. Visual
   Regression Reviewer must inspect a qualifying render or report `VISUAL EVIDENCE
   INSUFFICIENT`.

## Deliberately excluded defaults

External QA/ship workflows that fix the reviewed code themselves, automatically
push/release, or require a project-specific issue tracker are not default Better
UI skills. Those behaviors conflict with read-only QA, single write ownership or
Product Owner history/release gates.

## Git/worktree note

`using-git-worktrees` is optional. Use it when isolation materially reduces risk
or parallel work would otherwise collide. Do not create a worktree mechanically
for every small task.
