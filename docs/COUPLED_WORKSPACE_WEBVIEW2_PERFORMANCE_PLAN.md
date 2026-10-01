# Coupled Workspace WebView2 — plano de performance

**Data:** 2026-09-30
**Estado em 2026-10-01:** EXECUTION / baseline sintética 001 e candidaturas 002+005
implementadas e integradas; gate global ainda `NOT READY FOR RELEASE`, conforme
checkpoint final e PM Gate de integração ao fim deste documento.
**Branch de planejamento:** `plan/coupled-webview2-performance`.
**Referência funcional aprovada:** commit `542af02eab23e68b32c6df896fe20c07ae1408dc`, Better UI `0.2.124`.

## 1. Objetivo, escopo e evidências existentes

Reduzir custo de CPU, memória, latência de abertura e travamentos perceptíveis do
Coupled Workspace WebView2 **sem mudar o jogo, a autoridade do Hunt Analyzer,
o isolamento entre contas nem o contrato de navegação**. Nenhuma porcentagem de
economia foi medida até agora. A auditoria que originou este plano foi **somente
leitura**; P1/P2 abaixo são prioridades de investigação, não falhas de desempenho
medidas em jogo.

O produto atual suporta **Single e Dual, com Rhyxus e Rhyosa**. Quatro contas
requerem outro contrato de produto e não entram nas comparações do host atual.
O WebView2 atual cria dois `CoreWebView2Environment`s em diretórios de dados
independentes (`AccountPane.cs:74-86`; `WorkspaceModels.cs:47-99`).

### Tupla de baseline: não misturar artefatos

| Componente | Referência conhecida | Observação |
| --- | --- | --- |
| Fonte Better UI | commit `542af02`, versão `0.2.124` | Fonte aprovada pelo Product Owner. |
| Bundle Better UI local | `dist/pokepixel-better-ui.user.js`, SHA-256 `1641B1AB5DB8E21A12D118687772A768C35611415D7D41EA4468BF36D9E4FB76` | Build ignorado pelo Git; fixar hash em cada ensaio. |
| Analyzer embed local observado | `dist/pokepixel-hunt-analyzer.embed.js`, 1.529.448 bytes | Fixar SHA-256 e versão no registro de cada ensaio; não pressupor que futuras alterações no repositório irmão sejam equivalentes. |
| Host normal local observado | `PokePixelCoupledWorkspace.exe`, SHA-256 `924D3E555F8EF94A921AF0C846BE1B39C58B6A2CFB778C1A39DB3E89D46D498F` | É um binário anterior, **não** presumir que contém toda a fonte C# corrente. |
| Host candidato local observado | `PokePixelCoupledWorkspace.candidate.exe`, SHA-256 `09E3D7988DDEAEB19F64659345EFFE651555E312B93F0D8A4475C7B8407A0675` | Não presumir aprovação live deste binário; a campanha deve comparar artefatos identificados. |

**Separar três comparações:** (a) mesmo host/binário com dados distintos;
(b) fonte C# corrente compilada em candidato isolado, antes/depois da otimização;
(c) candidato versus host normal somente como verificação de compatibilidade,
sem atribuir toda diferença à mudança. Registrar versão de Windows, WebView2
Runtime, GPU/driver, potência, DPI, zoom, layout, tela, cargas de fundo, hash dos
scripts e modo PPTools/evidence. O launcher padrão **não** recompila ao abrir
(`Start-CoupledWorkspaceWebView2.ps1:46-49`).

**P1 de reprodutibilidade:** o EXE não contém o Better UI nem o Analyzer; o
host lê os dois bundles a cada startup (`CoupledWorkspace.cs:4628-4653`).
`Start-CoupledWorkspaceWebView2.ps1 -Build` e
`Prepare-HuntAnalyzerBundle.ps1` podem reescrever `dist/`, enquanto o builder
de host pode substituir um candidato **parado**. Antes de medir, criar uma
**tupla congelada, versionada e verificável** — EXE, dois JS, hashes, SDK,
Runtime e configuração — sob local isolado, com política de lançamento que
confere todos os hashes. A infraestrutura de ensaio precisa resolver scripts
desse pacote isolado, e não dos `dist/` compartilhados. Não presumir que
copiar somente o EXE congela o comportamento. Proibido executar `-Build`
contra os artefatos partilhados pelo host utilizado pelo Product Owner.

## 2. Invariantes inegociáveis

1. O agente **não** abre, controla, inspeciona ou instrumenta o jogo/contas reais,
   Tampermonkey ou navegador do Product Owner. Usar fixtures locais sem login;
   medição e aprovação em jogo ficam com o Product Owner.
2. O game e o Analyzer são autoridades: sem alterar ritmo de Hunt, WebSocket,
   chamadas nativas, captura, autenticação, permissões ou payloads de telemetria.
   Não criar relé de eventos de Hunt para C#.
3. Sessões, cookies, IndexedDB e credenciais separados por conta. Não reutilizar
   diretórios atuais em experimentos destrutivos. Não registrar tokens, URL
   completa, payload do jogo ou conteúdo de armazenamento.
4. `Cards | Game` é independente por perfil; `Active`, `Both`, Swap, Focus,
   Single/Dual, reload, ações nativas explícitas e fail-closed continuam com o
   comportamento aprovado. Ocultar um pane não é autorização para pausar o jogo.
5. Um único observador DOM central; nenhuma duplicação de listeners, timers,
   injeções por documento ou mudanças não relacionadas. Preservar `cleanup`,
   shutdown durante init/switch, foco/teclado/ARIA e histórico **completo**.
6. Build apenas de **candidato isolado** com os dois JS congelados; nunca
   substituir host normal, alias nem arquivos `dist/` compartilhados com o
   Product Owner durante experimento. Não commit/push/merge sem nova ordem.
   `main` fica na referência funcional até gates + validação humana.

## 3. Critérios transversais de aceitação

| Critério | Evidência obrigatória | Estado |
| --- | --- | --- |
| AC-PERF-01: baseline reproduzível | Artefatos/hashes, ambiente, procedimento, dados brutos, mediana/faixa de cinco boots e p50/p95 somente quando houver amostra suficiente de eventos repetidos. | `open` |
| AC-PERF-02: não regredir comportamento | Suítes de teste, smokes não-game de host e lifecycle, diff e QA independente da tupla exata. | `open` |
| AC-PERF-03: ganho mensurável | Mesmo fixture, mesmas condições, diferença maior que a variação da baseline; CPU/memória, latência e taxa de erro reportadas sem ocultar regressões. | `open` |
| AC-PERF-04: isolamento intacto | Testes de perfil/UDF, navegação, recuperação, conta ativa, dados segregados e ausência de novo relay. | `open` |
| AC-PERF-05: sem degradação de UX | Foco, teclado, navegação, acessibilidade, Cards/Game, história íntegra; Visual QA com renders representativos se alterar comportamento visível. | `open` |
| AC-PERF-06: release controlada | Candidato versionado com SHA; PM registra TECH / UX / VISUAL separadamente e somente Product Owner valida em jogo antes de promover. | `open` |

