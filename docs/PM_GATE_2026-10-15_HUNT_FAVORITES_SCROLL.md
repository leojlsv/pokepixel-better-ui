# PM Gate — Hunt Favorites local scrolling (0.2.202)

## Task and boundaries

- User report (2026-10-15): **"Favoritos em Hunt está sem vertical scroll quando passa de 5."**
  Accompanying live screenshot shows seven favorited Hunts with vertically clipped text.
- Working branch: `fix/hunt-favorites-scroll-0.2.202`.
- Preserve prior exact in-game approved releases-in-waiting: Inventory 0.2.200
  and Card Mode Return 0.2.201. `0.2.201` approved SHA-256:
  `63E1520EBAB7531A33AB9E102A1C591A6BFC7A3B3D153BF9A533660B4A71AD3A`.
- No commit/push/merge/release authorization implied. No gameplay automation,
  invented favorite data, host API changes or live-game agent validation.
- Write owner: Feature Engineer; independent Technical QA, UX/A11y QA and Visual
  Regression QA must inspect the exact final code/artifact.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Evidence and gate | Status |
| --- | --- | --- | --- | --- |
| `AC-HFS-01` | At most five fully legible Favorites rows on normal viewports; six or more can scroll to the last row | Favorites identities/count, Go/Remove actions and header outside scrollport | Browser geometry for 5/6/7/20 and synthetic test | `pass`: TECH READY + local VISUAL READY for represented scroll geometry |
| `AC-HFS-02` | Compact and pointer-coarse layouts keep complete rows and usable scrollbar; touch Remove remains unclipped | Hunts sidebar and MAP/LIST results remain reachable | Offline Chrome 320px and touch-emulated 390px, screenshots + row/scroll/Remove-clipping metrics | `pass`: UX READY + local VISUAL READY for represented scroll geometry |
| `AC-HFS-03` | Re-rendering Favorites and MAP/LIST changes preserve local scroll position; removing focused last row focuses nearest survivor | Same scroll owner, focus, stable list keys and reversible mount | JSDOM seven-item scroll reset, MAP/LIST and focused-removal regressions; independent 7/20/middle/external-focus probes | `pass`: UX READY |
| `AC-HFS-04` | No change to native Hunt entry, filtering, persistence, region eligibility or previously accepted fixes | Native method ownership/handlers, no duplicate states or new requests | Focused/full tests, build, bundle comparison against approved baseline | `pass`: TECH READY |
| `AC-HFS-05` | Actual user's Hunt window shows discoverable scroll and legible rows after five entries | Real host styles, input state, window geometry | PO replied "validado" to exact delivered 0.2.202 candidate on 2026-10-15; no per-viewport live evidence supplied | `user-validated` for reported corrective scope |

## Confirmed cause and negative reproduction

- Previously `.ppbui-hunts-favorites__list` had `display:grid` and
  `overflow-y:auto;max-height:132px`, but implicit grid row sizing remained `auto`.
- `.ppbui-hunts-favorite` had `overflow:hidden` and no own minimum track height;
  only child buttons had a 28 px minimum. CSS Grid shrank the seven rows to 15 px
  each rather than producing scrollable overflow. The actual DOM retained all
  seven favorites, so this was not a lost record or a server pagination issue.
- Pre-fix offline Chromium rendering with the current Hunts stylesheet returned:
  seven rows, 132 px `clientHeight`, **132 px `scrollHeight`**, zero scroll offset,
  seven **15 px** rows and clipped text — matching the user's symptom.

## Fix and local proof

- Only Hunts-owned layout/scroll behavior is changed: intrinsic
  `grid-auto-rows:max-content`, explicit row minimum size, `align-content:start`,
  stable scrollbar gutter, scoped scrollbar colors and a five-row cap calculated
  from the common control-height/border/gap tokens. Container width at most 360 px
  shows up to three rows; `pointer:coarse` uses 40 px button height plus row borders.
- Independent UX review found a 40 px touch Remove button clipped by its 28 px
  parent Grid column; a coarse-pointer 40 px column now matches the button width.
  Offline Chrome `removeClipped` was true before and false after the correction.
- Favorites `render()` restores the pre-render local `scrollTop` after updating
  rows, without a new observer, scroll timer, data duplication or host method patch.
- Independent UX review also found offscreen keyboard focus after removing a
  focused bottom entry in MAP. The removal handler now chooses the nearest surviving
  Go action by the original row index and allows browser focus scrolling, while
  retaining existing priority for a matching native LIST star. New MAP/7-item
  regression was RED before and GREEN after; unrelated focus remains untouched.
- The existing `Go`/`Remove` nodes are still created and dispatched only by the
  original Favorites controller; gameplay remains native `startHunt()`.
