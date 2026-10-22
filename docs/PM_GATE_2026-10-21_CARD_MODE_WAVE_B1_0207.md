# PM Gate — Card Mode / onda B1 (10 destinos nativos, candidato 0.2.207)

**Estado:** **TECH READY / UX READY / VISUAL READY OFFLINE — NÃO PUBLICAR; PO IN-GAME PENDENTE.** A fase A de oito destinos continua **TECH/UX/VISUAL READY apenas offline**, aguardando aceite in-game do Product Owner. Inventory + Pokémon Profile Better UI continuam com aprovação in-game anterior no 0.2.205. Esta onda B1 não converte aprovação anterior em autorização para release.

## Preservação e identidade

- **Worktree único isolado:** `/pokepixel-better-ui/work/card-mode-window-overlays`; branch `feat/card-mode-window-overlays-205` ainda com mudanças não commitadas de etapas anteriores. Nenhuma operação Git de escrita.
- **Backup integral 0.2.206:** `visual-evidence/phase-a-offline-ready-v0.2.206.user.js`, SHA-256 `ACC664C86BB09BEA6C43113596CF28E1DBE9966A364D6D5A0E89614AB3B04657`; as fontes modificadas da etapa estão em `visual-evidence/phase-a-offline-ready-v0.2.206-source.zip` (27 arquivos), antes das edições de B1.
- **Backup PO-approved anterior:** `visual-evidence/po-approved-v0.2.205.user.js`, SHA-256 `99D001B637B50DDE5F5D2CCC91095914E85FF3D1D7DB5C1B16C07EFF234E5BE8`, preservado.
- **Nova versão de desenvolvimento:** `0.2.207` em `package.json`, lockfile e metadata. `userscript/release-lock.json` permanece `0.2.204`. `src/core/observer.js` não foi alterado.
- **Backup exato desta onda após TECH/UX/VISUAL offline:** `visual-evidence/phase-b1-offline-ready-v0.2.207.user.js` SHA-256 `E1D146E6ADC77852948D0739050012FE85522D61A57D93340139B228B305A0B8` e `visual-evidence/phase-b1-offline-ready-v0.2.207-source.zip` (29 arquivos, SHA-256 `F5069E9DC7249C7946E0EE9FC142F7DCD888E342ABCC56EED894605288C3D845`). Isso é preservação técnica, não publicação nem aprovação live.
- **Limite:** nenhuma instalação, inspeção ou teste no navegador autenticado/Tampermonkey do usuário; nenhuma chamada a API de gameplay/servidor como teste; nenhum commit/merge/push/tag/publicação.

## Auditoria factual da onda B (16/16)

Fontes públicas consultadas: `PersistentHUD.js` (IDs e `scene`, aproximadamente linhas 1242–1296), `plugins.js` (nomes efetivos dos arquivos) e implementações de `Scene_MenuBase`/`PI.UIPanel` abaixo. **Disponibilidade real do botão depende do jogo/servidor e não é inferida da definição de código.**

### B1: dez roots verificados e adicionados em Cards

| ID | Classe nativa | Arquivo público | Seletor do `UIPanel` nativo |
| --- | --- | --- | --- |
| `ranking` | `Scene_Ranking` | `RankingScene.js` | `.pokeidle-panel.game-window.ranking-window` |
| `quests` | `Scene_Quest` | `QuestScene.js` | `.pokeidle-panel.game-window.quest-window` |
| `battle-pass` | `Scene_BattlePass` | `BattlePassScene.js` | `.pokeidle-panel.game-window.battlepass-window.battlepass-window--compact` |
| `daily-gift` | `Scene_DailyLogin` | `DailyLoginScene.js` | `.pokeidle-panel.game-window.daily-login-window` |
| `species-goals` | `Scene_SpeciesGoals` | `SpeciesGoalsScene.js` | `.pokeidle-panel.game-window.species-goals-window.species-goals-window--compact` |
| `event-calendar` | `Scene_EventCalendar` | `EventCalendarScene.js` | `.pokeidle-panel.game-window.npc-shop-window.event-calendar-window` |
| `shiny-captures` | `Scene_ShinyCaptureFeed` | `CaptureAnalyticsScene.js` | `.pokeidle-panel.shiny-capture-feed-panel` |
| `genetic-vault` | `Scene_GeneticVault` | `GeneticVaultScene.js` | `.pokeidle-panel.game-window.genetic-vault-window` |
| `mentorship` | `Scene_Mentorship` | `MentorshipScene.js` | `.pokeidle-panel.game-window.mentorship-window` |
| `streamers-active` | `Scene_PartnerStreams` | `PartnerStreamsScene.js` | `.pokeidle-panel.game-window.partner-streams-window` |

Esses dez scripts montam `UIPanel` síncrono em `create()` e não exibiram `PI.Dialog` próprio, painel filho/portal destacado específico ou transição de cena incompatível no fluxo principal auditado. **É uma elegibilidade estrutural de apresentação, não autorização de usar ações de servidor para teste.** Por exemplo, resgates de Daily Gift/Battle Pass, ações de Mentorship e abertura de streams externos continuam exclusivamente com os handlers e permissões nativas. `PI.Loading` global e conteúdo real exigem confirmação final no jogo; fixtures não substituem fontes de dados autenticadas.

