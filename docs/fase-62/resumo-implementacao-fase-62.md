# Resumo — Fase 62: Menu global do Figma (node 178:143) + menu do usuário

## O que foi implementado

- `GlobalNav` adaptado ao header do frame "LAYOUT CRU - PROJETO SEMANAL" (node `178:143`): Hoje,
  **Trilhas** (era "Trilha do Curso"), Ranking | logo START | Squad, Loja, **@usuário** (Fira Code,
  verde) + avatar redondo. No desktop largo (`xl`, ≥ 1280px): 73px de altura, texto 24px, logo 43px,
  64px de margem lateral — como no Figma. Abaixo de 1280px, o tamanho antigo (57px/14px), senão os
  itens não cabem; abaixo de 768px, o menu ☰ de sempre.
- **Menu do usuário** (`UserMenu`, novo, substitui `HeaderUserBadge`): clicar no @usuário/avatar
  abre "Meu perfil", "Configurações" e o **status da IA** (mesmo detalhe por provedor + "Verificar
  agora"). Fecha no clique fora e no Esc. Decisão do dono: o Figma não tem o botão Configurações
  nem o selo "IA operacional" — os dois foram movidos pra esse menu em vez de removidos.
- Ponto colorido no avatar quando a IA está parcial/fora/sem resposta — com o selo fora da barra,
  é o único aviso de relance.
- `--nav-height` (CSS, `index.css`): 57px, 73px em `xl`. O nav e a tela do Projeto Semanal (Fase 61,
  sem rolagem externa) leem daqui — antes a tela tinha `57px` fixo, que quebraria com o nav novo.

## Decisões técnicas tomadas que não estavam no prompt original

- **"@usuário" derivado do DisplayName** (sem espaços/acentos, minúsculo: "Rafael" → `@rafael`). O
  Figma mostra `@falves`, mas `User` não tem campo de username; criar um seria mudança de domínio.
- Cor do @usuário: a cor de nome cosmética equipada (Loja, Fase 18) quando houver; senão o verde do
  Figma (`accent`).
- Cores do tema mantidas (frame é wireframe em cinzas, mesma decisão da Fase 61).
- `AiStatusBadge` virou só o painel de detalhe (`AiStatusDetails`) e o polling foi pra
  `lib/useAiStatus.ts` (hook separado do componente, pra não quebrar o fast refresh — convenção do
  projeto). O polling continua rodando sempre: o `UserMenu` que monta o hook está sempre no nav.
- No celular, o menu ☰ perdeu o item "Configurações" (agora no menu do usuário, que no celular
  aparece só como avatar).
- Foco por teclado no botão do usuário com anel verde (`focus-visible`) no lugar do contorno azul
  padrão do navegador.

## Estrutura de arquivos criada

```
frontend/src/components/UserMenu.tsx
frontend/src/lib/useAiStatus.ts
docs/fase-62/resumo-implementacao-fase-62.md
```

Removido: `components/HeaderUserBadge.tsx`. Alterados: `GlobalNav.tsx`, `AiStatusBadge.tsx`,
`index.css`, `routes/WeeklyProjectPage.tsx` (altura via `--nav-height`).

## Testes

- `tsc -b` e `vite build` limpos.
- Chrome (Playwright, Vite isolado na 5199, API mockada): nav com 73px em 1440×900 e 57px em
  1024×768; Projeto Semanal sem rolagem externa nas duas (altura do documento = janela); menu do
  usuário aberto com Perfil/Configurações/status da IA; 390px com ☰ + logo + avatar.
- Não testado: o ponto de alerta no avatar com a IA realmente fora do ar (só o estado "operacional").

## Dúvidas ou pontos abertos para a próxima fase

- Username de verdade (`@falves` no Figma) exigiria campo novo em `User` — decidir se vale.
- O Figma não tem "item ativo" destacado no menu; continua sem (mesma limitação da Fase 25).
