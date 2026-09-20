# Coupled Workspace — PM Acceptance & Evidence Record

Recorded: 2026-09-20

## Task

- Request: evolve the live-functional WebView2 coupled workspace into an advanced Better UI-native account workspace.
- Product Owner approval: plan explicitly approved on 2026-09-20.
- Baseline runtime: WinForms + WebView2 host under `tools/coupled-workspace-webview2/`; Product Owner confirmed both panes functional on 2026-09-20.
- Design source: approved `design-system/pokepixel-better-ui/MASTER.md`, `.skills/ui_ux_pro.md`, `.skills/pixel_art_direction.md`, and candidate `pages/coupled-workspace.md`.
- Previously Product Owner validated scope: two independent WebView2 account sessions load and operate in one frame; Better UI injection works through the native host.
- Explicitly out of scope: gameplay automation, mirrored gameplay input, network interception/modification, credential storage, server/API changes, reopening validated in-game Better UI module designs.
- Write owner: coupled-workspace host implementation under PM-controlled task slicing.

## Product decisions frozen by approval

1. Workspace supports **1 account or 2 accounts**.
2. Dual mode supports semantic layout presets **1:2 / 1:1 / 2:1** plus native splitter movement.
3. A selected/active pane is explicit and drives contextual host controls.
4. Host-level controls may target Active or Both only when they do not perform gameplay actions.
5. Account/profile state stays isolated per WebView2 user-data folder.
6. The host follows the existing Miyazaki 16 Better UI grammar rather than introducing a SaaS/dashboard visual system.
7. Low-frequency maintenance actions move out of the primary command deck.
8. Electron remains superseded; WebView2 is the active runtime.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `CW-01` | User can switch between **1 Account** and **2 Accounts** without restarting the host | Dual→Single keeps active profile live and disposes inactive pane; Single→Dual restores last dual mapping and lazily creates only the missing account; UDF isolation/no credentials remain | unit/state tests + repeated lifecycle smoke + UX QA | Host Engineer | Technical + UX QA | `accepted` |
| `CW-02` | Single mode exposes a profile selector and renders exactly one initialized account viewport | selected profile persistence; switching profile disposes current pane and initializes only selected profile from its own UDF | lifecycle tests + representative render | Host Engineer | Technical + Visual QA | `accepted` |
| `CW-03` | Dual mode exposes **1:2 / 1:1 / 2:1** presets and a native draggable splitter | both panes remain usable; nominal 20–80 applies only where each pane stays >=320px; last ratio persists | layout tests + wide/narrow render | Host Engineer | UX + Visual QA | `accepted` |
| `CW-04` | Releasing the splitter within **24px** of 1:2 / 1:1 / 2:1 snaps to that preset; other release positions remain custom | no magnetic snap while dragging; pointer continuity | interaction test + render/recording | Host Engineer | UX QA | `accepted` |
| `CW-05` | **Swap** exchanges profile↔side mapping without exchanging/copying account storage; Active follows the active profile to its new side | independent UDFs/cookies; Active-scoped commands still target the same account | state/lifecycle tests | Host Engineer | Technical QA | `accepted` |
| `CW-06` | **Focus** temporarily promotes one pane to 100% and **Restore** returns the previous dual layout | both session processes remain valid; hidden pane is not navigated/disposed/recreated; previous ratio/order | lifecycle + layout tests + render | Host Engineer | Technical + Visual QA | `accepted` |
| `CW-07` | Exactly one pane is visually/semantically active in dual mode and the active state is keyboard reachable | cyan focus remains independent from gold selected/current | keyboard tests + state render | Host Engineer | UX + Visual QA | `accepted` |
| `CW-08` | Primary command deck stays compact and adapts between single and dual modes | game viewport remains dominant; no permanent maintenance clutter | representative renders at target widths | UI Engineer | Visual QA | `accepted` |
| `CW-09` | Home/Reload and other approved host commands can target **Active** or **Both** explicitly | commands remain host/browser operations only; no gameplay command fan-out | command-scope tests + UX QA | Host Engineer | Technical + UX QA | `accepted` |
| `CW-10` | DevTools and low-frequency maintenance actions live in a progressive-disclosure maintenance surface | keyboard access; no hidden required primary action | keyboard/accessibility test + render | UI Engineer | UX + Visual QA | `accepted` |
| `CW-11` | Pane health distinguishes initializing/loading/ready/UI-ready/error/process-failed/blocked-url without color-only meaning | `UI READY` requires a post-success bundle execution marker, never only the pre-run idempotence marker; current WebView2 diagnostics and fail-closed navigation remain | state tests + injected-success/failure fixtures + error render | Host Engineer | Technical + UX QA | `accepted` |
| `CW-12` | Workspace state persists structurally across launches (mode, profiles/order, active profile, ratios, focus state, command scope, per-profile zoom and maintenance-drawer expanded state) | no secrets/tokens; invalid state fails safely to defaults | serialization/adversarial tests | Host Engineer | Technical QA | `accepted` |
| `CW-13` | Profile registry contains non-secret identity/display/UDF metadata only | credentials remain WebView2-owned | source audit + serialization test | Host Engineer | Technical QA | `accepted` |
| `CW-14` | Command deck uses MASTER Miyazaki 16 geometry, state language and typography | no changes to in-game module styling | render + design-contract audit | UI Engineer | Design + Visual QA | `accepted` |
| `CW-15` | Single/dual/focus layouts remain operable at the supported minimum host width without clipped primary controls | game view remains usable; no horizontal primary toolbar scroll | narrow render + keyboard pass | UI Engineer | UX + Visual QA | `accepted` |
| `CW-16` | Keyboard shortcuts, if introduced, use modifiers and do not relay raw input to game panes | browser/game shortcuts remain authoritative unless explicitly scoped | shortcut conflict tests | Host Engineer | UX QA | `not introduced` |
| `CW-17` | Better UI injection remains top-frame, exact-origin, document-idle and per-document idempotent for every initialized pane | current injection security/timing contract | smoke + source audit | Host Engineer | Technical QA | `accepted` |
| `CW-18` | Normal workspace operation never mirrors clicks, keys or gameplay actions between accounts | gameplay autonomy and project no-automation invariant | source audit + negative tests | Host Engineer | Technical QA | `accepted` |
| `CW-19` | Pane creation/disposal/recovery never reuses another profile's CoreWebView2Environment/UDF | login/session isolation | adversarial lifecycle tests | Host Engineer | Technical QA | `accepted` |
| `CW-20` | Superseded Electron implementation is not used by the normal launcher | existing launcher compatibility | launcher smoke | Host Engineer | Technical QA | `accepted` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| `R-CW-01` | Lazy second-account creation may accidentally create/dispose the wrong UDF or lose a live session during mode switches | repeated single→dual→single lifecycle test checking profile/UDF identity | `closed locally` |
| `R-CW-02` | Swapping visual panes could be implemented by swapping profile data instead of controls, contaminating account ownership | adversarial swap test asserting environment/UserDataFolder identity never changes | `closed locally` |
| `R-CW-03` | Focus mode can accidentally dispose or navigate the hidden pane rather than merely changing layout | focus/restore test with preserved URL/environment/state | `closed locally` |
| `R-CW-04` | A generic “Both” command path could become an accidental gameplay automation surface | command registry allowlist audit; negative test rejects unknown/gameplay commands | `closed locally` |
| `R-CW-05` | Persisted malformed JSON/state can make the workspace fail at startup | corrupt/partial/future-version state fixtures with safe default fallback | `closed locally` |
| `R-CW-06` | Compact toolbar can overflow once profile names/status/error copy expand | representative 1180px + stress-label render | `closed locally` |
| `R-CW-07` | Gold active-pane treatment and cyan keyboard focus can collapse into one ambiguous signal | selected+focus render matrix | `closed locally` |
| `R-CW-08` | Health polling/diagnostics could become a host↔page bridge broader than required | source/API audit; only minimal marker/status script reads allowed | `closed locally` |
| `R-CW-09` | Dynamic WebView2 reparent/show-hide can expose WinForms disposal/handle-order bugs | repeated mode/layout smoke with ProcessFailed and handle assertions | `closed locally; Product Owner live validation functional` |
| `R-CW-10` | Split persistence from the old `split.txt` can conflict with new structured settings | migration test and one-way import/delete-or-ignore policy | `closed locally` |

