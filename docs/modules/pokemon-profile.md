# Pokémon Profile — dossiê dedicado

> Nota de atualização (`0.2.124`): a feature Custom Pokéball foi removida por
> decisão do Product Owner. As referências abaixo a seu PNG e aos testes conjuntos
> são histórico do freeze `0.2.77`; apenas o ícone do Pokémon Profile permanece.

Status: **Better UI 0.2.181 — barra de raridade relativa ao mínimo/máximo validada in-game
pelo Product Owner em 2026-10-07. O relato de barra ausente foi esclarecido pelo usuário como
teste em versão desatualizada; a implementação entregue permanece inalterada.**

## 0.2.181 — preenchimento relativo à faixa da raridade

A proporção usa `(Quality atual - mínimo) / (máximo - mínimo)`, limitada a 0–100%.
Os dois limites vêm da mesma resposta nativa `PokemonCardData.qualityBand()` para
a raridade e variante Normal/Shiny. Legendary 1.62 na faixa 1.55–1.69 representa
50%; no mínimo a barra fica vazia e no máximo, cheia. Faixas ausentes, iguais ou
invertidas omitem o trilho. ARIA usa o mínimo nativo e o valor limitado à mesma faixa.
Texto, cores, estrutura HP/XP, Awakening e quantidade de consultas permanecem iguais.

## 0.2.180 — barra de preenchimento da raridade (escala substituída por 0.2.181)

A linha de raridade mantém nome, Quality atual e máximo e recebe abaixo o mesmo trilho
`.pokemon-card__track > i` de HP/XP, com 6px de altura e a cor canônica da raridade.
O preenchimento é `Quality atual / máximo da própria raridade`, limitado visualmente a
0–100%; `PokemonCardData.qualityBand()` determina o máximo Normal ou Shiny. A proporção
não subtrai o mínimo da faixa nem representa a contagem de passos de Awakening.
Dados ausentes/inválidos omitem o trilho; o progressbar expõe nome e valores acessíveis.
Não há consulta adicional, polling ou estado persistido.

## 0.2.179 — hierarquia do resumo e etapas completas de Awakening

- duas colunas flexíveis, gap de 8px, valores alinhados, rótulo da raridade na cor canônica e um
  divisor discreto entre as duas linhas do resumo; atual e teto têm pesos tipográficos distintos;
- os meters nativos mantêm seus textos e barras; `min-width:0` nos filhos elimina a largura
  mínima intrínseca que fazia o conteúdo invadir a outra caixa; o texto pode refluir localmente;
- o parser segue a mesma ordem do `GeneticAwakening.js`: `awk`, `challenge`, `god_tier`, terminal.
  `awk` fornece `index/total`; `challenge` e `god_tier` preservam o progresso nativo
  `kills/kills_required` quando disponível. No teto Epic, `challenge` é um estado válido; quando o
  contador existe, o card usa o rótulo visual compacto `Ch.` / `God Ch.` e mantém o nome completo em
  `title`/nome acessível. Metas redondas usam sufixo compacto (`8k`, `1M`) somente na leitura visual; o
  valor exato continua no `title`/nome acessível. Sem contador, conserva o texto completo. Não se infere
  um `5/5`. Sem próximo ramo, a leitura
  é `MAX` ou `God Tier`;
- carregamento (`…`), falha de leitura (`Indisponível` no PT) e estados válidos têm apresentação
  distinta. O label permanece estável em uma região de status; apenas seu valor é atualizado;
- `state.resynced` agora invalida e reidrata summaries abertos; as proteções de geração/cache e
  a restauração dos nós originais continuam ativas. Leituras ainda não iniciadas não partem após
  cleanup. Nenhuma ação de Awakening é executada pela melhoria.

Evidência local: `work/profile-rarity-179/preview.png` e `metrics.json`, gerados pelo Chromium com
CSS nativo público e o módulo corrente; a fixture cobre 320/360/390px e estados de progressão.

## 0.2.178 — Rarity / Awakening ao lado de HP / Experience (reprovado; histórico)

- o bloco nativo `.pokemon-card__meters` é movido como nó, sem recriar HP ou Experience, para a
  coluna esquerda de um grid `1fr / 1fr`;