**Regra para metas:** nenhuma regressão funcional. A 001 estabelecerá ruído,
distribuições, denominadores e um limite de ganho mensurável **antes** de
implementar cada mudança. Não fixar percentual de economia sem baseline. Reportar
intervalos/variação entre rodadas, inclusive resultados nulos. Para perfis,
adotar somente com ganho real de memória/recurso que compense a complexidade,
sem degradar tempo de startup, segurança ou manutenção.

## 4. Sequência de tasks

| ID | Prioridade | Entrega / owner de escrita | Dependências / gate |
| --- | --- | --- | --- |
| **CW-PERF-001** | P0 — fundação, **TECH-CANDIDATE parcial** | Harness **opt-in** de métricas sintéticas, relatório e baseline; Eng. Performance/PM | Nenhuma. Resultados registrados em `docs/PM_GATE_2026-09-30_CW-PERF-001.md`; faltam critérios finais antes de claims de ganho. |
| **CW-PERF-002** | P1 | Eliminar renderização de Cards ocultos em Game sem afetar a atualização do Analyzer; Eng. JS | 001 + gate arquitetura. |
| **CW-PERF-003** | P1 | Reduzir custo de leitura/comparação do histórico especial completo; Eng. JS, integração Analyzer sob contrato separado se necessária | 001; preferível depois de 002 para isolar ganhos. |
| **CW-PERF-004** | P2 | Coalescer reconciliações/capabilities/DOM de maneira causal; Eng. JS | 001 + 002; só se contadores mostrarem amplificação. |
| **CW-PERF-005** | P1 | Deduplicar gravações síncronas e atualizações de menus WinForms; Eng. C# | 001; independente das tasks JS. |
| **CW-PERF-006** | P2 — robustez | Limitar requests pendentes de Game Dock e recuperar corretamente após timeouts; Eng. C# | 001/005 ou independente, gate protocolo. |
| **CW-PERF-007** | P2 — experimento | PoC de **um Environment + dois profiles distintos**, sem migrar UDF do usuário; Eng. Arquitetura/C# | 001 e estabilização da baseline 002–006. Decisão explícita de adoção. |
| **CW-PERF-008** | P2 — experimento | Cold start, Single/Dual e descarte/recriação: medir alternativas sem bloquear UI | 001; medição independente da 007, decisão final considera comparação com a PoC 007. |
| **CW-PERF-009** | Condicional | PPTools/background e captura CDP: medir somente se caminho opt-in for gargalo relevante | 001; não habilitar probe na baseline normal. |
| **CW-PERF-010** | Fechamento | QA independente, matriz before/after, candidato isolado e decisão PM/PO | Tasks adotadas e suas evidências. |
| **CW-PERF-011** | Fora do ciclo atual | Pesquisa de suporte real a quatro contas / multi-instância | Nova decisão de produto e arquitetura; não extrapolar benchmark Dual. |

### CW-PERF-001 — observabilidade e baseline

- **Primeiro entregável:** script/runner que congela e verifica a tupla
  executável+Better UI+Analyzer em caminho isolado, recusa sobrescrever
  candidato em uso e compara hashes no lançamento. Se o host não aceitar
  caminhos de bundle próprios, preparar suporte explícito no candidato de
  teste antes da primeira medição, com fallback produtivo inalterado. Não
  executar builds no `dist/` do host live.
- **Implementação:** gerar fixture sintético com histórico 0/32/1.200/10.000,
  situação Cards/Cards, Cards/Game, Game/Game, Single, Dual e Focus; separar
  histórico visível de dados disponíveis. Medir `getSummary`, sanitização,
  `cards.render`, observer/rAF, DOM nodes, chamadas nativas em mocks, bridge
  bytes/eventos e p50/p95. Não usar captura de rede nem dados privados.
- **Host:** contadores opt-in (`Stopwatch`) de `CreateAsync`, `EnsureCoreWebView2Async`,
  registro de scripts, navegação/READY, foco, `Save`, `UpdateGameDock`,
  dispose/recreate e pending requests; amostragem por processo/árvore WebView2
  CPU, Private Bytes, Working Set, handles, threads e GPU quando disponível.
  Não atribuir cegamente todo `msedgewebview2.exe` à aplicação: identificar
  processos por sessão/árvore e documentar compartilhamento externo.
- **Método:** 5 cold + 5 warm boots (descrever mediana, mínimo, máximo e
  variação; **não** chamar o máximo de uma amostra de 5 de p95 confiável),
  distinguir UDF nova vs reutilizada e cache de SO frio vs aquecido;
  10 min idle por modo, 20 ciclos de foco, 20 de Single/Dual e 20 de
  Focus/Restore para regressão funcional. Para p95 de interações/renderizações,
  coletar ao menos 100 eventos por cenário distribuídos entre rodadas e
  discriminar a unidade de observação: `getSummary`, sanitize, render/H,
  Game→Cards READY, foco/ação Game Dock, timeout/ACK, scroll/filtro H=10.000.
  Separar processos do host, filhos Chromium e recursos compartilhados. Estado
  e hardware equivalentes;
  registrar erros e timeouts. Estabelecer ganho mínimo detectável por cenário
  a partir dessa variação, antes da implementação correspondente.
- **AC-001:** reproduzir cenário com mesmo hash e sem logs sensíveis; relatório
  confirma **todos os hashes no momento da execução**, mostra custo estático
  vs tempo observado, separa simulação de jogo real e
  aponta o maior componente por configuração. `read-only` do jogo preservado.
- **Evidências/referências:** `controller.js:352-359,407-409`, `cards.js:776-850`,
  `AccountPane.cs:74-86`, `WorkspaceSettingsStore.cs:46-78`. Não alterar o
  comportamento produtivo quando a coleta estiver desativada.

### CW-PERF-002 — trabalho visível versus oculto

- **Hipótese:** `controller.js:352-359,407-409` executa leitura + render no
  intervalo de 1.000 ms mesmo em Game; `cards.js:1718-1725` apenas oculta
  a raiz. `getSummary` pode continuar oferecendo dado atual sem rematerializar
  DOM oculto.
- **Mudança candidata:** no Game estável, evitar tanto **render DOM** quanto
  `getSummary()`/sanitização do Analyzer, inclusive nos `sync()` disparados pelo
  observer. Continuar detectando alterações de capacidades da toolbar nativa.
  O Analyzer embarcado continua seu próprio trabalho autoritativo, sem depender
  do polling de apresentação do Cards. Na transição Game→Cards, obter
  **novo** `readAnalyzerSummary(win, Date.now())` **antes** do primeiro render,
  rejeitar dados expirados (>3.000 ms), indisponíveis ou de documento/perfil
  obsoleto e apresentar fallback explícito. Não reutilizar cache que estava
  válido quando o usuário entrou em Game; respeitar epoch de
  navegação/recovery, geração do adapter e ACK do host.
