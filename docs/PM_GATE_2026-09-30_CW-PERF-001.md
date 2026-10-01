# PM Gate — CW-PERF-001 performance observability & synthetic baseline

**Date:** 2026-09-30; follow-up frozen campaigns 2026-10-01 UTC. **Current state:**
`AUTHOR SYNTHETIC GATES PASS (including real GotFocus 20/20) / independent Technical QA and PO-owned live validation pending; no release`.

## Scope / authority

- **Owner request:** “inicie” after approving the 11-task Coupled Workspace
  WebView2 performance roadmap; begin with CW-PERF-001.
- **Working branch:** `plan/coupled-webview2-performance`; source baseline
  `542af02eab23e68b32c6df896fe20c07ae1408dc` / Better UI `0.2.124`.
- **Implementation:** frozen read-only tuple, opt-in synthetic measurement,
  per-process OS sampling and instrumented synthetic host timings. Two narrow
  focus-owner corrections (`LostFocus` retaining owner if `View.ContainsFocus`,
  and top-level `Deactivate` clearing owner) are the non-smoke native behavior
  changes; they still require PO-owned live validation. No game automation or
  performance gain is claimed.
- **Excluded:** live game, user's browser, Tampermonkey, real cookies,
  traffic/payload logging, host normal promotion, migration of profiles,
  commits/push/merge. All remaining tasks 002–011 remain separate.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Evidence | Owner | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001A | Freeze point-in-time tuple (EXE, both JS, three DLLs), verify all hashes against independently pinned manifest SHA before synthetic launch, reject overwrite/corruption. | No mutations of shared `dist/` or normal/candidate `bin/`; only campaign path under ignored `.local-evidence`. | Frozen manifest, detached hash, create/verify/smoke, adversarial tests including manifest rewrite and ancestor checks. | PM/tooling | Technical QA | `pass` (scoped independent QA) |
| AC-001B | Benchmark actual Cards summary/read/render with synthetic H=0/32/1200/10000, 1/2 panes, Cards/Game, >=100 repetitions for measured events. | Full history, no game/native action, no inference of browser timings. | Corrected mock clock; 30 scenarios rerun, history append/edit/reset and actual core observer fixture; 25/25 independent Node observer 100-event trials PASS. H=10k full DOM completed in four fresh Node processes with exact row-count assertions. | JS engineer | Technical QA | `pass` for synthetic JSDOM steady-state scope; Chromium/live behavior remains outside this evidence |
| AC-001C | Instrument synthetic WebView2 init, navigation/ready, focus, settings save/menu, bridge requests, cleanup; sample OS child processes. | Collector disabled without synthetic flag; no URLs/tokens/game data. | Isolated C# build, C# smoke stdout, root/child process samples; subprocess CPU and GPU not fully attributable. Independent bounded smoke/fixture QA PASS; repeated full smoke still has unrelated failures. | Host engineer | Technical QA | `evidence-insufficient` (full host repetition; scoped telemetry PASS) |
| AC-001D | Record 5 fresh-UDF/5 reused-UDF boots, per-mode idle, 20 transitions and adequate p95 event samples. | Isolated browser/UDF; distinguish UDF state from cold OS and report any failure. | Fresh/reused-UDF boots; repeated JS/lifecycle measurements; on final frozen host three new 600-second idle runs and 20/20 actually dispatched/completed WinForms GotFocus callbacks with stable owner, plus real host blur verification. | PM/perf engineer | Technical QA | `author PASS` for specified synthetic observations; independent review not yet returned |
| AC-001E | Preserve game/native behavior, SDK/bridge isolation and reproducibility. | All prior tests, two account identities, lifecycle, `--smoke` never navigates to PokePixel. | Negative historical outcomes preserved, latest six-artifact tuple verified, core/full visual and both shutdown smoke modes PASS, npm suite PASS. Corrected native `LostFocus` ownership still awaits independent QA and user-owned in-game confirmation. | Engineer | Technical QA | `author synthetic PASS`; full release gate not ready |
| AC-001F | Each performance claim bounded to observed environment. | No % claims from static inspection or JSDOM timing. | PM notes and separated sample provenance. | PM | Independent QA | `pass` (documented scope) |

## Evidence obtained before any host-source change

1. `Freeze-PerformanceTuple.ps1 -CampaignId cwperf001-20260930-baseline -Create`
   succeeded and wrote a 6-artifact SHA-256 manifest under
   `.local-evidence/coupled-webview2-perf/tuples/cwperf001-20260930-baseline/`.
   The default Better UI hash was verified against
   `1641B1AB5DB8E21A12D118687772A768C35611415D7D41EA4468BF36D9E4FB76`.
   The Analyzer hash was
   `0131E53D542949D84E4677736CF3A50FF90573EF10407866ACE3AA4DA2A8EE60`.
   Frozen host SHA was
   `09E3D7988DDEAEB19F64659345EFFE651555E312B93F0D8A4475C7B8407A0675`.
2. `-Verify`: **PASS** (6 artifacts). `-Smoke` after verification: **PASS**
   for the existing candidate's synthetic local WebView2 harness.
3. `Test-PerformanceTuple.ps1`: **PASS** for wrong source hash, duplicate
   campaign, wrong host selection, corrupt bundle hash, and refusal of smoke
   before executing corrupted artifacts.
4. `Measure-FrozenSyntheticHost.ps1 -SampleMs 500 -RunId smoke01`: **PASS**,
   elapsed **8,333.556 ms**, **10 samples**, exit 0, no timeout. Observed
   peak within these samples: **13 descendant processes**, **594.199 MiB sum
   private bytes**, **970.566 MiB sum working sets** and **11.302% machine CPU**
   across a subset of 9 CPU-delta samples. These values come from a short
   synthetic smoke with Chromium process launches: they are **not** a steady
   state, not the application's physical RAM allocation, not a typical-user
   benchmark and not evidence of improvement. The sum of process working sets
   can count shared resident pages more than once; final zero samples reflect
   process shutdown. Raw data:
   `.local-evidence/coupled-webview2-perf/tuples/cwperf001-20260930-baseline/measurements/smoke01.json`.

## Additional CW-PERF-001 evidence — isolated instrumented source

- **Instrumented host in a separate tuple:** source changes only in
  `AccountPane.cs`, `CoupledWorkspace.cs` plus `WorkspacePerfMetrics.cs`;
  `--perf-metrics` rejects non-synthetic launch (observed exit code **2**).
  A staging-only C# compiler produced a new frozen candidate in campaign
  `cwperf001-20260930-provenance`: host SHA-256
  `760AE3B0B8B0AB44B0987DD7795050B929A187981753F85D341676DDE2608093`,
  independent manifest SHA-256
  `C0DE20F2008872E4F47C0D71680495502DCA23FE683E97A878F01F9DF9F36B58`.
  Manifest includes hashes of **all 10 C# source files**, SDK sidecars and
  compiler. Since the worktree is dirty (uncommitted instrumentation), the
  git commit in the manifest is marked as **source base**, not the complete
  source identity. The versioned runtime itself is **not frozen**.
- **Latest candidate with source-snapshot provenance:** campaign
  `cwperf001-20260930-snapshot`, host SHA-256
  `D9148578ED19F62CB49785BBB75EFAE11A9241B5841EA6E6FF334DDA531A131A`,
  independently pinned manifest SHA-256
  `F858A8CA989BC93729845684EE0B3DCFBD43879EADB5C41E62D788B2A552E212`.
  C# compilation consumed source files copied to an isolated create-only
  `source-snapshot`; independent read-only review confirmed **10/10** staged
  file hashes match its provenance. The synthetic smoke, shutdown during
  initialization and shutdown during Single/Dual switching all **PASS** on
  this latest candidate with opt-in aggregate metrics. Provenance establishes
  the project-cooperative input snapshot, **not** protection against malicious
  concurrent filesystem modification by a local process with write access.
- The instrumented host's `-Smoke -PerfMetrics` **PASS**, stdout includes
  opt-in in-memory spans; the same frozen host's smoke **without** the flag
  also **PASS**. No host normal or regular candidate alias was replaced.
- The synthetic instrumented smoke reported 159 Game Dock updates and 159
  menu rebuilds in one representative passing run, `GameDockOverflowRebuild`
  **mean 7.507 ms, p95 of 159 samples 20.145 ms**. These measurements include
  synthetic WinForms harness operations, **not** actual game UI responsiveness.
  The same synthetic run showed 7 explicitly issued Game Dock requests and
  12 handled responses because **five extra requests were injected directly
  by smoke tests**; this is not production request loss or duplication.
- **JavaScript baseline:**
  `node tools/coupled-workspace-webview2/perf/benchmark-cards.mjs
  --histories=0,32,1200,10000 --panes=1,2 --modes=cards,game
  --iterations=100 --warmup=3` passed with **30 scenario records**.
  Raw report is in ignored campaign artifacts at
  `.local-evidence/coupled-webview2-perf/tuples/cwperf001-20260930-baseline/measurements/cards-synthetic-100.json`.
  For H=1.200, one **sequential JSDOM** pane, the actual adapter poll had
  p50/p95 **23.0499/25.4274 ms** in Cards and **22.2863/28.7348 ms** in
  Game; the current Game presentation still spends time in hidden Cards.
  For H=10.000, the only default test is `readAnalyzerSummary` (reader-only),
  p95 **12.0284 ms** at one pane and **20.9468 ms** at two sequential panes.
  These values **exclude Chromium GPU/layout, real Analyzer IndexedDB and
  real game/network work**. `--large-dom` was not used. Tool-specific tests
  **4/4 PASS**.
