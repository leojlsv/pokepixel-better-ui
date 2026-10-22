# PM Gate — Team Stats acionável, candidato integral 0.2.211

**Estado final:** **PM ACCEPTED OFFLINE — candidato integral 0.2.211 somente para validação in-game do PO**. TECH, UX/A11y e VISUAL independentes **READY** na fonte/render sintético exatos, **P0=0/P1=0**. **A versão 0.2.211 ainda não foi validada em jogo pelo PO.** Nenhuma instalação, jogo autenticado, commit, merge, push, tag, publicação ou atualização de `userscript/release-lock.json`.

## Autoridade e mudança de requisito

O PO reportou em 2026-10-22 que o botão Stats em Team “não está intuitivo. Parece apenas um título” e **alterou explicitamente** o comportamento anteriormente pedido para **“prefiro que comece colapsado mesmo”**. A exigência anterior de iniciar aberto em 0.2.210 fica substituída **somente no escopo de Team Stats**. Não há aprovação in-game explícita de 0.2.210 nesta mensagem.

Worktree: `/pokepixel-better-ui/work/card-mode-window-overlays`, branch `feat/card-mode-window-overlays-205`, HEAD `81816d3`. A fonte anterior permanece suja e não foi descartada. Release-lock `0.2.204`; snapshot do candidato integral 0.2.210 `visual-evidence/po-candidate-v0.2.210-778CF9F6.user.js` permanece intacto. O PO aprovou anteriormente em jogo o candidato 0.2.209 (snapshot `visual-evidence/po-approved-v0.2.209.user.js`). Nenhuma dessas aprovações se transfere automaticamente a 0.2.211.

## Matriz de aceite e evidências

| ID | Resultado observável | Contrato preservado | Prova disponível | Revisor | Status |
| --- | --- | --- | --- | --- | --- |
| AC-01 | Team inicia com HP/EXP e cinco atributos **recolhidos**, com botão **“+ Mostrar estatísticas”** | Componentes/valores/handlers nativos originais continuam no DOM; nenhuma operação de jogo muda | `test/team.test.js`, Chromium 1280/390/320: `team-stats-collapsed.png`, computedStyle dos blocos nativos = `none` | TECH + UX/Visual | `pass` offline |
| AC-02 | Botão parece ação, não título: texto de comando explícito, +/−, chevron, fundo contrastante, hover, active e foco | Densidade de Team e compatibilidade com a barra Saved Teams, controle acionável pelo teclado | Chromium `team-stats-hover.png` e `team-stats-expanded.png`, hover com background diferente, cursor pointer, icon pseudo e foco; capturas nos 3 viewports | UX/Visual | `pass` offline |
| AC-03 | Ao abrir, texto vira **“− Ocultar estatísticas”**; ao fechar retorna imediatamente para Mostrar; PT/EN/ES/ZH corretos | ARIA `aria-expanded`, `aria-controls` dos nós atuais, Enter/Espaço, preservação de foco | 49/49 testes dirigidos; Chromium `team-stats` e `team-stats-keyboard`, estados recolhido→expandido→recolhido | TECH + UX | `pass` offline |
| AC-04 | `Scene_Team.refresh()` conserva a escolha atual, mas nova montagem abre recolhida | Sem retenção de IDs de gerações antigas, cleanup reversível, sem clone de stats nem observer novo | Testes refresh nativo/25 gerações, remount, foco condicionado, cleanup; 1.111/1.111 testes integrais | TECH | `pass` offline |
| AC-05 | Card Mode/Team/Details/Saved Teams existentes não regrediram | Cards selecionado, host nativo soberano, barra responsiva, scroll/resize/Details | Chromium Team 48/48, Chromium Card Mode 66/66, 285/285 imagens verificadas | TECH + UX/Visual | `pass` offline |
| AC-06 | PO confirma acessibilidade, clareza visual e estado inicial no jogo autenticado | Nenhuma aprovação automática, nenhuma autorização de publicação | Instalação e validação manual exclusiva do PO, feedback/screenshot do candidato exato | PO | `live-only` |

## Alteração implementada

- `src/modules/team/controller.js`: `statsExpanded=false` em cada montagem; ação local `updateStatsToggle()` reconcilia rótulo localizado, `aria-expanded` e flag CSS imediatamente no click e no refresh; conserva associações `aria-controls`, nós nativos e restauro de foco.
- O botão recebeu superfície própria `--ppbui-bg-3`, borda `--ppbui-border-strong`, ícone pseudo-elemento `+`/ `−`, chevron, hover distinto misturando a cor de informação com o fundo, active e `:focus-visible`. O label alterna sem reconstituir filhos nativos.
- `src/modules/team/dom.js`: textos `Mostrar/Ocultar estatísticas` e traduções em EN/ES/ZH. Nenhuma tradução é forçada fora de Team.
- Versão incremental do **userscript integral** em `package.json`, `package-lock.json` (raiz e packages[""]) e `userscript/metadata.txt`: `0.2.211`. Changelog atualizado; nenhum módulo publicado isoladamente.

## Evidência sobre fonte atual

