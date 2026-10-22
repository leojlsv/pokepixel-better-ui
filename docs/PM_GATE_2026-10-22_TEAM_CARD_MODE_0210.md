# PM gate — Team em Cards, candidato integral 0.2.210

**Status:** **PM ACCEPTED OFFLINE — candidato integral 0.2.210 somente para validação in-game pelo PO**. Fonte/build, TECH, UX/A11y e VISUAL concluídos em host sintético; **PO ainda não validou 0.2.210**. Sem instalação, Tampermonkey, game/browser autenticado, commit, merge, push, tag, publicação ou alteração de `userscript/release-lock.json`.

## Autoridade e baseline preservado

O PO declarou **“Validado”** ao candidato integral **0.2.209**, com SHA-256 `2110A9032B9B4A26EF3F702EE271D0FE96949743580FE7842E0ABF9152604549`. A cópia exata `visual-evidence/po-approved-v0.2.209.user.js` mantém **1.853.640 bytes** e o mesmo hash. Esse aceite não autoriza publicação nem vale para a nova versão. A release-lock permanece na `0.2.204`, SHA-256 `384DDCCD9C6537C09CD15F3D47D5C802753DFF13C5C0DAD105F412681B5AD6E4`.

Novo pedido corretivo do PO (2026-10-22):

> Em Teams: Tornar os stats colapsáveis (iniciando abertos): HP/EXP/Attack/...; garantir que abrir Saved Teams nunca fique por baixo da Menu Bar; ao abrir “Details”, a tela precisa estar acima do Card Mode.

O catálogo anterior permanece com **37 cenas + 9 actions = 46 destinos**, seis exclusões Game-only (Gyms, Hallowen 2026, Defense Arena, Pokepixel Tactics, Tournaments e Ranked PvP); nenhum escopo de gameplay ou permissão foi ampliado.

## Matriz de aceite e evidência — escopo 0.2.210

Worktree: `/pokepixel-better-ui/work/card-mode-window-overlays`; branch `feat/card-mode-window-overlays-205`, HEAD `81816d3`. O implementador é responsável pela fonte/testes; `worker-15` revisa TECH e `worker-16` revisa UX/A11y e imagens Chromium de forma independente, somente leitura. Fora de escopo: ações de servidor/gameplay, operação autenticada, commits e release.

| ID | Requisito observável | Preservar | Evidência exigida e disponível | Revisão independente | Estado |
| --- | --- | --- | --- | --- | --- |
| AC-01 | HP, EXP e os cinco stats recolhem juntos, começam abertos e reabrem por mouse/Enter/Espaço | Nós/valores/handlers nativos, foco, ARIA, refresh e cleanup | Testes Team/Details, Chrome Team stats, stats-keyboard e render 320/390/1280 | TECH + UX/Visual | `pass` offline |
| AC-02 | Saved Teams aberto nunca desaparece **atrás** da Menu Bar; último Apply/Delete, scroll, drag/resize e largura manual continuam acessíveis | Único gerenciador nativo dentro de Team, cinco presets, foco e operações | Testes no-op/cancel/blur/cleanup com manager fechado preservando **top/left/width/height**, inclusive Game; **dois sentidos de segundo ponteiro** (resize→título e título→resize) não assumem ownership/descartam snapshot; 480→504, primeiro expand após 610, reabertura 504→610; Chrome Team top/bottom/vertical/mid, 3 cenários manuais × 3 viewports e hit-testing do último Delete | TECH + UX/Visual | `pass` offline |
| AC-03 | Details mostra a ficha nativa acima de Cards, por um único handler original | Cards selecionado, Game seguro se ownership ambíguo, X/Escape, sheet móvel e vida útil do pin | Testes dedicados de proveniência/fallback e Chrome Team Details mouse/teclado em três resoluções | TECH + UX/Visual | `pass` offline |
| AC-04 | Regressão: destinos Cards elegíveis preservados e seis exceções Game-only intactas | Baseline 0.2.209 validado, permissões/handlers/caches e renderer oculto | Suíte completa 1.109/1.109, Chromium Card Mode 66/66 em host sintético, snapshot 0.2.209 intacto | TECH | `pass` offline |
| AC-05 | Entregar candidato integral 0.2.210 identificável sem afetar a release | Branch/HEAD/worktree suja, snapshot 0.2.209 e lock 0.2.204 | SHA-256 e bytes de ambos os userscripts; snapshot de candidato com hash no nome; metadata/package/lockfile, status/diff Git sem escrita | PM | `pass` |
| AC-06 | Confirmar no jogo real os três refinamentos do Team, sem regressão de Card Mode | Dados/handlers nativos, Menu Bar real, profile pinned real e aprovações prévias 0.2.209 | Instalação e uso do script exato, screenshot/feedback do PO em viewport real | PO, sem substituto automatizado | `live-only` |