- New regression in `test/hunts.test.js` tests seven records, CSS track ownership,
  forced scroll reset during render, MAP/LIST reuse and action/data preservation;
  RED before the fix, GREEN after. Further regressions cover last-row removal
  and coarse-pointer Grid track width.
- Offline local Chrome evidence under ignored `work/hunt-favorites-scroll-202`:
  actual current Hunts stylesheet, synthetic native-shaped sidebar, computed row
  bounds, scroll position, last-row reachability/focus and screenshots. Counts
  **5 / 6 / 7 / 20**: max scroll **0 / 34 / 68 / 510 px** respectively, with
  30 px rows and a 166 px normal scrollport. At **320 px** viewport: 3 complete
  rows, max scroll 136 px. At 390 px with touch emulation: 42 px rows, max scroll
  184 px; no clipped text or inaccessible last row in measured cases.
- These six cases were re-run in an isolated headless Chrome with actual viewport
  emulation (`capture-cdp.mjs`, `*-cdp.png`, `cdp-metrics.json`). With five Favorites,
  `scrollHeight = clientHeight = 166` and max scroll is zero; with six, scroll is
  already positive. For 7 and 20, focusing the final button automatically scrolls
  its full row into view; list header remains outside the scroller. At 320 px and
  390 px coarse input, all row heights remain respectively 30 and 42 px. Every
  fixture with more than five Favorites has real scroll overflow and no clipped
  action text. Additional `seven-bottom-cdp.png` and `compact-bottom-cdp.png`
  show the final favorited Hunt and its removal action fully visible after local
  scrolling while the Favorites heading/count remain outside the scrollport.
  Latest browser metrics confirm `removeClipped=false` in all six viewports
  (previously `true` on 390px coarse pointer).
- Independent visual review of the final scoped local renders is recorded below;
  synthetic evidence does not establish the authenticated game's exact geometry.

## Verified gates / release boundaries

- Focused Hunts + Favorites tests: **71/71 PASS** (includes RED→GREEN seven-item
  scroll and focused-MAP-removal regressions). New pointer-coarse grid-track CSS
  assertion also reproduced the clip before the correction.
- Full suite: **802/802 PASS**; build **PASS**; `npm run release:check --
  v0.2.202` **PASS**; `git diff --check` **PASS** (CRLF conversion warnings only).
- Local pre-release advisory check `npm audit --audit-level=high`: **PASS,
  0 vulnerabilities** (read-only; must be repeated by the integrated CI).
- Independent Technical QA: **TECH READY** for exact SHA `F7604CA6...AED4B1A`,
  P0/P1/P2=0. Reviewer independently reran 802/802 full tests, focused Hunts+
  registry 68/68, release:check and diff-check. Offline CDP evidence and
  screenshot fingerprints were checked against the final stylesheet. Bundle
  diff against prior user-approved 0.2.201 confirms only Hunt Favorites CSS,
  scroll/focus handler and version changed. Earlier `EE86E79B...` is superseded.
- Independent UX/A11y QA: **UX READY** for exact frozen SHA `F7604CA6...AED4B1A`.
  Previous superseded SHA `EE86E79B...` was NOT READY due to offscreen deletion
  focus and clipped touch Remove. Independent final JSDOM probes with actual module
  confirm removal of final/middle entry with 7 and 20 items focuses nearest Go;
  intentional external focus move is not overridden. No P0/P1/P2 left.
- Independent Visual Regression QA: **VISUAL READY (represented local scroll
  geometry and target reachability only)** on inspected desktop/320px/390px
  coarse screenshots and matching Chrome metrics, with heading/count fixed,
  full-height rows, visible scrollbar, bottom actions and uncut 40px Remove hit
  region. Local synthetic preview does **not** certify the authenticated native
  game's entire window composition; the later PO acceptance is a separate gate.
- Exact generated candidate (identical to default `dist/pokepixel-better-ui.user.js`):
  `dist/pokepixel-better-ui-0.2.202-hunt-favorites-scroll-candidate.user.js`;
  **1,698,772 bytes**, SHA-256
  `F7604CA6E745F291AE2584AFDE916DD09B3D675FE9F402A8DF42A2A21AED4B1A`.
  Previous user-approved `0.2.201` artifact has unchanged SHA-256
  `63E1520EBAB7531A33AB9E102A1C591A6BFC7A3B3D153BF9A533660B4A71AD3A`.
- Product Owner in-game validation: **user-validated (2026-10-15)** for the exact
  0.2.202 Hunt Favorites scroll corrective.
- Commit, merge, push and GitHub release: **not performed**.

## PM evidence audit / handoff decision

