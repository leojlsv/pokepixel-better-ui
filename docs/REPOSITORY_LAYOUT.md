# Repository layout and cleanup

Keep source code in `src/`, game assets in `assets/`, tests in `test/`, build
scripts in `scripts/` and standalone utilities/fixtures under `tools/`.
The supported application entrypoint is `src/index.js`, which consumes the
single module manifest `src/app/module-registry.js`; no second toggle/default
list belongs in a feature or a tool. The shared Python launcher at
`tools/python-toolchain.ps1` owns `.venv`/dependency installation for the
three sprite utilities, which retain their own individual environments.
The reproducible Pokémon Profile playground sources live in
`tools/pokemon-profile-playground/`; run `npm run playground` and visit its
documented local URL. Its watched bundle is generated under `work/`.

`dist/`, `node_modules/` and `work/` contain generated or local-only material.
Do **not** wipe them indiscriminately: `dist/` contains the current delivery,
`work/` includes untracked visual QA and sprite experiments, and the native host
may consume the bundle directly. `.local-evidence/` stores local validation
and provenance records, including archived root screenshots. These directories
are Git-ignored but may contain the only copy of important evidence.

WebView2 `tools/coupled-workspace-webview2/bin/` contains the normal host,
isolated candidate executables, dependency DLLs and named historical evidence.
Its `sdk/` retains the three DLLs used by the current x64 C# builder; the pinned
`Microsoft.Web.WebView2.1.0.4191.47.nupkg` preserves the complete SDK for
later extraction without another download. Extracted C++ static libraries and
unused platform-specific SDK files were retired. Do not remove the three DLLs,
the package, the normal host or pending non-PPTools candidate aliases. The
PPTools-specific host/runner path was removed from current tooling on 2026-10-02;
any surviving local binary is historical evidence only. The sprite source ZIP, extracted
PNGs and manifests under `tools/nayakoko-sprite-extractor/` are retained.

The Nayakoko source caches use transparent gzip compression for extensionless
pages, while keeping the original PNG files. `extractor.py` accepts both old
`*.bin` and new `*.bin.gz` cache entries. Run
`python tools/nayakoko-sprite-extractor/compact_cache.py <output-dir>` to
preview savings and add `--apply` for verified compression. Existing 50 extracted
sprites and the three comparison caches (including Gen 2) were preserved.

## Historical archive policy (2026-09-29)

The second deep clean removed duplicate PNG aliases only when an exact SHA-256
match survived, and retained every `work/` PNG explicitly cited by current
documentation. Older unique synthetic QA screenshots, generated HTML/JS/CSS
fixtures and discarded prototype directories were compressed into verified
archives under `.local-evidence/visual-archive/` or
`.local-evidence/deep-clean/`. Their per-file SHA-256 inventories also live in
`.local-evidence/deep-clean/`. The original cancelled Tampermonkey experiment's
README is now `docs/archive/PPTOOLS_TAMPERMONKEY_0.2.120_CANCELLED.md`; its
binary snapshot and superseded manual PPTools candidates are in verified local
archives. The latest frozen historical manual PPTools `0.2.118-r2` directory and
documented synthetic render captures may remain accessible as historical evidence;
there is no current opt-in PPTools host capability.

**Local evidence archives are Git-ignored.** They are recoverable on this
computer but will not travel with a new checkout unless explicitly copied or
preserved elsewhere. Do not treat historical source-code references to deleted
local intermediates as instructions to install those retired candidates.

## Reproducible housekeeping

```powershell
npm run clean:generated
npm run clean:generated -- --apply
```

The first command previews the exact allowlisted Python caches and temporary
WebView2 smoke output files. The second removes those items. When no local
synthetic WebView2 smoke or render is running, synthetic *browser profiles* can
also be removed, without deleting their fixture pages, screenshots or candidate
executables:

```powershell
npm run clean:generated -- --profiles
npm run clean:generated -- --apply --profiles
```

The script operates only on enumerated paths inside this repository and refuses
symbolic-link targets. It does not run `git clean`, reset source changes or
remove user-selected delivery bundles. Root-level ad hoc screenshots should
be archived in `.local-evidence/visual-archive/` before further development;
new authored tools belong under `tools/` rather than ignored `work/`.
