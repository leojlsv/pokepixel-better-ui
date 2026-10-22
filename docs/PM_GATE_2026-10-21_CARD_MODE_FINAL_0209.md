# PM Gate — Card Mode com janelas nativas / candidato 0.2.209

**Estado:** implementação e testes locais concluídos para inventário público dos 46 destinos; **candidato técnico OFFLINE, NÃO APROVADO IN-GAME e NÃO AUTORIZADO PARA COMMIT/MERGE/RELEASE**. Este gate só vale para o conteúdo atual da worktree `feat/card-mode-window-overlays-205` em `/pokepixel-better-ui/work/card-mode-window-overlays`. A rejeição in-game de `0.2.208` pelo PO continua sendo a referência de falha anterior, não pode ser sobrescrita por resultados sintéticos.

## Autoridade e política

Pedido do PO: janelas e menus compatíveis devem aparecer **acima de Cards** sem derrubar automaticamente a seleção, mantendo renderer do mapa oculto; handlers, permissões, eventos, cache, diálogo, teclado e decisões funcionais continuam exclusivos do jogo. Explicitamente **Game-only**: Gyms (`Scene_Gym`, City), Hallowen 2026 (`halloween`), Defense Arena (`arena-defense`), Pokepixel Tactics (`tactics`), Tournaments (`tournaments`) e Ranked PvP (`arena-pvp`). Essas seis exceções nunca entram em allowlists Cards. Não alterar rede, `SceneManager`, `src/core/observer.js`, eventos de gameplay nem instâncias autenticadas.

**Feedback live do PO que motivou 0.2.209:** Shared Stone, Promotion, Mark's Shop, Market, Professions, Geneticista, Nature, Evolution Center, Expeditions, Guild, Mini View e “Shop” deveriam manter Cards; Saved Teams sumia em Team; Auto Helper e Farm Off ficavam abaixo de Cards. O candidato implementa esses contratos com `Scene_MenuBase`/`UIPanel` e/ou controlador nativo exato. **“Shop” = `premium` (`Scene_PremiumShop`), Mark's Shop = `npc-shop` (`PI.NPC.openShop`), Guild = `Scene_Guild` e não `Scene_GuildSystem`.** Mini View é popup independente, sem overlay sintético ou troca artificial de modo; frames/FPS do popup com renderer oculto permanecem sem prova in-game.

## Classificação completa do PersistentHUD público

O `PersistentHUD.js` público expõe **37 cenas + 9 ações = 46 destinos**, com quatro cenas Game-only. Mais City Gyms (Game-only) e os três serviços City (`geneticist`, `nature`, `evolution-center`, com `NPC.panel` próprio), que ficam fora dos 46.

| Grupo | Quantidade | IDs | Política |
| --- | ---: | --- | --- |
| Inventory | 1 | `inventory` | Cards, PO aprovado somente na etapa 0.2.205 |
| A | 8 | `hunts`, `team`, `storage`, `settings`, `private-message`, `profile`, `encyclopedia`, `capture-records` | Cards, sem homologação in-game da onda |
| B1 | 10 | `ranking`, `quests`, `battle-pass`, `daily-gift`, `species-goals`, `event-calendar`, `shiny-captures`, `genetic-vault`, `mentorship`, `streamers-active` | Cards, sem homologação in-game da onda |
| B2 | 8 | `professions`, `friends`, `hunt-analyzer`, `market`, `guild`, `promotion`, `shared-stones`, `premium` | Cards para raiz nativa; ações sensíveis usam fallback pré-handler ou guarda de portal |
| B3 | 6 | `gacha`, `beta-goals`, `rampage`, `world-boss-live-raid`, `player-migration`, `game-admin` | Cards para painel/lobby; Game ao iniciar batalha, checkout, submit/claim ou moderação sensível |
| Cenas excluídas | 4 | `arena-pvp`, `arena-defense`, `tactics`, `tournaments` | Game explícito do PO |
| Ações com painel | 5 | `npc-shop`, `expedition`, `active-events`, `auto-helper`, `offline-farm` | Painel nativo em Cards; flow Farm Off/logout e confirmações mantêm controle nativo |
| Ação popup | 1 | `mini-view` | Cards permanece selecionado; janela própria do navegador |
| Ações externas | 2 | `discord`, `streamer-referral` | Handler/`window.open` nativo, sem mudança artificial de Cards |
| Ação excluída | 1 | `halloween` | Game explícito do PO |

Somatório: **33 cenas Cards + 4 cenas Game + 5 painéis-action Cards + 1 popup + 2 links + 1 ação Game = 46**. Isso é classificação de destino/raiz, **não** autorização implícita para confirmar compra, excluir, fazer claim, trocar mapa, enviar formulários ou executar ações administrativas em Cards.

