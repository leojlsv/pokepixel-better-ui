# Approved Design References

This folder stores only visual references explicitly adopted for Better UI.

Use one subfolder per module, for example `hunts/`. Exploratory or rejected
generations stay outside the repository. If an external/generated asset is
adopted, keep stable non-secret provenance and local-file `sha12` metadata in a
module-local `asset-manifest.json`; never store credentials or expiring URLs.

References support the design system. They do not override `../MASTER.md` or an
approved page override under `../pages/`.
