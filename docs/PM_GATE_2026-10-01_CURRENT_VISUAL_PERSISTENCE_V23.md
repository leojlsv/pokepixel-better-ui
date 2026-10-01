# PM Gate — Cards CURRENT responsivo e persistência WebView2 (candidato 0.2.129)

**Data:** 2026-10-01. **Branch:** `plan/coupled-webview2-performance`.
**Status:** candidato sintético, não aprovado para release. A versão `0.2.129`
substitui o candidato de teste `0.2.128` após uma correção de legibilidade.
A versão real do Analyzer requerida pelo consumidor é `1.15.1`, ainda em PR
separado. `main`, executáveis normais, `dist/` compartilhado, perfis reais e
instalação no jogo não foram alterados por esta campanha.

## Problema observado e correção

O parecer Visual QA independente da tupla v20 confirmou que o conjunto de 51
screenshots *não mostrava* os estados novos de CURRENT. A nova tupla sintética
v04 produziu 30 frames com esses estados e revelou **P1 visual real**: os
rótulos `ÚLTIMO DA HUNT`, `ÚLTIMO DA EXP.`, `EXPEDITION` e os nomes/metadados
ficavam cortados nos panes estreitos, inclusive a 320/390px.

O Cards agora reorganiza o bloco de combate a até 519px, colocando Team acima
de Player/Target; abaixo de 270px, Team/Player/Target ficam empilhados. O alvo
live conserva raridade, Shiny, nível e tipos apenas quando o Analyzer confirma
um encontro em andamento. A última espécie da sessão CURRENT é marcada como
histórica e não herda esses atributos. A Expedition running conserva o título
`EXPEDITION` e apresenta `Expedição em andamento` sem promover um target da Hunt.
Os estados vazios e indisponíveis não reaproveitam um sprite anterior.

## Matriz de aceitação e evidências

| Critério | Prova disponível | Limite |
| --- | --- | --- |
| AC-VIS-01, login/entre encontros/paused/ended da Hunt sem alvo live | Frames em pt-BR a 235/320/390; assert de texto, badge e pane | Apenas summary sintético, não login real. |
| AC-VIS-02, Hunt running com alvo confirmado | Frames com Charizard/EPIC/Shiny/Lv 90 apenas live | Resposta tardia de sprite é testada em JS, não em gameplay. |
| AC-VIS-03, Expedition running/paused/ended | Frames sem target da Hunt; espécie da Expedition encerrada é própria | Replay real de Expedition e multi-tab pertence ao PO. |
| AC-VIS-04, nova Hunt vazia e Analyzer indisponível | Frames com alvo limpo ou mensagem indisponível | Somente apresentação estática. |
| AC-VIS-05, geometria estreita | Capturas do WebView2 real em páginas `file://` locais, 235/320/390px | 235px é diagnóstico: host produtivo usa mínimo de 320px. Faltam limites 269/270 e 519/520, DPI/zoom e teclado/leitor de tela. |
| AC-IO-01, cleanup após falha no Save final | Smoke FormClosed sintético Create/Flush/Replace com exit 1 esperado; Save positivo exit 0 | Hooks lançam antes das operações, não representam falha física de kernel. |
| AC-IO-02, aviso visível e seguro em falha de Save | Fonte mostra um MessageBox com texto fixo PT-BR após dispor panes/menu/timer/tooltip, sem caminhos/IDs/mensagens de exceção | Ainda falta captura Windows de caixa aberta/focável e teste de comportamento se ela não puder ser exibida. |
| AC-PERF-01, ganho de CPU/RAM/latência comprovado | Contadores e logs sintéticos | Falta A/B comparável e autorização de alegação de ganho global. |

## Tupla integrada e proveniência

**Tupla exata:**
`.local-evidence/coupled-webview2-perf/tuples/cwperf-current-matrix-po-20261001-v07/`