| Gate | Evidência | Resultado |
| --- | --- | --- |
| Unit + build integral | `npm run validate`; `visual-evidence/team-0211-source-validate.log` | **1.111/1.111 PASS** (0 falhas), build integral exit code 0 |
| Team/Details direcionado | `node --test --test-force-exit test/team.test.js test/card-mode-team-details.test.js` | **49/49 PASS**, includes default collapsed, click sync, locale, remount, refresh, foco e owners nativos |
| Chromium Team | `node visual-evidence/capture-team-0211.mjs`; `phase-team-0211-geometry.json`, `team-0211-chromium.log` | **48/48 PASS**, **153 PNG**, bundle sintético SHA-256 `098998030E6D473BA617D417EF0281D46E845088D8EE096DC34BA511113DE7A3` |
| Chromium Card Mode | `node visual-evidence/capture-phase-po-0211.mjs`; `phase-po-0211-visual-geometry.json`, `team-0211-main-chromium.log` | **66/66 PASS**, **132 PNG**, bundle sintético SHA-256 `822A86464B303CB2A350BEF6256940CCA0F0EE812007D035D0633853E498548D` |
| Integridade de imagem | `visual-evidence/team-0211-asset-integrity.log` | **285/285 PNG**, 285 filenames únicos, 252 hashes distintos (quadros estáticos/no-op iguais são esperados); 0 erros SHA/bytes/assinatura/IHDR/viewport; seis roteiros stats com transições corretas |
| Git / limites | `git diff --check`, `git status --short -- src/core/observer.js userscript/release-lock.json` | Sem erro de whitespace; nenhum dos dois arquivos protegidos modificado |

**Userscript integral candidato:** `dist/pokepixel-better-ui.user.js`, **1.886.199 bytes**, SHA-256 **`6301D177D836259696FFBD9092A47E4B549C0A6897B7F0CD03C32CF4CC78A4EF`**. Cópia imutável de handoff `visual-evidence/po-candidate-v0.2.211-6301D177.user.js`, mesmos bytes e hash. Esse é o único hash desta versão destinado à validação do PO; SHA dos bundles Chromium não é SHA do userscript integral.

## Revisão independente

| Domínio | Parecer / limites |
| --- | --- |
| TECH | **TECH READY OFFLINE (P0=0, P1=0)** — worker-15 fez QA independente estritamente READ-ONLY da fonte exata 0.2.211: startup recolhido, textos PT/EN/ES/ZH, sincronização imediata de texto/ARIA, ciclos de refresh, limpeza de IDs, foco, e ausência de observer/click nativo duplicados. Um P2 documental de traceabilidade foi corrigido no runner: `capture-phase-po-0211.mjs` e novo `phase-po-0211-visual-geometry.json` identificam o subset CardMode inalterado como candidato **0.2.211**, não 0.2.210. Rerun CardMode 66/66 e integridade 285/285 após a correção, sem alteração do userscript. |
| UX/A11y | **UX READY OFFLINE (P0=0, P1=0, nenhum P2 novo de Stats)** — worker-16 fez revisão independente estritamente READ-ONLY: ação e estado visíveis, PT-BR legível em 320/390/1280, Enter abre, Espaço recolhe, foco visível, labels/ARIA/locale consistentes com os testes e refresh. |
| VISUAL | **VISUAL READY OFFLINE (P0=0, P1=0, nenhum P2 novo de Stats)** — worker-16 inspecionou **imagens renderizadas do Chromium sintético** (`team-stats-{collapsed,hover,expanded,collapsed-again}` e keyboard) nas três larguras; +/−, affordance explícita, destaque cyan real no hover, contraste perceptível com cabeçalho neutro Saved Teams, sem clipping PT-BR ou ocultação de Details/Remove. Conferiu independentemente **285/285 PNG** por SHA/bytes, sem divergência. Razão de contraste WCAG na composição real não medida. |
| PO live | **PENDENTE** — toda prova Chromium usa `file://` sintético e não substitui o jogo autenticado. |

Limites: as imagens são `file://` sintéticas (emulação mobile com `mobile:false`) e mostraram textos PT-BR. Legibilidade visual em outros idiomas, browser touch real, composição de contraste WCAG, native host autenticado e transações não foram validados no jogo. **P2 herdado, fora do escopo de Stats:** o host sintético pode impor largura extrema de 610px enquanto Saved Teams está fechado em mobile 320/390; nessa fase artificial pré-expandida há recorte antes do clamp correto de Saved Teams ao abrir. Esse estado não foi confirmado in-game e o patch Stats não modifica sua geometria. Nenhum benchmark CPU/GPU/FPS foi realizado.

**Decisão PM final:** **PM ACCEPTED OFFLINE — userscript integral 0.2.211 SHA-256 `6301D177…` para validação exclusiva do PO.** TECH READY, UX READY e VISUAL READY por revisores independentes sobre a fonte Team congelada e seus PNG exatos; P0=0/P1=0 em todas as áreas. O único P2 residual registrado é de escopo/evidência herdado; não existe P0/P1 aberto. Não é aprovação in-game do PO, nem autorização de release/histórico.

Roteiro PO: instalar por decisão própria apenas o userscript integral com SHA `6301D177…`; atualizar a página autenticada; em Cards, abrir Team com Pokémon selecionado e conferir o novo botão **“+ Mostrar estatísticas”** e se HP/EXP/atributos não ocupam espaço inicialmente. Acionar por click/Enter, verificar **“− Ocultar estatísticas”** e dados originais, fechar via click/Espaço; trocar de Pokémon e conferir estado; fechar/reabrir Team para confirmar default recolhido. Observar Saved Teams e Details sem regressão. Reportar falhas com viewport, modo Cards/Game e screenshot. Sem permissão de publicação/commit.