### B2: seis cenas que continuam com Game por segurança

| ID | Classe | Arquivo | Bloqueio para admissão como Cards |
| --- | --- | --- | --- |
| `market` | `Scene_Market` | `MarketScene.js` | Diversos `PI.Dialog.prompt/confirm` e `market-listing-sheet` secundário; compras, vendas e ofertas exigem handle/ações verificados antes de overlay. |
| `professions` | `Scene_Professions` | `ProfessionsScene.js` | `WorkforceManager` embutido funciona no painel, mas `PI.PokemonCard.bindSlot` produz hover/pin global; necessita owner de tooltip coerente com preferência Disable Pokémon hover. |
| `friends` | `Scene_Friends` | `FriendsScene.js` | Confirmação nativa de excluir/bloquear (`PI.Dialog.confirm`) e fluxo social adicional precisam de fallback seguro. |
| `guild` | `Scene_GuildSystem` | `GuildSystemScene.js` | Confirmações de doação/compra e possível `Scene_Merit` empilhada; separar ações e subcenas, sem forçar compras em Cards. |
| `hunt-analyzer` | `Scene_HuntAnalyzer` | `CaptureAnalyticsScene.js` | Reset usa `PI.Dialog.confirm`; mini HUD separado em `body > aside.hunt-analyzer-mini` tem lifecycle próprio. |
| `shared-stones` | `Scene_SharedStones` | `SharedStoneScene.js` | Tooltip destacada no `body`, confirmação de ritual `PI.Dialog.confirm`, cinematics e custos/consumo; evitar admissão presumida. |

Todos os seis também herdam `Scene_MenuBase` e constroem `UIPanel`, mas **o root elegível não prova que seus filhos e transações sejam seguros em Cards**. O atual fallback usa Game antes do handler nativo, sem bloquear a funcionalidade do host nem criar janelas falsas.

**Próxima ordem de integração B2 (não implementada nesta versão):** `professions` (admissão de `PokemonCard` hover/pin com preferência desabilitada), `friends` (dois diálogos exatos), `hunt-analyzer` (reset nativo + mini HUD desacoplado), `guild` (doações, loja e subcena Merit), `shared-stones` (tooltip de handle nativo + confirmações/cinematic), `market` (vários fluxos financeiros, prompts encadeados e mobile sheet). A ordem privilegia mudanças menores e provas de ownership antes dos fluxos financeiros/com custos de gameplay. Nenhuma compra/resgate/caçada real deve ser iniciada para teste.

**Pesquisa complementar para B2:** `ProfessionWorkforceMaps.js` confirma que o WorkforceManager usado em `Scene_Professions` é **inline** (`manager.open({body: mount, el: mount, clearBody})`), mas também contém botão `REMOVER POKÉMON` cuja confirmação usa `PI.Dialog.confirm`; o mesmo plugin permite painel independente `.profession-workforce-window` quando aberto sem host. `ProfessionsScene.js` contém sprites `.prof-stage-worker` vinculados a `PI.PokemonCard.bindSlot`. Logo, a futura B2 precisa admitir hover sob owner exato e mandar confirmação de remover para Game antes do handler, sem abrir uma janela sintética. `FriendsScene.js` coloca `.friends-action-popover` diretamente em `body` por meio de `scene._actionMenu`, com opções remover/bloquear que chamam `PI.Dialog.confirm`, e `Ir até ele` pode executar `reconnect` de servidor; esses três fluxos precisam contrato específico antes da inclusão. Market permanece último pela maior densidade de transações.

## Contrato de implementação B1

- `config.windows.nativeMenusWaveB` declara os dez IDs e seletores exatos, **separado do registro congelado de oito destinos A**. `native-menu-contracts.js`, o CSS construtivo e a validação do dock minimizado usam a união de ambos; nenhuma entrada B2 é autorizada indiretamente.
- O jogo é a autoridade de `SceneManager.push`, `ReactiveWindows.active()`/`cached()`, `UIPanel` e ações. O Card Mode só concede `data-ppbui-card-mode-window="native-<id>"` após identidade de cena, hierarquia `body > overlay > panel > body`, seletor, visibilidade e guards `inert`/ARIA. Cache oculto sozinho não autoriza o root.
- A exceção CSS `is-opening` permite medição síncrona antes do registro da cena, sem criar marcador. O handler original é chamado uma única vez; a verificação ocorre depois dele no próximo task (`setTimeout(0)`), preservando o conserto de Inventory aprovado.
- Cena incompatível/ausente, Trade ativo, botão oculto/desabilitado, dock adulterado, portal estrangeiro e operações sem root verificado devem continuar no fluxo nativo/Game. Atalhos abrem pelo lifecycle da janela, não por clique simulado.
- A camada Better UI não introduz automação de claim/compra/doação, acesso a conta, controle da rede, substituição de listeners, segundo MutationObserver nem patch de `SceneManager`.
- **Correção após TECH QA P1:** `ConnectionOverlay.js` público cria os singletons `body > #pokeidle-loading-overlay.pokeidle-conn-overlay` e `body > #pokeidle-connection-overlay.pokeidle-conn-overlay` **antes** do HUD. Ambos seriam ocultados pela regra Cards para roots globais. O adapter registra identidade do **nó e dos filhos `.pokeidle-spinner` / `.pokeidle-conn-text` existentes no mount**, não admite substitutos, gera os marcadores restritos `native-system-loading` e `native-system-connection`, preserva `style.display=none/flex` e handlers nativos de reconexão, eleva a camada bloqueante acima da toolbar e remove clones do marcador reservado durante a reconciliação central. Sem interceptar `PI.Loading`, WebSocket, estado do servidor ou criar outro observer. Roots ausentes/inacessíveis falham fechados.