- **AC-002:** zero `getSummary()`/sanitizações/render passes por tick e por
  reconciliação redundante durante Game estável, sem alterar o Analyzer;
  reentrada Cards usa um summary público **fresco ou null** e histórico
  completo. Sem leitura duplicada na transição; controles nativos continuam
  habilitados/fail-closed e sem vazamento entre documentos/perfis. Medir redução
  de chamadas, tempo de JS e taxa de erros frente à baseline; sem presumir
  ganho de p95 em cenários não afetados.
- **QA:** fixture com timer falso, Game >3 segundos, stale summary, transições
  rápidas, navegação/recovery, mudança de host ACK, cleanup, contagem de
  leituras e renders, histórico atualizado/resetado em Game, 1/2 panes com
  foco alternado e Game→Cards após longos períodos de inatividade. A11y/Visual
  se houver efeito visível.

### CW-PERF-003 — histórico completo com custo incremental

- **Correção contratual verificada em 2026-10-01:** a API pública v1 do Analyzer
  atualmente entrega no máximo **32** entradas em `specialHistory`; o limite é
  aplicado em `userscript/card-presentation.js` e novamente em
  `userscript/public-summary.js`. Os cenários H=1.200/10.000 desta task são
  stress tests do *consumidor* com fixtures artificiais e **não** demonstram
  histórico integral no host atual. O parecer e a medição de diagnóstico estão
  em `docs/PM_GATE_2026-10-01_CW-PERF-003.md`. A implementação de cache/revisões
  fica condicional à evidência de ganho em H<=32 ou a novo contrato aditivo
  aprovado e revisado no repositório Analyzer. Segue-se CW-PERF-005 como
  experimento independente mensurável, sem modificar o limite público.
- **Hipótese:** `controller.js:105-107,158-211` sanitiza `specialHistory` sem
  limite fixo; `cards.js:776-850` filtra e serializa H linhas para comparar
  mudanças; testes preservam 1.201 nós sem reconstruí-los
  (`test/cards-render-idempotence.test.js:77-103`). O provider Analyzer
  (`../pokepixel-hunt-analyzer/userscript/public-summary.js:274-306`)
  também clona entradas a cada consulta. O custo **O(H) por leitura** é
  comprovado por código, não o tempo de CPU real.
- **Mudança em fases:** (a) medir custo das etapas e otimizar comparações
  somente quando houver revisão/identidade **com semântica comprovada** — não
  comparar referências de retorno de `getSummary()`, pois ele clona entradas
  a cada leitura; (b) se necessário, protocolo *aditivo* Analyzer com revisão
  monotônica **por coleção e epoch de sessão** ou leitura incremental, cobrindo
  reset, edição, remoção, reorder, filtros, locale e revisão de sprites;
  `capturedAtMs` de resumo atualizado por tick **não** é revisão de histórico.
  Sem acesso a IndexedDB interno; (c) virtualização
  acessível da lista visível caso o custo seja DOM/paint, preservando acesso
  integral a H linhas, scroll/filtros, navegação por teclado e cópia.
- **AC-003 (consumidor atual):** todos os H eventos efetivamente **publicados**
  chegam intactos ao Cards (hoje H<=32 pela API v1). As fixtures H=1.200/10.000
  verificam somente tolerância a uma futura fonte aditiva. A inclusão de evento
  não remonta linhas antigas, não perde raridade/IV/sprite/tempo relativo nem
  altera Summary. Medir p50/p95/heap, cópias e bytes/seg, separando H=32 de
  H sintético grande; aprovar uma otimização somente se a redução do gargalo
  medido superar a variação determinada na 001, sem regressão de memória,
  filtro, acessibilidade ou ordenação. Histórico integral da Hunt depende de
  especificação adicional no Analyzer, não deste critério do consumidor.
- **Gate:** alterações no repositório Analyzer exigem tarefa e QA próprios;
  a evolução pública mantém compatibilidade do protocolo existente. A etapa
  de virtualização só avança com contrato UX/A11y/Visual e revisão explícita
  dos testes que hoje exigem 1.201 linhas DOM materializadas: a identidade dos
  nós **visíveis** pode ser preservada sem manter todos H nós montados, mas
  deve existir acesso integral por filtro, posição de scroll, teclado,
  foco/ARIA/leitor de tela e cópia. `overflow: hidden`/clipping sozinho não é
  virtualização. Testar H=0/32/1.200/10.000 com append, edição intermediária,
  truncate/reset, duas sessões com o mesmo tamanho, locale, filtros combinados,
  sprite revision, navegação/scroll e `getSummary` sempre retornando clones.

### CW-PERF-004 — observer e capacidades

- **Hipótese:** observer único em `src/core/observer.js:1-33` coalesce para
  um rAF, mas `src/core/bootstrap.js:13-38` reconcilia módulos e
  `coupled-workspace/index.js:8-10` chama `sync()`; este pode reler
  Analyzer e recalcular capabilities mesmo sem mudança útil. Outras entradas
  de reconcile incluem `preferences.subscribe`, evento `ppbui:card-mode-change`
  (`bootstrap.js:51-60`), ação `openSurface` (`controller.js:404`) e o tick
  de Analyzer. O filtro do observer central só contempla childList,
  `hidden`, `disabled`, `aria-hidden`, `aria-disabled` e `lang`; **não** cobre
  automaticamente `data-menu-id`, `aria-label`, `style` nem `characterData`.
- **AC-004:** assinaturas de capacidades permanecem corretas, com ACK e
  retry de 750 ms preservados (`controller.js:324-350`); nenhuma perda de
  nova toolbar nativa, sem novo observer, sem mensagens extras no steady state,
  cleanup e troca de documento seguros. Comprovar redução **mensurável** de
  `getSummary`/render desnecessários, custo de callbacks e reconciliações,
  quando presentes na baseline, por contadores de callback/rAF/bytes, com
  denominadores/limites fixados na 001. Exercitar 1.000 alterações sintéticas
  de `hidden/disabled`, 100 substituições de toolbar, in-flight ACK, rejeição,
  timeout e `requestId` fora de ordem. Se seleção causal depender de atributos
  atualmente não observados, especificar cobertura adicional **no mesmo
  observer** e provar ausência de falso negativo, não pressupor eventos novos.
- **Dependência de medição:** não gastar esforço caso 001 mostre observer
  irrelevante frente ao histórico ou ao navegador.

### CW-PERF-005 — persistência e Game Dock WinForms

- **Hipótese:** `GotFocus` → `SetActiveProfile` (`CoupledWorkspace.cs:4317-4329,
  2709-2742`) grava configuração mesmo se a conta ativa não mudou;
  `WorkspaceSettingsStore.cs:46-78` serializa/grava/substitui arquivo
  sincronicamente. O mesmo evento chama `UpdateCommandDeck` →
  `UpdateGameDock`, que reconstrói o menu `Overflow` (`:1493-1625`).
