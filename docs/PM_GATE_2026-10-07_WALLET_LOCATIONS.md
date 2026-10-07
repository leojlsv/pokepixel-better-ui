# Wallet — correção Backpack / Trainer Header

Status: **0.2.186 validado e aprovado in-game pelo Product Owner em
2026-10-07T19:02:22Z**. Commit/push/merge/tag/release explicitamente autorizados no
mesmo momento.

## Decisão vigente e histórico supersedido

Em 2026-10-07T17:12:51Z o Product Owner pediu inicialmente Wallet configurável em
Backpack, Menu Bar, Shop e Trainer Header. Isso originou o candidato 0.2.184.

Na validação visual posterior, o Product Owner rejeitou essa solução e corrigiu o
contrato em 2026-10-07T18:02:14Z:

> “Faltou o ícone de diamante. No trainer head ficou mal dimensionado. No shop shotcut
> ficou com péssima UX. Ao selecionar uma opção no menu Better UI, o scroll está
> subindo. O menu Wallet não é colápsavel. Deixe apenas BACKPACK e TRAINER HEADER como
> opções.”

Portanto o parecer local anterior de 0.2.184 é apenas histórico. O artefato 0.2.184,
1.522.956 bytes / SHA-256
`014E5362DF790BCD06361365186A12AA72407934F37FE5E668E02BB2FB98D64F`,
está supersedido e **não é candidato de entrega**.

## Contrato 0.2.185

- Better UI > Wallet oferece somente **Backpack** e **Trainer Header**.
- Backpack permanece ligada por padrão. Trainer Header é opcional; os dois podem
  coexistir ou ambos podem ficar desligados.
- Wallet é um `<details>/<summary>` colapsável e usa o mesmo estado de disclosure das
  demais seções Better UI. Colapsar a seção não muda locais ativos.
- Alterar Backpack/Trainer preserva o `scrollTop` da lista de preferências e devolve
  foco ao checkbox sem scroll automático.
- Trainer Header é uma projeção compacta dentro de
  `.pokeidle-trainer-hud__info`, subordinada ao nome/mapa/nível. Não restaura a Wallet
  nativa externa.
- Dólares e Diamantes continuam vindo da autoridade nativa do Team HUD. Diamantes
  projetam o ícone nativo `.pokeidle-currency__icon` junto ao valor.
- Inventory continua sendo o único módulo que reparenteia o nó Wallet nativo.
- Wallet não registra participante, botão ou opção em Menu Bar/Shop.
- Layouts experimentais 0.2.184 com `wallet:menu`/`wallet:shop` são aceitos apenas
  como entrada de migração e normalizados sem esses IDs, preservando o restante da
  organização e a capacidade 10–15 já aprovada da Menu Bar 0.2.183.
- Preferências continuam por treinador e locais ao browser. Nenhum saldo é persistido.

## Acceptance & Evidence Matrix

| AC | Critério observável | Evidência local requerida | Estado |
| --- | --- | --- | --- |
| AC-W185-01 | Só Backpack e Trainer Header aparecem/executam; Menu/Shop Wallet inexistentes. | Fonte, migração, settings e renders. | PASS local + independente. |
| AC-W185-02 | Trainer e painel mostram ícone de Diamantes + valor. | Clone do ícone nativo, testes e render representativo. | PASS visual local + independente; sprite real permanece live-only. |
| AC-W185-03 | Trainer Wallet fica compacto dentro da coluna de informações e suporta valores longos/narrow. | DOM, métricas e renders. | PASS local + independente. |
| AC-W185-04 | Toggle Wallet não sobe a lista e mantém foco. | Teste de interação + render/métrica de scroll. | PASS local + independente. |
| AC-W185-05 | Wallet abre/fecha como disclosure e persiste esse estado sem alterar opções ativas. | Module Controls + render aberto/fechado. | PASS local + independente. |
| AC-W185-06 | IDs experimentais 0.2.184 migram sem danificar Menu Bar. | `validateLayout` + regressão dedicada. | PASS local + probe adversarial independente. |
| AC-W185-07 | Autoridade/lifecycle preservam isolamento de conta, nó nativo, observer local e fallback de storage. | Regressões Wallet/Inventory/Foundation e QA adversarial. | PASS local + independente. |

## Autoridade e lifecycle