Estados `pass` acima atestam **somente o gate offline correspondente**; AC-06 permanece `live-only` até aprovação explícita do PO. Em viewport fisicamente inviável, AC-02 significa prioridade de camada Team acima da Menu Bar, **não** promessa de ausência absoluta de interseção geométrica.

## Alterações

### Stats do Team, reversíveis

- `src/modules/team/controller.js` conserva os nós originais `.team-section--vitals` (HP/EXP) e `.team-section--attributes` (Attack/Defense/SpA/SpD/Speed). Um único botão de disclosure com `aria-expanded="true"` ao iniciar e `aria-controls` apontando aos IDs válidos dos dois blocos alterna ambos por classe/atributo próprio do Better UI. Os controles e listeners nativos não são clonados ou recriados.
- O estado de disclosure sobrevive ao `Scene_Team.refresh()` (que recria seções), sem adicionar gerenciador próprio duplicado. Restaura foco do botão somente quando ele era o foco anterior; não toma foco que migrou para outro elemento. IDs dos nós nativos substituídos são liberados ao renovar geração, evitando retenção de DOM antigo. Cleanup remove somente atributos/nós sob ownership Better UI.

### Saved Teams versus Menu Bar

- Um `<details>` Saved Teams aberto permanece **dentro do UIPanel Team nativo**. A janela e seu scroll respeitam a região útil diante de Menu Bar horizontal no topo, rodapé ou posição intermediária, e vertical longa ou curta à esquerda/direita. Atualização responde a open/toggle de Saved Teams, resize, mudanças de layout/orientação/colapso e término de gestos nativos de movimentação (sem segundo `MutationObserver`).
- Quando uma barra vertical deixa largura suficiente, Team reduz/posiciona lateralmente; quando horizontal, escolhe uma região superior/inferior com height/scroll finito. Quando a região sem sobreposição não pode acomodar um painel funcional, Team recebe prioridade de camada visível acima da Menu Bar, nunca oculto atrás dela; sobreposição física pode ser inevitável em viewport inviável.
- Drag do título e resize manual continuam controlados pela implementação nativa: Better UI conserva o retângulo renderizado no pointerdown para evitar salto ao desativar a geometria segura, libera as alterações enquanto a interação ocorre e limita a posição/tamanho ao fim. O `pointerId` original protege contra outros dedos/ponteiros; cancelamento, blur, desmontagem e clique de resize sem movimento restauram os atributos inline/estado manual anteriores. Largura alterada pelo usuário além do padrão de 480px persiste quando cabe na região útil (prova 480→504px em desktop); `requestedTeamWidth()` também lê largura manual já existente **antes da primeira abertura** de Saved Teams (teste 610px).
- **Corretivo de QA P1 (fonte posterior):** o resize nativo também é rastreado quando Saved Teams está **fechado**. Sem movimento, em cancelamento, blur ou desmontagem antes de mudança real, são recuperadas dimensões inline e estado manual preexistentes; uma mudança real mantém a geometria de propriedade do host. A preferência anterior de largura (p.ex. 504px com Saved Teams aberto) é atualizada após novo resize com Saved Teams fechado (p.ex. 610px), para a reabertura não recortar a escolha mais recente. Essas duas falhas foram reproduzidas por regressões que falhavam antes do patch e passaram depois.
- **Segundo re-gate TECH adversarial:** o snapshot do resize sem manager não pode escrever `top/left` quando controla somente `width/height`; o mapa de propriedades congeladas agora corresponde exatamente ao reversível. Um segundo `pointerdown` no título durante resize ativo não descarta o snapshot original antes do término do primeiro `pointerId` (regressões RED 44/46, depois GREEN 46/46). Um **terceiro achado no mesmo ciclo** cobriu a ordem inversa: resize-handle secundário não pode ativar `manual-height` enquanto já existe drag nativo de título por outro ponteiro (regressão RED 46/47, depois GREEN 47/47). Testes incluem Cards, Game, dois sentidos de ponteiros concorrentes, cancelamento e cleanup.

