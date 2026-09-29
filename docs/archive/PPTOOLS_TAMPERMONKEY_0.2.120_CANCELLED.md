# PPTools Recommendation — cancelled Tampermonkey one-click experiment (0.2.120)

> **CANDIDATO CANCELADO / ARQUIVO HISTÓRICO.** Em 2026-09-29 o Product
> Owner decidiu encerrar a entrega sem incorporar PPTools ao Tampermonkey.
> Não instale o snapshot abaixo: ele foi substituído pelo build 0.2.121,
> que mantém somente o executor PPTools no Coupled Workspace opt-in.
> Este histórico foi movido de `tools/` para `docs/archive/` na limpeza do
> repositório. O snapshot original foi arquivado em
> `.local-evidence/deep-clean/cancelled-tampermonkey-0.2.120-20260929.zip`
> (arquivo local ignorado pelo Git); não há candidato Tampermonkey ativo.

Historically, the Product Owner approved the existing PPTools Recommendation
flow in the Coupled Workspace, then authorized a **temporary background browser
tab** for an experimental standalone Tampermonkey path. That experiment was
subsequently cancelled; its flow is preserved below for reference only.

## Historical installation record (cancelled; do not install)

The cancelled version used the **single** Better UI userscript snapshot at
`tools/pptools-tampermonkey/bin/PokePixelBetterUI.pptools-tampermonkey.0.2.120.user.js`
(SHA-256 `401D53B3CC2138F5D3754F974D6AC12442706A3103F632A753E4B60519FEFDDC`).
It is retained only as evidence; the current `dist/pokepixel-better-ui.user.js`
is a different build and must not be described as equivalent to this snapshot.
The old script matched `https://pokepixel.nietore.com/*` and the dedicated
`https://www.pptools.com.br/hunt-analyzer*` worker route. Tampermonkey needs
the script's declared permission to open tabs and to read/write its own
namespaced GM storage. There is no second userscript to install, no copied
JSON, and no dependency on the Coupled Workspace for this path. When the
Coupled Workspace offers its existing PPTools WebView2 bridge, that already
approved native transport takes precedence.

## Historical user journey (cancelled)

In the PokePixel game, click **PPTools Recommendation** for the current leader.
The script reads and rechecks the authoritative leader and current profile,
builds the same allowlisted PPTools attacker input and opens **one inactive
temporary PPTools tab**. It uses the genuine, version-pinned PPTools public
page and its DOM simulator to return at most three ranked rows. Once the
response is delivered, the owned auxiliary tab is closed. The browser may
briefly show it in its tab strip; `active:false` does not guarantee a fully
invisible tab on every browser. The script does not touch any existing
PPTools tab or transfer anything through the clipboard.

Each recommended hunt in the Better UI list has **Search**. Clicking Search
fills the original Hunt list search field and focuses it. Current world,
level, element and other filters remain user-controlled. Search does not
start a Hunt, alter team state or click the native Hunt action. If no row
appears, check the current world and filters.

## Transport and boundaries

- The PokePixel side owns an unguessable per-request `pptools-<32 hex>` ID.
  Only the opaque ID travels in the temporary tab URL fragment; the helper
  removes the fragment before invoking the pinned simulator runner.
- Tampermonkey storage uses one key per request, with only the strictly
  allowlisted attacker fields. Pokémon instance IDs, trainer IDs, session
  data, private trainer buffs and unknown payload fields are removed. The
  returning result must have the same request ID and bounded result size.
- The extension's GM change listener provides the same message shape as
  the earlier Coupled Workspace bridge. The existing widget rejects stale
  leader, profile, session, duplicated and outdated results. Switching
  leaders, canceling, timing out or disposing the widget closes only the
  tab created for that request and removes its GM listener and storage key.
- A manual visit to PPTools with no exact job fragment does nothing.
  An expired or invalid job cannot start the runner. A later game-page
  initialization prunes expired per-request extension storage from interrupted
  sessions. The PPTools page does not gain access to the game's cookies,
  profile WebView or original PokePixel page object.
- The PPTools runner is **derived at build time** from the existing exact
  `tools/coupled-workspace-webview2/pptools-runner.js` using strict source
  replacements. Drift of those source anchors fails the build. Both paths
  enforce the pinned public PPTools route/frontend/DOM/result structure.

## Accuracy and validation

The native game's **COPIAR JSON** data lacks `trainer.exp_buff` and
`is_starter`. The simulator receives neutral `expBuff:1`; when native
starter status is unavailable, it receives `isStarter:false`. The widget
discloses that actual EXP buffs and starter bonuses may change XP/h or rank.
The results are the public PPTools simulator's estimates and are not an
authoritative prediction of game rewards.

Local checks are limited to Node/JSDOM suites, the adapted runner's synthetic
PPTools DOM and offline UI screenshots. Tests cannot prove Tampermonkey's
runtime sandbox/grant behavior or the real game's native search events. The
Product Owner validates installed userscript, tab opening/closing, Top3,
two simultaneous game tabs and Search in the actual game. Nothing in this
candidate promotes or replaces the stable Coupled Workspace host.
The current local full suite passed **559/559 tests** and `npm run build` passed;
independent Technical/Security and UX/A11y reviews reported no remaining
P0/P1/P2 in the reviewed source. Synthetic Edge previews at 235/410/680 px
are in `tools/coupled-workspace-webview2/bin/pptools-tampermonkey-candidate/`.
