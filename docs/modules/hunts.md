# Hunts (Map) — seleção, dossiê e entrada explícita

Status: revisão implementada em `feature/hunts-dossier`; validação automatizada concluída, validação final no jogo pendente.

## Direção

O mapa desktop passa a separar seleção de gameplay. Marcadores nativos continuam sendo reutilizados, mas left-click/Enter/Space selecionam a hunt e abrem um dossiê lateral; não iniciam mais a caça diretamente. O início da Hunt fica restrito ao botão explícito `Hunt`/`Entrar na Hunt` do dossiê.

Hover e foco não abrem mais o tooltip flutuante. A informação antes exibida nele passa para o dossiê: nome, nível, Elements, Weaknesses, Resistances, Immunities e Drops com valor de venda. Relações defensivas continuam usando o type chart já validado e os badges/ícones nativos.

O dossiê abre à direita do mapa, dentro da janela existente, sem alterar as dimensões da janela. O viewport nativo é movido intacto uma vez para um workspace reversível; listeners de pan/zoom e marcadores não são clonados. O workspace só cria a segunda coluna enquanto o dossiê está aberto e o mapa volta a ocupar toda a largura disponível ao fechá-lo.

## Composição da janela

A janela desktop passa a ter três níveis visuais claros sem criar um tema novo. O header continua reservado à navegação global (mundos + zoom); um control deck compacto concentra descoberta/seleção; mapa + dossiê formam o workspace principal.

- A toolbar nativa mantém Search, faixa de nível e Clear no primeiro nível do control deck.
- A linha Better UI concentra o alvo filtrado, `Localizar no mapa`, `Reset`, feedback e a contagem nativa de áreas. O node `.hunt-world-count` é movido intacto, não recriado.
- Os filtros nativos de elemento ficam imediatamente abaixo, com o mesmo node/handlers e menos espaçamento vertical.
- Notices nativos continuam aparecendo quando possuem conteúdo; notice vazio não reserva altura.
- Tabs, zoom, toolbar, contador e filtros de elemento são sempre os nodes do cliente. O wrapper Better UI é apenas estrutural e o cleanup restaura a ordem original, inclusive whitespace/anchors do DOM.

## Interação

- Click no marcador: seleciona, destaca e abre/atualiza o dossiê. Não chama `startHunt()`.
- Hover/focus: não abre tooltip de informações.
- `Localizar no mapa`: abre o mesmo dossiê, mantém zoom e usa o pan nativo já validado. O foco localizado continua destacando o alvo e reduzindo os demais rótulos.
- `Reset`: limpa localização, seleção e dossiê sem alterar filtros, zoom ou posição corrente.
- `Esc` ou `×`: fecha o dossiê; quando possível, o foco retorna ao marcador selecionado.
- Se filtros ocultarem a seleção ou o mundo mudar, o dossiê fecha para não manter uma zona inválida.

## Entrada na Hunt

O Better UI não substitui `startHunt()`. O botão explícito do dossiê valida a seleção atual, atribui o mesmo `_selectedIndex` usado pelo cliente e chama o método nativo. Não há clique sintético, chamada de rede própria ou automação de gameplay.

Os listeners nativos de click/hover permanecem instalados no marcador. Enquanto o módulo está ativo, uma captura delegada no root da janela intercepta os eventos de ativação e informação dos marcadores antes dos listeners nativos, inclusive durante substituições de marker entre ciclos de reconciliação. O cleanup remove essa captura e restaura automaticamente o fluxo original.

## Clássico / Plataforma

O node nativo `.hunt-presentation-toggle` é movido intacto do header para o rodapé do dossiê, imediatamente antes da ação de entrar. Seus listeners, `aria-pressed`, persistência e `refresh()` continuam pertencendo ao cliente.

Quando o refresh nativo recria a janela, o módulo descarta referências antigas, adota o novo toggle e o novo viewport e reacquire a seleção pela identidade estável da zona. Se a ordem de `_zones` mudar, o índice corrente é recalculado; se a zona desaparecer, a seleção é limpa em vez de apontar para outra Hunt. Cleanup devolve o toggle atual ao ponto original do header.

Se o refresh acontecer com o dossiê aberto (inclusive ao trocar Clássico/Plataforma), o controller preserva o zoom relativo e o centro usando a geometria anterior do viewport aberto antes de aplicar a nova geometria. Isso evita reinterpretar o mesmo `_worldMapState` contra um viewport temporariamente full-width.

## Navegação existente preservada

- Busca, filtros de elemento/nível, contagem, Clear, mundos e zoom continuam nativos.
- Johto continua corrigindo apenas o mínimo inicial incorreto de 100 para 1.
- A linha Better UI de resultados continua oferecendo `Localizar no mapa` e `Reset`.
- `navigation.js` continua alterando apenas x/y do `_worldMapState`, salvando e reinstalando a navegação nativa. Ao abrir/fechar o dossiê, o controller recalcula apenas o `scale` interno necessário para compensar a mudança de largura do viewport e preservar o mesmo zoom percebido e centro do mapa.
- Não há MutationObserver específico, monkey-patch de globals ou interceptação de rede.

## Validação automatizada

- Marcador não inicia Hunt e o botão explícito inicia exatamente o fluxo nativo.
- Hover/focus não executam os handlers nativos de tooltip.
- Dossiê contém tipos, relações defensivas exatas e Drops valorizados.
- Toggle Clássico/Plataforma é o mesmo node e retorna ao header no cleanup.
- Toolbar, contador e filtros de elemento permanecem nodes nativos e retornam à ordem exata no cleanup.
- Localizar abre o dossiê, mantém zoom e não inicia gameplay.
- Refresh nativo com dossiê aberto preserva zoom relativo e centro do mapa.
- Filtros, mundo, reorder/refresh nativo e substituição completa da janela não deixam referências antigas ou seleção apontando para outra zona.
- Reconciliação estável não produz mutações e cleanup restaura a estrutura nativa.
- Suíte Hunts: 26/26 testes. Suíte completa: 203/203 testes; build do userscript concluído.
- A abertura/fechamento do dossiê preserva o estado nativo de pan/zoom após o reflow do viewport; selecionar uma Hunt não deve alterar enquadramento ou zoom do mapa.

Validação visual/funcional in-game pelo usuário ainda é necessária para fechar esta revisão.
