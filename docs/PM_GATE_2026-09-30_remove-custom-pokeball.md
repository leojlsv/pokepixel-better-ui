# PM Acceptance & Evidence Record — remoção do Custom Pokéball (2026-09-30)

## Task

- Request: o Product Owner determinou a remoção completa da feature Custom Pokéball.
- Branch: `refactor/team-pixel-art`; baseline da entrega anterior: `0.2.123`.
- Preserve: captura, Master Ball e demais Poké Balls nativas; todas as demais features e alterações locais não relacionadas.
- Scope: registro/runtime, controles, menu, implementação exclusiva, persistência ativa, CSS, asset, injeção do build e testes próprios.
- Out of scope da implementação: validar o jogo ao vivo, alterar o fluxo de captura nativo, apagar preferências antigas diretamente do navegador do usuário. Em 2026-09-30, o Product Owner autorizou explicitamente commit, push e merge do candidato `0.2.124` como referência funcional.
- Write owner: PM/Feature Engineer prime. Auditoria independente: worker QA, somente leitura.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Nenhum módulo/toggle Custom Pokéball é registrado; o menu Treinador não adiciona sua ação. | Ações e grupos nativos e demais módulos. | Registry/config tests + search. | prime | QA | `pass` |
| AC-02 | Não há controller, CSS, monkey patch de `CaptureSequence`, armazenamento ativo ou asset de Custom Pokéball no código entregue. | Captura nativa e sua apresentação. | Source/build search + artifact inspection. | prime | QA | `pass` |
| AC-03 | O build não lê nem embute seu PNG/define; o userscript continua self-contained. | Logo e ícone Pokémon Profile. | Build + artifact search. | prime | QA | `pass` |
| AC-04 | Nenhum teste depende da feature excluída; as regressões restantes passam. | Histórico de Hunts/Loot e demais UI. | Full test suite, `git diff --check`. | prime | QA | `pass` |
| AC-05 | O menu e as preferências não exibem Custom Pokéball na UI resultante. | Foco, responsividade e navegação das demais opções. | Config/DOM synthetic tests; validação visual no jogo pelo PO. | prime | UX/Visual reviewer | `evidence-insufficient` (UX sintético `pass`; render/live pendente) |

## Risks / failure hypotheses

| Risk | Detection evidence | Status |
| --- | --- | --- |
| Import/referência esquecida quebra o startup ou build. | Full suite + build + busca de referências. | `pass` |
| Remove-se por engano a Poké Ball nativa ou o registro de capturas. | Diff/review do escopo e testes de Cards/capture. | `pass` em source e regressões; live pendente |
| Preferências antigas reativam módulo excluído. | Verificar registry/defaults e leitura de preferência persistida. | `pass` |
| Menu ou preferências renderizam entrada obsoleta. | Fixture de DOM + evidência visual de entrega. | `evidence-insufficient` (render/live pendente) |

## Gate results

- Author verification: `node --test --test-reporter=dot test/app-module-registry.test.js` PASS; `npm test -- --test-reporter=dot` PASS; `npm run build` PASS; `git diff --check` PASS. O verificador local de inputs (`.local-evidence/release-input-check.mjs`) também passou (`127` inputs).
- Independent Technical QA: `TECH READY`, P0/P1/P2 = `0/0/0` no snapshot final `0.2.124`, com confirmação de código e bundle sem Custom Pokéball.
- UX/A11y QA: `UX READY`, P0/P1/P2 = `0/0/0`. Revisor independente confirmou menu/diálogo/toggle/ARIA ausentes, preservação de foco/teclado/Escape, Capture Records nativo chamado uma vez e preferência obsoleta inerte; testes de registry/menu/settings `34/34 PASS` e fixture adversarial JSDOM PASS.
- Visual QA: `VISUAL EVIDENCE INSUFFICIENT`. O projeto proíbe acesso do agente ao jogo/Tampermonkey; inspecionar source ou JSDOM não prova a aparência no jogo.
- Exact candidate: `dist/pokepixel-better-ui.user.js`, `@version 0.2.124`, `1.141.929` bytes, SHA-256 `1641B1AB5DB8E21A12D118687772A768C35611415D7D41EA4468BF36D9E4FB76`.
- Busca em artefato: nenhum `custom-pokeball`, `customPokeball`, `Custom Pokéball`, `ppbui-custom-ball` ou ícone embutido; as únicas referências ativas em testes são as assertivas negativas e o teste de preferência legada.
- Preferências `ppbui:custom-pokeball:v1/v2` persistidas previamente no browser tornam-se inertes; a preferência de módulo removido é ignorada no runtime e descartada no próximo salvamento de módulos. Não há código de limpeza de storage no bundle.
- Product Owner: **APROVADO** em 2026-09-30 para o candidato `0.2.124`, conforme resposta explícita "Aprovado". Não foram fornecidos detalhes de verificações executadas em jogo ou imagens de evidência; isso não altera retroativamente o resultado da auditoria visual independente.

## PM decision

**CANDIDATO 0.2.124 APROVADO PELO PRODUCT OWNER EM 2026-09-30.** As evidências
técnicas sustentam a remoção completa do bundle corrente e a preservação do
fluxo nativo por inspeção. A aprovação explícita encerra a decisão pendente do
Product Owner, sem converter a ausência de evidência visual independente em
`VISUAL READY` e sem afirmar que houve testes em jogo não relatados.
O Product Owner autorizou commit, push e merge em 2026-09-30, após aprovar o
candidato como referência funcional. A referência Git final deve ser conferida
com o remoto após a integração.

## Product Owner validation checklist

1. Após instalar a versão candidata e recarregar a página, confirmar que o menu Treinador e a lista de módulos não exibem Custom Pokéball.
2. Confirmar que captura e animações/cores nativas das Poké Balls seguem funcionando, inclusive a Master Ball.
3. Confirmar que Pokémon Profile e demais opções continuam acessíveis.
