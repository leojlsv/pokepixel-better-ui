# Painel de módulos

Status: implementação concluída e validada no jogo. Os refinamentos posteriores
de agrupamento, contadores e seções recolhíveis também foram aprovados.

## Requisito do usuário

Um ícone deve abrir um painel para escolher quais módulos do Better UI
ativar ou desativar.

## Escopo implementado

- Reutilizar componentes e linguagem visual nativos, sem redesign.
- Apresentar os módulos disponíveis com nome, descrição breve e controle de
  ativação. Não confundir preferências Better UI com configurações do jogo.
- Salvar as escolhas e reaplicá-las ao recarregar.
- Usar o lifecycle central para montar/desmontar módulos; desativar menu-bar
  deve restaurar a barra original, sem desativar funções nativas do jogo.
- Manter o acesso ao painel independente do menu-bar e dos módulos opcionais:
  desligar todos eles não pode impedir que o jogador os reative.
- Não expor o módulo example, destinado ao desenvolvimento, como um QoL.
- Ícone nativo de configurações reutilizado no fim da barra, com rótulo
  Better UI. O botão de configurações original permanece inalterado.

## Funcionamento e limites

- Os módulos opcionais disponíveis atualmente são Menu bar, Chat, Disable
  Pokémon hover, Team, Team HUD, Team Presets, Inventory, Hunts, Mark's Shop,
  Auto Helper, Storage e Trade. Cada opção é configurável independentemente;
  Disable Pokémon hover permanece desativado por padrão e as demais seguem os
  defaults registrados em `src/index.js`.
- O painel de gerenciamento não aparece como opção desativável.
- Os módulos são organizados em Interface, Equipe e Atividades e itens. Cada
  grupo pode ser recolhido independentemente e exibe ativos/total.
- Checkboxes nativos indicam ativado/desativado, com descrição.
- Alterações entram em vigor imediatamente pelo lifecycle central.
- Preferências ficam na chave `ppbui:modules:v1` do localStorage, por navegador
  e origem do jogo, não por personagem. Não se lê nem altera outra chave.
- Falhas de armazenamento preservam a escolha na sessão e mostram aviso;
  dados inválidos não são usados como autorização para ativar outros módulos.
- Mudanças feitas em outra aba são aplicadas pelo evento storage.
- A interface acompanha português, inglês, espanhol e chinês do jogo.
- Acesso por clique/teclado, fechamento por Escape, botão Fechar, clique fora
  ou saída de foco. Trata-se de um painel não modal; Tab não fica preso nele.
- O acesso depende da toolbar e do ícone de configurações nativos existirem;
  não é injetado na tela de login nem usa ícone externo como fallback.

O painel reutiliza classes nativas de botão, label e dropdown. Duas regras
de composição, limitadas ao painel Better UI, organizam uma coluna e permitem
quebra de texto. O display fechado é explícito para o hover nativo não abrir
preferências por acidente. Nenhuma nova paleta, fonte, borda, sombra, dimensão
global ou regra de responsividade foi introduzida.

## Validação

Cobertura automatizada inclui desativação/reativação, restauração de nós,
ausência de ações do jogo, persistência, armazenamento bloqueado/corrompido,
sincronização entre abas, idioma, teclado, troca completa da toolbar,
agrupamento, contadores e persistência das seções recolhíveis.

O painel e seus refinamentos atuais foram validados no jogo pelo usuário. Não há
pendência de validação para o escopo atual.
