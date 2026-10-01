# PM Gate v24 — CURRENT, persistência e evidência Windows

**Data:** 2026-10-01. **Branch:** `plan/coupled-webview2-performance`.
**Entrega:** candidato sintético Better UI `0.2.129` + Analyzer `1.15.1`, ainda sem
aprovação no jogo. Este documento complementa o gate v23; não altera o histórico
nem a conclusão limitada de sua tupla v07.

## Resultado observável e fonte de verdade

- Cards conserva **ALVO** somente enquanto o Analyzer confirma um encontro live.
  Fora disso apresenta apenas a última espécie da **sessão CURRENT** atual:
  `ÚLTIMO DA HUNT` / `ÚLTIMO DA EXP.`. Não consulta History nem herda a espécie da
  Hunt anterior ao entrar em Expedição; atributos live não são inferidos.
- Uma Expedição running sem encounter tem título `EXPEDITION` e metadado
  `Expedição em andamento`. Trocas e limites de sessão permanecem do Analyzer.
- A investigação/bloqueio de `.ogg` continua encerrada; não há interceptação de
  música, nem alteração de políticas de rede nesta etapa.

## Visual: regressões encontradas e resolvidas

O novo assert mede texto renderizado dentro do Target (`Range.getClientRects`),
layout, largura interna e scroll horizontal do documento, para dez estados
CURRENT em **235, 269, 270, 319, 320, 390, 519 e 520 px**. Abaixo de 320 px a
fixture permite desvio interno de até 5 px por ser inferior ao mínimo produtivo,
mas continua exigindo nome, rótulo e metadados inteiramente dentro do cartão.
Desde 320 px, `root.scrollWidth - root.clientWidth <= 1`, assim como body e
document. O teste é sintético (`file://`), não simula gameplay real.

| Evidência preservada | O que demonstrou |
| --- | --- |
| v08/v09: falha a 270 px | `ÚLTIMO DA HUNT` ultrapassava o cartão e produzia scroll interno; corrigido empilhando Team/Player/Target abaixo de 320 px. |
| v11: falha a 520 px | Metadado histórico ficava cortado no início do layout de três colunas; corrigido com quebra de linha. |
| v13: falha `paused-hunt` a 235 px | `root.scrollWidth/clientWidth=229/225`; 4 px de overflow interno *diagnóstico* abaixo do mínimo normal. Registrado, sem promover uma promessa de zero overflow a 235 px. |
| v14/v17 | Extensão CURRENT passou; revisão visual independente da v14 abriu 28 PNG v14 + 8 PNG v07, P0=0/P1=0, com ressalva P2 sobre tipos a 520 px. Revisão seguinte abriu dez imagens adicionais v17/v14 e confirmou que os tipos agora quebram linha por inteiro, P0/P1/P2=0 **nesse delta**. |
| v19 | Tupla final reconstruída das fontes após os ajustes. Execução CURRENT estendida exit 0, sem timeout; 51 frames gerais + 80 CURRENT = **131 PNG**. Parecer independente render-first abriu 8 PNG v19 e 8 correspondentes v17, em quatro estados a 320/520 px: **VISUAL READY apenas nessa amostra, P0/P1/P2=0**. |

Em 520 px, `Pedra`/`Terra` no Pokémon ativo e `Fogo`/`Voador` no
target live ficam completos em duas linhas, preservando nome, níveis, HP/EXP,
`EPIC` e `SHINY`. As fontes não ocultam os tipos para contornar a geometria.

**Tupla final exata:**

```
.local-evidence/coupled-webview2-perf/tuples/cwperf-settings-current-po-20261001-v19/
tuple-manifest.json SHA256: FB5D3E952C517D9AB39DB09B37AD344B308C78D3DB7EE6D7BB913C6CE5D6CB89
host candidate SHA256:   CC25DD2AA90F0B04FE022139FF58366CA0798E55B8DFAB1BD03328C502A02F0C
Better UI 0.2.129 SHA: 2E71BB108095A3455970DA7D17CE14B460FF89A6F8EF3AD7CA2D3C000B9011F2
Analyzer 1.15.1 SHA:  178595F668860C8064C743C58DC36C5FEDB2FE66A26C55946A079042BD8F8DD3
measurements/settings-current-visual-19.json: exitCode=0; timeout=false
```

O Bundle Better UI da v19 **não é byte a byte o da v07**, embora ambos sejam
candidatos não publicados com metadata `0.2.129`. Usar o SHA da v19 para
identificar o arquivo em validação. Não editar as tuplas, nem herdar aceite de
um bundle anterior só pela versão declarada.
Os dez arquivos C# do manifesto v19 e os sete arquivos Better UI declarados
na proveniência do bundle v15 foram conferidos contra as fontes do branch:
**10/10 e 7/7 hashes coincidem**. O indicador `sourceWorktreeDirty` registra a
compilação anterior ao commit e não deve ser regravado após a publicação.

