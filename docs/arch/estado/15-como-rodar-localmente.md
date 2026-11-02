## Como rodar localmente

```bash
cd backend
docker compose up -d                                    # sobe Postgres em localhost:5432
dotnet ef database update -p src/Focadu.Infrastructure --startup-project src/Focadu.Infrastructure  # aplica as migrations
dotnet build Focadu.slnx                                # build de toda a solucao
dotnet test tests/Focadu.Tests/Focadu.Tests.csproj      # roda os testes de dominio
dotnet user-secrets set "Groq:ApiKey" "sua-chave-aqui" --project src/Focadu.Api  # so necessario pra VoiceSummary/rascunho de LinkedIn funcionar de verdade
dotnet user-secrets set "GitHub:Token" "seu-token-aqui" --project src/Focadu.Api  # so necessario pro commit de resumo do modulo funcionar de verdade
dotnet user-secrets set "Jwt:SecretKey" "uma-chave-longa-aqui" --project src/Focadu.Api  # obrigatorio desde a Fase 12, a Api nao sobe sem isso
dotnet user-secrets set "Smtp:Host" "smtp.gmail.com" --project src/Focadu.Api  # so necessario pro fluxo de "esqueci minha senha" enviar email de verdade, ver "Redefinicao de senha" acima
dotnet run --project src/Focadu.Api -- seed              # popula o curso "Web Security" (idempotente)
dotnet run --project src/Focadu.Api                      # sobe a API completa
```

Frontend (numa outra aba de terminal, com a Api acima ja rodando):

```bash
cd frontend
npm install
cp .env.example .env.local   # ajusta VITE_API_BASE_URL se a Api nao estiver em localhost:5282
npm run dev                  # http://localhost:5173
```

Connection string default (dev): `Host=localhost;Port=5432;Database=focadu;Username=focadu;
Password=focadu` (definida em `backend/src/Focadu.Api/appsettings.json` e como fallback em
`FocaduDbContextFactory`; pode ser sobrescrita pela env var `FOCADU_CONNECTION_STRING` para
ferramentas de design-time do EF, ou por `ConnectionStrings:Focadu` / env var equivalente para a
Api em runtime).

**Fase 40:** migrations agora tambem aplicam automaticamente no boot da Api (`Program.cs`, antes
de `app.Run()`), em todo ambiente - nao so em Dev. O passo manual `dotnet ef database update`
acima continua funcionando e e inofensivo rodar (idempotente), mas deixou de ser estritamente
necessario. Motivacao: a imagem Docker de runtime (`aspnet:10.0`) nao tem o SDK/`dotnet-ef`
instalado, entao nao havia como rodar a migration manualmente dentro do container - ver "Docker e
Deploy" abaixo.

### Painel de gestao e Medicao de IA (Fase 94)

Telas no Figma "Focadu — Pixel Art": "Medicao de IA — v2" (`244:4502`) e "Painel de gestao — v1" (`263:4502`). Detalhe e
decisoes em `docs/fase-94/`.

- **Papel**: `User.Role` (`UserRole` Student/Admin, string, padrao Student). O comando `admin promover|rebaixar <email>` /
  `admin listar` (Program.cs) muda o papel; desde a Fase 97 tambem a aba Alunos (`PUT /api/admin/students/{id}/role`). `UserDto.IsAdmin` so mostra o item "Gestao" no GlobalNav.
- **Rotas** (grupo `/api/admin`, `RequireAuthorization` + filtro do `AdminAccessGuard`, que confere o papel NO BANCO a cada
  chamada; nao admin = 403 `acesso_negado` via `ForbiddenException`):

