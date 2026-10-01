# CW-PERF-002 — suspender apresentação oculta do Cards em Game

**Estado:** TECH CANDIDATE / escopo sintético verificado, gate de release ainda aberto.
**Branch:** `plan/coupled-webview2-performance`; mudanças anteriores de CW-PERF-001 permanecem preservadas.
**Referência funcional aprovada pelo PO:** Better UI `0.2.124`, commit `542af02eab23e68b32c6df896fe20c07ae1408dc`; aceite do host de foco `3D427795…` limita-se ao comportamento observado naquele binário.
**Baseline sintética:** CW-PERF-001 documentada em `docs/PM_GATE_2026-09-30_CW-PERF-001.md`, sem atribuição de ganho ao jogo real.

**Atualização posterior (2026-10-01):** a lacuna de `set-view` sem correlação
registrada em **AC-002-04** na matriz histórica abaixo foi implementada e
verificada **sinteticamente** no par exato atual
`cwperf002005-view-epoch-po-0125-v16` (`@version 0.2.125`, manifesto
`1A4D3AEE…`). A v14 precedente revelou uma condição P2 de reinjeção
simultânea no mesmo documento, corrigida e coberta por teste RED→PASS na v15;
um P2 adicional de foco ao remover Cards foi reproduzido e corrigido na v16.
O gate detalhado, os testes de replay, cancelamento de navegação, resync,
reinjeção, foco e os limites estão em
`docs/PM_GATE_2026-10-01_CW-PERF-002_VIEW_CORRELATION.md`. O aceite no jogo
continua pendente, sem mudança da baseline `main`.

**Checkpoint posterior:** a tupla selecionada para evidência sintética é agora
`cwperf002005-view-epoch-overflow-po-0125-v17` (manifesto `58FD979F…`):
o Better UI `@version 0.2.125` preserva o SHA da v16; somente a fixture C#
captura novos estados visuais do Overflow aberto/reorder/revogação. O core
isolado e os smokes de shutdown passaram; o primeiro timeout concorrente está
documentado, sem atribuição definitiva da causa. Ver gate de correlação.

## Escopo e ownership

O PM define este contrato. Um único Feature Engineer é dono de `src/modules/coupled-workspace/controller.js` e das regressões correspondentes. Architecture & Integration Lead aprova o isolamento entre polling de apresentação, host e Analyzer; Technical QA faz revisão independente em modo read-only. UX/A11y e Visual Regression QA são ativadas apenas se a implementação alterar o comportamento visível de retorno ao Cards ou sua apresentação de falha. Nenhum outro módulo ou protocolo do Analyzer será modificado.

### Acceptance & Evidence Matrix

| ID | Critério observável | Preservar | Evidência / revisor | Estado |
| --- | --- | --- | --- | --- |
| AC-002-01 | Em Game estável, inclusive após timers e reconciles redundantes, a apresentação não chama `getSummary`, não sanitiza resumo e não executa `cards.render`. | Analyzer autoritativo continua seu próprio ciclo sem API paralela. | Provider real instrumentado no JSDOM, `14/14` regressões novas e 100 eventos pelo observador central. Não há spy direto do render; ausência de chamada por esse caminho é demonstrada pelo guard do código. | `pass` sintético |
| AC-002-02 | Um pedido de Cards aceito pelo host lê **um** resumo novo no momento da transição, antes do primeiro render visível, e expõe o histórico completo atualizado durante Game. | `capturedAtMs` público com idade válida 0–3.000 ms; histórico integral, filtros e identidade por perfil. | Render escondido antes de revelar; um read na entrada e zero reads no primeiro evento do observador, mas timer e reconcile explícitos continuam lendo; H=1.201 e filtros preservados. | `pass` sintético |
| AC-002-03 | Resumo ausente, malformado, futuro ou com mais de 3.000 ms é renderizado como unavailable, jamais reaproveitado de antes do Game. | A mensagem existente de indisponibilidade e a ausência de dados inventados. | Relógio de teste avançado, fonte `null`, timestamp futuro/expirado, provider/renderer lançando exceção; fallback fecha Cards e restaura toolbar quando o render falha. | `pass` sintético |
| AC-002-04 | Set-view antes do ACK do host permanece Game; rejection, timeout, retry, troca de documento e cleanup não permitem apresentação de documento/perfil obsoleto. | Sequência e payloads do bridge, `750 ms` timeout/retry, sem cross-profile ou rede. | Antes do ACK, rejections, retry, remoção de handlers/remount e reentrância JS cobertos. **Host envia `set-view` sem nonce/epoch/ID**: mensagens válidas antigas atrasadas no mesmo documento ainda não são autenticáveis. | `evidence-insufficient` para garantia estrita same-document |
| AC-002-05 | Durante Game o catálogo nativo de capabilities continua refletindo `hidden`, `disabled` e toolbar substituída, inclusive com ACK pendente/rejeitado. | Handler nativo de ações e fallback do toolbar, um observador central. | 1.000 flips nativos, dispatch do botão nativo e 100 eventos observados com 10.100 mudanças e dez substituições de toolbar; ACK/timeout legado passa. | `pass` sintético |
| AC-002-06 | O ganho de chamadas inúteis e o custo de leitura/render por evento são demonstrados contra baseline sintética equivalente, com denominadores e limitações declarados. | Sem alegar ganho de CPU/GPU/memória real a partir de JSDOM. | Antes/depois H=32, um pane, 100 ticks, medição de provider/tick, mais 100 eventos de observer com 0 provider reads. `cards.render` e sanitização não são instrumentados diretamente. | `pass` apenas para custo de apresentação sintética |