- **Mudança candidata:** dirty checking para mudanças reais; salvar o estado
  final de shutdown como hoje; menu calculado por assinatura de
  perfil/capabilities/favoritos e diff pontual, nunca fechar menu aberto
  por atualização que não muda seu conteúdo.
- **AC-005:** foco repetido na mesma conta produz zero writes e zero
  reconstruções de menu **quando nada mudou**, mas atualiza destaque de foco
  de modo correto; queda de latência/IO comprovada em fixture. Nenhum evento
  perde teclado, tooltips, ARIA, seleção, Recover, favoritos ou persistência
  em encerramento e falha de disco. **Fault injection obrigatório:** falha
  de `File.Create`/`Flush`/`File.Replace` durante `CompleteShutdown`
  (`CoupledWorkspace.cs:1063-1084`) não pode impedir `pane.Dispose()`,
  descarte de tooltips/timers e fechamento. Requer `try/finally` ou mecanismo
  equivalente de limpeza; flush de estado dirty continua com diagnóstico
  honesto, sem reentrada na UI durante teardown.

### CW-PERF-006 — bounded pending bridge

- **Risco:** `OpenGameSurface` acumula um `PendingWorkspaceRequests` por clique
  (`CoupledWorkspace.cs:1732-1766`); remoção normal depende de resposta ou
  navegação (`:2254-2292`; `AccountPane.cs:54-59`). Página silenciosa pode
  manter pendências até mudar de documento.
- **AC-006:** política finita de timeout/cota por pane, neutralização de
  respostas tardias e preservação do último comando explícito; nunca
  reexecutar automaticamente navegação/ação nativa, não reorientar outra
  conta nem aceitar resposta de documento antigo. Validar 1/100/10.000
  eventos sintéticos silenciosos e encerramento durante requisição.

### CW-PERF-007 — experimento multi-profile WebView2

- **Decisão proposta para PoC, NÃO para migração:** um
  `CoreWebView2Environment` com `CoreWebView2Profile` / controller options
  distintos por conta, **somente sob pasta temporária de teste** e dados
  sintéticos. O SDK pinado `1.0.4191.47` expõe `ProfileName` nas controller
  options, mas a existência da API **não prova** economia de processos nem
  equivalência de dados. Comparar com duas UDF separadas e manter
  feature flag/rollback.
- **Obrigação fail-closed:** criar `CoreWebView2ControllerOptions` com
  `ProfileName` explícito e distinto **para cada pane**, configuração
  InPrivate prevista e verificação da identidade efetiva
  `CoreWebView2.Profile.ProfileName` **antes de navegar**. O overload atual
  `EnsureCoreWebView2Async(environment)` de `AccountPane.cs:86` usa o perfil
  padrão: reutilizá-lo com Environment compartilhado misturaria contas.
  Falha/indisponibilidade da API aborta a PoC, sem fallback silencioso.
- **AC-007:** demonstrar por API e fixtures que cookies, storage, IndexedDB,
  credenciais, cache e perfil de navegação continuam segregados mesmo na
  **mesma origem permitida**; comparar CPU, memória/árvore de processos,
  cold/warm init, login de teste sintético, recovery, crash de renderer,
  **falha do browser process compartilhado** e fechamento. Comparar domínio
  de falha: processos compartilhados podem afetar simultaneamente os dois
  panes, mesmo com armazenamento independente. Reportar custo do processo
  principal compartilhado sem atribuí-lo duas vezes.
- **Decisão posterior:** só projetar migração de dados reais se benefício
  justificar risco, compatibilidade SDK/Runtime for demonstrada e Product
  Owner aprovar estratégia de backup, reversão e login. **Nunca** copiar
  UDF ou cookies atuais automaticamente, nem apontar duas contas para um
  mesmo perfil. Isolar PPTools InPrivate da proposta.

### CW-PERF-008 — cold start e política Single/Dual

- **Hipótese:** os dois `EnsurePaneAsync` no Dual são sequenciais
  (`CoupledWorkspace.cs:3887-3897`); Single descarta o pane inativo e Dual o
  recria (`:4000-4079`); Focus só colapsa painel (`:4230-4264`).
- **AC-008:** comparar inicialização sequencial vs pré-preparação segura na
  thread apropriada, com CPU de pico e p95 de READY, mais 20 ciclos de
  Single/Dual. Não usar `Task.Run` em controles UI nem manter pane oculto
  indefinidamente só para melhorar tempo de troca; não modificar sem acordo
  o significado atual de Single e seu custo menor de memória.

### CW-PERF-009 — ferramentas opcionais

- **Escopo:** PPTools background é opt-in e cria WebView2 temporário isolado,
  com até dois bootstraps simultâneos (`PptoolsBackgroundExecutor.cs:28-40,
  219-257`); evidence probe habilita CDP/Network só no modo diagnóstico
  (`CoupledWorkspace.cs:3819-3826`).
- **AC-009:** nenhum custo PPTools/CDP no host normal quando desativado;
  contagem de processos e limpeza após execução opcional; se surgir gargalo,
  otimizar somente esse caminho sem compartilhá-lo com UDF/credenciais de conta.

### CW-PERF-010 — integração/release

- **QA independente:** Architecture & Integration Lead aprova contratos de
  polling, compartilhamento de perfil, lifecycle e persistência antes do
  código; revisor técnico read-only testa casos adversariais de
  performance/correção; UX/A11y e Visual Regression quando aplicáveis.
- **Comprovação:** tabela baseline vs candidato por cenário com hashes,
  CPU/RAM/GPU/processos, JS p50/p95, READY p50/p95, DOM/H,
  exceções/timeout, e ganhos *ou ausência deles*. Sem números presumidos.
- **Publicação:** candidate seguro isolado, test suite + build + WebView2
  synthetic smoke + shutdown during init/switch + `git diff --check`.
  Sem alteração do host normal, sem merge na `main` ou tag até autorização
  específica e validação do Product Owner no jogo. Os testes não-game não
  equivalem a validação live.

### CW-PERF-011 — quatro contas (projeto separado)

O host registra apenas Rhyxus/Rhyosa (`WorkspaceModels.cs:47-99`); executar
ou duplicar hosts sobre os mesmos UDFs **não** representa quatro contas
isoladas. Antes de suportar quatro perfis, definir identidade, UDF, layout,
CPU/RAM esperada, escalonamento de panes, interação ativa única, recover,
segurança e novas evidências. Sem conclusão de performance baseada numa
extrapolação linear de Single/Dual.

## 5. Ordem, checkpoints e rollback

```text
baseline 0.2.124 (main, imutável)
   |
   +-- 001 instrumentar + medir -> aprovação de hipóteses prioritárias
   |      |
   |      +-- 002 Cards oculto ---- 003 histórico ---- 004 observer (se necessário)
   |      |
   |      +-- 005 foco/IO/menu ---- 006 pending bridge
   |      |
   |      +-- 007 multi-profile (PoC isolada)
   |      +-- 008 cold-start (independente; comparar com 007 na decisão)
   |      |
   |      +-- 009 PPTools/CDP (somente se resultado apontar)
   |
   +-- 010 gates independentes + delta de performance + PO live
   |
   +-- commit/push/merge/promoção APENAS por autorização explícita

011 quatro contas = iniciativa futura independente
```

