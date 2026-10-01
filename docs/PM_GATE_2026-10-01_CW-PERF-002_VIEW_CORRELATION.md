# CW-PERF-002 — correlação estrita de intenções de Cards/Game

**Estado (2026-10-01, checkpoint atual):** candidato sintético integrado
**v19 / @version 0.2.127**, com host v17 byte-idêntico e Analyzer público
atualizado somente no bundle congelado. Os candidatos v9/v14/v15/v16/v17/v18
abaixo são checkpoints históricos; o PO confirmou os quatro cenários da v17,
identificou a dependência do clique Hunts no Cards e escolheu **A (CURRENT)**
após revogar B. A seleção A expõe a última espécie **da sessão corrente**
mesmo sem combate ativo, sem buscar outras Hunts e sem abrir o mapa.
**TECH CANDIDATE / NOT READY FOR RELEASE**, com validação no jogo reservada ao
Product Owner. **Branch:** `plan/coupled-webview2-performance`. Owner:
PM/Feature Engineer host+adapter; revisões técnicas e visuais independentes
limitadas aos artefatos observados. Sem jogo, Tampermonkey, promoção de `dist/`,
commit, push ou merge.

## Acceptance & Evidence Matrix

| ID | Requisito observável | Evidência exigida |
| --- | --- | --- |
| AC-VIEW-01 | O host estabelece uma identidade de documento própria a cada `NavigationStarting`; o adapter deve negociar um vínculo àquele documento antes de enviar capabilities, com ACK associado à montagem atual. | Fixture sintética de WebView2 local com dois perfis e challenge/ACK exatos; teste JS sem ACK e após timeout. |
| AC-VIEW-02 | Cada intenção real de Cards/Game possui revisão monotônica por pane. Um `set-view` atrasado ou duplicado não volta a uma revisão anterior, inclusive após ciclos Cards→Game→Cards. | Testes de entrega fora de ordem, duplicação, revisão igual com payload diferente, reentrância durante leitura do Analyzer. |
| AC-VIEW-03 | Mensagens de outro documento, outro perfil, montagem antiga, navegação anterior, ou sessão inválida são ignoradas. ACK antigo não autoriza apresentação. | Testes de epoch/session/ordinal incorretos, stale capabilities e troca de URL/adapter; C# source/fixture host+cliente. |
| AC-VIEW-04 | Falhas de envio, rejeição e timeout preservam Game e toolbar nativa; reanúncio de capabilities e retorno a Cards recuperam sem depender de estado anterior. | Testes de retry 750ms, reentrada e cleanup; suite funcional anterior de filtros, History, acesso nativo e zero reads em Game. |
| AC-VIEW-05 | A comunicação permanece aditiva a `protocol:1`. **Bundle novo + host antigo** preserva comportamento legado indicado por marcador sem `viewCorrelation`. **Host novo + bundle antigo** falha fechado para capacidades e Cards, exigindo pareamento correto de versões. O par novo+novo nunca aceita downgrade para mensagens sem correlação. | Compatibilidade em testes de adapter legados, host fixture local e inspeção de negociação. O fallback legado é explicitamente excluído da garantia estrita. |
| AC-VIEW-06 | O mesmo binário/bundle integrado executa smoke core, init/switch, variantes visuais representativas e regressões de fonte. | Tupla congelada SHA-256 e pareceres independentes Technical/UX/Visual por escopo; aprovação live exclusiva do PO. |

## Protocolo implementado

Manter a forma `ppbui.coupled.*` e `protocol:1` e anunciar opt-in somente no
marcador do host novo. O host entrega um epoch gerado por navegação na resposta
ao pedido de sessão atual. Capabilities e ACK vinculam epoch, token aleatório
da montagem e ordinal monotônico por documento. `set-view` também inclui
`viewRevision` monotônico por pane e o `capabilitySeq` da última capabilities
aceita. O receptor rejeita versões inferiores,
empates com modos conflitantes e mensagens de outras sessões/epoch; o host
rejeita capabilities atrasadas que tentem reativar uma montagem inferior.

Compatibilidade não significa que o fallback legado obtenha a mesma garantia
de ordenação. Um host novo não permite tráfego legado na execução produtiva;
exigir host+bundle novos para declarar AC-VIEW-01/03 estritos.
Todos os testes usam apenas HTML sintético e APIs locais, sem sessão do jogo.

### Semântica efetiva dos dois lados

- **Host:** `NavigationStarting` permitido roda `BeginViewDocument()` e gera
  novo epoch aleatório. Somente `NavigationCompleted(IsSuccess=true)` torna esse
  documento elegível a `session-ready`; `session-hello` registra a combinação
  de ID aleatório de montagem e ordinal. Uma mensagem de capabilities precisa
  ecoar uma combinação **já registrada** para aquele documento e possuir
  `capabilitySeq` maior que o anterior. A emissão de `set-view` acrescenta
  `viewRevision` monotônico e a versão do catálogo. Mensagens antigas do mesmo
  documento, de outro epoch/perfil/montagem ou de registro nunca emitido são
  descartadas antes de alterar bridge/visualização. O smoke local recarrega
  a **mesma URL** e verifica que o documento antigo não contamina o novo.
- **Adapter:** monta token aleatório e ordinal em `Symbol.for` do `document`
  (preservado mesmo se outra imagem do bundle for reinjetada no mesmo DOM),
  aguarda desafio/ACK, e aceita `set-view` somente com epoch/session/ordinal,
  `capabilitySeq` atualmente aceito e revisão estritamente maior. O alto-water
  de revisão não recua após rejeição de ACK. Ações `open-surface` exigem o
  mesmo vínculo, ACK aceito e requestId nativo `<perfil>-<sequência>` crescente;
  uma retransmissão não clica duas vezes no controle nativo.
- **Recuperação e foco:** a toolbar nativa reaparece em timeout/rejeição, com
  foco transferido de um Cards escondido ao controle visível (ou landmark
  temporariamente focável se todos os controles estiverem indisponíveis).
  A transição Game normal move foco de filho escondido para Game/landmark. O
  host limita novas tentativas de postar `set-view` a 3×750 ms por revisão de
  pane/documento; um token de retry invalida callbacks da navegação anterior.
  Após o limite, o host passa a Dock offline e solicita
  `resync-capabilities` ao adapter vinculado, que anuncia novamente mesmo se
  o DOM for idêntico. Falha total de transporte no último `resync` exige
  navegação/recuperação posterior: não se pode garantir mudança visual de
  uma página para a qual todas as mensagens falharam.
- **Compatibilidade:** novo host produtivo não aceita capabilities legadas;
  o novo bundle reconhece host antigo sem `viewCorrelation:2` e mantém fluxo
  legado sem garantia estrita de replay. O pacote de entrega deve instalar
  ambos os componentes novos como um par identificado por hash.

## Matriz de evidência da implementação