- **Supplementary JS coverage:** the separate opt-in
  `perf/benchmark-reconcile.mjs` tests the **real** source reader/render with
  H→H+1 append, middle edit, reset and selected filters (rather than
  treating steady-state repeated frames as mutation coverage), plus
  `createBetterUI` central `MutationObserver`/rAF and capabilities. Combined
  tests initially passed **9/9**, but a subsequent independent repeat
  produced **8/9 with one intermittent observer assertion failure** at
  `benchmark-reconcile.mjs:341`. This failure is under investigation and
  must not be silently converted into a passing gate. A separate complete
  synthetic history-only 100-cycle run at H=32 **PASS**, one pane with
  `all`/`captured` filters, recording 300 **measured direct render calls**
  per filter; append p95 **7.5965/9.9829 ms**, reset p95
  **15.5706/16.6228 ms** respectively in this JSDOM run. This is not
  a WebView2 CPU benchmark. Raw history-only output:
  `.local-evidence/coupled-webview2-perf/tuples/cwperf001-20260930-baseline/measurements/reconcile-history-h32-100.json`.
- **Independent observer repeatability gate:** author reproduced the
  observer 100-event/101-flip failure in **3 of 18 separate synthetic
  Node/JSDOM trials** (`benchmark-reconcile.mjs:341`), and independent QA
  reproduced it as well. The source of extra rAF passes has **not** been
  isolated; it might be a fake-scheduler/microtask artifact or an observed
  DOM feedback cycle, but no runtime regression has been established. The
  assertion remains strict and diagnostic information was added to failures;
  no successful run is used to override this unresolved QA gate.
- **OS synthetic smoke campaigns:** five fresh *WebView2 user-data folder*
  runs passed, duration median **9,590.322 ms** (range **8,124.785–10,932.698**).
  Five successful reused-folder runs had median **8,906.499 ms**
  (range **8,641.594–9,703.026**); there was **one additional failed**
  reused-folder attempt (`warm05`, exit 1) with
  `InvalidOperationException: Better UI select did not expose an open
  dropdown/accessibility state` in
  `CaptureBetterUiSelectPopupSmoke`. This failure was **preserved**, not
  counted as PASS. These are *fresh/reused UDF* experiments under a warmed
  OS, not five hardware-cold boots; sample count **n=5** is too small to
  report a reliable boot p95. OS process sampler records only bound
  synthetic descendants, can miss already-exited child CPU and does not
  provide accurate shared-GPU or unique-physical-RAM attribution. Each run
  recorded about four resource snapshots because the filtered CIM sampling
  itself incurs measurable overhead. **These five-plus-five runs exercised the
  earlier D92CEAAA... instrumented host**, not the latest D9148578...
  source-snapshot candidate; do not treat their times as measurements of the
  final staged executable.
- **Local test environment:** Windows NT `10.0.26200.0`, Evergreen WebView2
  Runtime `154.0.4258.37`, Node `v24.19.0`, PowerShell
  `5.1.26100.9444`, 24 logical processors. GPU model/driver, OS power mode,
  browser cold-cache state and stable physical RAM attribution were not
  characterized; no performance claim relies on those missing attributes.
- **Full regression:** `npm test -- --test-reporter=dot` exit **0**;
  `git diff --check` exit **0**, with line-ending warnings only. Neither
  `npm run build` nor a production host/browser launch was executed.

## Risks and remaining gates

| Risk | Negative evidence / mitigation | Status |
| --- | --- | --- |
| Host EXE and JS drift independently | Package six files, use a detached manifest SHA pinned outside campaign, prove bundle+manifest joint rewrite refusal; validate provenance for staged host. | Scoped independent TECH QA PASS |
| Host instrumentation changes real application | Opt-in synthetic-only gate and independent source review / smoke of exact C# candidate. | `open` |
| Stale/biased timing or hidden workload | Capture H, visible mode, warmup, iterations, JIT/GC and synthetic vs Chromium boundaries. | `open` |
| Profile/credential exposure | Use fixture UDF under frozen campaign only and no capture of URLs/cookies/traffic. | `open` |
| False p95 of cold boot | Report n=5 distributions and reserve p95 for >=100 action/render samples. | `open` |
| Synthetic smoke fails intermittently | `warm05` failed in `CaptureBetterUiSelectPopupSmoke`; determine whether visual smoke timing, host metric overhead, or platform scheduling. Do **not** claim zero-error baseline. | `open` |
| Supplemental observer fixture fails intermittently | Rooted in mock future timestamp relative to eager controller clock; future snapshot caused valid source freshness rejection and subsequent DOM remount. Clock-fixed fixture + future-stamp negative regression and 25/25 fresh-process 100-event tests pass at unchanged `deltaRaf <= 2` threshold. | `closed` for synthetic fixture, not live browser |
| Steady-state JSDOM mistaken for complete rendering profiler | Direct rendering, history mutations, and core observer/rAF now separately measured; private adapter render count remains source-path inference and DOM=10k remains explicit skip. | `open` for full browser scope |
| Other synthetic host smoke failures | Latest candidate recorded 17 PASS, 2 functional smoke FAIL, 1 sampler no-verdict event; see continuation below. Do not claim zero-error baseline. | `open` / full host TECH NOT READY |

## Gate results (to be completed)

- Author verification: **passed for synthetic tooling and measured steady-state
  scenarios**; broader AC-001D/E still open.
- Independent `TECH READY / NOT READY`: **SCOPED TECH READY** for pinned-manifest
  frozen tooling, corrected Node/JSDOM history and actual central-observer
  fixture, and opt-in host telemetry. Adapter-private render invocation count
  remains source-path inference; DOM=10k, long idle, full host smoke stability
  and real Chromium performance remain open. Full initiative gate:
  **TECH NOT READY / evidence insufficient**.
- `UX READY / NOT READY`: not triggered for telemetry-only paths unless runtime changes interaction behavior.
- Visual regression: not triggered if instrumentation is visually inert; no `VISUAL READY` claim.
- PO live performance evidence: **not collected**, PO-only.
- PM handoff: **not granted**. CW-PERF-001 may continue in the isolated branch;
  002–011 remain unimplemented and no release/promotion is authorized.

## Continuation — synthetic correction and repeated evidence

This section **supersedes only the earlier observer-flake and stationary
benchmark interpretations**. All original failures above remain preserved
as history; they were not reclassified as passing runs.

1. **Root cause of the observer benchmark flake:** production
   `syncAnalyzer()` calls `readAnalyzerSummary(win, Date.now())`, establishing
   the read time before asking the public Analyzer for its summary. The old
   synthetic provider generated `capturedAtMs: Date.now()` inside that later
   call, which occasionally appeared **1 ms in the future**. The real
   freshness guard correctly rejected that mock snapshot; Cards toggled
   unavailable/available and naturally caused additional DOM mutation/rAF
   passes. A read-only independent reviewer reproduced both the clock-order
   inversion and the consequent 3-rAF synthetic burst. Only
   `perf/benchmark-cards.mjs` mock data now timestamps the previously
   published response at `Date.now()-1000`, within the 3-second max-age
   contract; productive `src/` is unchanged. Two regressions assert both
   acceptance across adjacent clock ticks **and** intentional rejection of
   truly future-stamped responses. Combined JS tests: **11/11 PASS**.
   After the correction, **25/25 independent Node processes** completed
   100 observer events ×101 native-attribute flips; the original strict
   `<=2` rAF-per-burst assertion was **not weakened**. No conclusion is
   claimed for the real Chromium scheduler or real game provider.

2. **Refreshed 100-iteration JS baseline:** after correcting the synthetic
   clock, all **30 scenarios** passed again. Raw JSON:
   `.local-evidence/coupled-webview2-perf/tuples/cwperf001-20260930-baseline/measurements/cards-synthetic-100-clock-fixed.json`.
   Example H=1.200, one sequential JSDOM pane, real adapter poll p95:
   **54.8295 ms Cards / 52.6514 ms Game**. These numbers differ from the
   original fixture and process run; **do not infer improvement or regression
   from the cross-fixture comparison**. Five additional fresh Node processes,
   each with H=1.200 and 100 events per mode, generated the raw files
   `cards-h1200-variance-01.json` through `-05.json`: p95 range
   **45.4199–59.6599 ms** (Cards) and **44.6496–54.6054 ms** (Game);
   median of those five run-level p95 values was **54.3290 / 50.7847 ms**.
   This variability overlaps the mode difference. It is a JSDOM-only noise
   baseline, not a CPU or latency percentage for the live game.

3. **Latest isolated C# candidate:** source-snapshot build
   `cwperf001-select-smoke-01` yielded host SHA-256
   `58E565D9D55F78CFC7C8EB522A216506357EA9B2E6569527D438964E9E5E8457`.
   It was packaged without overwriting normal/candidate binaries or shared
   `dist` under `cwperf001-select-smoke-20260930`, with independently pinned
   manifest SHA-256
   `D0AE33F006DBC7552FAF28BB1F2F067EC4114DF134F1A10F9DDD33167C690C41`.
   Only the synthetic `CaptureBetterUiSelectPopupSmoke` routine was adjusted:
   it records `Opened`, `Closed` reason, control focus/visibility/handle
   state, may retry **once** only if a menu was initially open but auto-closed
   under `AppClicked`/`AppFocusChange`, and must still pass actual visibility
   and Expanded/Collapsed accessibility checks. Source-level independent QA
   found **P0=0 / P1=0** for these bounded fixture changes; no productive
   menu, browser or gameplay behavior was changed.

4. **Repeated host smoke on that exact frozen candidate:** `select-repeat-01`
   through `-20` yielded **17 host PASS**, **two host FAIL** and **one sampler
   execution without a host verdict**. Original popup assertion did not
   reappear among the 19 runs with host verdicts, but this does **not** prove
   it cannot recur. Host failures retained in raw stderr:
   `select-repeat-14` — `Maintenance drawer forward Tab boundary did not
   exit the drawer`; `select-repeat-15` — visual Cards dashboard not ready
   (`cards-dual-2-1-1180-right` geometry/data assertion). Run `-07` failed
   in the OS process sampler before a report was written (StrictMode
   missing `.Count` on a changing process property). The sampler now
   checks for null/vanished WebView2 thread collections and tracks incomplete
   per-process snapshots; subsequent runs yielded reports including both
   legitimate host failures. Do not mix sampler failures with host exit
   failures or represent 20/20 passing boots. Exact records remain under
   `.local-evidence/coupled-webview2-perf/tuples/cwperf001-select-smoke-20260930/measurements/`.

