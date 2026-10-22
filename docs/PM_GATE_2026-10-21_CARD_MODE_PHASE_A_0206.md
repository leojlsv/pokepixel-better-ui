# PM Gate — Card Mode / oito destinos nativos (fase A, candidato 0.2.206)

**Estado:** **CANDIDATO OFFLINE 0.2.206 — TECH READY, UX READY, VISUAL READY (escopo sintético); PO IN-GAME PENDENTE; NÃO PUBLICAR**. Etapa 1 (Inventory + Pokémon Profile Better UI) permanece **PO ACCEPTED** no build anterior 0.2.205. Esta fase amplia o mesmo projeto, não substitui o Better UI inteiro nem encerra o objetivo global de menus/janelas sobre Cards.

## Identidade, preservação e limites

- **Worktree:** `/pokepixel-better-ui/work/card-mode-window-overlays`, branch `feat/card-mode-window-overlays-205` ainda isolada e sem commit.
- **Desenvolvimento atual:** versão **0.2.206** no `package.json`, `package-lock.json` e metadata do userscript; não confundir com o 0.2.205 aprovado.
- **Artefato anterior preservado:** `visual-evidence/po-approved-v0.2.205.user.js`, SHA-256 `99D001B637B50DDE5F5D2CCC91095914E85FF3D1D7DB5C1B16C07EFF234E5BE8`, conforme validação local do build entregue ao PO; nenhum upload/publicação.
- **Release-lock:** manter `userscript/release-lock.json` na release 0.2.204 até um novo processo autorizado. `src/core/observer.js` continua intocado.
- **Limite in-game:** nenhum agente pode acessar, instalar, controlar ou validar Tampermonkey/navegador do jogo autenticado. QA local, JS público e Chromium sintético **não** substituem o PO.

## Contratos verificados em fontes públicas (2026-10-21)

`PersistentHUD.js` define o ID/scene de cada destino, `NonBlockingWindows.js` somente intercepta `SceneManager.push` quando a cena deriva de `Scene_MenuBase` e há mapa/overlay elegível; `UIPanel.js` cria um overlay em `body` antes do registro no stack e mede a geometria ainda com `is-opening`. **Todos os oito destinos abaixo satisfazem esse contrato estático; não implica garantia de comportamento no jogo autenticado.**

| ID do menu | Script público e Scene | Classe do painel nativo (exata) | Estado |
| --- | --- | --- | --- |
| `hunts` | `HuntSelectionScene.js` / `Scene_HuntSelection` | `.pokeidle-panel.game-window.hunt-window.hunt-world-window` | Root implementado; teste de navegação Hunt real pendente PO |
| `team` | `TeamScene.js` / `Scene_Team` | `.pokeidle-panel.pokeidle-team-panel` | Root, Equip Picker e Moveset sobre Cards; **Ditto privado usa Game** por abertura assíncrona sem handle; reteste PO pendente |
| `storage` | `CreatureStorageScene.js` / `Scene_CreatureStorage` | `.pokeidle-panel.game-window.storage-window` | Root/card; confirmação nativa em `PI.Dialog` utiliza Game antes do handler; reteste PO pendente |
| `settings` | `OnlineSettingsScene.js` / `Scene_OnlineSettings` | `.pokeidle-panel.game-window.settings-window` | Root em Cards; prompts/confirm nativos usam Game, incluindo intervalos assíncronos; logout revela cena de login |
| `private-message` | `MailboxScene.js` / `Scene_Mailbox` | `.pokeidle-panel.game-window.mailbox-window` | Root em Cards; exclusão com recompensas pendentes usa confirmação nativa em Game |
| `profile` | `TrainerProfileScene.js` / `Scene_TrainerProfile` | `.pokeidle-panel.game-window.trainer-profile-window` | **Trainer Profile nativo**, diferente do `pokemon-profile` Better UI já aprovado |
| `encyclopedia` | `EncyclopediaScene.js` / `Scene_Encyclopedia` | `.pokeidle-panel.pokeidle-pokedex` | Root e refresh/cache nativos, sem child modal especial encontrado |
| `capture-records` | `CaptureAnalyticsScene.js` / `Scene_CaptureRecords` | `.pokeidle-panel.capture-records-panel` | Root em Cards; reset do registro pede confirmação em Game; cache do host sem `onReactiveOpen` (limitação upstream) |