| Critério | Resultado local | Limite |
| --- | --- | --- |
| AC-VIEW-01 | `pass` sintético: desafio após commit, session registrada, ACK exato, 2 WebView2 locais. | Sem navegação no jogo real. |
| AC-VIEW-02 | `pass` sintético: atraso, duplicação, empate conflitante, reentrância, revisão antiga após novo ACK. | Ordem de eventos no ambiente real não observada. |
| AC-VIEW-03 | `pass` sintético v14: mesmo URL/reload real, epoch velho, sessão nunca registrada, dois perfis, remount, reinjeção e **NavigationStarting cancelado** com documento original vivo identificado via probe e re-ACK. | Não cobre erro de página, sobreposição de navegações com IDs diferentes ou todos os redirects reais. |
| AC-VIEW-04 | `pass` sintético v14: ACK/retry/foco/`resync`, 2 falhas pré-post seguidas de recuperação, quatro falhas consecutivas com parada limitada e recuperação explícita posterior sem reload. | Simulação antes do transporte; falha física persistente de WebView2 e recuperação espontânea sem qualquer mensagem ainda não foram comprovadas. |
| AC-VIEW-05 | `pass` de fonte/fixture para opt-in v2 e fallback JS legado; host novo falha fechado com bundle antigo. | Mistura de versões não recebe promessa de UX Cards. |
| AC-VIEW-06 | `pass` de fixture integrada core/close init/close switch/47 screenshots em EXE+bundle SHA abaixo; independent reviewers e live têm gates separados. | Screenshots não demonstram foco assistivo ou Overflow durante atualização. |

### Tupla conjunta v9 (histórico; somente HTML e dados sintéticos)

` .local-evidence/coupled-webview2-perf/tuples/cwperf002005-view-epoch-final-v9/ `

| Fonte | SHA-256 |
| --- | --- |
| `tuple-manifest.json` | `CFBE1DAA1C5A1F1E329E785A9ABC24F4529778F8ACD315B5584478AFFDE9DD2D` |
| Host EXE | `3D11282B9E16B32F1AD30AD04EEBCE952738749B81078AEC0D5AED859E6BA19D` |
| Better UI userscript isolado | `74EB01C82861C050DCB2C87030015A460FD62E7FD38EF85532F108F8C9AC743D` |
| Analyzer embed isolado | `0131E53D542949D84E4677736CF3A50FF90573EF10407866ACE3AA4DA2A8EE60` |
| Host build-source manifest | `891AADC0478075905D70FCDCCBB971B2FE9B462A61B7FBA850947C4691D1A95E` |

`Freeze-PerformanceTuple.ps1 -Verify` conferiu os seis arquivos; smokes
`baseline-core -PerfMetrics`, `close-during-init` e `close-during-switch`
terminaram exit0 no **mesmo** conjunto de bytes. O relatório
`measurements/final-view-epoch-visual01.json`, SHA-256
`FB18C04BDD88BA00E968E9784CFDC0FDC75CD78B4858989B378A8E3B2527F095`,
registra full screenshot assertions PASS, exit0, nenhum timeout/erro de
cleanup, 47 PNG e zero descendentes sobreviventes observados.

A suíte de correlação `test/coupled-workspace-view-correlation.test.js` passou
**13/13**; `npm test -- --test-reporter=dot` exit0, os benchmarks-testes de
Cards/reconcile **13/13**, `node --check` e `git diff --check` exit0 (apenas
avisos de line-ending Windows). O resultado anterior de `getSummary` em Game
H=32 permanece zero leituras por 100 ticks no JSDOM, sem evidência de ganho
geral de CPU/RAM/GPU em WebView2 ou de performance dentro do jogo.

As tuplas exploratórias anteriores são **histórico, não release**: o core v1
revelou um primeiro hello antes do commit, corrigido por retry sintético;
o v5 demonstrou que uma reanúncio de catálogo só no host divergia do catálogo
real do JS; a primeira integração v6/v7 falhou no smoke visual quando a fixture
tentou recuperar uma geração de capabilities que não pertencia ao cliente
vinculado. O v9 solicita reanúncio ao adapter da sessão atual e verifica
somente ações nativas realmente publicadas por ele; as falhas anteriores
foram preservadas nos relatórios isolados.

## Continuação v14 — navegação malsucedida e transporte de recuperação

O checkpoint v9 é preservado integralmente acima. A fonte evoluiu para evitar
dois estados offline sem reidratação após um host message ou uma navegação
interrompida. Todos os artefatos abaixo são sintéticos e create-only.

**Identidade congelada:**

| Artefato | SHA-256 |
| --- | --- |
| Diretório | `.local-evidence/coupled-webview2-perf/tuples/cwperf002005-view-epoch-final-v14/` |
| Manifesto | `8627D2E67C3CAB2336B6672B58B3C9F34944DDA8C7B821804213544DBC9699BD` |
| Host candidato | `CB94BE88C3687DAAFF7BD6AEEEE5D57DBD101CC562A55387A736B912315EADA9` |
| Better UI (bundle isolado) | `F945D87E70A39D4131AA7C8D6EAB5E8E0E4459E1ADD2C25A3F22446085677FC6` |
| Analyzer embed | `0131E53D542949D84E4677736CF3A50FF90573EF10407866ACE3AA4DA2A8EE60` |
| Relatório visual `measurements/final-v14-visual-01.json` | `84161EF23425483F9B9840C84FB950C05975EF4F84C93DBC341BD85AC8EADCF1` |

**Fonte e contrato:** o adapter registra uma função de leitura da identidade
da montagem atual em `document[Symbol.for('ppbui.coupled.document-session-probe')]`
e a remove no cleanup. Quando uma navegação autorizada termina com erro, o
host somente restaura a sessão anterior quando havia um snapshot estrito
previamente aceito, não ocorreu `ContentLoading` nem troca real de documento,
e o script ativo no **documento atualmente executável** devolve a mesma
sessão, epoch, ordinal e URL. A leitura tem teto de 2 segundos; após o await
os identificadores de navegação, pane e epoch são revalidados. O host preserva
a revisão monotônica, descarta ações pendentes e requer uma **nova**
capabilities/ACK antes de declarar a integração disponível. Em qualquer
identidade ambígua, permanece offline. Redirects com o **mesmo** NavigationId
conservam o snapshot original, sem invalidar o guard por repetição do evento.

Quando `resync-capabilities` falha ao postar, o host agenda no máximo mais
**3 tentativas separadas por 750 ms**, restritas ao mesmo pane/epoch/sessão/
ordinal/geração de capabilities. Uma nova geração substitui callbacks antigos.
Essa recuperação não executa comandos de jogo automaticamente.

**Evidências v14:** manifesto verificado; `-Smoke -SmokeVariant baseline-core
-PerfMetrics`, `close-during-init`, `close-during-switch` passaram no mesmo
EXE. O core contém:

- `CW-PERF-002 same-URL document-epoch replay and dual-account isolation: PASS`.
- `CW-PERF-002 canceled NavigationStarting/failed NavigationCompleted: PASS
  (oldDocumentSurvived=True; pending actions cleared; no unverified session accepted)`;
  o log registra **NavigationStarted=4**, **NavigationSucceeded=3** e
  **NavigationFailed=1** (página `file://` sintética).
