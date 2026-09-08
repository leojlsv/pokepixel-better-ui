# Chat — reaproveitamento do Custom UI

Status: módulo Chat validado e aprovado pelo usuário, incluindo os ajustes
de layout e a correção do crescimento da janela ao clicar na rolagem horizontal.
Gestão de abas implementada sobre o DOM nativo, sem substituir o chat.
Inventory permanece validado e aprovado.

## Fontes consultadas

- `G:/pokepixel-custom-ui/src/modules/chat/ChatWidget.tsx`
- `G:/pokepixel-custom-ui/src/modules/chat/chat-model.ts`
- `G:/pokepixel-custom-ui/src/adapters/chat.ts`
- `G:/pokepixel-custom-ui/src/bridge/chat-actions.ts`
- `G:/pokepixel-custom-ui/src/bridge/chat-action-contract.ts`
- `G:/pokepixel-custom-ui/src/store/chat-preferences-store.ts`
- `G:/pokepixel-custom-ui/src/types/chat.ts`
- `G:/pokepixel-custom-ui/docs/project/module-contracts/persistent-chat-phase-1.md`
- Relatórios automatizado e smoke do chat persistente no mesmo projeto.

O código atual é a referência de implementação; o contrato contém relatos
históricos de iframe que não devem ser tratados como arquitetura desejada.
O relatório de smoke ainda registra pendência. Não se transfere aprovação
automática daquele projeto para este.

## Funcionalidades existentes e destino

| Funcionalidade no Custom UI | Adaptação proposta no Better UI |
| --- | --- |
| Canais Local, World, Trade, Questions, System e Guild | Preservar as abas nativas existentes, sem fabricar canais ausentes. |
| Contadores por canal e agregado quando recolhido | Preservar os nós e o cálculo nativos. |
| Horário, nome/nível, premium e mensagem própria | Manter o log original, sem reconstruir mensagens. |
| Composer, envio, placeholder e limite de caracteres | Manter input, formulário e handlers originais; nenhuma nova rotina de envio. |
| Recolher/expandir | Reutilizar o controle nativo. |
| Ocultar canais fixos com × e restaurar pelo + | Portar as regras puras de visibilidade de `chat-model.ts`. |
| Pelo menos um canal fixo visível | Manter a proteção, inclusive ao carregar preferências antigas. |
| Esconder canal ativo | Selecionar outro canal disponível pelo controle nativo, como parte desse gesto do usuário. |
| Preferência de canais ocultos | Salvar somente chaves dos canais fixos em chave própria do Better UI. |
| Conversas privadas e abas dinâmicas | Não restringir a leitura às seis abas fixas; preservar o fechar nativo. |

O QoL novo concentra-se na gestão de abas. O restante já pertence ao chat do
jogo e deve continuar funcionando sem uma segunda implementação.

## O que não copiar

- Widget React, CSS de identidade própria, ocultação global do chat original,
  postMessage/bridge de envio ou infraestrutura de iframe/Shadow DOM.
- MutationObserver próprio de `ChatWidget`; o Better UI usa o observer central.
- Ajustes automáticos de largura/altura presentes no histórico do Custom UI.
- Scroll ao final sempre que a quantidade de mensagens muda: pode interromper
  a leitura do histórico. Preservar inicialmente o comportamento nativo;
  qualquer melhoria adicional precisa de um contrato específico.
- Exclusão de linked items, respostas prontas ou Discord do widget substituto:
  no Better UI, elementos nativos existentes continuam intactos.

## Cuidados já identificados

- Uma conversa privada deve ser fechada pelo botão nativo real, nunca apenas
  escondida: esse erro já deixou canais e logs inconsistentes no Custom UI.
- Não persistir IDs de conversas privadas. Preferências aceitam somente as
  chaves conhecidas dos canais fixos; canais dinâmicos não são ocultados por
  uma preferência antiga.
- Ao restaurar um canal, mostrar seu badge nativo atualizado. Ocultar uma aba
  não significa silenciar o canal, marcar mensagens como lidas ou descartá-las.