- a coluna direita mostra `<Raridade> x<Quality atual>/<teto da faixa>`, usando
  `creature.quality_multiplier` e `PokemonCardData.qualityBand()`; os decimais seguem o locale do
  jogo e dados ausentes permanecem indisponíveis;
- `Awakening <index>/<total>` usa exclusivamente `Api.getAwakeningPreview().awk`; a consulta só
  ocorre em cards acionáveis que já possuem a ação nativa `.is-awakening`, nunca no hover;
- previews são compartilhados por criatura/estado de Quality, invalidados por `creature.updated` e
  `state.resynced`, e respostas tardias só atualizam o token atual do mesmo card;
- rerender e cleanup devolvem o meter nativo ao ponto original antes de remover a decoração Better
  UI, preservando o lifecycle do renderer e handlers nativos.

## 0.2.149 — Priority e heal threshold nos Current Moves

- o Profile lê o `slot_settings` autoritativo do `getMoveset()` por posição 1→4;
- `use_as_priority=true` pinta a caixa do número do slot em dourado e adiciona nome acessível usando a
  própria tradução nativa `moveset.priority`;
- Power deixa de mostrar o prefixo visual `PW`; o `aria-label` continua `Power XXX`;
- para Move com `effect_kind="heal"`, `heal_threshold_pct` válido (1→100) é mostrado após o Power em
  verde claro, com nome acessível baseado em `moveset.heal_threshold`;
- o formato visual torna-se `[Element Icon] Type · Ns · XXX · XX%` quando o Move é cura com threshold;
- Saved Movesets continuam sem Priority/threshold porque o snapshot persistido existente armazena
  apenas os quatro Moves; o Profile não projeta configuração que não foi salva.

## 0.2.148 — alinhamento de Power na metadata de Move

- `PW XXX` compartilha a mesma métrica tipográfica e line-box de `Type`, cooldown e separadores;
- a geometria vertical exclusiva de Power (`min-height` e `padding`) foi removida, eliminando o
  deslocamento óptico observado in-game sem alterar cor, conteúdo, `aria-label` ou largura dos rails.

## 0.2.147 — cooldown compacto, lateral direita e rounded

- Current/Saved Moves passam a exibir `[Element Icon] Type · Ns · PW XXX`; o prefixo visual `CD`
  foi removido, mas o nome acessível continua `Cooldown Ns`;
- o Profile reduz o scrollbar próprio para 8 px e compensa o padding direito de picker/main, evitando
  a soma visual `padding + scrollbar` que deixava a lateral direita mais larga que a esquerda;
- o shell mantém `--ppbui-window-radius: 8px` e agora usa clipping no próprio root, fazendo title bar
  e body respeitarem os quatro cantos rounded sem alterar drag, clamp ou scroll interno.

## 0.2.146 — title bar, Search centralizado, detalhes de Move e drag

- o title bar segue a hierarquia das janelas do jogo: 48 px, superfície Interactive, ícone do
  Pokémon Profile à esquerda, título branco em tipografia de UI e close discreto;
- o próprio title bar é a área de drag; a janela materializa sua posição no primeiro arraste,
  permanece inteira dentro do viewport com margem de 8 px, reclampa em resize e mantém a posição
  durante a sessão; controles do title bar não iniciam drag; quando suportado, o title bar captura
  o ponteiro e o drag também termina em `lostpointercapture`, blur da janela ou `pointermove` sem
  o botão primário, cobrindo release fora do documento/browser;
- todos os objetos do Search card ficam centralizados: nome, sprite, Element, Rarity e Level;
- Current/Saved Moves usam metadata concatenada
  `[Element Icon] Type · CD Ns · PW XXX`, com separadores decorativos fora da árvore acessível;

## 0.2.145 — performance, lifecycle, responsividade e acessibilidade

- o picker mantém um nó por `creatureId` e atualiza o estado selecionado sem reconstruir/reordenar
  a lista quando a composição filtrada não mudou; busca/filtros reaproveitam esses mesmos nós;
- o card compacto de busca mantém largura de 108 px, mas usa toda a largura em um único track de
  conteúdo, preservando a ordem `Nome → Sprite → Element → Rarity → Level`;
- seleção pelo picker e Save/Apply/Update/Delete de movesets preservam um destino lógico de foco
  depois de rerenders; o Retry de Current Moves mantém seu contrato anterior;