- `CW-PERF-002 resync transport failures: PASS (2 failures recovered; 4
  failures bounded offline; explicit later recovery)`; a injeção ocorre antes
  de `PostWebMessageAsJson` e não simula falha real do kernel.
- `CW-PERF-005 repeated-focus persistence and three failure retries: PASS`.

O smoke visual `-ExtendedVisualSmoke` na tupla v14 gerou **47 PNG** com
`full screenshot assertions PASS`, saída 0, nenhum timeout/erro de cleanup e
zero descendentes sobreviventes observados. A suíte de correlação JS passou
**14/14** com o novo teste de probe vivo/remount/cleanup. `npm test
-- --test-reporter=dot` retornou exit0, testes de benchmark `13/13` e
`git diff --check` exit0 (avisos LF/CRLF do Windows não bloqueantes).

Uma comparação automática de SHA-256 por arquivo entre os conjuntos
`cwperf002005-view-epoch-final-v14` e `cwperf002005-view-epoch-final-v9`
encontrou **45/47 PNG byte-idênticos**; somente
`workspace-cards-history-dual-1-2-1180.png` e
`workspace-cards-history-dual-2-1-1180.png` diferem. Esta contagem não
substitui a revisão visual das duas imagens diferentes.

**Limites remanescentes:** o cenário de cancelamento comprova somente uma
navegação em que o documento anterior realmente sobreviveu. Navegações
simultâneas com IDs diferentes podem conservadoramente deixar o Dock offline
mesmo quando o documento antigo ainda existe; erros de página, `window.stop`,
redirecionamentos HTTP reais e falha física persistente do transporte não
foram simulados. O recurso manual de recarregar/recuperar painel continua
disponível. A revisão visual independente da **tupla v14 exata**, o Overflow
**aberto durante mudanças**, métricas pareadas de CPU/RAM e a validação real
no jogo permanecem gates separados, sem transferência automática do parecer
visual do v9 ou do aceite do PO em outro executável.

**Parecer independente Technical QA v14, source-only:** os hashes exatos de
`AccountPane.cs`, `CoupledWorkspace.cs`, `WorkspaceBridge.cs` e
`controller.js` correspondem ao build congelado; **P0=0/P1=0 novos
identificados**. O revisor manteve três observações P2 de cobertura/liveness:
(i) duas navegações sobrepostas com **NavigationId diferentes** podem descartar
o snapshot anterior e deixar o Dock offline mesmo se o documento antigo ainda
viver; (ii) o teste de retries deliberadamente deixa a tentativa antiga
assentar antes de provocar a próxima, logo não executa a colisão de duas
gerações ainda agendadas; (iii) um `ExecuteScriptAsync` que exceda o prazo de
2 segundos pode concluir/falhar mais tarde sem coleta explícita de sua exceção.
São limitações conservadoras, sem evidência de autorização de documento antigo
ou gameplay indevido. O parecer revisou a fonte e logs, **não executou** o
jogo nem uma suíte própria.

**Parecer Visual QA independente da v14:** foram inspecionadas as 47 capturas
renderizadas, com 45 PNG idênticos à v9 e 2 diferenças de 9/18 pixels sem
alteração estrutural percebida. `VISUAL READY` apenas nos estados estáticos
sintéticos observados; scrollbar horizontal em History 235px e EXP truncado
nas razões assimétricas são P2 já presentes na v9. `VISUAL EVIDENCE
INSUFFICIENT` para Overflow aberto, fechamento, reposicionamento e foco durante
alteração de capabilities, que as 47 imagens não fotografam.

## Candidato versionado posterior v15 — posse do adapter após hot re-injection

O Technical QA independente da v14 detectou um P2 adicional: uma segunda
instância JavaScript montada no mesmo documento podia sobrescrever o probe
da primeira antes de receber ACK. Se a segunda fosse descartada, o host poderia
ficar offline após um cancelamento de navegação embora a primeira instância
continuasse viva. Também era possível restaurar o antigo atributo de toolbar
oculta. O novo adapter publica uma posse exclusiva em
`Symbol.for('ppbui.coupled.active-adapter')`, limpa a montagem anterior **antes**
de ler o estado da toolbar, registrar listeners ou criar seu probe e exclui a
posse apenas no cleanup do proprietário. Isso preserva o monotonic mountOrdinal
e evita dois adapters da **nova versão** executando simultaneamente.

A regressão JSDOM de sobreposição de imagens independentes começou **RED**
(`2` listeners contra `1` esperado) e terminou **PASS**, incluindo timeout
de sessão sem ACK, toolbar nativa visível, callbacks do adapter aposentado
inertes, rejeição de `set-view` antigo, ACK da montagem nova e cleanup. A suíte
estrita agora passou **15/15**; Game/Cards **14/14**; benchmarks **13/13** e
`npm test -- --test-reporter=dot` exit0. A versão foi alterada de `0.2.124`
para `0.2.125` em `package.json`, lockfile e metadata, sem gerar build em
`dist/` compartilhado.

**Identidade histórica v15 create-only, supersedida antes da entrega ao PO:**

| Artefato | SHA-256 |
| --- | --- |
| Diretório | `.local-evidence/coupled-webview2-perf/tuples/cwperf002005-view-epoch-po-0125-v15/` |
| `tuple-manifest.json` | `677CCD429053E1048D6DE33CD4CCCF0B9631C80A4D6D4789386EC37FDD93639F` |
| Host EXE (idêntico à v14) | `CB94BE88C3687DAAFF7BD6AEEEE5D57DBD101CC562A55387A736B912315EADA9` |
| Better UI `@version 0.2.125` | `1ACD6BDAC40407DC9FE0993695D0B36440FBC74656E23FA1A573D7D262E012A4` |
| Analyzer embed | `0131E53D542949D84E4677736CF3A50FF90573EF10407866ACE3AA4DA2A8EE60` |
| Relatório visual `final-v15-visual-01.json` | `0B27339AF57E94F51C86F6F42E532A57076798E0A2B2081494D349A1A14BD258` |

`Freeze-PerformanceTuple.ps1 -Verify` conferiu **6/6** artefatos e
`featureSourceProvenance` conferiu **7/7** inputs declarados. O mesmo par
congelado passou `baseline-core -PerfMetrics`, `close-during-init`,
`close-during-switch` e `-ExtendedVisualSmoke -MaxSeconds 90`: todas as
assertions de screenshots PASS, exit0, sem timeout/erro de cleanup e zero
descendentes sobreviventes observados. A v15 gerou **47 PNG byte-idênticos
à v14**. O visual não exercita a sobreposição de adapters, que tem prova
comportamental JSDOM; o smoke C# usa HTML local.

**Technical QA independente, delta v15 source-only:** P0=0/P1=0; o P2 de
duas instâncias **v15→v15** foi resolvido dentro da sequência testada.
Permanece como limite condicional uma reinjeção sobre bundle **v14 antigo**
(que nunca foi entregue ao jogo) porque ele não publica `active-adapter`.
Um `postMessage` que reentre de forma *síncrona* no `mount()` antes de o novo
handle ser publicado também não foi simulado; o WebView2 normal publica
mensagens ao JS assincronamente. Erro na criação da montagem sucessora
permanece fail-closed com toolbar nativa restaurada; um novo handshake poderá
ser necessário. Estes limites não equivalem a prova de operação no jogo.

