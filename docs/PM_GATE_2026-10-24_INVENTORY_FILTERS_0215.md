# PM Gate — Inventory Pokémon Filters (candidato 0.2.215)

**Origem:** captura do Product Owner em 2026-10-24 mostra vários blocos completos de filtros Pokémon acumulados verticalmente na Inventory, após interações. O módulo ativa uma nova instância de controles a cada `scene.refresh()`; quando o jogo preserva o toolbar e reconstrói apenas a grade, nenhum ancestral remove os filtros anteriores.

**Base:** tag publicada `v0.2.213`, com corretivo Awakening local `0.2.214` transportado sem alterar seu escopo. Branch isolada `fix/inventory-filters-0.2.215` em `work/inventory-filters-0.2.215`. A build original `0.2.214` permanece na sua worktree para rollback.

## Aceite / evidência exigida

- `AC-INV215-01`: zero ou um painel Better UI de filtros Pokémon por Inventory: um quando a categoria Pokémon está ativa, nenhum ao sair dela. Nativo pode preservar toolbar e reconstruir apenas grid.
- `AC-INV215-02`: refreshes sucessivos (incluindo cliques em controles/filtro, atualizações nativas e páginas adicionais) não acumulam filtros, elementos invisíveis ou listeners que voltem a criar blocos anteriores.
- `AC-INV215-03`: valores dos filtros, Pokémon exibidos e foco em teclado persistem durante refresh manual sem paginação e após o próprio `change` do filtro. O toolbar, slots e handlers originais não são reconstruídos pela correção.
- `AC-INV215-04`: uma eventual injeção antiga que deixou um painel obsoleto é saneada uma única vez no mount. Durante refresh, remover apenas a referência da instância atual em O(1), evitando varredura recorrente de centenas de milhares de slots DOM.
- `AC-INV215-05`: cleanup restaura os métodos nativos e remove o painel do Better UI; remount e troca de categoria não herdam blocos anteriores. Trade, Storage e outras melhorias não sofrem alteração funcional.
- `AC-INV215-06`: preserva todo o candidato 0.2.214 (Awakening à frente do toolbar e Pokémon pinado), que foi construído sobre a release 0.2.213.

**Reprodução:** `test/pokemon-tools.test.js` contém fixture de refresh parcial com toolbar estável. Antes da correção, falha com `2 !== 1` no primeiro refresh; depois, percorre 8 refreshes, verifica seleção, foco, troca de categoria, resíduos de montagem antiga e cleanup.

**Validação técnica local (2026-10-24):** regressão dirigida RED (`2 !== 1`) → GREEN; `npm run validate` PASS, **1.146/1.146 testes PASS**, zero falhas, zero skipped; build PASS. `git diff --check` PASS. A revisão independente read-only do worker-3 concluiu **P0=0 / P1=0 / P2 material=0**, incluindo remount, hot reinjection, foco, estado, troca de categoria, cleanup, Trade/Storage e custo por refresh. Montagens independentes simultâneas no mesmo root permanecem uma hipótese arquitetural, sem regressão demonstrada neste candidato.

**Artefato local verificado:** `G:\pokepixel-better-ui\work\inventory-filters-0.2.215\dist\pokepixel-better-ui.user.js`, **1.905.613 bytes**, SHA-256 `846366FD68B3DD21911E05E0A5B249EBC9293F728D3FF1BFEFC70A876DF6F6C4`, `@version 0.2.215` tanto no `.user.js` quanto no `.meta.js`. A busca no bundle gerado confirmou o seletor `native-action-city-geneticist` com camada `2147483400` e o marker/ciclo de liberação dos filtros Inventory. Build local não equivale a release publicada.

**Isolamento:** `fix/inventory-filters-0.2.215` contém somente mudanças locais esperadas; worktree oficial `work/release-public-0.2.213` permanece limpa (`main...public/main`). Nenhum commit, merge, push, instalação, deploy ou publicação foi executado nesta entrega.

**Aceite:** `TECH READY` para entrega de candidato local, mas `VISUAL EVIDENCE INSUFFICIENT` e `pending in-game validation`. Confirmação visual e funcional no PokePixel/Tampermonkey é responsabilidade exclusiva do Product Owner. Nenhuma autorização de release decorre da aprovação técnica.

**Publicação:** proibida sem aprovação explícita. `main`, tag publicada e `userscript/release-lock.json` da 0.2.213 permanecem inalterados.