- fechar o Profile invalida qualquer abertura/carregamento pendente antes que resultados assíncronos
  possam renderizar ou recuperar foco; hidratações do PokémonCard usam geração por card para impedir
  que respostas antigas sobrescrevam dados mais novos;
- falhas transitórias de Species deixam de envenenar o cache da sessão e podem ser recuperadas por
  Refresh; `moveset.saved` invalida uma vez e compartilha a mesma releitura autoritativa entre
  dossier e PokémonCard;
- dialog, grupos de descoberta, HP e membros de Saved Teams expõem nomes/estado programáticos;
  níveis inválidos exibem mensagem localizada associada ao campo;
- ACTIVE/PROTECTED compactos mantêm os mesmos labels acessíveis e geometria, usando desenho CSS em
  vez de emoji;
- em render sintético Chromium de 760/420/340 px, root/body permanecem sem overflow horizontal
  global; picker e rails 1→4 preservam seus scrolls horizontais locais quando necessários.

## 0.2.77 — ícone de menu do Pokémon Profile

- o menu `data-menu-id="pokemon-profile"` passa a usar exatamente
  `assets/menu-poke-profile-icon.png`;
- a imagem usa `img.pokeidle-top-toolbar__icon`, `alt=""`, `aria-hidden="true"` e não é arrastável;
- build embute o PNG no userscript como data URL; `/assets/menu-poke-profile-icon.png` permanece
  apenas fallback de execução direta/teste;
- agrupamento, label, `creatureId`, handler, lifecycle e toda a superfície do dossier permanecem
  inalterados;
- o mesmo freeze inclui a troca pedida do Custom Pokéball para
  `assets/menu-custom-pokeball-icon.png`, removendo seu SVG/vector gerado como ícone visível.

Freeze local: Profile + Custom Pokéball `31/31 PASS`; full suite `420/420 PASS`; build PASS;
visual exact-current **READY P0=P1=P2=P3=0**. Both menu PNGs render centered without distortion in
the native icon geometry and Custom Pokéball no longer presents the old SVG/vector icon.

Better UI `0.2.77`: `1087375` bytes, SHA-256
`3E4FE83D7FAAFF673FF8E917B8742020E5A167E2AEBF6BA20387B963DF493442`.

## 0.2.76 — PokémonCard compacto + Game Palette / Alpha aprovado

O export aprovado pelo Product Owner foi promovido ao runtime sem alterar a autoridade do
`PokeIdle.PokemonCard`:

- Window/Values usam `#161D20`, Interactive usa `#232C2E`, linhas usam `#6B6543` e toda
  borda/separador do módulo permanece em `1px`;
- transparência de superfície é independente: Window `92%`, Interactive `96%`, Values `85%`;
- Hero e Current Moves usam a superfície Interactive; Search/List mantém `108px` e o grid
  aprovado `2×4`; metadata de moves permanece `Element → TYPE → Cooldown → PW`;
- o card nativo mantém 360px em 760/420 e usa `max-width:100%` somente quando o parent é menor,
  removendo o clipping observado no preset 340px;
- ACTIVE/PROTECTED compactos, Power promovido, ações nativas no topo, `· IV n/186` em Battle
  Stats e ocultação de TOTAL IV/RARITY duplicados permanecem reversíveis e preservam handlers;
- Type/Rarity continuam com suas cores semânticas nativas e não recebem a paleta neutra.

Freeze local final: Profile `24/24 PASS`; full suite `420/420 PASS`; build/diff-check PASS;
visual exact-current **READY P0=P1=P2=P3=0**.

Better UI `0.2.76`: `1001837` bytes, SHA-256
`11C2CB82C189F7573B0A1AA24736445C32463D2C9B416DC7380E28F57EEBF928`.

## 0.2.71 — promoção do Playground Obsidian aprovado

O Product Owner aprovou o layout do Playground e autorizou a promoção em 2026-09-24. O runtime
agora incorpora o estado aprovado sem depender de CSS temporário:

- Search/List usa largura `108px` e grid `2×4`: Nome ocupa a linha 1; Sprite e Elementos ficam
  separados na linha 2; Rarity é um objeto DOM independente e ocupa toda a linha 3; Level ocupa
  toda a linha 4;
