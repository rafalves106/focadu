# Resumo — Fase 75: Guia das telas (botão "?", janela do guia e tour)

## O que foi implementado

Pedido do dono (26/09/2026): "um guia para os usuários saberem o que cada tela faz, talvez um ícone de
FAQ flutuante". Desenho aprovado no Figma "Focadu — Pixel Art", página "Guia das telas — v2 (proposta)"
(`151:4502`); decisões em `secret/rascunhos/guia-das-telas-faq.md` e plano em
`secret/rascunhos/plano-pendencias-26-09-2026.md` (Fase A).

- **Botão "?" flutuante** em todas as telas do app e nas de fora (login, senha, onboarding), no canto de
  baixo, com o sprite novo `assets/pixel/ajuda.png` (balão verde com "?", `sprite/ajuda` no Figma). Na
  sessão diária no celular sobe acima da barra de ferramentas. A tecla `?` abre e fecha o guia (fora de
  campo de texto).
- **Janela do guia** (`PixelModal`, 760px): "Esta tela" (fala da Focada + itens da tela; na sessão
  diária o 1º item é a etapa em tela, o reforço ou a ponte), "Perguntas frequentes" (12 perguntas com
  busca sem acento) e "Achou um problema?" (o que mandar, resumo da tela e botão pro formulário do
  teste fechado). Telas de fora do app não têm as perguntas.
- **Tour do app inteiro no 1º acesso** (decisão do dono em 27/09): ao chegar no start com o onboarding
  feito, a Focada passa por Início (menu, missão do dia, agente), trilha, perfil, squad, loja e ranking,
  navegando entre as telas, e termina no botão "?". Pular a qualquer momento.
- **Tour de cada tela pelo "?"**: "Tour desta tela" destaca, um por um, os itens de "Esta tela" que têm
  elemento visível na tela (atributo `data-guia`).
- **1ª visita a cada tela** (depois do tour do app): o botão pisca e mostra a dica "Primeira vez aqui?
  Aperte ?" uma vez.
- **"Já visto" no servidor** (decisão do dono): `User.SeenGuides` (`text[]`, chaves `tour:app` e
  `tela:<tela>`), devolvido no `UserDto`, e `POST /api/users/me/guides/{key}/seen` (idempotente).
  Trocar de aparelho não repete o tour.

## Decisões técnicas tomadas que não estavam no prompt original

- **Tour de tela = itens de "Esta tela".** Cada item tem `anchor` opcional; o mesmo texto serve pra
  janela e pro tour, sem duplicar. Passo sem elemento visível (celular, estado vazio) fica fora do tour
  da tela; no tour do app vira um balão no centro. Se a tela não tem nenhum elemento, "Tour desta tela"
  some e a janela fica.
- **Conteúdo estático no frontend** (`lib/guiaTelas.ts`), sem backend e sem IA. Os textos foram
  conferidos contra o `MESTRE.md` e ajustados ao que cada tela mostra de fato (ex.: o menu é Hoje,
  Trilhas, Loja, Ranking | Squad, IA, Configurações, perfil).
- **Tela pela URL** (`guideScreenFor`): as sub-telas de `/start` vivem na query string. A sessão diária
  conta a etapa em tela pelo `GuideContext.setSessionDetail` (chamado no `SessionLayout`).
- **Tour navega sozinho** entre as telas do tour do app e espera o elemento aparecer (até 2,5s); o curso
  da trilha e do ranking é o 1º de `GET /api/courses` (sem curso, esses passos saem).
- **Dica da 1ª visita** conta como vista ao abrir o guia ou depois de 7s na tela; não aparece antes de o
  tour do app ter sido visto nem fora do app (sem usuário logado não há onde guardar).
- **Chave validada no domínio**: `^[a-z0-9][a-z0-9:-]{0,63}$`, teto de 100 chaves por usuário
  (`guia_invalido`, `guia_limite`).
- **Formulário de report**: Tally (aprovado pelo dono), com tela, endereço, navegador, tamanho e hora
  como campos ocultos na URL. O formulário ainda não existe: `REPORT_FORM_URL` vazio mostra só o resumo
  pra copiar e o aviso de que o formulário não está no ar.
- **Navegador resumido** ("Chrome 153 · Mac") em vez do user-agent inteiro no resumo do report.
- `ScrollArea` e `PixelPanel` ganharam a prop `guia` (vira `data-guia`) pras âncoras do tour.

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/Users/MarkGuideSeenUseCase.cs
backend/src/Focadu.Infrastructure/Migrations/*_GuideSeenKeys.cs
frontend/src/assets/pixel/ajuda.png
frontend/src/components/guide/HelpButton.tsx
frontend/src/components/guide/GuideModal.tsx
frontend/src/components/guide/TourOverlay.tsx
frontend/src/contexts/GuideProvider.tsx, guideContextObject.ts, useGuide.ts
frontend/src/lib/guiaTelas.ts, guideAnchors.ts
```

Alterados: `User` (SeenGuides/MarkGuideSeen), `UserDto`, `UserConfiguration`, `Program.cs`,
`DependencyInjection`, `main.tsx` (GuideProvider), `SessionShell` (etapa pro guia + âncoras), âncoras
`data-guia` em GlobalNav, start, trilha, semana, projeto, perfil, squad, loja, ranking, certificações,
caderninho e login; `index.css` (`animate-guide-pulse`); `mock/sessionMock.ts`.

## Testes

- `dotnet test`: 528 passando (4 novos em `UserTests`: marca uma vez, chave inválida, teto de 100).
- `tsc -b`, `oxlint` e `npm run build` sem erro.
- Playwright + Chrome contra o mock (`npm run dev:mock`), sem erro no console: tour do app completo
  (10 passos, navegando por start, trilha, perfil, squad, loja e ranking, recorte em 8 deles e balão
  no centro nos 2 sem elemento), `seenGuides` gravado no fim; na Loja o botão pisca, `?` abre a janela,
  as 3 abas funcionam e "Tour desta tela" começa no Provador; Esc encerra o tour; na sessão o 1º item é
  "Quiz" e o tour da sessão destaca etapas, conta-giros, material e ferramentas; no celular (390px) o
  botão fica acima da barra da sessão; no login o botão abre só "Esta tela" e "Achou um problema?".
- Mock: `/__mock/guia?tour=1` zera tudo (tour do app de novo); `/__mock/guia` zera só as 1as visitas.

## Dúvidas ou pontos abertos para a próxima fase

- **Criar o formulário no Tally** e preencher `REPORT_FORM_URL` em `lib/guiaTelas.ts` (campos ocultos
  `tela`, `endereco`, `navegador`, `tamanho`, `hora`).
- **Revisão dos textos pelo dono**: cópia em `secret/rascunhos/guia-das-telas-textos.md`.
- Quem já usa o app (usuários existentes) vê o tour do app uma vez no próximo acesso ao start.
- Mudou uma tela? Atualizar o guia dela em `lib/guiaTelas.ts` (e a âncora `data-guia`, se o elemento
  mudou).