A projeção nunca renderiza payload de evento como saldo. Eventos autenticados só podem
confirmar a autoridade; em troca de conta, o HUD anterior permanece em quarentena até
owner, gold e diamonds da própria autoridade nativa coincidirem. Dados inválidos ou
ausentes aparecem indisponíveis, sem zero inventado.

Se o jogo remover a Wallet nativa, cleanup de Inventory não a ressuscita. Substituição
legítima da janela Inventory ainda conserva o mesmo nó vivo. Wallet e suas projeções usam
somente o escopo `team-hud` do observer central; não existe polling, observer paralelo ou
requisição de saldo.

Falhas de armazenamento podem manter preferências em sessão. A base persistente conhecida
é preservada entre falhas intermitentes para que uma recuperação do mesmo registro não
apague edições de sessão. Alteração externa real continua prevalecendo.

## Evidência visual local

O pacote atual fica em `work/wallet-locations-185/`. A coleção final é limitada a dez
cenários:

- 1280×900: `settings-default`, `settings-collapsed`,
  `settings-toggle-scroll`, `trainer`, `trainer-panel`, `backpack`, `both`,
  `long-values`;
- 390×844: `narrow-settings`, `narrow-trainer`.

O renderer usa módulos de produção, CSS nativa retida e CSP sem rede. Trainer/Wallet e
valores são sintéticos. `PokeIdle.Currency.element` e a arte Diamond da fixture são
substitutos declarados; as classes/box do ícone nativo são reproduzidas para testar
geometria, mas o sprite exato do jogo só pode ser confirmado pelo Product Owner in-game.

As métricas ligam os renders a hashes das fontes relevantes, verificam ausência de
overflow nas regiões Wallet, viewport, hit-test do painel/Fechar, ausência de superfícies
Wallet Menu/Shop, posição do Trainer dentro de `.pokeidle-trainer-hud__info` e os dois
controles atuais. O cenário de toggle registra scroll antes/depois e foco.

No freeze atual:

- `settings-toggle-scroll`: `scrollTop 548 -> 548` e foco final no checkbox
  `trainer`;
- Trainer/painel: ícone sintético pintado pelo mesmo contrato
  `background-image: var(--ui-iconset) !important`, com box nativo 22×22 e
  apresentação ~17,6×17,6 px;
- todos os 10 cenários: regiões Wallet sem overflow, dentro da viewport e sem
  `wallet:menu`/`wallet:shop` renderizado;
- painel aberto: hit-test do painel e de **Fechar** positivo.

## Artefato e validação automatizada — 0.2.185 histórico

Freeze exato do candidato:

- `dist/pokepixel-better-ui.user.js`;
- versão: `0.2.185`;
- bytes: `1.520.065`;
- SHA-256:
  `0F4995CA2DDD4D427FA90A2580E8B9902575058CEAAFFF21F77DD9EA4E580AC9`;
- suíte focada Wallet/Menu/Inventory/Foundation: **99/99 PASS**;
- suíte completa: **691/691 PASS**;
- `npm run build`: PASS;
- `npm run release:check`: PASS — `release contract OK: v0.2.185`;
- `git diff --check`: PASS, apenas avisos esperados LF -> CRLF;
- `verify-candidate.mjs`: PASS com **29 source bindings** e **10 PNGs** finais;
- Profile aprovado preservado pelos hashes congelados no verificador.

Resultados do 0.2.184 não são reutilizados como evidência do candidato atual.

## Gate independente

O revisor independente deve executar revisão **render-first** e depois revisar
fonte/testes/docs. Os verdicts exigidos são separados: `TECH READY`, `UX READY` e
`VISUAL READY`. Nenhum verdict local equivale a validação in-game ou aprovação do
Product Owner.

Re-gate final 0.2.185:

- P0: nenhum;
- P1: nenhum;
- P2: nenhum;
- P3: nenhum material no escopo Wallet;
- **TECH READY**;
- **UX READY**;
- **VISUAL READY** para a evidência local congelada.

O revisor inspecionou primeiro os 10 PNGs finais e, depois, fonte/docs/testes. Conferiu
diretamente versão/bytes/hash do dist, `verify-candidate` (29 bindings / 10 imagens),
logs 691/691 + 99/99 e executou rerun independente limitado **27/27 PASS**.

Probe adversarial independente confirmou que um layout válido de capacidade 10,
vertical, posição customizada e organização própria continua idêntico após normalizar
`wallet:menu`/`wallet:shop` históricos — inclusive com colocação histórica duplicada
— enquanto um novo ID desconhecido `wallet:future` permanece fail-closed como
`unknown-id`.

