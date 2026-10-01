# PM Gate — integração sintética CW-PERF-002 + CW-PERF-005

**Data:** 2026-10-01 UTC. **Branch:** `plan/coupled-webview2-performance`.
**Estado:** `TECH CANDIDATE` integrado, sem autorização de release. `main` permanece
na baseline funcional `542af02` / `0.2.124` e o PO validou somente o host de
foco anterior `3D427795…`. **Este candidato não recebeu validação em jogo.**

## Critérios de aceite e evidências

| ID | Comportamento | Evidência observada | Gate |
| --- | --- | --- | --- |
| AC-INT-01 | Congelar host 005, bundle 002 e Analyzer sob identidade verificável, sem tocar em host normal, `dist/` ou UDF real. | Tupla create-only abaixo; manifesto SHA verificado e seis arquivos conferidos. | `pass` sintético |
| AC-INT-02 | Preservar mount/cleanup/recovery, dois perfis, navegação e fechamento durante init/switch. | Core-only, close-during-init, close-during-switch na tupla final; suíte Node total. | `pass` sintético |
| AC-INT-03 | Em Game estável, reduzir consultas de apresentação; retorno a Cards usa summary novo ou unavailable, mantendo capacidades nativas. | Benchmark H=32/1 pane/100 ticks e regressões `test/coupled-workspace-hidden-mode.test.js`; mesmas fontes JS congeladas na 002 e na integração final. | `pass` somente JSDOM; live pendente |
| AC-INT-04 | Gravação final em shutdown e limpeza após exceções simuladas de Create/Flush/Replace. | Host 005 v5: smokes positivos e negativos reais de `FormClosed` em páginas locais, v5 `baseline-core` PASS. | `pass` apenas no escopo descrito; I/O real/diagnóstico GUI insuficiente |
| AC-INT-05 | Não causar novo clipping ou mudança de foco/layout nos estados representativos. | Smoke visual da tupla exata gerou 47 PNG, exit0, full screenshot assertions PASS, zero filhos sobreviventes observados. Reviewer independente examinou render-first os estados representativos e comparou 47 arquivos, com 43/47 byte-idênticos ao integrado anterior; quatro diferenças inspecionadas sem novo clipping. | `VISUAL READY` só nos estados sintéticos observados; Overflow aberto/live insuficientes |
| AC-INT-06 | Provar ganho de performance por baseline/otimização pareados, com CPU, RAM, latência e denominadores. | 100->0 leituras de apresentação em Game via JSDOM; host velho e 005 usam diferentes variantes/contagens de fixture de Game Dock; sem A/B válido de recursos. | `evidence-insufficient` para ganho geral |

## Tupla final v5 (create-only)

` .local-evidence/coupled-webview2-perf/tuples/cwperf002005-final-positive-v5/ `

| Artefato | SHA-256 |
| --- | --- |
| Manifesto | `DE6C7A0E938C73E9E3943510F7126852F5256501BD72C82887481F282C8751EB` |
| Host `PokePixelCoupledWorkspace.candidate.exe` | `1CDAB6A5FA8594E4BE4F08B180B6D8C6688882E6D9311C314116A84844CF7F18` |
| Better UI isolado `dist/pokepixel-better-ui.user.js` | `0ABB337555B880D582B971DD2D3649613EC6F990D9C29D4A2DD6E48377DAD9CD` |
| Analyzer isolado `dist/pokepixel-hunt-analyzer.embed.js` | `0131E53D542949D84E4677736CF3A50FF90573EF10407866ACE3AA4DA2A8EE60` |
| Host source manifest | `F978CC1809C8B5E53DFFFDBC015807208C2314E15FF0181B4DAA6946E54FF692` |