- O menu + deve manter todas as opções acessíveis dentro da geometria original.
  Não copiar o crescimento de iframe usado para contornar clipping no projeto
  anterior.
- Não introduzir botões aninhados inválidos ao acrescentar ×. Conferir a
  estrutura nativa efetiva antes de escolher o encaixe desse controle.
- Não copiar a expansão automática para qualquer aba nova sem verificar o
  comportamento nativo; chegada de mensagem não deve forçar expansão por
  iniciativa do Better UI.

## Privacidade e verificação

Não coletar nem persistir mensagens, remetentes, IDs privados ou capturas de
conversas. Testes e previews devem usar somente conteúdo sintético. Não enviar
mensagens reais durante a implementação sem autorização específica.

Critérios para a implementação:

1. Módulo independente com montagem, reconciliação e cleanup reversíveis.
2. Controle separado no painel Better UI, sem dependência do menu-bar.
3. Ocultar/restaurar canais sem duplicar abas ou listeners; preservar um canal.
4. Conversas privadas continuam abrindo e fechando pelo fluxo nativo.
5. Mensagens, rascunho, rich links, badges e recolhimento permanecem intactos.
6. Preferências inválidas ou storage indisponível não quebram o chat.
7. Nenhum envio duplicado ou disparado pelo módulo; testes de ações usam mocks.
8. Sem observer extra, alterações de geometria, tráfego interceptado ou redesign.

## Implementação e verificação

- `src/modules/chat/` contém configuração, consultas DOM, preferências,
  controlador e contrato do módulo; opção Chat no painel Better UI.
- Abas fixas usam × nativo e o menu + reutiliza dropdown e botões do chat.
  O menu sobrepõe o conteúdo dentro da janela, com rolagem se necessário;
  não altera as dimensões do chat. Abas privadas/dinâmicas ficam intactas.
  O cabeçalho mantém uma linha: abas nativas roláveis e área fixa para + e
  recolher. Os nós nativos são movidos, preservando listeners e retorno no cleanup.
  O menu segue a ordem das abas, independentemente da sequência de ocultação.
  Tab/Shift+Tab continuam a navegação a partir do +; ocultar uma aba inativa
  devolve o foco ao canal selecionado, inclusive quando for uma conversa privada.
  Pointerdown na barra horizontal é isolado do início do arraste nativo, sem
  preventDefault ou alteração das dimensões. O gutter é medido descontando as
  bordas; sem gutter reservado, a proteção considera os 12 px inferiores para
  scrollbars sobrepostas. A área superior continua disponível para arrastar.
- Preferências em `ppbui:chat-hidden:v1` aceitam apenas seis chaves fixas.
  Storage indisponível mantém a escolha na sessão e informa isso no título do +.
- Se o jogo selecionar um canal oculto, ele aparece temporariamente sem apagar
  a preferência. Reconciliação não troca canais; somente ocultar uma aba ativa
  por ação do usuário aciona o fallback nativo. Se a troca falhar, não oculta.
- O DOM público confirmou `div[role=tab]` com botão × nas conversas privadas.
  Estruturas futuras incompatíveis (por exemplo, aba como button) não recebem ×.
- CSS de referência: `css/persistent/persistent-chat.css` do cliente público.
  Apenas seletores estruturais e estilos foram consultados, sem mensagens.
- 65 testes passaram, incluindo 15 testes do Chat: preservação de nós,
  fallback, storage, teclado, cleanup, estabilidade e remontagem pelo core.
- Preview sintético no navegador, com CSS nativo: cinco opções de restauração
  acessíveis dentro da janela de 382 × 240 px (incluindo bordas), sem crescimento.
  Após o ajuste do cabeçalho, + e recolher permanecem dentro da largura original
  com seis canais; o estado recolhido preserva 58 × 58 px e exibe apenas o controle nativo.
- Nenhuma mensagem real enviada; nenhum conteúdo privado coletado.

O usuário confirmou a validação e aprovação do módulo Chat. Não há pendências
de validação para o escopo implementado. Novos QoLs ficam para outra etapa.
Inventory permanece aprovado, sem nova pendência.
