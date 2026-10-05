# Inventory — encontrar e organizar

Status: os contratos funcionais e a estrutura atual de Inventory estão validados pelo
Product Owner. Em 2026-09-24, a navegação de categorias voltou ao formato dropdown à
esquerda do Search, preservando os handlers nativos e o restante das duas utility rails.
Freeze local: **Better UI 0.2.72 / candidate71**.

Refinamento atual, 2026-10-02: ownership visual de scrollbar foi devolvido ao host,
Search recebeu fallback acessível localizado e os slots ganharam foco visível escopado.
O slice de filtros/Load More foi validado in-game pelo Product Owner em 2026-10-02.
Na extensão seguinte, a **Wallet nativa** passa a ser apresentada no topo da Backpack,
na mesma utility rail de **Sort / Re-Sort / Views**. O mesmo nó
`.pokeidle-team-hud__wallet` é movido para o espaço central dessa linha, entre Re-Sort e
Views; não há clone de
saldo, novo handler ou estado paralelo. Quando a Backpack fecha, o nó retorna ao contexto
nativo do Team HUD, mas o override global e estreito do Better UI mantém a Wallet
permanentemente oculta nesse sibling, independentemente do toggle do módulo Team HUD.
A classe nativa de collapse continua intacta e o mesmo `_walletEl` segue recebendo
updates do jogo. Foco é preservado ao mover um controle ativo para dentro da Backpack;
cleanup não força foco de volta para a Wallet oculta do HUD.
Na rail da Backpack, a Wallet fica centralizada no espaço flexível entre **Re-Sort** e
**Grid/List/Categories**. O preenchimento escuro dos wrappers nativos de saldo é
neutralizado somente nesse contexto; cada valor recebe uma borda discreta, altura mínima
de 24px e `2px 6px` de padding para evitar que números e ícones encostem nos limites da
box. Background-images, ícones, texto e updates do mesmo nó nativo são preservados.
Inventory `37/37 PASS`; Pokémon Tools `21/21 PASS`; Team HUD `18/18 PASS`; full suite
`650/650 PASS`; build e `git diff --check` PASS. O Product Owner validou in-game a
apresentação final da Wallet em 2026-10-02 e declarou o módulo **Backpack concluído**.

## Uso

- A busca continua sendo o controle original do jogo. Quando o jogo expõe categorias como
  tabs, Better UI oculta somente a faixa visual e cria um dropdown proxy que espelha as
  opções/seleção e delega cada mudança ao tab nativo correspondente. Os handlers e a
  autoridade do jogo permanecem intactos; cleanup restaura a faixa original.
- O placeholder da busca é **Search**; ao desativar o módulo, o original é restaurado.
  Quando o host não fornece um nome acessível próprio, Better UI adiciona o rótulo
  localizado da busca e o remove no cleanup; um `aria-label` nativo existente prevalece.
- Primeira utility rail: **Categoria · Search · Poké Filters · Clear Filters/Limpar**.
  O dropdown de categoria ocupa 140–190px à esquerda; Search usa o espaço restante e
  **Poké Filters** fica imediatamente à sua direita. Ao clicar em Poké Filters fora da
  categoria Pokémon, Better UI seleciona **Pokémon** pelo mesmo dropdown/proxy que delega
  ao controle nativo e abre os filtros avançados.
- Segunda utility rail: **Sort/Ordenar · Re-Sort/Aplicar · Grade · Lista · Categorias**.
  Sort ocupa um track limitado de 160–235px em vez de absorver todo o espaço livre;
  durante o scroll vertical da Backpack, as duas utility rails permanecem fixas no topo do
  body nativo. A segunda rail usa a altura renderizada da primeira como offset, inclusive
  quando os filtros quebram em mais de uma linha em larguras estreitas; o body continua sendo
  o único scroll owner.
  o proxy absoluto reaplica essa largura com a mesma prioridade do primitive de select e
  o próprio select mantém um fallback CSS escopado de 160–235px, evitando que o
  `width:100%!important` compartilhado volte a expandi-lo no jogo;
  Aplicar e o seletor segmentado de visualização ficam compactos e secundários. O texto adicional de Sort e o resumo Category/consulta/
  contagem permanecem removidos; o critério continua no seletor.
- Escolher ordem original, nome A–Z, quantidade decrescente de itens ou nível
  decrescente de Pokémon, **Highest IV**, **Highest Quality**, **Price: Highest First**
  ou **Rarity: Highest First**. Os rótulos de Sort usam capitalização por palavra
  nos idiomas com maiúsculas/minúsculas. A escolha é
  aplicada imediatamente e salva.
