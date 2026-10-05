# Nature / Geneticista — Hunt performance investigation

Date: 2026-10-02

## Request

Investigar a queda de FPS ao abrir `Nature` ou `Geneticista` durante uma Hunt, usando
`Evolution Center` como controle estável.

## Live results from 0.2.135 / 0.2.136 / 0.2.137

The Product Owner tested the 0.2.135 sentinel-first Mark’s Shop fix in the real
client and reported that the performance problem **persisted**. Evolution Center
remained stable. Therefore the Mark’s Shop false-positive was a real measurable
cost, but it was not the complete cause of the live FPS collapse.

The Product Owner then tested 0.2.136 and again reported the problem **persisted**,
with the FPS drop severe enough to approach zero. Evolution Center again remained
stable. Subsequent Chromium computed-style verification found that the 0.2.136 ring
override had not actually disabled the host animation.

The Product Owner then tested 0.2.137, where the ring override was proven effective and
the persistent Team HUD was scoped locally. The FPS collapse nevertheless **persisted**.
This ruled out those two paths as the dominant remaining cause and led to a full audit
of the active Platform Hunt renderer's MutationObserver footprint.

## Root causes and amplifiers

### 1. Mark’s Shop false-positive — fixed in 0.2.135

O host reutiliza `.npc-shop-window` em Nature e Geneticista. O discovery antigo de
Mark’s Shop percorria essas árvores grandes antes de descobrir que faltava o sentinel
real `.npc-shop__shell`. O 0.2.135 passou a iniciar pelo sentinel e reduziu esse caminho
para ordem de microssegundos. A correção permanece válida no 0.2.137.

### 2. Global observer fan-out — filtrado em 0.2.136, scoped em 0.2.137

Nature/Geneticista podem possuir centenas de cards. Durante Hunt, efeitos transitórios
do renderer/HUD geram mutações no `body`; o observer central coalescia essas mutações,
mas cada wake ainda executava `shouldMount()` de todos os módulos. Em probe JSDOM com
500 cards, somente esse sweep chegou a ~41 ms por reconcile; com 1.000 cards chegou a
~79 ms. No mesmo perfil, Mark’s Shop já custava ~0,01 ms, confirmando que o gargalo
residual estava no fan-out global sobre um DOM grande.

O 0.2.136 não agenda reconcile para subárvores nativas do Hunt que nenhum módulo Better
UI consome: nameplates, battle popups, capture/move speech do Hunt clássico e move/
effects/notices/capture lane do Platform Hunt. Algumas dessas superfícies de captura são
interativas no host, mas sua lógica é inteiramente nativa e não depende do reconcile do
Better UI. Qualquer mutação fora desses escopos continua acordando o lifecycle.

O caminho residual mais frequente era o Team HUD nativo: `huntsim.companion_vitals`
executa `TeamHud.render()`, que reanexa cards/filhos e gera `childList`. No 0.2.137,
mutações internas de um HUD já melhorado são roteadas apenas para módulos no scope
`team-hud`. A remoção/substituição do mount sentinel `.pokeidle-team-hud__list`, ou uma
mutação global coalescida no mesmo frame, continua exigindo reconcile completo. Em
fixture JSDOM com 500 cards de Nature, 30 full discoveries equivalentes somaram
~1,065 s (~35,5 ms/wake), enquanto o roteamento local do observer somou ~5,5 ms antes
do sync. O sync real do Team HUD ficou na ordem de ~1–2 ms/wake nessa fixture; Presets
recolhido deixa de executar sua busca global pela janela Team em cada wake.

### 2b. Platform Hunt renderer ainda promovia reconcile global — 0.2.138

O renderer público atual do Platform Hunt mantém um segundo consumidor de
`huntsim.companion_vitals`. A cada update ele chama `renderTeamSwitcher()` e
`renderArena()`. O switcher reescreve `aria-disabled`/`disabled`, `textContent` de nome
e status e reanexa cada botão de membro. Essas mutações têm targets como
`.platform-hunt__team-switcher`/`.platform-hunt__team-member`, que não estavam nos
seletores pontuais filtrados pelo 0.2.136/137; portanto continuavam acordando o
reconcile global.