O helper `perf/freeze-better-ui-candidate.mjs` recusa sobrescrever campanhas e
exige o manifesto e o EXE exatos do host fonte via `--host-005-v5`. O bundle
Better UI é gerado diretamente das fontes atuais no destino isolado. A tupla
final registra proveniência C# do build-fonte e os sete arquivos JS principais;
o grafo transitivo inteiro de dependências do esbuild ainda não é registrado
nessa lista (P2 de rastreabilidade). O SHA do bundle congela os bytes que de fato
serão executados. O `sourceCommit` é a **baseline Git**, não um commit contendo
essas mudanças locais. A versão nominal do pacote ainda é `0.2.124`;
um candidato de validação do PO exigirá uma versão de userscript posterior.

## Resultado final verificável

- `Freeze-PerformanceTuple.ps1 -Verify` conferiu os seis artefatos do manifesto
  `DE6C7A0E…`. O core-only com métricas opt-in, o fechamento durante init e o
  fechamento durante switch terminaram com exit 0 e marcadores PASS.
- `Measure-FrozenSyntheticHost.ps1 -ExtendedVisualSmoke -PerfMetrics -MaxSeconds 90
  -RunId combined-v5-visual-01` gerou `measurements/combined-v5-visual-01.json`,
  SHA-256 `930448D65DE46AB0E9B3EC82DDCB6EB07DB95EE233E23EE432E4E0086CE47E01`;
  exit0, `timeout=false`, `extendedVisualVerdictCaptured=true`, 47 screenshots,
  zero descendentes sobreviventes observados e nenhum erro de cleanup. O smoke
  de navegação usa HTML local e não opera o jogo.
- A mesma combinação de fonte JS `0ABB3375…` já havia passado o teste de
  100 ticks H=32/1 pane no relatório `cwperf002005-integrated-20261001/
  measurements/adapter-h32-100.json` (SHA-256
  `FF3BE01D8F24B9D6D76416319F6F5E6BA98F22EC82B0AB534E8C944602609835`):
  Game **0/100 getSummary** com mediana **0,0025ms** e p95 **0,0038ms** de tick;
  Cards **100/100** com mediana **10,3448ms** e p95 **13,3368ms**. A baseline
  antiga de 001 fez **100/100** consultas em Game H=32; esses dados mostram
  eliminação de chamadas nesse cenário JSDOM, não ganho de RAM/CPU no WebView2.
- O host da 005 produziu `GameDockOverflowRebuild=23` em `GameDockUpdate=90`
  no core sintético v5; a baseline antiga documenta 159/159 em outro fixture.
  **Não calcular percentual de economia, p95 causal ou redução global com essas
  contagens não pareadas.** Não há A/B comparável de CPU, memória privada,
  GPU ou p95 de carregamento desse candidato contra a mesma fixture baseline.

## Histórico negativo preservado

A extensão positiva da 005 teve uma primeira implementação v3 que acrescentou
`Success` ao enum de phases; o core da combinação `cwperf002005-positive-integrated-v3`
falhou (exit 1, `Settings Success failure lost the last good state`). A fonte v5
restaurou o enum de três fases e isolou a modalidade positiva num booleano de
fixture; os quatro testes de shutdown no host v5 deram exit esperado 1/1/1/0,
sem stderr, e o core da tupla final passou. Os relatórios v3 são evidência
histórica negativa e **não** foram reescritos.

## QA independente e limites de entrega

- QA de arquitetura e UX da integração anterior `cwperf002005-integrated-20261001`
  identificou zero novos P0/P1/P2 de incompatibilidade entre 002 e 005, mas
  reconheceu a lacuna do protocolo `set-view`: mensagens atrasadas no **mesmo
  documento** não trazem nonce/epoch/revision host. `viewSequence` protege
  reentrância no JS, não autentica a última intenção do host. O requisito
  estrito AC-002-04 permanece `evidence-insufficient` até contrato aditivo
  host+JS, ou decisão formal de escopo documentada. Ver
  `docs/PM_GATE_2026-10-01_CW-PERF-002.md`.
- Na análise visual independente dos 47 PNG da tupla integrada anterior,
  não houve novo clipping/foco/legibilidade nos estados observados;
  o scrollbar horizontal do History a 235px já existia nas duas referências.
  Falta prova visual do Game Dock Overflow **aberto durante refresh/reorder e
  revogação de capability**; screenshots de outros dropdowns não cobrem esse
  estado. A repetição automatizada dos 47 PNG do host final v5 não deve ser
  confundida com uma inspeção humana independente específica dessa tupla.
