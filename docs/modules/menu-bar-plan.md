# Plano de organização da menu bar

Status: execução autorizada pelo usuário e implementada em 2026-08-31.
Testes locais concluídos e implementação completa validada explicitamente pelo
usuário. Etapa encerrada; outros QoLs ficam para depois. Consulte menu-bar.md
para evidências e limites dos testes locais.

O agrupamento Pack + Premium Shop foi validado explicitamente pelo usuário.
Ele foi o ponto de partida funcional. A autorização posterior para executar
este plano inclui os demais grupos e Loja com Roleta.

## Escopo e evidências

O plano trata das entradas da menu bar e sua distribuição. Não reorganiza o
conteúdo dos painéis, o HUD, o chat, as ações de combate ou as telas de login.

- A captura de 2026-08-13 reutilizada do Custom UI contém 27 destinos.
- O código público de PersistentHUD consultado em 2026-08-31 define 33:
  acrescenta npc-shop, market, storage, professions, event-calendar e gacha.
- Definição no código não significa visibilidade para todos os jogadores.
  Configuração do servidor, contexto e permissões continuam autoritativos.
- A composição nativa de Atividades/Eventos e a posição de Configurações
  variam com main_menu.missions_grouping_enabled e settings_standalone.
- Não há telemetria de frequência de uso. A prioridade abaixo é uma hipótese
  de jornada, não um resultado de pesquisa com jogadores.

Fontes locais reutilizadas:

- `pokepixel-custom-ui/research/captures/2026-08-13/dom/main-screen.html`
- `pokepixel-custom-ui/src/bridge/navigation.ts`
- `pokepixel-custom-ui/docs/project/original-ui-module-inventory.md`

Fontes públicas consultadas:

- https://pokepixel.nietore.com/play/js/plugins/PersistentHUD.js
- https://pokepixel.nietore.com/play/css/persistent/top-toolbar.css

## Critérios de decisão

1. Manter Inventário e Hunts diretos: preparar recursos e escolher a caçada
   não devem exigir abrir outro grupo.
2. Manter Correio direto: a visibilidade de notificações tem valor mesmo
   quando o jogador não está procurando mensagens.
3. Separar desenvolvimento permanente, objetivos recorrentes, participação
   em eventos e ferramentas de acompanhamento.
4. Preservar rótulos dos destinos, ícones, atalhos, estados e comportamento.
   Os novos nomes são dos grupos; os destinos mantêm os rótulos nativos.
5. Ter apenas barra > dropdown > destino, sem dropdown dentro de dropdown.
6. Manter posição estável: sem reordenar por frequência, badge, horário ou
   contexto. Apenas respeitar a visibilidade condicional nativa.
7. Não diminuir a barra a qualquer custo: esconder funções centrais pode
   economizar espaço e piorar a navegação.