## Gate state

- Intake: **complete**.
- Product plan approval: **complete**.
- F0 Acceptance Contract: **DESIGN READY + ARCH READY**.
- F1 Host refactor: **TECH READY**.
- F2 lifecycle / structured persistence: **implemented and covered by repeated smoke**.
- F3 layout engine: **TECH READY**.
- F4 Command Deck: **TECH READY + UX READY + VISUAL READY**.
- F5 health / diagnostics / Maintenance Drawer: **TECH READY + UX READY + VISUAL READY**.
- Original candidate TECH / UX / VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0** before the later keyboard-boundary audit.
- Product Owner live validation of original candidate: **functional on 2026-09-20**.
- Post-live F6-F8 audit found one Maintenance Drawer Tab-boundary defect in the original candidate; the Product Owner's functional report was not an itemized keyboard-accessibility certification.
- Corrected `candidate2` TECH QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Corrected `candidate2` A11Y/QOL QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Corrected `candidate2` UX/VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0**; approved render hashes are byte-identical to the prior candidate.
- Product Owner live revalidation of corrected `candidate2`: **COMPLETE — functional on 2026-09-20**.
- A later Product Owner UI/UX audit reopened the visual gate after visible alignment defects were reported in the Command Deck.
- Alignment correction `candidate3` TECH-UI QA: **READY — P0=0, P1=0, P2=0, P3=0** on exact artifact SHA `A304E45F55152350A569EB6AA0816779154A11287A8D1062DAEA4E64E4CAF830`.
- Alignment correction `candidate3` UX/A11Y QA: **READY — P0=0, P1=0, P2=0, P3=0** on the same exact artifact.
- Alignment correction `candidate3` VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0** on the same exact artifact and its fresh 20-render matrix.
- Proper blocking `candidate3` smoke (`Start-Process -Wait`) after the final keyboard-routing fix: **PASS**, exit `0`, stderr empty; all 20 local render artifacts regenerated from that run.
- Product Owner live validation of exact `candidate3`: **COMPLETE — validated on 2026-09-20**.
- Final normal-host promotion from the `candidate3` source: **COMPLETE**.
- Final normal-host build / blocking local smoke / compatibility-wrapper validation: **PASS**.
- Final independent release audit on the newly promoted host: **RELEASE READY — P0=0, P1=0, P2=0, P3=0**.