- **Aplicar** recalcula o critério escolhido; atualizações de quantidade/nível
  não ficam deslocando continuamente as entradas já ordenadas.
- **Limpar** esvazia a busca e seleciona All pelo fluxo nativo. A ordenação
  escolhida não é apagada por limpar filtros.
- Avisos de ausência de resultados, dados indisponíveis e falha ao salvar
  aparecem somente quando necessários.
- **Grade**, **Lista** e **Categorias** alternam a visualização sem trocar os
  slots nativos. A grade original é o padrão ao abrir ou reativar o módulo.
- **Inventory** aparece no painel Better UI e pode ser desativado separadamente
  do menu-bar. Desativar remove os controles e restaura a ordem DOM nativa.
- Enquanto a Backpack está montada, a Wallet nativa ocupa o lado direito da segunda
  utility rail, na mesma linha de Sort. O módulo move o elemento original para o host
  estável `[data-ppbui-inventory-tools] > .inventory-slots-toolbar`, preservando conteúdo
  dinâmico, listeners e identidade DOM mesmo quando o body nativo é reconstruído.
  Em largura muito estreita, Views descem para a linha seguinte e Wallet permanece na
  primeira linha com Sort. Fechar/substituir a janela ou desativar Inventory restaura
  `Team HUD → Wallet`; o override global do Better UI então mantém essa Wallet oculta,
  mesmo se o módulo visual Team HUD estiver desativado.
  Se a janela inteira for substituída pelo host, o lifecycle central reutiliza o mesmo nó
  na nova Backpack em vez de criar uma segunda Wallet.

Validação 0.2.72: Inventory `28/28 PASS`; full suite `415/415 PASS`; build PASS.
Userscript: `985705` bytes, SHA-256
`48C1E54DBEBA6C4103D16577CE7842D545D4D47CF8D11D668FCEF521DD655205`.
candidate71: `240640` bytes, SHA-256
`C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD`.
Smokes normal / close-during-init / close-during-switch: PASS, exit `0`, stderr vazio.

Os slots e ícones nativos não são alterados. Enquanto o módulo está montado, a janela
usa mínimo visual de 520px para manter as duas rails legíveis; cleanup restaura a
geometria nativa. Os fragmentos Better UI e a toolbar nativa explicitamente optada
usam tipografia, campos, botões, estados e geometria atual do MASTER; slots nativos
permanecem fora desse boundary. O corpo não recebe um card externo: rail de filtros,
rail de organização e content bay formam uma única composição contínua.
Search recebe um bridge local de especificidade para neutralizar `appearance`, box model,
border/radius, background, background-image, color, shadow e font nativos mesmo quando o
host usa regras `!important`. Os slots nativos recebem apenas o foco visível compartilhado
quando navegados por teclado; seus handlers e ações continuam intactos. Root, body e grid
mantêm o comportamento e a preservação de posição de scroll, mas permanecem superfícies
nativas: Better UI não repinta mais scrollbar, thumb, track, gutter ou botões WebKit.
O painel avançado de Pokémon continua com margem física horizontal de 8px; seu summary
interno fica oculto somente no Backpack porque o botão da primeira rail passa a controlar
esse disclosure. Trade e Storage preservam suas próprias apresentações.

Na categoria Pokémon, Better UI não depende mais do lote visual do botão nativo
**Load More Pokémons**. O adapter parte do resultado nativo, completa somente IDs já
presentes em `scene._creatures` e pertencentes a `inventory`/`backpack`/`team`, respeita
Search e os filtros Better UI e deduplica por ID. Se o host aplicar um segundo limite na
renderização, os slots restantes são criados com o próprio `scene.createSlot()` e inseridos
antes das células vazias. O controle Load More só é removido depois que a quantidade de
slots renderizados alcança o conjunto filtrado já carregado. Pokémon de Storage não são
incluídos e nenhuma API/requisição de carregamento adicional é feita.

## Visualizações

- **Grade:** layout original dentro do content bay, incluindo as células vazias nativas.
- **Lista:** um slot original por linha, com separadores simples em vez de cards por item.
  Itens mostram categoria, quantidade e preço unitário de venda ao NPC;
  Pokémon mostram seu preço de venda, nível, IV total,
  multiplicador de Quality e marcadores de equipe/shiny/bloqueio disponíveis.
  Dados ausentes são omitidos, sem estimativa. O texto não dispara ações;
  cliques, atalhos, duplo clique e tooltips continuam no slot original.
- **Categorias:** seções planas por categoria, com cabeçalho e grade nativa de slots;
  não cria cards dentro de um card.
  Cabeçalhos contam entradas, não unidades. A sequência segue as opções do
  filtro nativo; Sort se aplica dentro de cada bloco. Voltar à grade recupera
  a ordem global do critério escolhido.

