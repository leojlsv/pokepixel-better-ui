# Wallet — locais por treinador

Status: **0.2.186 validado e aprovado in-game pelo Product Owner em 2026-10-07T19:02:22Z**,
após o refinamento solicitado em 2026-10-07T18:46:30Z. Gate:
`../PM_GATE_2026-10-07_WALLET_LOCATIONS.md`.

## Uso

**Better UI > Wallet** é uma seção colapsável com duas seleções independentes, aplicadas imediatamente
ao treinador ativo: **Backpack** e **Trainer Header**.
Podem coexistir ou ficar todas desligadas; o painel de configurações mantém a recuperação.
O padrão preserva apenas Backpack. Não há reorganização ou ativação de novos locais
durante a atualização.

Backpack conserva os valores nativos entre Re-Sort e Views. Trainer acrescenta um
resource strip compacto dentro de `.pokeidle-trainer-hud__info`, preservando a posição
aprovada in-game. Gold e Diamonds ocupam dois segmentos equilibrados de um único well,
com divisor interno e ícones/valores alinhados; não existe bloco Wallet externo. O
resumo pode abrir o painel completo; Fechar/Escape/clique externo encerra. Em Cards, o
painel é encerrado com a superfície nativa.

Os toggles preservam `scrollTop` e foco do painel Better UI. O estado aberto/fechado da
seção Wallet participa do mesmo armazenamento de disclosures das demais seções.

## Autoridade e armazenamento

Inventory continua sendo o único responsável por reparentar o elemento original
`.pokeidle-team-hud__wallet`. Recebe a política do Wallet por dependência explícita e
libera o nó quando Backpack é desligada. Um nó removido pelo jogo nunca é ressuscitado;
o mesmo nó dentro de uma janela Inventory substituída ainda pode ser preservado.

Painel e resumo são projeções descartáveis de
`PokeIdle.PersistentHud._teamHud._trainer.{gold,diamonds}`. Exigem ID correspondente
ao treinador autenticado e HUD/Wallet atuais conectados. Dólares delegam a
`PokeIdle.Currency.element` quando disponível, com fallback textual; números seguem
o locale do jogo. Valores inválidos/ausentes aparecem indisponíveis, sem zero inferido.
Nenhum saldo, HTML nativo ou handler é persistido.

A troca de conta coloca o antigo HUD em quarentena. Uma confirmação completa para o
novo treinador só libera esse mesmo objeto quando os valores da autoridade nativa
já correspondem à confirmação; um evento adiantado não autoriza o saldo anterior.

- Backpack/Trainer: `ppbui:wallet-locations:v1:<trainerId>`, somente dois booleanos.
- Layouts experimentais 0.2.184 que continham `wallet:menu`/`wallet:shop` são aceitos
  somente para migração de leitura e normalizados sem esses IDs na próxima escrita autorizada.
- Storage indisponível mantém escolhas nesta sessão. Base conhecida é retida entre
  falhas intermitentes; uma recuperação vazia não perde a edição. Nova revisão externa
  prevalece sobre uma base antiga. Registros protegidos nunca são sobrescritos: uma
  escolha explícita pode valer somente na sessão, com indicação de não persistência.

## Lifecycle e desempenho

Wallet usa o escopo existente `team-hud` do observer central para atualizações
nativas e das próprias projeções, inclusive sem o módulo visual Team HUD habilitado.
Uma rodada nativa atualizando equipe e saldo continua local. Estruturas removidas ou
substituídas mantêm o lifecycle normal; nenhum observer adicional, polling ou pedido
de saldo é criado. O painel fechado é atualizado sob demanda; o resumo ativo acompanha
as mudanças nativas. Reconciliação estável preserva DOM/foco.

## Evidência e limites

Testes: `wallet-runtime.test.js`, `wallet-views.test.js`, regressões de Inventory,
Foundation, registro e Menu bar. O gate registra resultados/hashes do candidato.
Renders locais usam os módulos de produção, stylesheet nativa retida e fontes de
dados sintéticas. O formatter Currency da fixture é um substituto explícito; demonstra
layout e valores longos, não certifica todo formato/denominação do helper nativo.
A barra horizontal em 390px é limitação anterior fora do aceite Wallet; o painel e
as configurações são verificados nessa largura. Não houve acesso ao jogo.
