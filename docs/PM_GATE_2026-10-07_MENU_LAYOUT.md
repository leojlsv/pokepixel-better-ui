# Menu Bar — personalização por treinador

Status: funcionalidades de `0.2.182` **aprovadas in-game pelo Product Owner** em
2026-10-07T15:54:20Z, com revisão de escopo solicitada para remover restrições de
posição e permitir 10–15 slots. Essa revisão é registrada em
`PM_GATE_2026-10-07_MENU_FREEDOM.md`. Evidências históricas abaixo pertencem a `0.2.182`.
O candidato recebeu **TECH READY, UX READY e VISUAL READY local**.
Autorização 2026-10-07T14:46:55Z; baseline aceito `0.2.181`.
Aceite funcional do Product Owner recebido; não cobre a implementação posterior.
Escopo: `docs/modules/menu-bar-customization-proposal.md` e seus AC-MBC-01..10.

## Responsabilidades e evidências

Prime: PM, integração de runtime e documentação. Worker-1: modelo/armazenamento e
respectivos testes. Worker-2: editor/estilos e respectivos testes. Nenhum autor
fornece o parecer final sobre seu próprio domínio; revisões posteriores são read-only.

Worker-1 revisou integração de Prime; Worker-2 revisou modelo/storage de Worker-1 e
owner guard de Prime; Worker-3, sem autoria de implementação, revisou editor/runtime,
casos cruzados e evidência visual. Alterações corretivas retornaram aos donos e foram
revisadas novamente, sem usar autoria como aprovação independente.

| Critério | Evidência exigida | Estado |
| --- | --- | --- |
| AC-MBC-01 | A/B/A, reload, identidade pendente e eventos de logout | PASS; testes runtime/storage/owner e re-gate independente |
| AC-MBC-02 | Ordem/aplicação em rebuild completo/parcial, locale, Game/Cards e sync estável | PASS; testes e probes independentes incluindo rascunho preservado |
| AC-MBC-03 | Mesmo nó/listeners/badges/atalhos; editor nunca despacha navegação | PASS; native-node, popup, City e window-capture regressions |
| AC-MBC-04 | Ausência temporária, retorno e visibilidade/restrições nativas | PASS; absent-action e compatibility-recovery regressions |
| AC-MBC-05 | Limite 13, duplicatas/locais, Cancelar/Restaurar/Salvar e rollback | PASS; model/editor/runtime e probes de falha cruzada |
| AC-MBC-06 | Sistemas fixos, City contextual, drag/collapse nativos | PASS; testes de sistemas, Hunt Controls e bar existentes |
| AC-MBC-07 | Editor mouse/teclado, foco, Game/Cards e render representativo | PASS; UX READY e VISUAL READY independente nos oito renders |
| AC-MBC-08 | Orientação/posição por owner, clamp, popups e Buff Strip | PASS; testes e VISUAL READY local H/V/viewport |
| AC-MBC-09 | Storage indisponível/corrupto/futuro, conflito e troca de owner durante edição | PASS; testes e probes independentes de revisão/quota/owner |
| AC-MBC-10 | Desativar/restaurar/reativar, fingerprint e revisão independente | PASS; testes/build/release e hashes independentes do candidato |

## Contratos de implementação

Layout lógico: `{version:1,bar:[id],groups:{"group:city":[id],...},orientation,position}`.
IDs: `native:*`, `betterui:pokemon-profile`, `city-shortcut:*`, `group:*` e
`system:card-mode`/`system:module-controls`. Um local por item. Slots de sistema
reservados no final; Inventory/Hunts/Mailbox diretos; trio de recompensas em Goals.
Return to City é contextual e não faz parte da preferência salva.

Somente Menu Bar aplica placement. Os módulos externos registram seus nós e mantêm
handlers/lifecycle próprios. Salvamento aplica/revalida o layout e preserva rollback;
dados de conta não resolvida nunca recebem uma chave genérica.

## Fonte estática de integração

`work/menu-layout-182/PersistentHUD.js`, obtido como asset público em 2026-10-07:
1546–1590 mantém o listener no botão e resolve o grupo atual com `closest()`;
1555–1566 mantém badge no destino; 1621–1625 e 2021–2033 associam o agregado ao grupo
Activities. Settings usa o mesmo dispatch de destino. A consulta não acessou uma
sessão do jogo. Nenhum asset público é incorporado ao userscript por essa leitura.

A metodologia local `.skills/ui_ux_pro.md` e MASTER guiam o editor. Checklists
externos não localizados não constituem evidência. Render local e revisão de
aparência são exigidos antes da entrega; testes não aprovam aparência.

## Adaptação justificada de atalhos nativos

