# PokePixel Idle Better UI

Vanilla+ UI/QoL enhancement layer for PokePixel Idle.

## Principle

The player should notice that the interface became better before noticing that
its design changed.

The original game UI is the visual source of truth.

## Scope

- QoL improvements
- rearrangement of existing controls
- additional information
- search/filter helpers
- reduced interaction friction
- native-looking extensions

Not in scope:

- visual redesign
- gameplay automation
- replacement of game assets

## Development

Requirements:

- Node.js
- npm
- Tampermonkey-compatible browser

Install:

```powershell
npm install
```

Build:

```powershell
npm run build
```

Watch:

```powershell
npm run watch
```

Generated userscript:

```text
dist/pokepixel-better-ui.user.js
```

## Architecture

See:

- `docs/PROJECT_RULES.md`
- `docs/VISUAL_FIDELITY.md`
- `docs/ARCHITECTURE.md`

## Status

Foundation only. No production UI feature is enabled yet.