## Implementação 0.2.206 em revisão

- `src/modules/card-mode/config.js`: oito contracts estáticos de `scene`/panel; exceções para filhos específicos, sem wildcard de modais.
- `src/modules/card-mode/native-menu-contracts.js`: exige `Scene.prototype instanceof Scene_MenuBase`, `ReactiveWindows.active()` exato, nó `body > overlay > panel > body`, visibilidade/ARIA/inert, e reconhece apenas janela comprovadamente ativa. Não trata `cached()` como autorização de exibição.
- `src/modules/card-mode/index.js`: preserva Cards durante o único clique original, verifica o resultado **após** o listener nativo (próximo task), aplica CSS construtivo apenas aos shells `is-opening` conhecidos, oculta renderer e mantém fallback Game para rota incompatível/sem retorno seguro. Sem monkey patch de rede, `SceneManager` ou clique redispatchado.
- `src/modules/card-mode/windows.js`: ativa o overlay exato por cena, libera/limpa child handles específicos (Team equip picker, Hunts mobile zone sheet), associa **Moveset síncrono privado** apenas ao gesto nativo fresco e candidato único, preserva tooltips/hover posicionados sincronicamente e rejeita reuso de portal. **Não concede ownership a `PI.Dialog` genérico nem ao formulário assíncrono Ditto de Team por timing/DOM:** ações auditadas ativam Game antes do handler original; Settings usa `disabled` do controle para preservar Game durante prompts assíncronos **mesmo após minimizar, trocar de cena ou substituir seu DOM**, até `finally` ou teardown. O botão `.team-ditto-transform` entra em Game antes da busca nativa `Api.getDittoForms()`; uma exceção CSS **somente `is-opening`** evita 0×0 se um request tardio construir Ditto após o usuário voltar a Cards, e o reconciler volta a Game sem conceder ownership ao modal privado. `index.js` bloqueia nova entrada em Cards sobre Ditto nativo ainda visível e enquanto Login ou outra cena não-Map estiver ativa/pendente. Filhos órfãos Team/Hunts usam native close verificado ou fallback Game. O clamp mobile ocorre depois do marcador verificado e preserva geometria alterada por drag do usuário.
- `src/modules/{team,hunts,storage}`: Better UI enhancements continuam montados em Cards **somente** quando seus próprios root/scene/overlay já foram autorizados e estão visíveis; retidos/cached ocultos não devem executar reconciliação pesada.
- **Minimização:** dock de restauração nativo liberado apenas quando cada botão é a instância exata de `_minimizedButton` de uma cena verificada no cache; dock misto com botão estrangeiro falha fechado.

## Critérios e evidências

| Aceite por fase A | Exigência | Status |
| --- | --- | --- |
| AC-A-01 — abertura/fechamento | Cena correta, handler original uma vez, Cards preservado e renderer oculto | Testes Node e Chrome sintéticos PASS; PO pendente |
| AC-A-02 — construção sem 0×0 | Layout calculável antes do registro no stack, sem marcador de ownership forjado | Chromium headless; PO pendente |
| AC-A-03 — cache, Scene stack, dock | Esconder cenas anteriores, reabrir mesma instância, restaurar apenas dock nativo exato | JSDOM PASS; PO pendente |
| AC-A-04 — portais | Team Equip Picker/Moveset, Hunts sheet/drop-tooltip, PokemonCard hover/pin sobre Cards; `PI.Dialog` genérico e **Ditto Team assíncrono** devem usar Game antes do handler (sem handle nativo de autoria) | JSDOM sintético PASS; fluxo nativo não executado pelo agente, PO pendente |
| AC-A-05 — falha fechada | Cena incompatível/Trade, pane inválido, disabled, hidden/inert/ARIA, portal reutilizado, filho órfão | JSDOM PASS; PO pendente |
| AC-A-06 — Better UI modular | Inventory/Profile aprovados não regredidos; Hunts Atlas/Favorites, Team e Storage só montam com owner visível | Suíte de regressão; PO pendente |
| AC-A-07 — mobile, foco, acessibilidade | 1280×900 / 390×844 / 320×568; hit test, controle final, toolbar/inset, modal/Escape | Chromium offline 24/24 visual de roots PASS (48 PNGs) + Ditto tardio sintético 320×568 PASS (2 PNGs); **VISUAL READY independente para fixture**, PO live pendente |
| AC-A-08 — autorização final | Teste e decisão explícita do PO em jogo autenticado, sem inferência a partir de fixtures | **PENDING** |