5. **Remaining gate:** the 10-minute per-mode idle runs, 20-cycle focus and
   Single/Dual / Focus/Restore cross-checks, stable full visual host QA and
   user-owned real game measurements were **not** completed. Neither the
   approximate observed CPU/working set sums nor JS-only H=10k reader timings
   establish a WebView2 memory/performance gain. The dedicated deterministic
   core baseline mode and its isolated measurements were implemented next;
   see continuation below. Full visual screenshot QA remains separate.

## Continuation — dedicated core-only baseline on a new frozen candidate

- **New synthetic-only launch mode:** `--smoke-perf-baseline` follows the
  existing fixture path: workspace settings normalization/save, two local
  WebView2 pages with isolated UDFs, script registration and smoke READY,
  Game Dock bridge and request checks, lifecycle, layout and scoped host
  commands/recovery. It **does not** run
  `CaptureVisualSmokeAsync()` and explicitly writes
  `CW-PERF-001 synthetic core-only smoke: PASS (visual smoke NOT RUN)`.
  Existing `--smoke` still runs its complete screenshot/interaction checks
  and was independently invoked once on the new tuple with **exit 0**.
  Core-only PASS is **not** full UX, visual or gameplay readiness.
- **Reproducibility:** C# compiled from create-only `source-snapshot` as
  `cwperf001-core-baseline-01`; binary SHA-256
  `314D6670854D6F89B1E21711F7A104F7127CEFC30F8A33A91A27AF332CC63E14`.
  Six-artifact frozen tuple `cwperf001-core-smoke-20260930` with detached
  manifest SHA-256
  `678C0798184419E817ABEC892FEE5D1AF85103D0694E1F7ADF79E78F419D7806`.
  The frozen-launch script accepts `-SmokeVariant baseline-core`; the
  process sampler accepts `-CorePerfSmoke` and labels its JSON scenario
  `visual screenshot smoke NOT RUN`. The normal binary and shared `dist/`
  remain unchanged. This new flag/diff has passed author compilation and
  synthetic runs; a new independent QA verdict on the flag itself remains
  **pending** (the prior independent reviewer only examined earlier flags).
- **Five fresh-UDF core-only synthetic boots:** **5/5 PASS**, measured total
  elapsed range **3,871.633–4,401.246 ms**, median **4,026.324 ms**.
  Each of these five runs used a freshly created, immutable-named campaign
  folder (`cwperf001-core-fresh-01` … `-05`) and the exact same EXE/JS/DLL
  input hashes. These are *fresh user-data folders on a warmed OS*, **not**
  independently verified machine cold-cache boots.
- **Five reused-UDF core-only synthetic boots:** **5/5 PASS**, total range
  **3,793.873–4,512.971 ms**, median **3,966.921 ms**, under the fixed
  `cwperf001-core-smoke-20260930` campaign, with per-run immutable-named JSON
  `core-reused-01` … `-05`. Both conditions passed the same deterministic
  core protocol and ended cleanly. A single OS CPU-delta sample per run was
  available after filtered CIM lineage collection; it is insufficient to
  establish an idle-CPU distribution or reliably attribute a WebView2 resource
  improvement. There is no defensible cold/warm speedup percentage here.
- **Post-change regression:** `npm test -- --test-reporter=dot` **exit 0**;
  scoped JS 11/11 PASS, frozen tuple negative checks PASS, `git diff --check`
  **exit 0** (Windows working-tree line-ending warnings only). The normal
  executable, userscript bundles and `main` have not been promoted or
  replaced. No login/game session, host normal, or user's live browser was
  accessed. AC-001D and the complete TECH gate remain
  **evidence-insufficient** until the longer per-mode, multi-transition,
  stable full visual and PO-only live evidence are obtained.

## Continuation — fail-safe launch, visual fixture, and keyboard re-gate

- **Launch-isolation finding closed in worktree:** independent technical QA
  identified a real safety issue with an earlier `baseline-core` invocation:
  a legacy frozen executable might ignore the new `--smoke-perf-baseline`
  flag, interpret the invocation as a normal launch, and access the regular
  user-data folder/game. `Freeze-PerformanceTuple.ps1` and
  `Measure-FrozenSyntheticHost.ps1` now always pass the legacy-recognized
  `--smoke` alongside the optional core-only flag. Both capture stdout and
  require the exact `CW-PERF-001 synthetic core-only smoke: PASS (visual smoke
  NOT RUN)` marker; exit code 0 alone cannot misclassify an old full smoke
  as core-only. The frozen launcher also includes `--smoke` for shutdown
  variants and verifies their respective exact completion markers. No
  executable that recognizes only the original `--smoke` can reach its normal
  launch branch through these variants. Independent read-only QA on the
  core path: **new P0=0 / P1=0**. The bounded defensive staging-path
  reparse-point checks in `Build-SyntheticPerfHost.ps1` were also independently
  reviewed; malicious concurrent local rewrites remain outside the tool's
  source-snapshot threat model.
- **Adversarial backward-compatibility check:** the older, independently
  pinned `cwperf001-20260930-snapshot` tuple (manifest
  `F858A8CA989BC93729845684EE0B3DCFBD43879EADB5C41E62D788B2A552E212`)
  ran only its already-supported synthetic `--smoke` path and printed
  `WebView2 coupled workspace smoke: PASS`. The updated launcher correctly
  **refused** to classify that exit-0 legacy run as `baseline-core`, with
  the missing-marker error. This is a deliberate negative test, not a host
  regression, and did not navigate to the game.
- **Confirmed visual-fixture race:** the fixture's public `getSummary()`
  produced `capturedAtMs:Date.now()` *after* the real reader's
  `readAnalyzerSummary(..., now)` clock anchor. A 1 ms tick could produce
  a future-dated response, which the productive 3-second freshness contract
  correctly rejected. The prior `cards-dual-2-1-1180-right` failure had
  `attempts=0` and several missing dynamic-data flags despite sound shell
  geometry: evidence of whole-summary rejection, not demonstrated clipping.
  The **synthetic provider only** now reports
  `capturedAtMs:Date.now()-1000`; runtime reader/productive UI logic was
  untouched. JS future-stamp rejection and legitimate earlier-snapshot
  acceptance remain covered by the 11 focused tests. Independent read-only
  review accepted the bounded fixture correction.
- **Smoke repetition on the clock-fixed, diagnostic host:** isolated build
  `cwperf001-tab-diagnostics-01`, frozen campaign
  `cwperf001-tab-diagnostics-20260930`, host SHA-256
  `73080764D63CE2E3BB9A3C9E7D1359647792CDB9279925CA669150F0F588264C`,
  pinned manifest SHA-256
  `07BEA53902915663DE5ED1640C3300F60722AB2A99ADE597B3EA6FD0388B3611`.
  The complete screenshot/keyboard/data synthetic smoke passed **20/20**
  sequential reused-UDF runs `repeat-safe-01` … `repeat-safe-20` and the
  preceding `visual-diagnostic-01`, all on the exact frozen tuple. The
  negative results `select-repeat-14`/ `-15` from the earlier candidate
  remain retained, not erased or retroactively reclassified.
- **Stronger keyboard fixture gate:** independent review found that the
  initial diagnostic check might pass if WinForms base preprocessing handled
  Tab while a separate Deactivate event closed the drawer. The test now
  explicitly requires that the child `PreProcessMessage` invokes the actual
  drawer dialog-key handler, that it observed the focused last control and
  handled an unshifted Tab, and that the drawer closes and loses focus. The
  temporary wrapper is always restored in `finally`. A direct forward
  form-handler probe is tested separately from the child-message route;
  productive keyboard behavior was not altered. Independent source review:
  **new P0=0 / P1=0**; P2 residual is that these probes do not establish
  which specific outside control receives the queued `SelectNextControl`
  focus.
- **Latest strict-keyboard candidate:** isolated build `cwperf001-keygate-01`,
  frozen campaign `cwperf001-keygate-20260930`, host SHA-256
  `E1C28AEF8B3E02526F5132DCDEA2AD780F55196D9A30DEB2EC0746715357D05D`,
  pinned manifest SHA-256
  `B0A46E82646C9B4465A0BAFACD3F9DAF2D8C62DF28249B6A02A82617B626163F`.
  Full visual synthetic smoke **5/5 PASS** (`visual-keygate-01` … `-05`);
  core-only opt-in smoke **PASS** (`core-keygate-01`, positive marker and
  metrics captured); shutdown-during-init and shutdown-during-switch both
  **PASS** with the new two-flag/positive-marker launcher. These are synthetic
  executable results, not browser-based gameplay validation. Original
  separate long-idle and 20 transitions within one running host remain open.
- **Final source/tool checks for this continuation:** `npm test --
  --test-reporter=dot` exit 0; focused Node perf cases **11/11 PASS**;
  `Test-PerformanceTuple.ps1` negative checks PASS; `git diff --check`
  exit 0 (line-ending warnings only). No commit, promotion, normal-host
  replacement, shared `dist/` update or live-game access was performed.
  Some visual screenshot files are mutable within a reused campaign and have
  not received per-run independent representative-image signoff, so
  **VISUAL EVIDENCE INSUFFICIENT** remains the honest visual status.

**Current PM verdict:** scoped synthetic launch/tooling and timestamp/keyboard
fixture source QA found no open P0/P1, with the strict frozen candidate's
measured runs PASS. The broader CW-PERF-001 gate is still
**TECH NOT READY / evidence insufficient** for 10-minute idle per mode,
within-process 20-cycle interaction distributions, real Chromium/GPU
attribution, H=10,000 full DOM, independent representative visual evidence,
and the exclusively user-owned in-game check. No production performance
gain is claimed and tasks 002–011 are not authorized for promotion by
these measurements.

## Continuation — same-process lifecycle/layout baseline

