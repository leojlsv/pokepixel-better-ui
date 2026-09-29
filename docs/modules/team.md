# Team — acompanhar e montar

Status: **Team voltou a ser a janela normal de gerenciamento. O experimento 0.2.63/0.2.64
que transformava Full Team em ficha/dossiê é histórico e foi supersedido em 2026-09-23.
O dossiê agora vive em `Pokémon Profile`, uma janela/menu independente. Team HUD,
gameplay, Add Pokémon, Shared Stone, Saved Teams e os contratos nativos já aprovados
continuam preservados.**

Direção visual: `design-system/pokepixel-better-ui/pages/team.md`.

## Full Team — papel atual (2026-09-24)

Full Team mantém o roster nativo de seis slots como superfície de gerenciamento da formação.
Ao selecionar um membro, Team continua mostrando as informações e ações próprias do jogo,
incluindo Vitals/Stats e comandos nativos de posição/ordem, ativo, detalhes e remoção.

Team **não** contém mais a ficha editorial do Pokémon, Current/Saved Movesets como capítulos
do dossiê nem a projeção read-only de Saved Teams por criatura. Esses conteúdos pertencem ao
menu independente `Pokémon Profile`, documentado em `docs/modules/pokemon-profile.md`.

O contrato de Team continua sendo preservar nós, ordem, handlers, estados disabled e lifecycle
nativos. O módulo dedicado de Profile consome os stores canônicos de Saved Teams/Movesets sem
duplicar persistência nem tomar ownership do DOM de Team.

### Linha de comandos do Pokémon selecionado

O workspace do membro selecionado possui duas linhas explícitas: a identidade do Pokémon na
primeira e, na segunda, o botão nativo **Configure moves**, o estado/ação nativo
**Active/Activate** e o grupo de ordem **#N ← →**. As três áreas recebem linha e coluna
determinísticas no grid; a apresentação não depende da ordem em que esses nós aparecem no DOM
nativo e permanece em uma única linha até o mínimo suportado de **340px**.

**Configure moves não é um editor Better UI.** Team mantém o botão e o handler já fornecidos pelo
jogo, cuja autoridade continua sendo `PokeIdle.MovesetConfig.open(creatureId)`. O clique usa o
`creatureId` exato do Pokémon atualmente selecionado; Better UI não cria modal, não duplica o
editor e não substitui os estados/handlers nativos de Active/Activate ou das setas de ordem.

## Projeto aditivo — Team Movesets (2026-09-23)

O Product Owner esclareceu o escopo: o jogo **já possui** o editor nativo dos quatro
moves. Better UI replica o conceito de Saved Teams em escopo de um único Pokémon:
**Saved Movesets por creature ID**. Ao selecionar Rhydon, por exemplo, o perfil mostra
somente os presets daquele Rhydon; o jogador pode salvar a configuração nativa atual,
alternar entre presets e identificar no slot, pelo marcador M#, qual preset corresponde
ao moveset autoritativo atual.

O contrato nativo foi confirmado em MovesetConfig: getMoveset(id),
saveMoveset(id,{mode,move_ids,revision}), evento moveset.saved e o próprio
MovesetConfig.open. Better UI preserva/reutiliza o botão do editor nativo e persiste
somente snapshots nomeados em ppbui:team-movesets:v1. Apply sempre lê uma revision
fresca, valida disponibilidade, grava via writer nativo e revalida o estado final antes de
marcar sucesso. Detalhes e gate estão em docs/TEAM_MOVESETS_STATUS.md.

## Escopo