### Team Details nativo sobre Cards

- `TeamScene.js` nativo chama `PI.PokemonCard.open(c)` no penúltimo botão de `.team-actions` (um clique, sem `SceneManager.push`). `PokemonCardHost.js` nativo constrói `body > .pokemon-card-shell > .pokemon-card--pinned` ou sheet móvel; o Map privado da instância não oferece getter puro e `open` retorna boolean.
- `src/modules/card-mode/windows.js` associa um único shell novo ou um único shell anterior elevado de `z-index` ao evento **original** do botão Team Details, à cena/ID selecionado e a `PokemonCardHost.isPinned(id)`. Não chama novamente `pin/open`, não reexecuta clicks, não monkey-patch APIs, rede ou `SceneManager`. A exceção CSS de construção é estrita, temporária e sem marker; só a geração admitida recebe `native-team-details`.
- A ficha nativa conserva o próprio botão fechar, Escape, drawer/ações e vida útil intencionalmente além da cena Team; o marker cai quando host remove/fecha/substitui a geração. Se origem/candidato ficar ambíguo ou Team mudar seleção durante o handler, o fallback imediato é **Game** para não esconder modal nativo nem conceder falso ownership.

## Gate automatizado sobre fonte final

| Gate | Evidência | Resultado |
| --- | --- | --- |
| Suíte integral e build | `npm run validate`, `visual-evidence/team-0210-final-v3-source-validate.log` | **1.109/1.109 PASS**, exit code 0, build integral 0.2.210 com proteção de ambos os sentidos de ponteiros concorrentes |
| Team/Details direcionado | `test/team.test.js`, `test/card-mode-team-details.test.js` | **47/47 PASS**, incluindo teclado/refresh, 25 refreshes sem IDs órfãos, 480→504, abertura 610px antes do Saved, resize fechado no-op/cancel/blur/cleanup preservando top/left em Game, título secundário não descarta resize e handle secundário não assume manual-height no drag, reabertura 504→610, pins, seleção e stopPropagation |
| Chromium global Card Mode | `visual-evidence/phase-po-0210-visual-geometry.json`, `visual-evidence/team-0210-final-v3-main-chromium.log` | **66/66 PASS** (22 interfaces × 1280/390/320), **132 PNG**, bundle `822A86464B303CB2A350BEF6256940CCA0F0EE812007D035D0633853E498548D` |
| Chromium Team adversarial | `visual-evidence/phase-team-0210-geometry.json`, `visual-evidence/team-0210-final-v3-chromium.log` | **48/48 PASS**, **144 PNG**, bundle sintético **`8FE894C91316F3251EB1F9B40078DD4288163DF98A170E04CA04B43D0D61B697`**; first-open 610px, reopen 504→610px e resize fechado no-op também sem escrita residual de top/left nos três viewports |
| Integridade de imagem | `visual-evidence/team-0210-final-v3-asset-integrity.log` | **276/276 PNG** com nomes exclusivos (240 hashes distintos, imagens idênticas esperadas em cenários no-op), SHA-256/bytes/assinatura PNG/IHDR e viewport exatos, zero divergências |
| Git e limites arquiteturais | `git diff --check`; `git status --short src/core/observer.js userscript/release-lock.json` | Limpo na última conferência; HEAD `81816d3`, branch `feat/card-mode-window-overlays-205`, sem operação Git de publicação |

