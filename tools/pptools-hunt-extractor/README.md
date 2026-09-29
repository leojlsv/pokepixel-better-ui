# PPTools Hunt Analyzer → exportação manual Top 3

> **HISTÓRICO — NÃO INSTALAR.** Este userscript e o importador manual foram
> superados pelo fluxo aprovado de recomendação em um clique no candidato
> WebView2. O widget manual deixou de existir no Better UI atual. As instruções
> abaixo registram apenas o protótipo anterior; não constituem o procedimento
> de instalação ou validação vigente. Consulte
> `docs/PPTOOLS_HUNT_RECOMMENDATIONS_PLAN.md` e
> `tools/coupled-workspace-webview2/README.md` para os limites do candidato
> atual. Não executar esse experimento no navegador real como validação técnica.

**Estado:** F0 — evidência pública estática registrada; F1 — userscript e testes sintéticos implementados. A renderização após uma simulação real e qualquer validação no PokePixel são exclusivas do Product Owner. Este artefato ainda não constitui um candidato integrado aprovado.

## Procedimento histórico (descontinuado)

1. Instale manualmente `ppbui-pptools-hunt-extractor.user.js` no gerenciador de userscripts de sua escolha. Seu único `@match` é `https://www.pptools.com.br/hunt-analyzer*`, com `@grant none` e `@noframes`. O código também verifica a URL exata em tempo de execução.
2. No [PPTools Hunt Analyzer](https://www.pptools.com.br/hunt-analyzer), preencha o Pokémon atacante (inclusive pela importação JSON nativa) e execute a simulação.
3. Clique em **Copiar Top 3 / recorte** no painel discreto. Se a tabela tiver a estrutura e a versão pública verificadas, o script copia o JSON de três linhas (ou menos, caso haja menos resultados). A ordenação e o filtro efetivos são preservados.
4. Caso a Clipboard API não esteja disponível ou negue acesso, o painel apresenta o JSON em um campo selecionável: pressione **Ctrl+C** para copiá-lo manualmente. O painel não afirma que a cópia foi realizada nessa situação.
5. Cole o JSON no importador manual da janela Hunts do Better UI quando ele estiver disponível em um candidato autorizado.

Não há transferência automática entre sites, servidor intermediário, token, sincronização de contas, comandos de gameplay nem alteração da simulação. Dados exportados são **estimativas geradas pela página pública do PPTools**, de autoria de Eric / bar (gcanivel), e não representam o estado autoritativo do PokePixel. Atribuição da fonte: [PPTools / Hunt Intelligence](https://www.pptools.com.br/hunt-analyzer).

## F0 — evidência observada por HTTP público em 2026-09-29

| Evidência | Resultado |
| --- | --- |
| GET público da página | `https://www.pptools.com.br/hunt-analyzer` → HTTP 200; HTML inicial inclui a configuração do atacante, mas resultados só aparecem após executar a simulação. |
| Código JS público carregado na página | `https://www.pptools.com.br/_next/static/chunks/app/hunt-analyzer/page-9d9eef42c7a86dae.js` |
| Identificação do JS consultado | 57.881 bytes; SHA-256 `1f04744f77b61071a48715d6f5945d1ea641ac9be8bd228f600b51f6d90f07b7` |
| Ordenação inicial | O estado público é `{key:'xp',direction:'desc'}`. Botões de cabeçalho `Ordenar por ...` mostram `↑`, `↓` ou `↕`, permitindo identificar a coluna e direção efetivas sem consultar estado React. |
| Preparação dos resultados | A página filtra por nome de Pokémon, associa um rank e ordena a lista antes de renderizar cada elemento resultante em `tbody` por `map`; no trecho inspecionado não há `slice`, componente de paginação ou janela virtualizada limitando essas linhas. |
| Tabela pública esperada | Contêiner `section[aria-labelledby="hunt-results-title"]`, `table` com 9 cabeçalhos: Pos.; Pokemon / hunt; Nível; Move principal; Média de hits; Resultados ruins; KOH simulado; XP/h; Gold/h. |
| Textos de uma linha | A segunda célula renderiza nome do Pokémon selvagem e nome da hunt como os primeiros dois componentes Text separados; terceira célula renderiza nível; oitava e nona mostram primeiro Text compacto `/h` ou `Indisponível`. |
| Elementos adjacentes | Campo de busca `input[aria-label="Buscar Pokemon por nome"]`; total `N Pokemon simulados` refere-se à simulação inteira mesmo quando a busca por nome reduz linhas; linha de detalhes opcional ocupa uma célula `colSpan=9`. |

Esta é **evidência estática do bundle público**, não captura visual de uma simulação real. A ausência de paginação ou virtualização foi observada nesse código, mas não verificada interativamente em todos os estados do site. O userscript deixa de exportar se o bundle publicado não for a versão inspecionada. Novas versões exigem reavaliar a completude e atualizar o pin após prova. Não são acessados API privada, endpoint de resultado, `localStorage` do site ou módulo interno em runtime.

## Contrato de extração e limites

- O extrator procura a tabela por seção, quantidade e nomes dos nove cabeçalhos e somente lê o DOM público. As três primeiras linhas são tomadas **da ordem lógica completa no DOM**, inclusive quando o viewport está rolado. Espécies repetidas em hunts distintas permanecem linhas diferentes.
- `source.scope` é **somente** `{"kind":"all-results","page":null}` nesta versão. Exige bundle conhecido, rank contínuo começando em 1, estrutura estável, ausência de paginação/virtualização detectável e total compatível. Se a busca estiver vazia, a quantidade de linhas deve ser idêntica ao total da simulação. Se houver paginação/virtualização nova ou completude indeterminada, falha explicitamente e não produz um `scope=unknown` nem um Top 3 global falso. Recortes paginados não são exportados neste MVP.
- `source.sort` usa a coluna do único botão ativo e sua direção; `source.filter` conserva o texto atual do input. Não pressupõe XP/h descendente quando os controles foram modificados.
- `wildSpeciesName` e `huntName` vêm dos dois Texts distintos da segunda célula. `wildLevelText`, `xpPerHourText` e `goldPerHourText` preservam a representação visível. `wildLevel` só é inteiro quando o texto é inteiramente decimal; caso contrário, é `null`. Métricas compactas não são convertidas em números.
- `attacker.speciesId`, `attacker.speciesNameText` e `attacker.level` são `null` nesta versão: a identidade do atacante não foi comprovada como parte da tabela de resultados. Não se inventa um Pokémon ou líder ativo.
- A URL de origem é a URL pública canônica, timestamp em ISO UTC da captura. Texto externo é lido com `textContent`, sem `innerHTML`; o script não lê credenciais, não chama endpoints e não envia informação à rede.
- A origem e o tempo dentro do JSON são informações **declaradas no payload**, não assinatura ou comprovação de identidade/frescura. O importador deve revalidar schema/limites/conta ao receber os dados.

## Validação local

```powershell
node --test test/pptools-hunt-extractor.test.js
```

Os testes com DOM sintético cobrem payload v1, XP e Gold com ordenação alterada, filtro ativo, rank ascendente, espécies repetidas, scroll, detalhe expandido, 1/2/3 resultados, nível textual, ausência de XP principal, faltas de simulação/cabeçalhos/bundle, posições ausentes, total incompleto, paginação, virtualização, ordenação ambígua, ausência/negação da Clipboard API, fallback Ctrl+C e URL fora de escopo. O teste não executa a simulação nem inspeciona o jogo, navegador do usuário ou Tampermonkey.

**Pendências para decisão de release:** validar a correspondência DOM durante uma simulação real por evidência legítima do PO, inspecionar os efeitos visuais do painel em diferentes larguras com QA independente e verificar exportação/importação no candidato exato. Se um novo deploy público alterar o hash ou markup, atualizar a evidência F0 antes de alterar a lista de bundles reconhecidos.
