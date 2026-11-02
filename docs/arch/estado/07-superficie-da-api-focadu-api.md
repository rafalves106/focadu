## Superficie da API (Focadu.Api)

Desde a Fase 2, `Focadu.Api` tem endpoints REST reais (nao mais so os 4 minimos de prova de
composicao da Fase 1). Todos sob `/api`, alem de `GET /health`:

**Desde a Fase 13, quase todo endpoint exige sessao (`.RequireAuthorization()`)** - marcado 🔒
na tabela. Os 🔒 que operam sobre uma instancia especifica (`weeklyId`/`dailyId`) tambem **filtram
pelo dono** (via Enrollment do `userId` do JWT) direto na query do repositorio - um id de outro
usuario sempre vira 404 igual "nao existe", nunca revela que aquele recurso existe mas nao e seu.
So `POST /api/auth/register`/`login`/`logout`/`forgot-password`/`reset-password` ficam de fora
(sao o proprio bootstrap/recuperacao da sessao, sem sessao existente ainda pra exigir).

| Metodo | Rota | Caso de uso | Sucesso |
|---|---|---|---|
| POST | `/api/auth/register` | `RegisterUserUseCase` (Fase 12) | 201, seta cookie `focadu_auth`, 409/400 (ver "Autenticacao") - Fase 17: aceita `referralCode` opcional |
| POST | `/api/auth/login` | `LoginUserUseCase` (Fase 12) | 200, seta cookie, 401 `credenciais_invalidas` |
| POST | `/api/auth/logout` | - (limpa o cookie direto no endpoint) | 200 |
| POST | `/api/auth/forgot-password` | `RequestPasswordResetUseCase` (Fase 41) | 200 sempre (mesmo email nao cadastrado - nunca revela quais emails existem), gera token + manda email (SMTP) |
| POST | `/api/auth/reset-password` | `ResetPasswordUseCase` (Fase 41) | 200, 400 `token_invalido`/`token_expirado`/`senha_muito_curta` |
| 🔒 GET | `/api/auth/me` | `GetCurrentUserUseCase` (Fase 12) | 200, 401 `nao_autenticado` - Fase 18: `UserDto` ganhou `interests`/`additionalProfileNotes` (aba Informações do Perfil le direto daqui, sem endpoint novo) |
| 🔒 PUT | `/api/users/me/profile` | `CompleteProfileUseCase` (Fase 13) | 200 - Entrevista de Perfil (Onboarding); sem guarda de "so uma vez", Fase 18 reaproveita pra editar depois |
| 🔒 GET | `/api/users/me/gamification` | `GetGamificationSummaryUseCase` (Fase 14) | 200 (`GamificationSummaryDto`) - nunca 404, `UserGemBalance`/`UserStreak` sao lazy |
| 🔒 GET | `/api/courses/available` | `GetAvailableCoursesUseCase` (Fase 13) | 200 - so cursos `Active` (e Draft da previa) em que o usuario ainda nao esta matriculado. Fase 84: cada um traz `Requirements`, `RecommendedBefore` (curso recomendado antes + situacao do aluno nele: `NotStarted`/`InProgress`/`Completed`), `PreparesFor` e `PreparesText` |
| 🔒 POST | `/api/enrollments` | `EnrollUserInCourseUseCase` (Fase 13) | 201, 409 `ja_matriculado` - gera Weekly/Daily/WeeklyProject-instancia pra todo o curriculo do curso |
| 🔒 GET | `/api/enrollments/me` | `GetMyEnrollmentsUseCase` (Fase 13) | 200 (lista - hoje no maximo 1) |
| 🔒 GET | `/api/courses` | `ListCoursesUseCase` | 200 - so os cursos em que o usuario esta matriculado (Fase 82), publicados primeiro |
| 🔒 GET | `/api/courses/{courseId}` | `GetCourseDetailUseCase` | 200, 404 se nao existe/usuario nao matriculado (Fase 8: `WeeklyOverviewDto.Days` traz status por dia, pro mini-grid de `CourseDetailPage`; Fase 65: `ProjectStatus` por semana e `Title`/`IsNext`/`ReinforcementDailyId`/`CompletedToday` por dia, pro mapa da trilha) |
| 🔒 GET | `/api/courses/{courseId}/curriculum` | `GetCourseCurriculumUseCase` (Fase 13b) | 200, 404 - curriculo (Course -> Monthly -> WeeklyTemplate), sem exigir matricula; so `/admin/conteudo` usa isso |
| 🔒 GET | `/api/weeklies/{weeklyId}` | `GetWeeklyDetailUseCase` | 200, 404 se nao existe/nao e do usuario - Fase 15: `WeeklyDetailDto` ganhou `HasPendingWeeklyReinforcement`. Fase 29: ganhou `CourseId` (resolvido via `IMonthlyRepository.GetByIdAsync(weekly.MonthlyId)` - Weekly/instancia nao guarda CourseId direto, so Monthly/template). Fase 39: `DailyOverviewDto` ganhou `Title` (titulo do `CuratedContent` da atividade de Leitura do dia, Video como fallback; nulo se nenhum dos dois existir) - Daily nao tem titulo proprio, so usado por `WeeklyDetailPage` |
| 🔒 GET | `/api/weekly-templates/{id}` | `GetWeeklyTemplateDetailUseCase` (Fase 13b) | 200, 404 - WeeklyTemplate (curriculo), sem exigir matricula; so `/admin/conteudo` usa isso |
| 🔒 GET | `/api/dailies/{dailyId}` | `GetDailyStateUseCase` | 200, 404/400/409 (ver abaixo) |
| 🔒 GET | `/api/today?courseId=` | `GetTodayUseCase` | 200, 404/409 (ver "GET /api/today" abaixo); `courseId` opcional desde a Fase 66. Com 2+ matrículas o front sempre manda (`/hoje` pergunta o curso antes, `TodayCourseChoice`, 01/10/2026) |
| 🔒 POST | `/api/dailies/{dailyId}/start` | `StartOrResumeDailyUseCase` | 200 |
| 🔒 GET | `/api/dailies/{dailyId}/warmup` | `GetWarmupUseCase` (Fase 92) | 200 - 2 Quiz/Cloze ja respondidos em dias anteriores |
| 🔒 PUT/GET | `/api/dailies/{dailyId}/feedback` | `SubmitDayFeedbackUseCase`/`GetDayFeedbackUseCase` (Fase 92) | 200 - so depois de concluir a Daily |
| GET | `/api/features` | `PersonalizationOptions` (Fase 92) | 200 `{ personalizedAnalogies }` |
| 🔒 POST | `/api/dailies/{dailyId}/activities/{activityId}/responses` | `SubmitActivityResponseUseCase` | 201 (cria uma nova `ActivityResponse`) |
| 🔒 POST | `/api/dailies/{dailyId}/activities/{activityId}/responses/audio` | `SubmitVoiceSummaryResponseUseCase` (Fase 5) | 201, `multipart/form-data`, so pra `VoiceSummary` |
| 🔒 POST | `/api/dailies/{dailyId}/activities/{activityId}/responses/code` | `SubmitCodeStepResponseUseCase` (Fase 79; Fase 86: `labRun`) | 201 (`SubmitActivityResponseResult`), so pra `CodeStep`: `{ code, output, labRun? }`, avaliado por IA; passo com laboratorio exige `labRun` (400 `rodar_antes_de_enviar`) e ignora `output`; 409 `passo_concluido`/`passo_anterior_pendente` |
| 🔒 POST | `/api/dailies/{dailyId}/activities/{activityId}/code-hint` | `RequestCodeStepHintUseCase` (Fase 86) | 200 (`CodeStepHintResponse`: `hint` com `right`/`wrong`/`improve`, `hintsUsed`, `hintsLeft`), `{ code, labRun? }`; nao e tentativa, 3 por passo; 400 `dicas_esgotadas`/`passo_sem_laboratorio`/`codigo_obrigatorio`/`passo_anterior_pendente`/`passo_concluido`; 502 se a IA falhar |
| 🔒 PUT | `/api/dailies/{dailyId}/code-repository` | `LinkDailyCodeRepositoryUseCase` (Fase 79) | 200 (`DailyStateDto`), `{ url }` http(s) ou vazio pra tirar; so ponte "code comigo" ja concluida |
| 🔒 POST | `/api/dailies/{dailyId}/complete` | `CompleteDailyUseCase` | 200 (`CompleteDailyResult`, ver abaixo - Fase 14: ganhou `GemsEarned`/`StreakAfterCompletion`; Fase 15: ganhou `WasReinforcementBonus`) |
| 🔒 GET | `/api/curated-content/{id}` | `GetCuratedContentUseCase` (Fase 7) | 200, 404 - exige login, mas nao filtra por usuario (curriculo compartilhado). Fase 21: resposta ganhou `personalizedAnalogies` (array, 1 por secao "####" do texto - so quando `Reading` + usuario com interesses cadastrados, ver secao acima) |
| 🔒 POST | `/api/curated-content` | `CreateCuratedContentUseCase` (Fase 4) | 201, 400/404 - Fase 13: campo `weeklyTemplateId` (era `weeklyId`) |
| 🔒 PUT | `/api/curated-content/{id}` | `UpdateCuratedContentUseCase` (Fase 4) | 200, 400/404 |
| 🔒 POST | `/api/weeklies/{weeklyId}/project/submit` | `SubmitWeeklyProjectUseCase` (Fase 7) | 200, 400/404 - `WeeklyProject.Submit` existia desde a Fase 1, so faltava endpoint |
| 🔒 GET | `/api/weeklies/{weeklyId}/project/readme` | `GetWeeklyProjectReadmeUseCase` (Fase 100b) | 200 `{ text }` - README.md do fork do aluno (so o dono). 404 `readme_indisponivel` sem fork/conta/README |
| 🔒 POST | `/api/users/me/forgejo-token` | `GenerateForgejoTokenUseCase` (Fase 60) | 200 `ForgejoTokenDto` - gera token novo do Forgejo e revoga o anterior; unico lugar onde o token inteiro aparece (nao e persistido). 404 `conta_git_inexistente` sem conta no Forgejo |
| 🔒 POST | `/api/weeklies/{weeklyId}/project/evaluate` | `EvaluateWeeklyProjectUseCase` (Fase 11) | 200, 400/404 - `WeeklyProject.Evaluate` existia desde a Fase 1, so faltava endpoint (so backend, sem tela propria). Fase 16: virou PUT com corpo `{score, feedback}` obrigatorio. Fase 21: voltou a ser POST sem corpo - nota/feedback agora vem da IA (GitHub + Groq, ver secao acima). Fase 27b: `SubmitWeeklyProjectUseCase` passou a chamar isso sozinho (composicao) logo apos o submit - nenhum chamador HTTP direto novo, o endpoint continua existindo do mesmo jeito |
| 🔒 GET | `/api/courses/{courseId}/ranking?scope=` | `GetCourseRankingUseCase` (Fase 16) | 200 (`RankingResultDto`) - `scope` = `weekly`\|`monthly`\|`course`, default `course` se omitido. Fase 18: `RankingEntryDto` ganhou `EquippedNameColor` (Name do cosmetico equipado, nao hex - ver secao abaixo). Fase 73: `RankingEntryDto.Look` e `RankingResultDto.AheadEntry`/`TotalEntries`/`CurrentWeekNumber`/`CurrentWeekScored` |
| 🔒 GET | `/api/users/me/badges` | `GetUserBadgesUseCase` (Fase 17) | 200 (`UserBadgesDto`, 5 badges calculados sob demanda) |
| 🔒 GET | `/api/users/me/referral` | `GetReferralInfoUseCase` (Fase 17) | 200 (`ReferralInfoDto`) - gera o `ReferralCode` na 1a consulta |
| 🔒 GET | `/api/marketplace/catalog` | `GetMarketplaceCatalogUseCase` (Fase 17) | 200 (`MarketplaceCatalogDto`) |
| 🔒 POST | `/api/marketplace/purchase` | `PurchaseCosmeticItemUseCase` (Fase 17) | 200 (catalogo recalculado), 404, 409 (`item_ja_possuido`/`gems_insuficientes`/`item_do_kit_basico`/`agente_nao_criado`/`item_fora_da_vitrine`, Fase 71) |
| 🔒 POST | `/api/marketplace/equip` | `EquipCosmeticUseCase` (Fase 17) | 200 (catalogo recalculado), 404, 409 (`item_nao_possuido`/`agente_nao_criado`) |
| 🔒 POST | `/api/marketplace/unequip` | `UnequipCosmeticUseCase` (Fase 17) | 200 (catalogo recalculado) - no-op se nada equipado ainda; 409 `slot_obrigatorio` pra Top/Bottom/Shoes (Fase 71) |
| 🔒 POST | `/api/agent` | `CreateAgentUseCase` (Fase 71) | 200 (catalogo recalculado), 400 (`pele_invalida`/`cabelo_invalido`/`pele_obrigatoria`), 409 (`agente_ja_criado`) |
| 🔒 PUT | `/api/agent/skin` | `UpdateAgentSkinToneUseCase` (Fase 71) | 200 (catalogo recalculado), 400, 409 (`agente_nao_criado`) |
| 🔒 GET | `/api/weeklies/{weeklyId}/publication/status` | `GetPublicationStatusUseCase` (Fase 11) | 200, 404 |
| 🔒 POST | `/api/weeklies/{weeklyId}/publication/draft` | `GenerateLinkedInDraftUseCase` (Fase 11) | 200, 404, 502 (Groq) |
| 🔒 POST | `/api/weeklies/{weeklyId}/publication/github-commit` | `CommitModuleSummaryUseCase` (Fase 11) | 200, 400/404, 502 (GitHub) |
| 🔒 POST | `/api/weeklies/{weeklyId}/publication/submit` | `SubmitPublicationUseCase` (Fase 11) | 200, 400/404 - LinkedIn valida por regex, GitHub chama a API real |
| 🔒 GET | `/api/github/repositories` | `GetGitHubRepositoriesUseCase` (Fase 11) | 200, 502 (GitHub) - exige login, sem filtro por usuario (1 token global do GitHub) |
| 🔒 POST | `/api/squads` | `CreateSquadUseCase` (Fase 24) | 201 (`SquadDto`), 409 `ja_esta_em_squad` |
| 🔒 POST | `/api/squads/join` | `JoinSquadUseCase` (Fase 24; pedido desde a Fase 77) | 200 (`SquadJoinRequestDto` pendente - o mesmo se ja havia um aberto pra este squad), 404 `codigo_invalido`, 409 `ja_esta_em_squad`/`pedido_recusado` |
| 🔒 DELETE | `/api/squads/members/{userId}` | `LeaveSquadUseCase` (se `{userId}` = usuario logado) ou `RemoveMemberUseCase` (Fase 24) | 204, 404 `squad_nao_encontrado`/`membro_nao_encontrado`, 409 `dono_nao_pode_sair`/`dono_nao_pode_se_remover` |
| 🔒 GET | `/api/squads/me/ranking?scope=&page=&courseId=` | `GetSquadRankingUseCase` (Fase 24) | 200 (`SquadRankingResultDto`) - gera `JoinCode` na 1a consulta (lazy), `Members` paginado (Fase 24c), 404 `squad_nao_encontrado`; `courseId` opcional (01/10/2026): só a matrícula daquele curso entra no score de cada membro, sem ele todos os cursos somados |
| 🔒 POST | `/api/dailies/{dailyId}/notes/review` | `ReviewDailyNotesUseCase` (Fase 78) | 200 (`NotesReviewDto`); 400 `sem_notas`, 404 `daily_nao_encontrada`, 409 `limite_revisoes` (10/dia), 502/503 da IA |
| 🔒 GET | `/api/courses/{courseId}/notes/reviews` | `ListNotesReviewsUseCase` (Fase 78) | 200 (`NotesReviewsDto`: ultima revisao de cada dia com `upToDate`, `remainingToday`, `dailyLimit`) |
| 🔒 GET | `/api/squads/requests/me` | `GetMySquadJoinRequestUseCase` (Fase 77) | 200 (`SquadJoinRequestDto`, status `pending`/`rejected`) ou 204 sem pedido pra mostrar |
| 🔒 DELETE | `/api/squads/requests/me` | `CancelMySquadJoinRequestUseCase` (Fase 77) | 204 (idempotente) |
| 🔒 GET | `/api/squads/me/requests` | `GetSquadJoinRequestsUseCase` (Fase 77) | 200 (`SquadJoinRequestsDto`: pendentes + decididos em 30 dias + recusados) - so lider/colider, senao 404 `squad_nao_encontrado` |
| 🔒 GET | `/api/squads/me/requests/count` | `GetSquadJoinRequestCountUseCase` (Fase 77) | 200 (`{count}`; 0 pra quem nao lidera) |
| 🔒 POST | `/api/squads/me/requests/{requestId}/{accept\|reject\|undo-reject}` | `DecideSquadJoinRequestUseCase` (Fase 77) | 204; 404 `pedido_nao_encontrado`, 409 `pedido_indisponivel`/`pedido_nao_recusado`/`ja_esta_em_squad`, 400 `acao_invalida` |
| 🔒 GET | `/api/squads/me/hq` | `GetSquadHqUseCase` (Fase 72) | 200 (`SquadHqDto`: cabecalho, escalacao com agentes, meta da semana, feed dos ultimos 14 dias com GGs), 404 `squad_nao_encontrado` (= sem squad) |
| 🔒 POST | `/api/squads/me/cheers` | `ToggleSquadCheerUseCase` (Fase 72) | 200 (`SquadCheerResultDto`) - toggle do GG; 400 `atividade_invalida`/`gg_proprio`, 404 `squad_nao_encontrado`/`atividade_nao_encontrada` |
| 🔒 GET | `/api/users/me/study-calendar` | `GetStudyCalendarUseCase` (Fase 72) | 200 (`StudyCalendarDto`: 14 dias com status studied/rest/paused/missed/today/before + ultima sessao) |
| 🔒 PUT | `/api/users/me/squad-feed-privacy` | `UpdateSquadFeedPrivacyUseCase` (Fase 72) | 200 (`UserDto`) - corpo `{hideScores}` |
| 🔒 POST | `/api/users/me/guides/{key}/seen` | `MarkGuideSeenUseCase` (Fase 75) | 200 (`UserDto` com `seenGuides`) - idempotente; 400 `guia_invalido`/`guia_limite` |
| 🔒 POST | `/api/users/me/accept-terms` | `AcceptTermsUseCase` (Fase 102) | 200 (`UserDto`) - grava `TermsAcceptedVersion`/`TermsAcceptedAt`; 409 `termos_desatualizados` se a versao enviada nao e `LegalDocuments.CurrentVersion` |
| 🔒 GET | `/api/system/ai-status` | `GetAiProviderStatusUseCase` (Fase 28) | 200 (array de `AiProviderStatusDto` - hoje so Groq), nunca 404/erro (a checagem em si nunca lanca, ver secao Groq abaixo) |
| 🔒 POST | `/api/weeklies/{weeklyId}/project/notes` | `CreateWeeklyProjectNoteUseCase` (Fase 63) | 201 (`NoteDto` com `weeklyProjectId`), 404 `semana_nao_encontrada`/`projeto_nao_encontrado`, mesmos 400 de validacao da nota |
| 🔒 POST | `/api/dailies/{dailyId}/notes` | `CreateNoteUseCase` (Fase 29) | 201 (`NoteDto`), 404 `daily_nao_encontrada`, 400 `nota_vazia`/`nota_muito_longa`/`tag_muito_longa`/`notas_tags_demais` |
| 🔒 PUT | `/api/notes/{noteId}` | `EditNoteUseCase` (Fase 29) | 200 (`NoteDto`), 404 `nota_nao_encontrada`, 400 (mesmos codigos de validacao acima) |
| 🔒 DELETE | `/api/notes/{noteId}` | `DeleteNoteUseCase` (Fase 29) | 204, 404 `nota_nao_encontrada` |
| 🔒 GET | `/api/courses/{courseId}/notes?from=&to=&q=&tag=&dailyId=` | `ListNotesUseCase` (Fase 29; `dailyId` na Fase 57) | 200 (`NoteDto[]`, mais recente primeiro), 404 `matricula_nao_encontrada`, 404 `daily_nao_encontrada` (so com `dailyId`) - todos os filtros opcionais; `dailyId` de um reforco inclui as notas do dia base |
| 🔒 GET | `/api/courses/{courseId}/notes/tags` | `ListNoteTagsUseCase` (Fase 29) | 200 (`string[]`, tags distintas ja usadas pelo usuario neste curso) - autocomplete do campo de tags |
| 🔒 POST | `/api/study-assistant/ask` | `AskStudyAssistantUseCase` (Fase 32, `History` na Fase 33) | 200 (`{answer}`), 400 `pergunta_obrigatoria`/`pergunta_muito_longa`, 502/503 (Groq) - sem `dailyId`/`weeklyId` na rota nem filtro por posse: `Context` vem pronto do frontend (o que ja esta na tela), nao busca nada por Id. `History` (opcional) e o transcript local do chat, clampado no servidor (ver secao "Suporte Rapido de IA" abaixo) |

