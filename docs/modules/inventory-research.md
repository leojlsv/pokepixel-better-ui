# Inventory — pesquisa de UX para refinamento

Status: levantamento inicial preservado. Posteriormente o usuário priorizou
encontrar/organizar e autorizou busca/categorias nativas com ordenação explícita.
Implementação e limites estão em `inventory.md`; as demais ideias não foram aprovadas.
Data: 2026-08-31. A prioridade abaixo é uma hipótese para discussão, não uma
medição de frequência de uso ou uma auditoria da sessão atual do jogador.

## Baseline conhecido

A captura original de 2026-08-13 contém busca `Search backpack...`, seletor
com Pokémon, All, Poké Balls, Healing, Revives, Boosters, Eggs, Stones,
Materials e Collectibles. Há slots de itens e Pokémon, quantidades e
indicadores de nível, equipe e bloqueio. Portanto, não partir da premissa de
que é necessário criar busca, categorias ou bloqueio do zero.

Os contratos e evidências do Custom UI registram duplo clique para equipe,
Ctrl+clique para bloqueio e Shift+clique para vínculo no chat. O uso direcionado
de itens preserva quantidade, alvo e confirmação; cancelamento não consome.
Não há evidência de menu contextual separado por botão direito naquela captura.

São evidências históricas reutilizáveis, não comprovação do cliente atual.
A aprovação do Inventory no Custom UI não aprova uma implementação no Better UI.
Não reutilizar sua interface substituta, interceptação de rede ou bridge como
arquitetura padrão: aqui os controles e handlers originais são o baseline.

Fontes históricas consultadas no projeto irmão `pokepixel-custom-ui`:

- `research/captures/2026-08-13/dom/inventory.html`
- `docs/project/module-contracts/inventory-phase-1.md`
- `docs/project/evidence/inventory-actions-2026-08-14.md`
- `docs/project/evidence/inventory-item-use-audit-2026-08-14.md`

## Referências e o que podemos aprender