## Contratos de segurança funcionais

- **Ownership estrito:** somente cena atual oficial `Scene_MenuBase` + identidade `ReactiveWindows.active()` + `UIPanel` exato na hierarquia `body > overlay > panel > body`, ou handle público do controlador (`NPC.panel`, `ExpeditionWindow.current().panel`), com guards `hidden`, `inert`, ARIA, cache e cleanup. AutoHelper/OfflineFarm, com painel em closure privada, exigem `controller.isOpen()` e **única** raiz nativa estrutural; clones e ambiguidade falham fechados. Nenhuma duplicação de click/listener nem `cloneNode()` funcional.
- **Construção 0×0:** shells `is-opening` têm CSS de medição antes do registro nativo, porém só recebem marcador Cards após verificação do owner. A ordem de `pointer`/microtask já corrigida no Inventory é preservada.
- **`PI.Dialog`, `PI.UIForm`, mobile sheets:** `PI.Dialog` sem handle de origem não ganha ownership por semelhança ou janela temporal. Ações auditadas de Market, NPC/City, Guild/Promotion, Premium, Expeditions, Team, Storage, Settings, Offline Farm e B3 revelam Game **antes** do handler nativo quando exigem portal sem proveniência; inclusive submit de form por Enter e Market listing sheet pelo handle real. Convites globais Guild e portais PIX/Founder surgidos assincronamente provocam fallback Game na reconciliação, sem fabricar um modal. Reentrada em Cards enquanto a confirmação nativa está visível é negada. Uma exceção CSS restrita ao `PI.Dialog` **completo**, direto no body, `:only-child` e sem ocultação, `inert`, ARIA ou `style` inline, garante visibilidade imediata em Cards quando o callback de Market/Founder termina depois de reentrada manual; o observer já existente retorna para Game no RAF. Não concede marker/propriedade. **P2 aceito:** lookalike estruturalmente completo sem `style` pode aparecer por um instante antes do fallback, ainda sem ownership; mudanças futuras no DOM do host exigem revalidação.
- **Combat/Game:** `PokeIdle.WorldBossLiveRaid.active` e `PokeIdle.WorldBossMap.state` são autoridade para sair de Cards quando raid/Rampage ativam mapas automaticamente por WebSocket/poll, mesmo quando `SceneManager._scene` continua `Scene_Map`; enquanto o runtime segue ativo, reentrada em Cards é recusada. Após cleanup nativo, Cards volta a ser selecionável. GameAdmin tem primeira abertura lazy pelo `PersistentHUD.loadAdminScene`, sem fallback Game por classe ainda ausente nem reexecução artificial do clique.
- **Saved Teams:** módulo continua montado durante a janela Team admitida em Cards, reaproveita storage session-only por owner, preserva a instância interativa dentro do painel através de `clearBody`/`appendChild` nativos, sem criar um segundo gerenciador. Em 320 px o cabeçalho quebra linhas e mantém o botão Excluir inteiro e clicável. Operações A→B, erro de armazenamento e Web Locks continuam sendo governadas pelo storage existente.
- **Auto Helper/Farm Off:** root original aparece acima de Cards; `Minimize`/`Restore` preservam botão nativo único e focus retorna ao Restore após marcador verificado somente quando estava no proprietário que foi ocultado — se o usuário moveu foco, ele é mantido. Fluxo Farm Off pode desconectar WebSocket e sair para Login exclusivamente pelo host.
- **Performance:** ocultar o renderer pode reduzir trabalho gráfico; **não foi realizado benchmark quantitativo de CPU, GPU, FPS, WebSocket ou simulação**. Não declarar ganho medido.

## Evidência validada (somente offline / sintética)

| Gate | Evidência | Resultado |
| --- | --- | --- |
| Suíte integral e build | `npm run validate`; `visual-evidence/po-live-0209-postqa-source-frozen-validate.log` | **1081/1081 PASS**, build integral 0.2.209. Uma execução anterior falhou intermitentemente no limite fixo de 60 ms de um teste Inventory; isolado 3 × 40/40 e novo integral verde |
| 37 cenas / B3 | `test/card-mode-native-menus-wave-b3.test.js` | **15/15 PASS** no subgate final, incluindo lazy GameAdmin, raid/Rampage sem click, Founder PIX e submit de migração |
| B2/NPC/action regressions | `test/card-mode-native-menus-wave-b2.test.js`, `test/card-mode-po-live-feedback.test.js` | Pré-handler exato, owner mobile, teclado, focus dock, cópia/clones e ações inativas cobertos pela suíte integral |
| Chromium — rotas | `visual-evidence/phase-po-0209-visual-geometry.json` | **66/66 PASS** (22 rotas × 1280/390/320), 132 PNG; bundle sintético SHA-256 `D23E61AE93E64465641D4E338B280A84E854D91DA863D8353E5A47354F1C185E` |
| Chromium — críticos | `visual-evidence/phase-po-critical-0209-geometry.json` | **18/18 PASS** (Team/Saved Teams ×5 com scroll/foco, último Excluir inteiro e hit-test em 320, Auto Helper, Farm Off, Team+Action, além de diálogos tardios Market/Founder e casos negativos, nos 3 viewports), 45 PNG; bundle sintético SHA-256 `27FA69BE6EDA6B0E95776A95062AD066F62464087A550A9945367E5D59791BA1` |
| Integridade das capturas | `visual-evidence/phase-po-0209-final-asset-integrity-postqa.log` | **177/177 PNG** únicos, hashes SHA-256, bytes e IHDR de resolução exata; zero divergência |