## Hipóteses de falha

| Risco | Condição | Detecção |
| --- | --- | --- |
| R-01 | Polling é suprimido mas `sync()` do observer continua lendo Analyzer. | Mutar toolbar centenas de vezes em Game e contar provider/DOM. |
| R-02 | Ao voltar de Game, primeiro render reaproveita snapshot anterior com `capturedAtMs` válido à época. | Avançar relógio acima de 3.000 ms; testar atualização e indisponibilidade da API. |
| R-03 | Set-view e ACK chegam fora de ordem ou em documento substituído. | Set-view antes de ACK, ACK rejeitado/timeout, cleanup e remontagem; assert de ausência de escrita tardia. |
| R-04 | Otimização desativa capabilities ou bloqueia ações do host no Game. | Estado disabled/hidden/toolbar substituída, ACK retry de 750 ms e open-surface nativo. |
| R-05 | Otimização remove materialização integral do histórico ou destrói seleção de filtro. | H=0/32/1.200/10.000, append/edit/reset e retorno ao Cards; testes de filtro/scroll/ARIA. |

## Implementação e medição

- `src/modules/coupled-workspace/controller.js`: Game estável cancela consultas de apresentação, mantendo atualização das capacidades nativas; Game→Cards busca um resumo público atual e renderiza antes de mostrar. Timestamp inválido/ausente retorna indisponível. `viewSequence` cancela leitura de intenção superada. A falha de render fecha Cards, restaura toolbar nativa e agenda retry de capacidades. Nenhuma nova automação, relay, chamada de jogo, observador ou timer foi adicionado.
- `src/core/bootstrap.js` entrega aos módulos a origem opcional `observer`/`explicit`, reconhecendo só callbacks do observador central; `src/modules/coupled-workspace/index.js` repassa essa origem. Isso distingue o primeiro frame gerado pelo próprio Cards, que dispensa segunda leitura, de um `app.reconcile()` explícito, que deve continuar atualizando Pokémon/idioma/loot, e do tick de 1.000ms, que também deve ler normalmente. Outros módulos ignoram o parâmetro opcional.
- Regressão reproduzida antes da mudança: `test/coupled-workspace-hidden-mode.test.js` começou com **3/3 RED** para leituras ocultas. Versão final **14/14 PASS**; suíte legada conjunta de Coupled Workspace/DOM **80/80 PASS** após resolver um erro real de supressão indevida do reconcile explícito. Suíte total `npm test -- --test-reporter=dot` **exit 0** depois das últimas alterações; benchmarks `benchmark-cards` e `benchmark-reconcile` com regressões adicionais **PASS** (inclui 100 eventos reais do observer em Game com zero leitura). `node --check` e `git diff --check` **exit 0**, somente warnings LF/CRLF do Windows.

| Cenário JSDOM, H=32, 1 pane, 100 eventos | `getSummary` medido | p50 evento/tick | p95 evento/tick | Origem |
| --- | ---: | ---: | ---: | --- |
| Baseline antiga, Game, 100 ticks manuais | 100 | 2,9512 ms | 10,8769 ms | `cards-synthetic-100-clock-fixed.json`, SHA `8D7CCE47…` |
| Implementação final, Game, 100 ticks manuais | **0** | 0,0013 ms | 0,0021 ms | `cwperf002-final-adapter-h32-100.json`, SHA `5F365F8E…` |
| Implementação final, Cards, 100 ticks manuais | 100 | 12,1546 ms | 15,453 ms | mesmo relatório final; sem alegação de melhora desse modo |
| Implementação final, Game, 100 bursts pelo observador central | **0** | 0,5188 ms | 1,98 ms | `cwperf002-final-observer-game-100.json`, SHA `F947FB5C…` |

No último cenário, os 100 bursts produziram **100 reconciles/rAF e 100 capabilities packets** para 10.100 alterações de `disabled` e 10 substituições da toolbar. Os números medem Node/JSDOM em rodadas separadas, com GC/JIT/threads não pareados: **não são percentuais de economia de CPU/RAM nem p95 do Chromium/WebView2/jogo real**. Chamada de `getSummary` e tempo de tick são medidos; `cards.render` e sanitização são contagens **inferidas do caminho do código**, conforme o benchmark, e não eventos diretamente interceptados.

