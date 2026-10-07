# Proposta — organização da menu bar por perfil

Status: **PROPOSTA HISTÓRICA IMPLEMENTADA EM 0.2.182; FUNCIONALIDADES APROVADAS IN-GAME**.
Em 2026-10-07T15:54:20Z o Product Owner substituiu as restrições de posições fixas
por liberdade de destinos e capacidade de 10 a 15 slots. O contrato atualizado está
em `menu-bar.md` e `../PM_GATE_2026-10-07_MENU_FREEDOM.md`; os limites fixos de treze
e a cauda de sistemas descritos abaixo documentam a proposta anterior, não o ajuste.
O ajuste `0.2.183` foi validado e aprovado in-game pelo Product Owner em
2026-10-07T17:03:19Z: “Bar custom validada e aprovada.”
Autorização: Product Owner, “Ok, implemente”, 2026-10-07T14:46:55Z.
Data: 2026-10-07. Autor: Project Manager / Requirements + Architecture analysis.
Base inspecionada: checkout atual de Better UI `0.2.181`.

Pedido: permitir ao jogador personalizar a ordem e o local dos ícones da menu bar,
com organização independente por perfil. Esta proposta define o escopo autorizado.

## 1. Recomendação de produto

Criar **Better UI > Menu bar > Personalizar**: um editor separado com prévia da
barra principal, lista dos grupos existentes e seleção de destino para cada ícone.
O jogador poderá ordenar a barra, ordenar os itens dos grupos e mover destinos
compatíveis entre a barra e os grupos. O layout padrão continua sendo a organização
atual; nenhuma conta recebe reorganização automática por frequência de uso.

Premissa proposta: **perfil = treinador/conta do jogo identificado pelo ID nativo**,
dentro deste navegador e origem do jogo. Não significa uma ficha de Pokémon.
Perfis de navegador já são contextos locais separados; a chave por treinador também
separa contas que usam o mesmo contexto de navegador. Um seletor de presets como
Farm/PvP/Cidade seria uma evolução adicional, não requisito desta primeira entrega.

"Local do ícone" significa barra principal ou um grupo, mais sua posição na sequência.
A posição da barra inteira continua sendo controlada pelo arraste do Poké Hub.
Não se propõem coordenadas livres para cada ícone, múltiplas barras ou submenus aninhados.

## 2. Evidências da implementação atual

| Fato observado | Fonte local |
| --- | --- |
| Grupos e ordem principal são definidos em código. | `src/modules/menu-bar/config.js:34-57` |
| A montagem registra parent e ordem esperados; `isIntact()` rejeita deslocamentos e o módulo pode remontar com a distribuição original. | `src/modules/menu-bar/controller.js:414-459,513-516,699-706`; `src/modules/menu-bar/index.js:14-20`; `src/core/bootstrap.js:18-34` |
| Posição usa uma chave local global, sem ID do jogador. | `src/modules/menu-bar/config.js:3`; `src/modules/menu-bar/controller.js:461-476` |
| Existe suporte H/V e retenção em memória; não foi encontrado armazenamento persistente de orientação no código atual de `src`. | `src/modules/menu-bar/index.js:8-31`; `src/modules/menu-bar/controller.js:221-234` |
| O contrato horizontal atual tem 13 posições. | `src/modules/menu-bar/styles.js:18-33` |
| Better UI é recolocado como último filho; Cards/Game exige parent na toolbar e começa em Game. | `src/modules/module-controls/controller.js:230`; `src/modules/card-mode/index.js:108-131,181-182` |
| City publica um contrato para ações contextuais; Hunt Controls coloca Return to City primeiro e associa badge ao trigger City. | `docs/modules/menu-bar.md:21-27`; `src/modules/hunt-controls/controller.js:38-46,128-136` |
| Algumas notificações pertencem ao trigger do grupo, não ao item; preservar o nó não prova que uma nova distribuição preserve a semântica do badge. | `test/menu-bar.test.js:769-792`; `docs/modules/menu-bar-plan.md:237-238` |
| Tags já separa dados por ID nativo do treinador e observa mudanças entre contextos locais. | `src/modules/pokemon-tools/model.js:27-28,60-70` |
| `src/index.js` fornece `menuBar` a module-controls, mas a factory atual não recebe/utiliza esse argumento. O editor precisará de ligação explícita. | `src/index.js:22-26`; `src/modules/module-controls/index.js:6-20` |

Consequência: adicionar drag-and-drop sobre o DOM atual seria insuficiente. A ordem
escolhida precisa se tornar entrada do mecanismo de montagem/reconciliação e dos
testes de integridade. O ID do perfil também precisa controlar a persistência.

## 3. Experiência de edição