As categorias dos itens vêm de `_items` na cena da mochila, usando
`category || type` e a normalização nativa de `boost_*` para `boost`.
Como o DOM não publica ID dos itens, a associação usa nome exato e exige
categoria inequívoca entre os registros correspondentes. Sem correspondência
ou com categorias conflitantes, o item fica em **Outros**. Os nomes dos blocos
reutilizam as opções do filtro; categorias adicionais mantêm sua chave nativa.

As visualizações movem os elementos originais sem cloná-los. As células vazias
ficam ocultas nas duas visualizações extras e reaparecem na grade. A seleção de
visualização vale enquanto o módulo está montado, inclusive durante refreshes;
não é gravada em storage. Cleanup remove wrappers, textos e estilos, mantendo
inserções e remoções legítimas do jogo. Não há outro observer ou polling.

## Semântica e limites

Nome ordena as entradas disponíveis. Quantidade só reorganiza os itens entre
suas posições; nível só reorganiza Pokémon entre suas posições. Valores
ausentes não viram zero. Empates mantêm a ordem de entrada. Células vazias,
handlers, IDs, marcadores, atalhos e prompts não são recriados.

Highest IV usa `iv_total` ou a soma dos seis IVs carregados quando todos estão
presentes. Highest Quality usa `quality_multiplier`, o multiplicador exibido
no cartão nativo, em ordem decrescente. Não usa cor, espécie ou shiny como
estimativa. Dados ausentes preservam a posição e geram aviso visível.
Ambos reorganizam apenas Pokémon, mantendo itens e células vazias nas posições.

**Price** compara itens e Pokémon juntos: usa `sell_price` dos itens já carregados
e `sell_value` dos Pokémon por ID, com fallback para `sell_price`, conforme o
cartão nativo. O preço é por unidade, sem multiplicar pela pilha.
A lista reutiliza `PokeIdle.Currency.element` quando disponível.
Zero informado é mantido; dados ausentes, inválidos ou conflitantes entre
itens homônimos aparecem como **—** e não participam da ordenação. Pokémon
sem preço carregado também preservam a posição. Não há estimativa de preço de
mercado nem venda automática.

**Rarity** usa a faixa declarada na classe nativa do slot, tanto para itens
quanto para Pokémon: mythical, legendary, epic, rare, uncommon, common, weak,
nessa ordem. Faixas ausentes/desconhecidas preservam posição. Esse critério é
distinto de **Highest Quality**, que compara o multiplicador de Pokémon.
Ambos os novos critérios seguem a política de ordem estável até Re-Sort.

Os dados são lidos por ID de `data-creature-id`, na cena cujo `_panel.body`
corresponde à mochila. O getter nativo `PokeIdle.ReactiveWindows.cached()`
permite localizar janelas sobrepostas; `SceneManager._scene` atende o fluxo
de cena convencional. Nenhuma API ou método de carregamento é chamado; para eliminar o
lote visual de Pokémon, Better UI pode reutilizar o renderer nativo `createSlot()` somente
para criaturas que já existem em `_creatures` da própria cena.
Esses contratos internos podem mudar em uma atualização do jogo; sem uma
correspondência segura, os critérios avançados deixam os slots no lugar.

O seletor real fica no painel estável, fora do corpo recriado pelo jogo.
Um espaço reservado antes de Re-Sort mantém seu alinhamento. Isso evita
remover o select e perder foco/seleção a cada tick. A reconciliação não reescreve
opções ou valor durante a interação. Scroll, resize e arraste atualizam sua
posição; cleanup remove os controles, estilos e listeners. Não há outro
MutationObserver, polling ou alteração no refresh nativo.

## Preservação do scroll

O cliente mantém o painel, mas reconstrói seu corpo quando recebe loot. O
evento de scroll dessa reconstrução pode ocorrer antes da reconciliação do
Better UI. O módulo ignora posições emitidas enquanto a grade anterior está
desconectada ou foi substituída, preservando a última posição válida.

A restauração ocorre após montar os controles e a visualização final. Quando
o primeiro slot visível tem identidade inequívoca (ID de Pokémon ou nome de
item único), preserva também seu deslocamento na área visível. Sem essa
referência, usa pixels, sujeitos ao limite de scroll do navegador. Não depende
de manter os antigos slots de ação vivos depois de um refresh.

Busca/categoria novas reiniciam a posição. Trocar visualização, critério ou
reaplicar a ordem descarta a âncora antiga e mantém a posição em pixels, quando
ela ainda cabe. Voltar manualmente ao topo também atualiza a posição salva.
O listener é removido no cleanup; nenhum timer, observer ou hook nativo novo
foi acrescentado.