- Element e Rarity deixam de compartilhar o mesmo wrapper no runtime, preservando a raridade
  canônica e permitindo a hierarquia visual aprovada sem CSS `order` artificial;
- metadata de Current/Saved/Hover Moves segue DOM e visual
  `Element → Phys/Spec/Status → Cooldown → PW`;
- `PW XXX` permanece fixo em `44px`, mas o Obsidian remove a moldura interna redundante de nome/PW;
- Current/Saved move rails continuam horizontais `1→4`, usam `minmax(136px,1fr)`, ocupam `100%`
  da largura útil e usam `scrollbar-gutter:auto`, portanto não reservam faixa vazia quando não há
  overflow; narrow mantém o scroll horizontal local/focável;
- Profile e Hover recebem a paleta Obsidian aprovada: shell azul/verde quase preto, contraste leve
  entre boxes e background, gold restrito a hierarquia/Power, e separadores steel/green-gray mais
  suaves para reduzir o efeito de “caixa dentro de caixa”;
- arquitetura, `creatureId`, Team/Backpack ownership, filtros, Configure Moves, Saved Movesets,
  Saved Teams e stores canônicos permanecem inalterados.

Freeze local:

- focused Profile + Team Movesets: `31/31 PASS`;
- full suite: `414/414 PASS`;
- build: PASS;
- Better UI `0.2.71`: `982232` bytes, SHA-256
  `2B2721C39C53B2BC2C76FEE88D0FAC92DFA7B4AB1A17E5CC8BE806050F560AA9`;
- independent final gates: TECH/ARCH READY, UX/A11y READY e VISUAL READY, com
  `P0=P1=P2=P3=0`.

Git history e promoção do host normal continuam separados.

## Corrective 0.2.70 — hover alinhado ao dossier

- Current Moves do hover reutiliza o mesmo renderer do dossier: Element, Phys/Spec/Status, PW XXX
  com largura fixa de 44px e Cooldown numérico;
- ordem 1→4 permanece explícita; em narrow o overflow continua local ao rail focável;
- hover passa a usar largura máxima de 580px para manter os quatro cards legíveis em desktop;
- Power agregado do Pokémon no cabeçalho permanece como Power N; PW continua específico de move;
- metadata ausente no moveset usa o mesmo fallback autoritativo PokemonCardData.loadDetail() do
  dossier, preservando os guards de epoch contra resultado async stale;
- focused Profile + Team Movesets: 31/31 PASS; full suite: 414/414 PASS; build/diff-check PASS;
- renders h17 hover: 760 SHA-256 21B82BCF6F3A553B1BC325F78273028160E535C522E5D53E3345BF6EF7E9A072;
  420 SHA-256 C552AA729B24C8B309017C42D998CCD8ADB24E259C8B6F3911D565FDCC943E20;
- dist 0.2.70: 981354 bytes, SHA-256
  87B22ED120CC1FBEB0E1D92725C2AC02142EB3E5C184A3DA89F829843F8525B7;
- candidate69: 240640 bytes, SHA-256
  C7DA787C4AA430DE47EBF9CB4AFD2A71659080ED886A0BACC3067FB2BB8702AD;
- candidate69 normal / close-during-init / close-during-switch: PASS, exit 0, stderr 0.
- TECH/ARCH, UX/A11y e VISUAL render-first: READY, P0=P1=P2=P3=0.

## Corrective 0.2.69 — Search compacto + Power estável

Último feedback do Product Owner fechado:

- Search/List remove IV do card pequeno; IV continua disponível somente no dossier selecionado;
- largura normalizada do card Search cai de `128px` para `116px`, mantendo
  `[Sprite] → Nome → [Elemento][Elemento] [Rarity] → Lv.`;
- Power em Current/Saved Moves passa a exibir `[PW XXX]` dentro do chip existente;
- todos os chips Power usam largura fixa `44px`; o grid de metadata passa a
  `22px minmax(30px,1fr) 44px minmax(22px,auto)`, com card mínimo `136px`;
- `Phys/Spec/Status` permanece completo, Cooldown continua numérico e os rails seguem horizontais
  `1→2→3→4` com scroll local/focável em narrow;