As rotas da Api sao caminhos REST simples (`/api/weeklies/{weeklyId}`), **nao** um espelho das
rotas do frontend (`/start?course=&weekly=`) - o frontend usa query string no seu proprio router
para navegacao; a Api so precisa entregar o dado que cada tela pede, os formatos nao precisam
coincidir.

### GET /api/dailies/{dailyId} e GET /api/today retornam o mesmo shape (`DailyStateDto`)

Os dois usam `Weekly.EvaluateDailyAccess` internamente e devolvem o **mesmo formato**
(`DailyStateDto`, com a lista completa de `Activities`) tanto para a Daily ativa quanto para uma
Daily passada - quem diferencia "tela de estudo imersiva" de "resumo/gabarito" e o campo
`AccessMode` no corpo da resposta (`Start`/`Resume`/`Replay` = editavel; `ReadOnly` = so
consulta; `Blocked` = cota diaria ja gasta, `WeekPendingClosure` (Fase 54) = semana concluida
faltando projeto/publicacao - os dois so vem de `/today`, sao "nada a rodar, so avisar"; e
`PendingReinforcementDailyId` (Fase 56), tambem so de `/today`, e o id do reforco ainda nao concluido), nao um
shape de resposta diferente. Isso vale tambem para a resposta de
`POST .../start` - ela retorna `DailyStateDto` direto, para o cliente sempre ter o estado
atualizado sem precisar de uma segunda chamada. `POST .../complete` retorna um shape diferente
(`CompleteDailyResult`, ver abaixo) porque, alem do estado da Daily, precisa reportar reforco.