`PersistentHUD.js:1775-1776` registra `window keydown` em capture;
`2451-2465` ignora campos editáveis, mas não botões de um modal. Portanto bloquear
apenas bubbling no editor não impediria Settings/O ou outros atalhos de disparar.
O singleton expõe `_toolbar` em `3783,3827,3899`, e o listener delega dinamicamente
a `handleShortcut`. O adaptador `layout-shortcut-guard.js` intercepta somente esse
método enquanto o modal está aberto, mantém `this`/retorno/argumentos ao delegar e
restaura o descriptor original somente se ainda for dono do método. Wrappers retidos
ficam inertes após cleanup. Nenhum EventTarget global, API de navegação, regra de
combate ou tráfego é modificado. Essa exceção estreita é necessária para o contrato
aprovado de edição passiva e tem testes de capture preexistente e restauração.

## Correções verificadas durante revisão

- Fallback de capacidade recupera com mudança de visibilidade e volta ao nativo se
  um item desconhecido reaparece; não há retry/remount contínuo enquanto estável.
- IDs numéricos não finitos não se tornam owners string. Saves verificam tokens
  novamente quando uma revisão externa é observada antes de `setItem`.
- Sobrescrita explícita de registro protegido com falha de quota mantém o layout
  escolhido na sessão; base desconhecida não oculta um registro protegido recém-lido.
- Rebuild parcial/completo do mesmo owner preserva o editor e seu rascunho. Mudança
  de owner ou desativação ainda encerra a edição.
- Gravação de posição que observa arranjo externo aplica a ordem/grupos/orientação
  lidos, evitando divergência permanente entre DOM e registro. Somente gesto no
  handle nativo grava posição; pointerup de um botão do editor não cria conflito.

## Candidato e evidência local

- `npm test`: **656/656 PASS**; suíte focada de menu/editor/storage/runtime,
  Card Mode, Module Controls e Hunt Controls: **132/132 PASS**.
- Build e release contract: PASS para `0.2.182`.
- `dist/pokepixel-better-ui.user.js`: **1,467,016 bytes**;
  SHA-256 **F9246583CEFED7F16F513E2BF230FF49AECE48A7E74F37B73DD185B8106F4E30**.
- Render: `node work/menu-layout-182/render.mjs build`, depois
  `node work/menu-layout-182/render-cdp.mjs`. Chromium isolado, um perfil local,
  sem sessão de jogo; CSP nega rede. Viewports exatos 1280×900, 720×960 e 390×844.
- `metrics.json` e oito `*.metrics.json` vinculam quinze fontes atuais a cada PNG.
  Vistas: desktop, cards, conflict, conflict-resolve, mobile, mobile-details, saved,
  vertical. Todas mantêm modal na viewport e nenhum overflow horizontal dos painéis
  medidos. Preview usa scroll interno em telas estreitas. Barras demonstradas têm
  treze posições; H/V são verificados em 1280×900, não certificados em toda resolução.
- `conflict-resolve.png` mostra Recarregar/Sobrescrever visíveis/habilitados;
  `mobile-details.png` mostra Mover para/Posição/Aplicar alcançáveis via Editar
  selecionado, com footer persistente. Rótulos longos de miniaturas podem quebrar
  dentro da célula, mantendo texto e nome acessível completos.
- TECH READY independente para modelo/storage/owner e integração; revisão de
  Worker-3 fechou quatro P2 com onze testes selecionados e cinco probes próprios,
  incluindo funções nativas extraídas do asset e fluxo real de overwrite+quota.

## Validação do Product Owner

Confirmar versão **0.2.182** no painel Better UI antes de testar. Abrir Personalizar,
mudar a ordem de Hunts, mover Settings para Ferramentas e promover Pokémon Profile.
Salvar, recarregar e conferir a ordem. Repetir numa segunda conta e retornar à
primeira. Testar Cancelar com rascunho, orientação vertical e atalhos de teclado com
o editor aberto; nenhuma janela do jogo deve abrir durante a edição. Durante uma
caçada, Return to City permanece o primeiro item contextual de Cidade.

Nenhum commit, merge, instalação ou publicação foi feito nesta entrega.

## Parecer final e autorização de handoff

Worker-3 emitiu **TECH READY, UX READY e VISUAL READY (somente evidência local)**,
sem P0/P1/P2 remanescente. Inspecionou os oito PNGs antes dos metadados, conferiu
dimensões/hashes das imagens e quinze fontes, alcançabilidade dos controles de
conflito e edição narrow, além do artifact/hash final. Quatro testes finais próprios
confirmaram Editar selecionado, gesto/clamp por owner, interleaving de posição e
pointerup de editor sem falsa revisão. Não repetiu a suíte/build que pertencem a Prime.

PM autoriza a entrega do candidato exato **0.2.182** para validação do Product Owner.
O manifest local `work/menu-layout-182/candidate.json` preserva os fingerprints.
Isso não constitui aceite in-game nem autorização de merge/publicação.