**Rollback por task:** cada candidato conserva artefato anterior e parâmetro
opt-in/feature flag quando necessário; ao falhar em correção, degradação ou
isolamento, descartar candidato sem editar UDFs reais. Cada task começa com
critério AC e termina com resultado registrado; tarefa cujo custo não se
confirme na 001 pode ser encerrada como **não justificada** (sem alteração).

## 6. Estado da iniciativa

- **CW-PERF-003 / CW-PERF-005, continuação de 2026-10-01:** 003 teve a
  hipótese H=1.200/10.000 reclassificada como estresse do consumidor porque
  o Analyzer público real retém `specialHistory` H<=32; contrato ampliado
  exige projeto aditivo específico. A 005 possui implementação em C# e tupla
  sintética congelada (`docs/PM_GATE_2026-10-01_CW-PERF-005.md`): core e visual
  smokes locais PASS, QA independente TECH PASS WITH GAP, Visual/UX READY
  somente para estados sintéticos capturados. Não há A/B pareado de CPU,
  nem prova de fault injection no save *durante CompleteShutdown*, nem bundle
  combinado com a 002; **sem handoff de release/PO até fechar os gates**.
- Auditoria estática C# + frontend independente: concluída, sem benchmark live
  nem vazamento de memória demonstrado.
- Baseline **parcial sintética executada** (`CW-PERF-001`): tuplas EXE+JS+DLL
  congeladas com SHA externo, C# `--perf-metrics` somente com smoke sintético,
  30 cenários JSDOM ×100 iterações por cenário, H→H+1/middle-edit/reset,
  25/25 execuções separadas de 100 eventos do observador após corrigir
  apenas o timestamp do fixture, e cinco fresh-UDF + cinco reused-UDF
  **core-only** sintéticos na mesma tupla (10/10 PASS; não equivalem a boots
  com cache de SO frio). O smoke visual **completo** continua independente e
  exibiu duas falhas funcionais em repetição, preservadas na evidência.
  O smoke posterior do fixture corrigido passou em 20/20 execuções completas
  numa mesma tupla congelada. Uma variante sintética específica confirmou
  20 ciclos de lifecycle WebView2 e 20 de Focus/Restore de layout dentro da
  mesma instância em três execuções completas, preservando como falha histórica
  o primeiro teste que esgotou o watchdog de 12 segundos; o watchdog da variante
  longa foi delimitado e a invocação requer timeout externo explícito.
  O DOM completo H=10.000 foi comprovado com 100 amostras por cenário em
  quatro processos Node separados; screenshots sintéticos representativos
  receberam revisão visual independente, com um P2 preexistente de badge
  Shiny estreito ainda registrado. Depois de corrigir o caminho dos marcadores
  e a seleção por painel, as medições de idle Cards/Cards e Game/Game com
  600 segundos efetivos passaram em duas campanhas congeladas, com 125
  amostras por modo e zero filhos sobreviventes. Uma terceira tupla congelada
  provou também o cenário misto Cards à esquerda/Game à direita por 600 s
  (125 amostras, sem filhos sobreviventes). Um experimento adicional e
  estritamente sintético com eventos reais `GotFocus` falhou no primeiro
  ciclo por falta de ownership estável; seu código foi revertido, mantendo
  o relatório negativo. Os dados e lacunas estão no PM Gate. Ainda não há
  evidência de economia de CPU/RAM no jogo real; naquele checkpoint anterior
  ainda estavam abertos os 20 eventos efetivos de GotFocus, a revisão
  independente e a validação em jogo pelo Product Owner. O primeiro desses
  itens recebeu confirmação sintética na continuação abaixo.
- O auditor **somente leitura** `Audit-FrozenIdleEvidence.ps1` confirma hashes
  externos, identidade do modo/host, duração monotônica, continuidade da
  coleta e critérios de falha fechada nos três relatórios preservados.
  Cenários negativos com hash inválido, modo incompatível e o histórico de
  600 s com zero amostras foram rejeitados. A configuração `SampleMs=1000`
  define o descanso entre sondagens; o intervalo efetivo médio observado é
  aproximadamente 4,82 s, não 1 s. Esse limite passa a ser explícito.
- Uma segunda tentativa experimental de foco pelo método oficial do SDK
  `CoreWebView2Controller.MoveFocus(Programmatic)` também falhou no primeiro
  ciclo da janela sintética oculta, desta vez sem callback WinForms efetivo.
  O candidato e o relatório negativo ficaram preservados na campanha isolada;
  a extensão experimental foi integralmente revertida do código de trabalho.
  A abordagem seguinte utilizou **somente páginas locais** em uma janela
  sintética brevemente visível, 20 eventos reais e callbacks finalizados
  com ownership por painel, sem contar mudanças de Focus/Restore de layout.
- **Nova correção com evidência (2026-10-01 UTC):** o `LostFocus` do wrapper
  WinForms ocorria quando o próprio filho nativo do WebView2 assumia foco
  (`View.ContainsFocus=true`), apagando indevidamente a identidade do painel.
  Um guard estrito para reter owner somente nessa condição passou em 20/20
  eventos reais com handler concluído e owner confirmado, repetido em tuplas
  congeladas. O blur real de retorno à toolbar limpa owner corretamente
  em todos os ciclos e ao final. O benchmark final reportou `FocusHandling`
  com `n=20`, média **4,201 ms** e p95 **8,918 ms** — apenas para aquela
  execução local, sem extrapolar latência ou comportamento em jogo.
- **Três novos idles do mesmo binário congelado naquele checkpoint**
  (host SHA `5EA4E21F…`, anterior ao ajuste `Deactivate`): Cards/Cards **600,011 s**
  com 128 amostras úteis, Game/Game **600,010 s** com 115 e Cards/Game
  **600,015 s** com 122. As três campanhas são sequenciais, isoladas,
  congeladas por hash, sem timeout ou descendentes sobreviventes e passaram
  o auditor read-only. Uma checagem dedicada de preflight confirmou os três
  modos e rejeitou uma raiz Cards ausente na tela Game, eliminando o false
  PASS no preflight anterior. Esses dados **não** provam ganho de CPU/RAM.
- **Foco fora do host, complemento necessário:** o teste sintético descobriu
  que a saída para outra janela podia deixar o owner do WebView2 antigo
  selecionado; a guarda de `LostFocus` sozinha não basta nesse caso porque
  o foco já havia migrado para o filho Chromium. Uma callback de
  `WorkspaceForm.Deactivate` limpa somente o indicador de foco, sem mudar
  a conta selecionada nem controlar o jogo. Em candidato congelado mais
  recente (`3D427795…`), 20/20 eventos reais, blur para toolbar, blur para
  uma segunda janela **local** e preflight dos três modos passaram, assim
  como smoke visual/core/shutdown. A medição de `FocusHandling` nessa execução
  possui `n=21` (20 eventos solicitados + 1 incidente real de reativação),
  média 3,095 ms e p95 4,007 ms, sem garantia fora da fixture. As três
  medições longas de idle não devem ser reapontadas ao candidato mais novo.