`DailyActivityDto` expoe `Prompt` (enunciado) sempre, sem redacao - e o que o usuario precisa ler
pra responder. Ja `QuizOptions[].IsCorrect`, `ExpectedAnswer`, `RoleplayNodes[].TerminalQuality` e
`WordMatchTerms[].CorrectDefinitionId` (Fase 23) - o gabarito propriamente dito de cada tipo -
**so aparecem depois que a atividade tem ao menos uma `ActivityResponse` registrada** (Fase 3) -
antes disso vem `null`. O gate e um unico booleano em `DailyStateMapper.ToActivityDto`
(`hasAnswered = daily.Responses.Where(r => r.ActivityId == activity.Id).Any()` desde a Fase 13 -
`Responses` mora em `Daily`/instancia agora, nao mais em `DailyActivity`/template, ver "Template
vs Instancia"), aplicado aos quatro campos. Isso fecha a lacuna identificada na Fase 2 (gabarito
visivel no DevTools antes de responder). WordMatch (Fase 23) tem uma segunda camada do mesmo
cuidado: `WordMatchTerms` e `WordMatchDefinitions` vao em listas SEPARADAS (nunca aninhadas no
mesmo objeto) e `WordMatchDefinitions` sai embaralhada a cada carga - do contrario, a propria
FORMA do JSON (quem esta ao lado de quem, ou a mesma posicao nas duas listas) entregaria a
correspondencia certa sem nem precisar de `CorrectDefinitionId`. Ver `WordMatchPair` no dominio.