## Tupla de validação sintética criada, sem promoção

- Pacote create-only: `.local-evidence/coupled-webview2-perf/tuples/cwperf002-hidden-cards-20261001/`.
- Host EXE original congelado: SHA-256 `8B40B6B69E486B8E835E6CC0F09BDFDC05F77E92ECCBA60636EE4D7B117DD035`.
- Better UI **novo e exclusivo desta tupla**: SHA-256 `0ABB337555B880D582B971DD2D3649613EC6F990D9C29D4A2DD6E48377DAD9CD`.
- Analyzer embutido inalterado: SHA-256 `0131E53D542949D84E4677736CF3A50FF90573EF10407866ACE3AA4DA2A8EE60`.
- Manifesto SHA-256 `1C632793060B705C997EB861BD25B017311D7636B02F16EC8039B57D906406CE`; `Freeze-PerformanceTuple.ps1 -Verify` conferiu os **6/6** itens. O campo `sourceCommit` herdado é a **base Git**, não um commit que inclua o userscript novo: `featureSourceProvenance` fixa os sete arquivos-fonte principais, mas não o grafo completo de dependências e inputs do esbuild (P2 de rastreabilidade). O SHA do bundle é a autoridade sobre os bytes efetivamente congelados.
- Smoke visual sintético completo com `--smoke-visual-extended --perf-metrics`: exit **0**, `extendedVisualVerdictCaptured=true`, **47** imagens, sem timeout/descendentes. Relatório SHA `02472A3B226AE6643FCAE88699C78AE31A85B61C501BC7B27735D3F0A8A80789`. Das imagens, **41/47** são byte a byte idênticas ao snapshot congelado CW-PERF-001; as seis restantes foram comparadas visualmente em pares pelo reviewer e divergem somente nos segundos relativos do Story, sem novo clipping/legibilidade observados. Esse smoke não é medição de dez minutos nem validação em jogo. Core-only e shutdown-during-init/switch, também na nova tupla, **PASS**.
- Teste negativo de imutabilidade: tentar congelar novamente o mesmo campaign ID retornou `EEXIST`/exit **1** e preservou o manifesto SHA `1C632793…`. O shared `dist/pokepixel-better-ui.user.js` permaneceu SHA `1641B1AB…`, o Analyzer compartilhado `0131E53D…` e o host normal `924D3E55…`.

## Gates e riscos residuais

- **Architecture & Integration Lead:** GO para sinalizar genericamente a origem do observer sem observer adicional, preservando os módulos que ignoram o argumento. O host continua enviando `set-view` simples, sem nonce/epoch: avaliação de correlação de intenções antigas do mesmo documento fica para contrato aditivo independente se exigida antes do release.
- **Technical QA independente:** `TECH PASS WITH P2` no escopo sintético CW-PERF-002, sem novo P0/P1. P2: proveniência do build não registra todas as dependências de forma fechada; o bundle/manifesto exatos são criptograficamente verificáveis. Reviewer não executou testes/host/game; avaliou fontes, artefatos e os relatórios do autor.
- **UX/A11y QA independente:** `UX READY` para a interação na fixture: Cards permanece invisível até renderizar estado fresco, Game retira Cards da árvore acessível via `hidden`, toolbar nativa reaparece em falhas; testes preservam filtro por teclado, tabs/ARIA, copy feedback, History, foco e cleanup. Não foi executado teste com leitor de tela, nem foi demonstrado focus handoff do controle ativo entre views; são lacunas de avaliação live preexistentes.
- **Visual Regression QA independente:** `VISUAL READY` para a tupla congelada **local sintética**; layout Cards/Game, Hunt/Loot Story, scroll/filtros, foco, menus e redução estreita de 235px sem novas regressões observadas nas imagens. Não equivale a validação visual no jogo real.
- **PO-owned in-game:** `pending` para **host `8B40B6…` + Better UI `0ABB33…`**. A aprovação anterior do usuário era do executável `3D427795…` e não cobre a nova combinação. A continuidade de visual e contrato nativo precisa ser confirmada pelo Product Owner no jogo; o agente não abrirá nem inspecionará o jogo.
- **Decisão PM:** candidato diagnóstico pré-live, **NOT READY FOR RELEASE** até decisão formal sobre AC-002-04 e confirmação do PO; métricas reais de CPU/GPU/memória e ganho de performance não medidos. Nada foi instalado, promovido, commitado, enviado, mesclado ou construído no `dist/` compartilhado, que permanece na fonte 0.2.124 anterior. Tasks CW-PERF-003+ seguem independentes.
