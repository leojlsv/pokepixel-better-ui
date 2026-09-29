# Professions — zero-stamina rotation contract (research / no executor)

**Retired implementation record (2026-09-28):** The Better UI Professions HUD
and its offline rotation preflight/helpers were removed on Product Owner request.
The research below is historical and has no current runtime implementation.

Status: **OFFLINE FOUNDATION APPROVED — automated mutation blocked**. After approval to continue on 2026-09-28, the structural preflight may be implemented and tested locally. This document describes the future increment after the read-only Professions HUD (`0.2.100 / candidate98`). Approval to proceed with preparation does not establish a native write contract or change the candidate. The Product Owner alone validates the game in use.

## Product objective and scope

Assess whether an exhausted Farm worker can be replaced by an eligible reserve using only the game's native permissions and APIs, while preserving the native Team, Wallet, Backpack and Professions menu. The approved current feature is **monitoring and manual navigation**. An automatic executor requires an explicit, separate Product Owner decision and closed native mutation evidence. Other professions (Fishing/Mining) are not included: their observed generic slot states do not prove per-worker Farm `stamina_basis` semantics.

## Observed read contract (confirmed from Product Owner probes)

| Source | Verified evidence | Safe interpretation |
| --- | --- | --- |
| `getFarmWorkforce().data.workers[]` | `creature_id`, `slot_index`, `stamina_basis`, `active_seconds`, `endurance_seconds`, `paused_reason` | An identified assigned Farm worker with `stamina_basis === 0` is exhausted; presentation-only autonomy is not an exhaustion trigger. |
| `getFarmWorkforce().data.candidates[]` | `id`, `stamina_basis` | An identified, unique, unassigned reserve with `stamina_basis > 0` is *monitor-ready*, not proven eligible for an assignment write. |
| `getProfessions().workforce.slots.{farmer,fisher,miner}` | Generic slot identities/status/recovery fields in bounded samples | Do not infer Farm stamina, permission to remove, or mutation success. |
| `getStamina()` | `stamina_ms`, `cap_ms` and related global state | Not an individual Farm worker rotation source. |

`assessFarmRotation()` in `src/modules/professions-hud/runtime.js` already produces a read-only set of exhausted Farm workers, ready reserves and a coverage boolean. The current decoder rejects missing/invalid active identities and deduplicates **candidate** identities, but it does **not** reject repeated active worker IDs, repeated/missing slot indices or paused workers from the coverage count. Consequently `covered: true` is only a descriptive count for the read-only monitor, **never a safe mutation precondition**. It does **not** select a replacement or perform a write. One captured snapshot is insufficient evidence that a reserve stays eligible during a later write.

The current snapshot's `readAtMs` is a **local client timestamp assigned after the separate reads finish**; it is not a server revision, compare-and-swap token or proof that `getProfessions()` and `getFarmWorkforce()` describe the same atomic state. Even `covered: true` for zero exhausted workers/zero reserves is only vacuous count coverage.

## Observed method signatures — *not* authorization to invoke

The Product Owner's diagnostic v2 established only method names and parameter order:

| API | Observed argument names |
| --- | --- |
| `assignProfessionWorker` | `professionId, creatureId, slotIndex` |
| `unassignProfessionWorker` | `professionId, slotIndex` |
| `assignFarmWorker` | `creatureId, slotIndex` |
| `removeFarmWorker` | `slotIndex` |
| `assignMiningWorker` | `creatureId, slotIndex` |
| `removeMiningWorker` | `slotIndex` |

Function signatures do not establish occupied-slot replacement, asynchronous outcomes, server validation, idempotency, rate limits or error shape. No observed atomic swap API has been validated. Never assume that `remove` followed by `assign` is an atomic swap; the first write could vacate the slot while the second fails.

## Reconciled historical evidence — do not repeat established discovery