### GET /api/today usa a Enrollment do usuario logado (Fase 13, era "1 Course Active" global)

Ate a Fase 12, como o dominio nao tinha conceito de usuario/curso "atual", o atalho "/hoje"
resolvia via `ICourseRepository.GetAllAsync()` filtrado por `Status == Active` - zero cursos
ativos virava 404, mais de um virava 409. **Fase 13**: agora resolve via `IEnrollmentRepository.
GetByUserIdAsync(userId)` - zero matriculas vira 404 (`nenhuma_matricula_ativa`), mais de uma
matricula vira 409 (`multiplas_matriculas_ativas`, sugerindo usar `/api/weeklies/{weeklyId}` pra
desambiguar) - mesmo tratamento defensivo de antes, so que escopado por usuario em vez de global.
Isso e seguro pro cenario atual (so 1 Enrollment por usuario, ja que so existe 1 Course), mas
para de funcionar sozinho se um usuario puder se matricular em varios cursos ativos ao mesmo
tempo sem um jeito de escolher "qual curso agora" - mesma limitacao que a versao antiga tinha,
so que agora por usuario em vez de global. **Fase 66:** `?courseId=` (opcional) escolhe a matricula
daquele curso - e o que a tela de start usa pra mostrar a Daily do curso selecionado (404
`matricula_nao_encontrada` se o usuario nao esta matriculado nele). Sem o parametro, tudo igual
(1 matricula, senao 409). A cota de "1 Daily por dia" ja era por matricula, ou seja por curso -
confirmado pelo dono como a regra certa. `TodayPage` sem `?daily=` (e o "Hoje" do menu) ainda chama
sem `courseId`, entao com 2+ matriculas continua caindo no 409.

**Bug real, corrigido em 3 rodadas (13, 14 e 15/09/2026) - a resolucao de "a Daily de hoje" foi
toda repensada.**

