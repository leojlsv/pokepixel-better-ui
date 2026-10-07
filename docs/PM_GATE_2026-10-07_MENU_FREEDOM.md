# Menu Bar — liberdade de destinos e 10–15 slots

Autorização/correção do Product Owner: 2026-10-07T15:54:20Z.
As funcionalidades de `0.2.182` foram aprovadas. O usuário rejeitou as restrições
de destinos fixos e determinou capacidade escolhida pelo jogador entre 10 e 15.
Baseline entregue: 1.467.016 bytes, SHA-256
`F9246583CEFED7F16F513E2BF230FF49AECE48A7E74F37B73DD185B8106F4E30`.
Candidato desta mudança: `0.2.183`; **VALIDADO E APROVADO IN-GAME** pelo Product Owner
em 2026-10-07T17:03:19Z, separadamente do aceite anterior.

## Escopo e decisões

Todos os atalhos navegáveis do catálogo podem ser ordenados na barra ou colocados
em qualquer grupo, incluindo Inventory, Hunts, Mailbox, Settings, Cards/Game,
Better UI e destinos de recompensa. A cauda de sistema deixa de ser obrigatória.
Os grupos são contêineres de primeiro nível; não se introduz grupo dentro de grupo
nem duplicação de ações. Os controles de arrastar/minimizar a própria barra e a
ação contextual Return to City mantêm o contrato operacional existente.

Capacidade `slotCapacity`: inteiro entre 10 e 15, por treinador. Valor inicial 13
preserva o layout existente. A redução pode deixar rascunho temporariamente
sobrelotado: o editor explica a diferença e impede Salvar até o jogador liberar
espaço ou ampliar capacidade. Nunca deslocar/ocultar destinos para resolver isso
silenciosamente. A geometria horizontal segue a capacidade selecionada.

Layout `version:2` amplia o modelo e lê layouts `version:1` preservando ordem,
grupos, orientação e posição com capacidade inicial 13. Upgrade de registro ocorre
somente em escrita autorizada; dados desconhecidos/futuros continuam protegidos.

## Acceptance & Evidence Matrix

| AC | Resultado observável | Evidência requerida | Estado |
| --- | --- | --- | --- |
| AC-MBF-01 | Inventory/Hunts/Mailbox/Settings e controles Cards/Game/Better UI aceitam barra ou qualquer grupo e qualquer ordem válida. | Modelo + DOM/handlers + editor | PASS; TECH/UX/VISUAL local |
| AC-MBF-02 | Slots oferece exatamente 10–15, persiste por treinador e layouts antigos mantêm 13 sem reset. | Modelo/storage/A–B–A/reload | TECH PASS |
| AC-MBF-03 | Redução abaixo da ocupação mantém rascunho editável, apresenta excesso e só salva quando válido; Cancelar deixa runtime intacto. | Editor + render de estado inválido/recuperado | PASS; TECH/UX/VISUAL local |
| AC-MBF-04 | Cards/Game agrupado muda modo; Better UI agrupado abre preferências e Personalizar sem ficar oculto pelo popup pai; foco/cleanup/rebuild sobrevivem. | Integração + teclado + render em Game/Cards | PASS; TECH/UX/VISUAL local |
| AC-MBF-05 | Notificações de destinos movidos mantêm dados nativos e associação correta; nenhuma ação é duplicada ou disparada pela edição. | Recompensa/mail badge e listeners | TECH PASS |
| AC-MBF-06 | Geometria 10/13/15 H/V mantém destinos alcançáveis, tamanho legível e popups na viewport; capacidade real acompanha o modelo. | Render local exato + métricas | PASS; UX/VISUAL local no recorte documentado |
| AC-MBF-07 | Owner, conflito, erro storage, rascunho same-owner, Unknown DOM fallback, drag/collapse e Profile aprovado não regridem. | Testes/regates/build/hash | TECH/build/hash PASS |

## Ownership