- **Cycle harness:** the new isolated `--smoke-perf-cycles` flag performs 20
  sequential `RunWorkspaceLifecycleSmokeAsync` and 20
  `RunLayoutEngineSmoke` operations after the synthetic local-page/bridge
  initialization, retaining the same two profile-specific WebView2 UDFs.
  `SmokeLifecycleCycle` and `SmokeFocusLayoutCycle` report **completed**
  operation durations, with the exact unique marker
  `CW-PERF-001 synthetic 20-cycle core smoke: PASS (visual smoke NOT RUN)`
  emitted only after all 20 pairs and the normal host-command smoke. The
  `RunLayoutEngineSmoke` path enters and restores panel Focus mode; this is
  **not a measurement of 20 processed WebView2 GotFocus callbacks**.
  `InitializeAsync` owns the mutation semaphore during the fixture and
  GotFocus's own handler waits for that semaphore. No actual focus-event
  throughput or p95 is inferred from `SmokeFocusLayoutCycle`. After the
  first pass, subsequent passes exercise the normalized Dual layout/state,
  not 20 independent fresh starts.
- **Retained negative run:** the first frozen cycle candidate
  `cwperf001-cycles-20260930` (host
  `58971F0FE394227D94BC931CACE2E95C8BBF332D111142AF6ADD7BCCB7033707`,
  manifest `782C5C8C4F9F5DAE5ACCA96A44AB08EEFAFFB98F6DEC52941F232A11A5831171`)
  recorded `cycles-01` **FAIL** at ~13.29 s due to the ordinary 12-second
  synthetic smoke watchdog. The issue was independently identified. The
  cycle variant alone now has a bounded 240-second *internal* watchdog;
  ordinary smoke still has 12 seconds. The long-running cycle variant is
  launched **only** through the sampler's bounded `-CoreCycleSmoke` mode
  (with explicit `-MaxSeconds 300`); the frozen tuple script intentionally
  has no unbounded `baseline-cycles` launch option. The sampler always
  passes the legacy-safe `--smoke` flag and requires the exact cycle marker,
  exit 0 and no timeout/surviving child processes. The effective timeout is
  the smaller of the external sampler budget and the 240-second host watchdog.
- **Latest cycle candidate:** isolated build `cwperf001-cycles-watchdog-01`,
  frozen campaign `cwperf001-cycles-watchdog-20260930`, host SHA-256
  `5EE2DAFAC1EBACA5199014F20831D82214B83E610BF3A1A0DD89A2EFE6139751`,
  detached manifest SHA-256
  `7496F0379213903C99409A9BC3CB50EDC681A2B148A4971E26F16D51DB17B72C`.
  The three independent process runs `cycles-20-01`, `-02`, `-03`
  completed **3/3 PASS**, each with 20 lifecycle and 20 focus-layout
  operation samples, no timeout and exit 0 (total elapsed ~17.15 s,
  ~17.47 s and ~19.09 s, respectively). The first run reported 64 pane
  creations, 62 recreations and 64 disposals; its lifecycle duration
  sample median was ~458.9 ms and focus-layout median ~232.1 ms, with
  **n=20 per span**. These observations do not support a stable p95 or
  quantify live game CPU/RAM improvements. The actual `FocusReceived`
  counter was absent from this run's metrics. On this same tuple, complete
  visual synthetic smoke `full-post-cycles` and core-only smoke
  `core-post-cycles` both **PASS** with their respective markers.
- **Independent review:** the two read-only reviewers found no new P0/P1 in
  the bounded launch, flag-dispatch or repeated lifecycle paths after the
  watchdog and unbounded-launch fixes. Residual evidence limitations are
  actual GotFocus handler samples, 10-minute per-mode idle, source/browser
  separation of GPU and shared RAM, H=10k complete DOM, independent visual
  image review and user-owned in-game validation. These constraints do not
  invalidate the precisely scoped 20 lifecycle+focus-layout PASS.

**Updated PM verdict:** CW-PERF-001 now has reproducible positive evidence
for same-process 20 lifecycle and 20 focus-layout operations. The requirement
for **20 actual processed focus transitions and their timing is still open**.
The broader status remains **TECH NOT READY / evidence insufficient** and
**VISUAL EVIDENCE INSUFFICIENT**, with no performance benefit inferred,
no production promotion and no new authorization for tasks 002–011.

## Continuation — bounded real-focus attempt and independent image review

- **Focus attempt preserved as a failed experiment:** a separate synthetic
  prototype tried 20 alternating calls to actual WebView2 `Focus()` after
  releasing the startup mutation gate. Both frozen experiments
  (`cwperf001-focuscycle-20260930/focus-cycle-01` and
  `cwperf001-focus-enabled-20260930/focus-enabled-01`) **FAIL**, with
  `requestAccepted=False`, only one observed `FocusReceived`, and no
  stable focused pane/owner state at the first expected transition.
  The second variant enabled and verified the native host blur control,
  but the WebView2 focus request remained unsuccessful. Neither failure
  establishes a production focus defect; the synthetic environment did
  not prove it could grant focus to the WebView2 control. **No 20/20
  real-GotFocus claim is made.** The experimental phase and its synthetic-only
  counter were removed from the working source while preserving the failed
  frozen tuples and stderr for independent analysis.
- **Stable post-experiment candidate:** isolated snapshot
  `cwperf001-cycles-final-01`, frozen tuple
  `cwperf001-cycles-final-20260930`, executable SHA-256
  `9DE1F0A8A9749976E2EA8E676EDC2228605CCF8A9732DC7C48717E65824596DC`,
  detached manifest SHA-256
  `5C5B4DC7F6AB19BD9131D39EFCA4365E94107EAC04C7E80B12DF11E5EF1CA104`.
  The original bounded 20 lifecycle + 20 layout-focus synthetic sequence
  still **PASS** (`cycles-final-01`, exit 0, no timeout, ~20.51 s).
  On the **same final tuple**, the full visual screenshot smoke
  `visual-final-01` **PASS**, the core-only `core-final-01` **PASS**,
  shutdown-during-init **PASS** and shutdown-during-switch **PASS**, all
  with the mode-specific marker and exit 0. This is the latest frozen source
  behavior; the earlier 3/3 campaign remains separately identified above.
  Real GotFocus coverage remains open.
- **Independent visual regression QA performed on local synthetic images:**
  a read-only reviewer inspected representative images from two frozen
  campaigns (47 PNGs in each; 42/47 matching SHA across the two sets).
  Dual 1600, Dual 1180, mixed Cards/Game, 1:2 and 2:1 layouts, Focus and
  Restore, 235px Hunt Story, Loot and drawer showed **no new observed P0/P1
  clipping** in the reviewed images. The reviewer reported one **P2 existing
  visual issue**: in `workspace-cards-dual-1180.png` and
  `workspace-mixed-cards-game-1180.png` the left target shiny badge
  visually reads `✦ SHIN` instead of `✦ SHINY`, while wider and stacked
  narrow variants show the full badge. The screenshots are reusable
  filenames inside each campaign and do not prove run-by-run chronology,
  live keyboard sequence or the final owner focus destination. This
  performance-baseline task has not modified the production badge CSS.
  Consequently, independent image review is complete for representative
  samples, but **unconditional VISUAL READY remains withheld**.

**Latest PM scope:** the fail-safe frozen harness, direct Cards reader/render,
fixture clock behavior, synthetic visual/keyboard checks, and repeated
WebView2 lifecycle/layout operations have bounded positive evidence.
Actual WebView2 focus dispatch distribution, 10-minute idle per mode,
real Chromium GPU/unique-RAM measurements, H=10,000 full DOM and PO-owned
in-game validation remain unsupported. No release or performance-gain
claim is authorized.

**Post-revert checks:** `npm test -- --test-reporter=dot` exit 0;
focused Node perf tests **11/11 PASS**; immutable tuple negative tests
**PASS**; `git diff --check` exit 0 (only Windows LF/CRLF warnings).
No commit/push/tag/merge, normal executable replacement, shared bundle
rebuild, game login or live-user-browser inspection occurred.

## Continuation — H=10,000 full DOM and perf-flag isolation

- **H=10,000 materialization is now asserted, not inferred.** The synthetic
  benchmark records `attemptRowsPerPane` for both the direct
  `readAnalyzerSummary` + `cards.render` path and the real coupled-adapter
  polling path, and fails unless every pane contains exactly `H`
  `.ppbui-cards-attempt` rows. Focused benchmark tests remain **4/4 PASS**.
  This instrumentation is confined to `tools/coupled-workspace-webview2/perf/`;
  production `src/` behavior is unchanged.
- The first all-in-one `--large-dom` matrix attempt for H=10,000 exhausted the
  default Node heap at approximately **4.1 GB** and exited **134** after about
  **144 s**. Its destination file is retained at zero bytes and the failure is
  not counted as a pass. The failure demonstrates a harness/process-memory
  limit for accumulating all large-DOM cases in one Node process; it is not a
  Chromium or live-game memory measurement.
- To avoid cross-scenario heap accumulation, the same H=10,000 matrix was run
  as **four fresh Node processes**: 1 pane Cards, 1 pane Game, 2 panes Cards and
  2 panes Game. Each process produced both direct and adapter cases, each case
  completed **100 timed steady-state samples after 3 warmups**, and all row
  assertions passed: one-pane cases reported exactly `10000`; two-pane cases
  exactly `10000,10000`. Raw JSON and SHA-256:
  - `cards-large-dom-h10000-p1-cards-100.json` —
    `E46B051D29850A47CB3A86E1360BDB714D185221276996A7F86EB01547070752`.
  - `cards-large-dom-h10000-p1-game-100.json` —
    `FE7D7746A88D83765F810C2159383F2549DE189F8DE004D9F3E0985CF758C17F`.
  - `cards-large-dom-h10000-p2-cards-100.json` —
    `533BC87B4C4DFE96BD58AD8B6A52D080F85D3DAB8BA5C417D931F1E8BFDD4B13`.
  - `cards-large-dom-h10000-p2-game-100.json` —
    `B4BD5EB94F64923EEC78ACEA96A2D3D0E8EEA7EE61672D82DFE736C97B7E69F9`.
