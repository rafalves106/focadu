# Resumo — Fase 8: Polimento das Telas de Navegação (Start, Visão Semanal, Detalhes do Curso)

## O que foi implementado

- **`StartDashboard`** (`/start`, sem params) - substitui a antiga lista de cursos. Como so existe
  1 Course `Active` nesta fase (mesma premissa documentada de `GET /api/today`), a tela vai direto
  pro "hoje" em vez de fazer o usuario escolher entre uma lista de 1 item. 3 secoes: **Começar
  Hoje** (`TodayCard` - tema da semana, "Dia X de Y", badge de status, "próximo: {etapa}", CTA pra
  `/hoje`), **Projeto desta Semana** (`WeeklyProjectCard`, compartilhado) e **Trilha Completa**
  (`CourseExplorerLink` - "N de M semanas completas" + link pra `/start?course=`).
- **`WeeklyDetailPage`** (`/start?weekly=`) - substitui a antiga `WeeklyView`. Lista os dias da
  semana (`DayCard`) com sigla real do dia (derivada de `Daily.Date`, nao um rotulo fixo Seg-Sex),
  status/progresso, card do projeto, navegacao Semana Anterior/Próxima Semana (via
  `CourseDetailDto`, desabilitada quando nao ha semana vizinha - hoje sempre desabilitada, so 1
  semana existe) e um resumo lateral (Progresso de Dias, Penalidades ativas, Taxa de aprovação).
- **`CourseDetailPage`** (`/start?course=`) - substitui a antiga `CourseView`. Trilha completa:
  card do curso com barra de progresso real, uma secao por Weekly (`WeekSummaryCard`) com
  mini-grid dos dias (`DayMiniCard`, colorido por `DailyStatus`) e resumo lateral (dailies
  completas, conclusão %, sessões de reforço).
- **Escopo aberto do prompt ("clique num dia completo")**: resolvido reaproveitando 100% de infra
  existente - `DayCard` linka pra `/hoje?daily={dailyId}`, que ja usa `Weekly.EvaluateDailyAccess`
  (Fase 2) pra decidir Replay/ReadOnly automaticamente. Nenhuma rota `/history` nova, nenhum modal
  novo.
- **Componentes compartilhados novos**: `StatusBadge` (generico, so apresentacao), `ProgressBar`
  (extraido de `SessionTopBar` da Fase 7 - `SessionTopBar` agora usa ele por baixo, sem duplicar
  markup), `WeeklyProjectCard` (usado por `StartDashboard` e `WeeklyDetailPage`).
- **Backend**: `WeeklyOverviewDto` (dentro de `CourseDetailDto`) ganhou `Days:
  DailyStatusSummaryDto[]` - status por dia pra alimentar o mini-grid do `CourseDetailPage` sem
  round-trip extra por semana. Populado em `GetCourseDetailUseCase` (ja existente desde a Fase 2 -
  so a mapeacao foi estendida). **Nenhum endpoint novo, nenhuma migration nova.**

## Decisões técnicas tomadas que não estavam no prompt original

- **`GET /api/courses/{courseId}/detail` e `GET /api/weeklies/{weeklyId}/detail` do prompt NÃO
  foram criados** - `GET /api/courses/{courseId}` e `GET /api/weeklies/{weeklyId}` já existem
  desde a Fase 2/3 e já devolvem exatamente `CourseDetailDto`/`WeeklyDetailDto`. Criar rotas
  `/detail` paralelas seria duplicar o mesmo dado por 2 caminhos - as telas reaproveitam as rotas
  que já existiam.
- **`DayStatus` (NotStarted/InProgress/Completed) do prompt não foi criado** - o domínio já tem
  `DailyStatus` (Locked/Available/InProgress/Completed, desde a Fase 1) cobrindo o mesmo conceito;
  um enum paralelo só pra essas telas duplicaria o já existente. `WeekSummaryDto`/`DaySummaryDto`
  do prompt também não foram criados como records novos - viraram campos extras em
  `WeeklyOverviewDto`/`DailyStatusSummaryDto`, reaproveitando o `CourseDetailDto` já montado.