## Evidência exata do candidato offline

- `npm run test`: **977/977 PASS**, arquivo `visual-evidence/full-test-0.2.206.log`.
- `npm run build` e `git diff --check`: **PASS**.
- `dist/pokepixel-better-ui.user.js` v0.2.206, SHA-256 **`ACC664C86BB09BEA6C43113596CF28E1DBE9966A364D6D5A0E89614AB3B04657`** (artefato de desenvolvimento, **não publicado**).
- `visual-evidence/probe-phase-a-native-click.mjs`: Chromium headless com fonte Better UI bundlada e host **sintético**, 24/24 aberturas/fechamentos PASS e **24/24 VISUAL PASS** (8 destinos × 3 viewports; `phase-a-visual-geometry.json` + 48 PNGs top/last). **Caso extra de Ditto assíncrono PASS:** 320×568, Game antes do handler, usuário volta a Cards e muda para Storage enquanto API hipotética espera, formulário ainda mede 290×330 durante `is-opening`, Game volta sem owner forjado; reentrada enquanto modal visível bloqueada, duas capturas `phase-a-visual-320x568-ditto-{opening,game}.png`. O P1 da toolbar cobrindo Close em 320×568 foi reproduzido, corrigido e retestado. Todas essas medições são **fixtures**, não host autenticado.
- Testes red/green dedicados: clamp mobile na **mesma** reconciliação; bloqueio de reentrada em Cards durante `PI.Dialog` visível e entre prompts Settings enquanto controle nativo desabilitado; P1 Login não-Map com toolbar retida e Settings pendente após minimizar/trocar cena; P1 Ditto após API demorada e reentrada prematura em Cards, sem ownership de portal por timeout, todos corrigidos offline.
- **Parecer independente final (leitura apenas da fonte exata):** `TECH READY`, `UX READY` e `VISUAL READY` **apenas para o escopo offline/sintético**, sem P0/P1/P2 verificado. Revisão confirmou SHA do build e bundle do Chromium, executou **71/71 testes focados independentemente**, verificou integridade/dimensões de **50/50 PNGs** e ensaiou casos negativos adicionais de Ditto falso/cacheado/oculto/`inert`/`aria-hidden`/semelhante a Inventory, sem concessão falsa de ownership. Os 8 roots 320×568 foram inspecionados top+last, com amostras 390/1280 e as 2 capturas Ditto. Revisores não alteraram source, Git, navegador do jogo ou serviços.
- Este resultado independente **não** equivale a aprovação em jogo autenticado do PO, nem a TECH/UX/VISUAL do escopo global de 46 destinos; a captura construtiva de Ditto é sintética, e foco/Escape no host real continuam sujeitos a validação do usuário.
- Revisão UX seguirá `.skills/ui_ux_pro.md` e as regras nativas do projeto; o checklist suplementar citado ali (`.skills/references/pro-rules.md`) **não existe neste worktree** e não foi tratado como evidência executada. `docs/roles/visual-regression-reviewer.md` é a autoridade de render-first para o gate visual.

## Riscos residuais antes de oferecer candidato ao PO