- o texto visual compacto não reduz semântica acessível: Power continua `aria-label/title =
  "Power <valor>"` e Cooldown `"Cooldown <valor>s"`.

Freeze local `0.2.69`:

- focused Profile + Team Movesets: `31/31 PASS`;
- full suite: `414/414 PASS`; build PASS; diff-check exit `0`, somente warnings LF/CRLF;
- TECH/ARCH, UX/A11y e VISUAL render-first: **READY**, `P0=P1=P2=P3=0`;
- renders exact-current h16: desktop/340/Spec/Female; 340 mantém root/body `320/320` e
  `310/310`; Current/Saved rails permanecem locais em `268/550`, `280/550`, `284/550`;
- h16 760 SHA-256 `2F79FC886F6C6051A172BE23FDD70AFB9AD107A3A349BA15CE4A862A74A6405D`;
  h16 340 `6FA6050451EEDD261984C33CF163478D13F1C87A58D3621E15BC7B58676FD51D`;
  h16 Spec `377FA90947F6B80178F833FDC360162E4B431F35FA78A329872985F8F50E37A9`;
  h16 Female `7358D2C906BF6CD4747F4F5C8EFD04DF4CBCACF605356226225218E696B555C5`;
- `dist/pokepixel-better-ui.user.js`: `981996` bytes, SHA-256
  `838A4F84CD7F6F606609247A12B8A45DBCEDD8F4C3D597A434386CF8D6D9C223`, header
  `@version 0.2.69`.

## Corrective 0.2.68 — hierarquia final do Profile

Feedback mais recente fechado:

- Search/List usa exatamente `[Sprite] → Nome → [Elemento][Elemento] [Rarity] → Lv. - IV`;
  Quality Number foi removido e raridade ausente fica `—`, sem fabricar `Common`;
- no Pokémon selecionado, somente o ícone de Element possui borda; o nome do Element é texto
  adjacente sem caixa. A ficha mostra `Rarity` com o label real, sem multiplier;
- Gender usa semântica visual independente de Element: male ciano, female salmão/rosa e desconhecido
  muted;
- Current/Saved Moves continuam horizontais `1→2→3→4` e mantêm `Phys/Spec/Status` explícito.
  Power e Cooldown exibem somente o número; seus nomes/unidades permanecem no title/ARIA. Power usa
  ivory e Cooldown muted/steel, ambos fora da paleta de Element;
- cards de move reservam largura mínima suficiente para `Status` sem truncamento; em 340px o
  overflow continua local aos rails focáveis.

Freeze local `0.2.68`:

- focused Profile + Team Movesets: `31/31 PASS`;
- full suite: `414/414 PASS`; build PASS; diff-check exit `0`, somente warnings LF/CRLF;
- TECH/ARCH, UX/A11y e VISUAL render-first: **READY**, `P0=P1=P2=P3=0`;
- renders exact-current h15: desktop/340/Spec/Female; 340 mantém root/body `320/320` e
  `310/310`; Current/Saved rails ficam locais em `268/534`, `280/534`, `284/534`;
- h15 760 SHA-256 `2CD0FA811FC8543F5C167F25A479685D9C64BD9C327223EE18A9B07E087B0236`;
  h15 340 `52A2AB67D4D0442457A79DA43F62AE72FBC84C9FB91465BA6124D65A636F715E`;
  h15 Spec `52214D51EE03ABB3E05BB2440A3F79ED7C30289CCA08129A384F0F13D67C0973`;
  h15 Female `5A6B46A8A2785F52A2127B8BF667499567D759A8CA8095D78EDF8F2649019DB1`;
- `dist/pokepixel-better-ui.user.js`: `982022` bytes, SHA-256
  `4987131954AA5D835CEAAC120A0E6E16D9736C1FC8D59260D3A3A045C324F328`, header
  `@version 0.2.68`.

## Corrective pós-candidate64 — identidade + ações + Team controls

Feedback live do Product Owner fechado em `0.2.67`:

- Profile agora reutiliza sprites nativos/canônicos, cores e ícones de Element e o mesmo
  `ppbui-quality-badge` usado nas superfícies Team; todos os Pokémon de Team + Backpack são
  enriquecidos por Species antes do picker para cobrir payloads crus sem sprite;