- Falhas reais do kernel em Create/Flush/Replace e aviso visível ao usuário
  durante falha de shutdown do binário WinExe não têm evidência completa;
  os testes 005 utilizam `IOException` antes das três operações. A limpeza
  WinForms foi observada; census dos filhos Chromium dos *três* smokes de
  falha não foi realizado por esse runner. AC-005-04 mantém essa ressalva.
- Inspeção no jogo, Tampermonkey, host normal, bundles `dist/` compartilhados,
  UDF e contas reais **não ocorreu**. Nenhum commit, push, tag, merge ou
  promoção foi realizado. A 003 permanece adiada pela API pública H<=32.

### Pareceres independentes para a tupla v5

- **Technical QA source-only:** zero novos P0/P1/P2 no diff do smoke v5. O
  revisor confirmou que o enum de falhas manteve apenas Create/Flush/Replace;
  success é variante separada e não é incluído no loop dos testes antigos.
  A prova de ratio defasado fecha a lacuna específica sobre recomputar
  `LayoutRatio` e `LastDualRatio` no Save de FormClosed; os quatro logs e o
  core final confirmam os resultados autorais. O parecer não executou testes
  independentes nem estende a prova a falhas reais de disco.
- **Architecture / UX-A11y source-only:** zero novos P0/P1/P2 de integração
  encontrados; `ARCH/UX SOURCE GO` apenas para candidato diagnóstico sintético.
  O protocolo same-document sem nonce/revision e o handoff de foco ao esconder
  Cards carecem de evidência estrita, leitor de tela e interação nativa completa.
- **Visual Regression QA independente:** examinou imagens da tupla exata v5
  antes de comparar 47/47 arquivos ao integrado v2. **43/47** byte-idênticos;
  duas diferenças de drawer mostram foco interno adicional em Recover Active
  Pane (sem perda de foco externo ou clipping) e as outras duas somente tempo
  relativo em History/Loot. Nenhuma regressão nova de geometria, foco e
  legibilidade nos estados vistos; `VISUAL READY` **exclusivamente sintético**.
  O scrollbar horizontal na tela History 235px é P2 visual preexistente e
  byte-idêntico ao integrado anterior. **VISUAL EVIDENCE INSUFFICIENT** para
  Game Dock Overflow aberto durante atualização/reordenação/revogação e para
  jogo real. Dropdowns Scope/Shortcut fotografados não são Overflow do Dock.
- **Verificação final do autor:** `npm test -- --test-reporter=dot` exit 0,
  benchmarks/regras `benchmark-cards.test.mjs` e
  `benchmark-reconcile.test.mjs` **13/13 PASS**, `node --check` e
  `git diff --check` exit 0 (avisos de conversão LF/CRLF do Windows somente).

**Próximo gate:** fechamento do contrato `set-view` e dos gaps de UX de
Overflow/erro de save,
comparação de performance metodologicamente pareada e aprovação em jogo
exclusivamente pelo Product Owner, antes de release.

## Supersessão técnica parcial — protocolo v14

O bloqueio do `set-view` **sem** correlação, descrito acima para o candidato
**v5**, foi abordado posteriormente no par congelado
`cwperf002005-view-epoch-final-v14` (manifesto SHA `8627D2E6…`, host
`CB94BE88…`, Better UI `F945D87E…`). `session-hello/session-ready` vincula
documento e montagem; `capabilitySeq` e `viewRevision` impedem replay de
intenções antigas e ACK de outras montagens, com validação de dois perfis e
reload da mesma URL em WebView2 local. Um cancelamento real de navegação
sintética com documento anterior sobrevivente passou após verificação de
identidade por probe; falhas consecutivas do transporte de `resync` passaram
com retries limitados. Smokes core/init/switch e 47 screenshots automáticos
passaram na **mesma tupla v14**. Ver detalhes, hashes integrais, testes,
histórico negativo e limitações em
`docs/PM_GATE_2026-10-01_CW-PERF-002_VIEW_CORRELATION.md`.

