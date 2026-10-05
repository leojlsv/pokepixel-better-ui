# Pokémon Profile — Performance / UI / UX Refinement

## Task

- Request: revisar e melhorar performance, UI/UX, responsividade, hierarquia, legibilidade, interação, acessibilidade e integração visual do módulo Pokémon Profile.
- Branch / worktree: `feat/pokemon-profile-refinement` / `.worktrees/pokemon-profile-refinement`.
- Baseline artifact / version: Better UI `0.2.144`, Git `a971363`.
- Candidate version: Better UI `0.2.149`.
- Previously Product Owner validated scope: Profile dedicado; Team + Backpack por `creatureId` exato; Current/Saved Moves; Configure Moves delegado ao editor nativo; Saved Teams; Game Palette; rails 1→4; augmentação reversível do PokémonCard nativo.
- Explicitly out of scope: regras de gameplay, persistência nova, automação de gameplay, tráfego de rede, mudança de autoridade do estado nativo, validação no jogo/Tampermonkey.
- Write owner: Feature / Module Engineer (prime).
- Independent reviewer: worker-3 em papéis read-only separados de Technical/Performance QA, UX/A11y QA e Visual Regression QA; workers anteriores de UX/Visual falharam ao iniciar/reabrir e não contam como evidência final.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-PP-01 | Busca, filtros, origem e seleção reutilizam os mesmos cards do picker; selecionar via teclado não destrói o controle focado. | ordem Team→Backpack, filtros combinados, `creatureId` exato e estados selected/source. | regressão de identidade DOM + MutationObserver + teste de foco. | Feature Engineer | Technical QA + UX QA | `PASS` |
| AC-PP-02 | Save/Apply/Update/Delete de movesets preservam um destino lógico de foco após rerender e erros continuam anunciados junto da operação. | writer nativo, validação de revision/disponibilidade, confirmação e stores canônicos. | regressões keyboard/focus para cada classe de ação e estado removido/disabled. | Feature Engineer | UX QA | `PASS` |
| AC-PP-03 | Dialog, grupos de descoberta, HP e membros de times salvos expõem nomes/estado sem depender apenas de imagem/cor; controles touch relevantes chegam ao alvo coarse existente. | cópias localizadas, sem inventar dados de Pokémon/Team. | inspeção DOM/ARIA + testes de semântica; CSS coarse-pointer incluindo select. | Feature Engineer | UX QA | `PASS` |
| AC-PP-04 | Em 760, 420 e 340 px a janela e o body não criam overflow horizontal global; picker e rails de moves mantêm scroll horizontal local quando necessário. | composição aprovada de hero, facts, sections e rails 1→4. | renders Chromium sintéticos + métricas de overflow. | Feature Engineer | Visual QA | `PASS` |
| AC-PP-05 | O módulo continua usando a gramática atual PokéPixel: superfícies Window/Interactive/Values, linhas neutras 1 px, raios/tipografia atuais, cores semânticas de Type/Rarity e foco visível. | identidade Game Palette aprovada e sem novo tema paralelo. | comparação render-first antes/depois em estados representativos. | Feature Engineer | Visual QA | `PASS` |
| AC-PP-06 | Lifecycle, caches, native-card augmentation e cleanup permanecem reversíveis e idempotentes; stable `sync()` continua com zero MutationRecords. | AC-PERF-10 de 0.2.138 e todos os contratos funcionais existentes. | suíte Profile existente + regressões + full suite/build/diff-check. | Feature Engineer | Technical QA | `PASS` |
| AC-PP-07 | O candidato integrado passa checks aplicáveis sem alterar runtime funcional fora de Pokémon Profile; versão, changelog, documentação e testes refletem o candidato. | worktree principal sujo e mudanças alheias permanecem intactos. | `git diff --check`, focused/full tests, build e revisão de diff. | Feature Engineer | Technical QA | `PASS` |
| AC-PP-08 | Title bar segue a hierarquia visual das janelas do jogo: 48 px, ícone à esquerda, título branco e close discreto. | nome acessível do dialog, Game Palette e foco do close. | render 760/420/340 + regressão estrutural/CSS. | Feature Engineer | UX QA + Visual QA | `PASS` |
| AC-PP-09 | Nome, sprite, elementos, raridade e nível dos cards do Search ficam centralizados. | largura 108 px, ordem vertical e seleção por `creatureId`. | regressão CSS + render 760/420/340. | Feature Engineer | Visual QA | `PASS` |
| AC-PP-10 | Detalhes de Current/Saved Move permanecem em uma única linha compacta `[Element] Type · Ns · Power`, sem o prefixo visual `CD`. | label acessível continua `Cooldown Ns`, metadata autoritativa, cards 1→4 e scroll local. | regressão DOM/CSS + render representativo. | Feature Engineer | UX QA + Visual QA | `PASS` |
| AC-PP-11 | A janela pode ser movida pelo title bar e permanece inteira dentro do viewport. | close não inicia drag, posição de sessão, close/Escape/foco e cleanup existentes. | teste pointer drag/clamp + resize/cleanup review. | Feature Engineer | Technical QA + UX QA | `PASS` |
| AC-PP-12 | A lateral direita mantém inset visual equivalente à esquerda mesmo com scrollbar vertical. | largura útil, scroll local e ausência de overflow global. | render 760/420/340 + page/root/body metrics. | Feature Engineer | Visual QA | `PASS` |
| AC-PP-13 | O shell da janela exibe rounded real nos quatro cantos. | raio nativo 8 px, title bar/body, drag/clamp e scroll interno. | regressão CSS + render 760/420/340. | Feature Engineer | UX QA + Visual QA | `PASS` |
| AC-PP-14 | O valor de Power fica visualmente alinhado à mesma linha de Type, separadores e cooldown. | conteúdo, cor, peso semântico, `aria-label`, rails e truncamento existentes. | regressão CSS de line-box + render representativo. | Feature Engineer | Visual QA | `PASS` |
| AC-PP-15 | Current Moves refletem `slot_settings` autoritativo: `use_as_priority=true` deixa a caixa do número dourada. | ordem 1→4, drag/configuração nativa, foco e semântica não dependem só de cor. | regressão DOM/CSS + render 760/420/340. | Feature Engineer | UX QA + Visual QA | `PASS` |
| AC-PP-16 | Power remove o prefixo visual `PW` e mantém apenas o valor numérico com nome acessível `Power XXX`. | metadata autoritativa e alinhamento óptico do 0.2.148. | regressão DOM/A11y + render representativo. | Feature Engineer | UX QA + Visual QA | `PASS` |
| AC-PP-17 | Move de cura com `effect_kind="heal"` e `heal_threshold_pct` válido mostra `· XX%` verde claro após Power. | somente Current Moves com `slot_settings`; Saved Movesets não inventam configuração não persistida. | regressão de shape + render de Heal + inspeção A11y. | Feature Engineer | Technical QA + UX QA + Visual QA | `PASS` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Status |
| --- | --- | --- | --- |
| R-PP-01 | Reutilizar cards do picker pode deixar texto/sprite/localização obsoletos após refresh/detail. | refresh/detail/localization regression verificando atualização in-place e identidade do botão. | `mitigated / tests PASS` |
| R-PP-02 | Preservação de foco pode tentar focar ação removida ou desabilitada após Apply/Delete. | testes Apply ativo e Delete com fallback determinístico. | `mitigated / tests PASS` |
| R-PP-03 | Ajustes de semântica ou coarse targets podem aumentar altura/clipping em 340 px. | render Chromium 340 + métricas root/body/scroll owners. | `mitigated / render+metrics PASS` |
| R-PP-04 | Novas atualizações do picker podem reintroduzir MutationObserver feedback no reconcile global. | teste stable sync existente + observer direcionado ao picker. | `mitigated / tests PASS` |
| R-PP-05 | Soltar o ponteiro fora do documento pode deixar o drag ativo e mover a janela ao reentrar sem botão pressionado. | independent gate + regressão de pointer capture/release, `lostpointercapture`, blur e `buttons=0`. | `mitigated / review+tests PASS` |
| R-PP-06 | Captura estreita pode contradizer as métricas se o harness navegar fora do servidor ou o fixture não dimensionar o ícone real da toolbar. | capture QA via localhost + mount wait + page/root/body metrics + renders re-gated. | `mitigated / visual review PASS` |
| R-PP-07 | O gutter do scrollbar pode somar ao padding direito e criar uma faixa vazia maior que o inset esquerdo. | scrollbar Profile 8 px + padding direito compensado + renders estreitos. | `mitigated / independent visual PASS` |
| R-PP-08 | `border-radius` no root pode continuar visualmente quadrado se title bar/body pintarem fora do shell. | root `overflow:hidden` + `--ppbui-window-radius` + inspeção dos quatro cantos. | `mitigated / independent visual PASS` |
| R-PP-09 | Power pode parecer deslocado verticalmente se tiver box geometry própria apesar do flex row estar centralizado. | compartilhar a mesma line-box e remover `min-height`/`padding` exclusivos de Power. | `mitigated / independent visual PASS` |
| R-PP-10 | Priority/threshold podem ser inferidos do Move errado em vez da posição 1→4. | consumir somente `raw.slot_settings[index]`; não inferir por descrição/nome. | `mitigated / independent TECH PASS` |
| R-PP-11 | Threshold pode aparecer em Move que não é cura. | exigir `effect_kind === "heal"` e percentual estruturado 1→100. | `mitigated / independent TECH+VISUAL PASS` |
| R-PP-12 | Saved Movesets podem parecer carregar Priority/threshold que o schema persistido atual não salva. | não renderizar esses cues em Saved Movesets até existir snapshot autoritativo correspondente. | `mitigated / independent TECH+VISUAL PASS` |