O host Chromium é HTML local sintético. A suíte JSDOM e as capturas não têm acesso a estado, pagamentos, inventário, quests, server auth, login, raid real, Tampermonkey nem APIs do jogo. A prova visual da janela Mini View renderizando frames em Cards permanece **pendente de teste exclusivo do PO**. O teste sintético principal usa acionamento programático e conteúdo placeholder; não atesta sucesso de gameplay, permissões ou fluxos de servidor.

**QA independente, apenas offline, sobre a fonte corretiva:** TECH READY (worker-13, P0=0/P1=0, P2=1 do lookalike completo de `PI.Dialog`); UX/A11y READY (worker-14, P0=0/P1=0, mesmo P2 conhecido); VISUAL READY (worker-5, P0=0/P1=0/P2 visual=0). O reviewer visual conferiu **177/177 PNG** das duas capturas finais por SHA/bytes/IHDR, incluindo quinto Excluir em 320 px, Restore e o modal sintético assíncrono. **PO in-game: PENDENTE** para 0.2.209. Nenhum QA automatizado substitui essa autoridade.

## Artefato e preservação de release

- Userscript integral de desenvolvimento: `dist/pokepixel-better-ui.user.js` — versão `0.2.209`, **1.853.640 bytes**, SHA-256 **`2110A9032B9B4A26EF3F702EE271D0FE96949743580FE7842E0ABF9152604549`**. O artefato integra o Better UI completo, não módulos avulsos.
- `userscript/release-lock.json`: **0.2.204**, SHA aprovado **`384DDCCD9C6537C09CD15F3D47D5C802753DFF13C5C0DAD105F412681B5AD6E4`** (conferido na fonte); **não foi modificado** nesta task.
- Backups/versionamentos anteriores permanecem em `visual-evidence/`, incluindo `po-approved-v0.2.205.user.js`, `phase-a-offline-ready-v0.2.206.user.js`, `phase-b1-offline-ready-v0.2.207.user.js` e `po-live-failed-v0.2.208.user.js`.
- A worktree permanece **dirty**; item preexistente `?? 1100` preservado. Sem commit, merge, push, tag, instalação, deploy ou release. `src/core/observer.js` não foi modificado. `git diff --check` sem erros no último gate.

## Gate de produto pendente — responsabilidade do PO

1. Instalar **somente se quiser validar o candidato**, no próprio Tampermonkey/navegador autenticado, com reload completo para limpar caches nativos anteriores. Verificar SHA integral antes da troca e manter o antigo aprovado para rollback.
2. Abrir Cards e retestar os 12 destinos citados no feedback live; conferir que toggle continua Cards, renderer fica oculto, janela nativa sobreposta e fechar/minimizar/reabrir não derruba Cards. Mini View requer verificação própria de conteúdo/frames do popup.
3. Dentro de Team, abrir Saved Teams (mais de uma formação), editar/aplicar/remover com confirmação nativa e fechar/reabrir; conferir owner/account isolation e session-only quando armazenamento/locks estiverem indisponíveis.
4. Abrir Auto Helper e Farm Off, confirmar layer, foco de teclado e minimizar/restaurar. **Não executar início real de Farm Off ou compras para testar a camada sem intenção consciente**; se executar, deixar o jogo conduzir desconexão e Login.
5. Confirmar que **somente** Gyms, Hallowen 2026, Defense Arena, Pokepixel Tactics, Tournaments e Ranked PvP podem revelar Game imediatamente; que B3 lobbies abrem em Cards e entradas reais em combate permanecem em Game. O PO é autoridade exclusiva para validar operações de servidor/raids/checkout.

**Decisão de release:** **BLOQUEADA** até aprovação in-game expressa do PO e autorização específica de ação Git/release. Se houver falha live, a evidência do PO prevalece sobre este gate offline e reabre TECH/UX/VISUAL conforme necessário.
