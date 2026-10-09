# Mark’s Shop — full Better UI overhaul

Status: overhaul validado localmente em Better UI 0.2.88; validação final no jogo pendente.

## Direção

Direção visual atual: superfície Better UI coerente — carvão/stone, arestas quadradas, tipografia e espaçamento do MASTER, cyan para interação/foco, dourado para estado persistente selecionado, verde para sucesso/valor e vermelho somente para venda destrutiva. A antiga camada conceitual de pixel-art/“field-counter ledger” não é mais requisito e não deve introduzir overlays, ornamentos ou `image-rendering` próprios do módulo.

O redesign é de apresentação e fluxo visual. O cliente continua sendo a autoridade de compra, venda, estoque, saldo, seleção, filtros, confirmação, limites, lotes e erros. Better UI não cria um segundo executor transacional.

## Estrutura comum

- A janela, titlebar, body, busca, navegação, workspace, listas, scrollbars e rodapé entram no sistema Miyazaki 16.
- As quatro abas nativas continuam sendo os mesmos botões e handlers: **Buy items**, **Sell items**, **Sell Pokémon** e **Buyback**.
- A navegação deixa de funcionar visualmente como side rail e passa a uma faixa superior de quatro colunas; abaixo de aproximadamente 520 px de largura do container vira grade 2 × 2, sem rolagem horizontal como fluxo principal.
- A busca continua sendo o input nativo e preserva valor, foco, filtro e renderer do jogo, agora dentro de um rótulo visual persistente derivado do próprio `aria-label`/placeholder nativo de cada aba.
- Os conteúdos usam scroll vertical com o primitivo PPBUI de 10 px; o módulo não cria scroll horizontal como solução para layout estreito.

## Comprar itens

- **List / Cards** volta a existir como escolha de apresentação Better UI; **List é o padrão**. A troca apenas muda estado/classes PPBUI sobre os mesmos nós nativos e nunca clona/recria item, quantidade, total ou ação.
- Cada item preserva ícone, nome, descrição, categoria, botões rápidos nativos, quantidade personalizada, total calculado e botão Buy originais.
- A **quantidade personalizada + total + Buy** é o fluxo visual principal. Os botões rápidos nativos `1x / 10x / 100x / Max` permanecem no DOM com seus handlers para compatibilidade, mas não participam da apresentação Better UI.
- O piso antigo de 490 px permanece removido. Em List cada item ocupa uma linha compacta com quantidade em destaque; Cards usa a mesma estrutura nativa em grade responsiva. Em largura estreita, a área de compra empilha sem scroll horizontal.

## Vender itens

- As linhas nativas recebem a mesma gramática visual da loja sem serem recriadas.
- Checkbox, quantidade, preço/total e botão Sell continuam nativos.
- Seleção recebe estrutura dourada independente do foco cyan.
- O rodapé de venda vira uma action rail única; `Select All` não recebe uma segunda moldura/linha própria. Sell é tratado visualmente como ação destrutiva e continua obedecendo `disabled`/pending do cliente.

## Vender Pokémon

