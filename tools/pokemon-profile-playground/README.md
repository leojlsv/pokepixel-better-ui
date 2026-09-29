# Pokémon Profile Playground

Local-only visual fixture for the Pokémon Profile UI. Its sources now reside in
`tools/` so they can be included in the next authorized repository commit. It
does not access a live game session or participate in the production userscript build.

Run from the repository root with `npm run playground`, then open
`http://127.0.0.1:4177/tools/pokemon-profile-playground/pokemon-profile-playground.html`.

The server watches `pokemon-profile-preview.js` and generates
`work/pokemon-profile-preview-bundle.js` (Git-ignored). Historical screenshots,
ad hoc comparisons and other generated previews belong under `work/`; the HTML,
JavaScript fixture and server code are kept here so future checkouts can run the
documented playground once these files are committed.

The localhost server serves only its two HTML pages, the playground JavaScript,
the generated preview bundle and four shared CSS files; it does not serve Git,
other `work/` files or private local evidence.

The former `work/pokemon-profile-capture.mjs` and
`work/pokemon-profile-playground-smoke.mjs` scripts now live alongside this
fixture. They target a separately opened **local synthetic playground** through
its debugging protocol. Do not use either script on the live game/browser.
