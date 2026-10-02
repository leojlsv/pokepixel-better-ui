# PPTools → Hunt Atlas — histórico removido

> **Removido do produto em 2026-10-02 por decisão do Product Owner.** Este
> documento permanece apenas como registro histórico de design, diagnóstico e
> aceitação. Nenhum fluxo, critério, candidato ou pendência abaixo faz parte do
> contrato atual do módulo Hunts.

**Decisão final do Product Owner — 2026-09-29:** encerrar o escopo sem
incorporar o PPTools ao userscript Tampermonkey. A alternativa de aba auxiliar
descrita adiante é histórico superado, não é um candidato de instalação.
A versão 0.2.121 volta a restringir o userscript ao domínio PokePixel e
mantém as recomendações do PPTools somente via Coupled Workspace opt-in,
além da ação Search na lista nativa de Hunts. A consulta existente havia
sido aprovada pelo usuário; Search ainda depende de validação no jogo.

**Correção 0.2.122 — inconsistência de identidade na leitura nativa:** após
erro reportado pelo Product Owner durante uma terceira consulta, o leitor
preserva a identidade original do líder/perfil enquanto lê o Team e a lista
de criaturas em sequência. Uma divergência temporária exclusivamente no nível
numérico da mesma instância permite uma única releitura após 150 ms; troca
real de líder/perfil e divergência persistente continuam bloqueadas. Dados
parciais das fontes auxiliares confirmados pelo mesmo ID podem enriquecer o
HUD sem apagar identidade/IVs conhecidos por campos ausentes ou nulos; qualquer
valor presente de ID, espécie, nível ou IV que conflite com o original é
rejeitado. Critério técnico: reproduzir corrida, resposta parcial e atraso de
nível em fixtures, proteger mudança real de nível e manter a simulação/ação
Search inalteradas. Os testes locais não determinam qual divergência ocorreu
na sessão real; a verificação no jogo continua exclusiva do Product Owner.

## CORREÇÃO DO PRODUCT OWNER — 2026-09-29 14:29 UTC

**O contrato abaixo descreve um fluxo rejeitado e está SUPERADO. NÃO promover nem solicitar validação do par `0.2.118-r2` como entrega desta funcionalidade.** O usuário corrigiu expressamente o entendimento: **não existe exportação de resultados pelo PPTools; não deseja transferir JSON nem repetir manualmente a simulação**. O requisito atual é **um clique** em **PPTools Recommendation** no Better UI com o Pokémon que é líder *naquele momento*: Better UI obtém automaticamente os dados autorizados do líder, executa/aciona a simulação de busca do PPTools e apresenta qual Pokémon selvagem/hunt caçar com aquele atacante. Recomendações anteriores devem ser invalidadas quando o líder muda; o botão não deve iniciar gameplay. A existência de um exportador instalado em outro site não satisfaz esse fluxo.

**Status atual (revisão 2026-09-29): `DIAGNOSTIC IMPLEMENTED / PRE-LIVE NOT READY`.** A implementação manual `0.2.118-r2` continua rejeitada e toda sua matriz abaixo é histórica. Better UI `0.2.119` já monta o widget `pptools-oneclick-widget.js` no Hunts Atlas e troca mensagens com o executor auxiliar WebView2 do host opt-in. Um smoke isolado do executor executou a simulação real **no site público com atacante sintético** e extraiu três linhas. O teste não prova que a projeção de campos nativos reproduz o JSON de `COPIAR JSON`, nem aprovação em jogo; conservar a classificação diagnóstica até essa prova e o aceite do Product Owner.

**Execução verificada:** o executor isolado usa somente o HTML e controles públicos do PPTools em WebView2 invisível/InPrivate, navegação delimitada e perfil temporário; o runner rejeita build de frontend diferente, verifica XP/h decrescente, filtro vazio, contagem/ranks e limita resultados. Não existe API oficial de resultados demonstrada. Antes da consulta, o Better UI lê e revalida o único líder nativo e constrói o JSON para o formulário. **Lacuna crítica AUTO-02:** sem captura autorizada do JSON de `COPIAR JSON` do mesmo Pokémon, a equivalência dessa projeção não está comprovada; particularmente, o bundle público interpreta `expBuff` como **multiplicador de EXP maior que zero** (`1` = base, `1.5` = 150%), ao passo que o nome nativo `trainer.exp_buff` não demonstra se armazena fator ou percentual/bônus. O parser público também **ignora `buffs`**, removido do transporte do candidato; e pode inferir `isShiny` pela faixa de qualidade do multiplicador. Confirmar essas semânticas antes de afirmar recomendações exatas para o líder.

**QA técnico posterior:** os testes de privacy boundary rejeitam coerção de strings para booleanos/números e campos nativos inválidos; o relay C# reconstrói apenas a allowlist e descarta qualquer propriedade extra. Há deadline nas inicializações e nos scripts WebView2, limite fixo de inicializações nativas concorrentes e segunda limpeza após término tardio. `npm test` 539/539, build JS, compile C# e os smokes específicos de privacidade/lifecycle/site público PPTools passaram; o smoke geral WinForms passou na última execução, mas teve intermitência no watchdog local de 12 segundos, reproduzida também em um binário anterior. O smoke adicional `--pptools-full-input-smoke` executa o site **real** com um atacante fictício contendo todos os campos relevantes (`Wartortle`, `rare`, `exactMultiplier=1.3`, `expBuff=1.5`, IVs específicos) e obtém Top 3; isso verifica compatibilidade do importador público para aquele caso, mas mantém sem prova a procedência e a semântica do JSON nativo do jogo. O runner usa, quando o Next.js remove o elemento `script` carregado, uma entrada única Resource Timing com caminho exato e `initiatorType=script`; essa entrada comprova solicitação do recurso, não seus bytes.