## Frozen candidate evidence — 2026-09-20

- Host artifact: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate.exe`
- Host SHA-256: `07DC9364C13F77530ED9FAAF9458FD99ED292E259E7539878A8BB52F1AF70FE8`
- Live result: **functional overall**, with no itemized exception reported at the time.
- Later F6-F8 audit found a keyboard-only Maintenance Drawer boundary issue in this artifact: WinForms consumed Tab as a dialog key before the old `KeyDown` handler could transfer focus out of the drawer.
- Historical baseline normal host SHA-256 before candidate2 promotion: `491728E202737BED44FF051C3BE5205F13942B045560C0376787DD523A520846`
- Better UI bundle SHA-256: `A520A0444D4FF47EA06922BCE5956EDBEE319100DFDFE4D313E651C081BE57DD`
- Candidate build: **PASS**.
- Local WebView2 coupled-workspace smoke: **PASS**.
- Normal-host build from the same frozen source: **PASS**.
- Normal-host local smoke: **PASS**.
- Compatibility wrapper `tools/coupled-workspace/Start-CoupledWorkspace.ps1 -SkipBuild -ValidateOnly`: **PASS**.
- Automated/independent gates did **not** open or operate live PokePixel; live validation was performed separately by the Product Owner.
- Normal-output executable may remain locked by an older running workspace; candidate output is intentionally independent of that lock.

### Post-live accessibility correction candidate

- Review artifact: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate2.exe`
- SHA-256: `638A7AB9BF1F3A49CB21E86B70B9F2CDC39407C4D2566A634913F6D4FDBBFD88`
- Runtime delta: Maintenance Drawer Tab/Shift+Tab boundary handling moved from `KeyDown` to the WinForms `ProcessDialogKey` path.
- Regression evidence: forward Tab from the final Reset control is exercised through the focused control's real `PreProcessMessage(WM_KEYDOWN Tab)` route; Shift+Tab from the first Recover control is exercised through the overridden dialog-key path.
- Direct candidate2 build: **PASS**.
- Candidate2 local smoke: **PASS**.
- Independent focused TECH re-QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Independent focused A11Y/QOL re-QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Independent focused UX/VISUAL carry-forward: **READY — P0=0, P1=0, P2=0, P3=0**.
- Product Owner live revalidation: **functional** on 2026-09-20.
- Candidate2-era promoted normal host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.exe`
- Candidate2-era promoted normal-host SHA-256: `052D146BED95045FED641A56CD1A8C64178CFAD9AEB570800A7C0CF9AF609F81`
- Candidate2-era normal-host build from the corrected source: **PASS**.
- Candidate2-era normal-host local smoke: **PASS**.
- Candidate2-era compatibility-wrapper validation: **PASS**.

### Post-audit alignment / UX correction candidate

- Review artifact: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate3.exe`
- SHA-256: `A304E45F55152350A569EB6AA0816779154A11287A8D1062DAEA4E64E4CAF830`
- Product Owner trigger: a complete UI/UX audit was requested after visible element misalignment was reported.
- Corrected Command Deck geometry: 44px logical row; 32px logical inner groups; 28px logical controls; 6–8px dense gaps; no default WinForms margin seam before the viewport.
- Center layout now resolves responsive visibility before measurement, then physically centers the dual-layout group when space permits and clamps it away from the side groups when required.
- Native ComboBox chrome was replaced by a square Better UI select/dropdown using the Miyazaki 16 palette; keyboard commands are handled through WinForms `ProcessCmdKey`, and the custom accessibility object exposes ComboBox role/name/value/default action plus expanded/collapsed state.
- Dual health remains visible at the supported 1180px logical minimum with compact deck labels and full status through accessibility/tooltip/diagnostics.
- WebView keyboard focus keeps selected/current gold semantics while adding the independent cyan focus cue required by the design contract.
- Focus mode order is `active identity -> health -> Restore` for either physical side.
- DPI policy is Per-Monitor V2 + `AutoScaleMode.Dpi`; logical metrics are reapplied on DPI changes without constructor-time double scaling; Maintenance Drawer placement uses the monitor containing the `⋯` trigger and clamps correctly across signed multi-monitor coordinates.
- Blocking local smoke after the final `ProcessCmdKey` fix: **PASS**, exit `0`, stderr empty, stdout ends `WebView2 coupled workspace smoke: PASS`.
- Fresh render matrix contains 20 PNGs, including 1180/1200/1280/1600 dual layouts, compact/expanded threshold renders, single mode, focus-left/right, keyboard focus, WebView focus, select dropdown, drawer and workspace composites.
- Independent TECH-UI QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Independent UX/A11Y QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Independent VISUAL QA: **READY — P0=0, P1=0, P2=0, P3=0**.
- Product Owner live validation: **validated** on 2026-09-20.
- Promoted normal host: `tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.exe`
- Promoted normal-host SHA-256: `3C904395CACB17CD8B467FDDEEFC46170B4441B7C88D6BB599100DF32CF84C27`
- Promoted normal-host blocking smoke: **PASS**, exit `0`, stderr empty.
- Compatibility wrapper `tools/coupled-workspace/Start-CoupledWorkspace.ps1 -SkipBuild -ValidateOnly`: **PASS**.
- Final independent release audit on the promoted normal host: **RELEASE READY — P0=0, P1=0, P2=0, P3=0**.