- **`GetTodayWeeklyUseCase`/`GetWeeklyProjectUseCase` do prompt não foram criados** -
  `StartDashboard` resolve tudo compondo casos de uso que já existem (`GetTodayUseCase` +
  `GetWeeklyDetailUseCase`, que já traz `Project` dentro de `WeeklyDetailDto`) no próprio
  `useApiResource` do frontend, sem precisar de um endpoint dedicado.
- **Sem `GetCourseDetailUseCaseTests`/`GetWeeklyDetailUseCaseTests`** (pedidos no checklist do
  prompt) - o projeto nunca teve testes de caso de uso com repositório fake (`Focadu.Tests` só
  testa domínio puro e funções `internal static` como `ResolveScore`/`DailyStateMapper.ToDto`, ver
  `docs/ARQUITETURA.md`); `GetWeeklyDetailUseCase` em si nunca teve teste dedicado desde que foi
  criado na Fase 3. Construir infraestrutura de fakes de repositório só pra este mapeamento (LINQ
  simples sobre dados de domínio já cobertos por `WeeklyTests`/`DailyTests`) seria desproporcional
  - a checagem real foi a verificação ao vivo (ver "Testes" abaixo), como o projeto já faz há
  várias fases pra esse tipo de fluxo.
- **Gems/XP/streak/níveis/multi-curso-bloqueado do mockup do Figma foram descartados** -
  standby confirmado desde a Fase 6/7 (`docs/ARQUITETURA.md`, "Fora de escopo"). Os 3 designs
  (`dashboard-start`, `visao-semanal`, `Detalhes do Curso`) mostram fartamente esses elementos
  (Gems: 24, Streak de 8 dias, cursos bloqueados "libera no nível 15", 96 sub-aulas, 4.800 XP,
  curadoria "@falves_sec", pré-requisitos) - nenhum tem campo correspondente no domínio. Trocados
  por números reais equivalentes onde existia um: "semanas completas" (real), "dias completos"
  (real), "sessões de reforço" (real, `dailyReinforcements + weeklyReinforcements`), "taxa de
  aprovação" (real, `passedActivities/totalActivities`).
- **Nota por dia ("NOTA: 92/100") e título temático por dia ("SQL Injection") do mockup foram
  trocados por dado real** - `Daily` não tem título próprio (só `Weekly.Theme`) nem nota média
  agregada. O rótulo do dia virou a sigla real do dia da semana (derivada de `Daily.Date` via
  `getDay()`) e "{aprovadas}/{total} atividades" no lugar da nota inventada.
- **Alerta "⚠️ complete X hoje ou o Boss tira sua vida" foi descartado** - referência a um sistema
  de "vidas"/dano que não existe. Substituído por um alerta honesto, condicionado a
  `Daily.IsWeakDay` real, sem o floreio de jogo inexistente.
- **`WeeklyProjectCard` não tem "título" separado** - `WeeklyProjectDto` só tem `SpecText` (texto
  livre único, ver Fase 7) - o resumo (`line-clamp-2`) é o próprio `SpecText`.
- **Cabeçalho/nav do Figma (logo FOCADU, avatar, PAINEL/CURSOS/ANALYTICS/RANKING) não foi
  recriado** - `App.tsx` já tem um chrome de navegação global (Hoje/Início/Conteúdo) renderizado em
  toda rota; duplicar um segundo cabeçalho por cima seria redundante, e "Analytics"/"Ranking" não
  existem como funcionalidades.
- **Arquivos consolidados, não 1-componente-por-arquivo como sugerido no prompt** - seguindo o
  padrão já estabelecido em `StartPage.tsx` (4 telas como funções locais em 1 arquivo desde a Fase
  3), sub-componentes usados em 1 única tela (`TodayCard`, `CourseExplorerLink`, `DayCard`,
  `WeekSummaryCard`, `DayMiniCard`) viraram funções locais dentro da própria página; só o que é
  genuinamente reaproveitado entre 2+ telas (`StatusBadge`, `ProgressBar`, `WeeklyProjectCard`)
  ganhou arquivo próprio em `components/`.

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/Courses/
  Dtos.cs                     <- WeeklyOverviewDto +Days, DailyStatusSummaryDto (novo)
  GetCourseDetailUseCase.cs   <- mapeamento de Days