O Better UI não consome o renderer privado `.platform-hunt__*`. No 0.2.138, a própria
`.platform-hunt` passa a ser a boundary de ownership: mutations cujo target já está
dentro dela são ignoradas, exceto `.pokeidle-buff-strip`, superfície nativa compartilhada
que o Better UI realmente move/aprimora. A criação/remoção da raiz continua global porque
o target do MutationRecord é `body`. Em probe JSDOM com o padrão real de reappend/aria/text do
switcher, 30 full discoveries equivalentes mediram ~29,7 ms/wake em 500 cards,
~92,7 ms em 1.000 e ~232 ms em 2.000; o novo boundary produziu zero full reconciles e
~1–3 ms totais de observer para os 30 batches.

### 2c. Pokémon Profile mantinha um reconcile feedback loop — 0.2.138

`pokemon-profile` monta sempre que existe `document.body` e recebe todo reconcile global.
O `syncCopy()` anterior reatribuía textos e atributos mesmo quando o valor já era igual.
Essas escritas criavam novos MutationRecords; portanto um único evento externo mantinha
um novo `requestAnimationFrame` de reconcile pendente indefinidamente. Em DOM pequeno o
custo era mascarado; Nature/IV amplificavam cada ciclo porque seus rosters fazem os
`shouldMount()` negativos varrerem milhares de nós. O 0.2.138 compara texto/atributo/
propriedade antes de escrever. O repro end-to-end agora termina após o primeiro ciclo e
dois `sync()` estáveis do Profile geram `0` MutationRecords.

O `PersistentHUD.js` público atual também confirma que `TeamHud.render()` chama
`renderWallet()` e `renderMobilePartyAccess()` a cada atualização de vitals. Wallet e
botão mobile são siblings do root Team HUD, portanto escapavam do scope local do
0.2.137. O 0.2.138 ignora apenas mutations **internas** desses roots auxiliares; a
adição/remoção/replacement das próprias raízes continua global. `.pokeidle-buff-strip`
permanece observável inclusive quando hospedada dentro do Platform Hunt.

### 3. Native animated window ring — falha de cascade no 0.2.136, corrigida no 0.2.137

O stylesheet público atual do jogo documenta que o anel `::after` de janelas anima uma
custom property que não roda no compositor, forçando restyle/repaint por frame. O
próprio comentário nativo registra uma janela com algumas centenas de botões da
**Central Genética** em aproximadamente 11 FPS. O rule-set fica dentro de
`@layer pokeidle-glass` e usa `animation: ... !important`.

O 0.2.136 tentou neutralizar essa animação fora de qualquer layer. Pela cascade de CSS,
o `!important` layered do host vence o `!important` não-layered do Better UI. Ao mesmo
tempo, `will-change:auto!important` vencia o `will-change:transform` não-important do
host. Chromium com o CSS público atual reproduziu a falha: Nature/IV continuavam com
`animationName=pokeidle-glass-border` e `willChange=auto`, enquanto Evolution mantinha
`pokeidle-glass-border` + `transform`.

O 0.2.137 coloca o override no mesmo `@layer pokeidle-glass`. O mesmo probe Chromium
agora retorna Nature/IV `animationName=none`, `willChange=auto`; Evolution permanece
`animationName=pokeidle-glass-border`, `willChange=transform`.

### 4. Invisible roster-card hover animation — 0.2.138

O host também inicia `pokeidle-glass-border` no `::after` de botões em
`:hover`/`:focus-visible`. O Better UI já torna os tokens desse anel transparentes nos
botões nativos, portanto o efeito não aparece visualmente em Nature/IV, mas a animação
da custom property continua executando. Trace Chromium com o CSS público atual mostrou
escala pelo tamanho do roster: Nature com 800 cards e um card hovered ficou em cerca de
200 style recalcs e ~0,82 s de `TaskDuration` num sample de 1,4 s; removendo apenas a
animação do pseudo do roster, caiu para ~5 recalcs e ~0,40 s. IV reproduziu o padrão.
Remover backdrop blur ou o rule de tokens transparentes não removeu o custo. O 0.2.138
desliga a animação apenas em `.npc-nature-window .npc-nature__pokemon::after` e
`.npc-iv-window .npc-iv__pokemon::after`; Evolution, tabs e ações não mudam.

