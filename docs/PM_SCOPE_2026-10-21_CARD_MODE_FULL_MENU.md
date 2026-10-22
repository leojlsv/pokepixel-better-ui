# PM Scope — Card Mode com janelas e menus nativos (objetivo completo)

**Atualização de encerramento — 2026-10-22T14:37:18Z:** o PO confirmou **“Validado. All green.”** para o pacote Better UI integral **0.2.213**, SHA-256 **`5C1CA1276AEF27E3A3422AB678380DF6CC90687609E6CFC2D19094A7C3A3CD0A`**, e autorizou **commit, push, merge, deploy e release**. O catálogo de 46 destinos e as seis exceções Game-only continuam sendo o contrato funcional; não afirmar que cada rota foi individualmente exercitada em jogo só pelo aceite global. Este aceite encerra o bloqueio de publicação abaixo, que permanece como histórico da etapa anterior.

**Estado em 2026-10-21:** **OBJETIVO GLOBAL ABERTO — NÃO LIBERAR PUBLICAÇÃO.** A primeira etapa com **Inventory + Pokémon Profile** está aprovada in-game pelo Product Owner, mas isso **não** encerra o pedido de abrir janelas e menus compatíveis sobre Cards sem retornar automaticamente a Game.

## Autoridade e definição de pronto

- **Pedido original do PO:** abrir as janelas e menus sobre Cards, conservar a escolha Cards, os Cards interativos e o renderer principal oculto, sem trocar manualmente para Game.
- **Aprovação parcial existente:** Pokémon Profile (interface Better UI, distinta do destino nativo `profile`) e Inventory (destino nativo `inventory`), no candidato 0.2.205, SHA-256 `99D001B637B50DDE5F5D2CCC91095914E85FF3D1D7DB5C1B16C07EFF234E5BE8`. O feedback in-game é do PO. Essa aprovação **não valida os destinos restantes**.
- **Definição de conclusão global:** todos os destinos presentes e disponíveis no host precisam de **classificação explícita**: (A) janela/portal que abre sobre Cards e retorna ao mesmo modo após fechar; (B) ação sem janela que mantém seu handler/estado nativo e não troca de modo desnecessariamente; ou (C) navegação de cena incompatível cuja transição para Game é necessária e registrada. Nenhum destino pode cair em categoria por aproximação de nome ou apenas porque consta em uma lista.
- **Release:** não é um pacote só de dois módulos; quando houver aprovação integral, a publicação (se autorizada) seria do **userscript Better UI completo**, com funções já existentes e novas compatibilidades. Não executar commit, merge, push, tag, publicação nem alterar `userscript/release-lock.json` antes do gate apropriado.

## Inventário factual das ações do host

Fonte estática consultada em 2026-10-21: `https://pokepixel.nietore.com/play/js/plugins/PersistentHUD.js`, função `toolbarItems()` (~1235–1300), e `NonBlockingWindows.js` (~17–20, 109–165, 200–207). **O host público atual define 46 destinos (37 com `scene`, 9 com `action`)**. A documentação antiga `docs/modules/menu-bar-plan.md` registra 33 e é uma fotografia histórica, não um catálogo exaustivo para esta integração. Definição no JS não comprova visibilidade/permissão/instalação de cada destino no jogo autenticado.

O contrato público de `NonBlockingWindows.js` desvia `SceneManager.push(SceneClass)` para uma janela não bloqueante **somente** se a cena for uma subclasse de `Scene_MenuBase` e se a cena atual for `Scene_Map` ou já existir uma janela na pilha nativa. Assim, **`scene` no catálogo não basta para garantir que o destino possa sobrepor Cards**. A validação de cena, painel `UIPanel`, overlay, cache, foco e ações internas será individual.

### Cobertura por ondas (37 destinos com cena)

| Onda | Destinos nativos `id` | Quantidade | Estado |
| --- | --- | ---: | --- |
| Já aprovado | `inventory` | 1 | **PO PASS**, etapa 1 |
| A — uso frequente e interface central | `hunts`, `team`, `storage`, `settings`, `private-message`, `profile`, `encyclopedia`, `capture-records` | 8 | **Implementação candidata 0.2.206, offline testada; sem aceite in-game do PO**; `profile` é Trainer Profile nativo. Confirmações `PI.Dialog` sem owner usam fallback Game. |
| B — consultas, progresso e serviços | `market`, `professions`, `friends`, `ranking`, `guild`, `quests`, `battle-pass`, `daily-gift`, `species-goals`, `event-calendar`, `hunt-analyzer`, `shiny-captures`, `shared-stones`, `genetic-vault`, `mentorship`, `streamers-active` | 16 | **B1 dez adapters 0.2.207 offline; B2 seis candidatos 0.2.209 após rejeição in-game do fallback Game.** Confirmações sem provenance usam Game antes do handler; aceite PO pendente. |
| C — combate, efeitos sensíveis e direitos especiais | `premium`, `gacha`, `beta-goals`, `promotion`, `arena-pvp`, `arena-defense`, `tactics`, `tournaments`, `rampage`, `world-boss-live-raid`, `player-migration`, `game-admin` | 12 | **`premium`/Shop e `promotion` B2 + `gacha`, `beta-goals`, `rampage`, `world-boss-live-raid`, `player-migration`, `game-admin` B3 possuem UIPanels sobre Cards candidatos 0.2.209; os quatro PvP/Tactics/Tournaments são Game-only por decisão do PO.** Os botões de entrar em mapas e iniciar pagamentos/ações sensíveis revelam Game antes dos handlers nativos; nenhum ingresso, compra, resgate ou moderação foi executado pelos agentes. |