- Current e Saved Moves preservam o trilho horizontal `1 → 2 → 3 → 4`, adicionando ícone do move,
  identidade visual do tipo e `PWR` real. Power vem do payload autoritativo quando presente e cai
  para `PokemonCardData.loadDetail()`/`move.power` quando necessário, inclusive para moves que só
  aparecem em Saved Movesets; valor desconhecido continua `—`, nunca inferido;
- `Configurar moves` edita a instância exata selecionada, inclusive Backpack, pela mesma cadeia
  `applyTeamMoveset` usada para validar revision, disponibilidade e estado final do writer nativo;
- Saved Movesets e Times que usam este Pokémon possuem collapses independentes com botão nativo,
  `aria-expanded`, label contextual, body realmente oculto e estado de sessão por `creatureId`;
- Team continua sendo Team. Os nós nativos existentes de Edit Moves, Active/Activate, posição `#N`
  e `< >` formam uma única faixa alinhada; handlers, disabled state, Vitals/Stats e cleanup continuam
  sob ownership nativo/Team;
- os filtros Rarity / Element / Level Min-Max / Tags, exact `creatureId`, stores canônicos, hover,
  restauração de foco e trilhos narrow permanecem intactos.

Freeze local `0.2.67`:

- focused Profile + Team + Team Movesets: `49/49 PASS`;
- full suite: `413/413 PASS`; build PASS; `git diff --check` exit `0`, somente warnings LF/CRLF
  existentes;
- TECH/ARCH: `READY`, UX/A11y: `READY`, VISUAL render-first: `READY`; todos
  `P0=P1=P2=P3=0`;
- visual exact-current cobre desktop, 340/focus, Configure Moves desktop/340, filtros, hover,
  sections collapsed e Team active/inactive/first/last; 340 mantém root/body `320/320` e `310/310`,
  com rails locais Current/Saved `268/454`, `280/454`, `284/454`;
- `dist/pokepixel-better-ui.user.js`: `972808` bytes, SHA-256
  `BA880C4BC407E530063407B577E0F76906F037902B4244B617CBA25C6830883E`, header `@version 0.2.67`.

## Corrective pós-candidate63 — moves horizontais + discovery avançado

Feedback live do Product Owner:

- moves em coluna não fazem sentido para essa ficha;
- busca precisa de filtros por rarity, element, range de level e tags.

Direção implementada para o próximo candidato:

- Current Moves, Saved Movesets e hover usam ordem visual horizontal `1 → 2 → 3 → 4`;
- largura normal mostra os quatro cards simultaneamente;
- em 340px o trilho continua horizontal com scroll local e largura mínima por card, evitando
  nomes quebrados e evitando regressão para coluna/2×2;
- discovery mantém `Todos / Team / Backpack` + busca e acrescenta filtros sempre visíveis de
  `Raridade`, `Elemento`, `Nível mín.`, `Nível máx.` e `Tags`;
- filtros avançados compõem por AND com a busca/source; tags usam o mesmo `tagService` trainer-
  scoped e o mesmo `matchesPokemon` de Backpack/Storage/Trade;
- opções de rarity/element foram centralizadas em `pokemon-tools/model.js` para Profile e as
  superfícies existentes consumirem o mesmo catálogo.

Evidência do freeze corrective 0.2.66:

- focused Profile/Pokémon Tools/Storage/Trade/Team: `77/77 PASS`;
- full suite: `408/408 PASS`;
- build: PASS;
- `git diff --check`: exit `0`, apenas warnings LF/CRLF já existentes;
- TECH/ARCH + UX/A11y independent re-gate: `READY`, `P0=P1=P2=P3=0`; o único P2
  intermediário (range inválido mantendo bound anterior oculto) foi corrigido e coberto;
- render-first VISUAL re-gate: `READY`, `P0=P1=P2=P3=0`; o P3 intermediário do outline
  nativo no trilho focável foi fechado com `ppbui-focusable` e foco quadrado/ciano;
- renders atuais: desktop/filter/hover `h3-620`, `h3-filters`, `h3-hover`; narrow exato após
  scrollbar/foco `h5-340` e `h5-340-focus`.
