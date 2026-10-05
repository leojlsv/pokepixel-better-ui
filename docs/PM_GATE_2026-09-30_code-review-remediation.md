# PM Acceptance & Evidence Record — src review remediation (2026-09-30)

> Registro histórico do candidato `0.2.123`. O Product Owner solicitou a remoção
> posterior de Custom Pokéball; ver `PM_GATE_2026-09-30_remove-custom-pokeball.md`.
> Os critérios AC-05 e AC-09, testes e checklist abaixo descrevem exclusivamente
> o candidato anterior e não fazem parte da entrega atual.

## Task

- Request: correct the nine concrete findings from the read-only `src` review.
- Branch: `refactor/team-pixel-art`; baseline `ae1bb46`, Better UI baseline `0.2.122`; correction candidate `0.2.123`.
- Previously validated scope: preserve all previously user-approved native actions and UI behaviors; these corrections do not imply new in-game approval.
- Out of scope: live game/browser/Tampermonkey access, gameplay automation, backend changes, `main` merge, commit/push and changes to the Hunt Analyzer producer.
- Write owners: Auto Helper and Pokémon Profile — Feature Engineer worker-1; Cards — Feature Engineer worker-2; Custom Pokéball, task record, build/handoff — PM/Feature Engineer prime. Independent reviewers must not approve their own diffs.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | A transient `Bus.on` failure restores Auto Helper DOM/inert state, and the next mount succeeds. | Native editor controls, focus and no gameplay changes. | Fault-injection synthetic DOM + recovery test. | worker-1 | independent QA | `pass` |
| AC-02 | Settings saves after replacing `PokeIdle` use the current API exactly once and retain pending changes. | Existing saver serialization/retry contract. | API-identity fixture + tests. | worker-1 | independent QA | `pass` |
| AC-03 | Profile Refresh and state resync read the current native moveset. | Existing moveset permissions and async identity fences. | Cache invalidation fixture + tests. | worker-1 | independent QA | `pass` |
| AC-05 | Master Ball marker survives native CaptureSequence/method replacement and restores ownership on cleanup. | Exactly one native variant call; foreign wrapper preserved. | Constructor/method-replacement tests. | prime | independent QA | `pass` |
| AC-06 | Hunt/Loot Story timestamps advance without history data changes. | Stable list nodes on unchanged render; localizations. | Clock-advance fixture + mutation assertions. | worker-2 | independent QA | `pass` |
| AC-07 | Standalone Cards visually retains Pokémon type labels at narrow viewports. | Text-only icon policy and wide layout. | CSS contract + responsive rendered evidence. | worker-2 | visual reviewer | `evidence-insufficient` (source/DOM pass; rendered layout unverified) |
| AC-08 | Appending to a multi-thousand-entry special history avoids rebuilding every prior row; no entries lost. | Filters, sprite hydration, ordered full history and quiet reconcile. | Large-history fixture/benchmark + regression tests. | worker-2 | independent QA | `pass` |
| AC-09 | Custom Pokéball dialog confines focus while open, supports Tab/Escape/cancel, and restores trigger focus. | Native gameplay access when closed, palette persistence and cleanup. | Modal keyboard/focus fixture + UX review, rendered evidence where available. | prime | independent UX QA | `pass` (synthetic/UX; visual unverified) |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| R-01 | Mount failure after DOM mutation strands original controls. | Fault at Bus binding and successful subsequent mount. | `pass` |
| R-02 | Late asynchronous results overwrite new profile/settings identity. | Switch and replay fixtures with cleanup/reconnect. | `pass` |
| R-03 | Incremental history retains stale/duplicate rows when filters, sprite data or event order changes. | Changed-filter, prepend, append, unchanged-render tests. | `pass` |
| R-04 | Modal top-layer/breakpoint behavior differs from simulated DOM. | Independent UX and qualifying rendered regression review; if live-only, explicitly retain evidence gap. | `live-only` |

## Gate results

- Author verification: `npm test` **579/579 PASS**; `npm run build` PASS; `git diff --check` PASS. New focused regressions were observed failing against the defective implementation before the corresponding fixes; a late-unavailable `CaptureSequence` regression was also confirmed RED before fixing `masterPatch` null-handling.
- Technical QA: cross-reviewed independent gates of Auto Helper/Profile AC-01–03, Cards AC-06–08, and Custom Pokéball AC-05 each reported **P0/P1/P2 = 0/0/0; `TECH READY`** for current source/tests. Reviewer-selected negative fixtures covered partial `Bus.on`/`off` failure and stale async moves, a 2,500-row Cards history, delayed timestamps, and late native CaptureSequence/foreign wrappers. An externally permanently failing native `Bus.off` cannot be repaired by this UI layer; the attempted rollback restores the original DOM and surfaces the error rather than claiming listener detachment.
- UX/A11y QA: independent Custom Pokéball AC-09 and Cards AC-06/07/08 reviewers reported **`UX READY`** on available source/DOM semantics; native top-layer rendering and narrow-layout appearance were not asserted from JSDOM tests.
- Visual QA: **`VISUAL EVIDENCE INSUFFICIENT`** on AC-07 narrow typography/layout and Custom Pokéball modal top-layer/clipping. Automated CSS/jsdom tests are not appearance proof. No qualifying local host render or Product Owner live screenshot of the exact candidate is available under the no-game/browser/Tampermonkey-access constraint.
- Exact candidate/version/hash: `dist/pokepixel-better-ui.user.js`, `@version 0.2.123`, 1,216,952 bytes, SHA-256 `9D40C9022D01ACCEACFAA99E3812A3C5A1BC858EB543144A659EFBD486822F12` from the local post-test build. The version is consistent in `package.json`, `package-lock.json` and `userscript/metadata.txt`.
- Product Owner in-game validation: pending.

## PM decision

**PRE-LIVE DIAGNOSTIC CANDIDATE — named live-only evidence gaps remain; not visual-ready.** No actionable P0/P1/P2 surfaced in the independent technical or UX reviews of the nine corrections. Source/test acceptance gates are closed except AC-07 rendered layout. In-game behavior and the actual rendered result cannot be claimed as approved by these checks, and no normal release/merge follows before the Product Owner's explicit validation.

## Product Owner live validation checklist

1. **Auto Helper / Pokémon Profile:** open/close and re-open the native Auto Helper; exercise settings save, native API rehydration if it happens in a session, and Refresh/resync of the selected Pokémon moves. Observe intact native controls and unchanged gameplay.
2. **Cards:** in Hunt and Loot Story, check timestamps advance and history/rarity/result filters retain all entries after additional encounters. At a narrow viewport (especially ≤519 px) verify both Pokémon type labels remain visible without clipping.
3. **Custom Pokéball:** verify Master Ball local appearance after native scene changes; open and close the editor using keyboard Tab, Shift+Tab, Escape and close button. Confirm focus returns to its trigger, the modal does not allow interaction behind it while open, and the native game controls work again after closing.

User in-game validation status: **pending**, applying to the exact `0.2.123` candidate/hash above.