**Novos critérios de aceite (o fluxo manual abaixo não os satisfaz):** `AUTO-01` clique único dispara uma consulta real para o líder atual; `AUTO-02` atacante/qualidade/IVs/nível de treinador e configuração necessária têm procedência comprovada; `AUTO-03` resultado retornado pela execução do PPTools identifica espécie selvagem/hunt e métricas com universo e ordem conhecidos; `AUTO-04` troca de líder, level-up, sessão, pane ou consulta supersedida descarta resultados antigos e impede replay; `AUTO-05` sem clipboard, JSON copiado, importação/checkbox ou comandos de gameplay; `AUTO-06` loading/falha/cancelamento e acessibilidade demonstrados em fixture; `AUTO-07` fonte real validada pelo Product Owner no jogo. `AUTO-01/03/04/05/06` têm evidência automatizada **apenas sintética/diagnóstica**; `AUTO-02` exige prova de equivalência nativa e `AUTO-07` permanece exclusivo do usuário.

### Correção complementar do Product Owner — 2026-09-29 14:45 UTC

O navegador executor deve operar **invisivelmente dentro do Coupled Workspace**, ou mecanismo equivalente com a mesma experiência. **Docker não é requisito**; não abrir janela, aba, DevTools ou diálogo externo para o usuário. O único ponto de interação permanece o botão **PPTools Recommendation** e seu resultado/estado dentro do Better UI.

**Arquitetura implementada em candidato opt-in, ainda sem aceite no jogo:** `tools/coupled-workspace-webview2/{PptoolsBackgroundExecutor.cs,pptools-runner.js}` cria uma instância WebView2 invisível, separada das panes do jogo, com origem pública HTTPS restrita, perfil efêmero/InPrivate, correlação de pedido e resultado, prazos de execução, isolamento de perfil e validação do líder antes/depois da consulta. Os testes sintéticos são pertinentes somente a esta implementação experimental: a origem PPTools não recebe o bridge genérico nem credenciais nativas do host, e o executor não compartilha o perfil WebView das contas. O comportamento no jogo depende de validação exclusiva do usuário.

**AC adicionais:** `AUTO-08` nenhum elemento visível externo ao Coupled Workspace nem alteração da aba/pane atual; `AUTO-09` instância auxiliar isolada dos perfis e removida/cancelada corretamente, inclusive em modo Dual e fechamento do host; `AUTO-10` funcionalidade ausente/desabilitada ou mostra indisponibilidade fora de um host com ponte comprovada, sem insinuar execução pelo PPTools; `AUTO-11` teste local comprova WebView2 oculto, execução JavaScript no site público e leitura de resultados com entradas válidas. `AUTO-08/09/10/11` possuem implementação e prova sintética parcial; nenhum desses testes substitui aprovação real pelo PO, nem resolve AUTO-02.

### Correção do erro `trainer.exp_buff` — 2026-09-29 16:41 UTC

O Product Owner forneceu uma amostra da ação **COPIAR JSON** do jogo para um Entei nível 32. O JSON é um objeto de criatura com `species_id`, `level`, `quality`, `quality_multiplier`, `nature`, `gender`, `ivs` e `is_shiny`; **não contém** `trainer.exp_buff`, `expBuff` ou `is_starter`. Identificadores privados da amostra não são persistidos no código, nos testes ou na documentação. A exigência sintética anterior de `trainer.exp_buff` estava incompatível com essa forma real e bloqueava o clique antes da consulta.

O importador público pinado do PPTools (`page-9d9eef42c7a86dae.js`, SHA-256 `1F04744F77B61071A48715D6F5945D1EA641AC9BE8BD228F600B51F6D90F07B7`) confirma que `expBuff` é opcional e que `experienceMultiplier` ausente corresponde a **×1**; a UI inicial usa `isStarter=false` se essa propriedade não for fornecida. O Better UI agora mapeia os valores nativos comprovados, usa ×1 como parâmetro **neutro da simulação** (mesmo que exista um `trainer.exp_buff` nativo de unidade desconhecida), e usa `isStarter=false` somente quando o booleano nativo não foi disponibilizado. A UI apresenta o aviso em bloco próprio, anunciado como nota para tecnologias assistivas, e explicita que **XP/h e ordem das recomendações podem divergir** quando existem bônus ativos. Um booleano nativo explícito é preservado. O C# continua exigindo e sanitizando os campos enviados, sem receber os identificadores privados da criatura. Novos testes sintéticos exercitam a forma Entei e o bloqueio de outros campos obrigatórios. `npm test` 541/541 PASS, build PASS, privacy smoke PASS, QA independente sem P0/P1; render sintético Edge em 235/410/680 px sem clipping observado. O resultado continua diagnóstico, com validação em jogo reservada ao Product Owner; o contrato completo dos bônus ainda não foi verificado.

### Aprovação da consulta e substituição provisória de Locate por Search — 2026-09-29 16:57 UTC