O resultado **não** aprova o release: falhas de I/O físicas da 005, estado
Overflow aberto durante mudança, navegações simultâneas/canceladas não
representadas e comparação pareada de recursos permanecem fora da evidência.
Validação no jogo pertence exclusivamente ao PO; `main`, binários normais,
`dist/` compartilhado, UDF e dados de conta seguem intactos.

## Candidato posterior para PO — v15 / Better UI 0.2.125

O par create-only `cwperf002005-view-epoch-po-0125-v15`, manifesto SHA-256
`677CCD429053E1048D6DE33CD4CCCF0B9631C80A4D6D4789386EC37FDD93639F`,
substitui a v14 como **candidato diagnóstico sintético**. Conserva o host
`CB94BE88C3687DAAFF7BD6AEEEE5D57DBD101CC562A55387A736B912315EADA9`
e o Analyzer `0131E53D542949D84E4677736CF3A50FF90573EF10407866ACE3AA4DA2A8EE60`;
o Better UI isolado mudou para `@version 0.2.125`, SHA-256
`1ACD6BDAC40407DC9FE0993695D0B36440FBC74656E23FA1A573D7D262E012A4`.
O adapter agora encerra a instância anterior antes de assumir o mesmo
documento, resolvendo a duplicidade de listeners, o probe de recuperação
substituído precocemente e o atributo de toolbar oculto após reinjeção
de **duas imagens da versão nova**. Um teste reprodutível começou RED, foi
corrigido e terminou PASS; correlação JS **15/15**, modo oculto **14/14**,
benchmarks **13/13** e Node completo exit0.

O manifesto verificou os seis artefatos, as sete fontes JS declaradas
conferem e os smokes do host `baseline-core`, `close-during-init` e
`close-during-switch` passaram no mesmo par. O visual estendido capturou
**47 PNG byte-idênticos à v14**, exit0, sem timeout nem descendentes restantes.
Visual QA independente observou os estados representativos da v15 e declarou
`VISUAL READY` **somente** nesse escopo, com **0 novos P0/P1/P2**; para Overflow
aberto e suas transições, declarou `VISUAL EVIDENCE INSUFFICIENT`. Os P2 de
scroll horizontal em History a 235px e texto EXP truncado em panes assimétricos
já estavam na v9/v14. Technical QA independente identificou zero P0/P1 no
delta da v15 e registrou limites condicionais de reinjeção de uma imagem v14
antiga e reentrância síncrona durante montagem. A fonte v14 nunca foi entregue
ao jogo; a migração coberta pelo teste é nova→nova.

O documento `docs/PM_GATE_2026-10-01_CW-PERF-002_VIEW_CORRELATION.md` contém
identidade completa, provas e limitações da v15. A observação de shutdown
físico não injetado, Overflow dinâmico, métricas A/B reais e validação no jogo
continua aberta. Esta supersessão não altera o valor histórico dos pareceres
v5/v14 e **não autoriza release** nem promoção de `main`/`dist/`.

**Supersessão adicional antes de qualquer handoff:** o UX QA da v15
reproduziu perda de foco do Cards durante reinjeção; a nova v16 transferiu
o foco para a toolbar nativa **antes** de desmontar o DOM. O teste obteve
RED→PASS. **Candidato ativo:** `cwperf002005-view-epoch-po-0125-v16`,
manifesto `1A4D3AEE45F49F835C082B46EA0E675C2568C3FB4ED8BC9CD62A070921ECF7D1`,
host `CB94BE88…`, Better UI `@version 0.2.125` SHA `5B13FA91…`.
Verify/core/init/switch e visual sintético de 47 capturas passaram, com
47/47 PNG idênticos à v15. QA Visual independente da v16: `VISUAL READY`
para os estados estáticos vistos (sem novos P0/P1/P2), com evidência
insuficiente no Overflow aberto e foco em transição. Tech/UX QA source-only:
nenhum novo P0/P1/P2 no delta; o teste PM posterior com todos os botões
nativos indisponíveis confirmou foco no landmark após reinjeção. A suíte de
correlação JS passou **16/16**. O gate live e medições reais continuam abertos.
Ver identidade completa no gate `CW-PERF-002_VIEW_CORRELATION.md`.

