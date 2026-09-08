# Team — acompanhar e montar

Status: implementação validada e aprovada no jogo em 2026-09-01.

## Escopo

- Mantém os seis slots, a ordem oficial, seleção, Pokémon ativo e todos os handlers nativos.
- Acrescenta nível e percentual de HP aos slots ocupados; Pokémon com zero HP recebe o estado textual `Derrotado`.
- Move o bloco nativo de ações para junto do perfil, preservando os próprios botões, estados `disabled` e listeners. Slots vazios continuam abrindo o seletor original.
- Agrupa Position X, setas nativas, Tornar ativo, Detalhes e Remover junto ao perfil. O rótulo da posição acompanha a seleção e a ordem nativa, com tradução e restauração no cleanup.
- O seletor original para adicionar Pokémon recebe busca por nome, filtro de elemento, raridade e Limpar. Os filtros atuam somente sobre os cards e dados já carregados pelo jogo.
- Atualizações e recriações da cena são reconciliadas pelo observer central. Desativar o módulo remove informações próprias e restaura a posição original das ações.

Não altera limites, regras, cálculos, composição, líder ou chamadas de rede. Não implementa ordenação, troca automática, sugestões de time, responsividade ou mudanças na geometria da janela.

## Evidência reutilizada

Foram consultados a auditoria e o contrato de Team do `pokepixel-custom-ui`, além do `TeamScene.js` público atual. Reutilizamos o modelo confirmado de dados e as regras nativas; React, CSS de redesign e bridges do Custom UI não foram copiados.

## Validação

Os testes sintéticos cobrem preservação dos slots e cliques, atualizações de HP, ações originais, estado desabilitado, filtros do seletor, reconciliação idempotente, recriação completa e cleanup. O usuário validou e aprovou no jogo a disposição das informações, ações compactas e busca/filtros para adicionar Pokémon. O rótulo `Position X` e a remoção completa da comparação aguardam validação visual desta revisão.