For the exact 0.2.202 bundle, **TECH READY**, **UX READY** and scoped **VISUAL READY
for representative local scroll/action geometry** are supported by independent
read-only reviews and final tests. The two UX blockers found in the superseded
bundle were reproduced and closed before the final build. The previous approved
0.2.201 Inventory/Card Mode behavior is byte-identical aside from the new Hunts
Favorite corrective and version update; user validation of those earlier scopes
is not reopened.

Evidence limitations: the Chrome render uses a deterministic synthetic native
Hunts sidebar, not the authenticated game with the current host styles, effects
and complete surrounding composition. Visual approval is therefore bounded to
the directly represented Favorites scrollport/controls; the real in-game layout,
mouse wheel behavior, touch navigation and Hunt/Go flow require the Product Owner.
The PM authorized handoff of the **exact identified 0.2.202 diagnostic candidate**
for user-owned validation. The Product Owner subsequently replied **"validado"**
on 2026-10-15, changing the approved Hunt Favorites scroll corrective scope to
**user-validated**, without retroactively expanding the independent visual review
or claiming live checks of every viewport and input modality. No commit, push,
merge or publication was performed or authorized by that approval.

## Product Owner live acceptance — 2026-10-15

- Response: **"validado"** to the final 0.2.202 userscript supplied for testing.
- Scope: restoring local vertical scrolling after five Hunt Favorites in MAP/LIST,
  including the bundled touch Remove and keyboard-focus corrections. Earlier
  0.2.200 Inventory and 0.2.201 Card Mode approvals remain separate.
- Accepted file: `dist/pokepixel-better-ui-0.2.202-hunt-favorites-scroll-candidate.user.js`,
  **1,698,772 bytes**, SHA-256
  `F7604CA6E745F291AE2584AFDE916DD09B3D675FE9F402A8DF42A2A21AED4B1A`.
- State: **user-validated**, with repository completion and release pending
  applicable authorization; not published by this acceptance.

## Repository / release integration (2026-10-15)

- The Product Owner explicitly authorized integration, commit, merge, push and
  publication of `v0.2.202` after the three live-approved fixes were recorded.
  Their exact cumulative candidate SHA-256 remains the release acceptance gate:
  `F7604CA6E745F291AE2584AFDE916DD09B3D675FE9F402A8DF42A2A21AED4B1A`.
- Two Git remotes serve different purposes: `origin` is the private archive and
  `public` is `leojlsv/pokepixel-better-ui` where Tampermonkey production updates
  and GitHub Releases are published. The local private-archive `main` at `20e17b3`
  has unrelated Git history and **must not** be merged as unrelated histories.
  Public `main` at `5b221f9` does have the candidate ancestor `01c8dff`.
- Isolated branch `integrate/public-0.2.202` was prepared from `public/main`.
  Only approved source/tests/metadata and their supporting evidence were carried
  over. The published `README.md`, `assets/PROVENANCE.md` and
  `docs/TAMPERMONKEY_UPDATES.md` remained authoritative; the three approved
  changelog entries were inserted ahead of existing public release notes.
- The first clean Windows worktree build was **74 bytes larger** than the approved
  artifact, solely because `core.autocrlf=true` normalized the mixed LF/CRLF
  source bytes in `src/styles/base.css`. No CSS rule or JS semantics differed.
  Integration `.gitattributes` now sets
  `src/styles/base.css -text whitespace=cr-at-eol`, and the exact 698-byte
  approved source is stored verbatim. This avoids platform-dependent source
  normalization on Windows and Linux. The rebuilt `.user.js` then matched the
  approved **1,698,772 bytes and SHA-256 exactly**; `git diff --check` passed.
- Final gates: clean `npm ci`, `npm run validate` (802/802 and build), dependency
  audit, `npm run release:check -- v0.2.202`, and `git diff --check`. A GitHub
  Actions check on the integration branch must also pass. On the public repo,
  the tag commit must belong to `main` history; pushing `v0.2.202` automatically
  runs `.github/workflows/release.yml`, builds the bundle and publishes three
  assets: `pokepixel-better-ui.meta.js`, `pokepixel-better-ui.user.js` and
  `pokepixel-better-ui.user.js.sha256`.
- Release verification must confirm the public `.user.js` bytes/hash, matching
  version metadata, successful workflow and non-draft/non-prerelease status.

## Product Owner live checklist (historical)

In Hunts MAP and LIST with seven Favorites, verify five full rows on a normal
viewport and a usable vertical scrollbar to reach the sixth and seventh.
Check Go and × actions, heading/count stability, position after removing an
item and availability of the native Hunt results below Favorites. Narrow
viewports may show three complete rows to preserve the Hunt result workspace.