**Build integral local a validar:** `dist/pokepixel-better-ui.user.js`, versão **0.2.210**, **1.884.910 bytes**, SHA-256 **`778CF9F6E550B40038492A753829A4502D41DE31D39374C83ACDD159AC61D5FC`** (recalculado após a proteção de ponteiro inverso). Esse hash substitui os intermediários da mesma versão, inclusive `30B6672F…`, `1833A957…` e `0523FB79…`, e não altera a release aprovada. Os hashes de *bundle* das duas capturas pertencem às entradas **sintéticas** construídas pelos runners, **não** são o SHA do userscript integral. Ambos os runners foram reexecutados sobre a fonte corrigida; a captura principal Card Mode possui bundle idêntico porque não importa o módulo Team.

**Snapshot imutável de handoff local:** `visual-evidence/po-candidate-v0.2.210-778CF9F6.user.js` — cópia integral exata de `dist`, mesmos **1.884.910 bytes** e SHA-256 **`778CF9F6E550B40038492A753829A4502D41DE31D39374C83ACDD159AC61D5FC`**. Identificador “candidate” não significa release/publicação ou aprovação in-game. Snapshot 0.2.209 do PO permanece separado/intacto.

### Pareceres independentes

| Área | Gate | Limite |
| --- | --- | --- |
| TECH | **READY offline — P0=0, P1=0 confirmados** | Re-gate **independente**, estritamente READ-ONLY, de `worker-15` na fonte com SHA integral `778CF9F6…`: cinco problemas corrigidos e ambas as ordens de ponteiro revisadas; 1.109/1.109 no log, 47/47 dirigido, geometria 48/48, sem novo observer/redispatch. **P2:** interação multitouch de host nativo real não substituída por simulação; verificação do PO pendente. |
| UX/A11y e VISUAL | **UX READY / VISUAL READY offline — P0=0, P1=0** | `worker-16` rechecagem independente READ-ONLY **na fonte final**: ambos sentidos dos ponteiros, 48/48/144 com bundle `8FE894C9…`, 66/66/132 no Card Mode, 276 PNG com SHA/tamanho verificáveis; sem novos bloqueadores. **P2 de escopo:** fixture impõe largura 610px a viewport 320/390 com Saved fechado; o estado intermediário é parcialmente recortado antes da expansão programática. A acessibilidade dessa situação artificial no jogo real não foi comprovada; uma vez expandido, Saved é alcançável e respeita a faixa útil nos três tamanhos. |
| PO in-game | **PENDENTE — 0.2.210** | A aprovação 0.2.209 foi preservada; não transferir para o novo build. |

## Riscos e aceite do PO

