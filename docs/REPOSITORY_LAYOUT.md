# Repository layout and cleanup

Keep source code in `src/`, shipped assets in `assets/`, tests in `test/` and build
scripts in `scripts/`.
The supported application entrypoint is `src/index.js`, which consumes the
single module manifest `src/app/module-registry.js`; no second toggle/default
list belongs in a feature or parallel utility.

`dist/`, `node_modules/` and `work/` contain generated or local-only material.
Do **not** wipe them indiscriminately: `dist/` contains the current delivery and
`work/` includes retained visual QA evidence. `.local-evidence/`
stores local validation and provenance records, including archived root screenshots. These directories
are Git-ignored but may contain the only copy of important evidence.

## Historical archive policy (2026-09-29)

The second deep clean removed duplicate PNG aliases only when an exact SHA-256
match survived, and retained every `work/` PNG explicitly cited by current
documentation. Older unique synthetic QA screenshots, generated HTML/JS/CSS
fixtures and discarded prototype directories may be compressed into verified
archives under `.local-evidence/visual-archive/` or `.local-evidence/deep-clean/`.
Their per-file SHA-256 inventories also live in `.local-evidence/deep-clean/`.

**Local evidence archives are Git-ignored.** They are recoverable on this
computer but will not travel with a new checkout unless explicitly copied or
preserved elsewhere. Do not treat historical source-code references to deleted
local intermediates as instructions to install those retired candidates.

Development helpers that do not ship with Better UI stay outside this repository.
Do not reintroduce parallel hosts, playgrounds, capture utilities, browser profiles,
sprite-generation pipelines or other local toolchains into the product tree.