## Gate results

- Product Owner follow-up após validação in-game do 0.2.148: refletir Priority, remover `PW` e mostrar heal threshold em verde claro no formato `[Element] Type · Ns · XXX · XX%`.
- Contrato nativo atual verificado read-only no bundle público `MovesetConfig.js`: `getMoveset()` expõe `slot_settings` por posição com `use_as_priority` e `heal_threshold_pct`; o threshold é aplicável pelo editor somente quando `move.effect_kind === "heal"`.
- Author verification 0.2.149: Profile `39/39 PASS`; full repository `619/619 PASS`; build `PASS`; build-contract `1/1 PASS`; `git diff --check` `PASS`.
- Exact 0.2.149 candidate artifact: `dist/pokepixel-better-ui.user.js`, SHA-256 `09807256CE3C77398566AD44C38AECFC061D2C8A3986AA90B2EF3FC7E65D8A7B`, header `@version 0.2.149`.
- Synthetic Chromium evidence: `work/pokemon-profile-149-{760,420,340}.png`. Page/root/body widths remain 760 = `760/760` + `618/618` + `610/610`; 420 = `420/420` + `402/402` + `394/394`; 340 = `340/340` + `322/322` + `314/314`.
- 0.2.149 render SHA-256: 760 `63C624B5D545FAF25693AB117EDEE68B0AD1AE74DA3925562CE51D2C98AB302C`; 420 `D525A52E03107F32B33338FACB8D768C521E756D967B1A7B769CEDD13E92EB51`; 340 `695ED33F08390DF38931E0B12AADC63A0E73C180BC465C7ADCAAD1737CC70187`.
- Final independent TECH 0.2.149: `P0=0 P1=0 P2=0 P3=0 — TECH READY`.
- Final independent UX/A11y 0.2.149: `P0=0 P1=0 P2=0 P3=0 — UX READY`.
- Final independent VISUAL 0.2.149: `P0=0 P1=0 P2=0 P3=0 — VISUAL READY`.
- Independent reviewer rerun: Profile `39/39 PASS`; `git diff --check` `PASS` apart from line-ending warnings.
- Independent contract confirmation: Current binds only `raw.slot_settings[index]`; absent/non-array settings render no Priority/threshold; threshold requires structured `effect_kind="heal"` plus finite `heal_threshold_pct` 1→100; Saved Movesets receive no `slotSettings` and therefore do not fabricate cues.
- Independent visual confirmation: Current slot 1 uses a gold Priority number box; Power is numeric-only; Current Recover reads `Status · 8s · 1 · 75%` with light-green threshold; Saved Recover has ordinary slot styling and no threshold. No new global clipping/overflow.
- Product Owner in-game validation 0.2.149 (2026-10-03): `APPROVED / VALIDATED` for the exact candidate above.
- Product Owner follow-up final após validação in-game do 0.2.147: alinhar visualmente `PW XXX` com os demais textos da metadata. O 0.2.147 permanece histórico e não aprova o novo artifact.
- Author verification 0.2.148: Profile `39/39 PASS`; full repository `619/619 PASS`; build `PASS`; build-contract `1/1 PASS`; `git diff --check` `PASS`.
- Exact 0.2.148 candidate artifact: `dist/pokepixel-better-ui.user.js`, SHA-256 `A478E855361EB718936FCC61A09B0C9DEAAA39FF6726DE15CB0178FB39CFE9EE`, header `@version 0.2.148`.
- Synthetic Chromium evidence: `work/pokemon-profile-148-{760,420,340}.png`. Page/root/body client/scroll widths remain 760 = `760/760` + `618/618` + `610/610`; 420 = `420/420` + `402/402` + `394/394`; 340 = `340/340` + `322/322` + `314/314`.
- 0.2.148 render SHA-256: 760 `C94179912A25DDCFE19EE8D6768EC72171CDAA6B4D7E5613ACF5F3E99DB37757`; 420 `70A7FF73204B5948094CD266DA8BF1AD92E41FA0C99C1577496A2E79D2756EAB`; 340 `21079A158026B046B8E0E6209D8AE15FEF77F40605F3E29F01E004F6BE4A05A0`.
- Final independent TECH 0.2.148: `P0=0 P1=0 P2=0 P3=0 — TECH READY`.
- Final independent UX/A11y 0.2.148: `P0=0 P1=0 P2=0 P3=0 — UX READY`.
- Final independent VISUAL 0.2.148: `P0=0 P1=0 P2=0 P3=0 — VISUAL READY`.
- Independent reviewer rerun: Profile `39/39 PASS`; `git diff --check` `PASS` apart from line-ending warnings.
- Independent visual confirmation: `PW XXX` is optically baseline-aligned with Type/separators/cooldown in Current and Saved Moves at 760/420/340; no new global clipping/overflow or rail regression.
- Product Owner follow-up após validação in-game do 0.2.146: remover prefixo visual `CD`, revisar espaço lateral direito e aplicar rounded visível à janela. O 0.2.146 permanece histórico e não aprova o novo artifact.
- Author verification 0.2.147: Profile `39/39 PASS`; full repository `619/619 PASS`; build `PASS`; build-contract `1/1 PASS`; `git diff --check` `PASS`.
- Exact 0.2.147 candidate artifact: `dist/pokepixel-better-ui.user.js`, SHA-256 `02FBF598ABECDC6318FA510F8E5FDC4E9AF237DD5BAC0D765DC91CE34A2F48EE`, header `@version 0.2.147`.
- Synthetic Chromium evidence: `work/pokemon-profile-147-{760,420,340}.png`. Page/root/body client/scroll widths: 760 = `760/760` + `618/618` + `610/610`; 420 = `420/420` + `402/402` + `394/394`; 340 = `340/340` + `322/322` + `314/314`. Root bounds remain inside viewport at 760 `70..690`, 420 `8..412`, 340 `8..332`.
- 0.2.147 render SHA-256: 760 `BA6D4B3403C62C78BE5E4EB07096C8937E959124D8BB336C93FA8440B9A4B764`; 420 `A6532B738613F3A8AF431F7625D131738290A2AADFBA9F9CE08E4F1E80F7CD35`; 340 `FAE2736088D2C97E189947E638650ADA5C67E9210009AB9E14C961ECCE422E7E`.
- Final independent TECH 0.2.147: `P0=0 P1=0 P2=0 P3=0 — TECH READY`.
- Final independent UX/A11y 0.2.147: `P0=0 P1=0 P2=0 P3=0 — UX READY`.
- Final independent VISUAL 0.2.147: `P0=0 P1=0 P2=0 P3=0 — VISUAL READY`.
- Independent reviewer rerun: Profile `39/39 PASS`; `git diff --check` `PASS` apart from line-ending warnings.
- Independent visual measurements: 760 hero inset `11px/11px`; 420 main card inset `9px/9px`; 340 main card inset `9px/9px`. Rounded shell pixel-confirmed on all four corners; no global clipping/overflow regression.
- Author verification 0.2.146 after corrective pass: Profile `39/39 PASS`; full repository `619/619 PASS`; build `PASS`; build-contract `1/1 PASS`; `git diff --check` `PASS`.
- Prior 0.2.145 local gates: TECH/UX/VISUAL READY, `P0=P1=P2=P3=0`; superseded by this Product Owner follow-up.
- First independent 0.2.146 gate on rejected SHA `978AFF4DEEFEFB8B0FA221F1BEFE8AC3E493D48C836D22A4A085F4B0C45E4CD2`: TECH `P2=1 / NOT READY` and UX `P2=1 / NOT READY` for sticky drag after release outside the document; VISUAL `P2=1 / NOT READY` because the 420/340 evidence cut the right edge. The visual issue was traced to the capture harness/fixture rather than Profile root overflow.
- Corrective pass: drag now uses pointer capture when supported and terminates on release/cancel, `lostpointercapture`, window blur or re-entry with primary button up; the capture tool now navigates via localhost, waits for the mounted Profile and measures the real viewport; the preview fixture dimensions the real toolbar icon.
- Final independent TECH 0.2.146: `P0=0 P1=0 P2=0 P3=0 — TECH READY`.
- Final independent UX/A11y 0.2.146: `P0=0 P1=0 P2=0 P3=0 — UX READY`.
- Final independent VISUAL 0.2.146: `P0=0 P1=0 P2=0 P3=0 — VISUAL READY`.
- Independent reviewer rerun: Profile `39/39 PASS`; `git diff --check` `PASS` apart from line-ending warnings.
- Exact accepted local candidate artifact: Better UI `0.2.146`, `dist/pokepixel-better-ui.user.js`, SHA-256 `379F0240DAAA81C6E3EA49982713E8DE292719C3A0391638F770AA447B735048`, header `@version 0.2.146`.
- Synthetic Chromium evidence: `work/pokemon-profile-146b-{760,420,340}.png`. Page/root/body client/scroll widths: 760 = `760/760` + `618/618` + `608/608`; 420 = `420/420` + `402/402` + `392/392`; 340 = `340/340` + `322/322` + `312/312`. Root bounds stay inside the viewport at 760 `70..690`, 420 `8..412` and 340 `8..332`. Intentional horizontal owners remain picker and move rails.
- Final render SHA-256: 760 `900F3D8222A77759BDE7258E3394EADF27AD3E1DF7486C9CB773B5118763D59C`; 420 `565D864756FC5302CE7FE0BAA386D32A6F2BEDA18E3DBA2C6352059E87520B16`; 340 `C813CB49CA688E73D2C33A9EF950681EB6B672188D960DF2F89F5E6C74F9AF7F`.
- Evidence unavailable: referências opcionais `references/quick-reference.md` e `references/pro-rules.md` do skill instalado não estão presentes; MASTER, workflow e `.skills/ui_ux_pro.md` do projeto permanecem disponíveis e autoritativos.

