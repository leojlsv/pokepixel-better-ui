# Contributing

Contributions to PokePixel Idle Better UI are welcome when they preserve the
project's core rule: improve presentation and interaction without bypassing the
host game's authoritative rules, permissions or state.

## Development setup

Requirements:

- Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`
- npm

Install and validate:

```powershell
npm ci
npm run validate
```

`npm run validate` runs the complete JavaScript regression suite and rebuilds
the userscript. Generated output under `dist/` is intentionally Git-ignored.

## Pull requests

Keep changes focused and reviewable. A pull request should:

- explain the user-facing problem and the proposed behavior;
- include or update automated coverage for functional changes;
- preserve reversible lifecycle/cleanup behavior for DOM enhancements;
- preserve keyboard, focus and accessibility behavior where applicable;
- avoid unrelated formatting or repository-wide churn;
- pass `npm run validate` and `git diff --check`;
- pass `npm audit --audit-level=high`;
- contain no credentials, private evidence, browser profiles or local machine
  paths.

Do not add parallel desktop hosts, capture utilities, browser profiles, local
playgrounds or other development toolchains to this product repository.

## Live-game validation

Automated tests and synthetic fixtures do not prove live compatibility. Project
maintainers own the final live-game validation step for accepted changes. Do not
use contribution work as a reason to bypass game/server restrictions or to test
against third-party infrastructure in a disruptive way.

## Licensing

By contributing, you agree that your contribution may be distributed under the
repository's MIT License and that you have the right to submit the material.

Do not add images, fonts, copied fixtures or other third-party material unless
its redistribution and licensing provenance is documented. Raster assets that
ship in the userscript are tracked in `assets/PROVENANCE.md`.