- métricas narrow dos move rails: Current `268/454`, Saved Hunt `280/454`, Saved Boss
  `284/454` (`clientWidth/scrollWidth`), todos `overflow-x:auto`, `tabIndex=0` e label contextual;
  root/body permanecem `320/320` e `310/310`, sem overflow horizontal da janela.
- full suite exata após bump: `408/408 PASS`; build PASS; `git diff --check` exit `0` com
  apenas warnings LF/CRLF já existentes;
- `dist/pokepixel-better-ui.user.js`: `953762` bytes, SHA-256
  `6F2230B70EBC36F2396F9535EE91472E74825772780D8E6390766A225276C2FE`, header
  `@version 0.2.66`.

## Objetivo

`Pokémon Profile` é uma janela/menu independente de Team. Ela concentra leitura e manutenção
de contexto por instância de Pokémon sem transformar Team em dossiê e sem criar um segundo
modelo de persistência.

## Fonte e identidade

- Pokémon elegíveis = união exata de `Team + Backpack`.
- Team tem precedência apenas quando o mesmo `creatureId` aparece nas duas coleções.
- Filtros do seletor: `Todos`, `Team`, `Backpack` + busca por nome.
- Participação em Saved Teams e Saved Movesets usa **exatamente `creatureId`**; species nunca
  substitui identidade de instância.
- Profile reutiliza as instâncias canônicas dos stores de Team Presets e Team Movesets.

## Conteúdo

1. subject hero com portrait, nome, Level, Elements, quality/origem, HP e Power inline;
2. **Moves atuais** em uma lista linear inequívoca `1 → 2 → 3 → 4`;
3. **Movesets salvos** da mesma criatura, cada um também linear `1 → 2 → 3 → 4`;
4. **Times que usam este Pokémon**, filtrados pelo `creatureId` exato.

O Profile não fabrica Ability, Item, stats ou qualquer fato não confirmado pelo runtime. Ações
de Apply/Update/Delete de movesets continuam usando o writer nativo e a verificação final já
existente; Team Presets continua sendo a única fonte de Saved Teams.

## PokémonCard nativo / hover

Profile **não cria mais um hover substituto** e não intercepta os listeners de pointer/focus dos
slots. A superfície autoritativa volta a ser o `PokeIdle.PokemonCard` padrão do jogo
(`.pokemon-card--hover`, `.pokemon-card--pinned` e `.pokemon-card--sheet`), preservando
header, badges, meters, Battle Stats, Genetics, provenance, botões e lifecycle nativos.

Better UI faz somente um pós-processamento reversível depois do `PokemonCard.render` nativo:

- a célula `SALE` nativa é ocultada pelo label localizado que o próprio jogo fornece;
- o valor já renderizado de `TOTAL POWER` sai da grade inferior e vira um badge na mesma faixa de
  Level/Rarity, alinhado ao lado direito;
- os quatro Moves atuais são lidos pelo Moveset API autoritativo e adicionados ao card em uma grade
  compacta 2×2, usando o mesmo mapa/asset nativo de ícones de move já reutilizado por Saved Movesets;
- quando o card nativo possui a própria action row (pinned/sheet), Better UI acrescenta **Profile**
  junto de Equip/Lock/Chat e abre o `creatureId` exato no Pokémon Profile;
- o hover transitório continua read-only, porque o host nativo o fecha em `pointerleave`; Better UI
  não transforma esse hover efêmero em uma segunda janela interativa.

### 0.2.162 — leitura do PokémonCard

O card enriquecido usa a própria largura disponível como contexto responsivo e organiza o conteúdo em
quatro bandas de leitura: identidade/status, ações/vitals, Moves atuais e dados de combate/genética.

- nome e espécie mantêm o header nativo como âncora principal; Level, Rarity, Active/Protected e Power
  permanecem compactos e preservam suas cores/semânticas do jogo;
- cards com cinco ou mais ações distribuem comandos em três colunas; em larguras extremas a grade pode
  cair para duas, sem recriar os botões nem alterar seus handlers/disabled state;
- HP/EXP preservam valores exatos e passam a alinhar label e número de forma previsível;
- Moves atuais continuam na ordem autoritativa e em 2×2 nos tamanhos usuais; nomes podem ocupar duas
  linhas antes de qualquer reflow estrutural;