O Product Owner declarou **"Funcionalidade aprovada"** para o fluxo existente de `PPTools Recommendation`. Em seguida esclareceu que a versão atual **não possui mapa para interação** e aprovou um botão **Search** para procurar cada recomendação na lista de Hunts. Esta é uma alteração adicional de navegação, ainda sem validação em jogo própria. A aprovação anterior continua válida para a consulta; a precisão de bônus de EXP/inicial não foi aferida por esse aceite.

`AUTO-12`: em modo LIST, cada recomendação apresenta Search, que preenche o controle nativo de busca de Hunts com `huntName` e dispara `input` com bubbling; o campo recebe foco e pode rolar para ficar visível. Search permanece acionável mesmo se a linha desejada estiver oculta pelo filtro de texto anterior. A ação preserva seleção, mundo, níveis, elementos e todos os demais filtros; não clica na linha/Details/Hunt nem chama `startHunt()`. Não altera o executor PPTools, o host, o clipboard ou o estado do jogo. Se o campo de busca estiver ausente/desabilitado/inert/readOnly, Search falha de forma explícita; se o mundo/scene mudar durante a leitura assíncrona, a ação é descartada. A mensagem informa a busca efetuada sem afirmar que uma hunt específica foi encontrada e instrui a revisar mundo/filtros se não aparecer. O modo MAP legado conserva seu Locate exclusivamente por compatibilidade histórica.

Evidências locais: testes sintéticos para linha previamente oculta, atualização do campo pelo evento nativo, recriação do input durante revalidação assíncrona, estado indisponível, mudança de mundo durante/depois de input e ausência de gameplay. Render offline do painel em 235/410/680 px em `tools/coupled-workspace-webview2/bin/pptools-search-candidate/oneclick-states.png`. A consulta já foi aprovada pelo usuário; a ação Search e o filtro do jogo real **aguardam validação do Product Owner**.

### Alternativa Tampermonkey com aba auxiliar — histórico cancelado

O usuário chegou a autorizar uma aba auxiliar no Tampermonkey, mas posteriormente cancelou essa alternativa. O contrato `AUTO-13` e as descrições técnicas seguintes registram apenas a proposta histórica, sem implementação ativa na versão 0.2.121. A integração anterior no Coupled Workspace permanece disponível no candidato opt-in.

`AUTO-14`: o userscript não inicializa módulos/tema Better UI no domínio PPTools e não toca em abas PPTools abertas manualmente. A consulta na aba auxiliar exige o fragmento estrito `#ppbui-pptools=<random requestId>`, removido da barra antes de executar o runner, uma requisição válida no armazenamento GM do mesmo script e validade de tempo. Apenas campos allowlist do atacante chegam à extensão/ao site; identificadores de instância/perfil/trainer, buffs desconhecidos e extras são excluídos. A resposta é correlacionada pelo pedido e permanece sujeita à conferência local do líder, perfil, versão de estado e identidade, ao timeout e ao descarte de replay/consulta cancelada. Encerramento, rejeição de abertura, mudança de líder e desmontagem encerram exclusivamente a aba pertencente ao pedido, sem alterar o host normal.

`AUTO-15` (histórico, **cancelado**): a versão experimental transformava o runner público para a variante Tampermonkey por transformação estrita **em build**, abortando caso o contrato do source mudasse. A implementação de Search por lista foi mantida no fluxo WebView2 atual. O registro do experimento está em `docs/archive/PPTOOLS_TAMPERMONKEY_0.2.120_CANCELLED.md`; a variante Tampermonkey não é um candidato ativo e não requer validação do Product Owner.

---

## Histórico superado: implementação manual (não é o fluxo aprovado)