- Direct complete-iteration p95 was approximately **400.0 ms / 223.1 ms**
  for 1-pane Cards/Game and **670.4 ms / 574.4 ms** for 2-pane Cards/Game.
  Adapter-tick p95 was approximately **206.2 ms / 365.0 ms** for 1-pane
  Cards/Game and **1283.0 ms / 1157.7 ms** for 2-pane Cards/Game. These are
  same-process Node/JSDOM steady-state measurements. The warmup already
  materializes the 10k DOM; they do not measure cold row creation, Chromium
  layout/raster/GPU, parallel WebView2 panes or live game work. In Game mode
  the Cards root is hidden but still rendered by the current adapter, so the
  result describes hidden-Cards cost rather than native Game UI cost.
- **Synthetic perf flags now fail closed against auxiliary host modes.** A
  direct `--smoke-perf-baseline` or `--smoke-perf-cycles` launch is rejected
  with exit **2** when combined with `--pptools-oneclick` or
  `--evidence-probe`, independently of `--perf-metrics`. This closes the
  defense-in-depth hole where direct callers could enable PPTools background
  behavior during a performance smoke even though the official wrappers never
  supplied that combination.
- The guard was compiled from a create-only source snapshot as
  `cwperf001-isolation-guard-01`, host SHA-256
  `F4A9CC27BD0C60500EF4BE7ADCED848712C46DC0F3D7A95B8CF028873F470EB7`,
  frozen as `cwperf001-isolation-guard-20260930`, detached manifest SHA-256
  `9FB57BD7811A5243577884237965140E04449A85FD025AE2B34D0885E334DE5F`.
  Its baseline-core smoke with metrics **PASS**; direct conflicting-flag probes
  both returned exit 2; its bounded 20-cycle sampler also **PASS** with exit 0,
  no timeout, six OS samples and elapsed ~22.16 s
  (`cycles-isolation-guard-01.json`). No shared executable or bundle was
  replaced.

**Updated scope:** AC-001B is complete for the explicitly synthetic,
steady-state JSDOM reader/render/poll matrix, including full H=10,000 DOM.
The broader CW-PERF-001 gate remains **TECH NOT READY / evidence insufficient**
because 10-minute per-mode idle sampling and actual processed WebView2 focus
transitions remain open; Chromium/GPU/unique-RAM behavior and user-owned
in-game validation also remain outside the evidence. The recorded failed
real-focus experiment remains reverted and must not be reintroduced as a
passing fixture.

Independent read-only rechecks found **no new P0/P1**. Technical QA confirmed
the previous H=10k row-materialization P1 is closed by the exact DOM-row
assertions and independently parsed all four segmented reports. A separate
review confirmed the perf-flag isolation P2 is closed by the fail-closed parser
guard, with no new P0/P1/P2 attributable to that change. Final project tests
`npm test -- --test-reporter=dot` and `git diff --check` both exit **0**;
the latter reports only the existing Windows LF/CRLF warnings.

## Continuation — corrected 600-second Cards/Game idle baselines

- The earlier 600-second `cwperf001-idle-cards-v4-20260930/idle-cards-10m-final.json`
  returned host exit `0` but had **zero OS samples** and no READY/PASS markers
  observed. It is **invalid as a performance baseline**, retained as negative
  evidence. The host wrote markers under `bin/smoke/perf-idle-{ready,pass}.txt`
  while the sampler looked in `bin/smokeperf-idle-{ready,pass}.txt`.
- The source fix aligns the two paths; the sampler removes only ephemeral
  marker files from the frozen campaign before a new run. It requires both
  markers, host exit `0`, no timeout, no surviving WebView2 children and at
  least **60 post-READY OS samples**. The PASS marker includes the elapsed
  milliseconds measured by the host's monotonic `Stopwatch` across the actual
  ten-minute delay. This avoids falsely rejecting a valid host window when
  asynchronous CIM polling observes READY and PASS at different offsets.
  The sampler also records the separately observed marker-to-marker span;
  this is **not** substituted for the host's elapsed duration.
- `RunIdlePerfSmokeAsync` now sets **both** local fixture panes to the chosen
  mode and verifies each Cards root's actual visibility before emitting READY.
  Cards therefore means **Cards/Cards**, and Game means **Game/Game**, rather
  than the earlier `Cards/Game` mislabeled as Game. DOM settling is bounded to
  20 synthetic polls at 100 ms; the source/native production layout contract
  was not modified.
- The replacement host was compiled from the create-only source snapshot
  `cwperf001-idle-fixed-20260930` and has SHA-256
  `C2D55EA4214F10CB7C0FB4A7F75A7035CA311459CBC0B0CF89EAF845B8E1A38F`.
  Both six-artifact tuples verified against separately supplied manifests:
  `cwperf001-idle-fixed-cards-20260930` manifest SHA-256
  `6881C76AF6BA7597051A2E407BC813F7287781BE0E86612A85009B5C2E7A17C0`,
  and `cwperf001-idle-fixed-game-20260930` manifest SHA-256
  `9E528436C339FBAE8FC9700BB97F42D8CF6A43BDC4EC407B10D5A92F25A72297`.
  Both tuples contain exactly the same host EXE/JS/DLL input bytes.
- The two synthetic runs completed with exit `0`, READY/PASS, no timeout,
  **125 samples each**, **124 nonzero-process steady samples each**, and zero
  surviving children. Elapsed durations were **600,002.962 ms** (Cards/Cards)
  and **600,015.105 ms** (Game/Game). Observed marker gaps were respectively
  **599,691.595 ms** and **600,092.268 ms**; the former shows why polling
  timestamps alone are unsuitable for the ten-minute admission check.

  | Scenario | Machine CPU sample mean / p95 | Private-memory sum, steady min–max | Working-set sum, steady min–max | Raw JSON SHA-256 |
  | --- | --- | --- | --- | --- |
  | Cards/Cards | 4.287% / 6.333% | 514.188–570.465 MiB | 905.082–975.227 MiB | `B65C701F12B264F1A9195DA1F18B8D3C4E8C2908AA4DAA8ECF57432A92F5ABC8` |
  | Game/Game | 3.475% / 5.126% | 516.984–570.031 MiB | 907.145–967.367 MiB | `E017CB21F98DB6FC11ECF1D37A5A84306AFF87C5643EF7B16AD9D1152BFDA99C` |

  Raw reports are `measurements/cards-cards-idle-10m.json` and
  `measurements/game-game-idle-10m.json` under their respective frozen
  campaigns above. The single zero-process teardown sample in each JSON is
  excluded from the tabulated steady summaries. CPU percentages represent
  the synthetic host plus observed WebView2 descendants relative to the
  **24-logical-processor machine**, not per-core utilization; the sampled
  descendant set can miss exited process CPU. Summed working sets can
  double-count shared pages, and no attributable GPU usage was collected.
  These are **separate unpaired single runs**; their mean/p95 difference is
  not evidence of a generalizable speedup or a production optimization.
- Verification on the exact replacement host: C# isolated build, frozen
  manifest checks, core-only smoke with aggregate metrics, complete visual
  synthetic smoke, shutdown-during-init and shutdown-during-switch smokes
  **all PASS**. `npm test -- --test-reporter=dot` and `git diff --check` both
  returned exit `0`; the latter reported only the existing Windows LF/CRLF
  warnings. Three separate sampler negative probes deliberately returned
  exit `1` before launch for an idle budget below 660 seconds, an idle run
  combined with redirected `-PerfMetrics`, and mutually exclusive Cards+Game
  flags; each refusal was observed as expected. No live game, user profiles,
  regular host/bundle replacements, commit, push, tag or merge occurred.

**Current PM classification:** `AC-001D` has accepted **author-executed
synthetic 600-second Cards/Cards and Game/Game evidence**. The complete
`CW-PERF-001` gate remains **TECH NOT READY / evidence insufficient**:
20 actual processed `GotFocus` events were not demonstrated (the earlier
synthetic focus prototype failed and remains reverted), and live Chromium/GPU/unique-RAM
or user-owned game measurements cannot be inferred from this fixture. The
independent Technical QA worker requested for these final idle changes failed
to start; **no independent final approval is claimed**. The source and raw
measurements are ready for a fresh read-only QA assignment. Tasks 002–011
remain unimplemented; no release/promotion or performance-gain claim follows.

## Continuation — mixed Cards/Game 600-second run and real-focus probe

- **Third per-mode idle baseline — PASS, synthetic only.** New explicit
  `--smoke-perf-idle-mixed` selects **left Cards/right Game** on the two local
  HTML fixture panes, validates each root's visibility before READY and uses
  the same monotonic ten-minute PASS evidence and external bounded OS sampler
  as the two earlier homogeneous modes. The mode is mutually exclusive with
  Cards, Game, core, cycles, shutdown-only, evidence and PPTools variants.
  Neither production Cards JS nor normal WebView2 startup behavior changed.
- Create-only build `cwperf001-mixed-20260930` host SHA-256
  `0ACC210AC4464C8ED1D069B05D6353C72E4F91B2AEDE08D9EB0DBFBAFBE8A010`;
  frozen tuple `cwperf001-idle-mixed-20260930` separately pinned manifest
  SHA-256 `2B8EE24FEC3F039F91BACE37060398297D191524A95AD951D3868212E495C7CC`.
  Report `measurements/mixed-cards-game-10m.json`, SHA-256
  `541E7DD99D4F127BE2E812D64247C81B7C4C73A64DAF44A41271EDC2514DB53A`:
  READY/PASS both observed, host monotonic idle **600,002.082 ms**, external
  marker-observed gap **599,089.243 ms**, host exit `0`, no timeout, no
  surviving children; **125 samples**, including **124 nonzero-process**
  steady samples. Relative to 24 logical processors, synthetic host+descendant
  CPU average **4.669%**, p95 **6.073%**, summed private memory steady
  **526.301–593.141 MiB**, summed working-set peak **982.477 MiB**.
  This is a single unpaired synthetic run. Other processes ran on the host
  during part of the experiment, so no controlled comparative effect or
  performance-gain claim is supported. Earlier Cards/Cards and Game/Game
  raw data/hashes remain unchanged.