The Product Owner supplied the capability probe and diagnostics v1/v2 on 2026-09-27/28. Their interpreted findings are preserved in `docs/PROFESSIONS_HUD_STATUS.md` under **Current native evidence**: existing getters and mutation-method names, the actual `getFarmWorkforce().data.workers[]` / `candidates[]` fields, distinct global `getStamina()` semantics, generic profession-slot samples, and observed method argument order. Those are **completed read/signature investigations**. The complete original JSON payloads were not found as standalone files in the current Better UI repository; this record must not claim to reproduce their raw responses or request the same probe again.

An earlier, independently supplied implementation is also available in the user's ChatGPT Library as `pokepixel-workforce-manager-v1.3.8.user.js` and `WORKFORCE_MANAGER-v1.3.8-technical.md` (2026-08-13). They are historical *manual-workflow evidence*, not a copy of a current live response:

| Established by the previous implementation | Exact scope of that evidence |
| --- | --- |
| `getProfessionData(kind, true)` obtains a new native `getFarmWorkforce()` response and separately reads account entitlement. `validateSwap()` checks the current worker identity at the selected slot, the chosen candidate and slot entitlement before requesting confirmation. | An implemented **manual pre-read and confirmation path**; no native state revision, atomic snapshot or candidate reservation is captured. Account reads may also be cached. |
| Farm maps to `getFarmWorkforce`, `assignFarmWorker`, `removeFarmWorker` and `collectFarmRewards`. `callProfessionAction()` awaits the native method, invalidates the local cache and returns its opaque result. | Native method invocation and promise awaiting are implemented; there is **no validated success/error response schema** or idempotency/compare-and-swap contract in this helper. |
| After explicit `CONFIRMAR TROCA`, the helper conditionally collects stored production, removes the worker, assigns the replacement and refreshes. On an assignment rejection after successful removal it reports `Troca incompleta` and that the slot was left vacant. | The manual sequence and partial-failure **handling path in source** are known; it is not an atomic replacement. The documentation/code alone do not demonstrate every server outcome or prove that an individual transition actually completed in the live game. |
| The helper's `availableSlots()` enumerates `1..maxSlots`; its entitlement rule uses one Free slot or three with active VIP, and it blocks newly assigning to VIP slots when the benefit is inactive. | Evidence of **the helper's one-based slot and entitlement assumptions**, not an authoritative current-game range or an exemption from native permission checks. The strict preflight still treats slot-base and pause-null assumptions as provisional. |

Therefore, **do not repeat** getter discovery, diagnostic v1/v2, API argument-order introspection, generic slot-shape inspection or reconstruction of the existing manual remove/assign flow. Further evidence must address a *specific remaining unknown* below; it must not be described generically as “test whether replacing a worker is possible.” The prior helper's explicit partial-failure behavior is affirmative evidence that sequential remove→assign requires recovery, not evidence of a safe unattended operation.

## Archived native transport audit — static evidence only

A separate user-provided native client listing, `Pasted text(20260828-084709).txt` (ChatGPT Library, uploaded 2026-08-28), was reviewed **statically**, without running that script or visiting the game. Its client-version fallback labels the code `2026.07.26-sync-guard-v1`; this is historical evidence, **not confirmation of the server or client currently loaded in the Product Owner's game**. Its obfuscated *literal path table* was decoded offline solely to identify the following documented public-method behavior:

| Historical client evidence | Consequence and limitation |
| --- | --- |
| `getFarmWorkforce()` calls `GET /professions/farming/workforce`; `assignFarmWorker(creatureId,slotIndex)` calls `POST /professions/farming/workers/assign` with `{creature_id,slot_index}`; `removeFarmWorker(slotIndex)` calls `POST /professions/farming/workers/remove` with `{slot_index}`. | These are separate requests, with no observed expected-worker, authoritative revision or transaction identifier in the Farm method arguments/body. A separate server guard cannot be excluded from client source alone. |
| The wrapper inserts an `Idempotency-Key` header only for an explicit method/path whitelist. It includes some Trainer/Hunt/Market/Breeding/Fishing/Gacha actions, but **neither Farm worker assign nor Farm worker remove**. The Farm methods also do not pass an explicit `idempotencyKey` option. | This **archived client does not explicitly attach an idempotency key to Farm worker writes**. It does **not** prove the current backend never deduplicates them through another mechanism. Do not synthesize or assume idempotency for automatic retries. |
| The request wrapper refreshes authentication and retries the original request at most once on HTTP **401**, for non-`skipAuth` calls, regardless of GET/POST. Its explicit transient-failure retry for network/408/425/502/503/504 cases is restricted to **GET** (maximum two retries). | A Farm POST can be replayed by the client on the authentication-refresh path, but this is **not evidence that the first 401 write was applied**. A rejected/unknown write still requires authoritative reconciliation; the archived wrapper provides no Farm-specific deduplication proof. |
| The transport parses a JSON response if present, returns that parsed value on HTTP success, and throws a structured API error for non-2xx HTTP responses (with status, code/message and optional retry metadata). | Generic HTTP error handling is known, but **Farm-specific success/failure response schemas, effects after timeout and server transaction guarantees remain unknown**. The older helper did not inspect the returned Farm result. |
| The GET cache TTL patterns include the exact root `/professions` but **not** `/professions/farming/workforce`; concurrent identical GETs can be coalesced by the wrapper. | An explicit Farm workforce read does not match this archived client's short-lived root-professions cache; that reduces one known source of stale reads without providing an atomic snapshot, a generation ID or proof of freshness in the current game. |

**Closed by static inspection:** client-side endpoint and parameter discovery, presence/absence of Farm-specific idempotency configuration **in that build**, request retry rules, generic HTTP response/exception routing and GET-cache matching. **Still open:** current game version parity; actual Farm POST return/error examples; server-side duplicate suppression, revision/locking, atomic replacement, write-result correlation, conflicting actions from other tabs, and recovery after a partially applied manual sequence. No general-purpose network interception, fabricated header or automatic write experiment is authorized by this audit.

## Future executor acceptance gates (required, not yet satisfied)

### Product Owner selection policy — approved for design, not execution (2026-09-28)

The Product Owner explicitly chose the following policy for a **future** automatic Farm rotation:

1. Among natively eligible reserves, select the Pokémon with the **highest Farm efficiency**; if efficiency ties, select the one with the **highest available stamina**. The efficiency metric must be an authoritative, validated Farm value (the historical manual helper used `efficiency.total_basis`); never silently treat missing/non-finite metrics as zero or invent an efficiency score.
2. If several assigned Farm workers are exhausted (`stamina_basis === 0`), **process slots in ascending native slot order**, subject to the server's proven concurrency/transaction contract. Re-read and revalidate authoritative worker identity, slot state and reserve eligibility before each operation; never assume that an earlier candidate list or slot snapshot remains valid.
3. The exact-tie case (equal efficiency **and** equal stamina) has **no approved final tie-break**. Do not select arbitrarily or mutate in that case until the Product Owner sets that final rule. Native slot-index convention and efficiency schema also remain subject to validation.

This resolves the two requested **preference decisions** in AR-04 only. It does **not** approve executing writes, select a replacement today, or satisfy the independent mutation/atomicity, stale-state and retry gates AR-02/03/05/06/07/08. The feature remains **off / no executor**, including if all ranking data happens to be present in a read-only snapshot.

