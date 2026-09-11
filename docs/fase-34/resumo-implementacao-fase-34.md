# Resumo — Fase 34: Cursor Pointer Global em Botões

## O que foi implementado

Correção pontual, motivada pelo Falves reportando que "muitos links não possuem cursor: pointer".
Investigação: não são `<a>`/`<Link>` (o navegador já dá `cursor: pointer` neles de graça, o
Preflight do Tailwind não mexe nisso) - o problema é `<button>`, que o Preflight do Tailwind v4
**não** estiliza com `cursor: pointer` (diferente de resets antigos/outras libs). Boa parte do app
usa `<button>` estilizado visualmente como link/ação (`text-accent hover:underline`, abas,
"Fechar (ESC)", "Editar", "Ver", "Limpar", etc.) - todos ficavam com o cursor de seta padrão do
sistema operacional apesar de clicáveis.

- Regra global em `frontend/src/index.css` (`@layer base`):
  `button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer }`.
- Resolve pro app inteiro numa única mudança - nenhum dos ~45 `onClick` em `<button>` espalhados
  pelo código precisou de `cursor-pointer` manual.

## Decisões técnicas tomadas que não estavam no prompt original

- **Fix global via CSS base, não `cursor-pointer` em cada componente.** Dado o volume (~45
  `onClick`, todos em `<button>`, espalhados em dezenas de arquivos), uma regra central é mais
  barata de manter e garante que todo `<button>` futuro também já nasça correto, sem depender de
  lembrar a classe toda vez.
- **`:not(:disabled)` no seletor**: botões com `disabled:opacity-40` (padrão já usado em várias
  telas pra estado "enviando...") não ganham cursor de clicável - mantém o cursor default,
  reforçando visualmente que não dá pra clicar ali agora.
- **`[role="button"]` incluído por precaução**, mesmo sem nenhum uso atual no código (verificado
  via grep) - cobre de graça um padrão comum de acessibilidade caso apareça no futuro (elemento
  não-`<button>` com `role="button"` pra comportamento clicável customizado).
- **`<a>`/`<Link>` (react-router) e os 4 backdrops de modal (`<div onClick>` com
  `role="presentation"`, ex: `ContentPreviewModal`) não precisaram de mudança** - links já têm
  cursor correto nativamente; os backdrops são gesto de dismissal (clicar fora fecha o modal), não
  um alvo visível que pareça precisar de indicador de "clicável".

## Estrutura de arquivos criada

```
frontend/src/index.css   (editado - só a regra @layer base nova)
```

## Testes

- `npx vite build` - build de produção ok, regra `cursor:pointer` confirmada presente no CSS
  compilado (`grep` no `dist/assets/*.css`).
- `npx tsc -b` / `npm run lint` - inalterados (mudança é só CSS, sem TS/JSX tocado).
- Servidor de dev (Vite, já rodando) serviu o `index.css` atualizado via HMR - confirmado via
  `curl` que o arquivo servido já contém a regra nova.
- **Não verificado visualmente num navegador real** - confiança vem de entender a causa raiz (o
  Preflight do Tailwind v4 comprovadamente não seta `cursor` em `button`, verificado lendo
  `node_modules/tailwindcss/preflight.css`), não de ver o cursor mudando na tela.

## Dúvidas ou pontos abertos para a próxima fase

- Nenhuma pendência conhecida - fix pequeno e mecânico, sem decisão de produto em aberto.