**Visual Regression QA independente, tupla v15 exata:** `VISUAL READY` no
escopo dos 47 estados estáticos sintéticos, sem P0/P1/P2 visual **novo**.
O revisor inspecionou os renders v15 representativos de History, foco,
drawer e Dock, comparando-os ao conjunto v14 já inspecionado; a conferência
de hash feita pelo PM encontrou 47/47 PNG idênticos. Permanecem P2
pré-existentes no History de 235px (scrollbar horizontal) e no rótulo EXP
truncado dos cards em 1:2 e 2:1. `VISUAL EVIDENCE INSUFFICIENT` para Overflow
em abertura, aberto, fechamento, resize/offline e para a transição visual de
toolbar/foco durante hot re-injection. Nenhuma contagem de rebuild substitui
um render com o menu efetivamente aberto.

**Gates fora da evidência:** Overflow aberto durante refresh/reorder/revogação,
leitor de tela/foco assistivo, navegações diferentes sobrepostas ou página de
erro, falha física de disco e medição pareada de CPU/RAM/GPU. A validação de
instalação, alternância Cards/Game, duas contas, recuperação, shutdown e
Overflow em jogo será exclusivamente do Product Owner. `main`, host normal,
`dist/` e dados de usuário não foram modificados; não houve commit, push,
merge, tag nem publicação. **CANDIDATO PRÉ-LIVE; NOT READY FOR RELEASE.**

## Supersessão final v16 — foco transferido antes de desmontar Cards

O UX/A11y QA independente encontrou um P2 remanescente no cleanup do
adapter: `cards.cleanup()` removia o DOM antes de `restoreStandaloneToolbar()`
consultar o elemento focado. Se o usuário estivesse com um botão de Cards em
foco durante hot re-injection, `activeElement` virava `body`; o fallback já
não identificava a origem do foco. O teste de reinjeção com Cards focado
**reproduziu RED** (`body` em vez de botão nativo) na fonte v15. O cleanup
passou a chamar `restoreStandaloneToolbar()` **antes** de `cards.cleanup()`;
o teste ficou **PASS**, verificando foco do Cards antigo→botão nativo na
montagem da segunda imagem e do novo Cards→botão nativo no cleanup final.
Isto preserva o contrato de foco do teclado sem modificar a intenção
Cards/Game nem as mensagens WebView2.

**Identidade v16 create-only selecionada para futura validação pelo PO:**

| Artefato | SHA-256 |
| --- | --- |
| Diretório | `.local-evidence/coupled-webview2-perf/tuples/cwperf002005-view-epoch-po-0125-v16/` |
| `tuple-manifest.json` | `1A4D3AEE45F49F835C082B46EA0E675C2568C3FB4ED8BC9CD62A070921ECF7D1` |
| Host EXE, mesmo host da v14/v15 | `CB94BE88C3687DAAFF7BD6AEEEE5D57DBD101CC562A55387A736B912315EADA9` |
| Better UI `@version 0.2.125` | `5B13FA911FFC74674101E35E070CED23F8B20CAE3A60AFD640C7788517A32182` |
| Analyzer embed | `0131E53D542949D84E4677736CF3A50FF90573EF10407866ACE3AA4DA2A8EE60` |
| Relatório visual `final-v16-visual-01.json` | `F47D280983092B5A75FE6FABF07EF0CA36A0C1065CF882812271D7150C455D82` |

Manifesto verificado (`6/6` artefatos, `7/7` fontes JS declaradas), smokes
`baseline-core -PerfMetrics`, `close-during-init` e `close-during-switch`
**PASS** no EXE congelado. O smoke visual `-ExtendedVisualSmoke` executou
assertions completas de screenshot com exit0, sem timeout/erro de cleanup e
zero filhos sobreviventes observados; os **47 PNG da v16 são byte-idênticos
à v15** no comparador do PM. Correlação JS **16/16**, Game/Cards **14/14**,
benchmarks **13/13**, `npm test` exit0, `node --check` e `git diff --check`
exit0 (avisos de conversão LF/CRLF do Windows apenas). A v15 e a v16 têm
`@version 0.2.125` porque nenhuma foi distribuída; o digest do bundle
e o identificador de campanha diferenciam seus bytes.

**Technical/UX QA independente do delta de foco, source-only:**
P0=0/P1=0, sem novo P2 demonstrado; o P2 de foco N→N com botão nativo
disponível foi corrigido. Cleanup e session ownership permanecem idempotentes
nos caminhos observados. Após o parecer, um teste PM adicional de reinjeção
com *todos* os botões nativos indisponíveis também passou: A→B e cleanup de B
preservam o foco no landmark `<nav>` em vez de Cards removido. Permanecem sem
prova reentrância síncrona em um handler de foco,
falha excepcional em `focus()` ou `cards.cleanup()`, e reentrância com
bundle v14 antigo. Esses limites não são evidência de violação; a fixture
existente de ACK sem botões disponíveis cobre o fallback de foco isoladamente.

**Visual Regression QA independente da tupla v16 exata:** `VISUAL READY`
para os **47 estados estáticos sintéticos**, sem novo P0/P1/P2 visual
observado; o revisor renderizou diretamente History 235px/shiny, Cards
single/dual, razões assimétricas, foco estático, Game Dock offline/dual,
drawers e Command Deck, comparando versões v15/v16 representativas. Os
47 PNG são byte-idênticos pelo comparador independente de hashes do PM.
Overflow realmente aberto durante mudanças e transições de foco/toolbar
na reinjeção seguem com `VISUAL EVIDENCE INSUFFICIENT`, pois frames estáticos
não provam movimento de foco nem menu aberto. O History 235px com scroll horizontal e
o truncamento de EXP nas razões 1:2/2:1 são P2 herdados. Nenhuma prova
pareada de redução de CPU/RAM, falha física de Save ou recuperação de
todo erro de navegação foi obtida. **PRE-LIVE DIAGNOSTIC CANDIDATE;
NOT READY FOR RELEASE**, com aceite em jogo reservado ao Product Owner.

### Handoff de validação exclusiva pelo Product Owner

Os únicos artefatos candidatos são o executável isolado
`tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate.exe`
e o bundle `dist/pokepixel-better-ui.user.js` **dentro da tupla v17 atual**.
`dist/` compartilhado e o executável normal não são candidatos e não foram
alterados. Verificar os SHA-256 acima antes de avaliar. A aprovação anterior
do host `3D427795…` pertence a outro binário e não transfere aceite à v17.

Sequência sugerida para o PO, sem qualquer controle do jogo por agentes:

1. Conferir Single/Dual e o isolamento das duas contas; alternar Cards/Game
   repetidamente e após reload da mesma URL, sem Cards de sessão antiga.
2. Permanecer em Game durante uma Hunt e voltar a Cards: dados recentes,
   histórico, filtros e indicadores corretos; testar indisponibilidade do
   Analyzer sem esconder a navegação nativa.
