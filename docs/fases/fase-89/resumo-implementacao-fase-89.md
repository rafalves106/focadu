# Resumo — Fase 89: Mais de um curso (Hoje pergunta o curso e seletor nas telas)

## O que foi implementado

Pedido do dono (01/10/2026), matriculado em dois cursos (Web Security e Linux): o botão "Hoje" dava erro e Trilha,
Ranking, Squad e Perfil só mostravam um curso. O erro era do front: `/hoje` chamava `GET /api/today` sem `?courseId=`
e, com 2+ matrículas, o backend responde 409 `multiplas_matriculas_ativas` desde a Fase 13.

- **Hoje com escolha de curso** (`TodayCourseChoice`): com 2+ cursos e sem `?daily=`/`?curso=`, `/hoje` mostra os save
  slots do start (`CourseSlots`) com a fala da Focada e o último curso aberto já marcado; "Abrir a sessão" (ou Enter)
  vai pra `/hoje?curso=<id>`, que chama `GET /api/today?courseId=`. Com 1 curso, nada muda.
- **Último curso aberto** (`lib/courseChoice.ts`): `rememberCourse`/`pickCourse`, em `localStorage`. Gravado ao abrir
  `/start?course=`, ao trocar de slot no start, na sessão (curso da Weekly) e no seletor do Perfil. O menu (Trilhas,
  Ranking), o start e o Perfil abrem nele em vez de sempre o primeiro curso publicado.
- **`CourseSwitcher`** (só aparece com 2+ cursos, mesmo botão em blocos dos recortes do Ranking): Trilha ("Trocar de
  trilha", abaixo do progresso), Ranking (topo), Perfil (topo, `?curso=`: troca a linha do curso no palco, o Score e a
  posição) e ranking do QG do Squad (com a opção "Todos"). "Continuar estudando" da Trilha abre a sessão daquele curso.
- **Backend**: `GET /api/squads/me/ranking` ganhou `?courseId=` opcional (`GetSquadRankingUseCase`): só a matrícula
  daquele curso entra no score de cada membro; sem ele, todas somadas, como antes.
- Guia das telas (Trilha, sessão, Perfil, Squad, Ranking) e `ARQUITETURA.md` atualizados. Mock: `/__mock/reset?cursos=2`.

## Decisões técnicas tomadas que não estavam no prompt original

- **Hoje pergunta sempre, com o último marcado** (decisão do dono: "acho melhor um seletor do curso"), em vez de abrir
  direto o último curso. Os deep links `?daily=` continuam abrindo direto, sem pergunta.
- **Último curso só no navegador** (decidido com o dono): conveniência por aparelho, sem campo novo no usuário. Em
  outro aparelho o padrão volta a ser o primeiro curso publicado até o aluno abrir outro.
- **Meta da semana e feed do Squad seguem somando todos os cursos** (decidido com o dono); só o ranking ganhou recorte.
- **Caderninho, Certificações e Projeto Semanal sem seletor próprio** (decidido com o dono): já abrem a partir da
  trilha de um curso.
- **Perfil carrega em duas partes**: os dados gerais (Gems, catálogo, badges, calendário) não recarregam ao trocar de
  curso; só o detalhe e o ranking do curso escolhido.
- A tela de escolha do Hoje reaproveita peças já aprovadas no Figma (save slots e fala da Focada) e ficou sem quadro
  próprio no Figma, por decisão do dono.

## Estrutura de arquivos criada

```
frontend/src/lib/courseChoice.ts                      (novo: último curso + pickCourse)
frontend/src/components/CourseSwitcher.tsx            (novo)
frontend/src/components/session/TodayCourseChoice.tsx (novo)
frontend/src/routes/{TodayPage,StartPage,StartDashboard,CourseDetailPage,RankingPage,ProfilePage}.tsx
frontend/src/components/{GlobalNav,squad/SquadRanking}.tsx, api/client.ts, lib/guiaTelas.ts
frontend/mock/sessionMock.ts                          (?cursos=2)
backend/src/Focadu.Api/Program.cs, Focadu.Application/Squads/GetSquadRankingUseCase.cs
```

## Testes

- `tsc -b`, `npm run lint` (sem aviso novo) e `dotnet build` limpos.
- Navegador (Playwright, mock com 2 cursos, 1440×900): `/hoje` mostra a escolha com o último curso marcado e abre
  `/hoje?curso=`; Trilha, Ranking, Squad e Perfil mostram o seletor; trocar no Perfil grava `?curso=`. Sem erro de
  página.

## Dúvidas ou pontos abertos para a próxima fase

- O seletor não foi conferido em tela de celular (só desktop 1440).
- Entra em produção com o deploy do backend (o recorte por curso do ranking do Squad é do servidor).
