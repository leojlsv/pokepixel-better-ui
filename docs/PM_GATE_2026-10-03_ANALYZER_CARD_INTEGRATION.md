# PM Gate — Card Mode ↔ Hunt Analyzer integration

**Date:** 2026-10-03
**Better UI candidate:** `0.2.155`
**Hunt Analyzer candidate:** `1.15.2`
**Status:** automated technical validation green; independent TECH READY; UX READY;
Product Owner in-game validation APPROVED.

**Frozen validation tuple:** local candidate bundle
`ppbui-analyzer-integration-0.2.155-1.15.2`.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `pokepixel-better-ui-0.2.155.user.js` | 1,276,814 | `A3C070124156318EF237A9C37048B8A540529DA7B7B60C56F613D5CA201E6145` |
| `pokepixel-hunt-analyzer-1.15.2.user.js` | 1,628,227 | `2012959F611202409DBD3B58664B83C59C54E380A16219599300F57D10DC9A86` |
| `pokepixel-hunt-analyzer-1.15.2.meta.js` | 761 | `C5D31B1851E4FA515BB048F501150E6CE1ACF6F809BE27B19E8A4B5C3C689179` |

## Scope and ownership

- Hunt Analyzer remains the authority for analytics, persistence and session actions.
- Better UI remains an optional consumer of bounded, versioned Analyzer contracts.
- Existing `__POKEPIXEL_HUNT_ANALYZER_PUBLIC__` protocol 1 and
  `__POKEPIXEL_HUNT_ANALYZER_CONTROL__` protocol 1 remain compatible.
- New standalone-only `__POKEPIXEL_HUNT_ANALYZER_UI__` protocol 1 accepts only
  semantic, allowlisted detail destinations. Embed mode deliberately exposes no UI
  bridge.
- No Better UI code reads Analyzer Shadow DOM, IndexedDB, raw WebSocket data or
  private session/encounter identities. Analyzer has no dependency on Better UI.
- Visual systems and persistence remain separately owned; no cross-project CSS or
  theme-storage dependency was introduced.

## Acceptance and evidence matrix

| Criterion | Acceptance | Evidence | Status |
| --- | --- | --- | --- |
| AC-INT-01 | Each extension still operates without the other. | Optional capability tests; standalone/embed Analyzer tests; Better UI absent/wrong-protocol tests. | PASS automated |
| AC-INT-02 | Summary/control protocol 1 behavior remains compatible. | Analyzer full suite; Better UI Card Mode suite; source review. | PASS automated |
| AC-INT-03 | Card Mode opens Analyzer detail through semantic routes, never DOM selectors/native game Hunt Analyzer commands. | `public-ui.test.js`, `publicUiNavigation.test.js`, `analyzer-ui.test.js`, Card Mode integration tests. | PASS automated |
| AC-INT-04 | Current deep links reveal the requested content even if the destination was persisted collapsed. | Regression preloads collapsed rarity and verifies expansion, persistence and focus. | PASS automated |
| AC-INT-05 | Closing/superseding a pending History deep link cannot steal focus later. | Deferred History regressions for close and newer-route supersession. | PASS automated |
| AC-INT-06 | Hunt/Expedition boundaries and copy are not conflated. | Card Mode lifecycle tests cover headings, Story/empty states and accessible console/dashboard names. | PASS automated |
| AC-INT-07 | Drilldowns are capability-gated and fail closed. | Missing, late, wrong-version and throwing UI bridge tests. | PASS automated |
| AC-INT-08 | Keyboard/focus behavior remains explicit and recoverable. | Analyzer History roving-tab tests, semantic navigation focus tests, external invoker restoration tests; Better UI existing keyboard suite. | PASS automated |
| AC-INT-09 | Existing approved Better UI `0.2.154` module-controls fix is preserved byte-for-byte at source/test level in `0.2.155`. | SHA comparison of `src/modules/module-controls/controller.js` and `test/module-controls.test.js` against the approved `menu-popup-viewport` worktree. | PASS |
| AC-INT-10 | Exact candidates build cleanly. | Better UI `npm test` 641/641, Python 11/11, build PASS. Analyzer `npm run audit:deps` 0 vulnerabilities, `npm run validate` 549/549 + PROD build + metadata verification PASS. | PASS automated |
| AC-INT-11 | Live visual/game behavior of the exact pair is accepted. | Product Owner validation in PokePixel/Tampermonkey on 2026-10-03. | PASS live |

## Independent review

- UX/A11y gate: **UX READY**, P0/P1/P2 = 0. Two non-blocking P3 observations:
  History subtabs omit `aria-controls` despite otherwise complete tab semantics, and an
  exceptional compatible-bridge navigation failure is announced in an SR-only live
  region rather than with additional visible error chrome.
- Initial TECH gate found two P2 issues: persisted-collapsed Current destinations could
  stay hidden after a semantic deep-link, and pending async History navigation could
  steal focus after close or a newer route. Both were corrected before the final gate.
- Independent post-fix TECH re-gate: **TECH READY**, P0/P1/P2/P3 = 0, blockers none.
  The reviewer independently revalidated all five persisted-collapsed Current routes,
  close-during-pending-History focus restoration, and newer-route supersession using a
  separate in-memory harness. Scoped gate suites passed Analyzer 35/35 and Better UI
  118/118; both scoped diffs passed `git diff --check`; worktree status remained
  unchanged and no build artifacts were regenerated.
- The TECH review also reconfirmed the protocol/dependency boundary: UI protocol 1 is
  allowlisted, standalone-only, identity-clean and bounded; PUBLIC/CONTROL protocol 1
  remain unchanged; Better UI remains optional/fail-closed and does not depend on
  Analyzer private DOM, IndexedDB, raw WebSocket data or private session/encounter IDs.
- Product Owner live validation: **APPROVED** on 2026-10-03 for the exact frozen pair.
  This closes the live visual/behavioral acceptance requirement for this candidate.

## Release state

After Product Owner live approval, commit/push/merge/tag/publication actions were
explicitly authorized on 2026-10-03.

- Better UI PR `#3` merged to `main` as `fb2586b38bda457b0720bf991612adf22b6539ee`
  after both CI jobs passed. Better UI has no project-defined tag/release publication
  pipeline, so no ad-hoc Better UI tag or GitHub Release was invented.
- Hunt Analyzer PR `#27` merged to `main` as
  `90c5fc002d12aafd82e4cb089bdbb9ec826d7e32`; `main` CI passed.
- The guarded `publish/v1.15.2` workflow completed successfully, created tag and
  published GitHub Release `v1.15.2`, then removed the temporary publish branch.
- Published Analyzer assets match the frozen candidate exactly: userscript SHA-256
  `2012959F611202409DBD3B58664B83C59C54E380A16219599300F57D10DC9A86` and metadata
  SHA-256 `C5D31B1851E4FA515BB048F501150E6CE1ACF6F809BE27B19E8A4B5C3C689179`.

The approved Better UI userscript remains SHA-256
`A3C070124156318EF237A9C37048B8A540529DA7B7B60C56F613D5CA201E6145`. A later code
change requires new candidate hashes and new live validation as applicable.