frontend/src/
  api/types.ts                <- DailyStatus/CourseStatus viram const (eram so type), ACTIVITY_TYPE_LABEL, DailyStatusSummaryDto
  lib/statusBadge.ts           <- dailyStatusBadgeProps (novo - separado de StatusBadge.tsx pra nao co-exportar funcao+componente)
  components/
    StatusBadge.tsx             <- novo
    ProgressBar.tsx              <- novo (extraido de SessionShell.tsx)
    WeeklyProjectCard.tsx         <- novo
    SessionShell.tsx              <- SessionTopBar agora usa ProgressBar por baixo
  routes/
    StartDashboard.tsx           <- novo (/start sem params)
    WeeklyDetailPage.tsx          <- novo (/start?weekly=)
    CourseDetailPage.tsx          <- novo (/start?course=)
    StartPage.tsx                 <- so o roteador por query string agora; CourseListView/CourseView/WeeklyView saíram
```

## Testes

- Backend: `dotnet build` limpo, `dotnet test` - 57 aprovados, 0 falhas (nenhum teste novo pra este
  mapeamento - ver "Decisões técnicas" acima sobre por quê).
- Frontend: `tsc -b`, `oxlint`, `vite build` limpos (só os 2 warnings pré-existentes da Fase 7 em
  `TodayPage.tsx`/`useApiResource.ts`, nenhum novo).
- Verificação ao vivo (Postgres real reaproveitado da Fase 7, `dotnet run`, `vite dev`, Playwright
  headless) - fluxo completo exercitado, 0 erros de console/rede em ambas as passadas:
  1. `/start` mostra "Dia 1 de 4", badge "Concluído" (dado real - a Daily 1 já tinha sido concluída
     durante a verificação da Fase 7), "Próximo" quando aplicável, card do projeto real
     ("AGUARDANDO AVALIAÇÃO", submetido na Fase 7), "0 de 1 semana(s) completa(s)".
  2. "Explorar Curso Completo" → `CourseDetailPage`: "25% completo", card da Semana 1 com mini-grid
     1/2/3/4 (dia 1 verde, 2-4 cinza/bloqueados), "Sessões de reforço: 0".
  3. Clique na Semana 1 → `WeeklyDetailPage`: siglas reais dos dias (QUA/QUI/SEX/SEG, derivadas da
     data), Dia 1 "✅ 4/4 aprovadas" clicável, Dias 2-4 "🔒 Bloqueado" (datas futuras, corretamente
     não-clicáveis), "Taxa de aprovação: 22%" real.
  4. Clique no Dia 1 (completo) → `/hoje?daily={id}` → mostra "Você respondeu tudo por hoje" (a
     Daily já estava Completed) - confirma que reaproveitar `EvaluateDailyAccess` resolveu o
     "escopo aberto" do prompt sem nenhuma rota/modal novo.
  5. "Ver Projeto" (WeeklyDetailPage) → `WeeklyProjectPage` (Fase 7) com dado real.

## Dúvidas ou pontos abertos para a próxima fase

- **Só existe 1 Weekly hoje** - a navegação Semana Anterior/Próxima Semana está implementada e
  testada estruturalmente (usa `CourseDetailDto` pra achar vizinhos), mas nunca foi exercitada com
  2+ semanas de verdade porque o seed só tem a Semana 1. Vale um teste ao vivo quando houver uma
  Semana 2 seedada.
- **"Explorar Curso Completo"/CourseDetailPage ficam pouco interessantes com 1 curso e 1 semana** -
  a tela foi construída pra escalar (itera `monthlies.flatMap(weeklies)`), mas seu valor real só
  aparece quando o curso crescer. Não é um problema desta fase, só uma observação.
- **Bug conhecido da Fase 7 ("`/hoje` às vezes fica presa carregando")** - não investigado (fora de
  escopo, conforme pedido no prompt). Não apareceu em nenhuma das verificações ao vivo desta fase
  (`/hoje` carregou normalmente todas as vezes que foi acessado, direto e via `?daily=`), mas a
  amostra é pequena.
- **`DailyView` (recap simples de `/start?...&daily=`) continua existindo, sem polimento** - fora
  do escopo desta fase; ganhou só um link a mais pra `/hoje?daily=` (sessão completa).