O editor tem três regiões: prévia ordenável da barra, grupos/destinos disponíveis e
detalhes do item selecionado. Cada item apresenta ícone, nome completo e local atual.
A miniatura do editor é apresentação passiva; clicar nela seleciona o item e jamais
executa a ação correspondente no jogo.

1. Abrir **Personalizar**, com o perfil ativo identificado no cabeçalho.
2. Arrastar itens na prévia para ordenar. Para trocar de local, arrastar para um
   grupo ou usar **Mover para: Barra / Treinador / Cidade / ...**, indicando a posição.
3. Oferecer **Anterior/Próximo** e **Mover para** como alternativas ao arraste por
   teclado. Na horizontal, a sequência se lê esquerda→direita; na vertical, cima→baixo.
4. **Salvar** valida e aplica o rascunho; **Cancelar/Escape** descarta. **Restaurar
   padrão** muda apenas o rascunho deste perfil e também exige Salvar.

A prévia é local ao editor. Durante a edição, os nós acionáveis da barra real
permanecem na organização aplicada, evitando ações acidentais, saltos de foco e
conflito com o handle que arrasta a barra inteira. O editor não altera o combate.

O fluxo deve funcionar em Game e Cards. Sua superfície precisa ser integrada
explicitamente à visibilidade de Card Mode: um diálogo pendurado arbitrariamente
no `body` seria ocultado pelas regras desse modo. O editor não usa `data-menu-id`
nas suas miniaturas/ações de edição, evitando ser confundido com navegação do jogo.

## 4. Escopo recomendado da primeira entrega

| Capacidade | Proposta |
| --- | --- |
| Ordem da barra principal | Reordenar grupos e atalhos de navegação, preservando controles estruturais. |
| Ordem dentro de um grupo | Reordenar os destinos do grupo; manter ações contextuais na posição contratada. |
| Barra ↔ grupo / grupo ↔ grupo | Permitido para destinos com integração de eventos, visibilidade e badges verificada. |
| Horizontal / Vertical | Mesma sequência lógica nas duas orientações; preferência por perfil. |
| Posição da barra inteira | Continuar usando o drag nativo, guardando a posição por perfil e limitando-a à viewport. |
| Recuperação | Restaurar padrão do perfil; reabrir editor pelo botão Better UI sempre acessível. |

Exemplos de uso: colocar Hunts antes de Inventory; trazer Tools para perto dos
menus de uso frequente; deixar Geneticista/Nature no início de City; promover
Pokémon Profile à barra após liberar uma posição. Os exemplos não mudam o padrão.

### Capacidade e restrições propostas

- Manter **13 posições principais**, com **Cards/Game e Better UI reservados no
  final** e os controles de arrastar/minimizar fora da personalização. Cards/Game
  conserva o mesmo nó/slot ao alternar modo; iniciar continua significando Game.
- Inventory, Hunts e Mailbox continuam diretos no MVP, mas sua ordem pode mudar.
  Isso preserva os caminhos de acesso e a notificação já estabelecidos. Settings
  pode ser colocado em Tools após validar seu comportamento; Better UI permanece
  como caminho fixo para recuperação do layout.
- Promover um ícone com a barra cheia requer liberar uma posição no mesmo rascunho.
  Mostrar o contador de ocupação; não criar uma 14ª posição, encolher ícones,
  ocultar arbitrariamente outro destino ou adicionar uma segunda linha.
- Um destino tem **um único local**. Grupos não entram em outros grupos. Grupos
  vazios podem deixar de ocupar posição, exceto City, que mantém a integração de
  Return to City. Lugares vazios do editor não viram botões falsos no runtime.
- **Return to City permanece primeiro em City**, com seu badge/contexto intactos.
  Os atalhos próprios Geneticista/Nature/Evolution Center/Gyms precisam de IDs
  distintos dos `data-menu-id` nativos e integração explícita de navegação em Cards.
- **Quests/Battle Pass/Daily Gift permanecem em Goals na primeira entrega**; podem
  mudar de ordem dentro dele. Alterar o grupo de um destino com badge agregado só
  será liberado após verificar a origem e manter a associação correta da notificação.
  O editor explica a restrição, sem apresentar um drag que será ignorado.
- Não incluir ocultação manual, duplicação de atalhos, grupos personalizados,
  ícones renomeados/trocados, presets múltiplos ou sincronização na nuvem nesta fase.

Essas restrições são decisões propostas para aprovação, não limitações universais
da plataforma. Mudança livre de todos os destinos exigiria contratos adicionais,
especialmente para badges e ações fornecidas por outros módulos.

## 5. Persistência e isolamento