3. Testar com teclado foco Cards→Game, ACK/recovery/offline e recuperação da
   toolbar; verificar que reinjeção ou remount não deixa ação duplicada ou foco
   preso em controle removido.
4. Abrir **Overflow** e mudar seleção, capability, tamanho e foco do pane:
   registrar se o menu permanece alcançável, legível e aberto/fechado de forma
   coerente. Este cenário não foi fotografado no smoke local.
5. Encerrar e reabrir verificando conta ativa, preferências e proporção real
   do splitter; registrar eventuais avisos visíveis em erro de persistência.

Uma observação em jogo deve identificar **ambos** os SHA do host/Better UI,
a ação reproduzível, o resultado visto e, se houver, screenshot ou vídeo.
Não atribuir redução de CPU/RAM ao jogo sem baseline e candidato medidos em
cenários pareados. Só a confirmação explícita do PO permite trocar o estado
`pending in-game validation` desta tupla.

### Matriz PM final da v16, por critério

| Critério | Estado verificável na v16 | Limite ainda aberto |
| --- | --- | --- |
| AC-VIEW-01 | `pass` sintético: epoch/hello/ACK após documento committed; host+adapter exatos. | Sessões reais e erros de carregamento não foram inspecionados pelo agente. |
| AC-VIEW-02 | `pass` sintético: revisões estritamente crescentes e replay/ACK stale rejeitados. | Não constitui medição de latência na WebView2 real do usuário. |
| AC-VIEW-03 | `pass` sintético: dual account, reload da mesma URL, remount e cancelamento com probe do documento sobrevivente. | Redirect real, navegação sobreposta de IDs distintos e mistura com bundle v14 antigo não provados. |
| AC-VIEW-04 | `pass` sintético: resync 2 falhas→recuperação, 4 falhas→offline limitado, reentrada posterior; novo foco durante N→N RED→PASS. | Falha física persistente, injeção excepcional no DOM e foco transiente em jogo pendentes. |
| AC-VIEW-05 | `pass` fonte/fixture para host novo+bundle novo, host antigo+bundle novo e fail-closed de host novo+bundle legado. | Compatibilidade funcional estrita só se aplica ao par congelado atual. |
| AC-VIEW-06 | `pass` dos smokes core/init/switch, fonte/testes e screenshots estáticos 47/47 sem diferença ante a v15; reviews Technical/UX independentes por fonte. | Visual dinâmico do Overflow/reinjection precisa evidência própria; validação live exclusiva do PO. |

**Autorização PM:** entregar a v16 somente como **candidato diagnóstico
pré-live com lacunas visuais identificadas**. Os critérios sintéticos cobertos
são `pass`; isso não equivale a `user-validated` ou `RELEASE READY`.

## Supersessão de evidência v17 — popup nativo Overflow visível

O QA visual da v16 documentou que as 47 imagens omitiam o
`ContextMenuStrip` do Overflow: ele é uma janela WinForms separada, ausente
do `DrawToBitmap` da árvore principal. A v17 acrescenta **somente código da
fixture** em `CaptureVisualSmokeAsync` para mostrar esse popup, capturar seu
raster separado e compor menu e Game Dock usando as coordenadas reais da
tela. O teste verifica posição acima do botão Menus e dentro da área útil,
preservação do mesmo item em `UpdateGameDock()` e reorder das quick slots,
fechamento/removal após revogar `hunt-analyzer` e restauração de favorites e
capabilities em `finally`. O comportamento de produção não foi alterado.

**Identidade final create-only para validação exclusiva do PO:**

| Artefato | SHA-256 |
| --- | --- |
| Diretório | `.local-evidence/coupled-webview2-perf/tuples/cwperf002005-view-epoch-overflow-po-0125-v17/` |
| `tuple-manifest.json` | `58FD979F32F02FB6C6D0D63BEBB314E786E1A5D662E21BD4E865672660600FD7` |
| Host EXE isolado v17 | `709F0010C80E0243D118FC1AF54BC4238F010827F1F75681ED16DFA125B6D0C8` |
| `CoupledWorkspace.cs` compilado | `C476A257C3CA5562FF43F6A1190D31704E1D58D39D6A9753B8EDEFD6B4FDAE6C` |
| Better UI `@version 0.2.125` (idêntico à v16) | `5B13FA911FFC74674101E35E070CED23F8B20CAE3A60AFD640C7788517A32182` |
| Analyzer embed (inalterado) | `0131E53D542949D84E4677736CF3A50FF90573EF10407866ACE3AA4DA2A8EE60` |
| `measurements/final-v17-overflow-visual-01.json` | `00339E183255F120BC3395E4E30062CA32EB1708CD1ACEAE45FE30B44F56C419` |
| `measurements/baseline-core-isolated-01.json` | `0355A382EA1622EA3E7C6462FE679FC28FF819F5E7E5BC13AB04082234415A07` |

`Freeze-PerformanceTuple.ps1 -Verify` confirmou os seis artefatos, e os sete
arquivos declarados na proveniência JS permanecem idênticos ao source da
worktree. O visual estendido sintético completou com **exit0, sem timeout**,
`extendedVisualVerdictCaptured=true`, sem erro de cleanup nem descendentes
WebView2 sobreviventes observados. Gerou **51 PNG**: 41 idênticos aos da
v16, seis History/Loot com pequenos deltas temporais da fixture, e quatro
novos: `game-dock-overflow-open-1180.png`,
`game-dock-overflow-menu-1180.png`,
`game-dock-overflow-reordered-1180.png` e
`game-dock-overflow-revoked-1180.png`. O revisor visual independente
examinou os novos renders e as seis alterações: **nenhum P0/P1/P2 visual
novo observado**. O texto Hunt Analyzer aparece integral, com contraste
e borda legíveis; no reorder permanece visível acima de Menus; a revogação
fecha popup e desabilita Menus, preservando corretamente `MENUS READY`
enquanto a ponte geral continua disponível.

**Evidência negativa preservada:** o primeiro `baseline-core` v17 executou
em paralelo à suíte Node e expirou no watchdog do host após registrar PASS
para replay, navegação cancelada, resync e persistência, mas antes do marcador
final. Logs `measurements/baseline-core-parallel-timeout-01.{stdout,stderr}.txt`
foram preservados; não são PASS. O mesmo binário foi reexecutado **isolado**
com RunId create-only `baseline-core-isolated-01`: exit0, sem timeout,
`coreBaselineVerdictCaptured=true`, zero descendentes sobreviventes
observados e marcador de core PASS. A primeira falha é compatível com
contenção externa, **mas a causa exata não foi provada**. Os smokes
`close-during-init` e `close-during-switch` passaram. Correlação JS **16/16**,
Game/Cards **14/14**, benchmarks **13/13**, suíte Node completa,
`node --check` e `git diff --check` passaram. O smoke visual agora inclui
operações extras de Dock: não comparar métricas visuais v16↔v17 como
benchmark A/B pareado.

