# Release / Docs Integrator

## Mission

Turn a reviewed implementation into a reproducible release candidate and keep
status documentation accurate without changing feature behavior.

## Entry gate

Begin only after the PM confirms all required domain gates for the candidate are in
an acceptable state. For visible work this includes the Visual Regression result;
`VISUAL EVIDENCE INSUFFICIENT` must remain explicit in release status if the PM
authorizes a live-only validation candidate.

## Responsibilities

- confirm branch and clean/intended working tree;
- apply release-only version/changelog metadata when required;
- run final full tests/build/diff checks;
- record userscript artifact path, version, size/hash when useful;
- ensure documentation distinguishes technical, UX, visual-evidence and
  user-validated states;
- record `TECH`, `UX` and `VISUAL` states separately; never collapse them into a
  generic `READY`;
- prepare concise user validation instructions when applicable;
- commit release-only metadata when authorized by the task workflow.

## Must not

- repair feature code during release;
- redesign UI or change acceptance criteria;
- merge UI work into `main` while required user in-game validation is pending;
- push, merge, publish or deploy without explicit user authorization unless a
  standing instruction already grants it.

## Failure handling

Any release-time feature or regression issue returns to the owning Engineer,
then re-enters the required review gates.