Enquanto a janela e o escopo de busca/categoria permanecem, entradas conhecidas
mantêm a ordem relativa durante reconstruções nativas. Novas entradas ficam
depois das já ordenadas no subconjunto aplicável. Alterar busca/categoria,
reabrir a janela ou clicar Aplicar permite recalcular a ordenação.

Para continuidade de ordenação, IDs de Pokémon quando presentes e nomes dos
itens ficam somente em memória. Entradas homônimas sem ID não são tratadas como
identidades individuais; mantêm desempate nativo. Nenhuma ação é direcionada
por esse índice. Não há armazenamento de itens, Pokémon ou quantidades.

Somente o critério é salvo em `ppbui:inventory-order:v1`, por navegador/origem,
sem sincronização entre abas nessa preferência. Busca, categoria e seleção
continuam sob controle do jogo; não são persistidas pelo módulo. Se salvar
falhar, um aviso informa que o critério vale apenas na sessão.

Não foram acrescentados favoritos, filtros de equipe/bloqueio, busca sem
acentos, comparação, automação ou novos gestos. O contrato nativo já pesquisa
nome, descrição e espécie de origem com correspondência parcial e conversão
para minúsculas; sua semântica não foi substituída por uma busca só no DOM.

## Evidências e validação

- Captura histórica do projeto irmão `pokepixel-custom-ui`:
  `research/captures/2026-08-13/dom/inventory.html`.
- Cliente público consultado: `/play/js/plugins/InventoryScene.js`. Confirma
  handlers por slot e reconstrução síncrona dos controles ao buscar/filtrar.
- `PokemonCard.js` confirma IV total e `quality_multiplier`; `NonBlockingWindows.js`
  confirma o getter de cenas em cache, sem efeitos colaterais.
- CSS original: `panels/inventory-slots.css`, `panels/panel-base.css`,
  `panels/game-windows.css`, `panels/window-content.css` e `pokeidle-master.css`.
- Reutilização do contrato histórico de `src/bridge/inventory-actions.ts`
  do Custom UI somente para leitura dos slots; nenhuma bridge foi importada.

O candidato Backpack atual integra a suite completa de `251/251` testes. A cobertura
específica de Inventory inclui
ordenação por tipo, identidade/listeners, restauração, filtros com reconstrução
síncrona, preferências, localização de rótulos, novos itens e estabilidade do
observer, foco/seleção pendente durante refreshes, navegação por teclado e
critérios avançados com dados ausentes e cenas sobrepostas. Testes de ações
usam handlers simulados, sem consumo ou gameplay. As visualizações têm cobertura
de troca de modo, agrupamento inequívoco, dados de lista, ausência de loops,
reconstrução do corpo, novos itens, remoções e restauração exata.
As regressões de scroll reproduzem o evento de reset antes da reconciliação,
mudança de filtro, retorno manual ao topo e deslocamento do item de referência.
Preço/raridade têm cobertura de valores ausentes, zero, ambiguidades, ordem
por faixa, atualização explícita, uso estável do renderizador de moeda e
capitalização das opções.

Preview local com DOM capturado e CSS nativo: abertura da organização e ordem
por nível conferidas. A captura HTML não retém os handlers nem necessariamente
o selected atual dos controles; os testes de busca/limpeza usam o contrato
síncrono simulado. Não se afirma validação autenticada, de todos os viewports
ou de todos os itens/idiomas. O comportamento nativo de seleção e dos diálogos
foi validado pelo usuário para a versão inicial. O ajuste atual teve preview
com CSS nativo e refresh simulado a cada 500 ms, sem duplicação ou perda de
foco. O popup do seletor do sistema não aparece na captura do navegador;
a aprovação final do usuário encerra a pendência de validação no jogo desse
escopo, sem ampliar a cobertura dos testes locais a todos os ambientes.
Lista e Categorias foram conferidas com CSS nativo no preview local de 760 × 610,
dimensão inicial usada pelo cliente. A captura não contém o estado da cena;
por isso o preview mostra Pokémon/Outros, enquanto os testes simulam os dados
nativos para verificar os demais blocos. As novas vistas estão incluídas na
validação e aprovação final informada pelo usuário.

Conferência posterior das duas linhas: o espaço até os itens caiu de 159 para
116 px no preview de 760 × 610. No navegador, com refresh simulado a cada 500 ms,
a Lista manteve 800 px após 11 refreshes; em uma janela de teste de 760 × 400,
a Grade manteve 214 px após 23 e Categorias manteve 208 px após 56 refreshes.
Essas verificações usam DOM capturado e CSS nativo, não gameplay autenticado.