1. [FFXIV Companion — gerenciamento de itens](https://companion-app.finalfantasyxiv.com/help/na/guide/item.html):
   filtros por categoria e nome, consulta entre inventários e recuperação de
   itens vendidos/descartados dentro das regras daquele serviço. Mostra padrões
   concretos; não prova que PokePixel tenha as mesmas capacidades.
2. [Guild Wars 2 — localização de itens perdidos](https://help.guildwars2.com/hc/en-us/articles/360001969608-Recovering-Missing-or-Lost-Items):
   orienta buscar no inventário, bancos e outros personagens. Explicitar o local
   pesquisado ajuda a distinguir item ausente de item guardado em outro lugar.
3. [NN/g — filtros e intenção do usuário](https://www.nngroup.com/articles/applying-filters/):
   aplicar filtros sem fragmentar a tarefa, evitando atualizações que causem
   perda de posição. Aplicação ao jogo: preservar foco e contexto e deixar claro
   quando uma combinação de filtros eliminou os resultados.
4. [NN/g — prevenção de deslizes](https://www.nngroup.com/articles/slips/):
   restrições e padrões seguros reduzem ações involuntárias. Aplicação ao jogo:
   proteger o fluxo de consumo e não executar uma ação ao apenas inspecionar.
5. [NN/g — divulgação progressiva](https://www.nngroup.com/articles/progressive-disclosure/):
   priorizar tarefas comuns e revelar opções avançadas quando necessárias.
   Aplicação: não colocar todos os atributos e comandos em cada slot.
6. [Xbox Accessibility Guideline 103](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103):
   informações importantes não devem depender só da cor. Aplicação: aproveitar
   texto, ícones e descrições nativas para bloqueio, equipe e raridade.

## Catálogo de oportunidades

Estas são propostas inferidas das referências e do baseline, não recursos
confirmados como ausentes. A implementação depende da escolha do usuário e
de conferir o comportamento atual.

| Oportunidade | Problema que pode resolver | Cuidado para o Better UI |
|---|---|---|
| Busca previsível | Saber o nome, mas não achar a entrada | Reusar busca; avaliar termos parciais/acentos e indicar categoria ativa antes de alterar a semântica |
| Filtros combináveis e reset claro | Procurar entre muitos itens semelhantes | Usar categorias existentes; estados como bloqueado/equipe só com informação confiável; não criar dez controles permanentes |
| Escopo e contagem de resultados | Interpretar resultado vazio como perda de item | Distinguir mochila vazia, filtro sem resultado e carregamento; contagem de slots não equivale a quantidade total de itens |
| Ordenação estável e explícita | Itens trocarem de lugar durante uma ação | Não ordenar continuamente pelo loot recebido; preservar ordem original e permitir retorno; nível só para Pokémon, quantidade só quando fizer sentido |
| Retomar contexto | Reabrir busca e rolar até o mesmo item repetidamente | Preservar seleção/scroll quando a entrada continuar válida; reset acessível; não manter seleção por índice de slot |
| Favoritos ou acessos rápidos | Procurar sempre os mesmos consumíveis | Favorito é preferência de navegação, não proteção contra consumo/venda; não substituir nem imitar o bloqueio nativo |
| Visão consolidada versus mochilas separadas | Caçar um item em vários compartimentos | Só aplicável se existirem compartimentos reais; manter indicação de origem; agrupar visualmente não transfere itens nem aumenta capacidade |
| Estados importantes mais legíveis | Confundir Pokémon equipado, bloqueado ou shiny | Reutilizar indicadores, não criar nova paleta; nunca afirmar proteção maior que a regra do jogo |
| Ajuda contextual para gestos | Não descobrir duplo clique, Ctrl+clique ou Shift+clique | Expor instruções dos gestos existentes; não redefinir clique, duplo clique ou botão direito sem escolha explícita |
| Detalhes e comparação sob demanda | Abrir vários tooltips e depender da memória | Priorizar dados nativos úteis à decisão; não criar ranking de melhor Pokémon ou cálculo não confirmado |
| Feedback de operação | Repetir clique porque não ficou claro se funcionou | Separar pendente, confirmado e falhou; não anunciar sucesso antes do estado nativo nem bloquear com timeout arbitrário |
| Identificação de novidades | Não saber o que entrou após a caçada | Precisa de sinal confiável; não inventar data de aquisição a partir da ordem DOM ou detectar novidade na primeira carga |

## Organização de backpacks: trade-offs

- Visão única favorece encontrar; compartimentos favorecem organização manual.
  Não existe um vencedor universal: verificar primeiro como o jogador usa a
  mochila e se essa divisão realmente existe no PokePixel.
- Agrupamento por finalidade (cura, captura, materiais) pode facilitar preparo;
  agrupamento por raridade pode ajudar triagem. O filtro original já cobre
  várias finalidades e deve ser o primeiro ponto de reaproveitamento.
- Ordenação automática pode prejudicar memória espacial. Separar uma escolha
  explícita de ordenação da atualização normal de quantidades.
- Busca global é útil, mas não deve indicar posse em depósito/personagem sem
  dados disponíveis e escopo autorizado. Não ampliar acesso à rede para isso.
- Capacidade livre só merece indicador se existir limite real e semântica
  conhecida: slots, pilhas, peso e quantidade são conceitos diferentes.

## Candidatos iniciais para conversar

Maior aderência ao projeto: clareza da busca/filtros, recuperação de contexto,
estados/gestos nativos e feedback. Podem trazer melhoria sem redesenhar a grade.

Dependem mais de preferência pessoal: favoritos, ordenação alternativa,
comparação e visões por compartimento. Devem ser discutidos com exemplos da
rotina do jogador antes de escolher controles ou posição na janela.

Não propor nesta etapa: auto-uso, autoequipar, venda/descarte automático,
transferências em lote implementadas por sequência de cliques, novas regras de
stack/capacidade ou botão de desfazer consumo sem suporte real do jogo. Padrões
de outros títulos não autorizam automação nem mudança das regras do PokePixel.

## Perguntas para o próximo refinamento

1. O que mais atrapalha: localizar, comparar, organizar ou executar a ação certa?
2. O uso principal envolve Pokémon, consumíveis ou ambos?
3. A posição manual dos itens tem valor ou a preferência é por ordenação?
4. Quais tarefas se repetem antes e depois de uma caçada?

Exemplos para avaliar uma proposta futura: achar uma cura pelo nome; localizar
um Pokémon fora da equipe; distinguir bloqueado de favorito; cancelar uso e
voltar ao mesmo contexto; limpar filtros e reencontrar um item. Medir sucesso,
erros, retornos e cliques, sem prometer ganhos ainda não observados.