Prime: modelo/runtime/integrações/persistência, documentos e candidato.
Worker-2: editor/estilos/testes do editor. Revisão final por autor independente.
Nenhuma instalação, abertura/controle do jogo, commit, push ou merge nesta rodada.

## Evidência do candidato congelado

- `node --test "test/menu-bar*.test.js" test/hunt-controls.test.js test/card-mode.test.js test/module-controls.test.js`: **143/143 PASS**.
- `npm test`: **667/667 PASS**.
- Build, `release:check` (`v0.2.183`) e `git diff --check`: **PASS**.
- `dist/pokepixel-better-ui.user.js`: **1.477.351 bytes**; SHA-256
  `B3FE1A53181B2BCE248F1B6898EDAB742379ABD8A9AE1B6BF8FD1CD31FBA959D`.
- `work/menu-layout-183/verify-candidate.mjs`: **PASS**, vincula 17 fontes e 14 PNGs,
  confere o bundle e os hashes inalterados do Pokémon Profile aprovado.
- Renders usam módulos de produção, DOM/dados sintéticos, stylesheet nativa retida,
  CSP sem rede e perfil Chromium isolado. Geração: `render.mjs build` seguido de
  `render-cdp.mjs`, ambos em `work/menu-layout-183/`.

Cobertura visual disponível: editor com 10/13/15 slots e rascunho 13/10;
preferências agrupadas Game/Cards; barras H/V com 10/13/15 em 1280×900; editor e
controles de detalhe em 390×844. Nos cenários de barra desktop, não há destinos
fora da viewport nem interseção com arrastar/minimizar. Os popups de preferências
e seus botões Personalizar recebem hit-test. O editor estreito tem zero overflow
horizontal e Mover para/Posição/Aplicar alcançáveis. Esta evidência **não certifica
a barra principal horizontal em 390px**, cuja limitação anterior permanece fora
do recorte validado; os dados de `railOutside` são retidos, não descartados.

## Revisão independente

**TECH READY** no escopo desta mudança. Dois P2 independentes foram corrigidos e
regatados: grupo Shop vazio desaparecia do catálogo; Hunt Controls sobrescrevia
notificações de City no nome acessível. Grupos vazios agora podem ser repovoados;
`groupAriaLabel()` compõe contexto e notificações sem acumular texto/ARIA em sync.
Probes também verificaram 99+ literal, zero, retorno de foco, sistemas-only groups,
fallback de capacidade, migração sem escrita e rascunho reparado pelo editor real.

Parecer final independente: **TECH READY, UX READY e VISUAL READY local**, sem
P0/P1/P2 material no escopo AC-MBF. O revisor inspecionou primeiro os 14 PNGs, depois
confirmou 17/17 hashes de fonte e 14/14 hashes/dimensões/coleções das imagens,
stylesheet e CSS compartilhado, logs e userscript exato. A prévia de quinze ícones
usa rolagem interna; o v15 reserva espaço para o último item e minimizar.

PM autorizou a entrega do candidato conferido para validação do Product Owner.
O parecer visual local estreito continua limitado ao editor e não certifica a barra
horizontal em 390px.

## Aceite in-game do Product Owner

Em **2026-10-07T17:03:19Z**, o Product Owner confirmou: **“Bar custom validada e aprovada.”**
A pendência de validação in-game da barra customizável `0.2.183`, com liberdade de
destinos e capacidade de 10–15 slots por treinador, está **encerrada**.

O aceite refere-se ao userscript entregue de **1.477.351 bytes**, SHA-256
`B3FE1A53181B2BCE248F1B6898EDAB742379ABD8A9AE1B6BF8FD1CD31FBA959D`,
conferido sem alteração. A confirmação é da feature; não acrescenta cenários ou
resoluções específicos aos testes locais documentados acima.
Esta atualização registra o aceite em documentação/metadados, sem nova versão,
alteração do runtime, commit, push ou merge.