**Checkpoint sintético posterior v17:** o host passou a fotografar o
`ContextMenuStrip` Overflow aberto, isolado, preservado em reorder e fechado
após revogação. A nova tupla create-only
`cwperf002005-view-epoch-overflow-po-0125-v17`, manifesto
`58FD979F32F02FB6C6D0D63BEBB314E786E1A5D662E21BD4E865672660600FD7`,
usa host SHA `709F0010…`, Better UI `0.2.125` SHA `5B13FA91…`
**idêntico à v16** e Analyzer `0131E53D…`. Visual smoke PASS em 51 PNG,
com revisão visual independente sem P0/P1/P2 novos nos estados observados.
Um primeiro core executado sob concorrência expirou; sua falha foi preservada
e o core isolado posterior PASS, sem estabelecer causa definitiva do timeout.
Fechamentos init/switch, JS 16/16 e Node full PASS. Não há comparação pareada
de CPU/RAM entre v16 e v17: a v17 fotografa estados adicionais. Overflow
com teclado, resize, offline e múltiplos itens permanece fora das imagens;
o gate live continua exclusivo do PO. Ver hashes completos e relatórios
no documento `CW-PERF-002_VIEW_CORRELATION.md`.

**Decisão posterior do PO (B, 16:40) / candidato isolado v18:**
quatro cenários da v17 foram confirmados no jogo, porém a identidade do
alvo no Cards só pode usar encontro live — nenhum fallback à espécie
do título CURRENT, histórico ou marcador de mapa. O Better UI `0.2.126`
SHA `8584E8E7…` na tupla
`cwperf002005-strict-live-po-0126-v18` (manifesto `106D86E4…`)
implementa essa regra. Host v17 e Analyzer embed mantêm hashes; fonte,
JS 64/64+30/30, suíte Node e benchmark 13/13, core/close e visual 51 PNG
passaram no sintético. No login sem evento observado o alvo deve estar
vazio por definição, até que um encontro seja confirmado. Falta validação
manual específica desse comportamento e revisão visual dinâmica no jogo;
sem publicação/merge. Identidade e limites no gate de correlação.

**Decisão final posterior do PO (A, 16:54) / novo candidato v19:** o PO
revogou B e passou a exigir paridade com a **última espécie da sessão CURRENT**
do Hunt Analyzer, ainda que o encounter tenha terminado e mesmo após login.
O Analyzer original `1.15.0` expõe `currentSessionSpecies` somente como
projeção local bounded da sessão corrente, mantendo `currentTarget`
estritamente live; Better UI `0.2.127` distingue `ALVO` de
`ÚLTIMO DA HUNT`. Não há History de outras Hunts, clique automático no mapa,
gameplay ou migração de DB. Nova tupla create-only
`cwperf002005-current-session-po-0127-v19`, manifesto
`C8A18B1977959D53C435E9AE1713DB1FC5AA492DF28DE9133FF5A329DD004290`;
host v17 SHA `709F0010…`, Better UI SHA `9A57AEE1…`, Analyzer embed
source-built SHA `603A38F1…`. Verify 6/6, proveniência Analyzer 100/100 e
Better UI 7/7, Node integral de ambos os projetos, Cards 66/66,
benchmarks 13/13, core/fechamentos e visual sintético 51 PNG passaram.
49/51 PNG têm mesmo SHA da v18; os dois diferentes são de drawer.
Limites: estado fallback novo não foi fotografado e QA independente
pós-patch não foi obtido; revisão visual dinâmica e validação live v19 são
do PO. V18 B fica preservada somente como checkpoint, sem publicação/merge.
Hashes completos e roteiro no gate de correlação.
