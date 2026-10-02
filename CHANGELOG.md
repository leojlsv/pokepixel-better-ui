# Changelog

All notable project changes are recorded in this file.

## Unreleased

- **Toggle Cards/Game fixo + editor nativo de moves — candidato `0.2.131` (2026-10-01):**
  o HUD móvel `Cards / Game` foi removido. O standalone agora usa um único ícone de
  interruptor dentro da própria menu bar, com posição DOM estável em Cards e Game,
  estado visual/`aria-pressed` e foco de teclado. Cards mantém a toolbar e apenas o
  caminho DOM necessário para ela visíveis, enquanto o restante da superfície nativa
  permanece oculto; não há dock externo, cálculo de viewport, `ResizeObserver` nem
  reparenting do controle ao alternar modos. `menu-bar`, Pokémon Profile e Module Controls
  permanecem montados enquanto Cards apenas oculta a superfície nativa, evitando
  teardown/rebuild da game bar e preservando a estrutura/customização Better UI ao
  voltar para Game. No Pokémon Profile, **Configurar moves** deixa de abrir o editor
  paralelo do Better UI e delega o `creatureId` exato ao editor oficial
  `PokeIdle.MovesetConfig.open(...)`; Saved Movesets continuam usando os contratos
  nativos de leitura/gravação já existentes.

- **Fundação visual — PokéPixel atual como autoridade (2026-10-01):** a antiga opção
  `Squared` foi removida definitivamente. Better UI agora possui uma única geometria
  nativa (8px janela / 5px controles e cards / 4px badges), sem seletor de cantos,
  sem `data-ppbui-corners` e sem fallback 0px. A chave legada
  `ppbui:appearance:v1` é removida no startup. Janelas/shells PPBUI usam
  explicitamente o papel de 8px, e foco de
  teclado usa o papel independente de 2px em vez de herdar a linha estrutural de 1px.
  MASTER 3.0 e os overrides normativos de Team, Storage, Hunts e Auto
  Helper agora deixam explícito que Miyazaki 16, 0px/square, bordas estruturais de 2px
  e pixel-depth antigos são contexto histórico; a referência visual corrente do jogo
  governa o chrome, preservando comportamento e estrutura funcional já validados.

- **Cards CURRENT / persistência Windows — revisão técnica final do candidato
  `0.2.129` (não publicado):** matriz sintética ampliada para dez estados em
  235/269/270/319/320/390/519/520 px, com detecção do corte real a 270/520 px.
  Team/Player/Target agora empilham abaixo de 320 px; acima disso, rótulos,
  metadados e tipos podem quebrar linha sem desaparecer. A tupla final v19
  gerou 131 screenshots e passou o smoke. Preferências existentes ilegíveis
  ficam protegidas contra sobregravação, enquanto snapshots concorrentes
  acionam conflito seguro; testes físicos de Create/Replace, duas gravações
  simultâneas e liberação de mutex passaram em diretório temporário. Os avisos
  WinForms sanitizados distinguem encerramento, falha durante uso e conflito;
  a caixa de shutdown foi comprovada visível, com owner e Enter em formulário
  Windows sintético. Novo teste físico integra CI Windows. O contrato CURRENT
  depende do Analyzer `1.15.1`; validação live do PO e aprovação de release
  continuam pendentes. Evidências, SHA e limites:
  `docs/PM_GATE_2026-10-01_CURRENT_VISUAL_PERSISTENCE_V24.md`.

- **Cards CURRENT / WebView2 — candidato inicial 0.2.129, tupla v07 (histórico):** a
  revisão render-first do candidato `0.2.128` encontrou rótulos de última
  espécie e de Expedição cortados em panes estreitos. Cards passou a
  reorganizar Team/ativo/alvo em vez de esconder rótulos: duas linhas em
  270–519px e três linhas abaixo de 270px, preservando a distinção entre
  alvo live e espécie histórica. Uma Expedição em andamento exibe
  `Expedição em andamento`, sem descrever erroneamente a ausência de alvo
  de Hunt como erro. O host sintético passou a capturar dez estados CURRENT
  em 235/320/390px e a produzir um aviso WinForms sanitizado caso falhe
  o salvamento final de preferências, após descartar panes e controles.
  As falhas pré-I/O continuam separadas de falhas físicas do Windows;
  aviso visual, UX/live e medição pareada de performance ainda requerem
  seus respectivos gates. A suíte Node agora tem CI próprio e a verificação
  C# isolada roda em Windows CI; nada promove o host normal ou altera
  arquivos de contas/jogo. Evidência em
  `docs/PM_GATE_2026-10-01_CURRENT_VISUAL_PERSISTENCE_V23.md`.

- **Cards — identidade de sessão CURRENT (candidato 0.2.128, após v19):** o
  Analyzer entrega `sessionGeneration` (contador opaco local ao runtime),
  `activityKind`, `startedAtMs` e `endedAtMs`, sem expor UUID, run ID ou
  identificadores de transporte. Cards apresenta `EXPEDITION` quando uma
  Expedição está ativa e distingue a última espécie de Expedição pausada/
  encerrada da última espécie de Hunt. Testes sintéticos cobrem as mudanças
  entre Hunts, Expedições, pausas, término e reset; sem build/publicação em
  `dist/` ou validação live do PO.
- **Cards — retorno à opção A do CURRENT (candidato sintético v19, Better UI
  `0.2.127`):** o PO substituiu a decisão temporária B pela espécie mais
  recente da **sessão CURRENT** do Hunt Analyzer, inclusive entre combates e
  após login, sem consultar History de outras Hunts ou abrir o mapa. O Analyzer
  original `1.15.0` expõe `currentSessionSpecies` bounded/read-only e memoiza
  o seletor por revisão do encontro, mantendo `currentTarget` exclusivo para
  combate realmente ativo. Cards distingue visualmente **ALVO** live de
  **ÚLTIMO DA HUNT** quando exibe só a espécie da sessão; raridade, Shiny,
  nível e tipos sem confirmação live não são inferidos. Sprite da espécie só
  usa a API nativa existente quando há ID autorizado. O host permanece o v17;
  bundle Better UI e Analyzer foram compilados exclusivamente na tupla
  `cwperf002005-current-session-po-0127-v19`, com proveniência das fontes.
  Sem publicação, alteração de `dist/` compartilhado ou validação live feita
  pelo agente.

- **CW-PERF-002/005 — Cards exclusivamente alvo live (candidato sintético v18,
  Better UI `0.2.126`):** o campo ALVO deixou de reter identidade, sprite ou
  faixa de níveis do último combate e do mapa Hunts; usa apenas
  `currentTarget` confirmado pelo Analyzer em status `running` e limpa
  imagem, nome, raridade, Shiny e tipos em terminal/paused/waiting. Sprite
  opcional do metadado de espécie nativa é consultado apenas para o ID live;
  respostas tardias não ressuscitam alvo antigo. Manteve métricas e Story
  da sessão atual, sem usar eventos de Story para escolher o alvo. Novo
  bundle isolado na tupla `cwperf002005-strict-live-po-0126-v18`, host v17
  inalterado. Testes RED→PASS, suite Node, benchmark 13/13, core/close e
  visual sintético 51 PNG passaram; aceite de target live no jogo pertence
  ao PO. Não há publicação nem mudanças no `dist/` normal.

- **CW-PERF-002 — correlação WebView2 Cards/Game (candidato pré-live 0.2.125):**
  o host correlaciona intenções por epoch de navegação, sessão de montagem,
  geração de capabilities e revisão monotônica. Better UI descarta ACKs,
  ações e `set-view` atrasados/repetidos, preserva foco nativo em Game e
  recupera catálogo após indisponibilidade do bridge. O host limita retries
  de envio, só recupera uma navegação cancelada quando prova que o documento
  anterior sobreviveu e mantém ações nativas pendentes descartadas.
  A reinjeção de uma segunda instância do adapter no mesmo documento agora
  encerra a anterior antes de registrar probe/listeners ou capturar o estado
  da toolbar, prevenindo duas instâncias ativas da versão nova. A regressão
  RED→PASS também cobre transferência de foco de um Cards removido para botão
  nativo antes do cleanup. Os smokes do host, suíte Node e 47 capturas
  sintéticas foram verificados no par isolado
  `cwperf002005-view-epoch-po-0125-v16`. O pacote Better UI possui
  `@version 0.2.125`, mantendo o host C# congelado da v14;
  o gate exato e as limitações estão em
  `docs/PM_GATE_2026-10-01_CW-PERF-002_VIEW_CORRELATION.md`.
  Nenhuma publicação ou validação em jogo foi realizada.

- **CW-PERF-002/005 — evidência visual sintética Overflow v17:** o host
  isolado passou a fotografar o popup nativo aberto e sua preservação no
  reorder e fechamento por revogação. A tupla
  `cwperf002005-view-epoch-overflow-po-0125-v17` passou smoke visual com
  51 PNG, revisão visual independente e core isolado; um timeout anterior
  sob execução concorrente foi preservado como falha de teste. Somente a
  fixture C# mudou desde a v16; o bundle Better UI `0.2.125` é idêntico.
  Overflow com teclado/resize/offline e validação no jogo permanecem abertos.

- **CW-PERF-005 e integração sintética 002+005 (candidato pré-live):** o host
  evita Save redundante de workspace/foco e rebuild de Overflow quando a
  assinatura efetiva do menu não muda, preservando refresh visual e retries.
  O `CompleteShutdown` executa limpeza mesmo se o Save lançar exceção.
  Nova fixture isolada valida falhas pré-I/O em Create/Flush/Replace e o Save
  positivo em `FormClosed`, incluindo ratio real atualizado a partir do splitter.
  A tupla combinada `cwperf002005-final-positive-v5` reúne o host 005 e o
  Better UI 002; smokes core/fechamento/visual sintéticos passam. A análise
  detalhada, os hashes e os gaps de protocolo/UX/performance estão em
  `docs/PM_GATE_2026-10-01_CW-PERF-002-005_INTEGRATION.md`. Sem publicação
  ou validação no jogo nesta entrega.

- **CW-PERF-002 — atualização do Cards quando visível (candidato pré-live):**
  o Coupled Workspace suspende a leitura e a apresentação do resumo do Hunt
  Analyzer enquanto Game está ativo; a volta a Cards obtém uma projeção pública
  nova antes da exibição, com indisponibilidade explícita se o resumo estiver
  expirado, ausente ou inválido. O reconciliador central distingue a atualização
  do observador da atualização explícita, preservando Team, Loot, idioma e
  controles nativos. Testes sintéticos cobrem a transição, reentrância,
  lifecycle e histórico integral. O pacote de validação isolado e as limitações
  de protocolo estão em `docs/PM_GATE_2026-10-01_CW-PERF-002.md`. A validação
  no jogo e a promoção continuam dependentes do Product Owner.

- **0.2.124 — remoção completa do Custom Pokéball:**
  por decisão do Product Owner, removidos editor, botão no menu Treinador,
  configuração de módulo, personalização visual das Poké Balls, integração com
  `CaptureSequence`, persistência ativa, PNG embutido e testes exclusivos.
  A captura e as Poké Balls nativas permanecem sob controle do jogo. Preferências
  antigas armazenadas no navegador tornam-se inertes; um próximo save da lista
  de módulos descarta a entrada obsoleta. Demais correções do candidato
  `0.2.123` permanecem. Candidato `0.2.124` aprovado pelo Product Owner em
  2026-09-30 e designado referência funcional para integração na `main`.

- **0.2.123 — correções da auditoria de `src` (candidato pré-live):**
  o Auto Helper restaura sua estrutura e o estado `inert` se a inscrição no Bus
  falhar durante a montagem, permite tentar novamente e salva alterações pela
  API nativa atual após reidratação. Refresh e resync do Perfil Pokémon
  invalidam o cache de golpes. O Coupled Workspace limita a descoberta e a
  execução de ações à toolbar nativa; Hunt/Loot Story atualizam horários
  relativos sem remontar linhas; os tipos permanecem visíveis no Cards
  `textOnly` estreito; o histórico completo atualiza registros incrementalmente.
  Custom Pokéball reconcilia substituições tardias de `CaptureSequence` e usa
  um diálogo modal com gerenciamento de foco e teclado. Testes sintéticos de
  regressão cobrem os casos corrigidos. Validação visual e funcional no jogo
  permanece exclusiva e pendente do Product Owner.

- **0.2.122 — PPTools leader snapshot consistency:** the native attacker reader
  now completes `getTeam()` before requesting the creature list, and performs
  at most one bounded reread when the same identified creature temporarily
  reports an older or newer numeric level in a native enrichment. Both reads
  remain fenced to the originally selected leader and trainer profile, and a
  persistent disagreement still fails closed. Partial same-ID Team/detail
  records may omit redundant identity fields; any supplied conflicting ID,
  species, level or IV still invalidates the read. Null or missing enrichment
  fields cannot overwrite complete HUD facts. Synthetic regressions cover
  delayed Team refresh, transient/persistent mismatches, actual level changes
  and partial records. In-game confirmation remains user-owned.

- **0.2.121 — fechamento do escopo PPTools:** por decisão do Product Owner,
  não incorporar a execução do PPTools ao userscript Tampermonkey. Retirados
  transporte GM, execução em aba auxiliar, permissão de abertura de abas,
  correspondência com o domínio PPTools e adaptação do runner no build.
  Permanecem a consulta do Coupled Workspace opt-in e o botão Search na
  lista nativa de Hunts. A aprovação em jogo da consulta anterior não se
  estende automaticamente à interação Search.

- PPTools Recommendation: o Product Owner aprovou o fluxo de consulta em jogo
  em 2026-09-29 e solicitou uma navegação temporária sem mapa interativo.
  Cada resultado na lista atual de Hunts apresenta **Search**, que preenche o
  campo de busca nativo com o nome da hunt, dispara o evento `input` e coloca
  o foco visível nesse campo. O controle funciona mesmo com a linha filtrada,
  mantém mundo e demais filtros, não clica em Details/Hunt nem inicia gameplay;
  se o mundo mudar durante a leitura assíncrona, o Search aborta. O estado
  informa que a busca foi aplicada sem afirmar que existe uma linha única no
  mundo atual. A alteração Search aguarda nova validação em jogo.

- PPTools one-click: corrigida a exigência indevida de `trainer.exp_buff` após
  amostra nativa de `COPIAR JSON` mostrar que o campo não está no objeto da
  criatura. O PPTools recebe agora o parâmetro neutro de EXP `×1` para a
  simulação, sem tratar um possível percentual nativo como fator multiplicativo.
  `is_starter` ausente usa o padrão `false` do formulário público, enquanto
  valores booleanos nativos explícitos são preservados. A UI informa que bônus
  ativos de EXP/inicial podem não estar refletidos; testes reproduzem o formato
  de um Entei sem armazenar identificadores privados. Validação no jogo pendente.