| ID | Required outcome | Gate / evidence |
| --- | --- | --- |
| AR-01 | Feature defaults **off** and has a visible user-controlled enable/disable action. Disable/unmount prevents any new writes. | Product Owner scope approval; lifecycle/interaction tests. |
| AR-02 | Farm-only detection requires a fresh and internally coherent *authoritative* state: valid, unique assigned identities and slot indices, exactly zero `stamina_basis`, no ambiguous occupancy/paused/manual state. A positive read-only `covered` value or client `readAtMs` is insufficient. The permitted revision/freshness bound and invalidation rule must be demonstrated; otherwise fail closed. | Native state/version examples plus duplicate-worker, duplicate-slot, missing-slot, paused, delayed-read and mixed-generation negative cases. |
| AR-03 | Candidate must remain natively eligible **at the write boundary**, not already assigned and with `stamina_basis > 0`; duplicates/unknown identities fail closed. A fresh pre-read alone cannot guarantee this under concurrent writes. | Native eligibility response and authoritative precondition/serialization evidence, plus decoder tests. |
| AR-04 | **Owner-approved preference:** highest authoritative Farm efficiency, with highest available stamina as the first tie-break; handle multiple exhausted workers in ascending native slot order. The final tie-break for equal efficiency and stamina is **not yet defined**, and no invalid/missing efficiency value may be scored or selected. Until that detail and native metric/slot schemas are verified, display counts only. | Priority, first tie-break and slot ordering: **DECIDED 2026-09-28 (design only)**. Exact ties, authority/schema and executable validation remain open. |
| AR-05 | Mutation must use a **demonstrated atomic native replace** or an equivalent server-authoritative transaction preserving worker/reward state. If only unconstrained `remove` then `assign` exists, **automatic rotation remains blocked** even if both calls work manually. | Reuse the historical manual-sequence evidence; obtain only missing authoritative atomicity/transaction evidence and any specific live transition evidence not already recorded; independent architecture review. |
| AR-06 | One bounded in-flight operation per authoritative Farm workforce; no overlapping retries, blind compensating writes, or automatic replay after an unknown outcome. | Injected timeout, stale-state, double-event and reload tests. |
| AR-07 | Manual assignment/removal, another tab and feature-disable must not be overwritten by an obsolete decision. A local cancellation token alone cannot revoke an in-flight native write: require native revision-checked preconditions, server serialization or equivalent demonstrated authority at the mutation boundary; **without it, do not automate**. | Concurrent native/manual/tab changes, stale revision, disable-in-flight and cancellation regressions. |
| AR-08 | Only a confirmed successful, authority-checked native operation may update UI success state; read back authoritative slot identity. On rejection, timeout, version mismatch or unknown outcome, halt and require manual reconciliation. No blind retry or synthetic rollback. | Documented native return/error/idempotency shapes and synthetic failure tests. |
| AR-09 | Do not invent background polling, network interception, duplicate state stores or a hidden scheduler. Any refresh cadence needs native contract evidence and bounded costs. | API/read-call counter and observer/lifecycle tests. |
| AR-10 | Preserve the `0.2.100` Professions/Team/Wallet/Backpack placement and fallbacks; feature must remain usable if the full HUD cannot fit. | Independent TECH, UX and rendered visual review; Product Owner live validation. |

These are the agreed preparation criteria for a **future** executor, not passing acceptance criteria for the current userscript. No native assign/remove operation may be added until the authority evidence in AR-02/03/05/07/08 has been established and the executable design has passed independent review.

## Evidence still needed before an executor can be designed

The existing diagnostics and historical helper close **discovery of getters, payload keys, method names/arguments and the structure of the previously implemented manual workflow**. The earlier helper's source does not independently prove a successful current-game mutation. The following narrower questions remain open; none justifies asking for the old JSONs or rerunning the same schema probe:

1. **Write-time eligibility and authority:** what exact native precondition or server serialization prevents a stale candidate from being assigned, a manually changed slot from being removed or a VIP-ineligible slot from being written? The previously observed worker/candidate payloads and helper-side validation do not provide a server-enforced revision.
2. **Native outcomes:** the generic transport's JSON/error routing is known from the archived client; still needed are the **Farm-specific** resolved/rejected response shapes, permission/conflict codes, timeout/unknown-outcome behavior and server-side idempotency. The archived Farm methods do not opt into the client's `Idempotency-Key` whitelist, while the generic transport may replay a POST after one HTTP 401/reauth. The older helper awaits these calls but does not validate the returned object. A native UI before/after observation also **does not reveal a method's returned Promise shape or error protocol**; any deeper Product Owner-owned diagnostic needs separately approved, non-invasive collection.
3. **Replacement atomicity:** whether an *additional* native command or transactional backend protocol replaces an occupied Farm slot without exposing an intermediate empty slot or losing rewards. The **known manual helper** calls `collect → remove → assign` sequentially and explicitly handles a failed final assign; it is not evidence of atomicity or cross-tab protection.
4. **Reconciliation authority:** a fresh `getFarmWorkforce()` read is already implemented in the manual helper. What remains is the authoritative way to correlate its returned worker/slot identity with a specific write attempt, including an unknown result, stale/mixed-generation reads and manual/other-tab interference.
5. **Remaining owner decisions:** the final tie-break if **both** efficiency and stamina are equal; manual-action precedence; stopping/notification behavior; and separate explicit approval to enable any automatic execution. **Already decided:** efficiency descending, stamina descending for equal efficiency, and ascending native slot order for multiple exhausted workers. Do not request these choices again.

