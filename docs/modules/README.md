# Modules

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