| Metodo | Rota | Caso de uso | Notas |
|---|---|---|---|
| GET | `/api/admin/overview` | `AdminOverviewUseCase` | cartoes, 14 dias de conclusoes, ultimos cadastros, curadoria por curso |
| GET | `/api/admin/students` | `AdminStudentsUseCase.ListAsync` | progresso por curso com grade de dias (`AdminDayCell`) |
| GET/POST | `/api/admin/students/{u}/courses/{c}/reset` | `PreviewResetAsync` / `ResetAsync` | POST `{confirmation}` = e-mail do aluno; apaga a matricula e matricula de novo numa transacao |
| GET/POST | `/api/admin/invites`, `/api/admin/invites/{code}/revoke` | `AdminInvitesUseCase` | `link` relativo (`/login?convite=`) |
| GET | `/api/admin/curation` | `AdminCurationUseCase.GridAsync` | estado por dia: `em_dia`/`difere`/`so_no_arquivo`/`so_no_banco`/`sem_curadoria` (hash do arquivo x `DailyTemplate.ContentHash`) |
| POST | `/api/admin/curation/{slug}/import/preview` e `/import` | `PreviewImportAsync` / `ImportAsync` | `{days}`; roda o `ImportCuratedDaysUseCase` por dia (dry-run na previa); tudo ou nada numa transacao (`IAdminMaintenance.InTransactionAsync`) |
| GET/POST | `/api/admin/courses/{c}/stale-days`, `/stale-days/delete` | `PreviewStaleDaysAsync` / `DeleteStaleDaysAsync` | `{confirmation}` = nome do curso; apaga dias do banco sem arquivo em `conteudo/` (+ semanas/modulos vazios) |
| GET | `/api/admin/ai-usage?period=mes\|7d\|30d&courseId=` | `AiUsageReportUseCase.OverviewAsync` | `byType[].callType` vai como TEXTO (resto da Api manda enum como numero) |
| GET | `/api/admin/ai-usage/students`, `/students/{u}` | `StudentsAsync` / `StudentAsync` | custo por dia do curso + media do curso |
| PUT | `/api/admin/ai-usage/prices`, `/ai-usage/cap` | `AiUsageSettingsUseCase` | preco por modelo (autor = e-mail do admin); teto > 0 ou nulo |

- **Leituras e escritas destrutivas** saem de dois ports novos: `IAdminQueries` (so leitura, AsNoTracking) e
  `IAdminMaintenance` (`ExecuteDelete` em transacao, mesma tecnica do `UserResetService`). Ordem do apagar dias antigos: notas,
  revisoes, feedback do dia, respostas, Weeklies de semanas que ficam vazias, Dailies, `RoleplayOptions` (FK `NextNodeId`
  Restrict travava a cascata), `DailyTemplates`, `WeeklyTemplates` e `Monthlies` vazios. Medicao de IA nunca e apagada.
- **Medicao de IA** (Fase 94: "medir antes de limitar"; os limites da Fase 101 estao em "Travas de IA" logo abaixo):
  - `AiUsageMeasuringHandler` (DelegatingHandler) em todos os `AddHttpClient` do Groq menos o health check: modelo do corpo
    (JSON `model` ou parte multipart `model`), uso da resposta (`usage.prompt_tokens/completion_tokens`; transcricao pede
    `response_format=verbose_json` e le `duration`). Grava num escopo de DbContext proprio; falha de medicao so loga.
  - Contexto via `IAiUsageContext.Begin(userId, dailyId?, weeklyId?)` (AsyncLocal em `AiUsageContext`), aberto pelos 8 casos de
    uso que chamam IA; o handler resolve curso e `DayNumber` e copia no registro (sem FK).
  - Tabelas: `AiUsageRecords` (uso, nunca custo), `AiModelPrices` (US$/1 M tokens entrada e saida, ou US$/hora de audio;
    modelo sem preco = "sem preco", fora da soma), `AiUsageSettings` (linha unica `9a4b2c1d-...0094`: `MeasuringSince`,
    `MonthlyCapUsd`). A migration `Fase94PainelDeGestao` cria a linha com `now()` e os precos iniciais da Groq.
  - Contas puras em `AiUsageMath` (internal, testada): periodo em hora local (`IClock`), totais, fatia por tipo, custo por dia.
- **Front**: `/gestao`, `/gestao/alunos|convites|curadoria|uso-de-ia` dentro do `App` (com `AdminGate`, que manda quem nao e
  admin pro `/start`); `components/admin/*`, `api/admin.ts`/`adminTypes.ts`, `lib/adminFormat.ts` (o "@" vem do e-mail - o
  app nao tem @usuario). "Abrir no Claude" e so um link (`VITE_CLAUDE_URL`, padrao `https://claude.ai/code`).
- **Deploy**: imagem do backend com `nodejs` (linter do dia roda no container ao importar pelo painel); `deploy.yml` instala as
  dependencias do linter no `secret/` do host com um `node:22-alpine` descartavel (o `secret/` entra no container `:ro`).

### Travas de IA (Fase 101)

Sobre a Medicao acima; o gasto continua **estimado** (uso medido x tabela de precos), nunca o custo real da fatura. Quatro travas:

- **Orcamento diario por aluno** (`AiUsageSettings.DailyBudgetUsd`): `IAiUsageContext.EnsureBudgetAsync(userId)` roda ANTES de `Begin` nos 7
  casos de uso que chamam IA (resposta de voz, passo de codigo, dica, avaliacao do projeto, rascunho do LinkedIn, revisao do Caderninho,
  Suporte Rapido). Soma o que o aluno gastou hoje (dia vivido, `IClock`); `>=` o orcamento lanca `orcamento_ia_esgotado` (429) antes de qualquer
  chamada, entao nao gasta nem registra nada. E um metodo separado de `Begin` porque o contexto vive em `AsyncLocal`, que um metodo
  assincrono nao devolve ao chamador. Excecao: a analogia (`GetCuratedContentUseCase`, leitura) trata o orcamento esgotado como "sem analogia",
  nunca quebra a leitura da aula. A analogia ja tem cache persistido (`PersonalizedAnalogy`) e esta desligada por flag.
- **Teto mensal global** (`MonthlyCapUsd`) **com modelo reserva** (`FallbackModel`): `AiModelDowngradeHandler` (por FORA do handler de medicao, em
  todo cliente Groq de texto) troca o campo `model` do corpo JSON pelo reserva quando o gasto do mes passa do teto, e a Medicao grava o modelo usado
  de verdade. A situacao do teto vem de `AiCapMonitor` (singleton, cache de 1 minuto; erro de leitura = nao troca, limite nunca derruba a IA). Nao
  troca se o reserva nao tem linha na tabela de precos (o gasto dele sumiria da conta). **O Whisper nao troca** (multipart, sem reserva).
- **Duracao do audio** (`AiLimits.MaxAudioSeconds` = 16 min; o front deixa gravar ate 15): `IAudioTranscriptionService` agora devolve
  `AudioTranscript(Text, DurationSeconds)` (a duracao vem do `verbose_json`); passou, `audio_muito_longo` (400) antes da avaliacao, que e a chamada cara.
  O limite de 25 MB de upload segue.
- **Tentativas por dia** (`AiLimits.MaxAttemptsPerActivityPerDay` = 10) para resumo falado e passo de codigo: `limite_tentativas_dia` (429).

Padroes (migration `Fase101TravasDeIa`, editaveis na aba Uso de IA, `PUT /api/admin/ai-usage/limits`; o antigo `/cap` saiu): US$ 0,50 por aluno por dia,
teto de US$ 30 por mes (so se estava vazio) e reserva `openai/gpt-oss-20b` (preco `0,075 / 0,30` por 1 M, referencia publica da Groq, **conferir**).
Base dos numeros (14/10/2026): 15 chamadas medidas custaram ~US$ 0,006 no total, entao US$ 0,50 e ~25x o uso normal de um aluno. A aba mostra o painel
"Limites de IA" (limite diario, teto, reserva, aviso de teto atingido). 429 e o codigo; o aluno ve a mensagem do erro no lugar da resposta.

### Medicao de produto, aba Retencao (Fase 103)

Figma "Focadu — Painel de gestao, Fase 97" (`Uvy09SJEA9phpWZWRzj2ol`), pagina "Retencao — Fase 103" (`14:444`, R01-R07), aprovada em 15/10/2026.

- **Registro**: `ScreenVisit` (tabela `ScreenVisits`, sem FK, como a Medicao de IA): `UserId`, `Day` (dia local, `IClock`), `Screen`, `Device`
  (`Desktop`/`Mobile`/`Tablet`, string), `FirstSeenAt` (UTC). Indice unico (`UserId`, `Day`, `Screen`, `Device`): no maximo 1 linha por combinacao.
  `POST /api/visits { screen }` (autenticado, 204) -> `RecordScreenVisitUseCase` -> `ScreenVisitRepository.AddIfMissingAsync`
  (`INSERT ... ON CONFLICT DO NOTHING`, sem corrida entre abas). Aparelho = `DeviceClassifier.FromUserAgent` (heuristica; iPadOS 13+ conta como
  computador); o User-Agent cru nao e gravado. Tela fora de `ScreenVisit.KnownScreens` vira `outra`.
