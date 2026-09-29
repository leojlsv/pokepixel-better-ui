# PokePixel Evidence Probe

Gravador **local**, **manual** e independente do Better UI para conservar evidências de ações do jogador e de contratos efetivamente observados no cliente. Não executa ações no jogo, não envia registros a serviços externos e não modifica respostas HTTP/WS. Uma requisição/resposta observada não prova atomicidade, idempotência, permissões ou garantias internas do servidor.

## Instalação e operação pelo Product Owner

### Coupled Workspace WebView2 (Rhyxus / Rhyosa)

No PowerShell, a partir de G:\pokepixel-better-ui:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\coupled-workspace-webview2\Build-WebView2Workspace.ps1 -EvidenceProbe
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\coupled-workspace-webview2\Start-CoupledWorkspaceWebView2.ps1 -EvidenceProbe -SkipBuild
~~~

O comando gera/abre somente tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.evidence-probe.exe. Não substitui PokePixelCoupledWorkspace.exe nem o candidato corrente. Cada perfil WebView2 possui seu próprio IndexedDB. O flag -EvidenceProbe instala o recorder de página e uma camada suplementar do Chrome DevTools Protocol (CDP) para rede/WebSocket; **nenhuma gravação começa até você acionar Iniciar**. A execução pelo Product Owner é a única validação admitida no jogo.

### Edge / Chrome / navegador com Tampermonkey

Crie um userscript independente no Tampermonkey colando **todo** o conteúdo de tools/game-evidence/pokepixel-evidence-probe.user.js. Ele roda em https://pokepixel.nietore.com/* desde document-start. Não adicione o probe ao userscript principal do Better UI. O mesmo arquivo é utilizado no WebView2.

### Capturar uma sessão

1. Entre no jogo e abra o pequeno painel **Evidence Probe** no canto inferior direito. Acione **Iniciar**. O painel mostra GRAVANDO e o contador.
2. **Recarregue a página uma vez** para observar desde os primeiros scripts. A sessão é retomada no mesmo tab via sessionStorage, no mesmo perfil.
3. Reproduza manualmente a sequência relevante: abrir janela, trocar filtros, fazer a ação permitida pelo jogo, consultar resultado e observar erros.
4. Acione **Parar** e **Exportar JSONL**. Guarde o arquivo baixado. As evidências continuam no IndexedDB do perfil até exclusão explícita/limpeza de dados.
5. Repita em outras sessões, caso necessário. Se for usar o console do DevTools:

~~~js
await window.__PPBUI_EVIDENCE__.start();
window.__PPBUI_EVIDENCE__.stats();
await window.__PPBUI_EVIDENCE__.stop();
await window.__PPBUI_EVIDENCE__.sessions();
await window.__PPBUI_EVIDENCE__.export("<id-de-sessao>");
await window.__PPBUI_EVIDENCE__.discard("<id-de-sessao>");
~~~

O comando discard é irreversível e só funciona com a gravação parada. Exportar não exclui o acervo em IndexedDB. Não edite JSONL durante a coleta. Não compartilhe um export sem revisar as informações nele presentes.

## Arquivar e consultar no repositório de evidências