- **Rodada 1 (13/09):** `GetTodayUseCase` so procurava `Weekly.GetDailyByDate(hoje)`, mesmo
  `Weekly.EvaluateDailyAccess` ja suportando "Resume" pra uma Daily `InProgress` independente da
  data - quando NENHUMA Daily batia com "hoje" (ex: comecada numa sexta, nao terminada, proximo
  acesso caiu no fim de semana - sem Daily agendada pra esses dias, ja que
  `EnrollUserInCourseUseCase` so distribui por dia util), o atalho devolvia
  `daily_hoje_nao_encontrada` (404) direto, sem procurar a Daily abandonada em lugar nenhum.
- **Rodada 2 (14/09) - a rodada 1 nao cobria o caso mais comum.** Quando a Daily de hoje EXISTE
  mas ha uma Daily `InProgress` diferente de um dia anterior - `GetTodayUseCase` resolvia
  certinho pra Daily de hoje, so que `EvaluateDailyAccess` recusa `Start` numa Daily nova
  enquanto outra continuar `InProgress` (`Code = "daily_em_andamento"`) - o atalho literalmente
  batia nesse exception. Corrigido buscando uma Daily `InProgress` **antes** de tentar resolver
  pra "hoje" (cross-Weekly).
- **Rodada 3 (15/09) - raiz do problema, nao so um sintoma.** As duas rodadas acima ainda
  resolviam "hoje" batendo `Daily.Date` (fixado de uma vez so na matricula, 1 dia util por Daily)
  contra o calendario real quando nada estava `InProgress`. Bug relatado ao vivo: concluir a
  Daily 1 num dia so liberou calendarmente a Daily 4 no acesso seguinte, deixando as Dailies 2 e 3
  presas em `Locked` pra sempre (nunca "e a vez delas" num modelo que so olha data). Qualquer
  folga entre o ritmo hipotetico de 1-dia-util-por-Daily e o ritmo real do aluno tinha esse
  efeito - a comparacao de data em si era a causa, nao um caso de borda dela.

**Correcao final (Fase 38b):** `GetTodayUseCase` resolve "hoje" em 2 passos, nunca mais
comparando `Daily.Date` com o calendario: (1) `DailySequencing.FindInProgress` - qualquer Daily
`InProgress` em qualquer Weekly da matricula, sempre prioridade (permite recuperar uma
abandonada); (2) senao, `DailySequencing.FindNext` - a Daily nao-reforco de menor `DayNumber`
ainda nao concluida em TODA a matricula. `Weekly.GetDailyByDate` e
`IWeeklyRepository.GetByEnrollmentAndDateAsync` foram removidos (ficaram sem nenhum outro uso).

**Fase 54:** antes de avaliar o acesso, `GetTodayUseCase` checa se alguma Weekly anterior a da
Daily-alvo ainda nao fechou (projeto nao avaliado / publicacao nao validada) e, se sim, devolve a ultima Daily
original dela com `DailyAccessMode.WeekPendingClosure` em vez da 1a Daily da semana seguinte - ver
"Publicacao publica e bloqueio de modulo". A avaliacao do acesso passou a enxergar a matricula
inteira (`otherWeekliesDailies`), entao "1 Daily por dia" tambem barra a Daily 1 de uma Weekly nova
quando a ultima da anterior foi concluida hoje (`Blocked`).

### Score no servidor para todo tipo de atividade (Fase 3 + Fase 4 + Fase 5)

`POST .../responses` **nao tem mais campo `Score`** - desde a Fase 4, o Score de qualquer tipo de
atividade e sempre calculado no servidor, nunca aceito pronto do cliente:

| Tipo | Campo do request | Como o Score e calculado |
|---|---|---|
| `Quiz` | `SelectedOptionId` | 100 se a opcao existe nessa atividade e `IsCorrect = true`, senao 0 |
| `Cloze` + `AnswerMode.MultipleChoice` | `SelectedOptionId` | Mesmo mecanismo de Quiz (reaproveitado) |
| `Cloze` + `AnswerMode.FreeText` | `Transcript` | 100 se `Transcript.Trim()` bate com `ExpectedAnswer.Trim()` (case-insensitive), senao 0 - **ponytail**: comparacao textual simples, sem IA |
| `WordMatch` (Fase 23) | `WordMatchMatches` (`Dictionary<Guid,Guid>`, TermId -> DefinitionId escolhido - TODOS os pares da atividade de uma vez, nao 1 por request) | Percentual de pares certos (`WordMatchPair.DefinitionId` bate com o escolhido), arredondado - pontuacao PARCIAL, nao tudo-ou-nada (ver `ScoreFromWordMatchMatches`) |
| `Roleplay` | `SelectedRoleplayNodeId` | A partir do `TerminalQuality` do node terminal alcancado (ver tabela abaixo) - o node precisa ter `IsTerminal = true` |
| `VoiceSummary` | Arquivo de audio (`POST .../responses/audio`, endpoint separado - ver "Resumo falado por voz" abaixo) | Resultado de `IContentEvaluationService.EvaluateAsync` (Groq, Fase 5) |
| `Reading` / `Video` (Fase 7) | Nenhum (corpo vazio) | Sempre 100 - sem avaliacao, concluir a etapa e o proprio "acerto" (nunca reprova, nunca soma `PenaltyPoints`) |

Os 5 primeiros tipos sao resolvidos sincronamente em
`SubmitActivityResponseUseCase.ResolveScore`. `VoiceSummary` e assincrono (chama 2 servicos
externos) e por isso vive num caso de uso e endpoint proprios - ver abaixo.

Mapeamento `TerminalQuality` -> Score (decidido na Fase 4, unico node que passa do
`PassingScore` de 80 e o `Ideal`):

| TerminalQuality | Score |
|---|---|
| `Ideal` | 100 |
| `Suboptimal` | 60 |
| `Poor` | 20 |

`Transcript` (Cloze/FreeText) tambem aceita `Justification` opcional no mesmo request - texto
livre do usuario sobre por que respondeu aquilo, so armazenado (`ActivityResponse.Justification`),
sem avaliacao.

Validacao (`ValidationException`, mesmo envelope padrao de erro):