If a specifically *unobserved* manual state transition still needs evidence after checking the previous diagnostics and helper record, the **Product Owner must perform it in-game** using normal game controls and share only redacted structural results. Do not request a repeat of the established manual workflow. A before/after observation can inform state transitions, **not** prove atomicity or native API return/errors. Any deeper user-owned diagnostic needs its own explicitly approved, non-invasive method before collection. The agent must neither drive the game/browser nor invoke native mutation APIs. Do not request passwords, auth headers, player identifiers or full raw payloads. Until evidence and scope are accepted, only the existing read-only monitor and native `Prof.` shortcut are delivered.

## Relationship to candidate98

Product Owner reports the alternate `Prof.` button works, respects its anchor and is covered by Backpack. The full Professions panel is currently unavailable in the observed game composition, so its Farm data, Wallet clearance while dragging/resizing and Backpack-over-panel precedence retain **live-only visual gaps** in `docs/PROFESSIONS_HUD_STATUS.md`. This contract work does not close those gaps, trigger a new userscript version, or supersede the candidate98 TECH/UX evidence.

## Post-approval offline foundation (2026-09-28)

`src/modules/professions-hud/rotation-preflight.js` now provides a **disconnected, pure structural inspector** for a single Farm workforce response. It checks decoded active identity completeness, unique active creature IDs and slot indices, occupied slots versus `max_slots`, paused/ambiguous active states, and whether every raw candidate survives the monitor decoder without being silently discarded or deduplicated. Unsafe numeric slot/capacity values, a slot index above `max_slots`, or simultaneous `0` and `max_slots` indices fail closed; the native zero-/one-based slot convention is still unverified. The inspector provisionally accepts only **explicit `paused_reason: null`** as a structurally unpaused value; omitted/undefined/blank values are ambiguous until the native schema is confirmed, even if the read-only monitor displays them without a pause label.

Its result gives structural issues and counts, while `canMutate` is **always `false`**, including for a structurally valid snapshot. It does not consume a server revision, select a candidate, schedule reads, call native APIs or import into the mounted HUD. This is a prerequisite check only; it cannot satisfy AR-03/05/07/08 on its own, detect cross-tab races or turn the current `covered` value into write authority. `test/professions-rotation-preflight.test.js` exercises structural negative cases without using the game.

Independent Technical QA of the exact standalone source/test bytes: **TECH READY for the pure preflight only (P0–P3=0)**; local suites `7/7` focused and `508/508` full PASS. Native mutation authority and user-owned full HUD visual validation remain separate unresolved gates.

## Offline observation of a manual transition (disconnected)

### Imported Evidence Probe archive — 2026-09-28 (offline only)

The Product Owner placed 18 JSONL captures in `.local-evidence/incoming/`; the agent verified and imported all 18 unchanged into the private, Git-ignored archive. The local `catalog.json`, `import-report.json`, and `contracts-index.json` index 11,206 observed events. The normalized endpoint index is an **observational lookup**, not a server API specification. No live game/browser operation was undertaken by the agent.