- **Front**: `ScreenVisitTracker` dentro do `<ProtectedRoute/>` (depois das guardas de e-mail e aceite) chama `recordScreenVisit(screenVisitKey(...))`
  a cada troca de tela; a chave e a do guia (`guideScreenFor`), com `hoje` (`/hoje` sem `?daily=`) separado de `sessao`. Mesma lista nos dois lados.
  1 chamada por tela/dia por aba; erro engolido.
- **Leitura**: `GET /api/admin/retention?courseId=` -> `AdminRetentionUseCase` (tudo em memoria, sem cron; `RetentionCalculator` puro e testado).
  Fora das contas: admins e contas desativadas. "Abriu o app" = dias com visita de tela **ou** Daily concluida (cobre quem se cadastrou antes da fase).
  - Coortes por semana do cadastro (segunda a domingo, dia local); retorno **continuo** (DN = algum dia aberto >= cadastro + N); a celula conta so os
    alunos que ja tem N dias (nula se nenhum) e ha a leitura "fez Daily" (dias de Daily concluida). `CohortTotal` soma as celulas nao nulas.
  - Daily -> Projeto (curso escolhido; padrao = o de mais matriculas): semanas com `WeeklyProjectSpecText`, ate a maior semana com Daily concluida;
    entregou = `WeeklyProject.Status` Submitted/Evaluated, contado so entre quem fez Daily na semana.
  - Desistencia (curso escolhido): parado = ultimo dia aberto (ou o cadastro) <= hoje - 7; agrupado pela ultima semana com Daily no curso
    (`ByWeek` da Semana 1 ate a maior alcancada, zeradas incluidas), `BeforeFirstDaily` e `Active`.
  - Aparelho por tela: ultimos 30 dias, linhas de `ScreenVisits` (alunos-dia) por tela e aparelho.
- Aba `RetentionTab` (`/gestao/retencao`, ultima do `AdminShell`). Privacidade: coberta pela linha "Registros tecnicos (... aparelho/navegador
  resumido ...)" da Fase 102; nenhum cookie ou armazenamento novo.

### Turmas (Fase 96)

Figma "Focadu — Pixel Art", pagina "Turmas — v1 (proposta)" (`289:4502`, TU 01-40), aprovada pelo dono em 12/10/2026. Detalhe em
`docs/fase-96/`. Feito pro teste fechado com a turma de Banco de Dados da UNA.

- **Dominio**: `Cohort` (tabela `Cohorts`: `Name` ate 80, `CourseIds` `uuid[]` sem FK, `CreatedAt`, `ArchivedAt`). `Update` devolve
  os cursos que entraram; turma arquivada nao muda (`turma_arquivada`); nao existe apagar turma. `User.CohortId` (FK Restrict,
  uma turma por aluno, `JoinCohort`), `SignupInvite.CohortId` (FK Restrict, nulo = sem turma), `Course.OnlyForCohorts`
  (padrao false, so o painel muda - o seed nunca toca). Migration `Fase96Turmas`.
- **Cadastro**: convite de turma poe o aluno na turma no mesmo `SaveChanges` do cadastro e logo depois `CohortEnrollment` matricula
  nos cursos dela (um `EnrollUserInCourseUseCase` por curso; curso arquivado ou ja matriculado e pulado). `UserDto.CohortName`
  (me, login, cadastro e confirmacao de e-mail) faz o Start trocar "+ Explorar cursos" pelo nome da turma (`CourseSlots`).
- **Regras decididas pelo dono (12/10/2026)**: curso que entra na turma matricula todos os alunos dela na hora; curso que sai deixa
  as matriculas; arquivar mantem alunos, progresso e a restricao de cursos e revoga os convites ativos da turma; curso "so pra
  turmas" sem turma ativa so gera aviso.
- **Rotas** (`/api/admin`, `AdminCohortsUseCase`): `GET /cohorts` (turmas + cursos com "quem ve" + alunos em turma), `GET
  /cohorts/{id}` (turma, convites e alunos com progresso), `POST /cohorts` e `PUT /cohorts/{id}` (`{name, courseIds}`), `POST
  /cohorts/{id}/archive`, `PUT /courses/{id}/visibility` (`{onlyForCohorts}`). `POST /invites` aceita `cohortId` (turma
  arquivada = `turma_invalida`); `AdminInviteDto`, `AdminStudentDto` e `CurationCourseDto` ganharam a turma.
