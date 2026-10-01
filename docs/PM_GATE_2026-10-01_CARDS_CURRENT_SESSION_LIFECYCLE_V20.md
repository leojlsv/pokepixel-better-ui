# PM Gate — Cards CURRENT / Hunt ↔ Expedition (v20)

**Data:** 2026-10-01. **Escopo:** fonte original `G:\pokepixel-hunt-analyzer`
e consumidor `G:\pokepixel-better-ui`, sem operar o jogo.
**Estado:** `TECH CANDIDATE` sintético, **validado pelo Product Owner em
2026-10-01** (confirmação textual: "validado"), **não autorizado para release**
e sem veredicto independente de UX/Visual QA. A confirmação não detalha quais
cenários ou larguras foram examinados.

## Contrato e limites

O Analyzer continua sendo a fonte única da identidade e das transições
automáticas/manuais de Hunt e Expedition. O Better UI recebe somente os campos
allowlisted: `sessionGeneration` (ordinal opaco local ao runtime),
`activityKind`, `startedAtMs`, `endedAtMs`, `status`,
`currentTarget` e `currentSessionSpecies`.

- O `sessionId` privado, `activityInstanceId`/run ID e IDs do transporte
  não são publicados; `sessionGeneration` reinicia após reload do Analyzer.
- `currentTarget` exige encontro confirmado, Hunt em `running`. A
  Expedition em `running` exibe o cabeçalho `EXPEDITION` em Cards e
  não promove um encontro próprio a alvo de Hunt.
- Fora de Expedition `running`, Cards pode exibir a última espécie de
  **somente a sessão CURRENT**, identificada como último da Hunt ou Expedition,
  sem inferir nível/raridade/Shiny/tipos do alvo não live.
- A seleção de espécie usa o mesmo `latestSpeciesEncounter` do título
  CURRENT, com invalidação por `encounterListSnapshotVersion`, não por
  cada `loot.received` ou timer. A Story não seleciona a ficha de espécie.
- `endedAtMs` limpa ao reabrir uma sessão terminada com Resume, sem trocar
  a geração; uma New Hunt/Expedition troca a geração.

## Acceptance & Evidence Matrix

| Critério | Evidência autoral | Gate |
| --- | --- | --- |
| AC-CURRENT-01: login frio restaura só a última espécie CURRENT, nunca History/Atlas | embed runtime + Cards tests | `pass` sintético |
| AC-CURRENT-02: Hunt → Expedition → finish → Hunt reinicia alvo e isola sessão | Replay sintético com WS real em embed e matriz Cards | `pass` sintético |
| AC-CURRENT-03: pausa/retomada/End Hunt/Reset preservam ou trocam identidade corretamente | domain `sessionTiming`, repository e Cards testes | `pass` sintético |
| AC-CURRENT-04: contrato sem IDs privados, com rejeição de campos malformados | public-summary + sanitizer, testes de inclusão/omissão | `pass` sintético |
| AC-CURRENT-05: UI responde com labels/art/raridade sem alegações live falsas | testes DOM/locale e source; PO confirmou "validado" para o candidato, sem detalhar estados ou larguras; novo estado ausente da fixture visual do host | `PO validated`; evidência visual independente insuficiente |
| AC-CURRENT-06: artefato reproduzível e host isolado | tupla v20 e freeze `6/6`, core + visual sintéticos | `pass` somente no host local |

## Validação

- Analyzer: `npm test` **542/542 PASS**, incluindo replay de 4.000+ eventos
  e a regressão End Hunt → Resume com `endedAtMs: null`.
- Better UI: `npm test` **618/618 PASS**. Focado Cards
  `test/coupled-workspace.test.js`: **69/69 PASS**.
- `git diff --check`: exit 0 em ambos os repositórios;
  warnings LF→CRLF são informativos.
- Smoke core `final-v20-core-01.json`: exit0, sem timeout,
  `coreBaselineVerdictCaptured=true`, nenhum filho sobrevivente.
- Smoke visual `final-v20-visual-01.json`: exit0, sem timeout,
  `extendedVisualVerdictCaptured=true`, nenhum filho sobrevivente;
  **51 PNG**. Comparação por SHA com v19: **49/51 idênticos**;
  dois `workspace-cards-history-dual-*-1180.png` têm bytes diferentes;
  a inspeção visual autoral lado a lado das duas duplas não identificou
  alteração evidente em layout, conteúdo ou clipping, mas **não equivale**
  a comparação pixel-a-pixel nem revisão visual independente.

### Tupla congelada create-only

Diretório:
`.local-evidence/coupled-webview2-perf/tuples/cwperf002005-session-lifecycle-po-0128-v20/`

| Artefato | SHA-256 |
| --- | --- |
| `tuple-manifest.json` | `87F276051DA4A8731C7098FFE85F88BEE52F1554A74C314C018D84DCA3A36551` |
| Host sintético v17 reaproveitado | `709F0010C80E0243D118FC1AF54BC4238F010827F1F75681ED16DFA125B6D0C8` |
| Better UI isolado `0.2.128` | `C30C2701F7FED6BA393ED2B066E323341F6170F6F8DDB3E1C7DD07A5A9093AEA` |
| Analyzer embed isolado `1.15.0` | `A1676A60FB7A546E83A52616488C6A3B702E36D6E1EAE3AF2B136DB03F02E7FE` |

O freeze usa `--analyzer-current-source` e preserva `dist/` compartilhado,
host normal, perfis reais e bundles anteriores. O agente não executou testes
em conta real; o Product Owner confirmou a validação do candidato após o
handoff. Na data do congelamento, nenhum commit/push/merge ou publicação havia
sido realizado. Posteriormente, o PO autorizou organizar os conjuntos principais
em commits locais: no Better UI, o host está em `51d7ad9` e o consumidor Cards
em `178e7b7`; a fonte correspondente do Analyzer está em `80be82a`, no branch
`feature/ui-history-chance-shiny`. Os commits registram o código-fonte, não
substituem o manifesto histórico da tupla v20 nem autorizam release. Sem push,
merge ou publicação.

## QA / pendências

A revisão arquitetural independente source-only identificou inicialmente
`endedAtMs` obsoleto após End→Resume (**P1**) e recálculo O(N) extra da
espécie em atualizações de loot (**P2**). Ambos foram corrigidos na fonte
antes do congelamento v20 e cobertos por testes/semântica do CURRENT.
O **recheck final independente do delta source-only** constatou **zero
novos P0/P1/P2** nesses dois pontos. O reviewer não repetiu testes e não
avaliou renderização/UX; esses resultados continuam separados da validação
autoral e não constituem aceite global.

Permanecem pendentes como **evidência independente**: revisão UX/A11y e
Visual QA da tupla exata, inspeção renderizada dos labels `EXPEDITION`/
última espécie em 235–320px e revisão das duas imagens não idênticas.
O aceite textual live do PO está registrado, mas não equivale a uma evidência
discriminada para cada estado ou largura. Não inferir melhoria de CPU/RAM
a partir dos smokes sintéticos; sem autorização de commit ou release.