Usar armazenamento local versionado por treinador, por exemplo
`ppbui:menu-layout:v1:<trainerId codificado>`. A origem já faz parte do isolamento do
armazenamento. Confirmar o escopo dos IDs nativos antes de considerar mundos/servidores
independentes; não usar nome exibido como chave.

O registro armazena somente IDs estáveis, ordens/locais, orientação e posição da
barra. Não guardar HTML, DOM, handlers, URLs de ícones, permissões, contadores de
notificações ou uma cópia do estado do jogo. Exemplos de espaços de IDs:
`group:city`, `native:inventory`, `betterui:pokemon-profile`,
`city-shortcut:geneticist`, `system:card-mode`, `system:module-controls`.

Identidade não resolvida: usar o layout padrão e não salvar em um perfil genérico.
Troca de conta/logout: fechar o editor, invalidar o rascunho e quaisquer saves
pendentes do perfil anterior, então aplicar exclusivamente o layout do novo owner.
Comparar fontes de identidade durante reidratação para não herdar um ID stale.

Storage indisponível: aplicar apenas à sessão, com aviso explícito de que a escolha
não foi persistida. JSON corrompido/versão futura não suportada: usar padrão de forma
reversível, sem destruir o dado original silenciosamente. Validar IDs, destinos,
unicidade, ciclos, tamanho do registro, coordenadas finitas e limite de posições.

Para a posição antiga global, preservar a chave legada. O primeiro perfil confirmado
pode inicializar sua posição com a geometria atual; os demais partem do padrão e
não copiam a posição salva de outra conta. Clamp por viewport reutiliza o mecanismo
existente; não reintroduzir a opção nativa top/bottom já retirada por conflito com drag.
Orientação por perfil é uma preferência persistente nova, inicialmente horizontal;
o código atual não oferece uma preferência H/V persistida a migrar.

Outras abas do mesmo perfil podem receber atualizações por `storage`. Com um editor
sujo, avisar sobre versão externa e exigir recarregar ou sobrescrever explicitamente.
Revisão/releitura reduz conflitos, mas `localStorage` sozinho não oferece compare-and-set
atômico; não prometer ausência absoluta de corridas simultâneas. Não há sincronização
automática entre dispositivos ou perfis distintos do navegador.

## 6. Aplicação e lifecycle

Separar **layout desejado salvo** de **destinos atualmente disponíveis**. Um item
temporariamente ausente conserva sua preferência e retorna ao local salvo quando o
jogo o fornecer. Isso não permite mostrar uma ação escondida por permissão nem
fabricar uma ação ausente. Não expor metadados restritos no catálogo do editor.

Ícones novos reconhecidos entram no grupo padrão/origem ao final, sem reordenar os
itens personalizados. Itens desconhecidos permanecem na estrutura nativa até serem
classificados; não são descartados nem automaticamente promovidos. Se uma estrutura
nativa nova não puder coexistir com a distribuição/limite, suspender a aplicação
customizada e preservar o acesso nativo, com aviso de compatibilidade. Esse estado
não será apresentado como layout personalizado validado de 13 posições.

Somente Menu Bar deve resolver o posicionamento dos participantes personalizáveis.
O editor fornece um modelo validado; não disputa o DOM com `sync()`/`isIntact()`.
`config.groups/order` passa a descrever o padrão, não a ordem obrigatória de todo perfil.
Os controles externos continuam sendo criados/destruídos pelos módulos que os possuem.

Formalizar um contrato de registro de participantes `system:card-mode` e
`system:module-controls`: os módulos mantêm criação, handlers e teardown; Menu Bar
resolve os slots e inclui ambos no layout esperado de `isIntact()`. A integração
deve funcionar independentemente da ordem de montagem e de substituições da toolbar.
Quando Menu Bar estiver desativado, cada dono retoma seu posicionamento padrão.
Isso exige ligar o argumento `menuBar` hoje ignorado por module-controls e fornecer
a mesma integração ao Card Mode, sem manter dois escritores concorrentes de posição.

Para City shortcuts autorizados a sair de City, `ownedCityActions` também passa a
validar o parent definido no layout, em vez do dropdown City capturado na montagem.
Return to City é a exceção contextual: continua primeiro em City e não entra no
registro persistido de locais/ordens escolhidos pelo jogador.

Movimentar os mesmos nós acionáveis, adaptando classes/estilos/semântica ao destino.
Preservar listeners, filhos, badge e atributos de atalhos. A ordem DOM deve acompanhar
a ordem visual; uma solução apenas com CSS `order` não satisfaz a navegação de teclado.
Rever listeners de fechamento associados ao grupo antigo: preservar o botão não
prova que suas closures/delegação continuem corretas num grupo novo.

