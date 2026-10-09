# PM Acceptance & Evidence Record — Hunt Favorites

## Task

- Product Owner request: add Favorites to the current Hunt MAP/LIST selector, below Filters. Favoriting a Pokémon/Hunt adds it to that list so the player can go directly to that Hunt.
- Delivery target: same upcoming Better UI release package as the approved runtime-performance fixes; exact candidate is Better UI `0.2.191`, local/unpublished.
- Functional authority: current native Hunt selector, native region tabs and native `scene.startHunt()` remain authoritative.
- Explicitly out of scope: Hunt eligibility changes, custom network/gameplay requests, background automation, legacy Hunt Atlas redesign, commit/push/merge/release.

## Product contract

- A favorite represents one exact Hunt identity: native world/region + stable `zoneId` + user-facing label.
- LIST rows expose a compact `☆ / ★` favorite toggle without replacing `Hunt` or `Details`.
- A compact Favorites section sits below the current Filters area in the shared sidebar and remains available in both MAP and LIST.
- Activating a favorite from another region delegates to the existing native region tab, waits for the matching zone to become authoritative, then invokes the existing native Hunt flow exactly once.
- Active Search/Element/Level filters do not need to be cleared: Favorites target the authoritative native zone, not the currently filtered DOM row.
- Removing a favorite is non-destructive and never starts gameplay.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Status |
| --- | --- | --- | --- | --- |
| AC-HF-01 | Current LIST rows expose one favorite toggle with explicit pressed state and accessible Add/Remove label. | Existing native Hunt/Details nodes, handlers and order. | DOM/handler regression. | `independent TECH/UX PASS` |
| AC-HF-02 | Favoriting an exact Hunt adds one deduplicated entry below Filters; unfavoriting removes it. | Native filter values and row state. | Store + UI regression. | `independent TECH/UX PASS` |
| AC-HF-03 | Favorites persist through current MAP/LIST reconstruction and module remount using a versioned Better UI storage key. | No account/game state mutation. | Storage/restart regression, denied-storage fallback. | `independent TECH PASS` |
| AC-HF-04 | Clicking a favorite in the current region starts the exact native zone exactly once. | Existing `startHunt()` wrapper and Cards zone provenance. | Native-call/index regression. | `independent TECH/UX PASS` |
| AC-HF-05 | Clicking a favorite in another region uses the native region tab first and starts only after the saved zone becomes authoritative. | Native region availability/disabled state; no invented navigation. | Cross-world asynchronous/reconcile regression. | `independent TECH/UX PASS` |
| AC-HF-06 | Missing/disabled region or missing zone fails closed with textual unavailable feedback and no wrong Hunt start. | No stale index reuse. | Negative regression. | `independent TECH PASS` |
| AC-HF-07 | Favorites remain available in MAP and LIST; row star decoration is LIST-only and reacquires after native LIST reconstruction. | Current MAP content/markers and LIST table ownership. | MAP/LIST replacement regression. | `independent TECH/UX PASS` |
| AC-HF-08 | Stable reconcile produces no mutations, duplicate controls, storage writes or gameplay calls. | Existing Hunts quiescence/performance. | Mutation/storage counters. | `independent TECH PASS` |
| AC-HF-09 | Cleanup removes all Better UI favorite controls/surfaces and leaves the latest native Hunt DOM/action behavior intact. | Reversibility and focus. | Cleanup/remount regression. | `independent TECH/UX PASS` |
| AC-HF-10 | Compact/narrow layout keeps Favorites locally bounded without hiding Search/Filters or pushing the primary result workflow behind unnecessary framing. | Current responsive Hunt hierarchy. | CSS contract + representative local render/Visual QA. | `UX PASS; Visual evidence insufficient; PO live pending` |

## Risks / failure hypotheses

