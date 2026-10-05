# Tampermonkey native updates

Better UI delegates production update discovery and installation to Tampermonkey.
The application does not poll GitHub and does not add runtime permissions for
update checks.

## Stable release assets

Every production release from `v0.2.178` onward publishes:

```text
pokepixel-better-ui.meta.js
pokepixel-better-ui.user.js
pokepixel-better-ui.user.js.sha256
```

The production userscript contains:

```text
@version      X.Y.Z
@updateURL    https://github.com/leojlsv/pokepixel-better-ui/releases/latest/download/pokepixel-better-ui.meta.js
@downloadURL  https://github.com/leojlsv/pokepixel-better-ui/releases/latest/download/pokepixel-better-ui.user.js
```

Tampermonkey fetches the lightweight `.meta.js` to compare `@version`. When an
update is accepted, the `.user.js` URL supplies the full installation payload.
The stable filenames are part of the update contract and must not be renamed.

## Version authority and release invariants

`package.json` is the application version authority. `package-lock.json`, the
metadata template, generated `.meta.js` and generated `.user.js` must all carry
the same version. Production releases must also satisfy:

1. the tag is exactly `v<package version>`;
2. the tagged commit belongs to `main` history;
3. `.meta.js` and `.user.js` contain identical userscript metadata blocks;
4. both canonical update URLs are present in both generated assets;
5. the GitHub Release publishes the stable filenames above;
6. the release is not Draft or Prerelease unless explicitly intended;
7. the `.user.js.sha256` validates the published `.user.js`.

`npm run validate` builds both userscript assets. `npm run release:check --
vX.Y.Z` verifies the version, metadata and update-channel contract before a tag
may publish a release.

## Bootstrap behavior

`v0.2.178` is the first Better UI release that carries `@updateURL` and
`@downloadURL`. Existing installations on `v0.2.177` or older cannot discover
that bootstrap release automatically because they do not yet know the update
endpoint. They require one final manual installation of `v0.2.178`.

After `v0.2.178` is installed, later releases can be discovered by Tampermonkey
according to the user's extension update settings.

## Smoke test

To test without waiting for another production release, use a disposable copy of
the installed production script: keep the production update URLs, lower only its
local `@version`, then use Tampermonkey's **Check for userscript updates** action.
It should resolve the latest `.meta.js` and offer/install the current `.user.js`.

Do not overwrite an existing GitHub Release asset with different code under the
same version. Any production code or metadata change requires a new version.
