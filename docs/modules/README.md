# Modules

## UI/UX contract

Before changing a module's interface, read:

1. `design-system/pokepixel-better-ui/MASTER.md`;
2. the module page override under `design-system/pokepixel-better-ui/pages/`, if
   present;
3. `.skills/ui_ux_pro.md`.

Module documentation records behavior, integration constraints, evidence and
validation status. Historical wording such as `native-looking` describes the
implementation that existed at that time and does not override the current
pixel-art design system.

Every UI delivery must distinguish automated validation from the user's in-game
validation. Only the user can mark an interface delivery as validated in game.

Each production feature receives its own directory:

```text
src/modules/<feature>/
├─ index.js
├─ controller.js
├─ dom.js
├─ config.js
└─ styles.css
```

Keep selectors in `config.js`/`dom.js`, behavior in `controller.js`, and expose
the module contract through `index.js`.

The `example` module is intentionally disabled and exists only as a contract
reference.