- **Groups** permanece o modo inicial e **List** mantém a visão de linhas nativas.
- Groups agrupa apenas as linhas visíveis por `species_id`, preservando a ordem nativa dos indivíduos e a ordem de primeira aparição das espécies.
- Cada grupo mostra checkbox, uma região quieta de fatos da espécie (`selecionados/visíveis` + valor total dos indivíduos visíveis) e um disclosure quadrado independente. O botão de disclosure possui `aria-expanded` e `aria-controls`; expandir/recolher não altera seleção.
- Inventários grandes não comprimem os cabeçalhos dos grupos para caber no viewport: a lista Pokémon usa tracks `max-content` e mantém scroll no owner nativo. Um grupo expandido com muitos indivíduos é limitado a `min(360px, 50vh)` e recebe scroll vertical interno.
- A validação de seleção do modo Groups calcula o snapshot de criaturas visíveis uma única vez por ciclo de sincronização, em vez de refiltrar todo o inventário para cada espécie.
- O checkbox do grupo encaminha exatamente um gesto a cada checkbox nativo ainda válido. Estado misto usa `indeterminate`. Nenhum ID selecionado paralelo é persistido pelo módulo.
- As linhas expandidas são os próprios nós nativos. Seleções ocultas por filtro continuam selecionadas; novas capturas nunca herdam seleção de espécie.
- O resumo de seleção informa selecionados totais e quantos estão fora do filtro atual **dentro do próprio rodapé nativo**, como texto quieto sem criar um segundo strip/divisor.
- O botão Sell, confirmação, lote nativo e tratamento de erro continuam sendo a única execução de venda.
- Mapeamento ambíguo, ID duplicado, localização insegura, linha/checkbox substituído ou outro desvio do contrato desativa apenas o agrupamento: a lista nativa permanece utilizável.

## Buyback

- Cada registro nativo vira uma linha compacta de ledger com sprite, identidade/metadados, preço e o mesmo botão Buyback.
- Raridade mantém sua cor canônica. O botão Buyback é apresentado como ação primária, mas o handler e toda validação continuam nativos.

## Lifecycle e ownership

- A loja pertence a `PokeIdle.NPC` e não a uma Scene. O mount exige o body realmente pertencente ao controlador, shell da loja e as quatro abas.
- O discovery parte do sentinel exclusivo `.npc-shop__shell` antes de inspecionar a
  raiz `.npc-shop-window`. Isso é obrigatório porque Nature e Geneticista reutilizam
  `.npc-shop-window`, mas não são Mark’s Shop e podem conter centenas de cards. O
  módulo não percorre essas árvores para depois rejeitá-las.
- O observer central reconcilia reconstruções; não há observer local, polling, patch global nem interceptação de rede.
- Classes PPBUI adicionadas a nós nativos têm ownership reversível e são aplicadas de forma idempotente; `sync()` estável não gera mutations.
- Linhas movidas para grupos recebem anchors reversíveis. Cleanup só devolve linhas que ainda pertencem a um wrapper PPBUI; se o host tiver reparentado uma linha, a posição do host vence e o anchor antigo é descartado.
- `pt_BR`/locales com underscore são normalizados antes de `toLocaleLowerCase`/`toLocaleString`, com fallback fail-safe.

## Acceptance & Evidence Matrix

| ID | Requirement | Must preserve | Evidence | Status |
| --- | --- | --- | --- | --- |
| AC-01 | Loja inteira usa o shell Better UI atual, sem overlay pixel-art legado | nós/handlers nativos | source + browser render | em revisão |
| AC-02 | Nenhuma compra/venda paralela é introduzida | confirmação, limites, batching, erros e APIs nativos | automated + technical QA | em revisão |
| AC-03 | Buy funciona em largura normal/estreita sem piso de 490 px, List padrão e quantidade como foco | List/Cards + todos os controles originais | automated + browser render | em revisão |
| AC-04 | Sell Items integra seleção/quantidade/ação ao novo sistema | input, checkbox e Sell originais | automated + browser render | em revisão |
| AC-05 | Sell Pokémon mantém Groups/List seguro e fail-closed | seleção oculta, novas capturas, ordem e Sell nativo | automated + UX/technical QA | em revisão |
| AC-06 | Buyback recebe o mesmo overhaul sem trocar o executor | botão/handler nativo | automated + browser render | em revisão |
| AC-07 | Layout estreito empilha controles sem perder ações | foco, leitura, overflow e scrollbar | browser render + live | em revisão |
| AC-08 | Reconcile/cleanup são reversíveis e mutation-free quando estáveis | host reparent, root replacement, disable/re-enable | automated + technical QA | em revisão |
| AC-09 | Seleção, foco, disabled e ação destrutiva permanecem distinguíveis | keyboard/native semantics | UX QA + browser render | em revisão |

