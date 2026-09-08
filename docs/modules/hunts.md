# Hunts (Map) — encontrar a hunt

Status: implementação validada e aprovada no jogo em 2026-09-01.
Menu-bar, Inventory e Chat continuam aprovados, sem novas pendências nesses módulos.

## Escopo

- Reutiliza busca, filtros de tipo/nível, contagem, limpar, mundos e marcadores nativos.
- Uma linha compacta apresenta os resultados do mundo atual em um select nativo,
  com os nomes e níveis já exibidos pelos marcadores, e o botão Localizar no mapa.
- Localizar ajusta somente a navegação do mapa, mantendo o zoom. Nas bordas, usa
  os limites nativos em vez de revelar áreas externas ao mapa.
- Nenhuma hunt é iniciada, preparada, trocada ou parada. O usuário continua usando
  o marcador original para iniciar a ação. Selecionar um resultado não clica nele.
- Busca mantém capitalização e seleção do texto quando os controles são recriados
  com o mesmo valor normalizado; limpar/trocar de mundo não ressuscita filtros.
- Feedback para resultado vazio, seleção necessária, localização e indisponibilidade.
- Em Johto, corrige para 1 o limite e o valor mínimo inicial do filtro que o cliente
  entregava como 100, sem impedir que o jogador escolha outro nível depois.
- Após Localizar, destaca somente o texto do Pokémon no marcador encontrado, usando
  texto dourado, borda dourada fina sobre o fundo preto nativo e elevando o marcador
  acima dos vizinhos. Um flash dourado único de 800 ms chama atenção para o sprite;
  os nomes dos demais Pokémon passam a 35% de opacidade. O destaque acompanha
  rerenders e é removido ao trocar de mundo, falhar uma localização ou desativar o módulo.
- Um botão nativo Reset fica desabilitado até existir uma localização. Ele remove o
  estado de foco, limpa a seleção para `All (X)` e desabilita Localizar novamente,
  sem mudar filtros, zoom ou posição corrente do mapa.
- O hover nativo mantém Elements e Drops e passa a separar Fraquezas, Resistências
  e Imunidades. Cada relação usa o badge nativo do elemento e mostra seu multiplicador
  defensivo exato, incluindo combinações de dois tipos como ×0,25 e imunidades ×0.
- Os rótulos de relações usam formas compactas adequadas ao card (`WEAK`, `RES`,
  `IMMU.` em inglês). Drops usam a grade nativa de duas colunas e exibem o valor de
  venda como ícone de moeda + número; dado ausente é indicado por `—`.
- Elements e relações compartilham uma coluna de rótulo de 52 px, fazendo todos os
  badges começarem no mesmo eixo. Cada Drop forma uma unidade contínua no padrão
  `ícone nome (ícone da moeda valor)`, reduzindo a separação visual e a altura do card.
- Os badges de `WEAK`, `RES` e `IMMU.` mostram somente ícone e multiplicador sobre
  o fundo colorido do tipo; nome e valor completo permanecem em `title` e `aria-label`.
- O card pode crescer até 440 px, limitado à altura disponível da viewport; conteúdo
  adicional continua usando o scroll nativo do tooltip e o posicionamento é recalculado
  para permanecer visível.
- Opção independente Hunts (Map) no painel Better UI; cleanup remove apenas a extensão.

Não inclui busca entre mundos, favoritos, loot adicional, redesenho,
responsividade nova ou alterações na geometria da janela. A lista móvel original,
sem viewport de mapa, não recebe esta extensão.

## Fontes verificadas

- Custom UI: `src/modules/hunt/hunt-model.ts`, `HuntExplorer.tsx`, `src/types/hunt.ts`,
  `src/modules/pokedex/type-chart.ts`, contrato e auditoria do Hunt de 2026-08-14.
  Reutilizadas as regras e evidências de tipos;
  não foram copiados React, bridge, snapshots de rede ou estilos do Custom UI.
- Código público atual `js/plugins/HuntSelectionScene.js` e estilos públicos
  `css/hud/hunt-world-map.css`, `css/panels/game-windows.css` e `panel-base.css`.
- O filtro nativo combina texto, tipos e interseção de faixa de nível; o resultado
  é expresso por `hidden` nos marcadores. Clicar em um marcador chama `startHunt`.

## Integração de navegação

`navigation.js` identifica exclusivamente a cena proprietária do corpo do painel,
em ReactiveWindows/SceneManager. Antes de agir, confere marcador atual, zona/mundo,
permissão de entrada, coordenadas, dimensões e métodos de navegação disponíveis.

O mapa usa transform e mantém estado corrente e alvo de animação separados;
`scrollIntoView` ou escrita isolada no transform desincronizariam zoom/pan.
Por isso Localizar encerra a navegação anterior com `_navigationCleanup`, ajusta
somente x/y de `_worldMapState`, salva pelo método nativo `saveWorldMapState` e
reinstala a navegação nativa com `setupWorldMapNavigation`. Isso não substitui
funções globais nem adiciona observers próprios. A persistência de posição continua
pertencendo ao jogo, assim como quando o usuário arrasta o mapa.

Essa integração depende de métodos internos do cliente. Contrato incompatível
exibe indisponibilidade, sem tentar clicar em outra zona ou iniciar gameplay.
Não há chamadas de rede nem acesso a estado de combate.

## Verificação

- Suíte completa: 76 testes passaram; build do userscript concluído.
- Testes sintéticos de filtros, vazio, localização sem clique, zoom preservado,
  bloqueios, referências removidas, storage, busca/foco, reset, lifecycle do core,
  correção inicial de Johto, relações defensivas de tipo duplo, valores dos Drops,
  enriquecimento idempotente e cleanup do tooltip.
- Preview sintético com estilos nativos confirmou a linha de resultados e o card.
- O usuário validou no jogo localização, Reset, foco visual, filtros, efetividades e
  apresentação compacta dos Drops; nenhuma validação permanece pendente neste escopo.
- Nenhuma hunt real foi iniciada nos testes.