O limite do **VISUAL READY** local é explícito: a arte Diamond da fixture é sintética.
O parecer certifica layout, visibilidade e contrato nativo de box/classes/CSS, não o
sprite exato carregado pelo jogo. A validação in-game do Product Owner continua pendente.

## Follow-up in-game — 0.2.186

Em 2026-10-07T18:46:30Z o Product Owner validou a **posição** do Trainer Wallet, mas
rejeitou sua organização visual:

> “Posição boa, organização ruim. Ficou ‘largada’ lá, aplique uma melhor formatação.”

Essa decisão preserva integralmente mount/posição/autoridade do 0.2.185 e abre somente
um refinamento visual de composição:

- o Trainer Wallet deve continuar dentro de `.pokeidle-trainer-hud__info`;
- os dois recursos deixam de parecer valores soltos e passam a formar um único
  **resource strip** compacto;
- o strip usa uma única superfície Values, borda neutra 1px e raio de controle;
- Gold e Diamonds ocupam duas colunas equilibradas, com ícone + valor centralizados;
- a segunda coluna usa um divisor vertical neutro;
- hover/active altera apenas a superfície do strip, sem sombra/card externo;
- box/escala dos ícones nativos e autoridade de saldo permanecem inalterados.

Critério adicional:

| AC | Critério observável | Evidência local requerida | Estado |
| --- | --- | --- | --- |
| AC-W186-08 | A posição aprovada é preservada, mas Gold/Diamonds aparecem como um strip integrado, equilibrado e legível em vez de valores soltos. | Render Trainer normal/narrow/long + CSS independente. | Implementado; re-gate 0.2.186 pendente. |

O candidato 0.2.185 permanece congelado como evidência histórica da iteração anterior;
não deve ser sobrescrito.

### Freeze atual 0.2.186

- `dist/pokepixel-better-ui.user.js`;
- versão: `0.2.186`;
- bytes: `1.520.368`;
- SHA-256:
  `5E9149A36233EDFDCC8393F5A1D730F84E0A90BF5DCEB4345CDBC812CC06AE80`;
- suíte focada Wallet/Menu/Inventory/Foundation: **99/99 PASS**;
- suíte completa: **691/691 PASS**;
- `npm run build`: PASS;
- `npm run release:check`: PASS — `release contract OK: v0.2.186`;
- `git diff --check`: PASS, apenas avisos esperados LF -> CRLF;
- `work/wallet-locations-186/verify-candidate.mjs --freeze`: PASS com
  **29 source bindings** e **12 PNGs** finais;
- `trainer` normal: resource strip `258×24`, uma superfície, duas colunas e divisor;
- `trainer-hover`: mesma geometria, surface muda de
  `rgba(22, 29, 32, .85)` para `rgba(35, 44, 46, .96)`;
- `trainer-active`: reproduz o mesmo interactive surface do hover, sem sombra/scale;
- `long-values` e `narrow-trainer`: sem overflow material e dentro da viewport;
- scroll/focus e demais contratos 0.2.185 permanecem sem alteração.

O primeiro re-gate independente encerrou **TECH READY / UX READY**, mas manteve
**VISUAL NOT READY por lacuna de evidência**, não por defeito: os 10 PNGs iniciais não
capturavam `:hover/:active` do novo strip. A evidência foi então ampliada, sem alterar
fonte de produção, com `trainer-hover.png` e `trainer-active.png`, ambos ligados aos
mesmos 29 source hashes e ao mesmo dist congelado.

O re-gate visual-only final inspecionou normal/hover/active e encerrou a lacuna:

- P0/P1/P2/P3: nenhum;
- **VISUAL READY**;
- hover e active mudam somente a superfície para `rgba(35, 44, 46, .96)`;
- geometria permanece `258×24`, `x84/y197.890625`, 4 bordas de 1px, raio 5px,
  colunas `128px 128px` e divisor 1px;
- sem shadow, scale adicional, card externo ou deslocamento;
- Diamond permanece ~17,6px no mesmo contrato nativo de box/scale.

Os verdicts finais do 0.2.186 são **TECH READY / UX READY / VISUAL READY local**.
O Product Owner confirmou depois **“Validado.”** em 2026-10-07T19:02:22Z e autorizou
explicitamente **commit / push / merge / tag / release**.

Nenhuma validação live foi executada por agentes; o aceite acima é exclusivamente o
resultado reportado pelo Product Owner.