- Battle Stats e Genetics compartilham linhas label→valor, valores tabulares alinhados à direita e
  separadores discretos. Um bloco com uma única coluna, como Genetics, ocupa a largura inteira;
- a quebra para uma coluna fica reservada a cards abaixo do mínimo funcional, em vez de transformar
  320 px em uma lista excessivamente alta.

### 0.2.163 — redução de informação repetida

- \`TOTAL IV\` continua lido da célula nativa, mas é apresentado uma única vez no rail superior como
  chip verde-claro \`IV x/186\`, imediatamente após o badge de raridade;
- \`Battle Stats\` deixa de repetir IV no heading e fica restrito aos seis atributos de combate;
- \`ACTIVE\` e \`PROTECTED\` são ocultados do rail superior em pinned/sheet e também no hover
  transitório, mantendo rarity e o chip promovido de IV sem ícones de status redundantes;
- todos os estados ocultados são restaurados pelo cleanup antes de qualquer novo render nativo.

### 0.2.164 — peso visual do chip de IV

O chip promovido de IV agora possui uma exceção explícita à regra de chrome neutro dos badges.
Isso garante que o render aplique de fato a paleta verde-clara prevista: borda `#9bd589`, fundo
verde translúcido mais presente e texto `#d8f5ce`, sem alterar geometria, posição ou hierarquia.

### 0.2.165 — scrollbar vertical do PokémonCard

O PokémonCard enriquecido passa a receber `ppbui-scroll-scope`, a mesma gramática compartilhada de
scrollbar usada pelas superfícies Better UI. A classe estiliza apenas o scroller que já existir no
host: 10 px, track escuro, thumb estrutural, borda/radius do design system e sem botões WebKit.
Better UI não cria overflow, não altera altura e não adiciona `scrollbar-gutter`; quando a classe não
existia antes da decoração, o cleanup a remove e devolve o card ao estado nativo.

Desabilitar o hover transitório continua sendo responsabilidade do módulo de hover existente e não
desabilita o menu dedicado Pokémon Profile.

## Acessibilidade / foco

- Pokémon do seletor permanecem `<button>` nativos; seleção usa `aria-pressed` sem trocar o
  role do controle.
- Retry de Moves atuais estaciona foco em uma região persistente e, após o rerender, move foco
  para a nova região Current em vez de cair em `BODY`.
- A ação Profile adicionada ao action row é um `button` normal com nome acessível e mantém a ordem
  de teclado do próprio card nativo.
- Abrir a partir dessa ação guarda o controle de origem. X/Escape devolvem foco a essa origem
  se ainda estiver conectada; caso contrário, o fallback é o launcher `Pokémon Profile`.
- Ícones dos moves são decorativos (`alt=""`); nome e resumo textual continuam disponíveis no
  próprio tile, então nenhum dado depende somente do ícone.

## Responsividade

- janela normal limitada a 620px;
- suporte a 340px sem clipping do fluxo principal;
- seletor de Pokémon possui scroll horizontal intencional;
- `profile-body` é o único dono de scroll vertical da janela.

## Freeze local 0.2.65

- focused Profile/Team/Hover/Movesets/Presets: `64/64 PASS`;
- full suite: `407/407 PASS`;
- build: PASS;
- `git diff --check`: exit `0`, apenas warnings LF/CRLF já existentes no repositório;
- render-first anterior permanece visualmente aplicável porque o corrective UX delta altera
  somente semântica/foco, sem geometria ou estilo.
- corrective UX/A11y re-gate: `READY`, `P0=P1=P2=P3=0`, com probes independentes dos quatro
  antigos bloqueios e rerun focused `64/64 PASS`.
- final TECH/ARCH re-gate: `READY`, `P0=P1=P2=P3=0`; reviewer focused run `79/79 PASS`.
- final render-first VISUAL re-gate: `READY`, `P0=P1=P2=P3=0`; os nove renders continuam
  representativos porque o delta posterior é somente de semântica/foco.
- `dist/pokepixel-better-ui.user.js`: `946788` bytes, SHA-256
  `EDD901556C769DDE15B9930C63CBCBCFA280F322A6F4F832AB9408F54CA0836C`, header `@version 0.2.65`.

O registro 0.2.65 abaixo permanece histórico; o gate atual é validação in-game do Product Owner.
Git history e release continuam separados.