**QA independente:** Technical/Architecture source-only: P0=0/P1=0
demonstrados no delta de fixture; um P2 *condicional de robustez de teste*
foi registrado para um possível autoclose do popup por
`Application.DoEvents()`/mudança de foco. A execução congelada observada
concluiu normalmente. Visual Regression QA: **`VISUAL READY` apenas**
para menu nativo de **um item** aberto, raster isolado, reorder/no-op e
revogação nos estados sintéticos registrados. Permanecem
`VISUAL EVIDENCE INSUFFICIENT` para fechamento via Escape/click-away,
foco/keyboard em movimento, resize/offline/troca de conta enquanto aberto,
catálogo extenso/scroll e composição real com outros processos; a imagem
composta é feita por `DrawToBitmap`, não por captura do desktop. Os P2
anteriores de scrollbar History a 235px e EXP truncado em pane estreito
persistem sem regressão visível observada.

**Handoff PM da v17:** este é o último candidato sintético do escopo
CW-PERF-002+005, apto para **validação manual do PO** com os dois hashes
EXE/bundle indicados acima. O roteiro de Single/Dual, Cards/Game, isolamento
das contas, recuperação, foco, Overflow e shutdown permanece na seção
`Handoff de validação exclusiva pelo Product Owner` (referente à tupla v17
atual). Falhas físicas de disco, medição A/B pareada
CPU/RAM e cenários extremos de navegação continuam fora desta evidência.
Não houve inspeção ou controle do jogo, promoção do executável normal,
`dist/` compartilhado, commit, push, merge, tag nem publicação.
**`pending in-game validation` / `NOT READY FOR RELEASE`.**

## Retorno do Product Owner — 2026-10-01, validação funcional condicionada

O Product Owner executou manualmente **os quatro cenários de handoff**, relatou
que todos estão funcionais e apontou uma exceção pré-existente específica:
**Cards não mostra as informações do alvo ao entrar diretamente/logar; elas
aparecem após o usuário clicar em Hunts no mapa**. Registrar os quatro
cenários como **aceitos com ressalva**, não como aceite irrestrito nem
publicação autorizada. O usuário não especificou ainda quais campos faltam
(`nome`, `sprite`, `nível/faixa`, `tipos`) nem se há um encontro ativo no
momento do primeiro frame sem dados.

Auditoria source-only da condição de bootstrap:

- `src/modules/hunts/dom.js` guarda contexto de zona apenas em
  `activeHuntZoneByWindow` (WeakMap efêmero); `rememberActiveHuntZone()` é
  acionado pelos handlers do mapa/`startHunt`, não por login direto.
- `src/modules/coupled-workspace/cards.js` lê `summary.currentTarget`,
  contexto de alvo previamente confirmado e contexto efêmero da zona; em
  página nova sem evento e sem referência de Hunts, nenhuma dessas fontes
  prova necessariamente qual é o alvo corrente.
- A fonte embutida do Analyzer expõe `currentTarget` somente quando status é
  `running` e há **exatamente um encontro ativo observado nesta execução**.
  Recuperação de evento antigo do armazenamento não autoriza promovê-lo a
  alvo atual. O ID de zona da sessão histórica também não prova, por si só,
  uma Hunt ativa após o login.

**Decisão de segurança:** não criar fallback a partir de último encounter,
histórico, seleção `_selectedIndex`, URL do sprite ou zona persistida;
não abrir Hunts, iniciar Hunt ou realizar requests de gameplay em nome do
usuário. O fallback legítimo depende de comprovar uma fonte nativa
**read-only** da zona *atualmente ativa* no login, com identidade e validade
da sessão, ou de receber o próximo encontro live do Analyzer. Sem isso,
`Aguardando alvo` é mais correto do que mostrar um alvo incorreto.

**Evidência necessária para corrigir com precisão:** um print do Cards
imediatamente após login (antes de Hunts) e outro após o clique, deixando
visíveis campos do alvo e status; confirmar se a Hunt já estava ativa e se
o clique apenas abriu o mapa ou iniciou uma nova Hunt. Até identificar
a fonte runtime e reproduzir um caso RED→PASS sintético, a v17 original
permanece congelada e inalterada, com esta pendência aberta; a confirmação
funcional dos quatro cenários não constitui aceite deste defeito.

### Complemento — referência explícita à implementação original CURRENT

O PO especificou que Cards deve seguir **CURRENT** de
`G:\pokepixel-hunt-analyzer`, sem incluir Histórico e com atualização live.
A fonte original foi verificada na branch
`feature/ui-history-chance-shiny`, sem editar esse repositório:

- `userscript/current-view.js:245-253` exibe a headline da sessão corrente
  usando `latestSpeciesEncounter(encounters)` de
  `userscript/hunt-view-model.js:11-34`. A escolha usa a maior data conhecida
  **mesmo se a ocorrência já terminou**, inclusive após hidratar dados da
  sessão corrente. Isso NÃO lê sessões da aba History, mas também NÃO prova
  um combate ativo/live. Em Expedição running a headline é `EXPEDITION`.
- `userscript/main.js:314-377` passa as ocorrências da sessão corrente a
  CURRENT e publica `currentState.cardPresentation` no summary. A API
  `userscript/public-summary.js:257-259` só exporta `currentTarget` com
  status running e um encounter ativo observado na execução corrente;
  mantém deliberadamente esse campo nulo no cold login/paused. Os arrays
  públicos de tentativas são limitados e não reconstituem fielmente a
  headline CURRENT.
- A paridade exata da **headline da sessão corrente** exige uma extensão
  allowlisted e somente leitura no Analyzer original (por exemplo,
  `currentSessionSpecies` proveniente dos encounters da sessão corrente já
  lidos), seguida de projeção distinta no Better UI. Não se pode apresentar
  esse valor como **alvo em combate agora**, nem atribuir a ele raridade,
  shiny ou level do último encontro. A paridade de tempo de atualização
  também exige cuidado, pois CURRENT recalcula a headline em mudanças da
  revisão da lista terminal ou da sessão.
- A exigência literal de **somente encontro live, sem registros passados**
  é diferente: o campo público `currentTarget` já representa essa semântica,
  mas fica legitimamente vazio até haver uma observação ativa nesta
  execução; não foi identificado um segundo oracle vivo no login direto.

**Decisão de semântica resolvida pelo PO às 16:40:** opção **B**, *apenas
encontro atualmente ativo*, que pode ficar vazio até o primeiro evento
observado. A implementação abaixo substitui a pendência anterior, sem
promover última espécie/histórico ao campo de alvo.

## Candidato v18 — PO B: alvo estritamente live, sem dependência do mapa

**Identidade create-only selecionada:**

