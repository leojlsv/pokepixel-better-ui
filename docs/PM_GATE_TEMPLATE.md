# PM Acceptance & Evidence Record

Use this template for every non-trivial task. Visible UI work always requires the
Visual Regression section.

## Task

- Request:
- Branch / worktree:
- Baseline artifact / version:
- Previously Product Owner validated scope:
- Explicitly out of scope:
- Write owners:

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 |  |  |  |  |  | `open` |

Allowed criterion status:

- `open`
- `pass`
- `fail`
- `evidence-insufficient`
- `live-only`

## Risks / failure hypotheses

For each material risk, state what evidence would expose it. Do not write only
"tests pass".

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| R-01 |  |  | `open` |

## Gate results

- Author verification:
- `TECH READY / TECH NOT READY`:
- `UX READY / UX NOT READY / not triggered`:
- `VISUAL READY / VISUAL NOT READY / VISUAL EVIDENCE INSUFFICIENT / not visible`:
- Exact artifact/version/hash reviewed:
- Evidence unavailable:

## PM evidence audit

Before handoff, answer explicitly:

1. Does every `AC-*` have evidence of the right type?
2. Did any reviewer use tests/source as proof of rendered appearance?
3. Did independent reviewers add evidence rather than merely repeat author checks?
4. Did any source change occur after exact-candidate review?
5. Are visual evidence gaps unavoidable/live-only, or can a representative local
   render be produced first?
6. Is candidate version newer than the last delivered userscript?
7. Is previously validated scope unchanged unless explicitly reopened?

## PM decision

Choose one:

- `BLOCKED — findings must return to implementation/contract`
- `BLOCKED — evidence insufficient; produce stronger local evidence`
- `PRE-LIVE DIAGNOSTIC CANDIDATE — named live-only evidence gaps remain; not visual-ready`
- `PM ACCEPTED — exact candidate authorized for Product Owner validation`

`PM ACCEPTED` is valid only when every required gate is satisfied for the exact
candidate. For **visible work**, that requires `VISUAL READY`; a candidate with
`VISUAL EVIDENCE INSUFFICIENT` cannot use `PM ACCEPTED` and may only use the
pre-live diagnostic option when the missing evidence is genuinely live-only and a
reasonable representative local render cannot close it.

Rationale:

## Product Owner validation checklist

List only live-visible/live-functional items the Product Owner still needs to
check. Do not ask them to revalidate scope already explicitly approved unless the
new diff could reasonably affect it.