| Conteúdo | SHA-256 |
| --- | --- |
| `tuple-manifest.json` | `99D32D50096385032A9E557B51BD7D0DE36AF416A91400F5B504AA3744F08347` |
| Host C# sintético, fonte em staging exclusiva | `31C1B46334F3690F83DA54BC4227856BAFFEF649AEEEF02E1886079D99EC65C1` |
| Better UI `0.2.129`, compilado isoladamente | `759D0017991E7DC8CBE649493D47930DD244878268310C4DDF2634151760B6AB` |
| Analyzer embed `1.15.1`, compilado da fonte atual | `178595F668860C8064C743C58DC36C5FEDB2FE66A26C55946A079042BD8F8DD3` |

`measurements/current-matrix-visual-07.json`: **exitCode=0, sem timeout**;
51 capturas do host original mais **30 screenshots adicionais** do topo CURRENT,
`workspace-current-<estado>-ptbr-<235|320|390>.png`. `Freeze-PerformanceTuple`
verificou seis arquivos congelados por hash; os bundles foram copiados de outra
tupla imutável com verificação independente de SHA, e não de `dist/` normal.
O par de código de interface/Analyzer é idêntico às fontes atualmente editadas
exceto pelos caminhos sintéticos exclusivos do host; o manifesto mantém a
proveniência completa da compilação.

**Tentativas históricas não apagadas nem promovidas a PASS:** v01/v02 foram
reprovadas por validação de tamanho de pane equivocada ou abertura intermitente
do Overflow; v03/v04 chegaram a produzir 30 PNG, mas Visual QA encontrou
clipping na v04; v05 detectou um assert antigo de altura fixa (164px) que não
aceitava o reflow intencional, corrigido e reexecutado na v06/v07. Não usar
essas falhas como evidência de correção ou como medidas de performance.

## Persistência e limites do aviso

O host `winexe` não garante que stderr e `ExitCode=1` sejam vistos pelo usuário.
O ramo normal de `CompleteShutdown` agora apresenta aviso WinForms fixo em
português **somente depois do cleanup**, se houver falha `settings:*`; a
exceção do próprio aviso não altera o código de saída. O código não reintroduz
bloqueio de música, captura de tráfego nem preferências legadas.

Na tupla sintética anterior v04, os testes específicos
`--smoke-shutdown-save-{create,flush,replace,success}` produziram os códigos
**1/1/1/0 esperados** e verificaram os dois panes descartados, o estado
anterior preservado nos erros e Save final positivo. O smoke propositalmente
não apresenta uma caixa modal na execução invisível. Falta testar `File.Create`
e `File.Replace` com bloqueios reais em diretório descartável do Windows,
o diagnóstico visível e a interação com a caixa; `Flush` físico requer um
ambiente de fault injection/volume descartável. Esses resultados não autorizam
afirmar que o erro de disco físico ou a UX de shutdown estão fechados.

## Gatilhos finais de integração

O `npm test`, a compilação C# isolada, o CI Node e o CI Windows C# fornecem
evidência técnica e não substituem inspeção visual independente nem o PO live.
A aprovação textual do PO sobre v20/`0.2.128` **não se transfere automaticamente**
ao código responsivo/host da versão `0.2.129`. Antes de merge/tag/release:

1. Reabrir as imagens da tupla exata v07 em Visual QA independente (inclusive
   o P1 de clipping original); manter resultados de UX interativa separados.
2. PO validar instalação exata de Analyzer `1.15.1` + Better UI `0.2.129`
   em login frio, Hunt→Expedition→Hunt, paused/End→Resume, Game↔Cards, F5 e
   seleção de contas/menus, sem automação de gameplay por agentes.
3. Fechar ou registrar formalmente como pendentes as lacunas de falhas físicas
   de I/O, diagnóstico WinForms, Overflow e ganho de performance comparado.
4. Manter ambos os PRs como draft enquanto houver gate obrigatório aberto.

Nenhum artefato da pasta ignorada `.local-evidence/` é incluído em commit.