A recomendação aplica reconhecimento em vez de memorização e rótulos ligados
às tarefas. A classificação específica do jogo é uma inferência deste plano,
não uma recomendação específica da fonte externa. Referência:
[Recognition and Recall, NN/g](https://www.nngroup.com/articles/recognition-and-recall/).

## Jornada e ordem proposta

Preparar equipe e recursos → escolher atividade → acompanhar resultados →
desenvolver o treinador → participar da comunidade → usar serviços opcionais.
Não existe obrigação de percorrer a barra nessa sequência. A ordem privilegia
também a memória muscular: Inventário e Hunts continuam à esquerda.

Ordem da barra:

Inventário | Hunts | Treinador | Cidade | Objetivos | Eventos | Social |
Correio | Ferramentas | Loja | Configurações

As barras verticais são apenas notação do plano: não propõem divisórias visuais.
São 11 posições quando todos esses grupos existem. Na captura antiga, sem
Cidade, são 10. Não se criará um grupo vazio para atingir uma quantidade fixa.

| Entrada | Destinos, na ordem proposta | Intenção |
|---|---|---|
| Inventário | Direto | Preparar e gerenciar recursos |
| Hunts | Direto | Escolher a caçada sem etapa extra |
| Treinador | Equipe, Perfil, Pokédex, Maestria, Promotion | Gerenciar o personagem e sua progressão permanente |
| Cidade | Loja NPC, Mercado, Armazenamento, Profissões | Preservar o agrupamento nativo de serviços |
| Objetivos | Missões, Passe de batalha, Login diário | Consultar tarefas e recompensas recorrentes |
| Eventos | Calendário, PvP ranqueado, World Boss | Descobrir agendas e participar de encontros/competição |
| Social | Amigos, Guilda, Ranking, Capturas Shiny, Parceiro | Relacionamentos, comparação e atividade da comunidade |
| Correio | Direto | Preservar acesso e badge visíveis |
| Ferramentas | Hunt Analyzer, Registros de captura, Auto Helper, Farm offline, Mini View, Administração | Consultar resultados e controles auxiliares; Administração só para quem já tem acesso |
| Loja | Premium Shop, Pack, Roleta | Reunir aquisição opcional sem misturar com objetivos gratuitos |
| Configurações | Direto | Encontrar preferências em posição previsível |

Os nomes são apresentados em português para revisão. A implementação
respeita o idioma ativo e os rótulos nativos dos destinos.

## Mapeamento completo dos 33 destinos

"Atual" descreve o código consultado, antes das propostas, e não certifica
o estado de uma sessão autenticada. Pack já foi agrupado pelo Better UI.

| ID nativo | Atual | Proposta |
|---|---|---|
| inventory | Direto | Direto: Inventário |
| hunts | Direto | Direto: Hunts |
| team | Player | Treinador |
| profile | Player | Treinador |
| encyclopedia | Player | Treinador |
| species-goals | Eventos | Treinador |
| promotion | Atividades ou Eventos | Treinador |
| npc-shop | Cidade | Cidade |
| market | Cidade | Cidade |
| storage | Cidade | Cidade |
| professions | Cidade | Cidade |
| quests | Atividades | Objetivos |
| battle-pass | Atividades ou Eventos | Objetivos |
| daily-gift | Atividades ou Eventos | Objetivos |
| event-calendar | Eventos | Eventos |
| arena-pvp | Atividades ou Eventos | Eventos |
| world-boss | Atividades ou Eventos, condicional | Eventos, mesma condição |
| friends | Social | Social |
| guild | Social | Social |
| ranking | Social | Social |
| shiny-captures | Automação | Social |
| streamer-referral | Eventos, condicional | Social, mesma condição |
| private-message | Direto | Direto: Correio |
| hunt-analyzer | Automação | Ferramentas |
| capture-records | Player | Ferramentas |
| auto-helper | Automação | Ferramentas |
| offline-farm | Automação | Ferramentas |
| mini-view | Automação | Ferramentas |
| game-admin | Automação, permissão restrita | Ferramentas, mesma permissão |
| premium | Grupo Premium Shop no Better UI | Loja |
| beta-goals | Grupo Premium Shop no Better UI; habilitação do jogo | Loja, mesma condição |
| gacha | Eventos | Loja, decisão de maior incerteza |
| settings | Direto ou Automação | Direto: Configurações |

## Revisão crítica e refinamentos

### Mudanças de maior confiança

- Promotion abre Scene_Merit: pertence ao progresso do treinador, não deve
  ser tratada como oferta comercial por causa do nome.
- Maestria é progressão permanente; não depende semanticamente de Eventos.
- Hunt Analyzer e Registros de captura são consultas complementares. Agrupar
  os dois evita procurar resultados entre Player e Automação.
- Capturas Shiny aponta para Scene_ShinyCaptureFeed. A proposta é Social por
  ser um feed, não uma configuração de automação.
- Correio permanece direto. Agrupá-lo em Social economizaria uma posição,
  mas esconderia seu badge ou exigiria criar uma agregação de badges, fora
  do escopo desta redistribuição.
- Inventário e Hunts continuam diretos. Transformar Hunts em gatilho de
  dropdown exigiria uma nova entrada para o destino original e pioraria
  esse acesso frequente presumido.

### Escolhas com trade-offs

- Treinador reúne cinco destinos e evita criar outra posição só para Coleção.
  Pokédex/Maestria continuam próximas; Perfil/Promotion tratam desenvolvimento.
- Ranking permanece em Social: é consulta comparativa. PvP fica em Eventos:
  é entrada de participação. Não há necessidade de mover ambos só porque
  se relacionam com competição.
- Ferramentas substitui Automação porque também contém análise e visualização.
  É o grupo menos específico da proposta: não deve virar destino padrão para
  qualquer função nova. Sua lista é fechada às ferramentas relacionadas à
  sessão e à administração condicional já existente.
- Administração fica por último nesse grupo, visível somente aos autorizados.
  Criar um grupo exclusivo para um único destino prejudicaria o objetivo
  de contenção da barra e só beneficiaria uma parcela dos jogadores.
- Parceiro em Social é uma hipótese de descoberta: relação com criadores,
  não evento de combate. Preservar rótulo, regras e funcionamento integralmente.
- Roleta em Loja é a decisão de menor confiança. O cliente a descreve como
  aquisição de prêmios por Dólares, com garantias/histórico; não é possível
  concluir que exija dinheiro real. O agrupamento não deve sugerir isso.
  Se jogadores a procurarem primeiro em Eventos, mantê-la ali e preservar
  o grupo Premium Shop + Pack exatamente como validado é a alternativa.
- Renomear Premium Shop para Loja amplia a promessa do grupo ao adicionar
  Roleta. Os destinos Premium Shop e Pack mantêm seus nomes. A loja NPC e o
  Mercado continuam em Cidade, distinguindo os serviços do mundo do jogo.
- Configurações direta é a recomendação de encontrabilidade. Se a configuração
  nativa já a colocar em Automação, expô-la adicionará uma posição; isso deve
  ser considerado na revisão da sessão real, sem reduzir escala ou dimensões.

### Alternativas descartadas nesta proposta

- Um menu "Mais" com todo o restante: economiza espaço, esconde a estrutura.
- Um novo menu para cada assunto: aumenta a barra sem melhorar proporcionalmente
  a busca; Coleção e Administração não ganham gatilhos exclusivos.
- Unir recompensas gratuitas e compras em "Recompensas": torna ambíguo o que
  é conquista, resgate ou gasto.
- Duplicar atalhos em vários grupos: aumenta manutenção e pode duplicar estado
  ou badges. Cada destino tem um único endereço na menu bar.
- Tirar atalhos do HUD, chat ou NPCs para centralizar tudo: fora do escopo;
  caminhos contextuais nativos continuam funcionando.
- Ordem adaptativa, favoritos, busca, novos badges ou automações: não fazem
  parte de uma simples redistribuição de menus.

## Plano de execução aprovado

1. Árvore e nomes autorizados, incluindo Loja/Roleta e Ferramentas.
2. Conferir na sessão alvo os destinos realmente presentes e as duas opções
   nativas de composição. Reutilizar a captura; atualizar apenas diferenças.
   Um botão ausente nunca será recriado para forçar cobertura dos 33 IDs.
3. Implementar os deslocamentos de maior confiança em um lote reversível:
   Promotion/Maestria, Registros/Hunt Analyzer e feed Shiny; preservar o grupo
   Pack + Premium Shop já aceito até a decisão sobre Roleta.
4. Aplicar nomes e ordem final aprovados. Não criar divisórias, estilos,
   dimensões, fontes, ícones ou responsividade nova. Se um rótulo não couber
   com os estilos nativos, revisar o rótulo antes de cogitar alteração visual.
5. Validar destinos, badges, atalhos, teclado, toque, alternância entre grupos,
   estados condicionais e rerenders. Gerar build e apresentar diff. Sem merge
   automático na main; aprovação anterior não cobre esta nova distribuição.

## Validação do plano antes de código

Um teste curto de localização pode usar somente esta árvore, sem protótipo ou
instalação. Peça ao jogador para localizar o destino sem dizer o nome do grupo.
Registre a primeira escolha, retornos e dúvidas; não transforme uma sessão
qualitativa pequena em estatística de ganho. Método:
[Tree Testing, NN/g](https://www.nngroup.com/articles/tree-testing/).

| Situação apresentada ao jogador | Caminho esperado |
|---|---|
| Quero trocar os Pokémon que levo comigo | Treinador > Equipe |
| Quero escolher onde caçar | Hunts direto |
| Quero ver como rendeu minha caçada | Ferramentas > Hunt Analyzer |
| Quero consultar o histórico das minhas capturas | Ferramentas > Registros de captura |
| Quero acompanhar o desenvolvimento por espécie | Treinador > Maestria |
| Quero verificar o benefício por entrar hoje | Objetivos > Login diário |
| Quero descobrir a agenda dos próximos encontros | Eventos > Calendário |
| Quero ver capturas raras publicadas no feed | Social > Capturas Shiny |
| Quero acessar meus pacotes | Loja > Pack |
| Quero participar da roleta | Loja > Roleta; observar especialmente procura em Eventos |
| Recebi uma mensagem | Correio direto |

Critérios funcionais da implementação:

- Cada destino disponível aparece exatamente uma vez na menu bar.
- Nenhuma permissão, condição de visibilidade ou habilitação é relaxada.
- Nenhum botão abre um destino ao apenas expandir seu grupo.
- Nenhuma compra, resgate, combate ou automação é disparada como teste automático.
- Badges existentes não somem com a movimentação. Missões, Passe e Login diário
  permanecem juntos para não desassociar o badge nativo de recompensas.
- Atalhos mantêm seus destinos, sem redefinir teclas.
- Rerenders não deixam nós órfãos, listeners duplicados ou botões perdidos.
- Desmontar restaura a árvore nativa e preserva as atualizações do jogo.
- Grupos que ficarem vazios não ocupam um botão morto; mudanças de visibilidade
  posteriores devem ser reconciliadas, sem polling ou observer por feature.
- Não aparece sobreposição ou recorte novo nas condições de viewport e escala
  já suportadas pelo jogo; não se introduzem breakpoints para compensar falhas.

## Limites da recomendação

A distribuição proposta é uma hipótese argumentada de arquitetura de
informação. Não promete redução medida de tempo ou cliques. Na maior parte
das mudanças, a profundidade permanece igual; o benefício esperado é saber
em qual grupo procurar. A aceitação do jogador deve decidir os pontos ambíguos.