- **Hunts:** clique `Hunt` chama `prepareHunt` e pode navegar para outro mapa; isso não é mera abertura de janela. Preservar navegação/autoridade nativas; jamais simular Hunt nos testes.
- **Settings:** logout efetua transição real de cena/login; Cards recusa reentrada quando SceneManager já está em Login ou agendou cena não-Map. O `disabled` nativo de e-mail/2FA preserva o fallback Game até `finally`, mesmo se a UI de Settings for minimizada ou substituída; uma operação nativa travada pode manter o modo Game conservadoramente até terminar ou o módulo ser desmontado.
- **Team/Hunts:** abrir e fechar filho enquanto pai é cacheado pode deixar foco/Escape nativo ativo; fechar pelos métodos nativos controlados ou transicionar Game conservadoramente, sem modais fantasmas.
- **Ditto privado de Team:** `Api.getDittoForms()` pode demorar antes que exista qualquer `UIPanel`/handle. Não prometer overlay desse submenu em Cards. Ação Team `Ditto` utiliza Game **antes** do handler original. Se um pedido atrasado chegar após reentrada manual, CSS temporário construtivo evita medir 0×0 e fail-closed revela Game; em caso de resposta sem janela, o jogador pode reativar Cards manualmente. O formulário Inventory previamente aprovado mantém seu contrato separado. Visual sintético não comprova latência e foco reais in-game.
- **Dialogs sem handle:** nenhuma autoria de `PI.Dialog` genérico é presumida por timing, DOM ou clique. Storage bulk, Mailbox exclusão pendente, Capture Records reset e Settings prompts/confirm nativos **mudam para Game antes do handler**, preservando confirma/cancela/foco nativo. Reentrada enquanto `PI.Dialog` visível é bloqueada; entre prompts email/2FA, o `disabled` original governa o hold conservador. Outros plugins simultâneos/mudanças upstream podem exigir novo adapter. **Estas ações não estão qualificadas como overlays compatíveis em Cards**.
- **Performance:** renderer `display:none` é observável; CPU/GPU/FPS do host não foram medidos quantitativamente.
- **Outras ondas:** fases B/C e ações sem `scene` continuam abertas em `PM_SCOPE_2026-10-21_CARD_MODE_FULL_MENU.md`. Mesmo com aceite desta onda, o projeto global **não** estará pronto para publicação.

## Checklist para validação in-game exclusiva do PO (após gates offline)

1. Confirmar build integral `0.2.206` pelo SHA deste gate, Cards ativado e toggle Cards marcado; abrir/fechar cada um dos oito destinos sem renderizar o mapa por baixo; repetir ao menos uma janela cacheada e um atalho nativo conhecido.
2. `hunts`: navegar abas, abrir/fechar zona mobile e tooltip sem alterar hunt por teste; transição verdadeira de atividade continua sob controle nativo do PO.
3. `team`: abrir painel em Cards, mudar seleção e abrir/fechar Equip Picker e Moveset sem sair de Cards; verificar Escape, hover configurado e foco. **Ditto é uma exceção intencional: transformação nativa deve revelar Game antes da consulta/formulário e permitir retorno manual a Cards depois de fechar; não realizar transformação de Pokémon apenas para testar.**
4. `storage`: abrir, filtrar, rolar e voltar; ação bulk deve revelar Game **antes** da confirmação original `PI.Dialog`, preferencialmente **cancelar** o prompt sem efetuar transação.
5. `settings`: navegação entre seções e preferências, confirmar controles nativos; prompts de e-mail/2FA/logout/Discord devem usar Game e não ficar ocultos ao tentar Cards, sem criar operações de conta somente para teste.
6. `private-message`: listar/abrir mensagens; quando a exclusão de mensagem com recompensa pendente for legitimamente necessária, verificar que o prompt usa Game; não excluir/resgatar só para validar a interface.
7. `profile`, `encyclopedia` e `capture-records`: testar abertura, rolagem, seleções/filtros e Close/Escape; o `profile` aqui é Trainer Profile nativo. Reset de Capture Records deve apresentar diálogo em Game; **não confirmar reset como teste**.
8. Onde possível, verificar layout estreito (~320/390), título e Close não obstruídos, último controle alcançável por scroll e foco; retornar de Game para Cards apenas após concluir o fluxo incompatível. Registrar destinos aprovados/falhos individualmente, não inferir aceite global.

**Governança:** nenhuma ação de commit, merge, push, tag, publicação, instalação ou alteração do release-lock está autorizada aqui. Com TECH/UX/VISUAL independentes **READY offline**, o próximo gate é **validação in-game exclusiva do PO para cada um dos oito destinos**, sempre identificando o SHA do artefato. A matriz global de 46 destinos continua aberta, mesmo após eventual aceite da fase A.