Representative local-only render evidence from the final `candidate3` correction pass:

- `bin/smoke/visual/workspace-dual-composite-1180.png` — SHA-256 `E54593E6161B94332920C88B29E6338B9D7661F23029D59C88B1C6EC7C9C1043`
- `bin/smoke/visual/workspace-focus-composite-1180.png` — SHA-256 `3AF7F841C05095D887468C190E2BD71D9D070B988AF4F620D1467E78FF0FA22A`
- `bin/smoke/visual/workspace-drawer-composite-1180.png` — SHA-256 `755020C9A76565D4C7B8E3E77B930F72BD23FCACE063450FE8B5BE77312ADD58`
- `bin/smoke/visual/command-deck-scope-dropdown.png` — SHA-256 `71625588F80752CBFAED44983571B67D5686401253793C24BEBF19E64E00F643`
- `bin/smoke/visual/command-deck-webview-focus-1180.png` — SHA-256 `C7DC6993F9F5A56EE4F64E58421DF1156D0A8F41B9A22F88631FBD4E47F5C0F2`
- Composite pages are synthetic local WebView2 pages. `CapturePreviewAsync` is used only by smoke evidence; no live-game claim is inferred from them.
- Dual composite proves the active gold and inactive strong-neutral cues are **2px top rails** immediately above actual WebView2 preview content.
- Focus composite proves the focused Active account remains a full viewport with the same quiet 2px rail rather than a gold frame.
- Drawer composite proves the materialized 360px Maintenance Drawer overlays the workspace at the `⋯` trigger anchor without resizing pane geometry.
- Maintenance Drawer uses a 10px square Better UI scrollbar: charcoal track, stone thumb, strong-neutral hover/drag; native WinForms light scrollbar is hidden.

