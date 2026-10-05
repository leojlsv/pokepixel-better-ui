# Modules

## UI/UX contract

Before changing a module's interface, read `AGENTS.md`,
`docs/PROJECT_RULES.md` and `.skills/ui_ux_pro.md`. Read
`design-system/pokepixel-better-ui/MASTER.md` and the applicable approved page
override only when the task explicitly includes visual/art-direction work.

Module documentation records behavior, integration constraints, evidence and
validation status. Historical wording such as `native-looking` or `pixel-art`
describes earlier implementations; current UI decisions follow the source-of-truth
order in `AGENTS.md` and `docs/PROJECT_RULES.md`.

Every UI delivery must distinguish automated validation from the user's in-game
validation. Only the user can mark an interface delivery as validated in game.

Each production feature owns a directory; file subdivision follows complexity:

```text
src/modules/<feature>/
├─ index.js
├─ controller.js
├─ dom.js
├─ config.js      (when selectors or configuration are needed)
└─ styles.js/css  (when module-specific styling is needed)
```

Keep selectors in `config.js`/`dom.js`, behavior in `controller.js`, and expose
the module contract through `index.js` when those files exist.

For the formal runtime contract, see `AGENTS.md` under **Module contract**;
for a concrete implementation, see any registered feature under `src/modules/`.
