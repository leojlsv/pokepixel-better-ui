# Team HUD — leitura rápida da equipe

Status: **Miyazaki 16, collapse/Wallet e a estrutura atual do Team HUD estão cobertos pela
declaração do Product Owner “Estrutura validada.” A correção atual preserva essa composição,
mantém os Element icons quadrados e restaura a invisibilidade nativa do placeholder de Shared
Stone quando não existe carrier/recipient.**

Direção visual: `design-system/pokepixel-better-ui/pages/team.md`.

## Escopo

- Preserva treinador, mapa, stamina, Pokémon ativo, posição e recolhimento nativos. Cada Pokémon ocupado mostra permanentemente sua posição oficial `1..6`; a resolução usa `team.member_ids[]` quando disponível. Embora o runtime nativo mantenha `_creatures` em ordem active-first, Better UI move os **mesmos cards nativos** para a ordem visual/teclado canônica `1→6`, sem cloná-los nem alterar `team.member_ids[]`; cleanup restaura a ordem nativa corrente.
- A linguagem PPBUI agora cobre shell, drag/collapse, trainer header, EXP/STA, Pokémon
  ativo/portrait, barras, Battle Line, Saved Formations e wallet. A Wallet preserva sua
  largura/posição nativa e recebe somente box model/chrome PPBUI, evitando que um `100%`
  relativo ao container externo atravesse a tela. Os nós e handlers permanecem nativos;
  a revisão altera apenas composição/chrome.
- O collapse nativo alterna `is-collapsed`, ARIA, botão `+/-`, Wallet, persistência e refit de viewport. O bug live vinha das regras PPBUI `display:grid!important` sobre header/active/list, que venciam o `display:none` nativo. O FIX usa somente seletores exatos desses blocos (e do host Better UI de presets) com `display:none!important`; nenhum segundo click handler ou toggle de estado foi adicionado.
- Os cards compactos da Battle Line usam micro-slots de 52px: posição, sprite centralizado, `Lv.N` e rail fino de HP. O percentual de HP deixa de competir como texto repetido; HP exato continua no estado/acessibilidade e no bloco ativo. Active/Fainted/focus/hover/pressed continuam compartilhando a mesma semântica estrutural; `Ativo`/`Derrotado` ficam no texto acessível em vez de banners internos.
- A barra de EXP do Pokémon ativo continua mostrando progresso absoluto do nível + porcentagem. O card ativo continua com HP/EXP completos; apenas os seis previews compactos foram simplificados.
- O treinador usa `ppbui-meter-row`: `EXP` e `STA` ficam à esquerda das respectivas barras. Como as barras nativas carregam `grid-column:1/-1`, a integração Better UI redefine explicitamente esse placement para `auto` dentro do meter-row; isso impede o retorno do empilhamento `label` acima da barra. O aviso textual nativo de stamina fica oculto apenas enquanto o Team HUD está enhanced.
- EXP/STA do treinador e HP/EXP do Pokémon ativo mantêm valores legíveis nas barras; valores numéricos muito grandes usam notação compacta para não quebrar a geometria, enquanto o valor exato permanece no `title`/ARIA da própria barra. Os previews compactos usam `Lv.N` + rail fino de HP, sem percentual de HP/EXP visível no membro.
- A formação usa uma única linha `6×1` no HUD desktop estreito normal. Somente abaixo de 280px ela quebra para `3×2`. A mudança substitui os dois candidatos live rejeitados (`2×3` e depois `3×2`) e mantém os seis membros como uma Battle Line anexada em vez de um bloco de cards dominante.
- A ordem visual da linha corresponde à ordem oficial. O estado ativo continua independente da posição; no preview compacto ele é estrutural (borda/rail + estado nativo) e explícito no texto acessível, sem uma faixa textual `Ativo` ocupando a célula.
- Fainted continua bloqueando interação e usa tratamento estrutural + HP drenado, com `Derrotado` preservado no texto acessível em vez de um banner dentro do preview.
- O cliente nativo mantém um nó `.pokeidle-team-card__xp-share` também em cards sem Shared Stone e
  controla sua ausência com `hidden`. Better UI deve respeitar esse estado com precedência suficiente:
  sem carrier/recipient não aparece badge/caixa vazia; quando a pedra existe, o mesmo nó nativo continua
  visível com ícone, direção e contador intrínseco preservados.
- Torna cards ocupados acessíveis por teclado; Enter/Espaço encaminham um clique explícito ao card original. Pokémon derrotados e elementos interativos internos não são acionados.
- Slots vazios, hover, troca de líder, Ditto e seletor de equipe continuam pertencendo ao cliente original.
- Os Element icons do Pokémon ativo mantêm artwork/cor canônicos do jogo, mas consomem
  `ppbui-element-icon--small` (20×20px) em vez de manter chrome circular específico do HUD.
- Recriações são reconciliadas pelo observer central; desativar o módulo restaura atributos e remove somente os elementos Better UI.

Não altera dados, HP, líder, combate, dimensões globais ou chamadas de rede. A
composição interna usa seis tracks flexíveis e preserva os cards nativos.

## Evidência

O Custom UI contém somente inventário da superfície `.pokeidle-team-hud`. O contrato foi auditado no `PersistentHUD.js` público atual: cards mantêm `--hp-percent`, `is-fainted`, listeners de líder e `PokemonCard.bindSlot`; slots vazios abrem o seletor oficial.

## Validação

Testes sintéticos cobrem preservação da identidade/cliques dos cards, Battle Order canônica
independente do líder, ordem visual/teclado `1→6`, restauração da ordem native active-first,
bloqueio de derrotados, teclado, valores persistentes, reconciliação estável, substituição
de cards e cleanup. A regressão de collapse usa o botão nativo original e prova classe,
ARIA, Wallet e continuidade do listener após cleanup, além dos seletores de precedência
CSS que ocultam exatamente header/active/list. O candidato Miyazaki 16 requer a nova
suite/build/review desta migração; a comprovação visual final permanece no gate in-game do Product Owner.