**Fluxo acordado com o Product Owner:** coloque todos os arquivos `.json`/`.jsonl` em `G:\pokepixel-better-ui\.local-evidence\incoming\` e informe que estão disponíveis. O agente executa a validação, a importação e a atualização dos índices; **não é necessário executar Node manualmente**. Os originais em `incoming` são preservados. A pasta privada `.local-evidence` é ignorada pelo Git.

O comando abaixo é referência técnica para o agente, não uma etapa solicitada ao Product Owner:

~~~powershell
# Processa todas as capturas recebidas e regenera os dois índices privados.
node .\tools\game-evidence\import-incoming.mjs

# Alternativa para arquivar uma sessão isolada.
node .\tools\game-evidence\archive.mjs "$env:USERPROFILE\Downloads\ppbui-evidence-<id>.jsonl" "Farm - troca manual"
~~~

O importador confere formato, registra SHA-256, evita duplicatas de conteúdo e atualiza .local-evidence/catalog.json. Os arquivos são .local-evidence/sha256-<hash>.jsonl. **Toda a pasta é ignorada pelo Git** para evitar commits acidentais de dados reais. Faça backup privado da pasta se precisar preservar o acervo fora deste computador. O Git versiona somente as ferramentas, a documentação e os testes.

`import-incoming.mjs` preserva os originais, registra falhas individuais em `.local-evidence/import-report.json` e consolida métodos, rotas normalizadas, campos, status HTTP, respostas omitidas e chamadas incompletas em `.local-evidence/contracts-index.json`. Capturas idênticas são contadas uma vez por SHA-256. Se houver duas exportações **diferentes** com o mesmo ID de sessão, ambas são conservadas, mas essa sessão é excluída da agregação e aparece em `overlappingSessions`, para evitar dupla contagem. O comando pode ser repetido sem duplicar o catálogo. Ambos os índices agregam **nomes de campos e rotas normalizadas, nunca valores de payload**, mas identificadores de sessão/arquivo e nomes de campo ou caminhos não reconhecidos ainda podem ser sensíveis: mantenha a pasta inteira privada, sem publicar seus conteúdos. O campo `complete` indica apenas integridade da **importação do conjunto selecionado**, não cobertura exaustiva da rede ou autoridade de mutação. A comparação de `generatedAt` entre índices revela uma geração interrompida; execute o importador novamente. O detector de sessões com exportações sobrepostas considera os arquivos ainda presentes em `incoming`, que devem ser preservados conforme o fluxo acordado. A ausência de resposta registrada não prova falha nem sucesso do servidor.

~~~powershell
# Metadados e contagem por classe de evento
node .\tools\game-evidence\query.mjs ".local-evidence\sha256-<hash>.jsonl" --summary

# Mapa de endpoints + métodos + status + chaves observadas nos payloads e fontes page/CDP
node .\tools\game-evidence\query.mjs ".local-evidence\sha256-<hash>.jsonl" --contracts

# Filtrar eventos, seguir uma requisição e investigar respostas
node .\tools\game-evidence\query.mjs ".local-evidence\sha256-<hash>.jsonl" --kind ui.click
node .\tools\game-evidence\query.mjs ".local-evidence\sha256-<hash>.jsonl" --kind http. --grep farming
node .\tools\game-evidence\query.mjs ".local-evidence\sha256-<hash>.jsonl" --req "ID_DA_REQUISICAO"
node .\tools\game-evidence\query.mjs ".local-evidence\sha256-<hash>.jsonl" --kind ws. --limit 100
node .\tools\game-evidence\query.mjs ".local-evidence\sha256-<hash>.jsonl" --kind browser. --limit 100
~~~

Cada linha JSONL é um evento, com sessionId, documentId, seq, at (UTC), ms desde a abertura do documento, kind e data. reqId associa os eventos HTTP observados na página; requestId associa os eventos browser.http.* oriundos do CDP. wsId associa os frames vistos pelo wrapper da página; browser.ws.* conserva os IDs nativos do CDP. O arquivo começa com evidence.format e evidence.session. Mudanças de DOM são **resumos agregados**, não cópia integral do texto da página. Identidade de Pokémon, slot, espécie e campos de payload conhecidos permanecem visíveis quando não coincidem com regras de ocultação. O relatório --contracts mantém uma linha separada por `source` (`fetch`, `xhr`, `page` ou `cdp`), porque a mesma chamada pode ser observada em mais de uma camada; não some essas linhas como chamadas distintas sem correlação adicional.

## O que captura

| Superfície | Evidência |
| --- | --- |
| Ações UI | pointerdown/up, click, dblclick, contextmenu, change/input, submit, foco, keydown, scroll amostrado, dragstart/drop; alvo DOM e coordenadas sem texto digitado |
| HTTP | fetch, XMLHttpRequest e sendBeacon: método, URL com query anonimizada, JSON de envio legível, nomes de headers, status, duração e JSON textual de resposta quando leitura segura; no WebView2 evidence-probe, CDP acrescenta requests/responses que não passam por esses wrappers e tenta recuperar corpos XHR/Fetch textuais/JSON |
| WebSocket / SSE | abertura, envio/recepção de frames WebSocket textuais, fechamento e erros; mensagens EventSource; no WebView2 evidence-probe, CDP acrescenta handshake/frames/eventos vistos pelo Chromium; frames binários conservam apenas metadados/tamanho, nunca `payloadData` |
| Carregamento de assets | entradas de PerformanceObserver resource: URL anonimizada, iniciador, duração e tamanhos quando disponibilizados pelo navegador; não contém corpo do asset |
| Diagnóstico | console.log/info/warn/error/debug/trace, erros JS, Promise rejection, conectividade, navegação History/hash e resumos de mutations |
| Storage cliente | `localStorage`/`sessionStorage` set/remove/clear e eventos cross-tab `storage`, com valores redigidos; chaves internas do próprio probe são excluídas |
| Ciclo | bootstrap, retomada após reload, interrupção, inventário de sessões, contagem e limites locais |

## Limites técnicos e cuidados

- Não existe captura *literalmente total*. No Tampermonkey, a cobertura de rede é a instrumentação JavaScript descrita acima. No executável WebView2 evidence-probe, CDP acrescenta a visão do target Chromium para HTTP, WebSocket, SSE e corpos recuperáveis, mas eventos anteriores à criação do documento, targets separados de service worker/worker, tráfego interno do navegador, conteúdo de frames binários e dados fora do target ainda podem escapar. O probe não grava vídeos, screenshots, áudio nem texto digitado; canvas/Pixi/WebGL, estado nativo privado, tráfego criptografado de terceiros e lógica interna do servidor não ficam automaticamente disponíveis. Use HAR/Network do DevTools como evidência complementar quando o JSONL marcar lacunas.
- **Payload HTTP de resposta** da camada de página é lido de uma cópia limitada a 48 KiB para JSON e texto, inclusive quando Content-Length é desconhecido; leitura que ultrapasse 48 KiB ou 5 segundos fica marcada como http.body.skipped. No WebView2, CDP tenta `Network.getResponseBody` somente para respostas XHR/Fetch com MIME textual/JSON; resultados acima do limite suplementar são marcados como browser.http.body.skipped. *Ausência no log não significa ausência no servidor*. Request pré-construído não tem corpo clonado. Frames WebSocket binários não são copiados. A camada da página registra apenas nomes de headers; eventos CDP podem conter headers completos, mas passam pelo mesmo redator antes de persistir e chaves como Authorization/Cookie/token/session são substituídas por `[REDACTED]`. Texto de input não é gravado. Textos arbitrários passam por redatores heurísticos, que **não garantem anonimização completa**.
- O probe usa wrappers reversíveis dos métodos JS para instrumentar chamadas posteriores à ativação. Outros wrappers instalados depois podem impedir restauração imediata do hook antigo; nesse caso a gravação para e o wrapper passivo deixa de emitir eventos, sendo removido numa navegação completa. Conteúdos de console que não sejam objetos simples não são introspectados para evitar getters e efeitos colaterais.
- Limite por sessão: **50.000 eventos e 80 MiB**, com limite individual de **64 KiB**; fila de até 1.500 eventos e flush periódico de 350 ms. Ao atingir limite/quota/falha, o probe interrompe e mostra o estado de falha. Uma queda abrupta do navegador pode perder a fila ainda não confirmada em disco. Verifique lost, status e eventos http.body.skipped antes de classificar a evidência como completa.
- Retomada cobre recarregamento do **mesmo tab**. Encerrar a janela sem acionar Parar pode deixar a sessão marcada como recording no catálogo; ela só é retomada enquanto o browser conservar sessionStorage.
- Ao acionar Parar, o probe aguarda no máximo **1,2 segundo** pelos HTTPs e leituras de resposta da camada de página já iniciados. Durante essa finalização, novos eventos de UI, página e CDP não entram na gravação. Requisições de página pendentes recebem http.incomplete e corpos pendentes recebem http.body.skipped com motivos explícitos. Isso não cancela o tráfego real do jogo. Pare antes de exportar; o exportador rejeita sessão ativa. O arquivador valida IDs, timestamps, sequência por documento e a contagem do manifesto antes de registrar o SHA-256.
- O probe observa o comportamento realmente realizado pelo jogador, não valida permissão para automação posterior. Para mutações de Farm, por exemplo, uma sequência remove→assign observada no cliente continua sendo duas ações separadas, sem provar troca atômica ou retry seguro.

## Verificação offline

~~~powershell
node --test .\tools\game-evidence\probe.test.mjs
node --test .\tools\game-evidence\query.test.mjs
node --test .\tools\game-evidence\import-incoming.test.mjs
node --check .\tools\game-evidence\pokepixel-evidence-probe.user.js
~~~

Nenhum desses testes acessa o jogo. A funcionalidade em jogo depende de validação expressa do Product Owner.
