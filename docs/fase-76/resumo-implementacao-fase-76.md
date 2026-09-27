# Resumo — Fase 76: A Focada no Ranking, no Perfil e no QG do Squad

## O que foi implementado

Fase D de `secret/rascunhos/plano-pendencias-26-09-2026.md` ("vamos colocar ela onde está faltando",
dono, 26/09/2026). Desenho e falas aprovados no Figma "Focadu — Pixel Art", página "Focada nas telas —
v2 (proposta)" (quadros `159:4503`, `159:6499`, `159:7440`, `159:9121`, notas `160:12881`).

- **Ranking**: a Focada comenta a posição no alto do pódio, no lugar da nota "Score mede qualidade"
  (a regra já está em "Como subir"). 6 situações: semana ainda fora do placar, sem pontuação, 1º, 2º/3º,
  fora do top 10, perto de quem está acima; padrão.
- **Perfil**: fala no alto do palco do agente, sobre a constância: ofensiva quebrou (acolhedora),
  pausada pelo projeto, nunca estudou, ainda não estudou hoje, recorde de 7+ dias, estudou hoje.
- **QG do Squad**: na coluna da meta, no lugar de "Faltam N até domingo", da linha "recompensa em Gems
  em breve" (valor ainda não decidido) e de "N de M estudaram hoje": meta batida, ninguém estudou hoje,
  você ainda não estudou, você já estudou. Sem squad: a Focada no lugar do texto do QG vazio.
- **Mapa da trilha**: com a semana fechada esperando a publicação do módulo, o mapa (e o start) passam a
  falar a mesma fala da visão da semana (`publicacaoPendente`) em vez de ficar calados.
- **Falas do mapa por curso**: `frontend/src/assets/mapa/<curso>/falas.json` opcional (chave → texto)
  troca qualquer fala; o resto usa a padrão. O `exportar-frontend.js` da curadoria copia
  `secret/curadoria/<curso>/mapa/falas.json` quando existir. Sem backend.
- O start sem curso já tinha a Focada (`ErrorLayout`), então ficou como estava.

## Decisões técnicas tomadas que não estavam no prompt original

- Falas em `lib/focadaScreenLines.ts` (`buildRankingLine`, `buildProfileLine`, `buildSquadLine`,
  `NO_SQUAD_LINE`), mesmo formato das do mapa: a primeira situação verdadeira vale.
- A fala some em tela muito baixa (`lg:tight:`) no pódio e no palco, pra manter "sem rolagem". No
  Ranking, o aviso "sua semana ainda não fechou" que ficava embaixo do pódio agora só aparece nessa
  altura, porque fora dela a Focada já diz isso.
- "Estudou hoje" no Perfil vem do último dia de `GET /api/users/me/study-calendar` (a página passou a
  buscar junto; se falhar, a fala segue sem essa informação).
- `FocadaSays` ganhou o tamanho `xs` (retrato 32px, 1x) pra coluna estreita da meta do QG.
- Falas por curso via `import.meta.glob` (arquivo novo entra sem mexer em código).

## Estrutura de arquivos criada

```
frontend/src/lib/focadaScreenLines.ts
```

Alterados: `components/ranking/Scoreboard.tsx`, `routes/RankingPage.tsx`, `components/profile/AgentStage.tsx`,
`routes/ProfilePage.tsx`, `components/squad/SquadHero.tsx`, `components/squad/NoSquadView.tsx`,
`components/session/FocadaSays.tsx`, `lib/focadaMapLines.ts`, `lib/courseMaps.ts`, `routes/StartDashboard.tsx`,
`routes/CourseDetailPage.tsx`; na curadoria, `scripts/mapa/exportar-frontend.js`.

## Testes

- `tsc -b`, `oxlint` (sem aviso novo) e `npm run build`.
- Playwright + Chrome contra o mock: Ranking (3º lugar → "3º lugar e subindo..."), Perfil ("3 dias
  seguidos... quadrado de hoje ainda está vazio"), QG membro ("Faltam 9 até domingo e 4 de 6...") e sem
  squad; nenhuma das quatro telas rola a página em 1440×900, 1366×768, 1280×720 e 1024×768; celular 390px
  empilha com a fala abaixo do título. Mapa com publicação pendente fala "Castelo derrubado..." e um
  `falas.json` de teste trocou a fala padrão (arquivo removido depois).

## Dúvidas ou pontos abertos para a próxima fase

- Recompensa em Gems da meta do squad: ainda sem valor; quando decidir, volta como fala ou linha.
- Nenhum curso tem `falas.json` ainda (Web Security usa as padrão).
