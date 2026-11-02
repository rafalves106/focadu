# Resumo — Fase 16: Score de Estudo + Ranking

## Contexto

Com Gems/Streak (Fase 14) e Conta-Giros/Reforço (Fase 15) prontos, esta fase introduziu o Score
de Estudo - métrica de QUALIDADE (o quão bem), diferente de Gems (que recompensa CONSISTÊNCIA -
concluir) - e o Ranking, que compara usuários pelo desempenho acumulado no curso.

## Verificação antes de implementar

Confirmado: `WeeklyProject` só tinha `Status`/`SubmissionUrl` - nenhum campo de nota numérica.
Adicionado `Score`/`Feedback`, e `EvaluateWeeklyProjectUseCase` passou a exigir uma nota (0-100)
no payload, não só aprovar por texto livre.

## O que foi implementado

### Domínio

- **`EvaluationPolicy`**: pesos por tipo de atividade (`VoiceSummaryWeight=2.0`,
  `RoleplayWeight=1.5`, `ClozeWeight=1.5`, `DefaultActivityWeight=1.0` para Quiz/WordMatch) +
  `WeeklyDailyAverageWeight=0.7`/`WeeklyProjectScoreWeight=0.3`.
- **`WeeklyProject.Score`/`Feedback`** (novos, `int?`/`string?`) - `Evaluate(int score, string?
  feedback)` valida 0-100 e seta os dois junto com `Status=Evaluated`.
- **`Daily.CalculateScore()`** (novo): média ponderada de `ActivityResponse.Score` (tentativa MAIS
  RECENTE de cada Activity, mesmo critério de `AllActivitiesPassed` da Fase 15). Exclui
  Reading/Video (sempre 100, ruído artificial) e Dailies de reforço (`IsReinforcement` - sempre
  `null`, já têm recompensa própria em Gems). `null` também quando nenhuma atividade avaliável
  ainda tem resposta - nunca `0` (não simula uma nota que ninguém tirou).
- **`Weekly.CalculateScore()`** (novo): `0.7 * média(Daily.CalculateScore())` das Dailies
  originais `+ 0.3 * WeeklyProject.Score` - reaproveita `IsModuleComplete()` como critério de
  "completo o bastante pra ter Score" (mesma checagem, sem duplicar lógica de completude): `null`
  se qualquer Daily original não estiver `Completed` ou o projeto não estiver `Evaluated`.
- **`IEnrollmentRepository.GetByCourseIdAsync`** (novo) - todas as matrículas de um Course,
  qualquer usuário, o que alimenta o ranking.

### Aplicação

- **`GetCourseRankingUseCase`** (novo, `Focadu.Application.Ranking`): busca todas as `Enrollment`
  de um Course, calcula o Score de cada uma no recorte pedido, ordena decrescente (empate: quem
  matriculou primeiro), devolve os 10 primeiros + a posição real do usuário chamador (mesmo se
  fora do top 10). **Nada persistido** - calculado sob demanda a partir de `ActivityResponse`/
  `WeeklyProject` já existentes, mesmo padrão já estabelecido pra `DailyStatus`/`Weekly.Number`
  desde a Fase 13a (a recomendação explícita do prompt contra um "snapshot" de score).
- **`ComputeScore`/`ResolveCurrentWeekly`/`RankEntries`**: `internal static`, testados direto sem
  repositório (mesmo padrão de `SubmitActivityResponseUseCase.ResolveScore`).
- **`GET /api/courses/{courseId}/ranking?scope=weekly|monthly|course`** (novo) - `scope` ausente
  vira `course` (recorte mais completo); inválido vira 400.
- **`PUT /api/weeklies/{weeklyId}/project/evaluate`** (era `POST`) - corpo `{score, feedback}`
  agora obrigatório (`score`).

### Decisão de design: "Weekly"/"Monthly" por posição no currículo, não calendário real

Ambiguidade real: cada Course tem 1 currículo compartilhado, mas cada `Enrollment` se matricula
em dias diferentes - "a semana atual" de um aluno pode cair numa data bem diferente da de outro.
Duas leituras possíveis: (a) por posição relativa no currículo (a `WeeklyTemplate.Number` que cada
um está cursando agora, reaproveitando `Weekly.CalculateScore()` como já especificado) ou (b) por
calendário real (Segunda-Domingo civil, cruzando `WeeklyTemplate`, exigindo uma fórmula de
agregação nova e desconectada do 70/30 já definido). **Confirmado com o usuário: opção (a)** -
"Weekly atual" de uma matrícula é resolvida por data (`ResolveCurrentWeekly`: a de maior `Number`
que já tem ao menos 1 `Daily` datada em hoje-ou-antes, mesmo critério de "hoje" que
`GetTodayUseCase`/`EvaluateDailyAccess` já usam) - sem nenhuma lógica de corte por calendário nova.

### Weekly incompleta = `0` no ranking, não `null` - única exceção deliberada