- **Real `GotFocus` probe — FAIL, preserved and reverted.** An isolated
  `--smoke-perf-focus` experiment released the startup mutation semaphore
  before requesting 20 alternating focus transfers, temporarily set only
  the smoke window to opacity `0.02`, and required the real awaited WebView2
  `GotFocus` callback, focus containment and matching active/owner profile on
  every cycle. Frozen probe build `cwperf001-focus-actual-20260930` host
  SHA-256 `36A6304D011E416E0824EFD113FDEDF14821557D9E4C7DA5E53A434B5EB84A8D`,
  manifest SHA-256 `F44815518BE2F8CAF03268C905BD1132FE22CE62A2F84B612FA85D5530D70416`.
  `measurements/real-gotfocus-20-01.json` plus its stdout/stderr are retained;
  process exited `1` in ~4.26 s, no timeout/survivors, and only **one**
  `FocusReceived` / `FocusHandling` sample. First-cycle diagnostic:
  `blurAccepted=True`, `requestAccepted=False`, `canFocus=True`,
  `focused=False`, `containsFocus=True`, `handlerDelta=1`,
  `formContainsFocus=True`, `owner=none`, `active=rhyxus`. A callback
  occurred but was not followed by stable, verifiable focus ownership.
  This does not establish a defect in the live game or normal host; it
  prevents any claim of 20 real processed transitions. **The entire focus
  experiment and flag were removed from current host and sampler source.**
  Post-revert C# text matches the mixed candidate source when line endings
  are normalized; the old frozen failure is deliberately retained.
- **Regression and integrity recheck on the frozen mixed host:** manifest
  verify, full visual synthetic smoke, core-only synthetic smoke, shutdown
  during init and during switch all **PASS**. `npm test -- --test-reporter=dot`
  exit `0`; the create-only/corruption/overwrite adversarial
  `Test-PerformanceTuple.ps1` suite **PASS**; PowerShell parser and
  `git diff --check` **PASS** (known Windows LF/CRLF warnings only).
  A separate `-IdleMixed -IdleCards` negative invocation was correctly
  refused before any synthetic host was launched (expected PowerShell exit
  `1`). The current sources contain no remaining experimental focus flag.
  Local synthetic fixture and separately frozen outputs only: no actual
  gameplay, user browser/profile, telemetry, shared `dist/`/normal `bin/`
  replacement, Git commit/push/tag/merge.

**Revised gate:** all **three** requested steady-state synthetic idle modes
have author-executed 600-second evidence. `AC-001D` and the full
`CW-PERF-001` remain **TECH NOT READY / evidence insufficient** pending a
reproducible test of **20 genuinely dispatched and completed WebView2
`GotFocus` handlers**, technically independent recheck of the final idle
changes, and the separately user-owned live-game validation. Focus-related
layout-cycle metrics are not interchangeable with real `GotFocus` timings.
The previously attempted independent idle QA worker failed to start; no
independent signoff is asserted. Browser GPU and unique resident-memory
attribution remain unavailable in this sampler. Tasks 002–011 remain planned
and were not started or promoted in this continuation.

## Continuation — read-only raw-evidence auditor and SDK focus feasibility

- **Read-only automatic evidence check:** added
  `tools/coupled-workspace-webview2/Audit-FrozenIdleEvidence.ps1` with explicit
  `-CampaignId`, `-RunId`, `-Mode` and *independently supplied* expected SHA-256
  values for both the frozen manifest and raw JSON. The verifier does not
  launch the game, a browser, any process, or a synthetic host. It first
  verifies the pinned six-artifact tuple through the existing safe `-Verify`
  path and then checks report/mode/host identity, positive READY/PASS,
  monotonic host duration of at least 600 seconds, exit 0/no timeout/no
  survivors, >=60 valid process observations, >=590 seconds of observed
  steady-state span, strictly increasing timestamps and no gap above 30
  seconds. CPU/memory values must be present and finite. This is **author-run
  repeatable verification**, not an independent QA signoff.
- **Three positive audited reports:** Cards/Cards **PASS**, Game/Game **PASS**,
  mixed left Cards/right Game **PASS**, with their exact manifest/report hashes
  already recorded above. Three negative probes also **correctly refused**:
  wrong caller-pinned report SHA, report/declared mode mismatch, and the
  historical 600-second/zero-samples run (even with its own actual file SHA).
  The prior failed run is not upgraded to a baseline.
- **Measured cadence correction:** the sampler's `-SampleMs 1000` is only
  its requested sleep duration, **not an observed 1 Hz sample rate**.
  Descendant CIM enumeration and process inspection produce mean intervals
  of **4,824.819 ms** (Cards/Cards), **4,817.460 ms** (Game/Game) and
  **4,826.555 ms** (mixed). Corresponding interval p95 is **5,582.146 /
  5,932.312 / 6,137.323 ms**; maxima are **6,352.935 / 7,290.615 /
  7,027.977 ms**. Each 600-second host run yielded 124 nonzero-process
  samples, spanning respectively **593,452.687 / 592,547.614 /
  593,666.310 ms** from first to last. The host monotonic clock, not the
  sampled spacing, is the authority for the 600-second idle window. Do not
  interpret the report's `sampleIntervalMs` field as achieved cadence or
  claim one observation per second.
- **Alternative real-focus API probe — FAIL, fully reverted:** the pinned
  SDK version `1.0.4191.47` includes the real native
  `CoreWebView2Controller.MoveFocus(Programmatic)` API and separate
  `GotFocus`/`LostFocus` events. An opt-in, isolated source snapshot used that
  genuine API (not an invented callback) on local HTML fixture panes, with
  expected post-handler ownership and real WinForms event checks. Build
  `cwperf001-controller-focus-20260930`, host SHA-256
  `DCDC5336AE12F36AE4949F7A610A83F803605FA23FC2E5FB2CCC9D0F4565DFDD`,
  detached manifest SHA-256
  `6284B7FE3F6DB1D22C96E0401F6B193D05746C782F7F1264C74D3B71FE49C6D0`.
  The raw `measurements/controller-movefocus-20-01.json` and accompanying
  stderr/stdout remain frozen. It failed closed at cycle 1, host exit `1`,
  without timeout/child survivors or an accepted focus verdict: `blurAccepted`
  and `controllerVisible` were `true`, but **zero real processed WinForms
  GotFocus events** were observed after `MoveFocus`; `viewFocused=false`,
  `containsFocus=true`, `owner=none`. This is specific to an offscreen local
  smoke window and neither proves a production focus defect nor satisfies
  20 genuine focus transitions. Both the temporary host flag and sampler
  extension were reverted; normalized current C# source matches the earlier
  successfully frozen mixed-idle candidate.
- **Why further hidden focus synthesis is not an acceptance substitute:**
  documented WebView2 focus transfers operate on actual Windows focus, while
  this fixture deliberately hides its host window. The `GotFocus` handler's
  counter and `FocusHandling` span must represent *actual callback completion*,
  and a correct sample must also confirm the target pane and active profile.
  Calling handlers manually, counting only Focus-layout toggles, or relaxing
  ownership checks would falsely close this gate. A deliberate interactive,
  **local-page-only** synthetic focus test with explicit control of the
  fixture's window activation is the remaining technical direction; it
  must exclude the live game, preserve the normal host, and separately prove
  20 processed transitions before any PASS claim.

**Historical status at this earlier checkpoint (superseded by the continuation
below):** three 10-minute idle modes and their read-only auditor passed, but
stable WinForms WebView2 focus callback coverage was unproven. Independent
Technical QA, Chromium GPU/unique resident RAM attribution and PO-owned game
validation were still outside these measurements. No work on tasks 002–011,
normal EXE promotion or Git commit/push/tag/merge was performed.

## Continuation — actual native focus owner, explicit blur and DOM root preflight

**Correctness finding from real local WinForms/WebView2 events:** a genuine
`view.GotFocus` callback can be followed immediately by `view.LostFocus`
when focus moves from the WinForms wrapper to the *native child of that same
WebView2*. The wrapper then reports `Focused=false` but
`view.ContainsFocus=true`. The prior `LostFocus` handler cleared
`_webViewFocusedProfileId` unconditionally, even though the native child
still owned the focus. This explains the earlier synthetic failures without
interpreting them as game-session performance defects. The narrow retained
native correction is an early `if (view.ContainsFocus) return;` in the
existing `view.LostFocus` handler. The actual host-toolbar blur still clears
focus ownership, which is separately asserted on every subsequent transfer
and once at the end of the last cycle. No gameplay logic was changed.

- **A/B negative (visible window, guard absent):** local-HTML-only snapshot
  `cwperf001-focus-visible-20260930`, executable SHA-256
  `F64AABC783B2FC9D7D39B62A5BED027781CA68C70BE4275C62AE4F7413BF27AA`,
  manifest `D159BB9F43EC5DF737BF25F18BA2387DEB4BD95F674F2C80FFF95A2BFB3BE416`,
  `measurements/native-focus-20-01.json` **FAIL** at cycle 1: one real
  received and completed callback, `ContainsFocus=true` but `owner=none`.
  The normal programmatic `Focus()` return was `false`, so its return value
  alone was **not** treated as proof of a dispatched/processed callback.
- **Initial positive (visible local window, guarded LostFocus):** snapshot
  `cwperf001-visible-owner-20260930`, executable SHA-256
  `EF8AFA0EB920A191AA324D8DC58565C9B3887EB5746849766B1A2B58955004AD`,
  manifest SHA-256 `C9963FF176FF14D4C0C845C7134D35047FDA1012D47BB4A978C78347D24EC4BF`.
  Raw `measurements/owner-retention-20-01.json`, SHA-256
  `037C903D71B26F79107A55FB154440CF46E661D3B5E1B95FE9978EB555A78F25`:
  **20/20 actually dispatched and completed WinForms `GotFocus` callbacks**
  with sequential profile and owner verification, exit 0, no timeout/children;
  `FocusHandling n=20`, mean **2.193 ms**, p95 **2.877 ms**.
  Its stdout preserves each cycle's actual GOT/COMPLETE/LOST trace, showing
  `ContainsFocus=true` at the wrapper's subsequent LOST event.
