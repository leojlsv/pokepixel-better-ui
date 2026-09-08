# Inventory — encontrar e organizar

Status: módulo Inventory validado e aprovado pelo usuário no escopo atual,
incluindo as três visualizações, controles em duas linhas, preservação de
scroll, ordenações e preços de itens e Pokémon. Sem pendências de validação
desse escopo. Sem redesign ou organização manual.

## Uso

- A busca e as categorias continuam sendo os controles originais do jogo.
- O placeholder da busca é **Search**; ao desativar o módulo, o original é restaurado.
- Primeira linha: **Search · All · Clear Filters/Limpar**. A busca mantém
  105,6 px; All ocupa o espaço disponível até 240 px.
- Segunda linha: **Sort/Ordenar · Re-Sort/Aplicar · Grade · Lista · Categorias**,
  com os botões nativos. O texto adicional de Sort e o
  resumo Category/consulta/contagem foram removidos. O critério continua no seletor.
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

As dimensões da janela e dos slots, fontes, paleta e ícones não são alterados.
As visualizações extras alteram apenas a distribuição solicitada. CSS local reduz a busca conforme
solicitado e organiza os controles em duas linhas, sem breakpoint novo.
Em larguras pequenas, o seletor pode abreviar o texto conforme o comportamento
nativo; o critério completo aparece ao abrir o seletor. Na janela de 300 px,
a segunda linha excede a largura interna e usa a rolagem horizontal já nativa
do corpo. Não se reduz a fonte, oculta botões ou aumenta a janela para forçar
o encaixe. Na largura de 760 px todos os controles cabem.

## Visualizações

- **Grade:** layout original, incluindo as células vazias nativas.
- **Lista:** um slot original por linha, com nome e informações ao lado.
  Itens mostram categoria, quantidade e preço unitário de venda ao NPC;
  Pokémon mostram seu preço de venda, nível, IV total,
  multiplicador de Quality e marcadores de equipe/shiny/bloqueio disponíveis.
  Dados ausentes são omitidos, sem estimativa. O texto não dispara ações;
  cliques, atalhos, duplo clique e tooltips continuam no slot original.
- **Categorias:** um bloco por categoria, com título e uma grade nativa de slots.
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
de cena convencional. Nenhum método de carregamento, API ou ação é chamado.
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

- Captura: `G:/pokepixel-custom-ui/research/captures/2026-08-13/dom/inventory.html`.
- Cliente público consultado: `/play/js/plugins/InventoryScene.js`. Confirma
  handlers por slot e reconstrução síncrona dos controles ao buscar/filtrar.
- `PokemonCard.js` confirma IV total e `quality_multiplier`; `NonBlockingWindows.js`
  confirma o getter de cenas em cache, sem efeitos colaterais.
- CSS original: `panels/inventory-slots.css`, `panels/panel-base.css`,
  `panels/game-windows.css`, `panels/window-content.css` e `pokeidle-master.css`.
- Reutilização do contrato histórico de `src/bridge/inventory-actions.ts`
  do Custom UI somente para leitura dos slots; nenhuma bridge foi importada.

50 testes passaram: os 27 anteriores e 23 específicos de Inventory, cobrindo
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