| Code | Quando |
|---|---|
| `selected_option_id_obrigatorio` | Quiz/Cloze(MultipleChoice) sem `SelectedOptionId` no corpo |
| `selected_option_id_invalido` | `SelectedOptionId` nao corresponde a uma `QuizOption` desta atividade |
| `word_match_matches_obrigatorio` | WordMatch sem `WordMatchMatches` no corpo (Fase 23) |
| `word_match_matches_invalido` | WordMatch com `WordMatchMatches` faltando pares, sobrando pares, ou com algum TermId que nao pertence a esta atividade (Fase 23) |
| `transcript_obrigatorio` | Cloze(FreeText) sem `Transcript` no corpo |
| `selected_roleplay_node_id_obrigatorio` | Roleplay sem `SelectedRoleplayNodeId` no corpo |
| `selected_roleplay_node_id_invalido` | `SelectedRoleplayNodeId` nao corresponde a um `RoleplayNode` desta atividade |
| `selected_roleplay_node_nao_terminal` | `SelectedRoleplayNodeId` aponta pra um node com `IsTerminal = false` |

### Resumo falado por voz (`POST .../responses/audio`, Fase 5)

Endpoint separado do texto porque o corpo e binario (`multipart/form-data`, campo `audio`), nao
JSON. Fluxo de `SubmitVoiceSummaryResponseUseCase`:

1. Valida tamanho do arquivo (`MaxAudioSizeBytes` = 25MB - **ponytail**: calibrado pra cobrir
   ~10min de gravacao tipica do navegador com folga, e coincide com o limite de upload da propria
   Groq) e que a atividade e do tipo `VoiceSummary`.
2. Resolve o `CuratedContent` referenciado por `activity.ContentId` como texto de referencia
   (`BodyText`) - Fase 21: quando falta (`Video` nunca tem `BodyText`, estrutural, ver
   `CURADORIA.md`), cai pro `Prompt` da propria atividade (os prompts de VoiceSummary sobre video
   ja descrevem o que se espera na resposta, ver `dia-1.json`); so `conteudo_referencia_ausente`
   (400) se nem isso existir.
3. `IAudioTranscriptionService.TranscribeAsync` (Groq Whisper, `whisper-large-v3`) - transcricao
   vazia vira `ExternalServiceException` (`transcricao_vazia`, 502).
4. `IContentEvaluationService.EvaluateAsync` (Groq chat completion, `openai/gpt-oss-120b`, JSON
   mode) com `ContentEvaluationRequest(ExpectedAnswer: BodyText ou Prompt (item 2), UserAnswer:
   transcricao, ContextText: Prompt - so quando BodyText ja foi a referencia principal; repeti-lo
   seria redundante se a referencia ja caiu no fallback do Prompt)` - retorna
   `ContentEvaluationResult(Score, Feedback, CorrectedTranscript)`. O modelo original
   escolhido na Fase 5 (`llama-3.3-70b-versatile`) saiu do catalogo da Groq antes mesmo do
   primeiro teste com chave real - corrigido pra `openai/gpt-oss-120b` nessa mesma validacao (ver
   `ponytail:` no codigo de `GroqContentEvaluationService` - catalogo de modelos da Groq muda com
   frequencia, checar `GET /v1/models` se `model_not_found` aparecer de novo).
5. Grava a resposta e checa reforco via `ActivityResponseRecorder` (mesmo passo compartilhado com
   `SubmitActivityResponseUseCase`) - `Transcript` = transcricao bruta (Whisper), `CorrectedTranscript`
   (Fase 39) = a mesma transcricao com correcoes da IA, `AiFeedback` = feedback da IA, `Score` = nota
   da IA, `Justification` = nulo (nao se aplica a VoiceSummary).

Prompt de avaliacao (formato confirmado com o Falves antes de implementar - decisao registrada em
`docs/fase-5/resumo-implementacao-fase-5.md`): pede 1 nota unica de 0 a 100 que ja pondera "conteudo
correto" e "clareza da explicacao" juntos, mais 1 feedback curto em PT-BR. Texto exato dos prompts
(sistema + usuario) em `Focadu.Infrastructure.Services.GroqContentEvaluationService`.

**Correcao de transcricao antes da avaliacao, em chamada Groq separada da nota (Fase 42, revisando
a Fase 39 - bug real relatado ao vivo: erro de transcricao do Whisper derrubando o score
injustamente mesmo depois da correcao da Fase 39).** A Fase 39 pedia correcao e nota na mesma
chamada; verificado ao vivo contra a API real que, quando o erro de transcricao troca um termo
tecnico pelo seu antonimo foneticamente parecido (ex.: "simetrica" por "assimetrica" - continua
sendo uma frase gramaticalmente valida, so com o sentido invertido), o modelo e cauteloso demais
pra corrigir sozinho na mesma chamada em que tambem calcula a nota, mesmo com a instrucao de
correcao reforcada - e penaliza o aluno mesmo quando o resto da resposta demonstra dominio
consistente do conceito. Separado em 2 chamadas (`CorrectTranscriptAsync` depois `GradeAsync`), o
mesmo modelo corrige de forma confiavel. Custo extra (2 chamadas por submissao em vez de 1) e
desprezivel pro volume de uso da Focadu - reverte a decisao de custo da Fase 39. Correcao e um
passo aditivo/best-effort: se a IA nao devolver JSON valido nem apos o orcamento de retry do
`HttpRetry`, `CorrectTranscriptAsync` cai pro `UserAnswer` bruto em vez de falhar a submissao
inteira. `ActivityResponse.Transcript` continua guardando o texto bruto do Whisper (auditoria);
`ActivityResponse.CorrectedTranscript` guarda o que a IA de fato avaliou - so preenchido no fluxo
de `VoiceSummary` (`SubmitActivityResponseUseCase`, usado pelos outros tipos de atividade, sempre
passa `null`).

**Nota mede completude contra a Instrucao, nao contra o conteudo de referencia inteiro (Fase 42,
2o bug achado no mesmo caso ao vivo).** Quando `ContextText` (Instrucao da atividade) esta
presente, o `ExpectedAnswer` (conteudo curado inteiro, que pode ter mais de uma secao/subtopico)
pode cobrir mais do que a atividade especificamente pediu - a IA estava penalizando o aluno por nao
cobrir um subtopico do conteudo curado que a Instrucao nunca pediu. Prompt de avaliacao agora mede
completude contra "o que a instrucao pediu" quando ha Instrucao separada, usando o conteudo de
referencia so pra checar se o que foi dito esta correto; sem Instrucao separada (BodyText ausente,
`ExpectedAnswer` cai pro proprio `Prompt`), continua medindo contra a referencia como antes (nesse
caso sao a mesma coisa).

**Resposta malformada da IA nunca vira uma nota inventada.** Se o JSON retornado pela Groq nao
tiver `score` (inteiro 0-100) e `feedback` (string) validos, `GroqContentEvaluationService` lanca
`ExternalServiceException("avaliacao_ia_formato_invalido", ...)` (502) - o usuario ve um erro
claro e pode gravar de novo, em vez de receber uma pontuacao que ninguem validou.