| Item | SHA-256 / identificação |
| --- | --- |
| Tupla | `.local-evidence/coupled-webview2-perf/tuples/cwperf002005-strict-live-po-0126-v18/` |
| Manifesto `tuple-manifest.json` | `106D86E4A8BE1BADECC5FB8C5AEE034F8EF905FD5C2A5AD8ACDA862E6BC20DE6` |
| Host isolado **idêntico à v17** | `709F0010C80E0243D118FC1AF54BC4238F010827F1F75681ED16DFA125B6D0C8` |
| Better UI `@version 0.2.126` | `8584E8E74E2F3BC41AF25B2E2C54730C7E344806CD952C11E48EB2536C3FA63D` |
| Analyzer embed **inalterado** | `0131E53D542949D84E4677736CF3A50FF90573EF10407866ACE3AA4DA2A8EE60` |
| Relatório core `final-v18-core-01.json` | `0B09F0DA50C06B791C0121FBB404EB19B1B849939288A07A2625FC53AE346DD5` |
| Relatório visual `final-v18-visual-01.json` | `0D72C617D8F74A53FF8E81C856ADC89B7EC7FB38C3C30FE01F483C07B7870F06` |

**Regra explícita:** o campo ALVO do Cards lê **somente**
`__POKEPIXEL_HUNT_ANALYZER_PUBLIC__.getSummary().currentTarget` sanitizado,
com `status === "running"`. Não promove a última espécie da CURRENT,
`attemptHistory`, `specialHistory`, `lootHistory`, último encontro da sessão,
cache de mapa/Atlas ou zona persistida. Essas listas permanecem exibíveis
na seção Story **da sessão atual**, que já existia, mas NÃO determinam alvo;
não foram adicionados atalhos para History de outras sessões. Ao não existir
encontro live, Cards mostra **Aguardando alvo** e limpa sprite, tipo, nível,
raridade e Shiny. Com Analyzer indisponível, informa indisponibilidade.
Essa decisão deliberadamente significa que login direto sem `combat.started`
novo não mostra a última espécie de CURRENT, mesmo se CURRENT tiver headline
preenchida. Não há clique programático em Hunts, gameplay, interceptação de
rede, reidratação de encontro ou mudança do Analyzer original.

**Implementação:** em `src/modules/coupled-workspace/cards.js` foram
removidos `state.targetContext`, o acesso a `activeHuntZoneByWindow`, extração
de sprite do marcador e fallback de faixa/elementos de zona; os atributos de
target são totalmente dirigidos pelo encontro atual. Sprite utiliza apenas
metadado de espécie nativa para o ID do encontro *live*, quando disponível;
sem sprite autorizado, permanece `SEM IMG` sem fabricar caminho externo.
`src/modules/coupled-workspace/controller.js` também suprime um
`raw.currentTarget` incoerente com status paused/waiting. Não houve mudança
de estilo, layout, host, API pública do Analyzer ou comportamento de gameplay.

**Regressão RED→PASS:** o teste criado mostrou `Pikachu` mantido mesmo após
`currentTarget:null`. Após a correção, cenário de cold login com sessão
anterior e mapa lembrado, live→terminal, paused/waiting malformados, troca
de alvo e nova Hunt sem encounter limpam a ficha corretamente; uma leitura
de arte nativa concluída **depois** da finalização não pode reviver o alvo.
Fixtures antigas que exigiam arte de zona e alvo persistido entre encontros
foram atualizadas para o contrato B. Resultados:

- Testes Cards/standalone **64/64 PASS**;
  hidden mode + correlação WebView2 JS **30/30 PASS**.
- `npm test -- --test-reporter=dot`: **exit0**, suíte integral;
  benchmarks de Cards/reconcile **13/13 PASS**;
  `node --check` cards/controller e `git diff --check`: **exit0**
  (avisos Windows LF→CRLF sem erros de whitespace).
- Freeze verify **6/6 artefatos** e proveniência
  **7/7 arquivos fonte com SHA correspondente**. Core isolado
  `final-v18-core-01`: exit0, timeout=false, marker PASS de replay,
  canceled navigation, resync e focus persist. Close-during-init e
  close-during-switch na mesma tupla **PASS**.
- Visual estendido local `final-v18-visual-01`: exit0, timeout=false,
  marker PASS e 51 PNG. Comparação v17→v18: **43/51 SHA idênticos**;
  oito diferenças nas telas History/Loot e drawer/composite. Inspeção visual
  direta amostral das telas single, dual, 1:2, History estreito e Overflow
  não identificou corte novo do alvo ou perda de controles. Essa evidência
  é **estática/sintética** e não demonstra a transição durante um combate
  real; não inferir melhoria de CPU/RAM nem aceite live desse resultado.

**Gates:** TECH synthetic com asserts de fonte, cleanup/async e host PASS;
o revisor técnico independente **pré-patch** identificou e orientou a remoção
do último uso de zone art e das expectativas obsoletas; as mudanças finais
foram executadas e testadas pelo autor. Não há parecer independente
**pós-patch** disponível nesta retomada devido à indisponibilidade de
reativação do revisor. UX visual é `VISUAL EVIDENCE INSUFFICIENT` para
transições *em movimento* de target live, login real e recuperação ao mudar
Hunt/Expedição; somente capturas estáticas sintéticas foram examinadas.
Os P2 herdados History horizontal a 235px e EXP estreito continuam sem
alteração atribuível a este patch. Portanto `NOT READY FOR RELEASE`.

**Próxima validação exclusiva do PO para o par v18:** login direto antes de
qualquer evento novo deve mostrar `Aguardando alvo` (e não último Pokémon);
enquanto uma Hunt observa um encontro live, Cards deve apresentar
nome/nível/raridade/Shiny recebidos do Analyzer, sem abrir Hunts; depois da
captura/falha/pausa deve voltar imediatamente após refresh a `Aguardando
alvo`. Confirmar que voltar de Game não recupera alvo anterior. Isso testa
o **comportamento B solicitado**, não a presença de espécie estática no
primeiro frame após login. A v17 original permanece congelada e aceita
funcionalmente nos quatro cenários reportados, mas o novo par v18 aguarda
o aceite próprio. Sem commit/push/merge/tag ou promoção do EXE/`dist/`
compartilhados.

## Supersessão v19 — decisão final do PO: opção A do CURRENT

**Decisão do PO às 16:54:** “Não, volte pra opção A do analyzer;”. A opção B
foi **revogada**; o último candidato B, v18, permanece congelado somente como
checkpoint histórico. O Cards passa a mostrar a **espécie da ocorrência mais
recente da sessão CURRENT do Hunt Analyzer**, inclusive entre encontros e
depois do login direto, tal como o seletor da headline CURRENT. Isso inclui
uma ocorrência já terminal da mesma sessão: o valor **não prova** um combate
ativo. Nenhuma informação de outras sessões History, do último marcador
Hunts/Atlas ou de um clique programático no mapa pode preencher essa espécie.

**Identidade create-only para o handoff do PO:**