As ondas indicam **ordem de investigação, não autorização antecipada nem prova de compatibilidade**. Mesmo na onda A, `hunts` pode alterar a atividade atual e precisa de checagem especial. O atalho nativo `profile` (Trainer Profile) não é o `pokemon-profile` Better UI já aceito. **A fase A 0.2.206 foi preservada como artefato/source independente antes de implementar a B1; TECH/UX/VISUAL READY offline da fase A não constitui aceitação in-game do PO.**

**Classificação estrutural atual (37 cenas):** 1 `inventory` PO aprovado + 8 A + 10 B1 + 8 B2 (incluindo `premium` e `promotion`) + 6 B3 = **33 candidatos Cards**; quatro cenas (`arena-pvp`, `arena-defense`, `tactics`, `tournaments`) são Game-only por exclusão expressa. As outras duas exclusões do PO são `halloween` (uma das nove ações) e City `gyms` (fora das 46). As 33 candidatas são classificadas **por abertura da janela**, não significam aprovação de cada ação interna nem liberação em conta real. O registro B3 cobre apenas cenas públicas que herdam `Scene_MenuBase` e expõem seu `UIPanel` exato; `rampage` e `world-boss-live-raid` precisam de Game ao entrar na arena/instância, não ao consultar o lobby.

### Nove destinos nativos que usam `action`, não `scene`

| Contrato observado no `PersistentHUD.toggleItem` | IDs | Quantidade | Encaminhamento de revisão |
| --- | --- | ---: | --- |
| Controladores de painéis DOM | `npc-shop` → `PI.NPC.openShop()`; `expedition` → `PI.ExpeditionWindow.open()`; `active-events` → `PI.EventTicker.open()`; `halloween` → `PI.Halloween.open()` | 4 | Os três primeiros têm admissão restrita de painel em Cards 0.2.209; **Halloween 2026 é exceção Game expressa**. |
| Alternância/comportamento especial | `auto-helper` → `PI.AutoHelper.toggle()`; `offline-farm` → `PI.OfflineFarm.toggle()`; `mini-view` → `PI.MiniView.toggle()` | 3 | Auto Helper e Farm Off admitem exatamente seu painel nativo acima de Cards; minimização/Restore preservam o botão nativo e foco recuperado quando seu proprietário tinha foco. Mini View abre janela separada preservando Cards, mas imagens/FPS dela não foram validados in-game. |
| Navegação externa | `discord` → `window.open(linkURL)`; `streamer-referral` → `window.open('/parceiros/')` | 2 | Preservar comportamento externo, sem janela interna inventada nem Game desnecessário |

### Superfícies extras do Better UI e ações contextuais

- **`pokemon-profile` Better UI:** aprovado in-game na etapa 1; não confundir com `profile` nativo.
- **Menu Bar, grupos e editor de layout:** já têm contratos de apresentação em Cards. Evitar regressões de nós movidos, listeners, badges, atalho e preferências.
- **Ações adicionais de City (`geneticist`, `nature`, `evolution-center`):** acessam `PokeIdle.NPC.open()` com classes de serviços nativos; investigar como portais DOM específicos, não liberar indiscriminadamente.
- **City `gyms`** utiliza `SceneManager.push(Scene_Gym)` e é **Game-only por exclusão explícita do PO**; City `geneticist`, `nature`, `evolution-center` têm apresentação nativa candidata em Cards 0.2.209. **Return to City** mantém transição para Game por modificar contexto de gameplay.
- **Capture/Revive/Hunt controls:** comandos de gameplay, não janelas genéricas. Nenhum replay do clique, disparo de combate ou automação automática será introduzido.

## Gates obrigatórios por destino e por onda

1. **Audit/Spec:** inspecionar scripts públicos atuais da cena/ação, protótipo `Scene_MenuBase`, contrato `SceneManager`, overlay `UIPanel`, construção síncrona, root CSS, `ReactiveWindows.active/cached`, minimização, `hidden`/`inert`, foco/Escape, atalhos e permissões.
2. **Implementação restrita:** usar registro explícito de adapters por destino em Card Mode; marcar o **nó comprovadamente ativo** e abrir somente pelo handler original. Se `UIPanel` requer medição antes do registro da cena, permitir apenas o shell de construção com seletor específico do destino — nunca wildcard `.pokeidle-panel-overlay`. Não clonar listeners, não monkey-patch `SceneManager` ou rede, não criar outro `MutationObserver`. Reutilizar o reconciler central **sem alterar `src/core/observer.js`**.
3. **Testes negativos:** rota incompatível, cena ausente, handler recusado, Trade ativo, destino oculto/disabled, cache fechado, reentrada, janela minimizada, dois overlays na stack, teardown, click/microtask reais, atalho nativo e focus/ARIA. Caso de troca de mapa/transação nunca deve ser tratado como janela por aparência.
4. **Gates independentes:** TECH QA, UX/A11y QA, Visual QA com screenshots Chromium sintéticos nas larguras 1280/390/320 quando houver UI visível; testes JSDOM não substituem screenshot e Chromium isolado não substitui jogo.
5. **PO in-game:** só o Product Owner instala/testa no navegador autenticado. Cada onda recebe status de validação separado. **Sem aceite global do produto ou liberação de release** antes da matriz de destinos integral, exceções de Game documentadas, suíte/build exatos e decisão final explícita.

**Limites mantidos:** não presumir queda quantitativa de CPU/GPU/FPS; não controlar Tampermonkey ou navegador autenticado; não mudar menus externos, permissões servidor ou estado de caçada para demonstrar compatibilidade.