For Farm specifically, the records include six `GET /api/v1/professions/farming/workforce` request events (five HTTP 200 responses, **all five bodies skipped**); three `POST /api/v1/professions/farming/rewards/collect` request/HTTP 200 pairs with a `slot_index` request field and `ok`/`rewards` response fields; and **one** `POST /api/v1/professions/farming/workers/remove` request carrying `slot_index`, with **no matching recorded HTTP response**. The remove request occurs at `2026-09-28T18:02:04.453Z` in session `f9f0e940-9ade-4ecc-bebc-1cf634f6d3fb`, followed by further UI activity and a workforce GET. That session contains eight `http.incomplete` events; a missing response cannot be interpreted as success, server failure, or a particular write outcome. No Farm `workers/assign` request was recorded in this batch. Miner's assign/remove responses are **not** substitutes for Farm mutation authority.

**Effect on gates:** the new evidence corroborates current Farm request method/path and fields, and confirms that the probe can correlate UI/network history at the request level; it does **not** close AR-02/03/05/07/08, prove server idempotency/atomicity, determine a native Promise return shape, or authorize automatic rotation. These captures contain page-level HTTP/UI/resource events, not the supplementary CDP/WebSocket/storage events; they cannot support claims of complete transport coverage. Further Farm evidence should be a **user-owned normal manual action**, not an agent-issued mutation or repeat of already established getter discovery.

`src/modules/professions-hud/rotation-observation.js` adds `inspectFarmRotationObservation(beforeRaw, afterRaw, intent)`, a **pure, disconnected** comparison of two structurally coherent Farm getter responses. The intent supplies only `slotIndex`, `previousCreatureId` and `replacementCreatureId`; it is not an instruction to invoke those methods. It requires the before snapshot's selected worker to match, the proposed replacement to be in its ready candidates, capacity to be unchanged and all other slot identities to remain unchanged. It captures a single bounded, descriptor-only copy of each response before validation/classification, so a mutating native Proxy cannot supply one version to preflight and another to the comparison. An internally coherent captured read still does not establish a server transaction or a consistent cross-time generation.

| `observedState` | Narrow meaning |
| --- | --- |
| `replaced` | The requested slot contains the requested replacement in the later snapshot, and unrelated slots retain their prior workers. |
| `unchanged` | The requested slot still contains the previous worker. |
| `vacant` | The requested slot is empty in the later snapshot, matching the historical helper's possible partial-failure outcome. |
| `indeterminate` | Either snapshot or intent is invalid, the previous worker/reserve is inconsistent, a different worker occupies the target, another slot changed, or capacity changed. Issues identify the reason without choosing an action. |

`canConfirmWrite` is **always `false`** for all four outcomes: two reads do not identify the cause of a state change, prove freshness, confirm the command's return/error, serialize another tab, or establish server-side atomicity. In particular `replaced` means only *observed later slot identity*, and `vacant` is not proof that this specific client's remove succeeded. Stale identical reads can report `unchanged`. This is a **manual-transition observer**: it can describe replacement of a worker whose prior stamina is above zero, and therefore **does not itself pass the zero-stamina AR-02 eligibility gate**. No polling, timers, client writes, gameplay calls, HUD import or new delivery were added. This module supports future AR-08 test design; AR-03/05/07/08 **remain open** pending actual native authority evidence and separate Product Owner approval.

`test/professions-rotation-observation.test.js` covers each observed state, stale/identical snapshots, unrelated slot changes, invalid intent, accessors, revoked proxy shapes, a mutating-descriptor TOCTOU attempt, non-exhausted manual replacement and malformed before/after pairs. Independent exact-current Technical QA returned **TECH READY for this pure observation module only**, P0/P1/P2/P3=0, after reproducing and closing the double-decode/Proxy TOCTOU defect. Focused observer + preflight tests **16/16 PASS**, complete Better UI **517/517 PASS**, syntax checks and scoped diff-check PASS. Source SHA-256 `A523F294970F314E6739D348CA5B56F3A06DFD78D71CD816FBA47939987E8385`; observation tests SHA-256 `D14A563999DD62A7C93FDB31D6DAE39409892B74949CB3726C57458028BDAF15`. This gate does not approve automation or change the existing pre-live candidate.