- **R-01 (lifecycle):** refresh nativo recria stats. Verificação: 25 gerações de refresh, IDs antigos liberados e foco nativo preservado; offline coberto, observar no jogo.
- **R-02 (geometria):** barra móvel/viewport pode retirar a região de 220px/160px necessária ao gerenciador; último controle pode perder hit-test ou ficar sob a barra. Verificação: orientação topo/base/meio/vertical, scroll até último Delete, first-open 610px, reopen após resize e pointer no-op; sintético coberto, cenário in-game pendente.
- **R-03 (proveniência):** shell Details ambíguo pode parecer ligado ao Team sem possuir seu ID. Verificação: múltiplos pins/lookalikes, troca de seleção e fallback Game, abertura teclado e fechamento; sintético coberto, API host real a confirmar pelo PO.
- **R-04 (artefato):** hash antigo da mesma versão induziria validação do código errado. Verificação: bytes/SHA integral e checkpoint Git acima, snapshot 0.2.209 preservado.
- Não existe getter read-only de shell no `PokemonCardHost`; a associação de Details depende da API `isPinned(id)`, da origem exata e da singularidade da geração criada/levantada. Múltiplos portais indistinguíveis não ganham marca; retornam para Game. Mudanças futuras na ordem de `pin` (apêndice/medição/elevação), classes e estruturas do host exigem reauditoria. O CSS construtivo pode exibir brevemente um lookalike completo criado no mesmo gesto, sem lhe conceder ownership.
- O espaço ao redor de uma Menu Bar pode ser fisicamente insuficiente em telas estreitas. Nesse caso a política escolhe a prioridade visual do Team acima dela em vez de esconder o gerenciador. Scroll, acesso ao último Aplicar/Excluir, foco, controles nativos e comportamento após arrastar precisam ser verificados no jogo real.
- Nenhuma transação, Raid, Farm Off, compra, evolução, exclusão ou permissão de servidor foi exercitada; o custo de renderização não tem benchmark quantitativo CPU/GPU/FPS.

### Auditoria PM e decisão

Os AC-01 a AC-04 possuem evidência de fonte/testes e **render Chromium sintético** conforme seu tipo, não inferência visual a partir de código; AC-06 é live-only e ainda não passou. Revisores independentes selecionaram cenários negativos de seleção/ownership, drag/resize e foco; cinco problemas de lifecycle/ownership (incluindo ponteiros em ambas as ordens) motivaram regressões RED e correções GREEN, com captura Chromium atual 48/48. Os pareceres **TECH READY, UX READY e VISUAL READY** foram emitidos de forma independente sobre a **fonte e evidência finais**, sem transferir pareceres de hashes intermediários. O único P2 documentado é limite de prova do layout móvel artificialmente alargado antes de Saved abrir, não um defeito demonstrado in-game. Nenhuma evidência de navegador autenticado, host real não simulado, FPS quantitativo ou transações. A versão 0.2.210 é posterior ao candidato entregue 0.2.209; a release-lock não foi tocada.

**Decisão final de PM:** **PM ACCEPTED OFFLINE — 0.2.210, somente candidato para validação in-game do PO**, com hash integral `778CF9F6…`, **P0=0/P1=0 nos três gates independentes** e P2 delimitado conforme a seção de risco. **NÃO é aprovação do PO**, release nem autorização de operações Git, publicação, compras/gameplay ou deploy. A aprovação 0.2.209 não é transferida ao 0.2.210.

Roteiro do PO: instalar **por decisão própria**, em seu navegador autenticado, apenas o userscript integral com SHA `778CF9F6…`; fazer reload completo para eliminar cache nativo antigo. Em Cards, abrir Team e selecionar Pokémon; verificar stats inicialmente abertos, recolher e reabrir e mudar membro; expandir Saved Teams com vários presets nas posições reais de Menu Bar, navegar até o último Aplicar/Excluir, arrastar/redimensionar Team e Menu Bar, fechar Saved, redimensionar Team de novo e reabrir (largura mais recente deve persistir até o limite do viewport); clicar no handle sem movimento, confirmar que a janela não salta/muda de tamanho; acionar Details por mouse e teclado e conferir que o card nativo aparece acima de Cards e fecha/retorna corretamente. Em mobile estreito, não presumir que o host permita resize arbitrário de 610px: observar alcance do Saved **antes e depois** de expandir, registrar eventual clipping real. Relatar falha com viewport, posição Menu Bar, Cards/Game, foco e screenshot. **Sem autorização do PO, nenhuma mudança Git/release.**