`PokemonCard.bindSlot` foi investigado: Nature/Geneticista vinculam todos os cards,
enquanto Evolution usa um roster elegível menor. Porém o binding é dirigido por evento;
com o ponteiro parado ele não possui loop JS próprio. Um probe Chromium com
`content-visibility`/containment em 500/1.000 cards não mostrou ganho material sob
mutações externas, portanto virtualização/containment não entram no candidato.

## Acceptance & evidence

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| AC-PERF-01 | Nature/Geneticista sem o shell exclusivo da loja são rejeitados antes de consultas na raiz candidata | regressão com 500 cards e contador de `querySelector*` | `pass` |
| AC-PERF-02 | Mark’s Shop real continua sendo identificado pelo mesmo root/ownership/4 abas | suíte `marks-shop` existente + probe real-shop | `pass` |
| AC-PERF-03 | O custo de rejeitar uma grande janela NPC cai materialmente | probe JSDOM 500 cards: ~42,15 ms → ~0,005 ms/chamada | `pass` |
| AC-PERF-04 | Mutações puramente visuais do Hunt clássico/Platform não acordam o reconcile global | regressão do observer + pressure probe | `pass` |
| AC-PERF-05 | Mutações estruturais reais continuam acordando o reconcile | regressão do observer | `pass` |
| AC-PERF-06 | O override vence o important layer nativo somente em Nature/Geneticista; Evolution permanece controle | Chromium computed style + CSS regression | `pass` |
| AC-PERF-07 | Churn interno do Team HUD já montado evita discovery global; troca do mount sentinel/mutação global ainda promove lifecycle completo | foundation regressions + pressure probe | `pass` |
| AC-PERF-08 | Churn interno do Platform Hunt não acorda discovery global; attach/detach da raiz continua global | foundation regression + current public PlatformHunt contract + pressure probe | `pass` |
| AC-PERF-09 | Hover/foco de cards Nature/IV não executa animação invisível da custom property; demais controles/Evolution permanecem nativos | public CSS + Chromium trace + CSS regression | `pass` |
| AC-PERF-10 | Profile sync estável produz zero MutationRecords e um seed externo não sustenta novo RAF de reconcile | direct MO regression + end-to-end observer probe | `pass` |
| AC-PERF-11 | Wallet/mobile vitals churn não acorda discovery global; root lifecycle e Buff Strip compartilhado continuam observáveis | foundation regressions + current public PersistentHUD/BuffEffectsHUD contracts | `pass` |
| AC-PERF-12 | Nature e Geneticista mantêm FPS estável na Hunt real | Product Owner in-game | `pass` |

Todos os tempos JSDOM são sintéticos e demonstram custo relativo do código; não são FPS
nem frame time do cliente real. O valor ~11 FPS é uma observação documentada pelo
stylesheet nativo sobre a própria animação, não uma medição feita pelo Better UI.

## Candidate

- Better UI: `0.2.138`
- Userscript SHA-256: `CEE4BA11B502DE50416C579DBDC464DCD9F847303761FD60B64A2327B8A1B6B5`
- Focused foundation: `10/10 PASS`
- Platform Hunt pressure probe: 500 cards ~29,7 ms/wake old-equivalent; 1.000 ~92,7 ms;
  2.000 ~232 ms; new boundary `0` global reconciles for all tested sizes
- Chromium current-host cascade probe: Nature/IV `animationName=none`; Evolution
  `animationName=pokeidle-glass-border`
- Team-HUD pressure probe, 500-card Nature fixture: 30 old-equivalent full discoveries
  ~1,065 s total; scoped observer routing ~5,5 ms total before local sync
- Full repository suite: `611/611 PASS`
- Build: `PASS`
- `git diff --check`: `PASS`
- Independent exact-candidate QA: `PASS` — runtime/lifecycle reviewer `P0/P1/P2/P3 = 0`, CSS/perf reviewer `P0/P1/P2/P3 = 0`; `TECH READY` / `PERF READY` no escopo de código/sintético
- Product Owner in-game FPS: `PASS` em `0.2.138` para Nature/Geneticista durante Hunt; Evolution Center preservado como controle. Observação ambiental: Chrome ainda apresenta degradação relativa de performance, mas o navegador não é o ambiente otimizado para o jogo e isso não reproduziu o colapso corrigido pelo candidato.