Codes especificos deste fluxo:

| Code | Status | Quando |
|---|---|---|
| `audio_obrigatorio` | 400 | Nenhum arquivo enviado no campo `audio` |
| `audio_muito_grande` | 400 | Arquivo acima de 25MB |
| `tipo_atividade_invalido` | 400 | Atividade nao e do tipo `VoiceSummary` |
| `conteudo_referencia_ausente` | 400 | `CuratedContent` referenciado sem `BodyText` |
| `transcricao_vazia` | 502 | Groq Whisper devolveu transcricao vazia |
| `avaliacao_ia_formato_invalido` | 502 | Resposta da Groq nao e o JSON esperado |
| `groq_timeout` | 503 | Groq nao respondeu a tempo (timeout de 60s no `HttpClient`) |
| `groq_indisponivel` / `groq_transcricao_falhou` / `groq_avaliacao_falhou` | 502 | Erro de rede ou status HTTP de erro vindo da Groq |
| `groq_api_key_nao_configurada` | 502 | `Groq:ApiKey` vazia - ver "Como configurar a chave da Groq" abaixo |

### Conclusao da Daily (`POST .../complete`) e reforco (Fase 4)

O reforco (diario e/ou semanal), quando existe, **ja foi disparado antes** - durante alguma
`SubmitActivityResponse` anterior (`Daily.ShouldTriggerDailyReinforcement()`/
`Weekly.ShouldTriggerWeeklyReinforcement()` sao avaliados resposta a resposta, nao no momento da
conclusao). `CompleteDailyUseCase` reporta o estado do reforco (ja existente) + credita Gems/
Streak (Fase 14, ver "Gamificacao" acima) na mesma chamada:

```
CompleteDailyResult(
  Daily: DailyStateDto,
  DailyReinforcementTriggered: bool,     <- Daily.ReinforcementTriggered
  ReinforcementDailyId: Guid?,            <- Daily.ReinforcementDailyId
  WeeklyReinforcementTriggered: bool,     <- existe algum WeeklyReinforcement cobrindo esta Daily
  WeeklyReinforcementId: Guid?,
  GemsEarned: int,                        <- Fase 14: 0 em replay ou cap mensal atingido
  StreakAfterCompletion: int,             <- Fase 14: sempre o streak "ao vivo" (CurrentStreakAsOf)
  WasReinforcementBonus: bool)            <- Fase 15: elegibilidade ao bonus, independente do cap
```

`WeeklyReinforcementTriggered`/`WeeklyReinforcementId` sao calculados procurando, em
`weekly.Reinforcements`, o primeiro `WeeklyReinforcement` cujo `WeakDailyIds` contem o Id desta
Daily - nao precisa de nenhum campo novo no dominio, so uma busca (`WeeklyReinforcement.WeakDailyIds`
ja e publico).

### Tratamento de erro padronizado

Toda excecao lancada por um endpoint vira o mesmo formato de corpo:

```json
{ "error": "codigo_do_erro", "message": "descricao legivel" }
```

Isso e feito por `Focadu.Api.ErrorHandling.ApiExceptionHandler` (um `IExceptionHandler` do
ASP.NET Core, registrado globalmente via `app.UseExceptionHandler()`), que reconhece:

| Tipo | Onde vive | Status HTTP |
|---|---|---|
| `Focadu.Domain.Exceptions.DomainException` | Domain | Depende do `Code` (tabela abaixo); default 400 |
| `Focadu.Application.Exceptions.NotFoundException` | Application | Sempre 404 |
| `Focadu.Application.Exceptions.ConflictException` | Application | Sempre 409 |
| `Focadu.Application.Exceptions.ValidationException` | Application (lancada pela Api antes do caso de uso) | Sempre 400 |
| `Focadu.Application.Exceptions.ExternalServiceException` (Fase 5) | Application (lancada pelos adapters Groq) | `StatusCode` explicito no construtor - 502 default, 503 pra timeout |
| `Microsoft.AspNetCore.Http.BadHttpRequestException` (Fase 5) | Framework (model binding) | Sempre 400, `Code = "requisicao_invalida"` - corpo ausente/malformado (JSON invalido, `multipart/form-data` sem o campo esperado) antes do endpoint rodar |
| Qualquer outra excecao | - | 500, `Code = "erro_interno"`, logada via `ILogger` |

**`BadHttpRequestException` descoberto e corrigido na Fase 5** ao testar o endpoint de audio com
corpo ausente - sem esse caso, caia no 500 generico. Cobre qualquer entrada malformada que o
model binding do ASP.NET Core rejeita antes do endpoint rodar, JSON incluso - fecha tambem o
ponto em aberto sobre "JSON malformado" documentado desde a Fase 2.

`DomainException` carrega um `Code` (string, snake_case) alem da `Message`, exatamente para a
Api conseguir decidir o status HTTP sem depender do texto da mensagem (que pode mudar de
redacao). Codigos de `DomainException` mapeados explicitamente para um status diferente do
default (400):

| Code | Status | Disparado por |
|---|---|---|
| `daily_bloqueada` | 400 | `Weekly.EvaluateDailyAccess` numa Daily que nao e a `isNextInSequence` (nem reforco) - ate a Fase 38b era `daily_futura`, disparado por `Date > hoje` |
| `daily_em_andamento` | 409 | `Weekly.EvaluateDailyAccess` quando outra Daily ja esta `InProgress` em qualquer Weekly da matricula (ate a Fase 54, so na propria Weekly) |
| `daily_limite_diario_atingido` | 409 | `Weekly.EvaluateDailyAccess` numa Daily nao-reforco quando ja ha uma Daily ORIGINAL (nao-reforco) concluida hoje em qualquer Weekly da matricula (Fase 38 / matricula inteira na Fase 54; reforco e isento). `GET /api/today` captura e devolve `AccessMode = Blocked` |
| `projeto_semana_anterior_pendente` | 409 | `StartOrResumeDailyUseCase` quando alguma Weekly anterior da matricula tem todas as Dailies concluidas mas o projeto ainda nao foi avaliado - `Weekly.RequiresProjectToUnlock` (Fase 54) |
| `daily_somente_leitura` | 409 | `Weekly.StartOrResumeDaily` numa Daily `ReadOnly` |
| `daily_ja_concluida` | 409 | `Daily.Start()` numa Daily ja `Completed` |
| `daily_nao_iniciada` | 409 | `Daily.SubmitActivityResponse` antes de `Start()` |
| `daily_nao_em_andamento` | 409 | `Daily.Complete()` fora de `InProgress` |
| `daily_nao_encontrada` | 404 | Daily/DailyId nao encontrado dentro da Weekly |
| `atividade_nao_encontrada` | 404 | `activityId` nao encontrado dentro da Daily |
| `reforco_semanal_condicoes_nao_atingidas` | 409 | guarda defensiva, nao alcancada pela Api hoje |
| `reforco_diario_condicoes_nao_atingidas` | 409 | guarda defensiva, nao alcancada pela Api hoje |
| `modulo_bloqueado_por_publicacao` | 409 | `StartOrResumeDailyUseCase` quando alguma Weekly anterior da matricula ainda `RequiresPublicationToUnlock` (Fase 11; ate a Fase 55 so a `Number - 1`) |
| `publicacao_ja_validada` | 409 | `ModulePublication.Submit` chamado depois que a publicacao ja esta `Validated` (Fase 11) |
| `credenciais_invalidas` | 401 | `LoginUserUseCase` - email nao existe OU senha errada (nunca diferenciado, ver "Autenticacao") (Fase 12) |
| `token_invalido` | 400 | `ResetPasswordUseCase`/`PasswordResetToken.Consume` - token de reset inexistente ou ja usado (Fase 41) |
| `token_expirado` | 400 | `PasswordResetToken.Consume` - token de reset passou da 1h de validade (Fase 41) |

