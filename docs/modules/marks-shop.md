# Mark’s Shop — compras em lista e venda por espécie

Status: implementado; validação no jogo pendente.

## Compras

- Lista é o modo inicial. Lista/Cards reutiliza a faixa e os botões de categorias nativos.
- Cada linha mantém ícone, nome, descrição, categoria e todos os controles originais: 1/10/100, Max, quantidade personalizada, total e Comprar.
- A mudança de modo altera somente a distribuição dos cards. Não recria inputs, handlers, cálculos, limites de estoque ou confirmações.
- Nenhuma preferência nova de compra é salva. O modo escolhido dura enquanto o módulo está montado, inclusive em reconstruções do corpo.
- A linha tem largura mínima local de 490 px. Janelas estreitas usam rolagem horizontal na lista; Cards permanece disponível. Não altera a largura da janela nem introduz breakpoints.

## Venda de Pokémon

- Grupos é o modo inicial, com alternativa Lista para a apresentação original.
- Agrupa as linhas visíveis pela chave `species_id`, sem usar apelido ou tradução como identidade. Preserva a ordem de primeira aparição das espécies e a ordem nativa dos indivíduos.
- O cabeçalho mostra espécie, selecionados/quantidade e valor total do grupo. Esse valor inclui todos os indivíduos do grupo visível, não somente os selecionados; dado ausente aparece como `—`.
- O checkbox seleciona/desmarca somente os indivíduos visíveis daquele grupo, encaminhando o gesto aos checkboxes originais. O estado intermediário indica seleção parcial.
- O botão de expansão mostra as próprias linhas nativas para revisão individual. Recolher não desmarca; expandir não seleciona.
- Um resumo acima do rodapé informa a seleção total e quantos Pokémon estão fora dos filtros nativos. Pesquisa e raridades mantêm a semântica original, inclusive seleções ocultas.
- O módulo não seleciona novos indivíduos por pertencerem a uma espécie já selecionada. Seleções previamente mantidas pelo jogo continuam sendo respeitadas.
- O botão Vender, a confirmação, o processamento nativo em lotes de até 500 e o tratamento de erros permanecem com o cliente. Não existe um segundo executor de vendas.

## Integração e limites

A loja é o painel de `PokeIdle.NPC`, e não uma Scene. A montagem exige propriedade do corpo pelo controlador, shell da loja e as quatro abas. Outras janelas que compartilham `.npc-shop-window` não devem receber a extensão.

O renderer atual não publica IDs nas linhas de venda. O módulo relaciona a ordem original às criaturas filtradas já carregadas e verifica quantidade, IDs únicos, nome nativo, checkbox/seleção e localização inventário/storage. Não acrescenta indivíduos que o cliente excluiu, como bloqueados, shiny, Ditto e mega ativa; starter gift e localizações incompatíveis impedem o agrupamento. Se o contrato não corresponder, preserva a lista original e informa indisponibilidade.

Antes de selecionar um grupo, confere novamente o controlador, filtro, referências e checkboxes. Controles removidos, desabilitados, criaturas que se tornaram inelegíveis e venda já em andamento não recebem seleção do grupo. Essa verificação usa dados locais; não promete a revalidação fresca de servidor do script de referência. A confirmação e a validação transacional nativas continuam necessárias.

O observer central reconcilia reconstruções; não há observer próprio, polling, escrita em APIs, patch de funções globais ou nova persistência de IDs. Preferências nativas podem ser salvas pelo jogo ao receber o gesto nos seus checkboxes. Desativar o módulo restaura a ordem e remove apenas wrappers, estilos e controles Better UI, sem ressuscitar linhas removidas pelo cliente.

## Referências

- Script anexado pelo usuário: **PokePixel - Safe Pokémon Seller v1.1.0**. Reaproveitadas as ideias de revisão por espécie, seleção parcial, IDs únicos e exclusão de novas capturas da seleção existente. Não foram portados painel externo, varredura de globais, chamadas diretas de API, timers de confirmação ou executor de lotes.
- [NpcInteraction.js público](https://pokepixel.nietore.com/play/js/plugins/NpcInteraction.js), consultado em 2026-09-07: `openShop`, `renderShop`, compra/venda, filtros, seleção persistente, IDs e lote nativo.
- [CSS nativo da loja](https://pokepixel.nietore.com/play/css/hud/npc-interaction.css): cards, linhas, categorias, botões e rodapé.

## Verificação

12 testes específicos: ações e quantidade de compra, modos, seleção parcial, preservação dos nós, cleanup exato, reconciliação estável, filtros/seleções ocultas, novas capturas, referências inválidas, proteção durante venda, espécies homônimas e integração com o lifecycle.

Preview sintético com CSS nativo, janela de 880 × 580 e largura de 390 px em viewport de 1280 × 720. Conferidos modos, expansão, seleção por grupo, resumo ao filtrar e acesso às compras por rolagem horizontal. Ícones e dados são sintéticos; a fixture não reproduz todas as partes da loja ou uma sessão autenticada. Não foram feitas compras ou vendas no jogo. A validação visual e funcional final no cliente real permanece pendente.