Salvar aplica o layout como uma operação controlada: validar owner/revisão/destinos,
fechar popups, aplicar mudanças mínimas e verificar integridade; uma falha restaura
a última organização aplicada. Apenas depois consolidar o estado salvo. Falha de
storage mantém a indicação de sessão. Não remexer no DOM a cada tick ou usar um
observer por feature. Resize/orientação atualizam clamp/popups/Buff Strip e o espaço
reservado por Card Mode sem mudar a sequência escolhida.

Desativar Menu Bar restaura a estrutura nativa e preserva o registro por perfil.
Reativar reaplica o layout salvo. Teardown avisa consumidores via contrato existente
antes de devolver wrappers/nós, inclusive para mudanças durante uma caçada.

## 7. Recorte técnico e sequência

1. **Modelo + persistência**: catálogo de participantes e capacidade, normalização de
   layout, identidade do owner, armazenamento e migração. Arquivos sugeridos dentro
   de `src/modules/menu-bar/`: `layout-model.js`, `layout-storage.js`.
2. **Montagem a partir do modelo**: adaptar config/controller/dom/index e os checks
   de integridade; integrar controles externos e contexto City, com regressões de
   identidade/listeners/badges/reidratação. Sem edição visual, já deve aceitar um
   layout de teste e sobreviver a rebuild sem ser resetado.
3. **Editor + entrega**: `layout-editor.js` e estilos escopados, ligação explícita com
   module-controls, render local com contratos representativos, revisão técnica,
   UX/Visual e candidato para validação in-game do usuário.

O primeiro e o segundo incrementos são partes internas, não uma entrega que omite
a capacidade de escolher onde colocar ícones. Evitar espalhar preferências desta
feature pelo core ou migrar as preferências de todos os outros módulos.

Complexidade estimada qualitativamente: ordenar no mesmo container é baixa/média;
permitir movimentação entre containers, isolamento de owner e integração com
rebuilds/badges é média/alta. O risco principal é lifecycle e semântica nativa,
não o componente de drag-and-drop. Não há estimativa de prazo antes de fechar os
destinos liberados e seus contratos.

## 8. Critérios de aceitação propostos

| AC | Resultado verificável antes de entregar |
| --- | --- |
| AC-MBC-01 | Perfil A e B mantêm layouts distintos após reload, troca de conta e retorno a A; identidade pendente não recebe dados de A. |
| AC-MBC-02 | Barra e grupos respeitam a ordem salva após rebuild total/parcial, mudança de idioma e alternância Game/Cards; sync estável não gera mutações contínuas. |
| AC-MBC-03 | Mover um destino autorizado altera seu local e ordem sem duplicar nó/listener, perder shortcut/badge ou disparar ação durante a edição. |
| AC-MBC-04 | Destinos temporariamente ausentes retornam ao lugar salvo; itens restritos continuam ocultos/disabled conforme o jogo. |
| AC-MBC-05 | Salvar rejeita duplicatas/ciclos/overflow; Cancelar/Escape/restaurar rascunho têm efeitos previsíveis; falhas preservam a última organização válida. |
| AC-MBC-06 | Cards/Game e Better UI permanecem acessíveis e estáveis; drag/collapse nativos e Return to City mantêm seus contratos. |
| AC-MBC-07 | Editor funciona com mouse e teclado nos modos Game/Cards; foco retorna ao invocador; prévias não executam ações. |
| AC-MBC-08 | Posição/orientação são por perfil, reabrem dentro da viewport e não conflitam com Buff Strip, popups ou clamp nativo. |
| AC-MBC-09 | Storage bloqueado/corrompido, formato futuro, mudanças em outra aba e troca de owner durante edição não geram falso sucesso ou gravação na conta errada. |
| AC-MBC-10 | Desativar/restaurar Menu Bar não perde ações nativas; reativar reaplica preferências; fonte/render correspondem ao candidato validado. |

## 9. Limites desta análise

O texto acima registra o escopo aprovado. A implementação posterior está no candidato
0.2.182; evidências e status dos gates ficam em `docs/PM_GATE_2026-10-07_MENU_LAYOUT.md`.
O aceite in-game permanece do Product Owner. Contratos
de handlers/badges dos destinos liberados precisam de evidência específica na execução;
tests e docs históricos não provam compatibilidade irrestrita com todos os menus.

Revisão arquitetural independente read-only confirmou viabilidade. Os ajustes
solicitados foram incorporados: registro explícito dos slots de sistema, inclusão
deles no layout esperado, ownership dos City shortcuts baseado no destino escolhido
e distinção entre migração da posição legada e persistência nova da orientação.
Esse parecer histórico é de viabilidade da proposta, não um gate de implementação ou visual.