- **Gate de autor:** baseline sintética e foco real local têm prova positiva;
  smoke visual/core/shutdown, npm e negativos de integridade passam. Ainda
  faltam **Technical QA independente** para o conjunto final e validação
  **exclusiva do Product Owner em jogo** do guard nativo de foco. Não declarar
  a performance nem o release READY com base apenas na fixture local.
- Tasks 002–011: **planejadas; não implementadas**.
- Escrita/commit/push/merge da implementação e promoção do host: **não realizados**.
- Visual e teste de jogo pelo Product Owner: **não realizados nesta iniciativa**.

### Aceite funcional do PO — 2026-10-01 UTC

O Product Owner validou em sessão interativa o candidato congelado de foco
`cwperf001-final-focus-all-20261001` (EXE SHA-256
`3D42779501B1FA08673E0D05C9EBF91550051AFF3E4E840D2E205E3080B3B9F2`)
e confirmou literalmente: **"Ok, validado. Nenhum comportamento fora do esperado."**
O item **validação funcional do PO neste candidato** passa a **aceito**;
as linhas anteriores representam o checkpoint histórico antes dessa
confirmação. Ainda não constitui benchmark de desempenho real, parecer
independente de Technical QA, autorização de commit nem promoção do host.
As três evidências anteriores de 600 s pertencem ao host `5EA4E21F…`,
não ao executável `3D427795…` validado pelo PO.

### Continuação CW-PERF-002 — Game sem apresentação do Cards

O fechamento **sintético** de CW-PERF-001, incluindo o gate e a tupla final
congelada, permanece documentado em `docs/PM_GATE_2026-09-30_CW-PERF-001.md`.
Com a baseline preservada, CW-PERF-002 ganhou implementação e regressões no
branch de trabalho: Game estável deixa de consultar/sanitizar/renderizar a
apresentação do Analyzer; Game→Cards lê um resumo público novo e renderiza o
estado real ou unavailable antes de revelar o painel. O observer central
passa ao módulo a origem opcional do reconcile para dispensar apenas o frame
redundante gerado pela própria transição, preservando `app.reconcile()`
explícito, o tick de 1.000ms e as capacidades nativas.

O baseline anterior H=32/1 pane/100 ticks fez **100** leituras de `getSummary`
em Game; o novo código fez **0/100**. Em 100 eventos efetivos do observer,
com 10.100 mudanças de `disabled`, também fez **0** leituras e continuou
enviando 100 capabilities updates. Isto comprova somente supressão do custo
de apresentação em fixtures Node/JSDOM, não redução percentual no jogo real.
A tupla create-only `cwperf002-hidden-cards-20261001` congela o mesmo host
`8B40B6…` com novo Better UI `0ABB33…`; 47 screenshots sintéticos completos,
suíte inteira e revisão independente passaram nos respectivos escopos.

**Status:** `TECH CANDIDATE`, `TECH PASS WITH P2` para escopo JS e
`VISUAL READY` apenas para fixture sintética; release **NOT READY** até
decisão sobre correlação de mensagens `set-view` atrasadas do host (não
autenticáveis pelo protocolo atual) e validação exclusivamente pelo PO
da nova tupla no jogo. O relatório detalhado, hashes, condições e riscos
estão em `docs/PM_GATE_2026-10-01_CW-PERF-002.md`.

### Retomada e fechamento da campanha sintética — 2026-10-01 UTC

- O candidato congelado posterior `cwperf001-focus-race-full-20261001`
  (EXE SHA `8B40B6B69E486B8E835E6CC0F09BDFDC05F77E92ECCBA60636EE4D7B117DD035`,
  manifest SHA `0D4A25B6ACEB844ACC01EE05091819B3E674C2DDA202BD830EED860C6D2DAC19`)
  acrescenta uma checagem real de foco após adquirir o mutex assíncrono,
  fixture de callback `GotFocus` atrasado após blur, e smoke visual local
  opt-in de 60 s. QA técnica independente do diff de C# **sem P0/P1/P2**;
  foco real 20/20, race, preflight, full visual sintético (47 screenshots),
  core e shutdown com PASS na tupla congelada. O watchdog normal continua
  12 s; não extrapolar resultado do modo estendido para sua confiabilidade.
- Na **mesma fonte binária**, três execuções sequenciais de idle 600 s —
  Cards/Cards, Game/Game, Cards/Game — passaram na auditoria com hashes
  externos por arquivo, origem de CPU após READY, 93/74/78 amostras numéricas,
  cobertura real de 596,590/591,493/593,738 s, nenhuma lacuna superior a
  30 s e zero descendentes sobreviventes observados. Os relatórios brutos,
  hashes exatos e resultados constam do PM Gate; dois usam a versão inicial
  BFC5EFAA do coletor, o terceiro usa 68F2E021. Os arquivos desses coletores
  foram preservados no diretório de evidências ignorado pelo Git.
- A QA do coletor descobriu P1 de reuso de PID no encerramento. O código atual
  vincula nascimento/ancestralidade na descoberta, revalida o PID e termina
  por `SafeProcessHandle` nativo mantido aberto entre `GetProcessTimes` e
  `TerminateProcess`; evita que o PID seja resolvido novamente depois de
  reutilizado. Fonte atual SHA
  `1E78DAA828AA638613EEC82DE858823B58FC377F13F8F919EE3E66DFFC717B43`:
  parecer independente **sem P0/P1, com P2 residual** de completude de
  relatório em exceções raras. Smoke sintético core na fonte atual PASS;
  timeout proposital em versão imediatamente anterior produziu falha
  explícita. A versão atual não substitui retroativamente os hashes
  coletados nas três campanhas de 600 s.
- Suíte Node completa, benchmarks específicos 11/11, negativos da tupla,
  parser PowerShell e `git diff --check` com exit 0. Os valores de CPU,
  memória privada e working set permanecem **estimativas do fixture**, com
  atribuição imperfeita de renderers criados/encerrados, páginas de RAM
  compartilhadas e ausência de GPU/memória residente única; nenhuma redução
  de consumo em comparação before/after foi demonstrada. O próximo salto
  para CW-PERF-002/005 exige escolher uma otimização independente e medir
  a diferença maior que o ruído, sem afirmar economia prévia.
- O PO aceitou **somente** o executável anterior `3D427795…`; este novo
  `8B40B6…` precisa de validação funcional própria pelo Product Owner antes
  de promoção. Gate global da iniciativa ainda **NOT READY FOR RELEASE**;
  candidatura sintética C# `TECH READY` no escopo revisado, visual humano
  ainda insuficiente e nenhuma alteração em host normal, dist, dados
  reais ou Git publicável.