## PM evidence audit — final handoff

1. Every approved product behavior has an observable criterion: **yes**.
2. Existing live-functional WebView2 baseline is treated as behavior evidence, not visual approval of the redesign: **yes**.
3. Previously validated Better UI game modules are outside this host redesign and must not be reopened: **yes**.
4. Gameplay automation/mirrored input is explicitly prohibited: **yes**.
5. Visible claims have representative local rendered evidence before PM handoff: **yes**.

## Repository integration hygiene

- Root `README.md` points the supported multi-account host to `tools/coupled-workspace-webview2/`.
- `tools/coupled-workspace/README.md` records the Electron implementation as an archived prototype; `Start-CoupledWorkspace.ps1` remains only as the compatibility wrapper to WebView2.
- `tools/dual-edge-workspace/README.md` points single-frame users to the WebView2 host and records Dual Edge as superseded.
- Ignore coverage was verified for Electron `node_modules/`, the generated extension userscript, WebView2 `bin/`, smoke runtime data and extracted SDK. NuGet package ignores use version-agnostic `Microsoft.Web.WebView2.*.nupkg` / `.nupkg.zip` patterns and were checked against a hypothetical future SDK version.
- The versionable file audit contains source, scripts, docs, lock/config files and intentional historical prototype sources only; generated runtime artifacts are excluded.
- No Git history operation was performed as part of this delivery.

## Product Owner live validation record

Original frozen-candidate live result: **functional**. A later audit identified the keyboard-only Drawer boundary defect described above.

Corrected `candidate2` live revalidation result: **functional**. No live blocker was reported by the Product Owner on 2026-09-20, and the corrected source was subsequently promoted to the normal host path.

After the later UI/UX alignment audit and `candidate3` correction pass, the Product Owner validated the exact `candidate3` artifact on 2026-09-20. That source was then promoted to the normal host path only after the live validation; `candidate2` was preserved as the previous known-good reference artifact.

The approved live-validation checklist for that frozen candidate was:

1. 1 Account ↔ 2 Accounts switching with correct sessions.
2. Single-account profile selection.
3. 1:2 / 1:1 / 2:1 + drag/snap behavior.
4. Swap and Focus/Restore.
5. Active-pane clarity and scoped common controls.
6. Maintenance/diagnostic surface usefulness.
7. Overall visual efficiency and consistency with Better UI during real use.

The Product Owner reported the candidate **functional** overall and did not report an itemized exception to this checklist.

Do not ask the Product Owner to revalidate unrelated already-closed Better UI modules unless a concrete regression is observed.