| Risk | Why plausible | Required mitigation |
| --- | --- | --- |
| R-HF-01 | A saved zone index becomes stale after region/filter rebuild. | Persist `zoneId`, reacquire index from current native `_zones`; never persist index. |
| R-HF-02 | Cross-world favorite could start before the new native region has rendered. | Pending favorite resolves only when region identity + `zoneId` both match authoritative current scene. |
| R-HF-03 | Star buttons could duplicate on repeated reconcile. | Better UI-owned dataset sentinel + delegated events + deterministic cleanup. |
| R-HF-04 | Favorites could become a second gameplay implementation. | Only select authoritative index and delegate to existing wrapped `scene.startHunt()`; no API/network calls. |
| R-HF-05 | Local persistence may be unavailable/corrupt. | Fail to session-memory storage, sanitize all records, never block Hunts. |

## Gate state

- Implementation: complete in local candidate `0.2.191`; no commit/push/merge/release performed.
- Author verification after independent corrective work: final focused Hunt/Favorites/build-contract **72/72 PASS**; full repository suite **712/712 PASS**; build PASS; release contract PASS; `git diff --check` PASS.
- Exact local artifact after the Product Owner-requested visual refinement: `dist/pokepixel-better-ui.user.js`, SHA-256 `DD15A1D35BC5ADBC3F99BDCF872F9227976BCCC56CDE746B4E914DBB070BA2E2`.
- Author visual evidence now loads the exact current Hunts stylesheet instead of relying on fixture-only chrome: `hunt-favorites-preview.png` 1366×768 SHA-256 `90040C1F093966D1E1C0D60964122B7A600FF8DB27B5431D7C267C0A4C69D611`; `hunt-favorites-preview-760.png` SHA-256 `529001AAAE7A995780D30BF418CCF5E512646C7C54F1E27BFA6AEDF201EC5BDF`; `hunt-favorites-preview-390.png` SHA-256 `DF0F97A0E56B05C5A6F008691E71F608E7390AFB9F87B6109963A040BFA7EAFC`; `hunt-favorites-preview-310.png` SHA-256 `A2437D9AFDA966F2E3F135AF5A771FD5ABA3FC5BA372B3ED4741B33557DECAB5`. Desktop/intermediate renders show the intended unified Favorite row, selected accent, region chip and separate remove action. The synthetic narrow shell still clips its sidebar right edge and is not treated as authoritative native-layout evidence.
- Independent Technical QA: **TECH READY**, `P0=0 P1=0 P2=0`. The adversarial composite-key collision found in the first review was closed by collision-proof tuple serialization and an explicit separator-bearing-ID regression. Independent follow-up also verified no new lifecycle/network/gameplay path from the focus/pending corrective. Residual `P3`: a hypothetical synchronous throw from native region `tab.click()` would propagate and then be cleared by the existing timeout; native click is expected to be non-throwing and this is not a release blocker.
- Independent UX/A11y QA after the visual refinement: **UX READY**, `P0=0 P1=0 P2=0 P3=0` for the CSS delta. The unified row keeps Go and `×` distinct, selected state remains explicit, focus-visible/coarse-pointer treatment is preserved, and long region labels are width-bounded with accessible full text retained by the Go label/title.
- Independent Visual Regression QA after the visual refinement: **VISUAL EVIDENCE INSUFFICIENT**, with `P0=0 P1=0 P2=0 P3=0` identified in the CSS delta. Synthetic 390/310 fixtures still compress the host shell unrealistically; no defect was confirmed. Final native visual authority belongs to the Product Owner.
- Product Owner in-game evidence on 2026-10-09: **PASS / APPROVED**. The Product Owner first validated the live structure and then, after the requested visual refinement, explicitly confirmed: “Favoritos do Hunt/Maps validado e aprovado.” This closes both functional/structural and visual live validation for Hunt Favorites on the exact local `0.2.191` candidate.

## PM decision

`PRODUCT OWNER APPROVED — HUNT FAVORITES ACCEPTED FOR RELEASE FLOW`

The exact Hunt Favorites scope is approved in-game by the Product Owner. Automated verification and independent TECH/UX review remain green, and no confirmed visual defect remains. This approval closes the Favorites product gate only; commit/push/merge/release remain unauthorized and have not been attempted. The Product Owner separately reported residual game hiccups, which are tracked as a new performance investigation rather than reopening the approved Favorites scope.