### Checkpoint integrado final — CW-PERF-002 + CW-PERF-005, 2026-10-01 UTC

- **001** manteve a baseline sintética de três modos e a validação funcional
  prévia do PO estritamente limitada ao EXE `3D427795…`. A variante posterior
  `8B40B6…` e todos os candidatos integrados ainda não foram aprovados no jogo.
- **002** continua com supressão demonstrada de 100 para **0 chamadas** públicas
  do Analyzer em 100 ticks Game H=32 no JSDOM, sem alterar capacidades nativas.
  `set-view` sem nonce/revision no mesmo documento mantém AC-002-04 aberto.
- **003** segue adiada: a API pública v1 atual limita `specialHistory` a
  H<=32; cenários H=1.200/10.000 apenas exercitam tolerância do consumidor.
- **005** adicionou teste positivo de `Close -> FormClosed -> CompleteShutdown`
  que salva estado final real, inclusive razão geométrica recalculada a partir
  do splitter enquanto o modelo contém razão defasada; negativos Create/Flush/
  Replace provam cleanup após exceções sintéticas pré-I/O. A primeira tentativa
  v3 quebrou a regressão core por enum ampliado; a v5 corrigiu preservando
  o enum de três fases e a fixture positiva separada. AC-005-04 continua
  insuficiente para afirmar reação a erro de kernel e aviso visível em WinExe.
- **Tupla combinada create-only final:** `cwperf002005-final-positive-v5`,
  manifesto SHA `DE6C7A0E938C73E9E3943510F7126852F5256501BD72C82887481F282C8751EB`,
  host SHA `1CDAB6A5…`, Better UI SHA `0ABB3375…`, Analyzer SHA `0131E53D…`.
  Verify, core, shutdown-during-init, shutdown-during-switch e visual sintético
  com **47 PNG** passaram; relatório `combined-v5-visual-01.json` registra
  exit0, sem timeout e zero descendentes sobreviventes observados. O relatório
  de integração com proveniência, falha histórica v3, QA e limites está em
  `docs/PM_GATE_2026-10-01_CW-PERF-002-005_INTEGRATION.md`.
- **Sem claim geral de ganho:** os 23 rebuilds de Overflow em 90 atualizações
  do host novo e a referência 159/159 antiga não são fixtures pareadas;
  não demonstram redução causal de CPU/RAM/latência. Faltam A/B controlado,
  fechamento de protocolo/UX/Visual não cobertos e validação do PO no candidato
  exato. `main`, executáveis normais, scripts `dist/`, UDF reais e Git publicável
  continuam intocados. **Iniciativa NOT READY FOR RELEASE.**

### Checkpoint posterior — protocolo estrito e recuperação sintética v14

- A preocupação de `set-view` atrasado apontada no checkpoint v5 recebeu um
  contrato host+adapter correlacionado por sessão/documento, epoch, ordinal,
  `capabilitySeq` e `viewRevision`. Um pacote misto host novo/bundle antigo
  falha fechado; o bundle novo mantém apenas o fluxo legado quando o marcador
  do host antigo não anuncia a correlação.
- O host também testa um cancelamento real de `NavigationStarting` com
  `NavigationCompleted` malsucedido: só recupera a sessão quando o probe prova
  que **o mesmo documento** sobreviveu, sem reativar ações nativas pendentes.
  Em erro de página ou identidade incerta permanece offline. Repetições de
  `NavigationStarting` com o mesmo NavigationId (redirect) mantêm o snapshot.
- `resync-capabilities` limita tentativas do host a 3 retries de 750 ms e
  invalida timers de geração anterior. A fixture sintética v14 demonstrou
  **duas falhas e recuperação na terceira postagem**, além de **quatro falhas
  consecutivas, parada limitada offline e recuperação explícita posterior**.
- O candidato integrado create-only
  `cwperf002005-view-epoch-final-v14`, manifesto SHA
  `8627D2E67C3CAB2336B6672B58B3C9F34944DDA8C7B821804213544DBC9699BD`,
  host SHA `CB94BE88…` e Better UI SHA `F945D87E…`, passou Verify, core,
  close-during-init, close-during-switch e smoke visual sintético com 47 PNG.
  `npm test` exit0; regressões de benchmark 13/13, JS correlação 14/14.
  Gate e limites em `docs/PM_GATE_2026-10-01_CW-PERF-002_VIEW_CORRELATION.md`.
- Recurso live, comparação A/B pareada de CPU/RAM, Overflow aberto durante
  atualização, falhas reais de disco e navegações simultâneas não cobertas
  continuam pendentes. A `main` e artefatos compartilhados permanecem intactos.
  **NOT READY FOR RELEASE** até os gates e validação exclusiva do PO.

### Checkpoint de entrega sintética — v15 / Better UI 0.2.125

- O Technical QA do v14 identificou uma condição P2 na reinjeção de duas imagens
  do adapter no mesmo documento: probe de recuperação substituído antes do ACK,
  dois listeners e restauração incorreta de toolbar. A v15 implementa
  ownership por `Symbol.for('ppbui.coupled.active-adapter')` e cleanup do antigo
  antes de montar o novo. O novo teste JSDOM reproduziu RED e passou após a
  correção, incluindo timeout sem ACK e descarte de mensagens de montagem antiga.