Qualquer outro `DomainException.Code` (as validacoes de criacao de conteudo em `Course`,
`Monthly`, `DailyActivity`, `QuizOption`, `RoleplayNode`, etc., que ainda nao tem endpoint de
autoria) cai no `Code` default `"regra_de_negocio_violada"` e status 400 - nao alcancavel pela
Api hoje porque nenhum endpoint de criacao de conteudo existe ainda (so leitura + as 3 acoes de
progresso do aluno). `tests/Focadu.Tests/Domain/DomainExceptionCodeTests.cs` trava os `Code`
usados na tabela acima, para um typo em qualquer lado (dominio ou tabela da Api) quebrar o build
de testes em vez de silenciosamente virar um 400 generico em producao.

### Validacao de entrada

- Parametros de rota (`dailyId`, `activityId`, etc.) sao `string` no template da rota (nao
  `{id:guid}`), parseados explicitamente via `RouteParsing.RequireGuid` - de proposito, para um
  Guid malformado tambem virar `{ error: "id_invalido", message: "..." }` (400) em vez do 404
  generico que uma constraint de rota do ASP.NET Core geraria sozinha.
- `SubmitActivityResponseRequest` tem `SelectedOptionId`/`SelectedRoleplayNodeId`/`Transcript`/
  `Justification` (todos opcionais) - qual e obrigatorio depende do `ActivityType`/`AnswerMode`,
  validado dentro do caso de uso (ver "Score no servidor" acima), nao em `Program.cs`.
- **Resolvido na Fase 5:** corpo de request malformado (JSON invalido, `multipart/form-data` sem
  o campo esperado) agora sempre usa o formato padrao da Api (`requisicao_invalida`, 400) - ver
  `BadHttpRequestException` na secao de tratamento de erro acima.

### Autoria de conteudo curado (Fase 4-13b, removida - decisao do usuario, 2026-08-28)

`POST /api/curated-content` e `PUT /api/curated-content/{id}` (+ `CreateCuratedContentUseCase`,
`UpdateCuratedContentUseCase`, `CuratedContent.Update`, `/admin/conteudo` /
`AdminContentPage.tsx`) existiram da Fase 4 ate aqui, mas foram **removidos**: conteudo curado
(cursos novos dentro de `secret/curadoria/`) e so via seed (`CuratedDayImporter`, skill
`curar-conteudo`) mesmo, sem tela de autoria na plataforma. `GET /api/curated-content/{id}`
continua existindo (leitura, usada por `ReadingActivity`/`VideoActivity` na sessao diaria). Ver
`docs/fase-13b/resumo-implementacao-fase-13b.md` pro historico da UI que existiu.

### CORS (Fase 3, configuravel desde a Fase 99)

A Api libera `http://localhost:5173` (e `127.0.0.1:5173`) via `AddCors`/`UseCors`, para o
frontend Vite conseguir chamar a Api em dev - sem isso o navegador bloqueia toda chamada (portas
diferentes contam como origens diferentes, mesmo os dois em `localhost`). Desde a Fase 99 as origens vem de
`Cors__AllowedOrigins` (separadas por virgula) e o padrao continua sendo o de dev. Em producao nao entra em jogo: o
nginx do frontend faz proxy same-origin de `/api`.

### Seguranca de borda (Fase 99)

- **IP e esquema reais** (`Program.cs`, `UseForwardedHeaders` antes de tudo): a cadeia e Cloudflare Tunnel -> nginx do
  frontend -> Api. `X-Forwarded-For` chega como `cliente, cloudflared`; a Api le 2 saltos da direita
  (`Forwarded__Limit`, padrao 2), entao um `X-Forwarded-For` falso mandado pelo cliente fica pra tras. As redes/proxies
  conhecidos sao esvaziados porque so o nginx alcanca a Api na rede do Docker; **a porta `5282` do host nao pode ficar
  aberta pra internet** (quem a alcancasse poderia forjar o IP).
- **Limite de requisicoes** (`RateLimiting.cs`, `UseRateLimiter` depois da autenticacao): um limitador global escolhido
  pelo caminho (so `POST`), em janela deslizante de 4 segmentos. `login`: 10/min por IP. `account` (`/auth/register`,
  `forgot-password`, `reset-password`, `email-verification/send|confirm`): 10 por 15 min por IP. `ai` (resposta de voz,
  passo de codigo, dica, envio e avaliacao do projeto, rascunho do LinkedIn, revisao do Caderninho, Suporte Rapido): 20/min por
  aluno (IP se nao houver sessao). Excedeu: 429 `{ error: "muitas_requisicoes", message }` com `Retry-After`. Rota nova que
  case com um padrao ja entra; endpoint de IA novo precisa entrar no regex `AiPath`. Desligar: `RateLimit__Enabled=false`.
  Nao e orcamento de IA (isso e a Fase 101).
- **Headers do nginx** (`frontend/nginx.conf`): HSTS, `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy`, `Permissions-Policy` (microfone so da propria origem) e uma CSP so com `frame-ancestors`, `base-uri`,
  `object-src` e `form-action`. **Sem `script-src` de proposito**: uma CSP completa precisa ser conferida no navegador. O
  bloco `/lab/` repete os headers porque `add_header` de um `location` substitui os do nivel de cima.