- **Diagnostic only:** Better UI `0.2.119` replaces the rejected manual PPTools
  JSON export/import UI with one-click **PPTools Recommendation** in Hunt Atlas.
  A dedicated, invisible, InPrivate WebView2 in the opt-in Coupled Workspace
  candidate opens the actual public PPTools Hunt Analyzer and runs its native
  1,000-KO simulation, returning the XP/h-ranked wild Pokémon/hunt Top 3 to
  the originating profile/pane. The host bounds requests, restricts navigation,
  rechecks the native leader/profile before dispatch and delivery, and isolates
  temporary browser data. Both sides discard superseded responses; Locate
  never starts gameplay. Site automation was exercised only with synthetic
  attacker data. Because an archived contract for the game's native COPIAR JSON
  and all trainer/buff/instance fields is unavailable, true attacker input parity
  remains unproven; missing native fields fail closed and Product Owner in-game
  validation is **pending**, so this is not a normal release or host promotion.
  Post-implementation QA now compares six IVs by value regardless of native
  property order; eliminates unused trainer `buffs` from the external payload;
  rejects zero EXP multipliers (invalid under PPTools's public importer); and
  reconstructs the host's outbound JSON from strictly validated allowed fields,
  dropping extras and disallowing disguised string booleans/numbers. Native
  WebView2 initialization, script execution and leader proof have bounded
  deadlines; late native faults and temporary cache cleanup are accounted for.
  A public synthetic simulation and the private-data boundary smoke pass.
  PPTools expects `expBuff` as a factor (`1.5` means 150%); the native game's
  `trainer.exp_buff` unit and exact Shiny/quality interpretation still require
  comparison with actual `COPIAR JSON` data before this candidate is accepted.
  The public-site runner additionally handles Next.js removing the route
  script element after load: a single exact-URL script Resource Timing entry
  can preserve version gating, with fail-closed negatives for altered URLs
  and duplicate requests. Site integration remains pinned to its observed
  build; these resource entries attest requests, not fetched script bytes.

- Product Owner corrected the PPTools Recommendation requirement on 2026-09-29:
  the `0.2.118-r2` manual import/export flow below is a **rejected diagnostic
  implementation** for this feature, not a live candidate for approval. The
  accepted journey is a single click on the current leader in Better UI that
  automatically obtains the PPTools simulation results and renders recommended
  hunt targets. Technical feasibility of the cross-origin execution and exact
  native attacker payload must be proven before a replacement can ship.

- Better UI `0.2.118` binds each manual PPTools leader declaration to the exact
  recommendations JSON present when the user confirms it. Editing/replacing
  that JSON, a mismatch on import, or an invalid payload resets the declaration;
  importing a different PPTools simulation therefore requires fresh explicit
  confirmation. Removed `Localizar` controls cannot act on a newer imported
  query even when the same leader is active, and newer leader events supersede
  earlier pending leader IDs in an A→B→A burst before the native HUD refresh.
  The offline screenshot fixtures now keep the real input field visible after
  import, so narrow Hunt Atlas reviews use representative layout.
  Public PPTools renderer compatibility and game-side behavior remain subject to
  the existing evidence and user validation gates.

- Better UI `0.2.117` restricts PPTools hunt recommendation imports to the
  Pokémon currently marked as the unique authoritative native Team leader.
  The user continues to use the game's existing hover **COPIAR JSON** action,
  pastes that JSON into PPTools, runs the simulation and manually exports its
  Top 3 recommendations. The import requires an explicit user declaration that
  both the PPTools input and these results belong to the displayed leader;
  PPTools does not independently verify the attacker instance. Imported
  recommendations are bound to that leader's instance ID, level and species in
  the current WebView. A leader change, level update, detached HUD, Team/HUD
  disagreement, session invalidation or SPA cleanup discards stale results and
  disables locating. Unrelated Team-member updates preserve the active leader's
  results. The original native copy button, PPTools site, gameplay and normal
  WebView2 host are unchanged. Tests and offline renders precede a separate
  Product Owner in-game acceptance gate.

- Better UI `0.2.116` adds manual PPTools Hunt Analyzer Top 3 import to the
  native Hunt Atlas in map and list modes. A separately installed, site-scoped
  userscript extracts up to three rows from the public PPTools results table
  under a pinned, checked renderer contract; versioned JSON crosses domains
  through the user's clipboard. The Hunt Atlas validates and displays source,
  filter, sort, metrics and timestamp; its optional Locate action resolves
  unique currently available native zones and never starts Hunt automatically.
  Invalid, ambiguous or unavailable destinations fail closed; documentation
  and synthetic verification accompany the isolated candidate. Both the
  PPTools live table and PokePixel in-game workflow await Product Owner
  validation; the normal WebView2 host remains unchanged. The later `0.2.116`
  candidate supersedes the provisional `0.2.115` bundle and includes finalized
  localized status feedback, dynamic accessibility guards and narrow-map layout.

- Better UI `0.2.114` / isolated Coupled Workspace `candidate115` replaces the
  visually rejected narrow Hunt Story two-line miniature table with an
  encounter-first layout. Pokémon/Rarity lead; each Time, Result, Ball,
  Quality, Chance and IV Total value has a visible label. A container-aware
  two-column layout handles widths down to 235px without hiding right-side
  fields. Full Shiny identification and captured genetics remain inline, and
  the wide eight-column table remains unchanged. Synthetic WebView2 evidence
  now tests all eight field rectangles, including captured and Shiny records,
  and produces a dedicated 235px screenshot. Owner live validation is pending.

- Better UI `0.2.113` / isolated Coupled Workspace `candidate114` restore
  the target's visible Rarity and `✦ SHINY` text at narrow Card widths, with
  wrapping that stays within the 200px combat budget. Workspace `Reset layout`
  now applies the reset 100% zoom to both existing WebView2 panes immediately,
  keeping the live views and persisted settings consistent. Focused/full JS
  tests, the host's runtime zoom-reset smoke and isolated host lifecycle smokes
  pass. Independent source QA reports TECH READY and synthetic 1180px visual
  re-gating confirms the compact target badges. High-DPI renders and Owner
  in-game validation remain pending; the normal host is unchanged.

- Better UI `0.2.112` and its isolated Coupled Workspace host candidate add the
  approved post-candidate111 QoLs. Cards now renders all eight canonical Hunt
  Story fields in two labeled lines within narrow panes, increases Team and
  combat meter readability without overflowing the player card, exposes
  scroll-triggered Summary/Economy/Story navigation with focus handoff, replaces
  the result selector with keyboard-operable All/Captured/Failed buttons, and
  copies only available display-authoritative session KPIs with localized
  clipboard status. Standalone Cards preserves its original native Cards/Game
  switch and does not mount host-only section shortcuts. The WinForms host now
  supports seven customizable active-account Game Dock destinations per profile,
  explicit correlated menu-open failure feedback, per-profile 90/100/110/125%
  zoom presets, read-only health/error for both accounts in Maintenance, stable
  online/offline Game Dock geometry and reduced redundant Command Deck status.
  Settings v2 loads valid v1 layouts without losing independent account sessions.
  The candidate remains pending Product Owner in-game validation; no normal host
  promotion or gameplay automation accompanies these QoLs.

- Coupled Workspace WebView2 refreshes its host chrome to Better UI's Game Palette:
  `Segoe UI` body/control typography, flat interactive surfaces, 1px neutral lines,
  gold selected/current and independent 2px cyan focus. The permanent Game Dock
  replaces its passive Active-account caption with direct Rhyxus/Rhyosa account
  buttons in Dual/Focus; Single retains the existing profile selector in the top
  deck. The selected account remains authoritative for Cards/Game and native menu
  routing, while a compact `MENUS OFFLINE` state preserves 1180px one-row geometry
  and capability-based disabling. The host-only change retains distinct WebView2
  sessions, native handlers and per-profile view state; it is pending Product Owner
  in-game validation.

- Better UI `0.2.111` **deprecates and removes the Fast Leader A/B study**,
  including the manual A/B pairing strip, Auto A/B toggle, native reward-driven
  leader changes, XP correlation/telemetry, status UI, lifecycle subscriptions,
  and their experiment-only tests. The ordinary six-member Team roster in Cards
  remains available for explicit manual leader changes via the native API,
  including one pending POST at a time, authoritative Team HUD synchronization,
  supersession protection, keyboard focus, and status feedback. The separate
  study document and exclusive experiment test file were removed; historical
  release entries remain for traceability, and private Evidence Probe records
  are preserved. This removal remains pending Product Owner in-game validation.

- Better UI `0.2.110` fixes a fail-closed Auto A/B button remaining disabled
  when Cards mounts before the game's native `PokeIdle.Bus` is initialized.
  The existing Cards instance now rebinds its native reward/lifecycle listeners
  when a supported Bus becomes available on a subsequent render. Replacing or
  losing an already bound Bus unsubscribes old handlers and fences pending
  automatic leader projections; it never silently re-arms ON or duplicates
  native reward subscriptions. The OFF status and button title now distinguish
  missing Team, invalid A/B, unconfirmed native leader, missing native EXP
  baselines, pending manual/Team HUD synchronization, hunt readiness, account
  identity and native Bus availability. Missing authority still blocks ON.
  The delayed-Bus defect was reproduced by a failing synthetic fixture before
  the fix; the owner's disabled-button report still needs live revalidation.

- Better UI `0.2.109` corrects and instruments Auto A/B after the Product
  Owner reported the real-game `0.2.107` toggle remained ON while the
  selected A gained visible HUD EXP and B received no switch. Prior Cards
  control required a complete numeric `loot.received` payload while its
  separate XP readout was based on Team HUD state. Auto now preserves a
  separate **since ON** EXP baseline and compact diagnostics for native
  signals, actual leader EXP advances and native POST attempts. An eligible
  switch requires explicit recipient-specific positive `loot.received`
  Pokémon EXP correlated (within a bounded window) with a real increase of
  that same member's native Team HUD total. Positive per-kill quantities
  accept the native consumer's numeric-string encoding; rewards can arrive
  before or after the HUD update. Anonymous `hunt.kill_reward`/`hunt.rewards`,
  total-only trainer loot, generic `level.up`, XP share and refreshed Team
  snapshots remain observational and cannot authorize a switch on their own.
  Uncorrelated XP is labeled visibly instead of claiming the toggle acted.
  Native Bus removal/replacement disables or disarms Auto, and all prior
  one-POST, no-queue, OFF, session, leader, account and HUD-sync guards remain.
  The live reward payload/ordering and server cooldown are still unverified;
  owner-only in-game retest is required, with private evidence capture if the
  candidate continues to show XP but zero native switch requests.

- Better UI `0.2.108` removes the Professions HUD completely, including its manual
  selection workflow, supporting read-only rotation helpers, module setting and
  exclusive tests. The native Professions menu remains available.
- Removed the 32px Hunt Analyzer Context Rail from the WebView2 host and its
  separate telemetry relay, summary cache, freshness timer and rail-specific
  tests. The host now uses a three-row Command Deck / panes / Game Dock layout
  in Cards, Game and mixed views. Cards still reads Analyzer metrics locally,
  and the native Hunt Analyzer remains accessible via Game Dock.

- Better UI `0.2.107` adds an explicit OFF-by-default `Auto A/B` switch in
  Cards while retaining the one-click manual leader control. After arming with
  two living Pokémon and an active native hunt, one strictly increasing
  `loot.received` Pokémon EXP total for the current A/B leader schedules at
  most one native `setTeamLeader` POST toward the other member. Rewards for
  other Pokémon, duplicates, potions, zero XP, and rewards arriving during
  a pending switch are ignored without catch-up or automatic retry. ON is
  local to the visible Cards instance and the currently bound account/hunt;
  logout, session/connection changes, KO, native leader overrides, Game mode,
  teardown, failed POST, or HUD timeout disarm it. OFF remains reachable
  during an in-flight POST; an already accepted mutation can still finish
  and native HUD synchronization remains a barrier before another action.
  The switch uses a stable accessible name and focused ON/OFF state, visible
  disarm reasons, localized text, and bounded screen-reader announcements.
  Native reward batches and unverified server cooldown/ordering prevent any
  guarantee that every individual battle alternates its EXP recipient.
  Product Owner in-game Auto A/B validation is pending.

- Better UI `0.2.106` responds to the Product Owner's live rejection of the
  first Fast leader A/B test because Cards lagged too much for the experiment.
  Cards now follows the native Team HUD's **one successful POST** flow instead
  of serializing a second `GET /team` behind it. A preexisting in-flight GET
  can be coalesced and report an old leader even after a valid POST; the native
  API invalidates its recent GET cache on mutation, but not in-flight GETs.
  The visible timing now separates `POST accepted` from native Team HUD
  synchronization, without claiming to measure the server's EXP allocation;
  this HUD timestamp may reflect local native event projection. A delayed B
  response cannot overwrite an intervening native C leader change, including
  C→A ABA, and missing HUD event delivery or a stale HUD exposes a recovery
  explanation rather than claiming success. Team/leader and EXP events refresh
  only the active Cards player and Team roster immediately, bypassing unbounded
  Hunt Story processing rather than waiting for the 1s Analyzer poll. The
  sole Team live announcement remains polite without a duplicate A/B region.
  Unchanged Team roster controls are reused across polling renders. There is
  still one manual POST per click, a shared in-flight lock, an explicit HUD
  leader-flag synchronization guard, no retry or gameplay automation, and
  no WebSocket interception.
  These are source/synthetic corrections, **not** a claim that the actual
  game/server switching or EXP attribution is fast; Product Owner revalidation
  is pending.

- Better UI `0.2.105` introduces an explicit manual **Fast leader A/B** test strip
  in Cards. Two independently identified, living Team Pokémon may be chosen by
  instance ID; a single click alternates between them through the existing native
  leader API and `getTeam` confirmation, with one action in flight. This was
  replaced in `0.2.106` after the Product Owner's delay report. The strip
  exposes native-HUD EXP changes since the pair was selected and the observed
  request/confirmation duration; these readings do not establish which server
  battle boundary allocated a reward. There are no automatic swaps, forced
  cooldown overrides or WebSocket interception. If the server confirms a leader
  before the native HUD reflects it, further Cards switches stay disabled with
  visible feedback until an explicit native leader flag catches up; early events
  cannot release the guard. Synthetic tests cover A→B→A, pending requests,
  rejection, fainted/duplicate selections, external leader changes, keyboard
  focus, stale HUD states and lifecycle. Live EXP behavior and rendered layout
  remain pending Product Owner validation.

- Repository cleanup removes the unused example module and empty placeholders,
  the retired Electron and Dual Edge prototypes, their unused Electron
  extension-mirror build step, and the deprecated `.interface-design` authority
  file. Dead Hunt snapshot `confirmed`/`blocked` state and its update helpers,
  unused internal exports, and a duplicate Analyzer render are removed. Failed
  Hunt starts still clear only the exact remembered snapshot, including when a
  later selection supersedes an in-flight start. Stale design/documentation
  references now point to the active contracts or explicitly historical records.
  Disposable local QA browser profiles, generated Python environments, HTTP
  caches, smoke user-data, scratch previews and logs are cleared. The WebView2
  host, userscript/Analyzer outputs, authored sprite work, source artifacts and
  original/archive evidence required for audit remain intact. Python helper
  `run.ps1` scripts recreate their environments on their next use; removed
  external-page caches require a new download for future research.

- Better UI `0.2.104` simplifies the visible Professions HUD to two manual
  replacement tabs, **Mine** and **Farm**, with exhausted-slot selection,
  searchable reserves, a short selected pair and one continuation action.
  Monitoring summaries, source diagnostics and explanatory paragraphs no longer
  occupy the replacement box. Mine uses a separate native
  `getMiningWorkforce()` read and the same descriptor-only, fail-closed
  worker/candidate checks as the Farm chooser. The selected profession and
  worker identities are rechecked before continuation, and switching tabs
  clears the prior pair. When the optional Workforce Manager `1.3.8` is present,
  the action opens its matching Mine/Farm manual swap UI and fills only the
  verified worker and reserve; final confirmation stays with the player.
  Without that manager, the native menu opens without pretending to carry the
  selection. Better UI does not execute collect/remove/assign or automatically
  rotate Pokémon. Off-game automated checks do not substitute for Product
  Owner in-game validation of the rendered chooser and native integrations.
  Selection changes and panel dismissal invalidate a pending external handoff;
  old responses cannot fill a newer choice or unlock its controls. A stalled
  external opening expires after ten seconds, allowing an explicit retry.
  Unsupported zero-based slots use the honest native-menu fallback; the
  loading state remains visible to assistive technology and handoff feedback
  stays present through refreshes.

- Better UI `0.2.103` responds to the Product Owner's rejection of the
  text-only `0.2.102` Professions popup. The manual Farm guide now offers
  explicit, keyboard-usable selection of exhausted worker slots and distinct
  positive-stamina reserves, a search over the full native candidate set,
  a paired preview with observed efficiency when available, and
  refresh-based identity revalidation. Invalid/duplicated native slots,
  identities or candidate inputs fail closed instead of offering a wrong
  choice. A user-initiated temporary drawer grows to 720px on roomy screens
  with separately scrollable picker columns; small screens keep one column.
  When the user-provided Workforce Manager `1.3.8` is installed, continuation
  opens its existing **manual** Farm swap chooser and, only for an exact
  matching slot/worker/reserve, fills the intended candidate without clicking
  the final Confirm action. Without that optional external script, the
  handoff opens the native Professions menu, explicitly explaining that the
  selection was **not** applied; no fake in-HUD swap is claimed. Better UI
  does not call native collect/remove/assign, does not schedule rotation and
  does not infer authority from a read-only snapshot. The external manual
  manager remains non-atomic and may leave a slot vacant if assign fails;
  actual direct swap within Better UI remains blocked by the separately
  documented native write/eligibility/outcome gates. User-owned actual-game
  UX/visual verification still required.

- Better UI `0.2.102` corrects the Product Owner's actual-game Professions
  discoverability failure: when a safe passive dock does not fit, the visible
  `Prof. HUD` shortcut now opens the **Better UI monitoring panel**, not just the
  native menu. Compact-header Expand uses the same explicitly opened,
  viewport-bounded, scrollable temporary panel. The panel reuses the existing
  worker/stamina/autonomy/manual-guide/diagnostic DOM and last native snapshot,
  closes with its visible `×`, Escape or an outside click, and returns focus to
  the surviving trigger. `Gerenciar` remains a separate, native-only action;
  it may be disabled without disabling read-only monitoring. Passive docking
  still excludes Team and Wallet; only a user-opened transient panel may overlap
  their space, within the native HUD stacking context. No Farm write or
  automatic rotation was added; actual-game panel/Backpack appearance still
  requires Product Owner validation.

- Better UI `0.2.101` fixes keyboard focus getting trapped in a hidden Farm manual guide after an
  invalid refresh or automatic compact docking. Runtime locale changes now
  relabel the Professions HUD, native shortcut, manual instructions and ARIA
  using the last observed snapshot without invoking more game getters. Async
  clipboard rejection also leaves focus where the user moved, announcing a
  localized manual-copy fallback. Added isolated focus/language regressions;
  Farm assignments remain native/manual.

- Added `tools/game-evidence/import-incoming.mjs` to repeatedly validate and
  import user-owned JSONL captures, deduplicate identical SHA-256 exports,
  conservatively exclude conflicting versions of one session, and regenerate
  private observational route/field/status indexes. The 18 existing incoming
  captures reconcile to 11,206 events and 186 routes; the Farm remove request
  has no recorded response, and no Farm assign request was observed. No
  automatic rotation is enabled or inferred from these records.

- Added an isolated, opt-in PokePixel Evidence Probe for user-owned in-game
  research: early document injection in a separate WebView2 executable or
  standalone Tampermonkey userscript; bounded local IndexedDB sessions for UI,
  HTTP, WebSocket/SSE, resource timings, console/errors and navigation with
  redaction and JSONL export. Added offline SHA-256 archiving and endpoint/
  event query tools. The normal Coupled Workspace executable and Better UI
  bundle are unchanged by the optional host build; no gameplay automation.
  Synthetic verification and host smoke are complete, and live capture/visual
  validation is pending the Product Owner. See tools/game-evidence/README.md.

- Recorded the Product Owner's future Farm rotation selection policy: prefer
  higher authoritative efficiency, use higher available stamina as the first
  tie-break, and process multiple exhausted workers in ascending native slot
  order. Exact efficiency+stamina ties and native write-authority gates remain
  unresolved; no executor or automatic gameplay action was enabled.

- Statically audited the older user-provided PokePixel native client transport:
  Farm assign/remove POST endpoints and bodies, the limited Idempotency-Key
  whitelist (Farm writes absent), HTTP 401 auth-refresh replay path, GET-only
  transient retries and raw JSON/error handling. The rotation contract now
  separates these historical client facts from unobserved server write
  guarantees and current-game version parity. No runtime/network changes.

- Added an isolated, read-only Farm before/after snapshot observer to distinguish
  matching replacement, unchanged slot, vacant slot and ambiguous concurrent
  changes. All outcomes explicitly deny write confirmation; no game API call,
  automatic worker rotation or new userscript delivery is involved.

- Reconciled earlier Product Owner Professions JSON diagnostics with the archived
  Workforce Manager `1.3.8` manual Farm-swap source. Getter/argument discovery,
  slot/worker read shapes and the established sequential manual flow are now
  explicitly marked as prior evidence in the rotation contract. Only distinct
  server write-time authority, outcomes, atomicity and concurrency questions
  remain open; the read-only candidate and preflight are unchanged.

- A future Farm zero-stamina rotation preflight has a pure, **unwired** structural
  inspector with conservative diagnostics for active IDs/slots, ambiguous pause
  state and candidate-list integrity. It returns `canMutate:false` in all cases;
  there is no native assign/remove call, background poll, executor or new
  userscript delivery. The native atomic write/concurrency contract remains
  unknown. Documentation and offline tests are tracked in
  `docs/PROFESSIONS_ROTATION_CONTRACT.md`; the `0.2.100 / candidate98` bundle
  remains the current pre-live artifact.

- Better UI `0.2.100` responds to the Product Owner's live report that Professions
  disappeared under the `0.2.99` Wallet-safe docking rule. The monitor now uses
  a four-tier reversible placement sequence: full panel, compact header, 72×40px
  native-level floating `Prof.` tab, or a short `Prof.` control inserted into
  the *visible* native Team controls. Every floating rectangle is separately
  checked against the native Team/Wallet and viewport; no raised overlay is used.
  The short controls delegate only to the original Professions menu and leave
  gameplay APIs, Team drag/collapse and Team→Wallet adjacency untouched.
  User collapse intent and focus are preserved, with automatic full restore
  after a safe resize. Extreme mobile portrait with no legal screen rectangle
  retains the original native Professions menu rather than inserting a hidden
  child into native `display:none` controls. Local targeted tests `44/44`,
  full Better UI `501/501`, build and scoped diff-check PASS. In-game visual
  validation remains with the Product Owner; `0.2.99` was rejected on live
  discoverability despite its earlier green synthetic tests.
  Isolated `candidate98.exe` offline `--smoke` PASS; bundle and extension mirror
  are identical (`1,190,838` bytes, SHA-256
  `9F3EF6C51A739684D8A2FAB913DFFA8B9483D12BA4DC0A87FD1CD25DE1E48DEB`);
  isolated WebView2 candidate is `261,632` bytes, SHA-256
  `935C6DD859C62C7F321555480AA0BD97E26174E48B5FB4DAC8CAC783AF4CB977`.

- Better UI `0.2.99` corrects the Product Owner's follow-up: Backpack now covers Professions,
  but the panel still overlapped the separately positioned native Team **Wallet**.
  A dedicated pure docking planner reserves the visible Wallet rectangle alongside Team
  (8px clearance), validates finite/in-viewport final placements and chooses a clear
  below/above/side position; a smaller body-scrollable band is allowed only when a
  complete coarse-pointer control can fit. Without safe room, the optional panel
  yields to the native surfaces while the native Professions action remains usable.
  Drag-handle pointer motion updates docking through one coalesced animation frame;
  mount/reconcile/cleanup and Wallet/Team adjacency are preserved. The last visible
  header measurement prevents hidden-layout reconciliation oscillation, and focus
  returns to the native action when the optional HUD yields; an impossible
  expand request leaves a keyboard-focusable collapsed header with localized feedback.
  No native Wallet,
  gameplay state or network call is changed.
  The focused Professions suite passes **37/37**, full Better UI **494/494**, build
  and scoped diff-check PASS. The new isolated `candidate97.exe` passes offline
  WebView2 `--smoke` with this bundle. Bundle and extension mirror are byte-identical,
  `1,185,074` bytes, SHA-256 `53878AD3B8E64784969424131A11E13A82608EA4E12450BC67B98E1ECD57D0D2`.
  `candidate97.exe` is `261,632` bytes, SHA-256
  `126AEEECDDA670643585FE198B1AEAC87C5A7CFF622D5FA74504C621574F874D`.
  Native Wallet interaction and hit testing remain pending Product Owner in-game review.

- Better UI `0.2.98` closes the Professions HUD's missing-native-action reconciliation loop:
  the Manage button changes its `disabled` attribute only when native availability actually
  changes, so the shared DOM observer settles rather than scheduling frames indefinitely.
  The existing one-second presentation timer also redocks against native Team HUD style-only
  z-index changes; no additional observer, native API polling or gameplay mutation was added.
  The HUD uses a flex column with a non-shrinking header and a scrollable, min-height-zero body
  so dense workers/diagnostics and 40px coarse-pointer controls stay inside the capped panel.
  Regressions exercise disabled-attribute mutation counts, the actual central observer and
  delayed native stacking updates. The new read-only monitor and Backpack paint order still
  require Product Owner in-game validation.

- The WebView2 offline Card Mode smoke now matches Hunt Story's eight columns, including
  `IV Total` (added in `0.2.95`). Its fixture supplies representative failed/captured
  encounter totals and its handshake check waits within a bounded two-second window for
  both synthetic profiles. The original seven-column assertion caused the recorded
  candidate94 failure; this harness correction does not alter gameplay. The normal host
  and occupied candidate alias are preserved. The separate local `candidate96.exe`
  passes `--smoke` with the `0.2.98` bundle. Full Better UI tests: **484/484 PASS**;
  focused Professions: **27/27 PASS**; build and scoped diff-check PASS.
  Userscript and coupled extension mirror are byte-identical at `1,178,463` bytes,
  SHA-256 `D99EE952CB4E142A5D04383DFEDD35FEB055562CB0521FE0CBDD2CC02AA88976`.
  The isolated `candidate96.exe` is `261,632` bytes, SHA-256
  `3FBC8EF21C5DCC960018AD50852D40E678D58F864692F7EC08FAB8F3A1158C9F`.
  Independent exact-source Technical QA closes **TECH READY** (P0/P1/P2=0,
  P3=1 transient tick/background-throttle caveat). Independent UX/A11y QA
  closes **UX READY** (P0/P1/P2/P3=0): offline Edge headless previews with 30 worker
  rows and expanded diagnostics keep the last Copy button scroll-reachable at
  240/280/340px, including a forced 40px coarse-pointer layout; rendered Professions/Backpack
  placement remains `VISUAL EVIDENCE INSUFFICIENT` until the Product Owner checks it.

- Better UI `0.2.97` corrects the Product Owner's live **Professions HUD / Backpack stacking** regression.
  Previously the Professions panel was appended to `body` with `z-index:2147480400`, leaving it above
  Backpack even when native Team HUD was behind that window. The panel now shares Team HUD's native
  parent/stacking context, is inserted **before** Team HUD, mirrors the authoritative computed Team
  z-index and remains interactive under native `pointer-events:none` HUD containers. Native Team HUD
  → wallet adjacent-sibling styling, drag docking, parent reattachment and cleanup remain intact.
  Product Owner live verification of Backpack overlap/host transforms and responsive layout is required;
  synthetic DOM tests do not establish pixel-level stacking correctness.

  The Product Owner's diagnostic v2 also confirmed the existing worker API signatures:
  `assignProfessionWorker(professionId,creatureId,slotIndex)`,
  `unassignProfessionWorker(professionId,slotIndex)`,
  `assignFarmWorker(creatureId,slotIndex)`, `removeFarmWorker(slotIndex)`,
  `assignMiningWorker(creatureId,slotIndex)` and `removeMiningWorker(slotIndex)`.
  Generic farmer/miner slot snapshots contain `status`, `seconds_remaining`, `recovery_*`, `slot_index`,
  `profession_id` and `creature_id`; these generic fields are not a substitute for Farm's authoritative
  `stamina_basis`. A refreshed synthetic fixture checks all public argument orders and still invokes
  **no** gameplay mutation. Automatic rotation stays disabled until response/error semantics,
  eligibility/override policy and server-verified final state are specified.

  Exact local `0.2.97` verification: Professions `24/24 PASS`, full Better UI `481/481 PASS`,
  build/scoped diff-check PASS. Userscript and coupled extension mirror are byte-identical at
  `1,178,321` bytes, SHA-256
  `6CDDDD1B063F29B812623647C6DEC77DB93A38FF39ECD2CF9BDB82EF3918FCF9`. The change has not
  yet been independently Tech/UX re-gated; native Backpack-overlap painting remains Product Owner
  live-only validation. Do not equate passing synthetic stack assertions with a visual gate.
  The separate offline candidate94 host smoke currently exits 1 on an existing Cards / Hunt Story
  `cards-dual-1600-left` geometry-data assertion (`labelsReady:false`, `singleLineReady:false`), not
  a Professions stacking assertion; it has not been remediated within this scoped corrective.

- Better UI `0.2.96` adds the first native-contract **Professions HUD** monitoring candidate. The active
  screen HUD reads the verified `getProfessions`, `getStamina`, `getFarmWorkforce` and
  `getFishingState` endpoints without periodic API polling. From the Product Owner's observed Farm
  workforce contract it now shows occupancy, ready-reserve count and per-worker name, level,
  `stamina_basis` as percentage, explicit exhausted/paused state and a presentation-only local autonomy
  countdown derived from `active_seconds/endurance_seconds`. `stamina_basis === 0` is the only
  exhaustion trigger; the countdown never drives rotation decisions.

  A pure rotation assessment identifies exhausted workers and deduplicated positive-stamina reserves,
  fails closed when active worker identity is incomplete, and deliberately selects no replacement winner.
  No assign/remove API is called in this candidate. Contract diagnostic v2 remains privacy-bounded and
  now exposes descriptor-safe farmer/fisher/miner slot samples plus public assign/remove function
  arity/parameter names without invoking accessors or gameplay methods. The project-wide blanket
  prohibition on gameplay automation was removed by Product Owner direction; future automation is now
  allowed only within explicit feature scope while preserving authoritative game permissions/state,
  bounded failure/retry behavior and user control.

  Exact-current validation is **21/21 PASS** for Professions and **478/478 PASS** for the full Better UI
  suite; build and scoped `git diff --check` PASS. Independent gates close **TECH READY** and **UX READY**;
  Visual Regression remains **VISUAL EVIDENCE INSUFFICIENT** because no representative render exists for
  the new Farm worker rows. The `0.2.96` userscript and coupled extension mirror are byte-identical at
  `1,177,973` bytes, SHA-256
  `2DFDCB967E215B6019DEE7508A17836082F3124AED664FBB8AF7B064A8B82956`. Product Owner live validation
  remains required for placement/wrapping/density and to return Diagnostic v2 for mutation-contract closure.

- Better UI `0.2.95` adds an **IV Total** direct-read column to Hunt Story. Hunt Analyzer `1.13.6`
  now carries the already-authoritative terminal encounter `ivTotal` (bounded 0–186) for both captured
  and failed attempts through its existing protocol-v1 public summary. Failed rows do not expose
  captured-only gender, nature or individual IV stats. Better UI sanitizes the scalar again at its
  boundary, renders unavailable/invalid values as `—`, and keeps all eight Hunt Story fields in one
  horizontal row with local scrolling in narrow `1:2` / `2:1` panes.

  Analyzer validation is **453/453 PASS**, production build/release verification PASS; its standalone
  userscript and coupled embed are byte-identical at `1529448` bytes, SHA-256
  `0131E53D542949D84E4677736CF3A50FF90573EF10407866ACE3AA4DA2A8EE60`. Better UI Card/Coupled focused
  validation is **70/70 PASS**, full Better UI is **457/457 PASS**, and syntax/build/`git diff --check`
  PASS. The `0.2.95` userscript and extension mirror are byte-identical at `1131335` bytes, SHA-256
  `141397FA4757392CDB57B510B13C562CAE6EA07FC8CEEE0D1ACBC69E01A4C14D`.

- Better UI `0.2.94` is a standalone/Tampermonkey Card Mode corrective. The generated userscript now
  declares the same explicit page-world bridge used by the Hunt Analyzer (`@sandbox raw` plus
  `@grant unsafeWindow`) and standalone Card Mode resolves that page window before reading native
  `PokeIdle` or the Analyzer public summary. This closes the synthetic-vs-Tampermonkey gap where DOM
  ownership could mount while page-owned runtime globals remained outside the userscript world.

  In Game mode, the `Cards | Game` selector no longer becomes a child of `.pokeidle-top-toolbar`.
  Appending it there increased the native `width:max-content` toolbar and could push the navigation
  surface into the game's independent server selector. The selector now owns a dedicated body-level
  dock centered on the current toolbar, placed below a top toolbar (or above a bottom toolbar), clamped
  to viewport margins, and remeasured on resize/native toolbar replacement. Cards mode still keeps the
  selector inside the textual Cards surface and keyboard focus is preserved while it moves.

  Standalone/Coupled/Menu/Foundation affected validation is **95/95 PASS** and full Better UI is
  **457/457 PASS**; build, syntax and `git diff --check` PASS. A direct execution smoke of the generated
  `0.2.94` userscript verifies standalone Cards mounts, reads the Analyzer summary, switches back to
  Game and keeps the selector outside native toolbar ownership. The unchanged WebView2 `candidate94`
  still passes both forced-shutdown lifecycle smokes with the `0.2.94` bundle. Its normal visual-evidence
  smoke is not used as an acceptance gate for this standalone-only delta: exact-current reruns exposed
  two intermittent host-harness timing failures (History scroll positioning, then bridge/Analyzer
  fixture settlement) while no C# or coupled-owned runtime changed. Product Owner validation in the
  actual Tampermonkey runtime remains pending. Final `0.2.94` bundle and archived extension mirror are
  byte-identical at `1130792` bytes, SHA-256
  `282603BACA5310F792D1CA3D4B18535B54714C52C5444A3683C6687DA06FD926`.

- Better UI `0.2.93` is the post-live Card Mode corrective from the Product Owner's 2026-09-27
  review. The Active Pokémon card now renders the four currently selected moves from the native
  `getMoveset` contract using the existing game move-icon mapping and refreshes after
  `moveset.saved` without writing gameplay state. Target no longer repeats encounter XP; it keeps
  only the useful authoritative identity/combat context already available to Cards (name, level,
  rarity, Shiny, elements and native art). At the wide screenshot layout, Target now shares the
  right-hand grid bounds with Captured / Seen for predictable cropping.

  Loot Story rarity filtering now recognizes native inventory metadata both at the outer item
  entry and the nested `item` object, including explicit localized pt-BR rarity labels; the smoke
  now changes the filter to Rare and proves only Rare item chips remain instead of checking only
  that the selector exists. Hunt Story no longer switches its seven direct-read fields to a
  two-row responsive grid in `1:2` / `2:1`: rows stay one line and the narrow pane owns horizontal
  scrolling, while the Hunt table remains bounded to roughly six entries. Fresh synthetic visual
  evidence includes dedicated Hunt Story captures for both asymmetric layouts.

  Exact-current Card Mode/Coupled validation is **68/68 PASS**, affected-suite validation is
  **170/170 PASS**, and full Better UI validation is **455/455 PASS**. Build, syntax check and
  `git diff --check` PASS. Better UI `0.2.93` bundle and archived Electron extension mirror are
  byte-identical at `1127312` bytes, SHA-256
  `E75399C22C62C6385153C2441B7772C45114F26E5B184949DDE222D7A07FC29E`.
  Exact WebView2 validation host `candidate94` is `261120` bytes, SHA-256
  `8737FCAB9DE0D9BFE986D46C58F612C52C15E8A9992BFFF8B30C3E77E75F8E79`; the `candidate.exe` alias is
  byte-identical. Normal, close-during-init and close-during-switch smokes all PASS with empty
  stderr. Hunt Analyzer remains `1.13.5`, embed `1529301` bytes / SHA-256
  `BF81D945D852F1FC3B628CA099A47AC2A177EEC1995335DE5D798E9515C1C841`; the promoted normal host
  remains untouched at `146944` bytes / SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`. Independent exact-current
  re-gates close **TECH READY**, **UX/A11Y READY** and **VISUAL READY**, all with
  `P0=0 P1=0 P2=0 P3=0`. Live in-game validation remains Product Owner-owned.

- Better UI `0.2.92` closes the remaining Card Mode Loot Story/A11y corrective before Product Owner
  handoff. Loot Story now renders each row aggregate as an explicit visible `Total <value>` and exposes
  the same name/value through `aria-label`; the formerly bare currency value no longer depends on
  column inference. The Hunt console, special-history rarity description and Shiny-filter help also
  follow the active game locale instead of mixing hard-coded English accessibility copy into pt-BR.

  Exact-current Card Mode/Coupled validation is **67/67 PASS** and full Better UI validation is
  **454/454 PASS**; build and `git diff --check` PASS. Better UI `0.2.92` bundle and archived Electron
  extension mirror are byte-identical at `1123776` bytes, SHA-256
  `7026FE5F27929B1E2399180A89EFFAE6977AE774080926E3AA6B2BB32E6F0D2F`.
  Exact WebView2 validation host `candidate93` is `253440` bytes, SHA-256
  `49E8E7A9A948197FF5BD1EFFE969A558EDB5C2B1C8865F4C7F122B629846471E`; the `candidate.exe` alias is
  byte-identical. Normal, close-during-init and close-during-switch smokes all exit `0` with empty
  stderr, and the normal smoke now requires the visible/accessibly named Loot total and regenerates the
  exact-current Overview, Hunt Story and Loot Story composites. Hunt Analyzer remains `1.13.5`,
  embed `1529301` bytes / SHA-256
  `BF81D945D852F1FC3B628CA099A47AC2A177EEC1995335DE5D798E9515C1C841`; the promoted normal host
  remains untouched at `146944` bytes / SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`. Independent exact-current
  Technical QA independently closes **TECH READY**, including an independent focused **67/67 PASS**,
  while UX/A11y and Visual Regression QA independently close **UX/A11Y READY** and **VISUAL READY**.
  All three exact-current gates report `P0=0 P1=0 P2=0 P3=0`. Product Owner in-game visual/functional
  validation remains pending.

- Better UI `0.2.91` supersedes the candidate91 handoff with the final Card Mode readability and
  lifecycle corrective. Hunt Story now keeps explicit visible labels for all seven direct-read fields
  (`Time`, `Rarity`, `Pokémon`, `Quality`, `Result`, `Ball`, `Chance`) at desktop and narrow widths,
  keeps the Chance cell inside the local scroll viewport, renders unavailable values as `—`, and uses
  the existing Shiny `✦` cue consistently. The Cards lifecycle now marks its dashboard disposed before
  cleanup, prevents queued native species/inventory reads from starting after teardown, ignores late
  Analyzer/Team async settlements, removes captured sprite-error handlers and makes captured filters/
  Story-tab handlers inert after cleanup.

  Exact-current affected-suite validation is **169/169 PASS**; full Better UI validation is
  **454/454 PASS**; build and `git diff --check` PASS. Independent Technical QA re-gated the exact
  current source/artifacts as **TECH READY**, `P0=0 P1=0 P2=0 P3=0`, including an independent focused
  **67/67 PASS**. Final Better UI `0.2.91` bundle and archived Electron extension mirror are
  byte-identical at `1123279` bytes, SHA-256
  `9514967BADFC75482AE15D1924E0DD98A3D7B5AA46096C11F3C3158D581244F5`.
  Exact WebView2 validation host `candidate92` is `252928` bytes, SHA-256
  `8367EF5A46649EF1DBFFA5CC38D55DB7142AC5933D869B2DB0715DD651200F67`; the `candidate.exe` alias is
  byte-identical. Normal, close-during-init and close-during-switch local smokes were executed with
  process completion awaited and all exit `0` with empty stderr; normal stdout ends in
  `WebView2 coupled workspace smoke: PASS` and regenerated exact-current Overview, Hunt Story and Loot
  Story composites. Hunt Analyzer remains `1.13.5`, embed `1529301` bytes / SHA-256
  `BF81D945D852F1FC3B628CA099A47AC2A177EEC1995335DE5D798E9515C1C841`. The promoted normal host
  remains unchanged at `146944` bytes / SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`. Independent exact-current
  UX/A11y and Visual Regression re-gates close **UX/A11Y READY** and **VISUAL READY** with
  `P0=0 P1=0 P2=0 P3=0`. Product Owner in-game visual/functional validation remains pending.

- Better UI `0.2.90` revises Card Mode hunt-data UX from Product Owner live feedback. Overview order is now
  **Hunt summary → Capture → Captured / Seen**, and the user-facing Unknown rarity tile is gone.
  Target identity now comes directly from the Analyzer `currentTarget` and native species metadata,
  so opening Hunts/Atlas is no longer required; matching remembered Hunt-zone art is optional
  enrichment. The Team rail clears a transient `Team indisponível` once the six-member runtime
  hydrates and no longer depends on one specific HUD DOM instance for active identity.

  Hunt Story now shows Pokémon identity/native art, Rarity, continuous Quality, result, Ball/Chance
  and captured genetics inline instead of hiding genetics behind a row disclosure. Loot Story now
  names its financial metrics, lists realized item drops with quantity and provides an item-rarity
  filter. The Analyzer protocol-1 public summary was extended additively with bounded special-history
  `speciesId`/`qualityMultiplier` and realized loot `itemId`/`qty`; item name/rarity is enriched only
  from read-only native game metadata and remains explicitly unclassified when unavailable. Exact-current
  affected-suite validation is **164/164 PASS**. Better UI full validation is **449/449 PASS**, build and
  `git diff --check` PASS. Hunt Analyzer `1.13.5` validates **453/453 PASS** and its rebuilt PROD/embed
  bundle is `1529301` bytes, SHA-256
  `BF81D945D852F1FC3B628CA099A47AC2A177EEC1995335DE5D798E9515C1C841`.

  Final Better UI `0.2.90` bundle is `1118192` bytes, SHA-256
  `D0675105383F8B8569194AA81EAE0E95859845465EBF25154CE4892435E61C89`; the archived Electron
  extension mirror is byte-identical again, preserving the documented compatibility build contract.
  Exact WebView2 validation host `candidate91` is `251392` bytes, SHA-256
  `189CB4D8C58A57A174135AB3DDC3730BB1483CB8C2D4C3FBC864E45A6637A8B8`. Its normal smoke
  asserts the corrected Card/Hunt/Loot contract, including seven visible rarity buckets, Analyzer-first
  target art, inline Quality/genetics and item-rarity Loot Story, and captures a dedicated Loot Story
  composite. Normal, close-during-init and close-during-switch synthetic smokes were executed with
  process completion awaited and all exit `0`; normal stdout ends in `WebView2 coupled workspace smoke: PASS`.
  Candidate91 was superseded before Product Owner handoff after exact-current local review exposed
  Hunt Story Chance clipping at Dual/1180 and remaining lifecycle/metadata retry gaps; those findings
  are closed by the `0.2.91` / candidate92 corrective above. The promoted normal host
  remains unchanged at `146944` bytes / SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.

- Lifecycle hardening closes the second stale-ownership audit across Auto Helper,
  Card Mode, Pokémon Profile and Saved Teams. Auto Helper cleanup can no longer
  reopen over a newer mount; the standalone `Cards | Game` switch follows a
  reconstructed native toolbar; coupled capabilities now retry after timeout or
  rejection, supersede in-flight state changes, and renegotiate a formerly accepted
  signature after fallback. Cards ignores late async settlements, captured filters/tabs,
  and queued native species/inventory metadata reads after cleanup. Profile Configure/Saved Moveset actions and Saved Team
  HUD/manager/composer controls are inert once their owner is disposed, including
  native Team/moveset and persistent-store writers.

  The menu fixture now models all 33 public destinations directly. The root test command
  remains `node --test`. Root builds keep `dist/pokepixel-better-ui.user.js` and the documented
  archived Electron extension mirror byte-identical; the active WebView2 host keeps reading
  `dist` directly. At the candidate89 checkpoint, focused affected suites were **160/160 PASS**,
  the full suite was **444/444 PASS**, and build plus `git diff --check` passed. Final `0.2.88` bundle:
  `1108699` bytes, SHA-256
  `98E0D36CCCE5B398A83B61C1335943E721C0102661F0EFBB066ECB548C7BC592`. Exact validation host
  `candidate89` was rebuilt from the current WebView2 source at `246272` bytes, SHA-256
  `61C5B454367B7AE7DAC3C1A0A0D726647387F2CB137FDF76B7A2290937C65118`. Its normal,
  close-during-init and close-during-switch local smokes all exit `0` with empty stderr. The
  promoted normal host remains unchanged at `146944` bytes / SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.

- Better UI `0.2.88` includes the standalone **Card Mode** in the distributable userscript/extension
  artifact. Outside the coupled WebView2 host, Better UI exposes a direct `Cards | Game` switch and
  starts in Cards, but Cards is now an **exclusive textual mode rather than an overlay over the live
  game**. While Cards is active the native visual surface leaves layout/paint, other Better UI visual
  modules are unmounted, Pokémon/target sprite and canvas extraction is skipped, Element icons and
  graphical HP/EXP rails are omitted, and only the textual Hunt surface plus Analyzer-owned data
  remains. Game restores the native surface and normal Better UI modules. The switch is inside the
  Cards document surface, then moves into the native toolbar in Game, so it no longer floats over the
  server-switch control. Native Hunt/game logic remains authoritative and running; Card Mode does not
  pause or reimplement gameplay just to manufacture a RAM number.

  The standalone mode consumes the Analyzer public summary when available (including late availability
  without remounting) and switches to Game before native menu actions while preserving their original
  handlers. Moving the `Cards | Game` switch between those surfaces preserves keyboard focus on the
  activated switch control. The standalone module remains disabled inside the coupled host so host
  ownership and persistence contracts are unchanged. Standalone Card Mode tests are **7/7 PASS**,
  the focused Mark’s Shop suite is **25/25 PASS**, focused Profile is **26/26 PASS**, the combined
  exact-current focused run is **58/58 PASS**, the full Better UI suite is **442/442 PASS**, and
  build/diff-check PASS.
  The generated `dist/pokepixel-better-ui.user.js` and extension copy are byte-identical at
  `1106184` bytes, SHA-256
  `CD097A8C3F7A26C1E2A6CDD7DD1C4FFECD97E12C90A9E59EF4A016FF2996BCEE`, with
  `@version 0.2.88`; the unpacked extension manifest is also aligned to `0.2.88`.
  Validation host `candidate88` is `246272` bytes / SHA-256
  `F4AD084ECD2D460430EA0D0E9C12D97AB1EAD0CF0BD14F0FE1C888B2B182DD31`, intentionally
  byte-identical to candidate87 because no C# change belongs to this delivery; normal,
  close-during-init and close-during-switch smokes all exit `0` against the current bundle. The
  normal host remains untouched at `146944` bytes / SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.
  Representative local Chrome renders of the actual standalone bundle cover wide and narrow Cards
  surfaces. The narrow render constrains the rendered Cards/body surface to `420px`; measured
  `scrollWidth` remains `420px`, the battle pair is `408px` wide, and the `Cards | Game` switch ends
  at `414px`, confirming that the responsive surface itself has no horizontal overflow. Narrow Team
  action/status copy now stacks inside the existing compact header so `TROCAR POKÉMON` and
  `Team indisponível` remain fully readable at 420px. Independent visual re-gate is **VISUAL READY**
  with **P0/P1/P2/P3 = 0/0/0/0**.

- Mark’s Shop Groups in `0.2.88` now scales to large Pokémon inventories instead of compressing
  every species header into the visible list height. The Pokémon list uses `max-content` grid
  tracks so the native list scrolls; expanded species bodies are bounded to `min(360px,50vh)`
  with contained vertical scroll. Group selection validation now reuses one visible-creature
  snapshot per sync rather than refiltering the entire inventory once per species. Synthetic
  browser QA with 360 Pokémon / 18 species measured list `340px client / 1198px scroll`, an
  expanded group body `361px client / 1418px scroll`, `overflow-y:auto`, and no document-level
  horizontal overflow.

- Pokémon Profile move typography is explicitly normalized for cross-browser rendering: the Profile
  and native move surfaces declare their font family, size and line-height instead of leaving move
  text to browser inheritance, with text-size adjustment fixed where supported. Local browser
  measurements on Edge `154.0.4258.37`, Chrome `153.0.8010.53` and Zen `1.22b`
  (Gecko/Firefox `155.0`) all resolve move names to `12px/16px`, position to `12px/12px` and
  Category/Cooldown/Power to `10px/10px`; Zen differs only by normal sub-pixel/layout distribution,
  not a larger computed font. Standalone Firefox was not installed on the validation machine and is
  therefore not claimed as executed. Focused Pokémon Profile validation is **26/26 PASS**.

- Better UI `0.2.87` supersedes the `0.2.86` Hunt History presentation after Product Owner
  validation found that removing the Result filter and making every event vertically taller degraded
  UI/UX. Cards now uses one **Story** card with `Hunt Story | Loot Story` tabs. Hunt Story is the
  default, restores `All / Captured / Failed`, keeps Rarity and Shiny filters, and returns normal
  desktop rows to a dense 28px minimum. Captured Gender/Nature/IV detail is collapsed by default
  behind an accessible disclosure instead of permanently increasing every captured row; narrow
  panes reflow the same data without document-level horizontal overflow.

  Loot Story consumes the Analyzer-owned additive `lootHistory` contract and shows canonical
  per-encounter Direct Gold, loot sell value, realized Pokémon auto-sell and recomputed total value.
  It deliberately does **not** infer item names or quantities. `lootHistory`, like the existing
  current-target/history projections, remains page-local and is stripped before the native host
  scalar relay.

  Validation: coupled-workspace **48/48 PASS**, full Better UI **430/430 PASS**, build PASS and
  `git diff --check` PASS apart from the repository's known LF/CRLF warnings. The embedded Hunt
  Analyzer is `1.13.4` with **452/452 PASS**, build/verify PASS and SHA-256
  `109AC0721F897950BD71CEB40E474A8853641E121E5E6408E052CD0EDC0C4772`. Exact Better UI
  userscript: `1097233` bytes, SHA-256
  `621003531D2E104DDA6C153AF46958CCEBD3ABB412E72B72E47CF98C91948F81`, header
  `@version 0.2.87`. Validation host `candidate87` is `246272` bytes, SHA-256
  `F4AD084ECD2D460430EA0D0E9C12D97AB1EAD0CF0BD14F0FE1C888B2B182DD31`; normal,
  close-during-init and close-during-switch smokes all exit `0`. The normal host remains
  untouched at SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.

- Better UI `0.2.86` replaces the coupled Cards **Hunt History** desktop six-column table with
  one compact chronological timeline at every width. Each attempt keeps its full shareable facts
  in three narrow bands — Time/Rarity/Result, Pokémon/Chance and Ball — while captured encounters
  retain the inline Gender/Nature/IV detail row. The redundant Result filter and table header are
  removed; Rarity multi-select and Shiny filtering remain, and captured/failed outcome stays
  visible and semantic on every event without splitting chronology into separate panels.

  Local screenshot-oriented QA at `420px` and `760px` reports no document-level horizontal
  overflow, with the History timeline fitting inside the Cards surface and the legacy Result
  selector/header absent. Focused coupled-workspace verification is `48/48 PASS`; full regression
  is `430/430 PASS`, build PASS and `git diff --check` PASS apart from the repository's known
  LF/CRLF warnings. Exact userscript: `1086433` bytes, SHA-256
  `B54CDA87611A75BF0CEA891B3C08D4265FA8D9D676FF7703526B29A9EEA8F1FF`, header
  `@version 0.2.86`. Validation host `candidate86` is `240640` bytes, SHA-256
  `5B31589262FB86F7E6E410CED9E2A79E262F6CA4D7028FA333F562B8290B8503`; normal,
  close-during-init and close-during-switch smokes all exit `0`. The normal host remains
  untouched.

- Better UI `0.2.85` simplifies the coupled **Cards** hunt header after the Product Owner moved
  capture configuration fully into Auto-Helper. Cards no longer renders or reads the former
  `Auto Ball` and `Heal Potion` controls, so opening/reconciling Cards does not query inventory or
  Hunt settings on their behalf and cannot write either preference. The old central `YOU / TYPE`
  block is also removed: it was only a simplified bidirectional STAB/type comparison and explicitly
  ignored moves and combat stats, so it no longer occupies space between the active Pokémon and the
  Hunt target.

  `Trocar Pokémon` is now a compact six-row roster immediately **left of the active Pokémon card**.
  Every occupied row shows Pokémon name + `Lv.`; the authoritative current leader has an explicit
  selected state, fainted members remain visible but disabled, and Teams with fewer than six members
  keep empty rows so the battle header geometry stays stable. Selecting another row still delegates
  to the existing native `setTeamLeader` flow and reports success only after `getTeam()` verifies the
  resulting `leader_id`. The <=200px battle-height contract is retained and the host visual smoke is
  updated to reject the removed controls/midpoint while requiring the six-row roster ordering.
  Focused coupled-workspace verification is `48/48 PASS`; full regression is `430/430 PASS`, build
  PASS and `git diff --check` PASS apart from the repository's known LF/CRLF warnings. Exact
  userscript: `1088883` bytes, SHA-256
  `103CD26966B14A8854FD33B8992C5CF5A04FF0D6545606653C8554BC0B6E739D`, header
  `@version 0.2.85`. Validation host `candidate85` is `241152` bytes, SHA-256
  `524537A005247580F6EFA6FC885D6B8DEE9323E5EF598C268B4FF32C8DA7B220`; normal,
  close-during-init and close-during-switch smokes all exit `0`.

- Better UI `0.2.84` applies the Product Owner's exact exported **Pokémon Profile Playground**
  contract and redesigns Auto-Helper **Poké Balls by Rarity** to use the same decision model as
  Pokémon Destination. Profile now freezes the requested `760px / Game Palette / Squared` baseline,
  `108px` search cards, `136px` move minimum, `44px` Power column, `4px` move-meta gap, `580px`
  hover design value, exact object orders and the exported `2x5` Search placement
  (`name → sprite → Elements → Rarity → Level` in column 1). The 0.2.83 readability hierarchy and
  single-edge Element composition remain; only values that the exported PO preset explicitly
  supersedes are restored. Playground smoke now asserts every supplied alpha, palette, size, order
  and grid line after Reset so that preset drift fails QA.

  Auto-Helper no longer presents Poké Ball routing as separate ball cards containing repeated rarity
  checkboxes. Better UI hides that native presentation reversibly and projects one matrix with
  **rarities as rows** and **Normal fallback + available Poké Balls as columns**. Each row remains
  exclusive, the full selected cell receives the semantic selected treatment, column headers show
  native item icon/name/stock, unassigned rarities explicitly fall back to the Normal capture ball,
  and Shiny remains owned by the existing independent Shiny picker. A selected ball that runs out of
  stock remains visible and disabled instead of silently changing the assignment; inventory refresh
  is read-only. Unknown/future `capsule_by_quality` entries are preserved, and unrelated Better UI
  saves omit that nested map unless the new matrix itself was edited, preventing a stale UI snapshot
  from overwriting newer native capture settings. Original native rarity controls remain intact and
  are restored on cleanup. Focused verification is `17/17 PASS` for Auto-Helper and `25/25 PASS` for
  Pokémon Profile; full regression is `430/430 PASS`, build PASS, exact Playground preset smoke PASS,
  and `git diff --check` PASS apart from the repository's known LF/CRLF warnings. Exact userscript:
  `1105254` bytes, SHA-256
  `FF219938776884B15FD909907E93CF322C43E48BE5CA4D3A38888003632F6CC2`, header
  `@version 0.2.84`. Validation host `candidate84` is `240640` bytes, SHA-256
  `7155500ACA4FA24D5EB7EE78EC24BAF9F460CF82F093CAC66E423E3751FB9219`; normal,
  close-during-init and close-during-switch smokes all exit `0`. `candidate82`, `candidate83` and the
  normal host remain untouched at their previously frozen hashes.

- Better UI `0.2.83` refines **Pokémon Profile** after Product Owner live comparison against the
  native Daily Expeditions window. The Profile keeps the approved Game Palette, current game
  typography and global `Squared`/`Rounded` geometry, but removes the dense "box inside box" visual
  hierarchy that made the module read like tooling instead of game UI. Current Moves, Saved
  Movesets and Teams now use one clear outer section card with a header divider, while move rows,
  fact cells, saved rows and team rows rely on surface contrast instead of another complete outline.
  Unselected Pokémon picker cards are likewise separated by surface/background; only the selected
  Pokémon receives the semantic gold outline. The same corrective fixes the live Element-chip
  double-edge composition: Profile wrappers are layout-only (`border:0`) and the shared
  `.ppbui-element-icon` owns the single semantic `1px` edge at an exact `20px` box, including explicit
  min-size overrides so the shared `24px` minimum can no longer overflow the Profile wrapper. Move
  metadata also compacts to `20 / minmax(26) / minmax(14) / 42px` and the four-card rail baseline to
  `128px`, allowing all four moves to fit the normal Profile width without an unnecessary horizontal
  scrollbar while retaining local scrolling in narrow panes. No gameplay action ownership or native
  handlers changed. Focused Pokémon Profile verification is `25/25 PASS`; full regression is
  `428/428 PASS`, build PASS and `git diff --check` PASS apart from the repository's known LF/CRLF
  warnings. The refreshed Playground smoke passes with hostile `2px` host pressure resolving to
  `0px` wrapper / `1px` exact `20px` shared icon, and visual renders were reviewed at `760px`
  Squared/Rounded plus `420px` Squared. Exact userscript: `1094688` bytes, SHA-256
  `9F1E6F17D4D23D5266B9F94C2EF21B4F2E47301B3D1C79AFD3F4151C9235AC59`, header
  `@version 0.2.83`. Validation host `candidate83` is `240640` bytes, SHA-256
  `19AD8D154C67AE3FBCE7B7AD462548610565861E03C8F8FDD83C982E11CE127A`; normal,
  close-during-init and close-during-switch smokes all exit `0`. `candidate82` remains untouched at
  SHA-256 `A666C4CE4BAFECD79818C9DD9CD8D22E10576AE0F21E83FBD7C32173AE2D832A`, and the normal host remains
  untouched at SHA-256 `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.

- Host `candidate82` removes the Hunt Analyzer Context Rail hover tooltip requested during Product
  Owner live validation. The compact bottom-rail values remain unchanged and the full descriptive
  string remains in `AccessibleName` for assistive technology, but the WinForms `ToolTip` association
  is no longer created for either Analyzer rail label. Smoke coverage now asserts that the visible
  Analyzer rail has an empty tooltip while preserving its normal data text. Better UI remains
  `0.2.82`; this is a host-only corrective. Candidate82 is `240640` bytes, SHA-256
  `A666C4CE4BAFECD79818C9DD9CD8D22E10576AE0F21E83FBD7C32173AE2D832A`; normal,
  close-during-init and close-during-switch smokes all exit `0`.

- Better UI `0.2.82` corrects the Product Owner's live **Trade** regression in coupled split `1:1`.
  The previous responsive contract still sized the Trade window from `100vw` as a content box and
  switched the whole workflow to one vertical column below `679px`. In a split pane that could make
  the window itself wider than the usable pane and stack received offer, own offer and inventory into
  an impractically tall primary flow. Trade now sizes as a border-box against its actual containing
  pane (`width/max-width:100%`, `min-width:0`) instead of the global viewport, and its shell/sections
  explicitly allow intrinsic shrinking. At split widths up to `959px`, the two native offer panels
  remain side by side, each native offer grid compacts from five to four `56px` slots per row, and the
  native inventory spans the complete row below them. Only genuinely narrow Trade containers at
  `519px` or less fall back to one semantic column; at `339px` or less the offer grid compacts to four
  slots again. Original Trade actions, inventory nodes, filters and handlers remain native-owned.
  Focused Trade + Pokémon Tools verification is `18/18 PASS`; full regression is `428/428 PASS` and
  `git diff --check` passes with only the repository's known LF/CRLF warnings. Browser measurements
  after the correction show no document-level horizontal overflow at viewport widths
  `760/620/580/540/500/460px`; at representative `580px` split width the shell is `529px` with two
  `259.5px` offer columns and a `529px` inventory row, with all primary Trade regions reachable by
  vertical flow instead of horizontal clipping. Exact userscript: `1089269` bytes, SHA-256
  `A4603FF247488FEB45B5845CE1540457490781C97987D5AA157A5DDA98C7E634`, header
  `@version 0.2.82`. Validation host candidate81 is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate80 because the corrective is userscript-only. Normal,
  close-during-init and close-during-switch smokes all exit `0`; normal host remains untouched at
  `146944` bytes / SHA-256 `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.
  Product Owner live validation in an actual `1:1` coupled pane remains the acceptance gate.

- Better UI `0.2.81` corrects the all-menu bottom-toolbar regression found during Product Owner live
  validation of `0.2.80`. The live **City** popup could render near a different trigger as a tall
  single-column list, and the same failure affected the other grouped menus. The root cause was
  twofold: grouped dropdowns still depended on the host's evolving downward-only popup shell, and
  the previous Shop-only upward override left a physical gap/bridge mismatch. Every opted-in menu
  group now owns its positioning context and a dedicated `.ppbui-menu-popup` upward shell while
  preserving the original native action nodes and listeners. Popups are centered on their own
  trigger, touch it at `bottom:100%` with no dead hover gap, use a deterministic compact three-column
  Game Palette grid, neutralize the host downward pseudo-shell, and are bounded to the viewport with
  vertical scrolling when necessary. Critical anchor/layout properties are also mounted inline with
  `!important` so late host positioning rules cannot detach the popup from its group. Native `hidden`
  actions remain hidden, keyboard navigation/Escape focus restoration stay intact, and cleanup
  restores the exact native DOM. A hostile `766x360` browser regression forces groups to `static`,
  dropdowns to fixed/downward/single-column layout and removes viewport bounds; the corrected City
  and Player popups remain centered (`centerDelta=0`), upward, contiguous with the trigger and wholly
  accessible. Menu Bar + Module Controls focused verification is `32/32 PASS`; full regression is
  `428/428 PASS`; build and diff-check PASS. Exact userscript: `1088476` bytes, SHA-256
  `910F31A8A5DD14963AFD4DA9FED5A6CCD152D0608D9811740ACBE670A3C70B8B`, header
  `@version 0.2.81`. Validation host candidate80 is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate79 because this corrective is JS/CSS-only. Normal,
  close-during-init and close-during-switch smokes all exit `0`. Normal host remains untouched at
  `146944` bytes / SHA-256 `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.
  Product Owner live validation of the grouped menus remains the acceptance gate.

- Better UI `0.2.80` corrects the live-only regression where the **Better UI** preferences panel could
  still open downward even though the 0.2.79 local fixture showed it above the bottom toolbar. The
  preferences panel no longer carries the host `.pokeidle-top-toolbar__dropdown` class, so current or
  future native `top`/transform/media rules cannot treat project-owned preferences as a game-menu
  dropdown. `.ppbui-module-panel.ppbui-panel` now owns its grid, spacing and Game Palette presentation,
  while its physical anchor is fixed directly on the mounted element with `!important` position,
  `inset`, left/right, top/bottom and transform values. A new regression injects late hostile native
  `top`, `inset` and transform `!important` rules and proves the panel remains independently anchored
  upward; Menu Bar + Module Controls focused verification is `31/31 PASS`, full regression is
  `427/427 PASS`, and build/diff-check PASS. A fresh local bottom-toolbar render using the current
  native toolbar CSS plus an additional hostile positioning rule measures the Better UI panel exactly
  `4px` above its trigger with zero right-edge delta in both `Squared` and `Rounded`; Shop remains
  `4px` above and centered. Exact userscript: `1083242` bytes, SHA-256
  `DB4DB1EA5F7CF9B02F5FE8C7E730EC52D708A0EC8B975D5B273869F6BE27B38F`, header
  `@version 0.2.80`. Validation host candidate79 is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate78 because this corrective is JS/CSS-only. Normal,
  close-during-init and close-during-switch smokes all exit `0`. Normal host remains untouched at
  `146944` bytes / SHA-256 `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.
  Product Owner live validation of the Better UI popup direction remains the acceptance gate.

- Better UI `0.2.79` closes the Product Owner's bottom-toolbar and corner-mode corrective. The
  **Better UI** preferences panel now owns a group-local absolute anchor and opens upward above its
  trigger; the grouped **Shop** dropdown likewise owns its positioned mode, is centered on the Shop
  trigger, and opens upward instead of drifting to the left edge. Escape from a grouped menu restores
  keyboard focus to its trigger. **Aparência → Cantos** now presents the exclusive choices
  `Squared` and `Rounded`: Squared resolves all Better UI structural radius tokens to `0px`, while
  Rounded applies the 8px/5px/4px window/control/badge geometry consistently across opted-in toolbar
  chrome, Coupled Cards, Pokémon Profile/native card augmentation, Custom Pokéball controls, Team,
  Saved Teams/Movesets and Auto Helper. Actual circular Pokéball artwork remains an artwork exception.
  Full regression is `427/427 PASS`; build and diff-check PASS. Exact userscript: `1082829` bytes,
  SHA-256 `3D28629660B246186F43BBB7643F8DF4BA1EB0366EE2373CA56AA72F642812AC`, header
  `@version 0.2.79`. Validation host candidate78 is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate77 because this corrective is JS/CSS-only. Normal,
  close-during-init and close-during-switch smokes all exit `0`. Normal host remains untouched at
  `146944` bytes / SHA-256 `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.
  Exact-current **TECH/ARCH**, **UX/A11y** and fresh render-first **VISUAL** gates are all **READY**
  with `P0=P1=P2=P3=0`. Visual QA confirms Shop opens 4px above and exactly centered on its trigger,
  Better UI preferences opens 4px above with its right edge aligned to its trigger, and the real
  Appearance select switches the same surfaces exclusively between Squared and Rounded geometry.
  Subsequent Product Owner live validation found that the Better UI preferences panel could still
  open downward in the real game; that live regression supersedes the local direction conclusion
  above and is corrected by `0.2.80` without redefining the already-presented 0.2.79 bytes.

- Better UI `0.2.78` promotes the Product Owner-approved **Game Palette** from Pokémon Profile to the
  complete Better UI design system. Neutral chrome now has four project-wide roles: Window
  `#161D20` at `92%` alpha, Interactive `#232C2E` at `96%`, Values `#161D20` at `85%`, and opaque
  `#6B6543` structural lines fixed at `1px`. Existing Pokémon Type/Rarity, selected/focus,
  success/danger/Shiny and other gameplay semantics remain independent and opaque. The former
  project-wide pixel-art chrome is retired: body/controls now use the game's
  `Inter, "Segoe UI", Arial, sans-serif` stack; game-style display titles use
  `Cinzel, Georgia, serif`; pixel inset shadows and broad semantic-tinted surfaces are removed.
  Sprite/domain pixel rendering and illustrated Pokéball geometry remain artwork rather than UI
  chrome. A new persistent **Better UI → Aparência → Cantos** preference exposes `0px` (migration
  default) and `Rounded`; Rounded follows the locally verified game geometry of 8px windows, 5px
  controls/cards and 4px badges. The preference is scoped only to Better UI-owned surfaces and no
  longer forces corner geometry onto the host game. Coupled Cards was migrated explicitly because it
  previously carried its own palette. The final UX corrective removes the remaining inset/pixel-depth
  chrome, moves the remaining Better UI-owned window/dialog titles onto the shared display stack, and
  uses dedicated readable semantic text tokens while preserving the original semantic edge/fill colors.
  Pokémon Tools `More Filters` also inherits the global `Cantos` radius while retaining its scoped
  protection against hostile native field chrome, so Rounded is no longer bypassed by an inline 0px.
  Full regression is `426/426 PASS`; build PASS. Exact userscript: `1079658` bytes, SHA-256
  `7F701B01FE25F13AED1C8037CEF4F6CC2BB3A83105B2A2247BCD4BD9A7ACFD69`, header
  `@version 0.2.78`. Validation host candidate77 is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate76 because this is a JS/CSS-only release. Normal, close-during-init and
  close-during-switch smokes all exit `0`. Normal host remains untouched at `146944` bytes / SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`. Independent exact-current
  **TECH/ARCH**, **UX/A11y** and render-first **VISUAL** gates are all **READY** with
  `P0=P1=P2=P3=0`. Final local visual evidence covers Module Controls/Aparência, Pokémon Profile,
  Custom Pokéball, Inventory, Team/Team HUD, Hunts and Pokémon Tools in both `0px` and `Rounded`;
  Coupled Cards has no local visual harness and remains covered by source/test/TECH/UX validation.

- Better UI `0.2.77` replaces the two requested Player-menu icon presentations with repository-owned
  PNG assets. **Pokémon Profile** now uses `assets/menu-poke-profile-icon.png` and **Custom Pokéball**
  uses `assets/menu-custom-pokeball-icon.png`, both rendered through the native
  `img.pokeidle-top-toolbar__icon` geometry with decorative `alt=""` / `aria-hidden="true"` semantics.
  The PNGs are embedded as data URLs by the existing self-contained userscript build path, while the
  direct-source `/assets/...` values remain fallback-only. Menu IDs, grouping, labels, click handlers
  and gameplay behavior are unchanged; the old generated Custom Pokéball SVG/vector icon is no longer
  its menu icon. Focused Profile + Custom Pokéball verification is `31/31 PASS`; full Better UI suite
  is `420/420 PASS`; syntax, build and scoped diff-check PASS. Read-only exact-current visual gate is
  **READY, P0=P1=P2=P3=0**: both 512×512 PNGs render centered without distortion in the native icon
  slot and the Custom Pokéball vector presentation is absent. Exact userscript: `1087375` bytes,
  SHA-256 `3E4FE83D7FAAFF673FF8E917B8742020E5A167E2AEBF6BA20387B963DF493442`, header
  `@version 0.2.77`. Validation host candidate76 is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate75 because this delta is JS-only. Normal, close-during-init and
  close-during-switch smokes all exit `0`. Normal host remains untouched at `146944` bytes / SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.

- Better UI `0.2.76` compacts the game's native **PokémonCard** after the Product Owner reported
  top-row wrapping and duplicated highlights. `ACTIVE` and `PROTECTED` remain native badges but are
  presented as compact accessible icons; promoted Total Power is reduced to a lightning icon plus
  the exact rendered value while its full label remains in title/ARIA. On pinned/sheet cards the
  existing native `EQUIP / LOCK / CHAT` action container is moved intact directly below the badge
  row, preserving the original button nodes/handlers, and the exact-creature **Profile** action is
  appended there. The duplicate `TOTAL IV` and `RARITY` highlight cells are hidden; the exact native
  IV total is instead shown beside `BATTLE STATS` as `· IV n/186`. Transient hover remains read-only,
  no replacement card/hover is reintroduced, and cleanup returns native actions/status/highlights to
  their original state. The Product Owner-approved Game Palette is now promoted with `#161D20`
  Window/Value surfaces, `#232C2E` Interactive surfaces, `#6B6543` opaque `1px` lines and
  independent surface alpha of Window `92%`, Interactive `96%` and Values `85%`; type/rarity
  semantic colors remain native. Search stays `108px`, Hero and Current Moves use the Interactive
  surface, and the native card is capped to its available parent width so the 340px layout no longer
  clips its right edge while 420/760 remain unchanged. Focused Profile is `24/24 PASS`; full Better
  UI suite is `420/420 PASS`; build and diff-check PASS; final visual re-gate is **READY,
  P0=P1=P2=P3=0**. Exact userscript:
  `1001837` bytes, SHA-256 `11C2CB82C189F7573B0A1AA24736445C32463D2C9B416DC7380E28F57EEBF928`,
  header `@version 0.2.76`. Validation host candidate75 is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate74 because no C# host delta belongs to this corrective. Normal,
  close-during-init and close-during-switch smokes all exit `0`. Normal host remains untouched at
  `146944` bytes / SHA-256 `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.

- Better UI `0.2.75` corrects the grouped **Shop** menu direction in the game menu bar. The
  Shop dropdown is now anchored above its trigger (`bottom:100%`, `top:auto`) and its transition
  starts next to the trigger before moving upward into the open position. The override is scoped
  only to the Better UI `shop` group; the original Premium/Pack/Gacha action nodes, keyboard
  navigation, native handlers and every other menu group keep their existing ownership and
  positioning. Menu Bar focused verification is `20/20 PASS`; the full Better UI suite is
  `416/416 PASS`; build and diff-check PASS. Exact userscript: `988054` bytes, SHA-256
  `DCB011BBD37DE5852CF511880FD3715B0A12D01AEA3A7D1196B6CDDCD53293E1`, header
  `@version 0.2.75`. Validation host candidate74 is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate73 because no C# host delta belongs to this corrective. Normal,
  close-during-init and close-during-switch smokes all exit `0` with empty stdout/stderr.
  Independent TECH/ARCH, UX/A11y and render-first VISUAL gates are all **READY** with
  `P0=P1=P2=P3=0`.

- Better UI `0.2.74` restores the game's standard `PokeIdle.PokemonCard` as the authoritative
  Pokémon hover/card surface instead of maintaining a Better UI replacement hover. The native
  renderer is delegated exactly once and the same `.pokemon-card--hover/.pokemon-card--pinned/
  .pokemon-card--sheet` node is enhanced reversibly: the native SALE cell is hidden, the exact
  rendered Total Power value moves into the Level/Rarity badge row aligned to the right, and the
  four current moves are added in a compact 2×2 section using the existing native move-icon map.
  Native pinned/sheet action rows gain one **Profile** action beside Equip/Lock/Chat, opening the
  exact `creatureId`; the transient hover remains read-only and all native hover pointer/focus
  listeners remain authoritative. Cleanup restores hidden cells and the wrapped renderer only
  while still owned, and a captured stale wrapper is inert after cleanup. Focused Profile:
  `20/20 PASS`; Profile + Team + Team Movesets + Team HUD: `69/69 PASS`; full suite:
  `416/416 PASS`; build and diff-check PASS. Exact userscript: `987571` bytes, SHA-256
  `A15BBF9B858A41CEDCC0453DB6BD289D4234F6F9B4F00D26EDB22775A255EB0D`, header
  `@version 0.2.74`. Validation host candidate73 is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate72 because no C# host delta belongs to this corrective. Normal,
  close-during-init and close-during-switch smokes all exit `0` with empty stdout/stderr.
  Normal host remains untouched at `146944` bytes / SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.
  Independent TECH/ARCH, UX/A11y and render-first VISUAL gates are all **READY** with
  `P0=P1=P2=P3=0`.

- Better UI `0.2.73` corrects the selected-Pokémon command layout in Full Team. The native
  **Configure moves** button, native **Active/Activate** control and native battle-order group
  `#N ← →` now occupy an explicit shared grid row below the selected Pokémon identity, so native
  DOM ordering can no longer auto-place those controls onto separate rows. Configure moves remains
  the game's existing `PokeIdle.MovesetConfig.open(creatureId)` flow for the exact selected
  creature; Better UI does not add a Team-specific moves editor, modal or replacement handler.
  Local representative renders at 480px and the supported 340px minimum both show the complete
  command group on one row with Vitals/Stats below. Team + Team HUD + Team Movesets regression is
  `49/49 PASS`; the exact 0.2.73 full suite is `415/415 PASS`; build and diff-check PASS.
  Exact userscript: `985971` bytes, SHA-256
  `E35BA14575D322FDB8B0214E0E952F656B55A839E0DAD2ADD636E28190D5A738`, header
  `@version 0.2.73`. Validation host candidate72 is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate71 because no C# host delta belongs to this corrective. Normal,
  close-during-init and close-during-switch smokes all exit `0` with empty stdout/stderr.
  The normal host remains untouched at `146944` bytes / SHA-256
  `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F`.
  Independent TECH/ARCH, UX/A11y and render-first VISUAL gates are all **READY** with
  `P0=P1=P2=P3=0`.

- Better UI `0.2.72` returns Backpack categories to a compact dropdown immediately left of Search.
  Current native category tabs remain the authority: Better UI mirrors their labels/selection into a
  reversible proxy select and delegates every category change to the original tab handler instead of
  reimplementing filtering. The visible native tab strip is hidden only while the module is mounted
  and restored on cleanup. Native-select variants are moved to the same left-of-Search position and
  restored to their original DOM position on cleanup. Inventory focused suite: `28/28 PASS`; full
  suite: `415/415 PASS`; build PASS. Exact userscript: `985705` bytes, SHA-256
  `48C1E54DBEBA6C4103D16577CE7842D545D4D47CF8D11D668FCEF521DD655205`, version `0.2.72`.
  Validation host candidate71 is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate70 because no C# change belongs to this corrective. Normal,
  close-during-init and close-during-switch smokes all PASS with exit `0` and empty stderr.

- Better UI `0.2.71` promotes the Product Owner-approved Pokémon Profile Playground layout into
  production. Search/List cards are now `108px` with the approved `2×4` composition and Rarity as
  a real sibling of Elements; Current/Saved/Hover move metadata is ordered
  `Element → Phys/Spec/Status → Cooldown → PW`. Profile/Hover now use the approved Obsidian
  soft-line treatment, with subtle box/background contrast and fewer nested borders. Horizontal
  move rails remain explicit `1→4`, fill the complete available box width, and use
  `scrollbar-gutter:auto` so desktop does not reserve an empty strip while narrow layouts keep
  local focusable horizontal scrolling. Focused Profile + Team-Movesets: `31/31 PASS`; full suite:
  `414/414 PASS`; build PASS. Exact userscript: `982232` bytes, SHA-256
  `2B2721C39C53B2BC2C76FEE88D0FAC92DFA7B4AB1A17E5CC8BE806050F560AA9`, version `0.2.71`.
  Validation host candidate70 is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate69 because no C# change belongs to this promotion. Normal,
  close-during-init and close-during-switch smokes all PASS with exit `0` and empty stderr.
  Final independent TECH/ARCH, UX/A11y and VISUAL gates are READY with `P0=P1=P2=P3=0`.

- Better UI 0.2.70 applies the finalized dossier move-card treatment to the contextual Pokémon hover.
  Current Moves now reuses the same renderer and authoritative metadata fallback: Element icon,
  explicit Phys/Spec/Status, fixed-width PW XXX (44px), numeric Cooldown and ordered 1→4 cards.
  Hover width is capped at 580px; narrower viewports keep overflow inside the focusable move rail
  instead of compressing metadata. Pokémon aggregate Power in the hover header remains Power N;
  PW is move-specific. Focused Profile + Team-Movesets: 31/31 PASS; full suite: 414/414 PASS;
  build/diff-check PASS. Exact userscript: 981354 bytes, SHA-256
  87B22ED120CC1FBEB0E1D92725C2AC02142EB3E5C184A3DA89F829843F8525B7, version 0.2.70.
  Validation host candidate69 is 240640 bytes / SHA-256
  C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD, intentionally byte-identical
  to candidate68 because no C# change belongs to this corrective. Normal, close-during-init and
  close-during-switch smokes all PASS with exit 0 and empty stderr.

- Better UI `0.2.69` closes the Product Owner's final Pokémon Profile micro-corrective on top of
  `0.2.68/candidate67`. Search/List cards no longer render IV and are reduced from `128px` to
  `116px` normalized width while preserving Sprite, Name, Element(s), Rarity and Level. Current and
  Saved move cards now render Power as a compact bordered `PW XXX` token with a fixed `44px` width;
  metadata columns are rebalanced to `22px / minmax(30px,1fr) / 44px / minmax(22px,auto)` and move
  card minimum width is `136px`, preserving full `Phys/Spec/Status`, numeric Cooldown and horizontal
  `1→2→3→4` rails. Accessibility continues to expose full `Power <value>` and
  `Cooldown <value>s` labels rather than the compact visual abbreviations. Focused Profile +
  Team-Movesets verification is `31/31 PASS`; full suite `414/414 PASS`; build and diff-check PASS
  (line-ending warnings only). Independent TECH/ARCH, UX/A11y and render-first VISUAL gates are all
  **READY**, `P0=P1=P2=P3=0`. Exact userscript: `981996` bytes, SHA-256
  `838A4F84CD7F6F606609247A12B8A45DBCEDD8F4C3D597A434386CF8D6D9C223`, header
  `@version 0.2.69`. Validation host `PokePixelCoupledWorkspace.candidate68.exe` is `240640`
  bytes / SHA-256 `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`,
  intentionally byte-identical to candidate67 because no C# change belongs to this corrective.
  close-during-init and close-during-switch smokes PASS with exit `0` and empty stderr. Normal smoke
  showed one isolated timeout during the first cold run, then passed on retry; an immediate parity run
  using both byte-identical candidate67 and candidate68 against the same current dist also passed for
  both with empty stderr, supporting WebView2/harness startup flakiness rather than a Profile regression.
  candidate67 is superseded for this Profile validation; normal-host promotion and Git history remain
  separate and unauthorized.

- Better UI `0.2.68` closes the latest Pokémon Profile hierarchy/readability corrective without
  changing the dedicated-Profile architecture. Search/List cards are normalized to
  `[Sprite] → Name → [Element][Element] [Rarity] → Lv. - IV`, with Quality removed and unavailable
  rarity rendered fail-closed as `—` instead of fabricated `Common`. The selected Pokémon now
  renders each Element as a bordered icon plus plain name, exposes `Rarity` rather than a multiplier,
  and gives Gender a non-Element semantic tone (cyan male, salmon female, muted unknown). Current and
  Saved move rails remain horizontal `1→2→3→4`; `Phys/Spec/Status` stays explicit, while Power and
  Cooldown render numeric values only with semantic title/ARIA labels. Power uses Miyazaki ivory and
  Cooldown the neutral muted/steel treatment. The final move-card geometry reserves enough width for
  the complete `Status` label and keeps narrow overflow local to the focusable rails. Focused
  Profile + Team-Movesets verification is `31/31 PASS`; full suite `414/414 PASS`; build and
  diff-check PASS (line-ending warnings only). Independent TECH/ARCH, UX/A11y and render-first VISUAL
  gates are all **READY**, `P0=P1=P2=P3=0`. Exact userscript: `982022` bytes, SHA-256
  `4987131954AA5D835CEAAC120A0E6E16D9736C1FC8D59260D3A3A045C324F328`, header
  `@version 0.2.68`. Validation host `PokePixelCoupledWorkspace.candidate67.exe` is `240640`
  bytes / SHA-256 `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`,
  intentionally byte-identical to candidate66 because no C# change belongs to this corrective. Normal,
  close-during-init and close-during-switch smokes all PASS with exit `0` and empty stderr.
  candidate66 is superseded for this Profile validation; normal-host promotion and Git history remain
  separate and unauthorized.

- Better UI `0.2.67` closes the Product Owner's follow-up visual/usability rejection of
  `0.2.66/candidate64`. The dedicated **Pokémon Profile** now reuses the game's existing Pokémon
  identity grammar instead of text-only dossier treatments: owned picker cards and the hero consume
  canonical sprites, Element colors/icons and quality badges; raw Team/Backpack creature snapshots
  are species-enriched before picker rendering so native inventory payloads that omit sprite metadata
  do not degrade to text initials. Current and Saved move rails remain horizontal `1→2→3→4`, but
  each move now adds the native move icon, Element identity and authoritative `PWR`; when the moveset
  payload omits Power, Profile reads native `PokemonCardData.loadDetail()` metadata and also covers
  saved-only move IDs rather than inventing values. **Configure Moves** is a real exact-`creatureId`
  editor backed by the existing fresh-revision/available/final-reread `applyTeamMoveset` writer, so
  Backpack Pokémon do not require a fake Team-bound button. Saved Movesets and Teams using this
  Pokémon have independent accessible collapse controls with per-creature in-session state. Team
  remains a normal management surface; its existing native Edit Moves / Active-or-Activate / `#N` /
  order-arrow controls now read as one aligned workspace at desktop and 340px without replacing
  handlers or disabled states. Focused Profile/Team/Team-Movesets verification is `49/49 PASS`; full
  suite is `413/413 PASS`; build PASS; diff-check exits `0` with only existing line-ending warnings.
  Independent TECH/ARCH, UX/A11y and render-first VISUAL gates are all **READY** with
  `P0=P1=P2=P3=0`. Exact userscript: `972808` bytes, SHA-256
  `BA880C4BC407E530063407B577E0F76906F037902B4244B617CBA25C6830883E`. Validation host
  `PokePixelCoupledWorkspace.candidate65.exe` is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate64 because no host C# change belongs to this corrective. Normal,
  close-during-init and close-during-switch smokes all PASS with exit `0` and empty stderr.
  `candidate64` is superseded for promotion; Product Owner live validation, Git history and normal-host
  promotion remain separate gates.

- Post-0.2.65 live corrective: Product Owner kept the dedicated `Pokémon Profile` direction but
  rejected vertical move presentation and requested richer discovery. Current Moves, every Saved
  Moveset and the compact hover now read as horizontal `1→2→3→4` rails. Normal width shows all four
  cards; narrow 340px keeps the same horizontal sequence in a local scroll rail with minimum card
  width rather than collapsing to vertical/2×2 or breaking move names. The Profile selector now
  combines source + name search with always-visible Rarity, Element, Min Level, Max Level and Tags
  filters. It reuses `matchesPokemon`, `tagService` and fixed trainer-scoped personal tags from the
  existing Pokémon Tools contract; rarity/element option catalogs are centralized in the shared
  model instead of copied independently. The follow-up accessibility
  hardening makes each narrow move rail a named/focusable `ppbui-scroll` region so keyboard users
  can reach the local horizontal overflow; invalid level-range values clear the applied bound and
  expose `aria-invalid` instead of silently retaining an older hidden range. Independent TECH/UX
  and render-first VISUAL gates are all READY with `P0=P1=P2=P3=0`. The corrective is frozen as
  **Better UI 0.2.66**: full `408/408 PASS`, build PASS, diff-check exit0 with existing line-ending
  warnings; userscript `953762` bytes, SHA-256
  `6F2230B70EBC36F2396F9535EE91472E74825772780D8E6390766A225276C2FE`. Validation host
  `PokePixelCoupledWorkspace.candidate64.exe` is `240640` bytes / SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, intentionally
  byte-identical to candidate63 to avoid unrelated C# drift; all three lifecycle smokes PASS with
  exit `0` and empty stderr. candidate63 below remains superseded for promotion. A later Product Owner
  live pass also superseded candidate64 for promotion and is addressed by the 0.2.67 corrective above.
  Git history and promotion remain separate gates.

- Better UI `0.2.65` **moves the Pokémon dossier out of Team**. Full Team is restored to
  normal formation management with Vitals/Stats and native actions; a new independent
  `Pokémon Profile` menu/window owns the selected Pokémon subject, Team+Backpack selector,
  linear ordered Current Moves `1–4`, exact-creature Saved Movesets and exact-creature Saved
  Teams participation. The replacement owned-Pokémon hover removes SALE, keeps Power inline,
  shows Current Moves `1–4` and exposes `Abrir dossiê`; interception is scoped to known owned
  contexts and fails closed for unrelated Trade/NPC creature-id surfaces. Profile reuses the
  canonical Team Preset/Moveset stores. The corrective accessibility pass keeps selector choices
  as native buttons, preserves focus through Current Moves Retry, keeps the hover open while its
  CTA owns keyboard focus, and restores contextual focus on X/Escape with Profile-launcher
  fallback. Focused relevant tests are `64/64 PASS`; the full suite is `407/407 PASS`, build PASS
  and diff-check exits 0 with existing line-ending warnings. Independent TECH / UX-A11y /
  render-first VISUAL gates are all READY with `P0=P1=P2=P3=0`. Exact userscript:
  `946788` bytes, SHA-256 `EDD901556C769DDE15B9930C63CBCBCFA280F322A6F4F832AB9408F54CA0836C`.
  Validation host `PokePixelCoupledWorkspace.candidate63.exe` is `240640` bytes, SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, byte-identical to the
  previously gated host line so unrelated C# drift is not introduced. Normal, close-during-init
  and close-during-switch smokes all PASS with exit `0` and empty stderr. 0.2.64/candidate62 below
  remain historical Team-dossier evidence; Product Owner live validation, Git history and
  promotion remain separate gates.

- Better UI 0.2.64 is a **Team dossier readability/layout corrective pass** driven by
  Product Owner live feedback that the 0.2.63 information set was sufficient but the page
  did not scan or read well. The normal Full Team width moves from 480px to 560px while the
  340px minimum remains supported; the six-slot roster is visually attached to the dossier,
  the identity hero gains a larger 104px portrait and stronger subject heading, and the native
  commands read as one contextual toolbar. Current Moveset keeps the strongest 2px surface and
  receives larger 36px 2x2 move cells. Saved Movesets become flat editorial rows with lighter
  separators and a two-column name/moves composition at normal width; participating Saved Teams
  become lighter context rows instead of a second card manager. Legacy-order warnings now own a
  wrapping second line so they cannot collapse the Saved Team name. Functional ownership,
  exact-creature semantics, native handlers, async isolation, cleanup and one-scroll-owner
  contracts are unchanged. Exact local acceptance is closed on the `0.2.64` bundle (`945418`
  bytes, SHA-256 `217FFDA0122E2E6419ED87E86C771369B7446966F7868B40AE4B5F918D1ACD38`): full suite
  `394/394 PASS`, build PASS, diff-check clean apart from existing line-ending warnings, and
  independent TECH / UX-A11y / render-first Visual gates are all READY with `P0=P1=P2=P3=0`.
  Validation host `PokePixelCoupledWorkspace.candidate62.exe` is byte-identical to candidate60/61
  (`240640` bytes, SHA-256 `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`)
  and passes normal / close-during-init / close-during-switch smokes. Live promotion and Git history
  remain separate Product Owner gates.

- Better UI `0.2.63` reworks the **full Team window into a selected-Pokémon dossier**.
  The six native Team slots remain intact as compact navigation while the selected Pokémon owns
  the primary profile surface: native identity/Level/Element/quality, HP/state, the original Team
  command nodes, an authoritative Current Moveset block, exact-creature Saved Movesets and a
  read-only projection of Saved Teams containing that exact `creatureId`. Team Presets v2 remains
  the sole formation source and the existing full Saved Teams manager remains the editing/apply/
  delete/reorder surface. Current Moveset now exposes reserved loading geometry, local error + Retry
  and explicit empty state without hiding the native editor. The dossier keeps stable-reconcile,
  native-refresh/cleanup and async-selection isolation, uses 6×1 roster navigation normally and
  3×2 at the 340px minimum, and preserves one Team-body vertical scroll owner with no horizontal
  primary-workflow overflow. Local render evidence covers populated 480px/340px, empty, read-error,
  keyboard-focus and constrained-height scroll states; Product Owner live validation remains a
  separate gate.
  The first independent acceptance pass found and corrected two lifecycle/accessibility gaps before
  live promotion: Team cleanup is now scoped to native roster slots so it cannot strip shared card
  classes owned by Team Presets, and Saved Movesets keeps keyboard focus on persistent polite status
  targets when Retry/Apply/Update rerenders replace their triggering controls. Current/Saved Moveset
  subsection labels now expose `h3` semantics. The corrected repository suite is `394/394 PASS`.
  Exact local acceptance is closed on the final `0.2.63` bundle (`944768` bytes, SHA-256
  `15721E23B8B7EC82C890F26700818197D254ECCEA2E32658C9C58B7D6C483077`): independent TECH,
  UX/A11y and render-first Visual gates are all READY with `P0=P1=P2=P3=0`. Live Product Owner
  validation, promotion and Git history remain separate gates.

- Coupled Workspace `Cards | Game` is now **owned per profile/pane instead of globally**.
  The single host selector targets only the active account, changing Active merely refreshes
  the selector state, and native Game Dock actions switch only their active target to Game.
  Divergent views survive Swap, Focus/Restore, Single/Dual lifecycle and pane recovery through
  backward-compatible per-profile workspace persistence. The host Analyzer Context Rail is
  filtered to visible profiles that are actually in Game, so a Cards pane does not regain the
  duplicated compact analytics just because the other pane remains in Game. The corrected host
  is frozen as **candidate60**, SHA-256
  `C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`, `240640` bytes.
  Exact candidate60 normal / close-during-init / close-during-switch smokes all exit `0`;
  Better UI remains byte-identical at `0.2.62`, focused Coupled tests are **48/48 PASS**,
  full suite **388/388 PASS**, build **PASS** and `git diff --check` has no whitespace errors.

- Team gains additive **Saved Movesets per individual Pokémon**. Full Team reuses the
  game's native MovesetConfig editor while Better UI can save the currently selected
  ordered move set as a named local preset, apply/update/delete presets through the native
  getMoveset / revisioned saveMoveset contract, and verify the authoritative final state
  before reporting success. Presets are keyed by creature instance ID, duplicate loadouts
  on one creature are rejected, and matching Team slots expose an M# marker identifying
  the active saved preset without inventing a second gameplay state. The implementation is
  lifecycle-safe across Team profile replacement/selection changes and restores the
  original native Moveset button on cleanup. Final-state verification also requires
  native manual mode, saved events supersede older pending reads for the same creature,
  and persistence failures are surfaced immediately while the in-session copy remains usable.

- Coupled Workspace host advances to **candidate30** after candidate29 achieved independent TECH/lifecycle **READY (P0–P3=0)**. Candidate29's shutdown quarantine was technically sound but its blanket `PersistWorkspaceState` closing guard also suppressed the host's intentional final state snapshot. Candidate30 keeps every lifecycle/ToolTip/async mutation guard unchanged and makes the persistence contract explicit: ordinary saves still fail closed once shutdown begins, while `CompleteShutdown` alone may persist the final coherent workspace state before pane disposal. Exact candidate30 SHA-256 is `EDEE495C4F49E9F01107CD91B72EC9BB2FF31E35C47DAE1F37FF567D3F6A96F6` (225792 bytes). Exact isolated validation: normal smoke PASS, close-during-init **20/20 PASS**, close-during-switch **20/20 PASS**, all exit 0 with empty stderr. Independent candidate30 TECH/lifecycle re-gate is **READY — P0=0, P1=0, P2=0, P3=0**. Better UI/Analyzer bytes and the normal host remain unchanged; candidate30 is not promoted and still requires Product Owner live close validation.

- Coupled Workspace host advances to **candidate29** after candidate28's independent lifecycle re-gate found one final in-flight mutation gap: a Single/Dual operation that had already entered before close could resume after its first awaited Ensure and start another pane because `EnsurePaneAsync` itself had no closing guard at entry. Candidate29 quarantines Ensure/Recover/Single/Dual at entry, keeps post-await guards before follow-on mutations/persistence, prevents workspace persistence while closing, and extends shutdown smoke to prove late mutation calls cannot repopulate the cleared pane registry. The new `--smoke-close-during-switch` regression forces Single→Dual close while the first missing pane is being initialized. Exact candidate29 SHA-256 is `A23D78A644BC04958D1C2C3CF2D2D9D8A1812374988C557C5C031DC1C344D729` (225792 bytes). Isolated exact validation: normal smoke PASS, close-during-init **20/20 PASS**, close-during-switch **20/20 PASS**, all exit 0 with empty stderr. Better UI/Analyzer bytes remain unchanged; normal host remains untouched. Candidate29 is unpromoted pending independent lifecycle re-gate and Product Owner live validation.

- Coupled Workspace host advances to **candidate28** after the independent lifecycle gate correctly rejected candidate27 for a residual close-during-initialization path. An already-running `EnsurePaneAsync` could outlive the initial closing guard across WebView2/script-registration awaits, and the initialization catch could still attempt host UI while closing. Candidate28 adds post-await closing/current-pane guards throughout pane initialization and Better UI health probing, suppresses initialization error UI once shutdown begins, and adds a dedicated `--smoke-close-during-init` regression that forces graceful close while pane initialization is suspended. Exact candidate28 SHA-256 is `FF3F4CC576A825192CF700532A4FEE193B8CD084FAE3AD67DBE94CC774504AF6` (223744 bytes); exact normal and close-during-init smokes pass, but its lifecycle re-gate is **NOT READY — P2=1/P3=1** because the separate Single/Dual continuation path remained. Candidate28 was never promoted or delivered as the corrective live candidate.

- Coupled Workspace host advances to **candidate27** after Product Owner live use exposed a candidate26 shutdown-only WinForms exception in `ToolTip.SetToolTip(...)`. The host now enters a closing quarantine from `FormClosing`, stops both WinForms timers before teardown, removes tooltip associations while control handles are still valid, routes tooltip writes through lifecycle guards, suppresses late analyzer/health/deck/dock/drawer/WebView refreshes, removes pane ownership before WebView disposal and disposes the shared ToolTip last. Smoke mode now fails on `Application.ThreadException` and exercises late shutdown sinks. Exact candidate27 SHA-256 is `660CCD887CE20713A5526242B6C73EFBC041A28921A3A27F4B33A5DE2DE638A9` (222720 bytes); exact repeated close smoke is **5/5 PASS**, Better UI remains **0.2.36 / 41/41 focused / 342/342 full**, Analyzer remains **1.13.2** byte-identical between PROD/embed, and the normal host remains unchanged. Candidate27 is not promoted and still requires the lifecycle re-gate plus Product Owner live close validation.

- Coupled Workspace advances through live-rejected **candidate25** to corrective **Better UI 0.2.36 / candidate26**. Candidate25 added the requested C/V rarity surface, per-rarity Shiny C/V, full-session special History (Epic/Legendary/Mythical or any Shiny), true Epic+ semantics, active level-EXP progress, primary Pokémon XP/h and compact large-number rendering, but Product Owner live review found three remaining defects: active EXP copy wrapped unnecessarily, “Elixir” had been misinterpreted as an EXP boost instead of Heal Potion, and live target art still remained blank. Candidate26 keeps EXP current/required/% on one line, exposes an explicit Heal Potion selector backed only by in-stock native `type="potion"` inventory and a latest-settings-before-write `auto_potion.potion_item_id` update, and extends native-only target art resolution to exact already-observed same-origin `/img/characters/` resources from the page Resource Timing list. The resolver never synthesizes a sprite path and rejects PokémonDB. Better UI focused **41/41** and full **342/342**, Analyzer **435/435**, builds/verifier and exact candidate26 WebView2 smoke all pass. TECH/ARCH and UX/A11Y corrective gates are **READY (P0–P3=0)**. The normal host remains unchanged and candidate26 still requires the final local visual/acceptance reconciliation plus Product Owner live validation before any promotion.

- Coupled Workspace advances to **0.2.34 / candidate24** after Product Owner validation of
  candidate22. The live sprite blocker itself was closed, but the mixed native/PokémonDB art,
  account-specific missing target, no Team levels, tall/single-rarity History and missing
  Pause/Reset controls were rejected as the next Hunt-console state. Cards now uses only visual
  data obtained from the game (native Team HUD/canvas or native species metadata) and explicitly
  rejects PokémonDB for player/target art. Hunt Analyzer `1.13.1` keeps exact-one-target fail-closed
  while adding current-runtime active-target provenance so stale persisted unresolved encounters do
  not poison the live target after hydration/reconcile. Team options show levels; History exposes
  multi-rarity plus Shiny filters and roughly five visible records before vertical scrolling; and
  explicit Pause/Resume/Reset delegates back into the embedded Analyzer owner. Reset creates a
  fresh zeroed Hunt then manually pauses+locks it, preserving previous History while preventing
  automatic city activity from restarting the timer. Candidate23 was superseded before delivery
  when exact smoke caught its old narrow `252px` History override; candidate24 fixes that responsive
  contract. Analyzer **434/434**, Better UI focused **35/35** and full **336/336**, builds/verifier and
  exact WebView2 smoke all pass. Independent exact candidate24 TECH/ARCH, UX/A11Y and VISUAL gates
  are all **READY (P0–P3=0)** and independent local acceptance is **ACCEPTED (P0–P3=0)** for Product
  Owner live validation only. Normal-host promotion, Git history and release remain separate explicit gates.

- Coupled Workspace Hunt console advances from live-rejected **0.2.30 / candidate20** through
  superseded **0.2.31 / candidate21** to corrective **0.2.32 / candidate22**. Live validation found
  active Rhydon/Gyarados art blank despite green local gates. Candidate21 added a strict canonical
  PokémonDB `species_id` fallback and rejected fully transparent active-portrait canvases, but a
  new regression proved the shared compact Team-card extractor could still serialize a transparent
  canvas first and block that fallback. Candidate22 applies the same bounded alpha inspection to
  the shared Team-card canvas path: canvases up to 65,536 pixels are rejected only when all alpha
  bytes are zero, while large/tainted/uninspectable native canvases keep the prior conservative
  behavior. Focused **33/33**, full **334/334**, build and exact WebView2 smoke pass; the smoke now
  includes a transparent compact active-Team canvas and requires Rhyosa/Gyarados to resolve through
  the canonical PokémonDB fallback. Exact TECH/ARCH, UX/A11Y and VISUAL corrective gates are all
  **READY (P0–P3=0)** and independent local acceptance is **ACCEPTED (P0–P3=0)** for Product Owner
  live sprite validation only. Normal-host promotion, Git history and release remain separate gates.

- Saved Teams advances through blocked **0.2.19**, corrective **0.2.20/0.2.21** and current exact **0.2.22** with an additive manual authoring flow in the
  full Team manager. `Create team` loads Pokémon from native Backpack inventory through
  `getCreatures("inventory")`, lets the user choose 1–6 unique creature instances, author
  their Battle order and active member, name the preset and save it directly into the existing
  `ppbui:team-presets:v2` model as `orderVerified:true`. The live Team is never changed while
  composing or saving: the composer does not call `addTeamMember`, `removeTeamMember`,
  `setTeamLeader` or `setTeamOrder`; only the existing Apply path performs native Team
  mutations. `Save current`, HUD quick recall and previously live-validated Team/Saved-Team
  behavior remain intact. The composer caches Backpack data across close/reopen, provides an
  explicit Refresh path, deduplicates creature IDs, preserves keyboard focus when rebuilding
  candidate/formation nodes, distinguishes empty Backpack from no filter matches, and keeps
  stable sync mutation-free. Independent Technical QA blocked `0.2.19` before Product Owner
  handoff after proving that a successful explicit Backpack refresh could remove a Pokémon from
  current inventory while leaving its selected ID savable in the draft. `0.2.20` reconciles every
  selected ID against the newly confirmed Backpack after a successful refresh, refreshes retained
  member snapshots, prunes unavailable members and repairs active/selected state; a failed refresh
  still preserves the draft. A dedicated regression reproduces the rejected stale-empty case.
  Before Product Owner handoff, true-empty Backpack evidence exposed another bounded state bug:
  after asynchronous loading completed, the empty candidate area could leave its explanatory
  message hidden. `0.2.21` corrected that successful-empty path. UX pre-gate then exposed the
  complementary state error: while the first Backpack read was still pending or after it failed,
  the same empty copy could imply a confirmed empty inventory, and filter selects had no initial
  fallback option. `0.2.22` hides empty copy until a successful read confirms zero candidates and
  initializes localized All options immediately. A dedicated regression covers loading, failure,
  true-empty and filter fallback states; authoring/storage/Apply semantics remain unchanged.
  Render-first review covers normal six-selected, narrow ~340px, no-results, true-empty and
  load-failure states; the narrow candidate card was hardened to a real 48px minimum after
  browser metrics exposed a hostile 28px control-height collision. Full suite is **284/284**,
  build and diff-check pass. Exact userscript: **619,967 bytes**, SHA-256
  `44D8DC6CB172D3FF5BBDB8B0E3FE21660F471C62A48AEAFEDD89F2B041866776`.
  Independent exact-candidate gates all close `P0=0 P1=0 P2=0 P3=0` with **TECH READY / UX READY /
  VISUAL READY**. Technical QA reproduced `50/50` focused Team Presets checks and reconfirmed the
  cache/stale-refresh/stable-sync/zero-Team-mutation contracts; UX/A11y reproduced `37/37` focused
  checks including loading/failure/empty semantics and keyboard/focus behavior; Visual QA verified
  the exact current normal/narrow/no-results/empty/error renders with no existing manager regression.
  Product Owner live validation remains required for this new creation flow only.

- Auto Helper advances through exact **0.2.17** to corrective **0.2.18** as a visual-only Miyazaki 16 migration of
  its previously Product Owner-validated grouped editor. The native Support, Capture,
  species, entitlement and Keep/Sell/Extract controls remain authoritative; saver
  serialization/coalescing, 450ms species debounce, close flush, Retry, resource
  refresh, reconstruction/focus state and exact settings payload are unchanged. The
  enhanced window now owns a charcoal square PPBUI shell/body, project typography,
  shared 10px pixel scrollbar, hard-edged disclosures and fields, a semantic
  save/resource rail, aligned Support rows, peer Normal/Shiny capture cells and a
  neutral full-width destination matrix with canonical rarity cues. The responsive
  fallback now follows the actual Auto Helper container width rather than viewport
  width. Render-first preflight caught a concrete shared-button regression before
  handoff: Retry's new flex primitive overrode its `hidden` state while Saved; the
  candidate now preserves `[hidden]` explicitly and covers it with regression tests.
  Focused Auto Helper verification is `13/13`, full suite `277/277`, build passes.
  Exact userscript: **589,139 bytes**, SHA-256
  `8B1D067C5CFCC704A308A7E6A6D676EEF08237636A5AB43A0935B81147F7D16E`.
  Host-realistic wide/narrow/error/matrix renders are recorded in
  `docs/AUTO_HELPER_REDESIGN_STATUS.md`. Independent Technical, UX/A11y and
  render-first Visual Regression QA each close `P0=0 P1=0 P2=0 P3=0` with
  **TECH READY / UX READY / VISUAL READY** on this exact candidate. Technical QA
  additionally passed an unsupported-Extract/cleanup/no-idle-request adversarial
  probe; UX QA passed reconstruction/caret/tab-order semantics; Visual QA verified
  all four exact render identities and the corrected Retry visibility. The Product
  Owner then live-rejected `0.2.17` on a bounded visual scope: Normal/Shiny capture
  should stay side-by-side at the live panel width, Shiny needs stronger typography,
  and the fully ruled Keep/Sell/Extract table produced excessive visual line density.
  `0.2.18` keeps Capture in two equal columns through 560px (stacking only below that
  true narrow threshold), gives Shiny a stronger cyan uppercase/small-caps heading,
  and removes the matrix body grid in favor of the outer/header frame plus subtle row
  banding. Native controls, saver/payload semantics and destination exclusivity are
  unchanged. Focused Auto Helper remains `13/13`, full suite `277/277`, build and
  diff-check pass. Exact `0.2.18`: **590,517 bytes**, SHA-256
  `A37CF2191FD7A47DE48EBAB05A5372E2A944BECF44DDD370931AA35F44389D71`.
  Fresh exact-candidate Technical, UX/A11y and Visual Regression gates each close
  `P0=0 P1=0 P2=0 P3=0` with **TECH READY / UX READY / VISUAL READY**. Technical QA
  passed unsupported-Extract, no-idle-request, reversible-class and cleanup probes;
  UX/A11y confirmed native form/details semantics and unchanged tab/focus behavior;
  render-first Visual QA independently verified the four exact PNG identities and
  confirmed the reduced matrix line density, live-width side-by-side Capture, true
  narrow stack, and non-interactive Shiny emphasis. The Product Owner then
  live-validated exact `0.2.18` with **“Auto-Helper validado!”** on 2026-09-17,
  closing the final Auto Helper gate for this candidate.

- Storage advances through the visual-redesign/corrective line to exact **0.2.16** while preserving its
  Product Owner-validated two-column functional contract. The current redesign keeps
  native slot/action identity, per-side search/filter/sort/page state, occupied-result
  pagination, native unfiltered bulk transfer and Better UI filtered all-pages bulk
  semantics, while moving the surface to the approved charcoal-dominant Miyazaki 16
  grammar. Default Pokémon slots are neutral, canonical rarity becomes a compact
  bottom edge, selected is independently gold, focus is independently cyan, controls
  are square PPBUI primitives, and pager/transfer rails are stable. The two Architecture
  audit findings are also closed: Storage discovery now prefers the current active scene
  over a stale cached scene sharing the same body, and wrapped refresh restores scroll to
  the current replacement body. A render-first pre-review caught advanced filters
  clipping the transfer footer at representative height; the Storage-scoped advanced
  grid was compacted from 4 to 5 columns so its 9 fields render in two rows without
  changing order/semantics. The wrapper-chain cleanup blocker found during `0.2.13`
  review was fixed in `0.2.14` by making captured Storage adapters inert after cleanup.
  The Product Owner then
  explicitly approved Storage functionality and structure but rejected the live
  Search and initial Rarity/Element/Sort chrome because the native `.pokeidle-panel`
  `!important` field rules still won. The original local harness had omitted that host
  class, creating a false visual green. `0.2.15` added a Storage-specific field bridge;
  the corrected host-realistic harness then exposed the same native black fill inside
  open More Filters before handoff. `0.2.16` extends that same visual-only bridge to
  Storage More Filters without changing field DOM, values, listeners, caret, tab order
  or behavior. Focused Storage verification is now `22/22`, full suite `275/275`, build
  and diff-check pass. Exact userscript: **578,005 bytes**, SHA-256
  `8148431ADA318843CF8BE325CE0241D0F9895A312C3B7C78C648FC11189608FD`.
  Host-realistic renders are `work/storage-0.2.16.png` (**48,377 bytes**, SHA-256
  `BF199E432FB9855319831E8B79EA0E20F5DD0E21EA0AEE9F464133ADC1AB6DBC`) and
  `work/storage-0.2.16-states.png` (**54,583 bytes**, SHA-256
  `C22F47CB5EB93AB2874B3CFDFD9BE2CC196C303DAB461C5A51C1E6C55F99043D`).
  Independent render-first Visual Regression QA on this exact candidate closes
  `P0=0 P1=0 P2=0 P3=0`, **VISUAL READY** for the bounded field-chrome correction:
  Search and the initial Rarity/Element/Sort controls no longer leak the rounded/
  black live host treatment, and open More Filters retains the same square owned
  chrome without layout regression. This local verdict remains separate from live
  Product Owner validation. Independent UX/A11y QA also closes `P0=0 P1=0 P2=0 P3=0`,
  **UX READY**: Search remains a labelled native search input with caret/focus restoration,
  the filters remain their original native selects/options/change behavior, More Filters
  keeps native details/summary and DOM/tab order, and cyan focus-visible survives the
  hostile host outline reset without introducing tab stops. Independent Technical/
  Architecture QA likewise closes `P0=0 P1=0 P2=0 P3=0`, **TECH READY**, after rerunning
  `22/22` Storage checks and adversarially confirming native select identity/options,
  Search caret/focus preservation, natural tab order, unchanged stale-wrapper cleanup,
  and that the Storage-scoped same-origin `!important` selectors outrank the live host
  field/focus rules without changing behavior.
  Product Owner then live-validated exact `0.2.16` with **“Storage validado”** on
  2026-09-17, closing the final field-chrome gate. Functionality, structure and the
  current Storage visual presentation are accepted for this candidate.

- Product Owner live validation **rejected 0.2.9** because Saved Teams could still render Shared
  Stone as the Pokémon identity sprite for presets that had already persisted contaminated
  `member.sprite` metadata. The prior fix correctly protected new captures but trusted an existing
  saved sprite before attempting live recovery. `0.2.10` now rejects known Shared Stone asset paths
  and also rejects an opaque saved URL when it matches the native HUD Shared Stone image during an
  explicit resolution pass. It then reuses the existing Pokémon-only card/creature extraction path;
  if no current Pokémon art is available, the preview falls back to text rather than showing status
  art. Genuine saved Pokémon sprites still use the existing fast path and stable sync does not add
  canvas serialization or broad DOM scans.

- Exact corrective candidate **0.2.10** is frozen at **567,546 bytes**, SHA-256
  `04DE4BB9CD7FDCF5933186E5826BD74AC37EBFE3280EF852FE915438C47A9B2E`.
  Focused Team Presets verification is `42/42`, full suite is `269/269`, build passes and
  `git diff --check` reports only the existing LF/CRLF warnings. The representative local render
  intentionally persists the Shared Stone asset into the Saved Team fixture and confirms recovery
  to Pokémon art: `work/visual-qa-0.2.10.png`, 216,759 bytes, SHA-256
  `8BA64A7F0D894BCCEC180CEF71BD9D131714BF4EA0FBAF84810B577B51AB85A5`. An earlier transient
  screenshot identity was read while the same one-shot output path was still settling and is
  withdrawn. Independent Technical QA later blocked this candidate with `P0=0 P1=0 P2=1 P3=0`:
  the first heuristic scanned the entire sprite URL for `shared-stone`, so unrelated query/hash or
  directory text could falsely invalidate a genuine saved Pokémon sprite. The locally positive visual
  result therefore did not authorize handoff and `0.2.10` was superseded before Product Owner validation.

- Corrective candidate **0.2.11** narrows Shared Stone path detection to the real asset basename after
  stripping/parsing query and fragment text, while retaining exact normalized native-badge matching for
  opaque assets. A regression proves `/sprites/shared-stone-notes/rhydon.png?note=shared-stone#shared-stone`
  remains a genuine saved sprite and causes zero canvas serialization. Focused Team Presets verification
  is `43/43`, full suite is `270/270`, build passes, and `git diff --check` reports only existing
  LF/CRLF warnings. Exact userscript: **567,847 bytes**, SHA-256
  `8AF4C8993FDFBAB969B90A56967C22427CF0ED8CF3A1A5EA36FCFBF3AB0DC096`. Canonical local render:
  `work/visual-qa-0.2.11.png`, **216,544 bytes**, SHA-256
  `7953EBE916EBDEA384D8E8E3EFB6D6C79C0243BD2B5F0DB747A495348745F8FF`. Independent Technical QA
  closes `P0=0 P1=0 P2=0 P3=0`, **TECH READY**, after independently rerunning `43/43` focused and
  `270/270` full checks plus adversarial basename/query/hash, opaque URL, off-team and cache cases.
  Render-first Visual Regression QA closes `P0=0 P1=0 P2=0 P3=0`, **VISUAL READY** for the local
  rendered-evidence gate: the deliberately contaminated preset shows Pokémon identity rather than
  Shared Stone, while the real `×99` badge, Saved Team structure and prior visible fixes remain intact.
  The Product Owner subsequently live-validated this behavior with **“Shared stone comportamento
  validado.”**, closing the Shared Stone defect for `0.2.11`.

- Corrective candidate **0.2.12** addresses the only layout issue found immediately after that live
  acceptance: a blank strip between Saved Team member 6 and the right edge of the HUD preview. The
  list no longer reserves a stable scrollbar gutter, keeps full-width/min-width ownership, and the
  generated six-member preview now contains its own noninteractive decorative overflow. Browser
  diagnostics showed why both pieces matter: the card visual leaked `2px` below a `78px` list, which
  produced a real Windows vertical scrollbar and consumed `15px` at the right even with one preset.
  After containment the `6/6` preview/list both measure `476px`, member 6 has `0px` right gap, the
  panel-content gap is `0px`, six tracks are equal (`~79.33px`), and no horizontal/vertical scrollbar
  is needed. Genuine multi-preset scrolling remains on the outer `overflow:auto` list.
  Exact userscript: **567,955 bytes**, SHA-256
  `3623CFAF3E04A730D00DEFCADD243BD6E8BEB530EE8B92D629E969C8BB42E270`; focused Team Presets
  `43/43`, full suite `270/270`, build and diff-check pass. Canonical local render:
  `work/visual-qa-0.2.12.png`, **263,016 bytes**, SHA-256
  `3980AB84EB82801351C42D7D897FD331733973E17C6B61752707590F92E2C2A4`. Independent Technical QA
  closes `P0=0 P1=0 P2=0 P3=0`, **TECH READY**, including a genuine multi-preset scrolling probe;
  render-first Visual Regression QA closes `P0=0 P1=0 P2=0 P3=0`, **VISUAL READY** for the exact
  local render. The Product Owner then validated the live result with **“Validado.”**, closing the
  Saved Team HUD width defect on exact `0.2.12`.

- Product Owner live validation **rejected 0.2.7** on two additional polish regressions: Team HUD
  could reveal the native Shared Stone presentation placeholder as an empty badge when no stone
  applied, and Pokémon Tools still exposed `Min Quality Multiplier` plus rounded More Filters
  fields. The HUD correction now explicitly preserves the native `[hidden]` state without changing
  real carrier/recipient badges. Pokémon Tools now presents `Min Quality` while preserving the
  underlying quality-multiplier filter and hardens only its Better UI-created inputs/selects to the
  approved square chrome. `0.2.8` was built locally but **blocked before handoff** when adversarial
  render-first preflight proved stronger hostile CSS could still restore rounded fields. That
  finding was corrected and versioned again rather than being waived.

- Exact corrective candidate **0.2.9** is frozen at **566,484 bytes**, SHA-256
  `194D0873E50264401424FC665D1F7F25C4BE27CDE10DE228442A82DF28F20369`.
  Latest focused verification is `34/34`, broader affected verification is `132/132`, full suite is
  `266/266`, build passes and `git diff --check` reports only the repository's existing LF/CRLF
  warnings. The representative adversarial render is `work/visual-qa-0.2.9.png`, SHA-256
  `4CB7D1DBAE56959EC8F3C1DAD9ADBC9503F4050A408EBDBFD9288748CE63C051` (195,414 bytes); an earlier
  transient hash read while the one-shot headless process was still settling the same path is
  withdrawn. Independent Technical QA closes `P0=0 P1=0 P2=0 P3=0`, **TECH READY**, after fresh
  `34/34` focused and `266/266` full verification plus reviewer-selected lifecycle/specificity edge
  checks. Render-first Visual Regression QA then reconfirmed the settled canonical PNG identity and
  closes `P0=0 P1=0 P2=0 P3=0`, **VISUAL READY** for the local gate: no empty no-stone badge is
  visible, the real `×99` badge remains intact, `Min Quality` is exact, and all More Filters fields
  are visibly square/flat under hostile host styling. Independent UX/A11y QA also closes
  `P0=0 P1=0 P2=0 P3=0`, **UX READY**: hidden Shared Stone presentation remains outside normal
  focus/accessibility exposure, the real native badge semantics are retained, the `Min Quality`
  numeric filter/label/tab order remain intact and shared focus-visible outline behavior survives.
  Product Owner live/in-game validation remains the final separate gate.

- Product Owner live validation **rejected 0.2.6** on five polish regressions despite green
  Technical/UX gates: Saved Team could capture Shared Stone status art as the Pokémon sprite;
  Element tiles could collapse into a solid same-color block because canonical color filled
  the backing behind a similarly colored glyph; Shared Stone `×1` had no safe growth contract
  for multi-digit counts; Add Pokémon Search still exposed rounded host/UA chrome; and the
  picker scrollbar kept legacy gold/navy colors despite square geometry. The corrective batch
  now treats Pokémon identity art separately from auxiliary status imagery, uses the canonical
  Element color as edge/swatch with a darker element-tinted well, gives Shared Stone counts
  intrinsic width, and adds picker-owned hostile-host bridges for Search appearance and shared
  Miyazaki scrollbar colors. `0.2.6` remains rejected and was superseded by the frozen `0.2.7`
  corrective candidate below.

- Corrective candidate **0.2.7** freezes the five live-rejection fixes at **565,526 bytes**,
  SHA-256 `1C78391D28FCB6496F6CC92D5C2BD4AC9EA4F3C757673A4EF362EFBC546F77C7`.
  Saved Team sprite capture now prioritizes Pokémon visual hosts and excludes Shared Stone /
  Element/status imagery; the shared Element primitive retains canonical color as its square
  edge while mixing a darker tinted well behind the symbol; Team and Team HUD Shared Stone
  badges use intrinsic count width rather than a fixed box plus absolutely positioned count;
  Add Pokémon Search has a picker-owned native-appearance reset; and the picker's real WebKit
  scrollbar gets a higher-specificity, picker-scoped bridge that uses only shared Miyazaki
  scrollbar tokens. Focused corrective verification is `153/153`, full suite `264/264`, build
  and diff-check pass. Independent Technical QA closes `P0=0 P1=0 P2=0 P3=0`, **TECH READY**;
  independent UX/A11y QA closes `P0=0 P1=0 P2=0 P3=0`, **UX READY**, after `80/80` focused
  checks; render-first Visual Regression QA closes `P0=0 P1=0 P2=0 P3=0`, **VISUAL READY** for
  the local visual gate using `work/visual-qa-0.2.7.png` (SHA-256
  `A263F7C0A0FD0577EBED0E033F48B5B0E78B5BB3D3C5EBC2E3DB550B734BB3E1`) against the Product
  Owner's live-rejection screenshot. A later Product Owner live pass nevertheless rejected exact
  `0.2.7` on the additional Shared Stone-placeholder and More Filters findings recorded above;
  the prior automated/synthetic gates remain historical evidence only for that exact artifact.

- Replaced the previous role/gate model after the Product Owner challenged repeated false
  visual readiness. Project Manager is now the explicit **delivery gatekeeper** and owns an
  Acceptance & Evidence Matrix with observable `AC-*` criteria. Generic `READY` is removed;
  reviews report `TECH READY`, `UX READY`, or `VISUAL READY / VISUAL NOT READY / VISUAL
  EVIDENCE INSUFFICIENT`. Every visible change now requires a separate render-first Visual
  Regression Reviewer; source/CSS/JSDOM/test counts are explicitly invalid as proof of
  appearance. Technical QA must add reviewer-selected adversarial evidence instead of only
  replaying author tests. Role activation is reduced for exact polish: Lead Designer is not
  mechanically reactivated when Product Owner requirements plus the approved design system
  already determine the answer. The PM must block or explicitly label evidence gaps rather
  than treating multiple green reviewers as cumulative visual proof. Independent governance
  QA initially found four P2 consistency gaps and one P3 naming drift in the rewritten model;
  all were corrected before adoption. The recheck closed at `P0=0 P1=0 P2=0 P3=0`,
  `TECH READY` for governance consistency.

- Product Owner live validation explicitly closed the structural gate with **“Estrutura
  validada.”** The current visual-polish candidate is **0.2.6** without
  reopening the accepted Backpack/Team/Add Pokémon composition. Backpack Sort gains the
  requested **+15px** normal width (`160–235px`, target/max 235px) while preserving the
  measured inline-important proxy contract. Add Pokémon now opts its owned root into the
  shared hostile-host `ppbui-scroll-scope`, extending the 10px square scrollbar grammar to
  whichever descendant actually scrolls, hiding WebKit arrow buttons and yielding
  standardized `scrollbar-color` where required. Element presentation is standardized
  project-wide through shared `ppbui-element-icons` / `ppbui-element-icon` primitives:
  24px base, 20px compact, square canonical Element-color swatch/edge with a darker tinted
  well that keeps native/domain artwork visually distinct,
  retained; Team selected member, Add Pokémon candidates, Team HUD active Pokémon and Hunt
  Inspector relations/elements all consume the same primitive, with Hunts removing its old
  module-local icon family. Team rarity/quality uses the shared square dark
  `ppbui-quality-badge` with canonical `--quality-*` structural color and unchanged
  gameplay text/data. The shared Element helper was subsequently hardened through independent
  QA findings covering detached native nodes, stale canonical color, cross-scope ownership,
  mixed scoped/legacy cleanup, scoped-to-legacy ownership transfer and decorative-image
  focusability. Focused affected-module verification is now `119/119`; the full suite is
  `263/263`. Build is **561,349 bytes**, userscript `@version 0.2.6`, SHA-256
  `7B3C7BA6C8A9435D0226F498BC52554F310A8247B76EFB35178191B1BAC8CF05`;
  `git diff --check` passes apart from the repository's existing LF/CRLF warnings.
  Independent Technical/Architecture QA and UX/A11y QA both close at `P0=0 P1=0 P2=0 P3=0`
  with **TECH READY** / **UX READY** on this exact artifact. Render-first Visual Regression QA
  reports `P0=0 P1=0 P2=0 P3=0`; AC-01 through AC-04 pass on
  `work/visual-qa-0.2.6.png`, while AC-05 remains **VISUAL EVIDENCE INSUFFICIENT** because
  independent historical Team/Add Pokémon live screenshots exist but no valid independent
  post-fix `0.2.1` Backpack capture was recovered. Further Git/reflog investigation confirmed
  that the exact `0.2.1` working-tree state was never committed and cannot be independently
  reconstructed without deriving a synthetic baseline from current source. The PM therefore
  classifies the candidate as **PRE-LIVE DIAGNOSTIC** with a single live-only Backpack AC-05
  gap; it is not `PM ACCEPTED`. The previously validated Team/Add Pokémon structure is not
  reopened.

- Product Owner live validation accepted the current Miyazaki 16 treatment and the
  other reviewed modules, leaving only Backpack pending. A subsequent live retry still
  showed the same Backpack defects. Investigation found a delivery risk in addition to
  the CSS issues: every prior candidate still declared userscript `@version 0.2.0`, so a
  userscript manager could keep the earlier installed code even when `dist` changed.
  The current candidate is therefore **0.2.1** and the build now derives `@version` from
  `package.json`. Inventory is also hardened independently of that delivery fix: Sort has
  both the measured inline-important width and a scoped 160–220px CSS fallback; scrollbar
  styling covers the Inventory root and every descendant scroller, yields standardized
  `scrollbar-color` in Blink/WebKit so square `::-webkit-scrollbar-*` geometry can render,
  removes native scrollbar arrow buttons, and keeps the 10px Miyazaki track/thumb; **More
  filters** uses a physical 8px horizontal margin instead of relying only on inner padding.
  Focused Inventory/Pokémon Tools verification is `42/42`; the full suite is `251/251`.
  Build is 547,658 bytes with SHA-256
  `ADF824A047C231B12BBF9C5F228EC70EBF52FDB1593575AE2810D60756EC4F99`;
  `git diff --check` passes apart from the repository's existing LF/CRLF warnings.
  Independent technical QA reports `P0=0 P1=0 P2=0 P3=1`, `READY`, with its only
  P3 being documentation traceability that was corrected after review; UX/A11y & Design
  QA reports `P0=0 P1=0 P2=0 P3=0`, `READY` on the exact frozen artifact.
  Only Backpack requires fresh Product Owner live validation for this candidate.

- Product Owner live review approved the corrected charcoal-dominant **Miyazaki 16**
  color distribution and reopened only structural/layout defects. The follow-up removes
  Better UI's `width:100%` override from the sibling Team HUD Wallet so native HUD-relative
  geometry remains authoritative; bounds Backpack Sort to a compact 160–220px track;
  hardens Backpack Search against rounded native search chrome; and bridges the Backpack
  body to the shared 10px square Miyazaki scrollbar under hostile host specificity. The
  Add Pokémon picker now owns a coherent PPBUI shell/body/intro/content surface, keeps
  `Search | Element | Rarity | Clear` on one attached normal-width rail, uses a narrow-only
  fallback, fully neutralizes native candidate-card chrome without replacing actions or
  order, keeps the rail above candidates when native intro copy is absent, disables Clear
  with no filter state and announces no-results feedback as a status. This structural
  candidate required fresh Product Owner live validation; the palette itself was approved.
  Its later live pass validated the other modules and left Backpack open, so this artifact
  is superseded by the Backpack-only correction above.

- Reopened the Miyazaki 16 candidate after Product Owner live validation rejected the
  pastel/taupe surface distribution and several small framing/alignment defects. Root
  cause: `--ppbui-bg-1` mapped the palette's medium stone `#5F5854` directly onto major
  windows/HUD panels. The corrective pass makes major surfaces charcoal-dominant,
  reserves stone for transient neutral interaction/structural use, darkens the neutral
  border hierarchy, normalizes Team HUD's 3px active edge to the 2px project grid,
  removes extra gaps from attached Team Battle Line strips, aligns the wallet box model,
  and removes double framing/height mismatch from the Hunt Atlas world/zoom rail. The
  previous `7405CC…` artifact is therefore superseded and rejected despite its green
  automated/independent machine gates.

- Replaced the live-rejected Sweetie 16 color distribution with the Product
  Owner-selected **Miyazaki 16** palette. The migration is semantic rather than a
  blind recolor: charcoal/stone now dominate large surfaces, navy is reserved as an
  optional action surface, blue/cyan owns interaction and focus, gold owns persistent
  selection, green owns active/success and red owns danger. Team/Team HUD selected
  edges, Trade selected tabs and Hunt Atlas selected markers now consume the separate
  `--ppbui-selected` role instead of overloading the action accent. Non-action blue
  leaks in Team metadata, Shared Stone presentation and Inventory headings were
  neutralized. Hunt Atlas also stops assigning `ppbui-root` to the entire native Hunt
  window: this removes the shared native-button hover background that produced the
  large opaque square behind map Pokémon and preserves the host marker's native
  margin/padding/scale geometry. Marker hover is now sprite-first with a subtle cyan
  drop-shadow and compact caption edge only. Final review hardening also scopes Trade,
  Storage and Pokémon Tools host styling to explicitly owned PPBUI roots; gives Module
  Controls and Marks Shop-created controls shared PPBUI primitives; makes Buff Strip
  geometry square; keeps organizational Pokémon tags on neutral Miyazaki tones; and
  aligns Auto Helper disabled states with the shared grammar. This candidate requires
  fresh Product Owner live validation. Automated verification: `247/247` tests;
  userscript build 537,092 bytes; SHA-256
  `7405CC0FBBB1111C29D481A39801644F8321623D301DC3A2163E98C2A990C95B`;
  `git diff --check` passes apart from the repository's LF/CRLF warnings. Independent
  Architecture/Integration and UX/A11y/Design closure both report
  `P0=0 P1=0 P2=0 P3=0`, `READY` on this exact artifact.

- Replaced the rejected white/warm master with the Product Owner-selected official
  **Sweetie 16** dark palette while retaining the approved project-wide `monospace`,
  zero-radius pixel geometry, 28px desktop control system, square scrollbars and
  reversible PPBUI ownership model. Large chrome now uses Sweetie 16 dark surfaces
  (`#1a1c2c`, `#333c57`, `#29366f`, `#5d275d`) with cream/steel text, gold primary
  emphasis, cyan focus and Sweetie semantic colors. The FIX is structural rather
  than a recolor: Team HUD collapse now respects the original native button/state by
  correcting PPBUI `display!important` precedence; Team opens at a compact 480px
  before handing width/height to the native resize handle; Saved Teams flatten the
  old inset card stack and use the full available width with a contiguous six-member
  strip; Hunt map markers are sprite-first with no opaque backing plate and element
  PNGs are extracted from native wrappers into directly aligned icon rows; Inventory/
  Backpack is recomposed as two continuous utility rails over a frameless content bay
  instead of nested generic boxes. Native slots, handlers, gameplay actions, refresh
  identities and cleanup contracts remain preserved. Current automated validation is
  `244/244`; the userscript build is 534,385 bytes (521.9 KB), SHA-256
  `4F3A23F9FA7BEAA29787F6A9F99DF2BBBF0AD171D0FD418F6F59A3F9F042F92F`, and
  `git diff --check` passes apart from the repository's LF→CRLF working-copy warnings.

- Earlier in the same redesign cycle, reopened the Team-family candidate after the Product Owner rejected the
  live candidate on 2026-09-16. The correction batch now incorporates the
  screenshot-backed Product Owner feedback: metadata-scale HUD EXP/HP/STA values,
  project-wide restrained shadow distance, primary buttons with shared light-surface
  accent-edge semantics instead of a gold lower rail, visible/reframed native Shared Stone badges,
  standardized Active/Make Active treatment, a larger vertically centered `#N`,
  reduced Team top spacing, square accent-bordered Team-name fields and a
  one-line Saved Team `< Active > + Update + Apply` footer at normal width. The
  earlier intrinsic Full Team command widths and one-row Saved Team manager fixes
  remain. Large HUD meter values additionally compact to bounded K/M/B/T text while
  preserving exact values in the same bar's title/ARIA. The exact corrected build
  passed `233/233` tests and independent review at that time. That light-direction
  candidate was subsequently superseded by the Sweetie 16 FIX above and is not the
  current validation target.

- Added the first shared pixel-art runtime: namespaced `--ppbui-*` tokens,
  opt-in surface/button/field/state primitives, singleton lifecycle injection and
  CSS-as-text bundling inside the userscript. Hunts is the first full consumer via
  Hunt Atlas: a continuous world/zoom Atlas rail, compact Finder rail, dominant
  framed map workspace and attached Inspector with explicit `Entrar na Hunt`, while
  preserving marker selection, Locate, native presentation control, zoom/focal
  state and reversible cleanup. Automated validation is complete and the Product
  Owner approved the final in-game result on 2026-09-12 through `3faa712`.

- Changed the project-wide UI direction from a vanilla/native visual baseline to
  an owned pixel-art design system. Native game UI remains authoritative for
  functional state, rules and safe integrations, but no longer constrains Better
  UI styling. Added mandatory `.skills/ui_ux_pro.md` review governance and made
  live in-game interface validation explicitly user-only. Existing modules remain
  legacy visual implementations until individually reviewed/migrated.

- Reworked desktop Hunts interaction around explicit selection: native marker
  click/keyboard activation now opens a right-side dossier instead of starting a
  Hunt, and hover/focus no longer opens the floating information tooltip while
  Better UI is active. The dossier exposes Elements,
  exact Weakness/Resistance/Immunity multipliers and valued Drops; Locate opens
  the same dossier without changing zoom. The original Classic/Platform toggle
  node is moved intact into the dossier footer and an explicit Hunt button calls
  the native `_selectedIndex` + `startHunt()` flow. Refresh, filtering, world
  changes, cleanup and full window replacement are covered by regressions. The
  window controls are grouped through reversible wrappers using the native
  toolbar, area counter and element filters; empty notices no longer reserve
  space. Native refresh while the dossier is open now preserves relative zoom and
  map center instead of reinterpreting the state against a transient full-width
  viewport.

- Added an optional Buff strip module that turns the native buff/status strip into
  a compact one-line status rail attached to the top toolbar. Timers stay inline
  with their effect, the standalone shadow/blur is removed, and the original
  buff/ticker nodes and state remain intact with reversible cleanup. Docking now
  flips below the toolbar when the native Menu Bar is positioned at the top of
  the viewport, preventing the rail from disappearing off-screen. BOTTOM docking
  now explicitly wins over the game's native higher-specificity `!important`
  buff positioning rule, removing the persistent gap without offset hacks.

- Removed the Auto Helper initial native-UI flash while its settings/inventory
  bootstrap requests are pending. Native pickers and destination grids are hidden
  immediately and the Better UI surface shows an explicit loading state until the
  enhanced controls are ready.

- Refined Trade: item categories combine with search without replacing quantity handlers; inventory uses four slots per row, with a 1000px window minimum. Balance shares the offer currency block, cancellation is secondary, status text is legible, and added Trade controls match the native Portuguese screen.

- Trade: moved Pokémon filters into a bounded four-column dialog with clear/close controls and a persistent result toolbar; aligned offer grids, moved balance below own actions, and normalized tab contrast and action heights. Native trade handlers remain unchanged.

- Fixed Pokémon Center selected rarity borders against the master theme’s explicit gold `border-color: !important` override; the previous variable-only fix did not override that rule.

- Added a persistent Interface toggle to disable Pokémon hover details while retaining native right-click cards. Disabled by default; reversible without reloading.

### Storage refinement

- Storage: preserve rarity borders on selection; fixed four-column extra filters, 980px minimum window width (Backpack: 560px). Filtered deposit/withdraw uses a confirmed snapshot across result pages and native individual transfers; stops on failure.

### Documentation

- Formalized project roles and multi-agent governance: Product Owner / Live
  Validator, five standing agent roles and six specialists with explicit
  authority, activation triggers, shared-surface write ownership, handoff format,
  independent review rules and conflict escalation. Added the project-native
  `.skills/pixel_art_direction.md` method and changed external art generators such
  as SpriteCook from a pipeline dependency into optional asset-production tools.

- Recorded the Product Owner's final in-game validation of Hunt Atlas on
  2026-09-12: shell/native-control ownership, scoped pixel scrollbars, 90% Locate
  dimming, primary `Entrar na Hunt`, square Search/Level geometry, equal-fill world
  tabs, presentation-label removal and the final nested title-owner typography fix
  through `3faa712` are approved. No Hunt Atlas validation remains pending for this
  delivery.

- Recorded the user's final in-game validation of Buff strip in both Menu Bar
  positions. TOP and BOTTOM docking are approved after the native BOTTOM
  `!important` positioning conflict was corrected in `825c95d`; no validation
  remains pending for this feature.

- Recorded the user's final in-game validation of the `feature/pokemon-tags`
  delivery: fixed Pokémon tags and shared filters across Backpack/Storage/Trade,
  the Trade filter/layout refinements, the Pokémon hover toggle and the latest
  Storage refinements. No additional in-game validation remains pending for this
  delivery.

- Recorded the user’s in-game validation of Storage through 8a4097a: independent filters, occupied pagination, sprites, selection footers, empty states, capacity/results, focus/scroll and bulk confirmation clarity. No validation remains pending for this delivery.

- Recorded the user's in-game validation of Auto Helper in `38b41a7`, including grouped settings, save/close/reopen behavior, consumable selection and per-quality destinations. No in-game validation remains pending for this delivery.

- Recorded the user's in-game validation of `01fbda9`: independently collapsible module themes, enabled/total counters and persisted expansion state. No validation remains pending for this refinement.

- Recorded the user's in-game validation of `a1dafef`: minimizing Team HUD hides the preset section and restoring it preserves its previous disclosure state. No validation remains pending for this fix.

- Recorded the user's in-game validation of `a97f199`: applying presets from the HUD without opening Team, including composition, order, active Pokémon and backpack updates. No in-game validation remains pending for this fix.

- Recorded the user's in-game approval of the compact Team profile labels and uniform button sizing in `4ff2f4c`. Validation is complete for this refinement, including active and non-active Pokémon states.

- Recorded the user's approval of native rounding in Team preset cards and tiles.

- Recorded the user's in-game approval of the Team > Saved teams controls in `c6d8e41`, following confirmation that the FPS regression is resolved. No validation remains pending for these two fixes; no runtime changes in this entry.

- Recorded the user's final in-game validation and approval of Team, including compact profile actions, collapsed comparison, equipped-Pokémon information flow and Add Pokémon name/element/rarity filters; no validation remains pending for this scope.
- Recorded the user's final in-game validation and approval of Hunts (Map), including locate/reset focus, Johto level correction, compact effectiveness badges and valued Drops; no validation remains pending for the implemented scope.
- Recorded the user's final validation and approval of Chat, including native tab management, fixed header actions, keyboard adjustments and the horizontal-scroll/window-growth fix; no validation remains pending for this scope.
- Mapped the Custom UI persistent Chat implementation and proposed native-preserving reuse for Better UI, including fixed-channel visibility, private-tab handling and privacy constraints; no Chat runtime changes yet.
- Recorded the user's final validation and approval of the Inventory module, including all three views, two-row controls, scroll preservation, sorting and item/Pokémon prices; no remaining validation pending for this scope.
- Collected inventory/backpack UX references and native Inventory evidence for scope refinement; no Inventory runtime changes implemented.
- Recorded the user's final validation of the complete menu-bar module; further QoL work is deferred.
- Recorded a future module-control panel requirement, accessible through an icon; no runtime implementation added.
- Recorded the user's validation of the Pack + Premium Shop grouping on 2026-08-31.
- Recorded authorization and implementation of the menu-bar organization plan covering 33 client-defined destinations.

### Changed

- Redesigned Team, Team HUD and Team Presets as the approved **Battle Line / Field
  Command** family. Team now presents the six native slots as a square PPBUI battle
  line with independent official-position, selected, active, focus and fainted
  states; the selected profile/actions and Add Pokémon filters
  use the shared pixel-art grammar while retaining native nodes and handlers. Team
  HUD resolves official `member_ids[]` order independently from active-first display
  order. Trainer/active-Pokémon HP/EXP/STA values remain persistent while the six
  compact members reduce to position + sprite + HP line. Presets now use
  square PPBUI formation cells and readable controls; Product Owner-approved HUD
  preset `↑/↓` ordering was removed so ordering remains in the full Team manager.
  Functional Apply/persistence/performance contracts are unchanged. The first four
  live reviews were rejected, the fifth candidate was explicitly marked as not yet
  validated, and the following candidate shown at 18:27 was explicitly rejected; the
  current Team/HUD composition remains pending Product Owner in-game re-validation.

- First revision after the Product Owner rejected the initial Team HUD candidate:
  removed the 108px `auto-fit` rule that expanded a normal narrow HUD into a dominant
  `2×3` grid and tried a `3×2` composition. That intermediate composition was itself
  rejected in the second live review and is superseded by the revision below.

- Revised Team and Team HUD again after the Product Owner rejected both surfaces in
  the second live candidate. Normal ~320px HUDs now keep one attached `6×1` Battle
  Line with compact 72px member cells and wrap to `3×2` only below 280px. Full Team
  was also changed to keep the selected-member profile/commands directly after the
  Battle Line, remove the full-width Active command treatment, and move Saved teams
  below the selected-member data workspace. That intermediate layout still showed
  Vitals/Attributes and was rejected in the third live review; the newer revision
  below supersedes it. Native nodes/listeners and preset state contracts remain
  unchanged.

- Revised Team again after the third Product Owner live rejection. Removed the
  Attack/Defense/Special Attack/Special Defense/Speed Attributes block from the
  Better UI presentation while preserving its native DOM node for exact cleanup.
  Team now uses a single vertical flow — Battle Line → selected Pokémon/commands →
  compact HP/EXP → Saved teams — removing the two-column stats layout and its large
  empty vertical area.

- Revised Team and Team HUD after the fourth Product Owner live rejection. Team HUD
  is now migrated as a complete PPBUI surface: shell/drag/collapse, trainer header,
  EXP/STA, active Pokémon portrait/info/bars, six-slot Battle Line, Saved Formations
  controls and wallet share square geometry and consistent typography while native
  handlers/state remain intact. Full Team now explicitly resets native slot pedestal
  pseudos/transforms, portrait rounding/gradient/shadow, serif selected-name
  typography, pill tags and inconsistent meter/command styling.

- Refined the next Team/HUD candidate after the fifth live screenshot remained
  unvalidated. HUD `Active` no longer shares the narrow top row with the official
  position marker; Active/Fainted coexistence now stacks both explicit state labels,
  with the level retained in accessibility text. The full Team selected workspace uses
  a smaller portrait and grid-aligned native commands, and an empty Saved teams manager
  keeps `<details>` semantics while using substantially less vertical weight. No
  gameplay, canonical order, persistence or native-handler contract changed.

- Revised Team and Team HUD again after the next Product Owner screenshot was explicitly
  rejected at 18:27. Full Team now fits its height to the actual compact content instead
  of retaining the native ~680px empty remainder, while a resize-handle handoff preserves
  live native vertical resizing and the latest user-owned height. The selected command
  workspace now uses one tight wrapping flex rail instead of an expanding grid track.
  Team HUD presents the original native cards in canonical `member_ids[]` order so the
  Battle Line reads `1→6` visually and by keyboard; no cards are cloned, native listeners
  remain attached, stable reconciliation does not repeatedly move nodes, and cleanup
  restores the current native leader-first order.

- Revised the Team family again after the 18:46 Product Owner review identified the
  remaining defects as a component-system problem rather than isolated spacing bugs.
  Shared PPBUI buttons now own inline-flex alignment/box geometry, with explicit compact
  maintenance variants, shared action rows and a reusable label|meter row primitive.
  Team HUD places `EXP`/`STA` beside the bars, hides the stamina warning while enhanced,
  and removes visible Level/Active/Fainted/member-EXP clutter from the six compact cells,
  retaining those states through native structure and accessibility metadata. Full Team
  collapses Level+HP into one concise bottom strip and suppresses selected-member HP/EXP
  Vitals as well as Attributes without deleting native nodes. Saved Team HUD/manager
  controls now consume the shared primitives instead of blanket module-local button
  geometry; reorder arrows are compact, while Apply/Delete keep standard action targets.

- Reworked the Team-family component system again after the 19:11 live rejection. Fixed
  trainer EXP/STA at the actual native-grid source by releasing the moved bars' inherited
  `grid-column:1/-1`, so labels remain on the left. Split button semantics from geometry:
  primary/danger no longer silently force action height and explicit `--action` owns 36px
  commands. Added one shared `ppbui-pokemon-card` shell/state grammar for Team HUD, Full
  Team and Saved Team previews (position, selected/active/fainted/focus/hover/pressed),
  removed duplicate visible Active/Fainted slot badges, and reorganized Full Team into an
  order-utility row followed by the native command row. Preset storage/Apply semantics and
  native Team handlers remain unchanged. The manager visual signature keys live refreshes
  on id/level/fainted state instead of raw HP/max-HP, preventing combat hits from rebuilding
  Saved Team cards while still reacting to faint/revive transitions. Live validation of
  this candidate is pending.

- Rejected the preceding Team candidate at 19:34 after Product Owner feedback that the
  internal refactor produced no meaningful visual advance. Reworked the **visible** member
  composition instead of only sharing classes: Team HUD, Full Team roster, HUD Saved Team
  previews and manager member buttons now use one 60px card geometry, the same centered
  sprite well, the same bottom `Lv.X · HP%` strip when live HP exists, one thin HP meter,
  and the same selected-left / active-right / fainted / focus state language. Full Team
  commands now sit in one bordered command surface with a separated Position cluster and
  aligned actions. HUD Manage/Apply and manager Update/Apply now share the same standard
  height; only member-maintenance controls stay compact. Saved presets still do not persist
  HP: live HP% is patched in place, preserving manager node identity during ordinary combat
  HP churn. This universal-60px candidate was subsequently rejected in live validation at 19:57.

- Reworked the Team-family visual contract after the 19:57 Product Owner rejection. The
  shared `ppbui-pokemon-card` primitive now owns state semantics rather than universal
  geometry: Team HUD uses 52px HP-focused micro-slots with no visible Level sentence, Full
  Team uses 72px roster slots with split Level/HP facts and a `3×2` fallback near the 340px
  minimum, and Saved Team uses 44px six-position identity/order tokens with no live HP/Fainted
  telemetry. Removed duplicate per-preset Manage actions from HUD quick recall, separated the
  selected-member Position utility from the Active/Details/Remove action dock, and preserved
  native Team nodes/listeners, canonical order, exact cleanup, resize handoff and preset
  persistence/performance contracts. This replacement remains pending Product Owner live
  validation.

- Revised the Team candidate again after the 20:20 live review. Team HUD micro-slots now
  prioritize `Lv.N` as the repeated fact and keep HP only as the thin vitality rail; exact HP
  remains in the active block and accessible/native state. Reworked Team-family controls so
  disclosure + Manage read as one toolbar, verified Apply and actionable activation use one
  filled gold primary treatment, already-active reads as a compact green status instead of a
  fake primary button, and Full Team Details/Remove no longer form an equal-width segmented
  strip. Native nodes, listeners, disabled rules and cleanup remain unchanged. Live validation
  of this revision is pending.

- Rejected that button treatment in the 20:30 Product Owner live review and moved the fix to the
  shared PPBUI button primitive. The native-backed `.pokeidle-btn.ppbui-button` bridge now owns
  square `appearance`, removes native gradient/background images and text shadows, suppresses
  native scale/translate active transforms, and uses hard pixel depth without overpowering pure
  Better UI module controls such as Hunt Atlas. Primary is again a dark surface with gold edge/text
  rather than a solid yellow fill; secondary stays neutral dark and danger uses the same surface
  with red edge/text. Team now assigns these shared semantics to activation/Apply while keeping
  already-active as status-like, and uses deliberate command widths instead of stretched native
  blocks. A cross-module cascade regression now protects the Hunt Atlas action's approved custom
  surface, shadow, geometry and pixel press motion. Team HUD Level-first micro-slots remain
  unchanged. This candidate is pending live review.

- Partially approved the next Team live candidate and refined the remaining control chrome. Shared
  PPBUI buttons now use a 1px normal edge while retaining 2px focus/structural emphasis, reducing
  the heavy boxed feeling in dense Team command rows. Native `game-window__search`/select controls
  that explicitly opt into PPBUI now release their 38px rounded host chrome, fixing both the Team
  name field and Saved Team rename field. The actionable `Make Pokémon active` control now keeps a
  one-line command-sized footprint instead of wrapping into a tall block. Team HUD Level-first and
  the already-approved Hunt Atlas module override contract are unchanged; live validation remains
  pending.

- Rejected the remaining Full Team/Saved Team control composition in the 21:17 Product Owner live
  review and treated the issue as UX hierarchy rather than another border patch. The selected-member
  workspace now keeps Position as a quiet utility row and places activation/status + Details in one
  attached command dock, with Remove spatially separated as danger. Saved Team rename now has a
  persistent visible label; preset reorder is hidden when only one preset exists; Delete is separated
  from navigation; member move/activation controls use the standard 32px desktop target; actionable
  `Set active` becomes primary while the current member reads as green `Active` status; and
  `Update saved team` replaces ambiguous `Update current` copy. Apply/Update now disable conflicting
  manager controls while pending, expose `aria-busy` on the manager/trigger, and report pending,
  success, failure and rename validation next to the affected preset instead of through a detached
  global status. Native Team nodes/listeners, preset storage/Apply semantics, Level-first HUD and
  Hunt Atlas module-owned button chrome are unchanged. This candidate is pending live validation.

- Refined Team command density after the 21:35 Product Owner live review. Full Team now replaces
  the long `Position N/6` label with `#N` and moves the exact native Battle-order controls into the
  same command row as Active/status, Details and Remove. Saved Team removes the redundant visible
  `Selected: Pokémon · N/6` line; member `← / Active / →` controls lead the footer from the left and
  `Update saved team` + Apply occupy that same row at normal width. Narrow layouts may wrap by action
  group without shrinking the 32px control targets. Native handlers, cleanup, preset storage/Apply
  semantics, async card-local feedback and Team HUD Level-first behavior are unchanged.

- Replaced custom/multiple Pokémon tags with the ten fixed named, colored symbols requested by the user, one per Pokémon. Alt + left click opens assignment/removal without triggering native slot actions. Removed tag editor fields; Tag now lives beside Gender inside More Filters. Added non-destructive v1 migration and interaction regressions.

- Added personal Pokémon tags shared by Backpack, Storage and Trade using trainer-scoped local persistence and individual creature IDs. Added native-looking tag editing, single slot markers/list labels, tag filters and Pokémon-specific rarity/element/advanced filters. Preserved native Trade eligibility and offer contents, Storage transfers and Backpack item filters.

- Recorded the approved Storage design direction. Added stable selection footers, separate result/capacity counters, distinct empty/filter states, pagination selection clearing and focus/scroll restoration. Removed the redundant management banner and enriched the existing bulk confirmation with quantity, destination and unfiltered scope.

- Gave Backpack and Pokémon Center independent search, rarity, element, sort and Clear controls. Removed the visible lower detail panel; selection now places its native transfer button and Pokémon name in the corresponding column. Hover, double-click and bulk transfer semantics remain unchanged.

- Fixed Storage module discovery for native non-blocking windows: resolve the scene from ReactiveWindows by its panel body as well as SceneManager, allowing the enhancement to mount while the map stays active.

- Added the optional Storage module: name/species search across both inventories before pagination, occupied-result page counts, individual native sprite URLs with icon fallback, and a compact empty selection panel. Native slots, transfer actions, bulk scope, capacity, filters and sorting remain intact. In-game validation is pending.

- Raised the toolbar stacking context to the maximum layer while the Better UI menu is open, keeping its preferences above game windows and restoring native stacking when closed.

- Replaced Auto Helper destination dropdowns with a compact Keep/Sell/Extract radio matrix. Rarity labels reuse native quality colors, paused states appear in column headers, and explanations stay in How it works. Exclusive assignments, license locks and saving behavior are preserved.

- Aligned Auto Helper Battle Support into function, consumable and condition rows. Combined Sell/Extraction toggles, license time and per-quality destinations in one native section, with collapsed explanations and explicit paused labels when a master is disabled. Assignments and saving semantics are unchanged; in-game visual validation is pending.

- Reworked Auto Helper visuals after the user rejected the consumable tile layout: compact native selects show resource names and quantities with a selected-item icon; function states share the checkbox row, and redundant Selected lines are removed. Saving and destination semantics are unchanged. Visual approval is pending.

- Added the optional Auto Helper UI module: grouped native controls, visible save status with serialized saves/retry and close flushing, exclusive per-quality sell/extract destinations, full consumable names and selected states, event/manual inventory refresh, and pending-draft/context restoration across native panel recreation. No gameplay actions are added; in-game validation is pending.

- Made module themes independently collapsible using native disclosures. Headers show enabled/total counts even when closed, and each theme remembers its expansion state in separate browser storage. Module enablement, bounded scrolling and fixed footer remain unchanged.

- Bounded the module preferences panel to 480px or the available viewport height. Only the grouped checkbox list scrolls, with native gold/graphite scrollbar styling; title, persistence status and Close remain visible as modules are added.

- Replaced oversized module toggle tiles with compact labeled checkboxes grouped into Interface, Team, and Activities & items. Preserved preference persistence, keyboard focus, dismissal and live reconciliation; descriptions remain visible beside each checkbox.

- Hide the complete Team presets section when the native desktop Team HUD is minimized, using its existing collapsed state and mobile exception. Restoring the HUD preserves the preset disclosure state.

- Decoupled Apply from the Team window/scene. Reused the native PokemonCardHost Equip/Unequip API and event flow, with authoritative Team/inventory reloads and native leader/order operations. Added a regression running Apply with no Team DOM or scene and checking equip/remove/leader/order event payloads.

- Replaced simulated Apply clicks with awaited native Team methods for equip, removal, active selection and complete order persistence. No backpack picker or profile control rendering is required. Verify final state even when native handlers swallow errors; reject unsupported runtimes before changing composition. Added no-click and native-rejection/rollback regressions.

- Fixed preset application across different team sizes: refresh native inventory before preflight, select slots by displayed creature order, wait for membership/order/inventory agreement after equip/remove, and wait for native order persistence to finish instead of accepting optimistic order. Increased action confirmation timeout to eight seconds. Added delayed-update and stale-backpack regressions; saved preset storage is unchanged.

- Refined the Team HUD disclosure into one line: localized Team formations on the left and a subdued saved count on the right, preserving native expansion and management controls.

- Shortened the Team order label to localized `Position X`, preserving native arrow behavior and restoring native text on cleanup. Completely removed Compare with active, including rendering, stat reads, signatures, styles and translations.

- Replaced the browser confirmation for saved-team deletion with the same `PokeIdle.Dialog.confirm` API used by Mark’s Shop sales, including the preset name and destructive-action option. Cancellation, unavailable/failed dialogs and module cleanup never delete a preset; concurrent prompts are suppressed.
- Aligned the native Battle order label with the profile buttons using the same 10px typography, normal weight and spacing instead of the tiny, letter-spaced label.

- Shortened the native active-state profile button to `⚔ Active` (localized) and kept the removal button label concise even when blocked. Full native explanations remain in tooltips and accessible descriptions; disabled rules and handlers remain native. Unified profile controls at 26px height with aligned icons/text and wrapping between controls rather than within their labels. Cleanup restores original text and attributes.

- Grouped all native Pokémon profile actions together: Battle order, Make active, Details and Remove from team now share the compact profile control area. Removed the separate Details/Remove container styling, retained the native destructive treatment and original buttons/handlers, and allowed natural wrapping at narrow widths. Cleanup and SPA refresh preserve original placement and state.

- Restored native rounding to Team preset previews: 4px outer HUD cards and 3px Pokémon tiles, matching the existing HUD rather than imposing square edges. Existing native manager section rounding remains intact.
- Moved the original Team Battle order label/arrows and active-state action beside the Pokémon profile information in a compact wrapping group. Removed the full-width order box while preserving original nodes, handlers, disabled state, translations and native Apply selectors; cleanup restores their original positions.

- Matched the Team HUD saved-team scrollbar to the native theme, centered owned button icons and exposed preset Up/Down ordering in the HUD using the same saved order as the manager. Replaced preview HP/EXP meters with the native primary-element color, retaining level and fainted state; capture/update stores optional color metadata without changing preset IDs, order, migration or Apply behavior. Older presets use known live colors until updated.
- Raised only the enhanced Team window minimum width to 340px so 260px Saved teams cards, native section padding and the scrollbar fit without horizontal clipping. Other window dimensions are unchanged.

- User confirmed the Team Presets FPS regression is resolved in-game. Replaced cramped per-slot controls with one selected-member toolbar per card; native sprite buttons select the target, while Update/Apply share the footer and preset controls have explicit compact dimensions. Sprite sync, Apply, Battle Order and storage semantics are unchanged.

- Fixed the critical Team Presets sync performance regression: Save availability no longer captures a snapshot; live preview sync indexes HUD cards once and reads cached/persisted sprites without computed styles, canvas exports or descendant sprite scans; collapsed previews skip the index entirely. Saved-team change detection compares fields directly without serializing sprite payloads. Unchanged sync produces no DOM mutations, including relative sprite URLs.
- Native sprite extraction remains in capture/update and bounded render/open fallback, with shared weak caches for successful and missing sources. Explicitly reopening retries missing assets, and new snapshots take priority over cached visuals. Apply, Battle Order and storage semantics are unchanged.
- Fitted six Pokémon and their separate maintenance rows inside the Team > Saved teams 260x124 card by constraining slot/button sizing and placing Update/Apply beside metadata. Keyboard focus reveals member controls. Added repeated-sync and layout regressions; real in-game FPS and native visual validation remain pending.

- Fixed Team preset sprite sourcing and member maintenance layout after in-game rejection: HUD/manager previews now resolve the native sprite from `<img>`, canvas, CSS `background-image`/`content`, or loaded runtime fields and persist the resolved sprite on new snapshots; per-Pokémon `← ★ →` controls now occupy a dedicated row below the visual tile instead of overlaying sprite/level content.
- Corrected the Team > Saved teams manager after in-game visual rejection: member cards now recover sprite/current level from the live Team HUD when older saved metadata is incomplete, keep composition as the dominant visual, and hide `← ★ →` maintenance controls until hover/focus while preserving keyboard access and all existing actions.
- Refined the Team preset manager to mirror the approved Team HUD member language with solid slots, visible Battle-order position and `Lv.X`, green active-state treatment, and more subordinate preset/member maintenance controls; functional preset behavior remains unchanged.
- Team HUD preset previews now mirror the existing Team HUD card language instead of generic mini-slots: native sprite/level presentation, compact card proportions, live HP/EXP bars for members currently present in the HUD, fainted state and green active border. Native `.pokeidle-team-card` nodes are never cloned, so original Team HUD actions/selectors remain isolated.
- Refined Team HUD preset cards into a strict two-row hierarchy: team name/count and discreet Manage/Apply controls on the first row, followed by six equal Pokémon slots in official Battle order with level, position and active-state cues on the second row. Functional Team preset behavior remains unchanged; in-game visual validation remains pending.
- Refined Team presets UI after functional approval and UI/UX rejection: fixed HUD collapse visibility, restored readable dark-theme text hierarchy, reused the established gold/gray native palette, compacted secondary actions to icon buttons, and aligned Team manager cards with the visual density used by Team, Hunts and Chat. In-game visual validation remains pending.
- Team presets now preserve official `team.member_ids[]` Battle order separately from the active/Hunt Pokémon, apply native Battle order controls sequentially, migrate v1 presets as unverified, keep HUD access collapsed by default, and add a native Team manager with 260x124 minimum cards for rename/reorder/update/apply/delete maintenance. In-game validation remains pending.
- Fully removed the abandoned Team HUD wallet enhancement and its remaining test fixture and obsolete documentation; the game owns the wallet entirely, with no Better UI controls or deferred wallet features.
- Added `assets/better-ui-icon.png` as an editable local copy of the native Settings icon currently cloned by the Better UI module control; runtime behavior remains unchanged.
- Integrated the approved custom `assets/better-ui-logo.png` into the Better UI module button as an embedded PNG data URL, keeping the userscript self-contained and the native toolbar icon geometry.
- Added an optional Team HUD enhancement with compact HP bars, visible fainted state and keyboard activation for occupied native cards. It reads native CSS state, preserves leader/hover/empty-slot actions and adds no combat or network behavior.
- Exposed current-level Pokémon EXP as absolute progress and percentage in Team HUD bars, using the loaded PersistentHud creature fields while retaining the native percentage text underneath for reversible cleanup.
- Fixed the Team HUD absolute EXP label contrast and stacking so it remains legible above the native blue progress fill.
- Reused the native HP bar text classes for absolute EXP so its font size, weight, color and alignment match HP exactly.
- Applied locale-aware thousands separators to current and maximum HP in Team HUD while preserving the native bar text underneath for cleanup.
- Standardized Team HUD HP and EXP thousands grouping with commas and spaces around `/` (`current / maximum`).
- Added trainer absolute EXP, moved trainer `EXP` and compact `STA` labels beside their native bars, and exposed full values on hover for all Team HUD HP/EXP/STA bars.
- Matched trainer EXP/STA to the Pokémon stat-row structure and native active-bar classes, giving both full-width rows with identical label, bar, fill and text geometry.
- Enforced the trainer EXP/STA two-column row so each full-width bar sits directly beside its label, matching the Pokémon HP/EXP alignment.
- Added the optional Team module for the approved Track, Compare and Build journeys: compact level/HP state in occupied native slots, contextual selected-versus-active stat comparison, and relocation of the original action node beside the profile. Native handlers, disabled rules, order, live rerenders and cleanup remain intact; no gameplay action or network request is added.
- Refined Team density and hierarchy by grouping the original active/details/remove controls in one compact action row and making comparison typography inherit the native window. Added name, element and Ready/Fainted filters plus Clear to the original Add Pokémon picker, operating only on loaded native cards.
- Fixed Add Pokémon filtering against native card display rules, made Compare with Active initially collapsed, and reordered equipped-Pokémon information into profile, vitals, comparison, attributes and compact secondary actions; Make Active remains attached to the profile.
- Returned compact Details/Remove actions to the profile area and replaced the Add Pokémon Ready/Fainted filter with native Pokémon rarity.
- Refined Hunts (Map): Johto is recognized through its native world configuration even when its internal ID differs, and now exposes and initially applies level 1 instead of hiding lower-level hunts behind 100; locating triggers one 800 ms gold sprite flash, then keeps the marker above its neighbors with a thin gold label border and gold text while other names recede to 35% opacity; a native Reset button clears the focus and returns selection to `All (X)` without changing filters or map state; compact relation badges retain only their icon and multiplier over the type-colored background while accessible labels preserve the type name; each Drop is presented as one compact `icon name (currency value)` unit in the native two-column density (77 tests total).
- Extended Hunts (Map) with a located-marker text highlight and a clearer native hover card: Pokémon title, existing Elements, exact defensive Weakness/Resistance/Immunity multipliers and existing Drops. Reused game element badges, constrained the taller card to the viewport, preserved native scrolling/position cleanup and added dual-type/card regressions (75 tests total).
- Added optional Hunts (Map) filtered-result navigation using native markers and controls: compact result selection, explicit locate without starting a hunt, native zoom/pan state integration, empty/error feedback and search/caret preservation through native refreshes. Live game validation remains pending for Hunts only.
- Prevented Chat horizontal-scrollbar pointer presses from reaching the native window-drag starter, which reapplies border-inclusive dimensions and can grow the window on each press. Preserved scrollbar default behavior, native tab actions and drag outside the scrollbar; added repeated-press and cleanup regression coverage (65 tests).
- Kept Chat restore/collapse controls fixed beside the scrollable native tabs in one header row. Stabilized restore-menu ordering to match native channels, returned focus to the selected channel after hiding an inactive tab, and resumed Tab/Shift+Tab navigation from the menu trigger. Verified 64 tests, native window dimensions and collapsed presentation in a synthetic browser preview.
- Added optional native Chat tab management: hide fixed channels with ×, restore with +, retain a visible fixed channel and persist only known channel keys. Preserved original messages, drafts, private tabs and sending; reused native styles and the central lifecycle. Verified 60 tests and a synthetic browser preview; in-game validation remains pending.
- Added per-unit NPC sell prices to Inventory List and descending Price/Rarity sort criteria, using loaded sell_price values and native rarity classes. Standardized Sort option capitalization; retained stable ordering, unknown-value safeguards and original actions (49 tests total).
- Organized Inventory into two rows: Search/category/Clear Filters and Sort/Re-Sort/view buttons; retained native styles and keyboard order. Verified the compact-window horizontal overflow without introducing breakpoints or changing window size.
- Shortened the Inventory placeholder to Search and removed the redundant Sort/Category summary; retained actionable warnings only.
- Added optional List and Category-block views alongside the original grid, reusing native slot nodes, buttons and grid styles; exposed available item/Pokémon facts without loading data or triggering actions. Added view, grouping, refresh and cleanup coverage (43 tests total).
- Increased Inventory search width by 10%, reduced the category's share of flexible space by about 10%, and exposed Re-Sort/Clear Filters as native buttons directly below the sorting row; preserved keyboard order.
- Recorded user validation of the initial Inventory module; placed Sort beside the native category and reduced native search width to 96px as requested.
- Added Pokémon Highest IV and Highest Quality sorting from already-loaded native creature data, with unavailable-value feedback and no API requests.
- Applied the approved Trainer, City, Goals, Events, Social, Tools and Shop organization, with Inventory, Hunts, Mailbox and Settings direct.
- Shop now contains Premium Shop, Pack and Gacha; group labels follow the game language.
- Reused native group triggers and badges; preserved hidden controls and suppressed empty groups without new stylesheets.
- Extended the central lifecycle with optional in-place reconciliation and filtered native-state observation.
- Expanded regression coverage to 21 tests, including all 33 destinations, native event propagation, locale changes and partial action/group replacements.

### Fixed

- Removed non-native `linear-gradient` and `border-radius` styling from Team preset HUD previews to comply with the project's vanilla+ visual rules; added regressions for prohibited CSS and live HP/EXP/level/fainted synchronization without rebuilding preview nodes.
- Included Pokémon native sell_value (with sell_price fallback) in List prices and shared item/Pokémon price sorting; added creature-ID, precedence, zero-value and missing-value coverage (50 tests total).
- Preserve Inventory scroll through loot-driven body rebuilds by rejecting stale-grid scroll events and restoring after rendering, using a unique visible slot anchor when possible. Added scroll/reset/anchor/layout regressions (46 tests total) and verified repeated refreshes in a real browser.
- Keep the Inventory sort select on the stable panel during native body rebuilds and avoid resetting a focused selection; added refresh, keyboard and advanced-sort regressions (39 tests total).
- Cancel pending DOM reconciliation when stopping the application.
- Complete all module cleanups before propagating a teardown error.

### Added

- Added optional Team presets to the persistent Team HUD. Presets store creature instance IDs and leader locally, reuse the native Team window/actions to apply composition changes sequentially, pre-validate unavailable Pokémon before mutation, preserve native disabled rules, and add regression coverage for persistence, idempotent reconciliation, full-team leader replacement and failure-safe validation. In-game validation remains pending.
- Added optional Mark’s Shop with a native item-purchase list, List/Cards switching, expandable Pokémon species groups, group checkbox selection and a hidden-selection summary. Reuses original controls and native sale batches; no direct requests or automatic sales. Added 12 regression tests and a synthetic native-CSS preview; in-game validation remains pending.
- Inventory module with native search/category reuse, collapsible explicit sorting, filter reset and result scope/count.
- Inventory ordering preference, stable ordering during native updates and reversible cleanup; separately configurable in the Better UI panel.
- Eight Inventory regression tests for ordering, native events, synchronous filter rerenders, localized slot data, new items and cleanup.
- Independent Better UI toolbar icon and native-styled module panel, with immediate menu-bar toggling and restoration through the central lifecycle.
- Versioned module preferences in a dedicated localStorage key, cross-tab synchronization and a visible session-only fallback when storage fails.
- Six regression tests for module controls, persistence, keyboard access and integration with menu-bar.
- Native menu-bar grouping of Pack and Premium Shop using the existing action buttons, with reversible cleanup and no added CSS.
- Optional module mount keys for DOM replacement during SPA rerenders.
- Menu-bar DOM regression coverage and a toolbar fixture reused from the original UI capture.

- Foundation regression tests for teardown, restart, mutation coalescing and repeated reconciliation.

- Initial project foundation.
- Modular lifecycle/bootstrap architecture.
- Centralized DOM observer.
- Visual-fidelity and project rules.
- Userscript build pipeline.