`Weekly.CalculateScore()` continua `null` pra qualquer Weekly incompleta em QUALQUER outro
contexto do app (nunca simula uma nota parcial enganosa). Mas um ranking precisa de um número
ordenável - `ComputeScore` (só dentro do `GetCourseRankingUseCase`) trata "ainda não pontuou neste
recorte" como `0`, documentado explicitamente como diferente do aviso de "não penalizar quem está
no meio da semana" (esse aviso vale pras telas de progresso do próprio usuário, não pra comparação
entre usuários de um leaderboard).

### Migration

`AddWeeklyProjectScore` - `Score`/`Feedback` em `WeeklyProjects`, puramente aditiva.

### Frontend

- **`components/ranking/`**: `RankingScopeTabs.tsx` (mesmo padrão de abas do `LoginPage`),
  `RankingTable.tsx` (top N, medalha nos 3 primeiros, destaca o próprio usuário), `CurrentUserRankingCard.tsx`
  (posição sempre visível, `null` quando o usuário não tem matrícula no curso).
- **`RankingPage.tsx`** (`/start?course=&ranking=1`, tela 13 do inventário original - finalmente
  ganha função real): abas + tabela + card fixo.
- **`CourseDetailPage.tsx`**: link "🏆 Ver Ranking" - ancorado aqui de propósito, o Documento
  Mestre original já dizia "ranking fica ancorado na visualização global do Course, pra não
  distrair o aluno durante a Daily".

## Testes

- Backend: `dotnet build`/`dotnet test` limpos, **150 aprovados** (131 pré-existentes + 19 novos -
  `WeeklyProjectTests` (6, incl. validação de range e "antes de submeter"), `DailyTests.CalculateScore`
  (6, incl. pesos, exclusão de Reading/Video/reforço, tentativa mais recente), `WeeklyTests.CalculateScore`
  (4, incl. 70/30 e exclusão de Dailies de reforço da média), `GetCourseRankingUseCaseTests` (9,
  ordenação/desempate/posição + os 3 recortes com Weeklies sintéticas multi-Monthly)).
- Frontend: `tsc -b`, `oxlint src`, `vite build` limpos (só o warning pré-existente de
  `TodayPage.tsx`).
- **Verificação ao vivo** (Postgres real, Playwright, 2 usuários com performance real e
  deliberadamente diferente):
  - Usuário "Alta": todas as atividades avaliáveis (Quiz/WordMatch/Cloze/Roleplay - via opção/
    node CORRETO, identificado por consulta direta ao Postgres, já que o gabarito só é revelado
    depois de responder) + projeto avaliado com nota 100. Score final: **100.0**.
  - Usuário "Baixa": mesmas atividades respondidas ERRADAS de propósito + projeto avaliado com
    nota 20. Score final: **8.1** (a média ponderada das respostas erradas ainda deu algum score
    não-zero, dependendo da mistura de tipos de atividade - matemática confirmada correta contra
    dados reais, não só fixtures sintéticas).
  - `GET /api/courses/{courseId}/ranking` confirmado via API direta nos 3 escopos: usuário "Alta"
    sempre à frente do "Baixa" (100.0 > 8.1 > 0.0 de todo o resto de contas de fases anteriores
    ainda matriculadas no mesmo curso seedado), `currentUserEntry` correto em cada chamada.
  - `RankingPage` renderizada de verdade via clique real na UI (botão "🏆 Ver Ranking" a partir de
    `CourseDetailPage`) - card "Sua posição" mostrando o usuário "Baixa" corretamente fora do top
    3 (posição 8ª, contas acumuladas de execuções anteriores desta mesma verificação incluídas),
    linha destacada com "(você)" na tabela, medalhas 🥇🥈🥉 nos 3 primeiros.
  - **Limitação conhecida desta verificação**: o curso seedado ("Web Security") só tem 1 Monthly/1
    WeeklyTemplate - os 3 escopos (Weekly/Monthly/Course) produziram **os mesmos números** ao vivo,
    porque matematicamente são o mesmo cálculo quando só existe 1 Weekly no currículo inteiro
    (confirmado, não é bug). A divergência real entre os 3 recortes (múltiplos Monthlies/Weeklies)
    está coberta exaustivamente por `GetCourseRankingUseCaseTests` (domínio puro, com Weeklies
    sintéticas construídas especificamente pra isso), mas não foi possível demonstrar ao vivo sem
    fabricar uma 2ª estrutura curricular via SQL direto - risco/esforço desproporcional pra esta
    verificação (fabricar `Monthly`/`WeeklyTemplate`/`DailyTemplate`/`DailyActivity`/`QuizOption`
    válidos via SQL cru é bem mais arriscado que só ajustar datas de progresso, já usado nas Fases
    13b-15).

## Dúvidas ou pontos abertos

- Nenhuma pendência de implementação - checklist do prompt fechado integralmente, incluindo a
  verificação prévia obrigatória (`WeeklyProject.Score` não existia, confirmado e resolvido) e a
  decisão de design consultada explicitamente com o usuário (posição no currículo vs. calendário
  real pros escopos Weekly/Monthly).
- Ver "Limitação conhecida desta verificação" acima - a matemática dos 3 escopos com múltiplas
  Weeklies está provada por teste de domínio, não por verificação ao vivo (dado real insuficiente
  no curso seedado hoje).