- Mantém os seis slots, a ordem oficial, seleção, Pokémon ativo e todos os handlers nativos. O redesign mostra posição oficial `1..6`, selecionado, ativo, foco e derrotado como estados independentes sobre os mesmos slots.
- Full Team usa o roster como gerenciamento da formação, preservando posição/sprite e os estados Selected/Active/Fainted/Focus. Vitals e Stats voltam a pertencer à própria superfície Team. O slot mantém `overflow:visible` para não cortar badges/feedback nativos de XP Share posicionados fora da moldura.
- Neutraliza os pedestais/transformações decorativas nativas dos slots e normaliza portrait, nome, tags, meters e comandos para a geometria/tipografia PPBUI. O nome do Pokémon selecionado deixa de herdar a fonte serif nativa.
- Mantém o bloco nativo de ações associado ao membro selecionado, preservando os próprios botões, estados `disabled` e listeners. Configure moves, Activate/Active e `#N ← →` formam uma única linha de comandos explícita abaixo da identidade selecionada; posição oficial, Details e Remove continuam propriedade de Team. Vitals/Stats são novamente visíveis; Pokémon Profile não move nem substitui esses nós.
- O marcador `#N` acompanha a seleção e a ordem nativa e substitui o texto longo `Position N/6`; cleanup continua restaurando o texto nativo mais recente.
- A projeção read-only de Saved Teams por `creatureId` foi removida de Team e pertence ao Pokémon Profile dedicado. A manutenção de Saved Teams continua no fluxo canônico de Team Presets, sem criar uma segunda persistência.
- O manager completo de Saved Teams agora possui `Criar time`: lê apenas os Pokémon da Backpack via `getCreatures("inventory")`, permite selecionar 1–6 IDs únicos, ordenar e escolher o ativo, e salva um snapshot v2 com `orderVerified:true`. Montar/salvar não executa `addTeamMember`, `removeTeamMember`, `setTeamLeader` ou `setTeamOrder`; somente o Apply já existente altera o Team real. `Salvar atual` continua disponível e o Team HUD não recebe editor de composição.
- A geometria e o resize de Team voltam a seguir o contrato de gerenciamento, sem reservar espaço para o antigo dossiê 0.2.64. O experimento de largura/hierarquia editorial de 0.2.64 permanece apenas como evidência histórica em `docs/TEAM_PROFILE_STATUS.md`.
- O seletor original para adicionar Pokémon recebe busca por nome, filtro de elemento,
  raridade e Limpar em um discovery rail PPBUI anexado. Em largura normal os quatro
  controles ficam na mesma linha; só larguras realmente estreitas usam o fallback 2×2.
  Shell/body/intro/grid recebem chrome Miyazaki quadrado, enquanto os cards de candidato
  mantêm os mesmos nós, ordem, handlers e elegibilidade nativos. Limpar fica desabilitado
  sem filtro e o no-results é anunciado como status. Os filtros atuam somente sobre os
  cards e dados já carregados pelo jogo, sem reordenar a lista nativa.
- O root do Add Pokémon opta por `ppbui-scroll-scope`, que aplica a primitive global de
  scrollbar 10px quadrada também ao descendente que realmente possuir `overflow` no host,
  sem reset global e com cleanup reversível.
- Element icons do perfil selecionado e dos cards do picker preservam a cor canônica do
  Element, mas usam a primitive global `ppbui-element-icon` em poço quadrado; o Team HUD
  consome a mesma regra. A caixa de rarity/quality usa `ppbui-quality-badge`: fundo escuro,
  geometria quadrada e edge da cor canônica, sem alterar nome/multiplicador/IV.
- Atualizações e recriações da cena são reconciliadas pelo observer central. Desativar o módulo remove informações próprias e restaura a posição original das ações.

Não altera limites, regras, cálculos, composição, líder ou chamadas de rede. Não
implementa ordenação automática de gameplay, troca automática ou sugestões de time. O mínimo
da janela continua em **340px**; a linha principal Configure moves / Active-or-Activate /
`#N ← →` continua agrupada nessa largura, sem depender do auto-placement do grid.

## Evidência reutilizada

Foram consultados a auditoria e o contrato de Team do `pokepixel-custom-ui`, além do `TeamScene.js` público atual. Reutilizamos o modelo confirmado de dados e as regras nativas; React, CSS de redesign e bridges do Custom UI não foram copiados.

## Validação

Os testes sintéticos cobrem preservação dos slots e cliques, posição oficial,
Selected/Active/Fainted, atualizações de HP, ações originais, estado desabilitado,
o clique de Configure moves no `creatureId` selecionado, reuso/restore do botão nativo
em Team Movesets, filtros do seletor, reconciliação idempotente, recriação completa e cleanup. A
validação de 2026-09-01 permanece evidência histórica do contrato funcional. A
apresentação Battle Line passou por candidatos rejeitados, mas a correção
Miyazaki/estrutura posterior foi explicitamente validada pelo Product Owner em
2026-09-17. O corretivo de comandos de 2026-09-24 também possui render local em 480px e
340px com uma única linha de comandos e regressão conjunta Team + Team HUD + Team Movesets
`49/49 PASS`. A apresentação já aceita permanece fechada; validação in-game continua sendo
um gate separado do candidato.