## Verificação atual

- Fixture determinística cobre as quatro abas e não executa transações reais.
- Focused suite atual: **27/27 PASS**, incluindo List/Cards sem clonagem, quick-buy nativo preservado porém fora do fluxo visual, quantidade principal, rodapé único de Select All, identidade de nós/handlers, replacement repetido do Search com cleanup exato, reconciliação mutation-free, locale `pt_BR`, host reparent, stale checkbox, fail-closed, valores nativos sem piso local, Group ARIA, Sell Items, Buyback, inventário agrupado grande, reutilização das referências nativas capturadas e rejeição sentinel-first de NPCs não-loja com 500 cards.
- O sentinel-first continua presente no candidato `0.2.137`; a validação final da suíte/build
  do candidato está registrada em `docs/MARKS_SHOP_NPC_DISCOVERY_PERF_STATUS.md`.
- Preview local usa Chrome headless com CSS nativo snapshottado + design system atual em 880 px e 390 px. A regressão de inventário grande também verifica que a lista mantém scroll próprio e que o corpo expandido fica limitado a `min(360px, 50vh)`. É evidência representativa, não validação no jogo.
- A única validação final no cliente real/Tampermonkey pertence ao Product Owner.

### Regressão de performance — 2026-10-02

O caso reportado ocorre com Nature/Geneticista abertos durante uma Hunt, enquanto o
Evolution Center permanece estável. O código nativo atual explica a diferença:
Nature (`npc-nature-window`) e Geneticista (`npc-iv-window`) também carregam
`.npc-shop-window`, constroem listas amplas de criaturas e usam `PokemonCard.bindSlot`;
Evolution Center usa `.npc-evolution-window` e não entra no discovery da loja.

Antes da correção, `findShop()` chamava `parts(root)` em toda `.npc-shop-window` que
pertencesse ao `PokeIdle.NPC`, fazendo múltiplas consultas na árvore inteira antes de
descobrir que faltava `.npc-shop__shell`. Um probe sintético JSDOM com 500 cards mediu
~42,15 ms por rejeição. Com discovery pelo sentinel da loja, o mesmo probe mede
~0,005 ms por rejeição e o teste garante zero consultas na subárvore da janela falsa.
Esses números medem custo relativo do detector em JSDOM; não são uma medição de FPS do
jogo. A confirmação de FPS na Hunt continua sendo evidência live do Product Owner.

### Regressão de reconcile — 2026-10-09

Uma segunda auditoria encontrou custo residual no próprio Mark’s Shop aberto: o sync
estável redescobria a checkbox de cada Pokémon e varria seletores de Buy/Sell/Buyback
mesmo na aba Pokémon. No mesmo probe sintético de 500 Pokémon usado para comparar o
candidato, o `0.2.189` mede ~41 ms de mediana por sync; o candidato `0.2.190`, após
reutilizar referências capturadas, restringir decoração à aba ativa e decorar rows
agrupadas somente quando a estrutura muda, mede ~7 ms. A troca de checkbox pelo host
continua fail-closed e coberta por regressão. Os valores são JSDOM relativos; FPS real
continua sendo evidência exclusiva do Product Owner.

## Referências

- `design-system/pokepixel-better-ui/MASTER.md` — autoridade visual global.
- `NpcInteraction.js` público, reconferido em 2026-09-23 — estrutura atual de Buy (`1/10/100/Max` + custom quantity/total/Buy) e footers nativos de Sell Items/Pokémon.
- CSS público de NPC/shop, reconferido em 2026-09-23 — constraints atuais do host usadas na validação de cascade.
- Script de referência **PokePixel - Safe Pokémon Seller v1.1.0** — somente ideias de revisão por espécie/seleção parcial; não foram portados painel externo, varredura global, chamadas diretas de API, timers ou executor de lotes.