**Estado:** `tech-candidate` (2026-09-29), com par de userscripts isolados Better UI `0.2.118-r2` / extrator PPTools `0.1.0`. **Visual do host/jogo ainda não comprovado; candidato diagnóstico, sem aceite em jogo.** Os pacotes `0.2.115-r2`, `0.2.116-r2`, `0.2.117-r1` e `0.2.118-r1` são históricos. Os dois primeiros não implementam integralmente a restrição ao líder; `0.2.117-r1` não vincula o consentimento ao JSON e `0.2.118-r1` não bloqueia todas as ações `Localizar` de uma consulta substituída. Não utilizá-los nesta validação.
**Solicitação do Product Owner (corrigida em 2026-09-29):** aproveitar as **três primeiras combinações Pokémon selvagem/hunt** da simulação no [PPTools Hunt Analyzer](https://www.pptools.com.br/hunt-analyzer) **exclusivamente para o Pokémon que estiver como líder no PokePixel**. O próprio usuário utiliza o botão **COPIAR JSON** do hover nativo do Pokémon, cola esse JSON no PPTools e executa a simulação. Não criar outra exportação de JSON no Better UI nem pressupor API oficial ou colaboração do desenvolvedor do PPTools.
**Repositório:** `pokepixel-better-ui`; branch `refactor/team-pixel-art`, HEAD observado `61ee367` (2026-09-29). Worktree possui alterações paralelas: este plano não as modifica, aprova ou substitui.
**Owner do registro:** Project Manager. A solicitação de planejamento não autoriza automaticamente alteração do site externo, publicação, gameplay automático ou promoção do host.

## Fatos e premissas verificadas

- Em 2026-09-29 a página pública do PPTools aceitava JSON do atacante e executava a simulação no navegador. A tabela de resultados apresentava Pokémon selvagem **e hunt** (uma linha por par), nível, move, hits, KOs/h, XP/h e Gold/h. A ordenação inicial observada era **XP/h decrescente**; busca e ordenação da tabela são ajustáveis. O bundle público observado renderizava o array classificado por iteração de linhas; **ausência de paginação/virtualização e completude desse array precisam ser confirmadas no gate F0 com fixture**.
- O histórico no `localStorage` observado no bundle público conserva **inputs**; não há um contrato estável demonstrado de API/exportação de **resultados**. Não depender de endpoints privados, componentes React internos, nomes de módulos minificados, interceptação de rede ou armazenamento privado do site.
- `pokepixel-hunt-analyzer` (projeto local, que alimenta o Cards) **não é** o PPTools Hunt Analyzer externo. Não reutilizar seu objeto `__POKEPIXEL_HUNT_ANALYZER_PUBLIC__` como se fosse um feed de recomendações.
- O Hunt Atlas já possui seleção por identidade de zona no jogo. Há **dois modos**: mapa (`hunt-world-*`, marcadores e `locateHunt`) e lista (`hunt-list-*`). O método de localizar do mapa não serve automaticamente à lista. O `startHunt()` nativo exige ação explícita do usuário.
- A política de mesma origem impede que o Better UI leia o DOM do domínio PPTools diretamente. MVP: extrator instalado no **domínio PPTools**, com cópia explícita para a área de transferência, e **importação explícita** na interface Better UI. Sem API, backend, token, proxy ou ponte C# na primeira entrega.
- **Limite de procedência:** na versão pública examinada, o PPTools descarrega o texto original após preencher o formulário. O DOM de resultados não disponibiliza o ID da instância atacante nem demonstra que os campos atuais ainda são os mesmos da simulação exibida. O extrator F1 mantém `attacker: {speciesId:null,speciesNameText:null,level:null}`; inferir o líder pelo Pokémon selvagem, pelo nível, pelo formulário pós-simulação ou pela posição do Team seria incorreto.

## Escopo fechado do MVP

1. Capturar **as três primeiras linhas de resultado na ordem lógica da tabela, depois do filtro/ordenação ativos**, independentemente da posição do scroll; ignorar detalhes expandidos e nós ocultos sem dados. Não reduzir a “três espécies únicas”. Chamar de **Top 3 geral** somente se o conjunto completo estiver representado e classificado globalmente. Se houver paginação, carregar/confirmar primeira página e ordem global antes desse rótulo; se houver virtualização, exigir fonte DOM pública completa e comprovada, ou bloquear a exportação geral. Outros casos só podem ser rotulados como **três primeiras linhas do recorte/página N**, com índice de página identificado, ou falhar fechado.
2. Se os controles estiverem no padrão **e o conjunto completo/primeira página global tiverem sido comprovados**, o rótulo correto será **Top 3 por XP/h ↓**. Se o usuário mudar coluna, direção, filtro ou página, o extrator deverá preservar e exibir o critério efetivo e o recorte. Se não conseguir detectá-lo, deverá solicitar retorno ao estado padrão ou declarar o critério desconhecido; nunca rotular qualquer ordenação/recorte como XP/h ↓ global.
3. Exportar nome da espécie selvagem, nome da hunt, **nível textual**, XP/h e Gold/h **como apresentados**; incluir informações extras apenas com fonte e unidade confiáveis. Nível/valor numérico só quando conversão for comprovada. O mesmo nome pode corresponder a múltiplos IDs; não inventar `huntId`.
4. Registrar timestamp e URL da captura e, **se puder ser lido sem adivinhação**, nome/ID/nível do atacante. Atacante desconhecido fica `null`, sem atribuição automática ao líder do Team; nome visível sem ID pode ser transportado separadamente como `speciesNameText`.
5. Importar no Better UI por ação do usuário; mostrar três sugestões, fonte, critério, timestamp, limpar/atualizar e estados indisponível/ambíguo. Isolar recomendações **por documento/WebView e perfil comprovado da pane** quando o host possui duas contas; não usar perfil apenas focado global para direcionar outra pane; não persistir entre reinícios no MVP.
6. Permitir **Localizar** somente quando o resultado puder ser associado a **uma zona nativa inequívoca**, revalidada no clique. Mapa: integrar explicitamente a seleção atual com o pan nativo, pois `locateHunt(root, marker)` sozinho **não seleciona o Inspector**, requer marcador existente, mundo ativo e geometria válida. Lista: implementar destaque/foco apenas após provar handler nativo seguro; `mountCurrentListHunts` atualmente **não expõe uma API de localização**. Sem candidato ou com vários candidatos, mostrar sugestão e busca manual. A importação nunca inicia Hunt, muda líder, remove filtros ou envia comandos de gameplay.
7. Preservar montagem/cleanup e DOM original, tratar texto externo só via `textContent`, manter foco/teclado/idiomas e não criar um segundo `MutationObserver` do jogo.
8. **Restrição atual ao líder:** importar somente quando há exatamente um `is_leader===true` no `PokeIdle.PersistentHud._teamHud._creatures`, com `id` e `level` válidos, e o HUD pertence ao documento/WebView atual; qualquer Team scene vinculada e sincronizada deve concordar com esse ID. O usuário confirma expressamente que o **JSON copiado desse líder** alimentou a **mesma consulta da qual vieram as recomendações**. A confirmação vincula o ID do líder ao **texto exato do JSON presente ao marcar a caixa**: edição/colagem posterior desmarca a caixa, alterações sem evento de input falham na comparação do importador e falha de parse exige nova confirmação. A confirmação também é reiniciada após cada importação bem-sucedida e marcada como **declaração do usuário, não verificação automática pelo PPTools**. O Better UI vincula resultados ao ID da instância + nível + espécie quando disponível, na pane atual; troca de líder, level-up, perda de autoridade, mudança de conta/sessão ou cleanup descarta os resultados e suas ações. `Localizar` revalida o líder imediatamente antes da ação; não existe seleção implícita do primeiro slot. Atualização de outro membro do Team não descarta consulta válida.

## Fluxo e ownership

```text
PokePixel: hover do LEADER atual → botão nativo COPIAR JSON
     │ usuário cola o JSON nativo no PPTools
     ▼
PPTools: formulário preenchido → simulação manual → resultados classificados
     │
     ▼
Userscript complementar em https://www.pptools.com.br/hunt-analyzer*
     │ Clique: Copiar Top 3 geral ou Copiar 3 da página identificada
     │ Leitura de linhas lógicas no DOM público com completude/recorte comprovados
     │ Se clipboard falhar: Mostrar JSON selecionável para Ctrl+C
     ▼
JSON versionado ppbui.pptools.hunt-recommendations / v1
     │ clipboard e colar explícito
     ▼
Better UI / Hunts: identificar único líder nativo + confirmação explícita do usuário
     │ vincular consulta declarada ao ID/nível/espécie da instância nesta pane
     │ invalidar resultados ao mudar ou perder a autoridade do líder
     ▼
Resolver identidade da zona e exibir Top 3 somente para o líder confirmado
     ├─ mapa: seleção explícita + pan apenas com marcador/mundo válidos
     ├─ lista: destaque/foco após comprovar mecanismo nativo seguro
     └─ 0 ou N candidatos: somente informação e busca manual
```

**Escrita exclusiva por superfície:** pesquisador/arquitetura define contrato; Feature Engineer possui o userscript externo; Hunt Module Engineer possui `src/modules/hunts/**` e testes associados; Designer define onde/como aparece o novo componente sem inventar uma composição enquanto não houver evidência; Technical, UX/A11y e Visual QA são independentes dos autores. Não alterar `src/core/**`, host C#, bundles ou o projeto `pokepixel-hunt-analyzer` por conveniência.

### Payload proposto v1 (ilustrativo, NÃO é resultado real)

```json
{
  "schema": "ppbui.pptools.hunt-recommendations",
  "version": 1,
  "source": {
    "url": "https://www.pptools.com.br/hunt-analyzer",
    "capturedAt": "2026-09-29T12:00:00.000Z",
    "sort": { "key": "xp", "direction": "desc" },
    "filter": "",
    "scope": { "kind": "all-results", "page": null }
  },
  "attacker": { "speciesId": null, "speciesNameText": null, "level": null },
  "recommendations": [
    {
      "rank": 1,
      "wildSpeciesName": "EXEMPLO",
      "huntName": "HUNT EXEMPLO",
      "wildLevelText": "100",
      "wildLevel": 100,
      "xpPerHourText": "—",
      "goldPerHourText": "—"
    }
  ]
}
```

`recommendations`: entre 1 e 3 linhas (0 linhas = aviso de resultado vazio, não exportação válida). `source.scope.kind`: `all-results` só com completude comprovada, `page` quando a classificação se limitar à **página N comprovadamente identificada**, `unknown` apenas para **diagnóstico sem exportação** quando recorte/ordem não puderem ser verificados. `source.scope.page` é número positivo só no modo `page`, ou `null` no modo `all-results`. Exportador bloqueia `unknown`; importador rejeita recomendações com `unknown`. `rank` é posição relativa ao universo explícito em `scope`, nunca rank global implícito de outra página. Quando a ordenação não puder ser inferida, `source.sort` deverá ser `{ "key": null, "direction": null }`; quando o filtro não puder ser inferido, `source.filter` será `null` e a UI não afirmará “XP/h ↓” nem “sem filtro”. `wildLevelText` transporta a representação original (inclusive faixa se aparecer); `wildLevel` é número inteiro ou `null`, somente após parsing provado em F0. `attacker.speciesNameText` é string ou `null`, sem inventar speciesId. Campos opcionais `moveName`, `averageHitsText`, `kohText` ou números brutos requerem prova de origem/escala. `huntId` somente se público e comprovadamente compatível com IDs do jogo. Validar `schema`, `version`, domínio de origem, ISO timestamp, arrays/tipos, caracteres/bytes máximos, comprimento de strings, rank sequencial e números finitos; erro claro em input inválido. Não usar `innerHTML` para texto importado.

**Limite de confiança:** `source.url`, `capturedAt`, `attacker` e os números do JSON são **declarações de quem importou o texto**, não uma assinatura/autenticação do PPTools. A validação do esquema reduz corrupção e injeção, mas não comprova a autoria nem a contemporaneidade da simulação. A UI deve atribuir a origem como “dados importados do PPTools” e jamais tratar o payload como estado autoritativo do jogo.

### Identidade / navegação da hunt

- Preferir identificador estável **somente depois de provar equivalência de namespace** PPTools ↔ jogo. Na ausência, usar nome exato normalizado + mundo nativo + espécie/faixa de nível **quando disponibilizados**, sem eliminar colisões silenciosamente. Similaridade parcial não valida destino.
- Reconsultar a zona no momento do clique, usando o mundo atual, filtros, DOM ativo e estado nativo; se a zona desaparecer/reordenar, falhar fechado e manter a recomendação informativa. O modo mapa exige um ponto de integração **dentro do controller** para invocar sua seleção local e depois o pan nativo: `selectMarker` é interno de `controller.js`, enquanto `locateHunt` de `navigation.js` somente move o viewport e depende de marcador, zona, mundo e estado de navegação válidos.
- No modo lista, `mountCurrentListHunts` atualmente altera apresentação e envolve `startHunt`, mas não tem `Localizar` público. F2 deverá provar se uma linha nativa pode receber foco/destaque sem acionar seus botões de entrada; se não, exibir a recomendação com busca manual, sem simular click em `.hunt-list-hunt-button`.
- Resolver `0`, `1` e `N` candidatos separadamente. Nunca transformar índice visual ou nome homônimo em comando `startHunt`.
- A conta A não compartilha sugestões com B. **MVP verificado em fonte do host:** `AccountPane` constrói WebView2 por `Profile` imutável; Single/Dual/Focus/Swap move, reutiliza ou descarta a pane vinculada ao próprio perfil, sem reatribuir seu `Profile`. O importador fica exclusivamente no documento/WebView da pane, sem operações `await`; revalida documento/root no clique e faz cleanup em unmount. No standalone, estado fica no documento. **Mudança futura com async, sessão trocada dentro do mesmo perfil ou transporte automático:** exigir chave e época autoritativas de pane/perfil, verificar após cada `await` e cancelar tarefas antigas. Não inferir perfil a partir de foco global.

## Plano executável / marcos

| Fase | Entrega | Pré-condições e gate |
| --- | --- | --- |
| **F0 — Contrato externo** | Fixture de tabela PPTools reproduzível, cabeçalhos/atributos observáveis, prova de coluna/ordenação/filtro/**paginação/scroll/virtualização e completude da lista**, linhas de detalhe/rerender, identificação de espécie/hunt/níveis, formato de números; documentar DOM fallback e limites de extração | Technical Researcher → Architecture Lead / Technical QA. Página pública observada em 2026-09-29 não equivale a contrato estável. |
| **F1 — Extrator externo** | Userscript mínimo `@match https://www.pptools.com.br/hunt-analyzer*`, botão Copiar Top 3 ou Copiar recorte conforme scope, export JSON v1, feedback de erro e fallback de **texto selecionável para Ctrl+C manual** quando Clipboard API/permission faltar | Feature Engineer exclusivo → Technical QA; fixtures com ordenação invertida, filtro, scroll, paginação, virtualização, empates, 1/2/3 resultados, homônimos, linha de detalhe, clipboard negado. Nunca relatar cópia concluída se falhou. |
| **F2 — Importador Better UI** | Validação de JSON, exibição legível no Hunts, limpar/reimportar, identidade autoritativa pane/perfil em todo await, seleção+pan explícitos no mapa ou foco seguro/fallback na lista | Architecture + design contract antes de codificar; Hunt Engineer → Technical/UX/Visual QA, incluindo marcador ausente, mundo/filtro bloqueado, lista sem Locate, Single/Dual/Focus/Swap e importação tardia. |
| **F3 — Candidato isolado e aceite** | Testes de regressão, build, hashes/versões, screenshots de fixture, review independente e checklist curto de teste real para o PO | PM/Release → Product Owner. Host normal preservado; só PO valida o jogo real. |
| **F4 — Ponte automática (opcional)** | Investigar integração entre abas por **um mesmo userscript multi-origem**, extensão ou ponte WebView2 com controle de origem/perfil | Nova decisão de arquitetura e aceite de escopo; fora do MVP. Não presumir storage `GM_*` compartilhado por scripts distintos, `postMessage` sem relação entre janelas ou acesso cross-origin. |

**Fora do MVP:** duplicar o botão nativo COPIAR JSON, ler/interceptar o clipboard do jogo, automatizar o preenchimento do PPTools, reconstruir fórmulas ou rankings, armazenamento persistente, servidor intermediário, monitoramento contínuo, auto-navegação/auto-hunt e alteração da UI do site pelo desenvolvedor. **Confirmação manual não comprova a procedência**: verificação automática futura exigiria capturar identificador de instância do JSON original no momento do input, associá-lo de maneira demonstrável ao resultado daquela mesma simulação e compará-lo ao líder nativo no jogo; este contrato não foi provado pelo site atual.

**Arquivos da implementação manual histórica:** `tools/pptools-hunt-extractor/{ppbui-pptools-hunt-extractor.user.js,README.md}`, `test/pptools-hunt-extractor.test.js`, `src/modules/hunts/{pptools-recommendations,pptools-leader,controller,navigation,styles}.js`, `test/{hunts-pptools-recommendations,hunts-pptools-pipeline}.test.js`. O antigo `pptools-widget.js` foi removido por não possuir imports no aplicativo ou testes; os geradores `tools/pptools-hunts-synthetic-{preview,map}.mjs` foram removidos porque dependiam de DOM que esse widget excluído deixou de produzir. O gerador compatível com o fluxo atual é `tools/pptools-oneclick-synthetic-preview.mjs`; a interface ativa está em `pptools-oneclick-widget.js`. Não se alteraram `src/core/`, o módulo Cards, o botão nativo COPIAR JSON ou o projeto externo `pokepixel-hunt-analyzer` nesta implementação manual.

## Acceptance & Evidence Matrix

| ID | Requisito observável e preservação | Evidência necessária | Produtor / revisor | Status |
| --- | --- | --- | --- | --- |
| `AC-01` | Extrai até 3 linhas **na ordem lógica do conjunto elegível**, independentes da posição do scroll, mantém espécie repetida em hunts diferentes, sem alterar a simulação | DOM com scroll acima/abaixo, duplicatas, empates, 1/2/3 linhas, loading, virtualização/paginação | Extrator / Technical QA | `pass` (fixture; runtime PPTools live-only) |
| `AC-02` | Critério, filtro e `source.scope` refletem a tabela; XP/h ↓ **global** só se ordem/completude forem provadas | XP/h, Gold/h, filtro, página N, virtualização, ordem ou scope desconhecidos com saída explícita | Extrator / Technical QA | `pass` (bundle público pinado + fixture) |
| `AC-03` | Schema v1 e conteúdo não confiável importados com limites, sem scripts ou vazamento; texto de nível fiel | negativos JSON/version/origin/tamanho/NaN/strings HTML, nível em faixa, atacante com só nome, clipboard negado e fallback Ctrl+C | Importador / Technical QA | `pass` (parser + fixture) |
| `AC-04` | UI exibe fonte, data, critério, espécie/hunt, nível, XP/h e Gold/h, reimportar/limpar, feedback por estado | DOM, A11y/foco/locale, render real de fixture a largura estreita e larga | Hunt Engineer / UX + Visual QA | `evidence-insufficient` (lista e mapa sintéticos re-renderizados com textarea fiel ao source; host real pendente) |
| `AC-05` | Localizar só com zona única revalidada; 0/N candidatos são informativos; importar/localizar não inicia hunt; ação removida de consulta anterior permanece inerte mesmo após nova importação | fixtures nativos 0/1/N, homônimo/mundo/filtros/remount, marcador ausente, botão antigo de Q1 após importação de Q2 e spy em `startHunt` | Hunt Engineer / Technical QA | `pass` (negativos/fluxo local; live-only visual) |
| `AC-06` | Mapa integra seleção do controller + pan condicionado à geometria/mundo; lista usa foco seguro comprovado ou fallback sem ação | fixture dos dois modos, estado de seleção/Inspector, pan, lista sem API Locate, nenhuma chamada de botão de iniciar | Hunt Engineer / Technical + UX QA | `evidence-insufficient` (funções sintéticas PASS; pan/Inspector no host não renderizados) |
| `AC-07` | Contexto de importação permanece no documento/WebView do perfil imutável; sem cruzar perfis nem completar ações após cleanup | smoke A/B, Single/Dual/Focus/Swap, Cards/Game, troca de pane/mode, SPA e importação pendente com resposta tardia | Hunt Engineer / Technical QA | `pass` (source host + isolamento de documentos, sem await; live-only contas) |
| `AC-08` | Sem API privada, interceptação de rede, jogo automatizado ou credenciais | auditoria de grants, rede, seletores e comandos nativos | Architecture / Technical QA | `pass` (source/read-only) |
| `AC-09` | Candidato exato tem checks e gates corretos; nenhuma alegação de validação live por agente | testes/build/diff, hashes, renders, QA independente e decisão do PO | PM + Release / QA + PO | `evidence-insufficient` (render nativo e aceite live pendentes) |
| `AC-10` | Importação exige exatamente um líder nativo conectado/consistente e declaração explícita de que o JSON usado no PPTools e o Top 3 pertencem à mesma consulta desse líder; texto do JSON não pode mudar após a confirmação | fixtures sem líder, múltiplos líderes, HUD antigo solto, conflito Team/HUD, caixa não marcada, edição após confirmação com/sem evento, parse inválido e nova consulta sem reconfirmação | Hunt Engineer / Technical + UX QA | `pass` (teste RED→GREEN e DOM sintético; declaração não é prova de procedência) |
| `AC-11` | Resultados não migram para outro líder ou conta; mudança de ID, nível, espécie ou sessão descarta os 3 cards e impede uso posterior, inclusive A→B→A; evento de outro membro não invalida indevidamente; último evento autoritativo de líder supera ID pendente anterior | testes de leader switch, level-up, HUD ausente, Team re-sync, eventos A→B→A antes de refresh do HUD, auth logout, foco após revogação | Hunt Engineer / Technical + UX QA | `pass` (DOM sintético; live PO pendente) |

## Riscos, decisões e gates

| Risco | Hipótese de falha | Evidência / contenção |
| --- | --- | --- |
| R1 — DOM mutável | Next.js altera tags, colunas ou estrutura; extrator lê coluna errada | validação de cabeçalhos/contagem com fixture, falha explícita sem exportar |
| R2 — ranking/recorte | Ordenação interna pode diferir de XP/h; sort/filter/scroll/paginação/virtualização podem produzir falso Top 3 global | registrar `scope`, sort/filter e provar ordenação do conjunto completo; página identificada recebe rótulo próprio; `unknown` bloqueia exportação |
| R3 — nome/identidade | nomes homônimos, variantes, região e nível geram mapeamento falso | exigência de candidato único; 0/N → busca manual |
| R4 — mapas/listas | `locateHunt` apenas faz pan; seleção local não é API pública; lista não possui Locate e zona pode desaparecer | ponto de integração do controller, revalidação por modo e fallback seguro sem clique de gameplay |
| R5 — navegador e perfis | clipboard bloqueado, payload atrasado, duas contas simultâneas e foco global não representa pane correta | fallback Ctrl+C selecionável, feedback veraz, identity bind por pane e recheck em awaits/Swap |
| R6 — layout | novos controles congestionam Hunts em Dual ~235px e causam clipping/foco perdido | design gate e capturas sintéticas representativas, Visual QA independente |
| R7 — métricas | estimativas do PPTools envelhecem ou não correspondem ao atacante atual | fonte/critério/data visíveis; atacante desconhecido explícito; nenhuma inferência de atualidade |
| R8 — proveniência do líder | PPTools não expõe ID da instância nem comprova que o resultado foi calculado com o JSON colado anteriormente | declaração explícita marcada como não verificada; gate local de ID/nível/espécie e novo JSON após troca; futura ligação automática só após prova do input-to-result |

**Gates nesta implementação (2026-09-29):** F0 fonte pública estática/HTML e JS pinados; HTTP público reconsultado com HTTP 200, script `page-9d9eef42c7a86dae.js` de **57.881 bytes** e SHA-256 `1f04744f77b61071a48715d6f5945d1ea641ac9be8bd228f600b51f6d90f07b7`, idêntico ao bundle F0. F1 extrator e F2 importador implementados. Três cenários P2 (confirmação sobre JSON alterado, botão antigo após nova importação e evento rápido A→B→A) foram reproduzidos como testes negativos antes das correções e passaram depois. Full Better UI **521/521 PASS**; testes focados do extrator/importador **40/40 PASS**, Hunts original **43/43 PASS**. Build `0.2.118` PASS; o smoke sintético do host preexistente `candidate115.exe --smoke` havia passado separadamente, sem rebuild do host nesta rodada. Renders offline regenerados de lista importada/formulário e mapa em **235/410/680 px**, agora sem esconder artificialmente o textarea após importação. **Technical QA independente do source final `0.2.118-r2`: P0=0/P1=0/P2=0** após rechecagem dos dois patches de replay e dos guards de leader/consent/cleanup. **Visual QA independente: VISUAL READY somente para os renders HTML sintéticos `0.2.118-r1`** de lista/formulário/mapa em 235/410/680, sem clipping ou scroll horizontal aparente do widget; nos dois HTMLs da lista/formulário a geração atual `r2` possui hash idêntico ao visualizado, e o mapa `r2` apenas regenerou IDs internos e foi capturado novamente. Hitbox `pointer:coarse`, estados de foco e contraste WCAG numérico não foram medidos nesses PNGs. **VISUAL EVIDENCE INSUFFICIENT no F2 integral**: a página real do jogo, DOM/CSS nativos exatos e seleção/pan em mapa não foram capturados por agente. Nenhuma validação em jogo/site PPTools após simulação real foi realizada por agente. PM handoff somente **PRE-LIVE DIAGNOSTIC CANDIDATE**, sem promoção normal, commit, push ou merge. F4 fora do escopo atual.

**Par diagnóstico congelado, somente para o Product Owner testar manualmente:** `tools/coupled-workspace-webview2/bin/pptools-hunt-candidate-v0.2.118-r2/`. Better UI `pokepixel-better-ui.pptools-v0.2.118.user.js` = **1.193.814 bytes**, SHA-256 `5493B26C706DE6528EF634A2A167CB1BDFE4F1B04A22356E72FD5FF54428B5FC`; extrator `ppbui-pptools-hunt-extractor.v0.1.0.user.js` = **11.835 bytes**, SHA-256 `0CD863E522F5C975688833885AAD33E991AE951682572581A20CCED20936B2BA`. O subdiretório `evidence/` contém HTML e capturas PNG sintéticas de lista importada, formulário e mapa (235/410/680 px); os HTMLs de lista/formulário gerados após as últimas correções são SHA-idênticos aos renderizados na rodada anterior, e mapa novo foi renderizado do HTML atual. Os arquivos do par foram copiados do build e script F1 sem sobrescrever candidatos anteriores; verificar seus hashes antes de distribuir. Host normal e `pokepixel-hunt-analyzer` preservados. O host isolado `candidate115.exe` já existente pode consumir o novo `dist/` para teste sintético; nenhum novo executável foi compilado/promovido para esta integração.

**Pendências de aceitação:** 1) proprietário confirmar a exportação na tabela **real** do PPTools (pode falhar fechado se o site mudar de build); 2) abrir o hover do **líder atual** e utilizar **COPIAR JSON**, colar esse JSON no PPTools e executar a simulação; 3) importar o Top 3 na pane correta confirmando manualmente a identidade do líder exibido, verificar estados indisponível/ambíguo e mudança A→B→A/level-up; 4) confirmar foco da lista e seleção/pan do mapa sem iniciar Hunt, em 235px/1180px Dual, com teclado/foco. Limites: sugestões são estimativas e o PPTools não comprova a instância atacante. Associação por `huntName`/zona pode não ser possível em várias zonas; ausência de identidade única mantém opção informativa, sem inventar destino.

**Checklist live futuro (somente PO):** 3 resultados do PPTools com JSON real; top conforme sort/filter; export/import por perfil; recomendação resolvida vs ambígua; navegação em mapa e lista sem iniciar Hunt; Dual/1:2, teclado/foco, limpeza e sessão nova.

**Autoridades:** `AGENTS.md`, `docs/PROJECT_RULES.md`, `docs/PROJECT_WORKFLOW.md`, `docs/modules/hunts.md`, `design-system/pokepixel-better-ui/pages/hunts.md`, `src/modules/hunts/{dom,controller,navigation,dossier}.js`. Fonte externa mutável consultada em 2026-09-29: https://www.pptools.com.br/hunt-analyzer .
