# Team HUD — leitura rápida da equipe

Status: implementação aguardando validação no jogo.

## Escopo

- Preserva treinador, mapa, stamina, Pokémon ativo, posição e recolhimento nativos.
- Acrescenta uma barra mínima de HP aos cards compactos usando o `--hp-percent` mantido pelo próprio HUD.
- Exibe na barra de EXP do Pokémon ativo e dos cards completos o progresso absoluto do nível atual junto da porcentagem, no formato `atual / necessário · percentual`, com vírgula como separador de milhar.
- Padroniza o treinador com rótulos externos `EXP` e `STA`; EXP mostra progresso absoluto/percentual e stamina mantém seu valor nativo sem repetir o nome dentro da barra.
- HP, EXP e STA expõem o valor completo no hover nativo do navegador.
- Exibe `Derrotado` quando o card recebe o estado nativo `is-fainted`.
- Torna cards ocupados acessíveis por teclado; Enter/Espaço encaminham um clique explícito ao card original. Pokémon derrotados e elementos interativos internos não são acionados.
- Slots vazios, hover, troca de líder, Ditto e seletor de equipe continuam pertencendo ao cliente original.
- Recriações são reconciliadas pelo observer central; desativar o módulo restaura atributos e remove somente os elementos Better UI.

Não altera dados, HP, líder, combate, dimensões, responsividade ou chamadas de rede.

## Evidência

O Custom UI contém somente inventário da superfície `.pokeidle-team-hud`. O contrato foi auditado no `PersistentHUD.js` público atual: cards mantêm `--hp-percent`, `is-fainted`, listeners de líder e `PokemonCard.bindSlot`; slots vazios abrem o seletor oficial.

## Validação

Testes sintéticos cobrem preservação de cliques, bloqueio de derrotados, teclado, reconciliação estável, substituição de cards e cleanup. A validação visual e funcional no jogo permanece pendente.