## PM decision

`APPROVED / VALIDATED BY PRODUCT OWNER — exact 0.2.149 local candidate`

O 0.2.148 concluiu seu gate local, mas o novo feedback in-game adicionou cues derivados do contrato nativo
de `slot_settings` e alterou a apresentação de Power. O 0.2.149 passou checks do author e um re-gate
independente completo sobre o SHA exato acima: TECH, UX/A11y e VISUAL estão READY sem findings
P0/P1/P2/P3. O Product Owner validou e aprovou o candidato in-game. Git history e publicação continuam
separados: commit/push/merge/tag/deploy exigem autorização explícita própria.

## Product Owner validation checklist

- Abrir Pokémon Profile pela toolbar e pelo CTA do PokémonCard e confirmar que o `creatureId` escolhido é o exibido.
- Alternar Pokémon no picker, combinar Search/filtros/source e confirmar legibilidade/seleção sem saltos visuais.
- Usar teclado no picker e em Save/Apply/Update/Delete; confirmar que o foco segue utilizável após cada rerender.
- Confirmar Current/Saved Moves 1→4, Configure Moves nativo e Saved Teams sem alteração de comportamento.
- Em uma largura estreita representativa, confirmar ausência de scroll horizontal global e scroll local utilizável no picker/rails.
- Conferir PokémonCard nativo com ACTIVE/PROTECTED, Power/IV/moves e CTA Profile, preservando ações nativas.
- Comparar o title bar do Profile com as janelas do jogo e mover a janela pelo title bar até perto das quatro bordas.
- Confirmar que todos os objetos dos cards do Search ficam centralizados.
- Confirmar a leitura visual de Current/Saved Moves sem prefixo `CD`, com Power numérico sem `PW` e sem clipping.
- Confirmar que o valor de Power fica na mesma linha óptica de Type, separadores e cooldown.
- Confirmar que slot marcado como Priority exibe a caixa numérica dourada sem alterar ordem/posição.
- Confirmar que Power aparece sem prefixo `PW`.
- Confirmar cura com threshold como `[Element] Type · Ns · XXX · XX%`, com `XX%` verde claro.
- Confirmar que a lateral direita não aparenta gutter duplo em relação à esquerda.
- Confirmar rounded visível nos quatro cantos do shell.
