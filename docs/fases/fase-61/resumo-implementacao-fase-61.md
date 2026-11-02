# Resumo — Fase 61: Projeto Semanal sem rolagem externa (layout Figma 178:132) + chat integrado

## O que foi implementado

- **Layout do Figma "LAYOUT CRU - PROJETO SEMANAL" (node `178:132`)** na `WeeklyProjectPage`: topo com
  "← VOLTAR PARA {tema}" à esquerda e a barra de progresso **centralizada** (250px, 8px de altura);
  3 colunas com 32px entre elas e margem lateral de 64px — esquerda 250px (repositório), centro
  flexível (especificação), direita 250px com 2 cartões empilhados: referências (240px) em cima e o
  chat embaixo, ocupando o resto da altura.
- **Sem rolagem externa**: a página ocupa exatamente a altura que sobra abaixo do `GlobalNav` e cada
  cartão rola por dentro. Conferido no Chrome em 1440×900: `document.scrollHeight == innerHeight`.
- **`ScrollArea`** (componente novo, `components/ScrollArea.tsx`): rolagem interna com barra
  minimalista (4px, verde `accent`, 8px da borda direita e 24px de margem em cima/embaixo, como no
  Figma) que **só aparece enquanto rola** e some ~0,7s depois com transição de opacidade + desfoque.
- **Chat integrado** (`StudyAssistantPanel tall`): o mesmo Suporte Rápido de IA da sessão diária,
  agora fixo na coluna direita e alto (estica até o fim da tela), com a lista de mensagens dentro
  de um `ScrollArea`. Substitui o botão flutuante (`QuickQuestionOrb`) que essa tela usava.
- **Entrega fixa no rodapé do cartão central**: "ENTREGAR PROJETO" fica sempre visível, fora da
  área que rola — antes era preciso rolar até o fim da especificação.

## Decisões técnicas tomadas que não estavam no prompt original

### A abordagem de "sem rolagem externa" (pedido do dono: documentar, vai pro sistema inteiro)

1. **Altura da página = viewport menos o nav**: `lg:h-[calc(100dvh-57px)] lg:overflow-hidden` no
   contêiner raiz (`GlobalNav` é `h-14` + 1px de borda). `dvh` e não `vh`: no celular, `vh` ignora a
   barra de endereço que aparece/some e a página passaria da tela. Ao levar isso pro sistema
   inteiro, o melhor é o `App` virar `h-dvh flex flex-col` com o `<Outlet/>` em `flex-1 min-h-0` —
   aí nenhuma tela precisa saber a altura do nav (aqui não foi feito pra não mexer nas outras telas).
2. **Cadeia de `min-h-0`**: todo contêiner flex entre a raiz e a área que rola precisa de
   `min-h-0` (e `flex-1` onde deve esticar). Sem isso o item flex tem `min-height: auto`, cresce até
   o tamanho do conteúdo e empurra a página — o `overflow-y-auto` de dentro nunca chega a rolar.
   Foi a armadilha principal; sempre que um cartão "não rola", falta `min-h-0` em algum pai.
3. **Barra própria em vez de estilizar a nativa**: `::-webkit-scrollbar` não aceita transição de
   opacidade nem `filter`, então "aparecer só ao rolar e sumir com desfoque" é impossível nela (e
   `scrollbar-color`/`scrollbar-width` do Firefox são ainda mais limitados). A nativa é escondida
   (utilitário `scrollbar-none` em `index.css`) e o `ScrollArea` desenha um `<div>` absoluto,
   posicionado por `scrollTop/scrollHeight/clientHeight`. **A rolagem continua nativa** (roda,
   trackpad, toque, teclado, leitor de tela) — só o desenho da barra é nosso. `ResizeObserver`
   remede quando o conteúdo muda sem rolagem (mensagem nova no chat, token gerado). A barra tem
   `pointer-events-none` (não é arrastável — não foi pedido) e respeita `prefers-reduced-motion`.
4. **Celular (< `lg`)**: 3 colunas não cabem; volta pro fluxo empilhado com rolagem normal da
   página, e o chat ganha altura fixa (480px). Pra valer no sistema inteiro, essa exceção precisa
   continuar existindo.

### Outras

- **Cores do tema mantidas, não as do Figma**: o frame é um wireframe ("LAYOUT CRU") em cinzas
  (#323232/#515151); seguido na estrutura, medidas e barras de rolagem, com os tokens do app
  (`surface`/`stroke`). A barra de progresso continua âmbar (`project`), cor de tela de projeto.
- O rótulo "PROJETO SEMANAL — SEMANA N" do topo antigo saiu (o Figma não tem; o título do cartão já
  diz "Projeto da Semana N") e virou o `aria-label` da barra de progresso.
- Seta do "voltar" é o asset do Figma (`assets/project/back-arrow.svg`).
- Armadilha achada na verificação: `text-base` neste projeto é **cor** (token `--color-base`), não o
  tamanho de fonte de 16px do Tailwind — `lg:text-base` pintou o link da cor do fundo. Usar
  `text-[16px]` pra tamanho.
- A sessão diária (`StudyAssistantPanel` sem `tall`) não mudou.

## Estrutura de arquivos criada

```
frontend/src/components/ScrollArea.tsx
frontend/src/assets/project/back-arrow.svg
docs/fase-61/resumo-implementacao-fase-61.md
```

Alterados: `routes/WeeklyProjectPage.tsx`, `components/assistant/StudyAssistantPanel.tsx`
(`tall`/`className` + `MessageList` extraído), `index.css` (utilitário `scrollbar-none`).

## Testes

- `tsc -b` e `vite build` limpos.
- Chrome (Playwright, Vite isolado na 5199, API mockada) em 1440×900: sem rolagem externa; barra
  interna visível durante a rolagem e invisível ~1,5s depois de parar; rodapé de entrega fixo; chat
  ocupando a coluna direita. Em 390×844: layout empilhado, sem sobreposição.
- Não testado: rolagem do chat com muitas mensagens reais (só estado vazio), e as outras
  combinações de estado (projeto bloqueado/escolha de linguagem/avaliado) no layout novo — o
  código é o mesmo de antes, só dentro do `ScrollArea`.

## Dúvidas ou pontos abertos para a próxima fase

- Levar o layout "sem rolagem externa" pro sistema inteiro (pedido do dono) — ver a abordagem
  acima, a começar pelo `App` com `h-dvh`.
- `QuickQuestionOrb`/`StudyAssistantWidget` ficaram sem nenhuma tela usando (o Projeto Semanal era a
  última) — remover ou manter pra uso futuro.
