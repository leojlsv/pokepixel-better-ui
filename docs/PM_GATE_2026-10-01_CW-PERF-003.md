# CW-PERF-003 — alcance do histórico público e decisão de otimização

**Estado:** investigação de contrato concluída; alteração do protocolo ou do renderizador **adiada**, sem candidato de implementação. A base de trabalho continua `plan/coupled-webview2-performance`, com CW-PERF-001/002 preservadas.

## Contrato observado

- O Analyzer efetivamente limita `specialHistory` aos **32 eventos especiais mais recentes** em `../pokepixel-hunt-analyzer/userscript/card-presentation.js` (`SPECIAL_HISTORY_LIMIT`, `retainNewest`, `slice`) e reaplica o limite na projeção pública em `userscript/public-summary.js` (`copySpecialHistory`). `tests/unit/public-summary.test.js` comprova a saída com 32 entradas mesmo para 1.000 entradas de origem.
- `getSummary()` retorna clones dos arrays e entradas a cada chamada. A identidade do array, `capturedAtMs`, contadores agregados e o tamanho do histórico **não** provam que os eventos não mudaram. O Analyzer possui revisões internas, mas não publica uma revisão de coleção ou epoch de sessão com esse contrato.
- O consumidor Better UI, por segurança, aceita arrays de `specialHistory` maiores que 32 e não os trunca (`src/modules/coupled-workspace/controller.js`). O Cards atual compara conteúdo e preserva nós em append/edição (`cards.js`); os testes H=1.201/10.000 descrevem apenas fixtures artificiais compatíveis com o consumidor, **não** dados atingíveis pela API pública atual.

## Evidências e limites

- Baseline congelada anterior à 002, H=32/1 pane/100 eventos em Node/JSDOM: leitura p50 **0,0677 ms**, p95 **0,1288 ms**; renderização Cards total p50 **3,0649 ms**, p95 **6,9867 ms**. Esses valores englobam mais que o histórico e não medem Chromium, GPU, jogo, CPU total ou heap em uso real. Fonte: `cwperf001-20260930-baseline/measurements/cards-synthetic-100-clock-fixed.json` sob `.local-evidence/coupled-webview2-perf/tuples/`.
- Diagnóstico adicional **pós-002**, sem modificação de produção, `node tools/coupled-workspace-webview2/perf/benchmark-reconcile.mjs --scenario=history --histories=32,1200 --panes=1 --filters=all --iterations=10`: H=32 mediana append/edit/reset **5,772 / 5,5014 / 11,7482 ms**; H=1.200 **69,1876 / 57,2365 / 525,3154 ms**. Relatório `.local-evidence/coupled-webview2-perf/cwperf003-before-h32-1200-n10.json`, SHA-256 `F4EA068591833C313A5784E3CBFFE13AB435704B7000F374B3D011B7F1F9FC71`. São só dez amostras por fase, sem p95 confiável, com custo de fixture/assertions e observação DOM. H=1.200 é estresse contrafactual.
- QA arquitetural independente (somente fonte): sem revisão/epoch públicos não há chave correta para memoização segura. A otimização do histórico de longo prazo depende de contrato aditivo mantido pelo Analyzer e testes próprios de append, edição, remoção, reorder, reset, sessão, reconexão e troca de provider, além de preservar filtros, scroll, foco, relógio relativo e disponibilidade.

## Decisão PM de escopo

**Adiar alteração CW-PERF-003 no contrato atual:** a hipótese de histórico público completo H=1.200/10.000 não se aplica à API v1, e a medição não isolou custo relevante de `specialHistory` dentro do render H=32. Não alterar silenciosamente o limite do Analyzer ou usar referências/timestamps como chave de cache. A obrigação de preservar todos os eventos **publicados** (até 32 hoje) continua; histórico integral de uma Hunt seria novo contrato de produto, com owner e QA no Analyzer. O benchmark sintético H-grande permanece como ensaio de resistência do consumidor, rotulado como tal.

O próximo experimento independente da roadmap aprovada é **CW-PERF-005**, gravação de configuração e atualização redundante de Game Dock no host WinForms, que já possui contadores sintéticos específicos. A decisão sobre 003 não altera o candidato 002 nem aprova release. A validação em jogo continua exclusivamente com o Product Owner.