- **True blur confirmation:** frozen `cwperf001-focus-blur-20261001`, host
  SHA-256 `1629C109511182C83D0D037ADFB910B9675AA1A1960ADF5B2C268626FAB5A5E7`,
  manifest SHA-256 `73969FFF3A86C6DBCF605C7634B8C06EF6B1FD33A6492BFFD196020121C4522A`,
  raw JSON `measurements/focus-with-external-blur-20.json`, SHA-256
  `D10F89947E8942130B7F14C5E6A0CBFD615936EECAFAA417EBEE4B6AF1FE3262`.
  **PASS 20/20** processed/owned focus transitions, with every host-toolbar
  blur and the *final* host blur explicitly proving owner reset. Exit 0,
  no timeout/children; `FocusHandling n=20`, mean **2.463 ms**, p95 **3.739 ms**.
- **Final combined candidate (both focus and root preflight):** create-only
  `cwperf001-root-preflight-20261001` host SHA-256
  `5EA4E21FF85CD9612AA4019D30367B51CCB3E2A22FA36ED8481ABA153C99BB16`,
  tuple manifest SHA-256 `50E44D835D07A9E873C9CD4F6F24685CDF5B0EB52BA2D096DBFE09E2C64ACA3C`.
  `measurements/focus-blur-20-final.json`, SHA-256
  `E217CD0981505A96AA1A359F0104EB06D91B201BCC4DB568AE574EFF92F89423`:
  **PASS 20/20**, exit 0, no timeout/surviving children;
  `FocusHandling n=20`, mean **4.201 ms**, p95 **8.918 ms**.
  These are per-run distributions, **not** universal latency guarantees.
  The synthetic form is briefly visible **only** with the explicit
  `--smoke-perf-focus-visible --perf-metrics` option, after startup releases
  the mutation gate. It loads only local HTML fixtures in separately frozen
  synthetic UDFs, never the game, and does not synthesize/raise a callback
  manually. The ordinary smoke form remains invisible (`Opacity=0`).

**Idle false-positive corrected:** the earlier Game validation used
`Boolean(root && !root.hidden)`, which returned `false` both for a legitimately
hidden Cards root and for an entirely absent root. `VerifyIdleFixtureViewAsync`
now uses the explicit three-way state `cards` / `game` / `missing` and
**rejects missing** for either requested mode before READY. An explicit
short-running `--smoke-perf-idle-preflight --perf-metrics` verifies both
panes through Cards/Cards, Game/Game and left Cards/right Game, then deletes
the right fixture root and asserts Game verification rejects it. On the
final combined tuple, raw
`measurements/three-mode-missing-root.json`, SHA-256
`00741EF7E40431EDA97C2569823847E0ABD5430013A1D400E9AE03DF8A5C56B1`:
**PASS** with the exact mode-specific marker, exit 0 and no survivors.
This is a **preflight**, not itself an additional 600-second idle run.

## Continuation — same-source 600-second Cards/Game idle baselines

Three *fresh*, **sequential** create-only frozen tuples use exactly the same
final combined host EXE SHA-256
`5EA4E21FF85CD9612AA4019D30367B51CCB3E2A22FA36ED8481ABA153C99BB16`
and matching shared JS/DLL inputs. None of the modes ran concurrently or
with the focus experiment. Each manifest and raw JSON was checked again
through `Audit-FrozenIdleEvidence.ps1` against its independent caller-supplied
SHA-256. All three **PASS** a host-monotonic >=600,000 ms READY/PASS window,
>=590,000 ms steady sample span, no >30,000 ms observation gap, process exit
0, no timeout and **zero surviving children**.

| Frozen campaign / run | Pinned manifest SHA-256 | Raw JSON SHA-256 | Host idle / total samples / process samples | Machine CPU mean / p95 | Sum private MiB min–max | Sum working set MiB min–max |
| --- | --- | --- | --- | --- | --- | --- |
| `cwperf001-final-idle-cards-20261001` / `cards-10m-post-guard` | `D010703945846A79F204E13AF642EC94DF33D3DDB8A22B5266B64605B2F520F9` | `C820E171008904B5D54AC2396A1C294A5A89E8C4C5701910C351A6723A85E432` | 600,011.464 ms / 129 / 128 | 4.580% / 6.169% | 516.984–561.535 | 908.625–973.742 |
| `cwperf001-final-idle-game-20261001` / `game-10m-post-guard` | `404A17B53C08A8AFDF4012C5CA1AE7878AA960C29B936A1DEA1610757F756D3F` | `BA69DDA7586A716C873072F734E67060B6F3738FC66B2A9CE43BD1BD8387C97A` | 600,009.870 ms / 116 / 115 | 3.957% / 5.487% | 511.770–554.805 | 904.133–974.680 |
| `cwperf001-final-idle-mixed-20261001` / `mixed-10m-post-guard` | `0E42C82CC310905162A4DD2D3F4E56844D4E2872EC3AA466FCA25786C31E0428` | `C65288CA30CFEDEF1EB2D83CD86D9F047ADB59A1B0540702C34E13580F8130EB` | 600,015.410 ms / 123 / 122 | 3.246% / 4.535% | 511.082–553.883 | 897.992–973.086 |

`SampleMs=1000` remains the *requested sleep*, not a 1 Hz achieved cadence.
The three observed mean intervals were **4.687 / 5.187 / 4.903 seconds**.
Machine CPU percentages use 24 logical CPUs, include only observed synthetic
host + related WebView2 descendants, and can omit exited renderer CPU;
summed working sets can double-count shared pages. All runs are unpaired and
nonrandomized. There is **no valid claim of a speedup** from the differences
between these values or compared with the earlier historic tuples. GPU and
unique-resident-RAM attribution remain unmeasured.

On the final combined tuple, frozen **full visual synthetic smoke**, the
**core-only smoke**, and the **shutdown-during-init** and
**shutdown-during-switch** variants all PASS. The complete
`npm test -- --test-reporter=dot` suite, `Test-PerformanceTuple.ps1`
corruption/identity negative tests, parser and `git diff --check` return exit
0 (known Windows LF/CRLF warnings only). Source and measurements remain in
the original dirty working branch or ignored create-only evidence folders;
none replaced the normal executable, touched a user profile/game session,
or performed commit, push, tag or merge.

**Latest author gate verdict:** real `GotFocus` dispatch + completed handler
with matching pane/profile ownership **PASS 20/20**, true host blur **PASS**,
three final-host modes at 600 seconds **PASS 3/3**, three-way root preflight
and absent-root refusal **PASS**, final frozen full/core/shutdown smokes
**PASS**. The broader CW-PERF-001 remains **NOT READY FOR RELEASE** because
the latest changes have **no independent Technical QA signoff** (the prior
worker startup failed and yielded no report), the native focus guard is
not validated in the user-owned live game, and GPU/unique-RAM limitations
cannot be inferred away. Tasks 002–011 remain planned and not approved for
promotion by these synthetic observations.

## Continuation — external-window deactivation and final focus-source gate

**Additional synthetic correctness gap discovered:** after 20 verified
WebView2 focus transfers, activating a *different top-level window* left the
previous WebView2 owner set. The outer WinForms control had already raised
its wrapper `LostFocus` during the child-focus transition, so the later
top-level activation did not necessarily raise a second wrapper `LostFocus`.
The `ContainsFocus` guard alone was therefore insufficient.

- **Preserved negative candidate:** `cwperf001-outside-blur-20261001`, host
  SHA-256 `3794F02277F8D1B9B09EDDCC285DE503A054584B2202A815060B4DF9C21623DB`,
  manifest SHA-256 `3C3C0C971B9532DBCA312652E09F1B03234437FFAA6AD69B188FDC831AD14B5A`.
  `measurements/focus-after-local-window-blur.json` exited `1`, with a real
  companion **local synthetic WinForms form** retaining keyboard focus while
  `_webViewFocusedProfileId` was incorrectly non-null. No game or unrelated
  user window was used.
- **Narrow host correction:** add a guarded `WorkspaceForm.Deactivate`
  callback which clears only `_webViewFocusedProfileId` and refreshes the
  command-deck focus cue. The active/selected profile and native gameplay
  state are **not** changed; the existing wrapper `LostFocus` retains owner
  only while `View.ContainsFocus=true`. A real local auxiliary-form blur,
  final toolbar blur, and 20 ordered focus transfers all pass after this
  correction. The earlier negative tuple remains intact.
- **Intermediate positive candidate:** `cwperf001-deactivate-focus-20261001`
  host SHA-256 `5D24F726E48BD3C88A2DE63B66014C3F6E17A0CD4B20A8CD14BCAC7D637D3EE8`,
  manifest SHA-256 `1E9FC582CBDDD3FC9FE7EA198933231453A6BD3102BD7E5D6E4FBD5D97BD3794`,
  raw `measurements/focus-and-outside-window-blur.json` SHA-256
  `504B9AE53FE17EE4FA25CA63A923F9EAE493FA8E42B38678EFAF665B39400521`.
  Exit `0`, no timeout/survivors; `FocusReceived=21` includes the 20
  requested cycles and one additional real callback when focus returned
  from the auxiliary window. No callback was simulated.
- **Current compiled final-focus source snapshot:**
  `cwperf001-final-focus-all-20261001`, executable SHA-256
  `3D42779501B1FA08673E0D05C9EBF91550051AFF3E4E840D2E205E3080B3B9F2`,
  separately pinned six-artifact manifest SHA-256
  `4699D54F039161331E22ABD423CA53CCC1E943E19E94DE4DBD880FDFC38B6DD4`.
  Raw `measurements/actual-focus-with-two-blur-types.json` SHA-256
  `06054062005858F6DE9CE358674CB3C18DB733842DF9B314AC2A0356664BE484`:
  **PASS** for 20 ordered real WinForms `GotFocus` handler completions and
  stable per-pane ownership, external-form blur, final toolbar blur, exit `0`,
  no timeout and no surviving children. The aggregate contains **21**
  `FocusHandling` samples (20 requested transfers plus an incidental return
  from the auxiliary window); mean **3.095 ms** and p95 **4.007 ms** for this
  single synthetic run. This is not a universal latency guarantee or an
  assertion that the WinForms `Focus()` return must be `true`.
  The raw `measurements/preflight-final-focus-all.json` **PASS** for
  Cards/Cards, Game/Game and mixed fixture view states plus absent-root
  refusal; it is explicitly **not** a 600-second benchmark. Frozen full
  visual smoke, core-only smoke, shutdown-during-init and
  shutdown-during-switch all **PASS** on this final-focus candidate.