| Artefato | SHA-256 / identidade |
| --- | --- |
| Campanha | `.local-evidence/coupled-webview2-perf/tuples/cwperf002005-current-session-po-0127-v19/` |
| `tuple-manifest.json` | `C8A18B1977959D53C435E9AE1713DB1FC5AA492DF28DE9133FF5A329DD004290` |
| Host isolado, **idêntico à v17/v18** | `709F0010C80E0243D118FC1AF54BC4238F010827F1F75681ED16DFA125B6D0C8` |
| Better UI `@version 0.2.127` | `9A57AEE15F0BE56155F3554AFAFC7A865FB1CD982D168C1DFF413B39078A8B54` |
| Analyzer embed source-built `1.15.0` | `603A38F1BA696C8F66401D6EB46D45437F18DADBF200975B028641F2CC47726C` |
| `measurements/final-v19-core-01.json` | `C67677781CF359E395869D9E197104E8AB5D6368E1991846B8523C04896E8DED` |
| `measurements/final-v19-visual-01.json` | `78FEBD2CA7BA06CC43D1068397D197DA15C58EDE94CC00F5EE5CF63BF29B6A24` |

**Fonte autoritativa e fronteiras:** no repositório original
`G:\pokepixel-hunt-analyzer`, sem promover um bundle do usuário, a projeção
allowlisted `createPublicSummary().currentSessionSpecies` recebe o mesmo
`latestSpeciesEncounter` de `userscript/hunt-view-model.js` empregado pelo
título CURRENT em `userscript/current-view.js`, já filtrado pela consulta
`getBySessionId` da **sessão CURRENT**. O `main.js` mantém o seletor em cache
por revisão de dados do encontro, evitando nova varredura de rows a cada
tick de 1 s. O protocolo público continua v1, sem expor `sessionId`,
`encounterId`, linhas cruas, dados de autenticação ou novos métodos; tanto
standalone quanto embed preservam o `currentTarget` estritamente confirmado
para batalha ativa. Em Expedição running, `currentSessionSpecies` é `null`,
como o título CURRENT `EXPEDITION`. Uma Hunt nova sem ocorrência resulta
`null`; se a API pública de um Analyzer embed antigo não incluir o campo,
o consumidor falha de maneira segura em vez de recuperar History.

**Projeção visual no Cards:** `summary.currentTarget`, quando confirmado
com `status=running`, ainda tem prioridade e recebe `ALVO`, nível, raridade,
Shiny e tipos próprios da batalha. Na ausência desse encontro, mas com
`summary.currentSessionSpecies`, aparece o nome da última espécie da CURRENT
com a identificação explícita **`ÚLTIMO DA HUNT` / `Último visto nesta Hunt`**.
Não inferir nível, raridade, Shiny ou tipos da ocorrência que pode ter
terminado. Sprite normal é obtido somente pelo ID de espécie da fonte pública
usando a API nativa de metadados já existente; sem imagem válida, usa
placeholder, jamais um arquivo do marcador do mapa. Ao entrar em outra sessão
sem encontros, nenhuma espécie da sessão anterior é retida. A Story da
sessão corrente permanece como seção independente, mas não serve para
recuperar a identidade da ficha; não há ligação à History de sessões antigas.

**Regressões comprovadas em fonte/fixture:**

- Analyzer `tests/unit/public-summary.test.js`: teste RED→GREEN da nova
  projeção, seleção da última ocorrência por timestamp, exclusão de fields
  privados, exclusão em Expedição running, null na nova sessão e cache por
  revisão. O embutido real sintético `tests/integration/embedRuntime.test.js`
  inicia em login frio com *Mewtwo* mais recente de **outra sessão** e
  *Typhlosion* da sessão CURRENT pausada: publica exclusivamente Typhlosion,
  não promove `currentTarget` e limpa a espécie após `reset`/nova Hunt.
  Um primeiro assert entre realms foi corrigido para comparar strings
  primitivas, sem mudança do resultado esperado. A suíte Analyzer integral
  terminou **exit0** (537 testes na primeira rodada integral; nova regressão
  de reset direcionada exit0).
- Better UI `test/coupled-workspace.test.js`: teste RED→GREEN de login frio
  exibindo Typhlosion sem a janela Hunts, mantém última espécie entre
  encounters, distingue `ALVO` live de `ÚLTIMO DA HUNT`, elimina badges sem
  confirmação, limpa na nova sessão e não usa History/Atlas para recuperação.
  **66/66 PASS** na suíte Cards/standalone; `npm test` integral exit0;
  benchmark Cards/reconcile **13/13 PASS**; `node --check` e
  `git diff --check` passaram (avisos LF→CRLF sem erro).
- O freeze `--analyzer-current-source` cria o Analyzer embed diretamente
  na **tupla ignorada**, nunca em `dist/` normal, e armazena a proveniência
  esbuild original. Manifesto `Freeze-PerformanceTuple -Verify`: **6/6**;
  proveniência atual original Analyzer **100/100** e Better UI **7/7** hashes
  idênticos à fonte congelada. A tupla preserva os hosts v17 e v18.
- `final-v19-core-01`: exit0, sem timeout, `coreBaselineVerdictCaptured=true`,
  logs PASS de replay/sessões, navegação cancelada, resync e foco/Save, zero
  descendentes observados e sem cleanupError. Close-during-init e
  close-during-switch da tupla **PASS**.
- `final-v19-visual-01`: exit0, sem timeout,
  `extendedVisualVerdictCaptured=true`, **51 PNG** locais. Comparação com
  v18: **49/51 byte-idênticos**; as duas diferenças
  (`maintenance-drawer.png`, `workspace-drawer-composite-1180.png`) foram
  inspecionadas contra as equivalentes v18 sem mudança visual óbvia.
  Screenshots de Cards single/dual e menu Overflow também foram vistos;
  **a fixture não desenha o novo estado `ÚLTIMO DA HUNT`**, portanto não
  prova legibilidade/desenvolvimento visual do rótulo em painel de 235 px,
  sua transição animada, nem sua exibição no login real.

**Gates e limitações:** evidência de implementação e WebView2 sintético
PASS; revisão independente **pós-patch v19 não foi obtida** porque o sistema
de workers sinalizou `PRIME_TRANSFER_IN_PROGRESS` ao tentar reativar o
revisor. Não registrar TECH/UX/VISUAL final a partir somente do autor.
`VISUAL EVIDENCE INSUFFICIENT` para a tela fallback e transições reais.
P2 herdados History overflow em 235 px, EXP em painel estreito e estados
dinâmicos de Overflow permanecem. Não foram medidos ganhos CPU/RAM
pareados. A v19 **não foi aberta ou validada no jogo por um agente**.

**Aceite manual específico do PO, com esse host + esses dois bundles:** após
login direto *sem abrir Hunts*, se a sessão CURRENT tiver uma espécie já
registrada, Cards mostra essa espécie como `ÚLTIMO DA HUNT`, inclusive com
sessão pausada. Um novo encontro live mostra `ALVO` com seus atributos
confirmados; após captura/falha, mantém somente o contexto `ÚLTIMO DA HUNT`
da sessão CURRENT, sem declarar rarity/nível/Shiny do combate encerrado. Uma
nova Hunt vazia não herda a espécie anterior; nem uma Hunt mais antiga em
History fornece target. Checar visualmente nomes e rótulos em Single/Dual,
Game→Cards e no painel estreito. Até o PO relatar verde, **`pending in-game
validation` / `NOT READY FOR RELEASE`**. Sem commit, push, merge, tag,
promoção do EXE normal ou `dist/` compartilhado.