- **Front**: aba Turmas (`components/admin/CohortsTab.tsx`, `/gestao/turmas`, `?turma=<id>` abre o detalhe), gaveta de convite
  com a turma (`CreateInviteDrawer`, exportada pra abrir da turma com ela marcada), coluna e selo da turma em Alunos
  (`?aluno=<id>` abre o aluno), barra "Quem ve" na Curadoria (esconder do publico pede confirmacao), `CheckOption` no `AdminUi`.

### Lacunas de operacao do painel (Fase 97)

Figma "Focadu — Painel de gestao, Fase 97" (`Uvy09SJEA9phpWZWRzj2ol`, A01-A10, C01-C05, N01-N02), aprovado pelo dono em 14/10/2026.
Detalhe em `docs/fase-97/`.

- **Schema** (migration `Fase97LacunasDoPainel`, 3 colunas nullable `timestamp with time zone`): `Users.DisabledAt` (soft delete),
  `Courses.CatalogEditedAt` (texto do catalogo editado no painel) e `Courses.StatusSetByAdminAt` (status decidido no painel).
- **Dominio**: `User.Disable/Enable/ChangeDisplayName/ChangeEmail` (trocar o e-mail zera `EmailVerifiedAt`); `Course.EditCatalog/
  ClearCatalogEdit/PublishByAdmin/UnpublishByAdmin` e `CanAutoPublish` (Draft e o admin nunca decidiu).
- **Conta desativada vale na hora**: `LoginUserUseCase` recusa com `conta_desativada` (403) e o `OnTokenValidated` do JWT
  (`Program.cs`) confere `IUserRepository.IsDisabledAsync` em toda chamada autenticada (401 `conta_desativada` pelo `OnChallenge`;
  uma consulta leve por chamada, usuario inexistente conta como desativado). Ranking do curso, ranking do squad e QG pulam
  desativados; matriculas e progresso ficam.
- **Rotas** (`/api/admin`, atras do `AdminAccessGuard`):

| Metodo | Rota | Caso de uso | Notas |
|---|---|---|---|
| PUT | `/students/{u}` | `AdminUserManagementUseCase.UpdateAsync` | `{displayName, email}`; e-mail duplicado = 409 `email_ja_cadastrado`; devolve `{student, emailChanged}` |
| POST | `/students/{u}/password-reset` | `SendPasswordResetAsync` | reaproveita `RequestPasswordResetUseCase`; conta desativada = 400 `conta_desativada` |
| POST | `/students/{u}/disable` | `DisableAsync` | `{confirmation}` = e-mail do aluno; nao desativa a si mesmo nem admin |
| POST | `/students/{u}/enable` | `EnableAsync` | |
| PUT | `/students/{u}/role` | `SetRoleAsync` | `{admin}`; nao rebaixa a si mesmo nem o ultimo admin; nao promove conta desativada |
| GET/POST | `/courses` | `AdminCoursesUseCase.ListAsync` / `CreateAsync` | cria curso vazio, sempre Draft; `publish=true` = 400 `curso_sem_dias`; nome duplicado = 409 `curso_ja_existe` |
| PUT | `/courses/{c}` | `UpdateAsync` | texto do catalogo (limites: 100/1000/500, 12 itens de 200); o nome nunca muda |
| POST | `/courses/{c}/publish`, `/unpublish` | `PublishAsync` / `UnpublishAsync` | publicar exige ao menos 1 dia importado; arquivar = Active -> Draft, sem apagar |
| POST | `/courses/{c}/revert-catalog` | `RevertToManifestAsync` | reaplica `curso.json` e `recomendacao.json`; sem pasta = 400 `curso_sem_pasta` |

- **Seed e importador respeitam o painel**: `SyncCourseRecommendationsUseCase.Apply` pula curso com `CatalogEditedAt`; seed e
  importador so publicam sozinhos se `Course.CanAutoPublish` (sem `StatusSetByAdminAt`).
- **Arquivar** nao tira quem ja esta matriculado (`CourseViewer.CanSee`); so some do catalogo e bloqueia matricula nova.
- **Front**: `StudentAccount.tsx` (bloco "// CONTA", gaveta de editar, modais de senha, papel e desativar), filtro Todos/Ativos/
  Desativados e selo em `StudentsTab`; aba Cursos (`CoursesTab.tsx`, `/gestao/cursos`); `Drawer`/`DrawerHeader` compartilhados em
  `AdminUi.tsx`; `client.ts` trata o 401 `conta_desativada` como sessao encerrada.