## Preferências: testes físicos, concorrência e UX

- `WorkspaceSettingsStore.LoadOrDefault(out canSave)` não permite gravar
  defaults sobre um JSON existente que esteja bloqueado, malformado, ilegível
  ou de versão futura. Arquivo realmente inexistente pode ser criado, mas
  alterações externas entre Load e Save são detectadas por comparação SHA-256.
- Saves cooperativos do **mesmo logon Windows** usam mutex por caminho durante
  comparação/gravação; uma segunda instância com snapshot obsoleto recebe
  conflito, sem sobrescrever os bytes mais recentes. Não foi provada exclusão
  simultânea entre sessões Windows distintas ou entre versões antigas do host.
- Se Save falhar durante uso normal, novas gravações dessa sessão são
  desativadas e um alerta fixo pede reabrir o app; a interface não promete
  retries automáticos silenciosos. No fechamento, o alerta de Save aparece
  com a janela como owner, após cleanup e antes de FormClosed.
- `Test-WorkspaceSettingsPhysicalIo.ps1` compila harness descartável e testou:
  bloqueio **real** de `File.Create` e `File.Replace`, preservação bytewise e
  fingerprint, `.tmp`, recuperação, leitura bloqueada, JSON malformado/versão
  futura, missing→created, dois threads tentando gravar o mesmo snapshot
  (exatamente um sucesso/um conflito) e reacesso ao mutex em outro thread
  após falha física de Create. **PASS.** Não simula falha física do Flush.
- `--smoke-shutdown-save-create/flush/replace/success` verificou a tupla v17
  com códigos **1/1/1/0**, disposal dos dois panes/menu/timer/tooltip,
  preservação do arquivo nos erros e recarga do resultado positivo.
- `Test-WorkspaceWarningGui.ps1` usa reflection sobre o método nativo do
  candidato congelado num formulário WinForms **local e descartável**, sem
  iniciar o jogo. Na tupla v19 observou janela vinculada ao owner, visível,
  em primeiro plano, fechamento por Enter e `FormClosed`; captura restrita à
  janela modal em `measurements/owned-warning-gui-final-reviewed.png`. **PASS.**
  Não constitui teste de outro monitor/DPI ou de hardware de disco com falha.

O CI Windows compila o host isoladamente e executa o harness de arquivos
físicos. O teste visual de WinForms é manual/opt-in porque requer desktop
interativo; nunca o executar em runner invisível sujeito a modal pendurado.

## Gates de aprovação restantes

| Responsável | Etapa | Situação |
| --- | --- | --- |
| Agente / TECH QA | JS, isolamento C#, I/O físico, concorrência, cleanup, screenshot CURRENT e aviso Windows local | Evidência local positiva para os recortes acima; revisão independente técnica P0/P1=0 no código examinado. |
| Agente / UX e A11y | EN, nomes atípicos, zoom/DPI, Tab/Enter/Space, ordem de foco e leitor de tela em todas as superfícies | Cobertura parcial por JS/fixtures; não declarar `UX READY` global. |
| Product Owner | **No jogo real**, conferir exatamente Better UI `0.2.129` SHA `2E71BB...` com Analyzer `1.15.1` SHA `178595F...` | **PENDENTE.** Somente o PO instala/recarrega/valida jogo/Tampermonkey. |
| PM / release | Depois do aceite do PO, conferir CI atualizado, dependência PR Analyzer #26 → PR Better UI #1 e deliberar merge/tag/release separadamente | **PENDENTE**. Ambos PRs draft até decisão explícita. |

Checklist curto do PO: login frio; Hunt live e intervalo com última espécie;
pause/resume e stop/reset; Hunt→Expedição→Hunt; Expedição running/paused;
troca entre dois perfis; Game↔Cards/F5; menus/teclado e topo em larguras
suportadas. Conferir versão **e SHA da instalação**, pois a metadata é igual à
do congelamento antigo. Nenhuma validação live foi feita por agentes.

**Limites adicionais:** não há A/B conclusivo de ganho global de CPU/RAM,
prova física de Flush, nem demonstração de foco em múltiplos monitores. Em
contenção de gravação, `WaitOne(2000)` pode bloquear UI por até ~2 s antes de
avisar e desativar Save. Não converter CI verde ou capturas sintéticas em
aprovação funcional no jogo.

O changelog e o PR Better UI devem apontar a esta versão do gate; o gate v23
permanece como evidência histórica da tupla v07. Nenhuma saída ignorada em
`.local-evidence/`, binário normal, perfil real, tag ou release é promovido.