## Critérios observáveis e evidência

| AC | Exigência | Evidência local / status |
| --- | --- | --- |
| B1-01 | 10/10 roots com construção mensurável e owner verificado após abertura | JSDOM `test/card-mode-native-menus-wave-b.test.js`; Chromium headless sintético `--wave-b1` |
| B1-02 | Cards/toggle permanecem e renderer principal fica oculto após abrir/fechar/trocar | Testes de clique original, cache/reopen/close e Chrome (sem jogo autenticado) |
| B1-03 | Falhar fechado com cena ausente, cache falso, hidden/inert/ARIA, portal estrangeiro e B2 não admitido | Testes negativos dedicados B1 e suite A preservada |
| B1-04 | Minimização e atalho nativo respeitam instância/cache originais | Testes JSDOM de dock misto, restore e SceneManager.push por atalho |
| B1-05 | Janela e controles acessíveis em desktop/mobile; scroll até último botão | Chromium sintético 1280×900, 390×844, 320×568, screenshots top/last e hit-test de Close/foco; **não prova visual do conteúdo real** |
| B1-06 | Inventory/Profile aprovados e oito roots A não regridem | Suíte integral + prova Chromium A em candidato B1 com artefatos distintos |
| B1-06A | `PI.Loading` e status de desconexão nativos visíveis/interativos quando o host os ativa, sem expor clones | Teste red/green JSDOM + Chromium 320×568 com duas capturas adicionais e clique nativo de reconexão uma vez |
| B1-07 | QA independente TECH/UX/VISUAL do hash final | **TECH READY, UX READY, VISUAL READY (somente offline/sintético)**, com ressalva de clone artificial abaixo |
| B1-08 | Aceite do PO in-game por destino | **Pendente; exclusivamente PO** |

**Resultado final da B1 offline:** `npm run test` **987/987 PASS**; Chromium B1 **30/30** navegações e **30/30** cenários VISUAL PASS sintéticos com **60 PNGs**; `nativeSystemPortals` adicional 320×568 **PASS** com **2 PNGs** de loading/conexão. Regressão específica da fase A no mesmo source B1 **24/24 PASS + Ditto tardio PASS**, 50 PNGs separados. **112/112 PNGs conferidos por SHA e tamanho**, incluindo revisão visual independente. Artefato integral de desenvolvimento `dist/pokepixel-better-ui.user.js` `0.2.207`, SHA-256 **`E1D146E6ADC77852948D0739050012FE85522D61A57D93340139B228B305A0B8`** (não publicado).

**Pareceres independentes do hash exato:**

- **TECH READY / UX READY offline**, P0/P1 = 0 após fix do loading global; revisor executou **10/10 testes B1** e um teste adversarial próprio (sem editar) para clone de marker, troca de spinner original e substituição do nó inteiro — todos rejeitados em reconciliação.
- **VISUAL READY offline** do revisor visual, **112/112 PNGs** conferidos, 54 cases viewport B1+A, dois estados loading/connection legíveis e acima do painel/toolbar, retry nativo testado uma vez; P0/P1/P2 visuais = 0.
- **Ressalva P2 de baixo risco aceita neste gate restrito pelo PM:** `cloneNode(true)` de um root já marcado pode herdar temporariamente o atributo Better UI e ficar visualmente exposto até o frame do reconciler central; o marcador espúrio é retirado e o clone oculto após sync. O host público cria os dois singletons uma vez e não clona esses nós, e não há permissão do usuário para observar/alterar o observer central ou interceptar o host. Não tratar esta ressalva como segurança validada contra plugins DOM adversariais; reabrir se surgir um clone real em produção.
- Layout/conteúdo nativo autenticado, fluxo de dados, ações do servidor, foco/Escape real e seleção Cards após uso prolongado **não** foram comprovados; validação pertence ao PO. Nenhuma publicação, commit ou merge autorizado.

**Objetivo global:** dos 46 destinos definidos no HUD público, 19 `scene` possuem adapters candidatos/aprovados em alguma etapa (Inventory 1, onda A 8, B1 10); ainda restam **18 cenas** (B2 6 e C 12) e **9 ações não-scene** para análise/implementação/classificação completa. Os 19 **não** possuem aprovação in-game coletiva. O usuário não autorizou commit/merge/push/tag/release; o userscript integral, não módulos isolados, será candidato a publicação apenas após o objetivo global e aprovação expressa.