**Important version boundary:** the three new 600-second campaigns in the
preceding table all use the earlier host SHA-256
`5EA4E21FF85CD9612AA4019D30367B51CCB3E2A22FA36ED8481ABA153C99BB16`.
They remain audited observations from that precise frozen build, but
**must not** be relabeled as measurements of newer `3D427795...` which
adds top-level `Deactivate`. The newest build has passed preflight,
20-cycle focus, and full/core/shutdown smokes, but has **not** itself
completed three more 600-second runs. A reviewer must preserve this
distinction and never infer live-game CPU/GPU/unique-memory effects.

**Latest classification:** author-executed synthetic focus correctness now
includes the inner Chromium focus and external-window deactivation cases.
The wider CW-PERF-001 **release gate is still NOT READY** pending
independent Technical QA for the final native focus changes, exclusively
PO-owned live-game confirmation, and any final-source measurements deemed
necessary in that review. No normal host was replaced, no live game was
visited, and no commit/push/tag/merge or task 002–011 implementation
was performed.

## Product Owner validation — 2026-10-01 UTC

The Product Owner confirmed validation of the explicitly identified frozen
candidate `cwperf001-final-focus-all-20261001` (host SHA-256
`3D42779501B1FA08673E0D05C9EBF91550051AFF3E4E840D2E205E3080B3B9F2`)
in a normal interactive session: **"Ok, validado. Nenhum comportamento fora do esperado."**
Record this as **PO functional acceptance for the behavior observed during
that session**, not an instrumented in-game performance benchmark or an
assertion that all future scenarios are covered. It closes the prior
**PO-owned gameplay validation pending** item for this exact candidate.

**Remaining gating items:** independently returned Technical QA on the final
native focus changes, and a conscious decision on whether final-source
600-second idle retests/GPU/unique-memory evidence are required before a
release-level performance claim. The three earlier 600-second results remain
attributed to the previous host SHA (`5EA4E21F...`), not the PO-validated
`3D427795...` binary. No executable was promoted and no commit/push/tag/merge
was authorized by this functional validation alone.

## Continuation — final-focus race fixture, three same-host idles and scoped collector hardening

**Frozen C# candidate, not yet live-validated:**
`cwperf001-focus-race-full-20261001`, EXE SHA-256
`8B40B6B69E486B8E835E6CC0F09BDFDC05F77E92ECCBA60636EE4D7B117DD035`,
six-artifact manifest SHA-256
`0D4A25B6ACEB844ACC01EE05091819B3E674C2DDA202BD830EED860C6D2DAC19`.
This is **not** the `3D427795...` host accepted by the Product Owner; that
earlier functional acceptance must not be transferred to this candidate.
Compared with the frozen PO-validated source, this source adds a second
`ContainsFocus`/host-focus check **after** acquiring the `GotFocus` async
mutation gate, a synthetic actual-event race that first queues focus, then
blurs to the toolbar and verifies that the late callback cannot restore the
stale account/owner, and an opt-in `--smoke-visual-extended` with a separate
60-second watchdog. The regular synthetic smoke keeps its 12-second watchdog.

**Independent read-only Technical QA of the exact C# source/host:** no new
P0/P1/P2 in that scoped delta. The frozen `real-focus-guarded-race-final`
report (SHA `25F60A664443B673...`) records exit 0, 20 real ordered focus
transfers, the queued cycle 21 completing after toolbar blur with owner
remaining null, and the positive stale-focus marker. The extended full
synthetic smoke report (SHA prefix `3A03CFF3...`) has exit 0 and both explicit
full-screenshot/host-smoke PASS markers; 47 synthetic PNG artifacts exist.
The three-mode/root-missing preflight, frozen core smoke and both shutdown
smokes also PASS. This source/automated verdict does **not** confer independent
human visual approval or evidence for the default 12-second smoke's reliability.

**Three ten-minute synthetic idles on the SAME EXE (sequential, no shared live
UDF, all auditor PASS):**

| Mode / run | Report SHA-256 | Collector SHA-256 | Host idle | Post-READY coverage / CPU rows / max gap | Observed synthetic CPU mean / p95; private MiB min–max |
| --- | --- | --- | --- | --- | --- |
| Cards/Cards, `idle-cards-postready-anchor-10m` | `E1089740B88EBFA2455C6706E1C37E0ADB5EE55FE524C90EDF8480293C40408F` | `BFC5EFAAB4C684531374D4275311DCB072CDC976A5F5515AEFF79DF69D7EA10D` | 600,016.864 ms | 596,590.068 ms / 93 / 10,782.835 ms | 5.533% / 7.240%; 521.516–551.641 |
| Game/Game, `idle-game-postready-anchor-10m` | `3ECE82EBA5B0D81146C2A55A09707CFEF10661053D87B96F9DE57BF14B100938` | `BFC5EFAAB4C684531374D4275311DCB072CDC976A5F5515AEFF79DF69D7EA10D` | 600,005.176 ms | 591,492.789 ms / 74 / 11,815.260 ms | 4.822% / 6.447%; 522.691–542.609 |
| Cards/Game, `idle-mixed-postready-safe-10m` | `D5FCC6198069808466B67A22B16105E60E4C1CACD661F3A82D1F342B3911735B` | `68F2E0211FCBCB5D6627736E1A766BE532D162937BD2576E051AEA204C832207` | 600,018.351 ms | 593,737.860 ms / 78 / 12,174.077 ms | 4.682% / 6.369%; 515.781–565.328 |

The external read-only auditor verified each **individual** exact manifest,
report and externally supplied collector SHA; all show exit 0, positive
READY/PASS, no timeout, zero observed surviving child, >=600,000 ms host idle,
>=590,000 ms positive-process coverage, >=60 numeric CPU samples and no gap
over 30 seconds. The first sample is an actual post-READY resource anchor with
null CPU; it is not counted as a numeric CPU-rate sample. The collectors' SHA
versions differ because the safety review occurred between sequential runs;
preserve the original reports without retrospectively changing provenance.
Read-only archived copies of the as-run BFC5EFAA and 68F2E021 collector
sources reside under `.local-evidence/coupled-webview2-perf/collectors/`.
These results are **unpaired** synthetic observations with WebView2 process
churn and shared resident pages. They provide no before/after gain claim,
unique-resident memory/GPU result or real-game measurement.

**Independent sampler QA and corrective evidence:** the first review identified
a P1 risk of killing an unrelated process after WebView2 PID reuse. A scoped
immediate CIM recheck alone did not close the earlier-discovery and final-kill
race. The subsequent collector preserves each originally verified PID/birth
and its parent identity through discovery and cleanup, checks child identity
again, and uses `OpenProcess(PROCESS_TERMINATE | PROCESS_QUERY_LIMITED_INFORMATION)`
plus `GetProcessTimes` and `TerminateProcess` on the **same retained native
SafeProcessHandle**. The exact source after exception-path hardening has SHA
`1E78DAA828AA638613EEC82DE858823B58FC377F13F8F919EE3E66DFFC717B43`.
Independent **read-only source QA found no remaining P0/P1** in scoped
termination identity/PowerShell argument handling; it reports P2 limits in
exceptional cleanup and completeness of the descendant census. A focused
synthetic core smoke on this SHA (`sampler-hardened-core-final`) exited 0,
captured its positive opt-in metrics/core markers and reported no observed
survivors/cleanup error (raw SHA
`B37BF802F02409E80E57F58EE1CAD6843F1A4E8D0581A14E875361EC03C99334`).
The **same final collector SHA** also passed the bounded three-mode
preflight (`sampler-hardened-preflight-final`, raw SHA
`C1F4A51BCF03D9786C90821AF5A669F32CAA75173AD0423FA09FBB9790CF711E`):
the positive marker was captured, the smoke exited 0, six owned processes
were sampled before teardown, with no observed survivor/cleanup error.
On the preceding native-handle SHA `AD964355...`,
the same core smoke passed, and an intentionally forced 5-second external
watchdog returned **expected FAIL** (timeout=true, no observed survivors) with
immutable negative JSON rather than a false PASS. These short smokes **do not
replace** the three earlier 600-second idles or demonstrate 600-second
resource coverage for the latest collector SHA.

Additional verification: `npm test -- --test-reporter=dot` exit 0; scoped
benchmark tests **11/11 PASS**; tuple source/hash/corruption negative checks
**PASS**; collector PowerShell parser and `git diff --check` exit 0 (Windows
LF/CRLF warnings only). No productive game or user browser was inspected,
no normal EXE/dist/real UDF was overwritten, and no commit/push/tag/merge
was made.

**Acceptance and release classification:** AC-PERF-01 has a source-pinned
**synthetic three-mode baseline**, albeit with independently pinned different
collector revisions and acknowledged CPU attribution limits. AC-PERF-02/04
have positive scoped automated synthetic/host evidence, with productive
isolation and UX still subject to the Product Owner's observation. AC-PERF-03
**remains open**: no paired optimization/baseline delta or proven resource
reduction. AC-PERF-05 lacks an independent render-first visual verdict for
this exact candidate; preserve `VISUAL EVIDENCE INSUFFICIENT`. AC-PERF-06 is
**pending Product Owner validation of `8B40B6...`**, separate from the
historical `3D427795...` acceptance. Consequently the C# focus and frozen
synthetic host are **TECH READY in their scoped domain**, while the full
CW-PERF initiative is **NOT READY FOR RELEASE** and makes **no measurable
performance improvement claim**. Follow-on 002–011 remain planning items;
no binary promotion or Git publication is authorized by these measurements.