- Tupla imutável `cwperf002005-view-epoch-po-0125-v15`, manifesto SHA
  `677CCD429053E1048D6DE33CD4CCCF0B9631C80A4D6D4789386EC37FDD93639F`,
  host SHA `CB94BE88…` (mesma fonte C# v14), Better UI `@version 0.2.125`
  SHA `1ACD6BDA…`, Analyzer SHA `0131E53D…`. Verify **6/6**, core/init/switch,
  JS correlação **15/15**, Game/Cards **14/14**, benchmarks **13/13** e suíte
  Node completa PASS. Visual estendido gerou **47 PNG idênticos à v14**; Visual
  QA independente declarou `VISUAL READY` nos estados estáticos observados,
  sem P0/P1/P2 novos, mas `VISUAL EVIDENCE INSUFFICIENT` para Overflow aberto
  durante transição e hot reinjection em movimento.
- Tech QA independente do delta v15: zero novos P0/P1; o caso nova→nova foi
  corrigido. Sobreposição de imagem antiga v14→nova, reentrância síncrona no
  mount e navegações distintas simultâneas continuam limites de prova e devem
  ser avaliados somente se fizerem parte do cenário de implantação.
- A versão nominal do userscript foi avançada sem alterar o `dist/` de produção,
  executável normal, `main`, UDF ou dados de usuário. Este é um **candidato
  diagnóstico pré-live**, ainda **NOT READY FOR RELEASE**. Métricas A/B pareadas,
  estado Overflow dinâmico, falhas físicas de Save e aprovação no jogo
  permanecem abertos sob o Product Owner; gate e hashes em
  `docs/PM_GATE_2026-10-01_CW-PERF-002_VIEW_CORRELATION.md`.

### Checkpoint posterior — transferência de foco v16

- Durante QA UX da v15, o cleanup de Cards focado deixou `activeElement` em
  `body` porque removia o DOM antes de transferir o foco. O teste reproduziu
  RED e a correção em `controller.js` executa `restoreStandaloneToolbar()`
  antes de `cards.cleanup()`, com asserts de foco no botão nativo tanto na
  substituição A→B quanto no cleanup B. O teste e a suíte completa passaram.
- **Candidato ativo pré-live:** `cwperf002005-view-epoch-po-0125-v16`, manifesto
  `1A4D3AEE45F49F835C082B46EA0E675C2568C3FB4ED8BC9CD62A070921ECF7D1`,
  host congelado `CB94BE88…`, Better UI `0.2.125` SHA `5B13FA91…`, Analyzer
  `0131E53D…`. Verify 6/6, core/init/switch, Node completo, correlação 16/16,
  Game/Cards 14/14, benchmarks 13/13 e visual sintético 47 PNG PASS; todos
  os PNG v16 são byte-idênticos aos da v15. Technical/UX source QA do delta:
  nenhum P0/P1/P2 novo; QA Visual independente v16 `VISUAL READY` para os
  estados estáticos observados, com Overflow e foco em movimento ainda sem
  prova visual. Teste adicional JSDOM confirma reinjeção com toolbar sem
  botão disponível e foco transferido a landmark.
- Candidatos v14/v15 permaneceram históricos, sem instalar/publicar qualquer um.
  `@version` continua 0.2.125 porque ainda não houve entrega da nova versão.
  Os limites de Overflow aberto, foco em transição não capturada, I/O físico,
  performance A/B e aprovação no jogo continuam documentados no gate principal;
  **NOT READY FOR RELEASE**.

### Checkpoint visual posterior — Overflow v17

- A fixture WebView2/WinForms capturava somente a árvore de controles;
  o `ContextMenuStrip` nativo fica em popup separado e não aparecia nos
  47 PNG da v16. O host v17 adicionou apenas prova sintética de popup
  isolado e dock+menu aberto, reorder sem fechar e capability revogada;
  nenhum caminho produtivo do host/Better UI foi alterado por esse delta.
- **Candidato sintético atual:** `cwperf002005-view-epoch-overflow-po-0125-v17`,
  manifesto `58FD979F32F02FB6C6D0D63BEBB314E786E1A5D662E21BD4E865672660600FD7`,
  host `709F0010…`, Better UI `0.2.125` **mesmo SHA v16 `5B13FA91…`**.
  Verify 6/6; visual 51 PNG, 4 novos do Overflow; QA visual independente
  `VISUAL READY` restrito aos estados fotografados, zero novos P0/P1/P2
  visuais observados. Core inicial com timeout sob testes concorrentes
  foi preservado como negativo; reexecução isolada exit0 e marker PASS;
  close-init/switch, JS 16/16, Game/Cards 14/14 e benchmarks 13/13 PASS.
- Overflow teclado/ESC, resize, offline, mudança de perfil e catálogo com
  vários itens continuam com evidência visual insuficiente. CPU/RAM não foram
  comparados em A/B pareado; o visual v17 executa mais passos do que v16.
  Somente PO pode observar/aprovar in-game. `main`, `dist/` compartilhado,
  executável normal e contas reais seguem inalterados; **NOT READY FOR RELEASE**.

### Checkpoint de semântica Cards B — v18

- PO confirmou Single/Dual, Cards/Game, Overflow e persistência na v17,
  mas detectou Cards sem identidade do alvo em login direto. Foi constatado
  que a headline CURRENT do Analyzer representa **última espécie da sessão**
  (pode estar terminada), diferente de `getSummary().currentTarget`
  (**encontro atualmente observado**). PO escolheu opção **B: estritamente live**.
- Em `0.2.126` o target é derivado somente do snapshot live `running`.
  Cache de último target e qualquer zona/sprite do Atlas foram retirados;
  terminal/paused/waiting limpam a ficha, sem iniciar Hunts ou reutilizar
  histórico. Teste RED→PASS do bug mais regressão de arte nativa tardia.
- Par atual de QA sintético `cwperf002005-strict-live-po-0126-v18`,
  manifesto `106D86E4A8BE1BADECC5FB8C5AEE034F8EF905FD5C2A5AD8ACDA862E6BC20DE6`,
  Better UI SHA `8584E8E7…`, host SHA `709F0010…` idêntico à v17.
  Verify/core/init/switch/visual 51 PNG e testes Node passam;
  **live-v18 do PO pendente**, independente pós-patch/revisão de transições
  dinâmicas ainda insuficiente. Sem A/B CPU/RAM nem promoção a release.

### Checkpoint Cards CURRENT sessão A — v19, supersede B

- PO revogou B às 16:54 e escolheu A: a identidade principal do Cards segue
  `latestSpeciesEncounter` **somente** das rows da sessão CURRENT (inclusive
  encontro já terminado ou sessão pausada após login), e não History antiga,
  marcador Atlas nem ação no mapa. `getSummary().currentTarget` continua
  semanticamente distinto, permitido apenas para um encontro live confirmado.
- Analyzer `userscript/public-summary.js` fornece o novo campo público bounded
  `currentSessionSpecies` sem expor registros crus, IDs de sessão ou um novo
  protocolo. `main.js` memoiza o seletor por revisão de encontros. Cards
  `0.2.127` exibe `ALVO` e atributos completos somente na presença de
  `currentTarget` live; na sua ausência exibe `ÚLTIMO DA HUNT` com nome e
  eventual sprite nativo da espécie, mas sem inferir nível/raridade/Shiny/tipos.
  Uma nova Hunt vazia mostra `Aguardando alvo`; Expedição running não exporta
  uma espécie de Hunt via esse campo. O repositório fonte do Analyzer foi
  alterado e testado, mas somente o embed **da tupla isolada** foi compilado.
- Tupla selecionada `cwperf002005-current-session-po-0127-v19`, manifesto
  `C8A18B1977959D53C435E9AE1713DB1FC5AA492DF28DE9133FF5A329DD004290`,
  host SHA `709F0010…` (v17/v18), Better UI SHA `9A57AEE1…`, Analyzer embed
  SHA `603A38F1…`. Verify 6/6, proveniência Analyzer 100/100 e Better UI
  7/7, testes Node integrais, cold embed de duas sessões, Cards 66/66,
  benchmark 13/13, core/close/visual 51 PNG sintéticos PASS. 49/51 PNG iguais
  à v18 por hash; nenhum render cobre o **novo fallback last-seen**.
- Gate de validação exclusiva do PO ainda **pendente para esses bytes**;
  falta evidência dinâmica/235 px de `ÚLTIMO DA HUNT` e QA independente
  pós-patch. Os quatro cenários gerais já informados na v17 não constituem
  aceite da mudança v19. Preservados `main`, EXE normal, `dist/` comum, todas
  as tuplas anteriores e worktrees não commitadas. **NOT READY FOR RELEASE**.
