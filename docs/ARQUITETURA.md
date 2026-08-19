# Arquitetura da Focadu — estado atual

> Documento vivo. Nao e historico de decisoes (isso fica em `docs/fase-N/`) - e sempre um
> retrato do estado atual e consolidado do projeto. Ver `docs/CONVENCOES.md` para a regra de
> como e quando este arquivo e atualizado.
>
> Ultima fase que atualizou este documento: **Fase 4 - Autoria de Conteudo, Conclusao da Daily e
> Telas Restantes**.

## Visao geral do projeto

Focadu e uma plataforma pessoal de estudo gamificada e multi-curso. O curso piloto e
"Web Security", com um unico usuario-teste nesta fase (o proprio Falves). A plataforma forca
compreensao real de fundamentos (nao resposta facil de IA) atraves de sessoes diarias com
multiplas etapas, avaliacao por voz, sistema de pontuacao/reforco adaptativo, e atividades
variadas (quiz, ligar-palavras, cloze test, roleplay).

O projeto e construido do zero, em fases, cada uma via um prompt tecnico colado no Claude Code.
Desde a Fase 2, o repositorio e um **monorepo**: um unico repositorio Git guardando o backend
.NET, o futuro frontend e o futuro servico de WhatsApp - decisao tomada porque e um projeto solo
com multiplas stacks, e manter repositorios separados so adicionaria complexidade sem beneficio
real neste estagio.

## Estrutura do monorepo

```
focadu/                    <- raiz do repositorio Git
├── docs/                  <- documentacao do projeto inteiro (nao so do backend)
├── backend/                <- tudo que e .NET
│   ├── Focadu.slnx
│   ├── docker-compose.yml
│   ├── src/
│   └── tests/
├── frontend/               <- Vite + React + TypeScript + React Router + Tailwind (Fase 3)
│   └── src/
└── whatsapp-service/        <- servico Node isolado de notificacao, fase futura
    └── README.md             (placeholder ate la)
```

`docs/` fica na raiz (fora de `backend/`) de proposito: documenta decisoes que atravessam
backend, frontend e whatsapp-service, nao so o codigo .NET.

## Stack e ferramentas

- **Backend**: .NET 10, C# puro no dominio, PostgreSQL + EF Core (Code-First Migrations,
  provider Npgsql), xUnit, ASP.NET Core Web API (minimal APIs). Solucao no formato `.slnx`
  (`backend/Focadu.slnx`).
- **Frontend** (Fase 3): Vite + React 19 + TypeScript + React Router 7 + Tailwind CSS v4
  (CSS-first, tokens em `@theme`). Client HTTP tipado com fetch nativo, sem lib extra.
- **WhatsApp Service** (fase futura, ainda nao implementado): servico Node isolado.

## Arquitetura do backend: Hexagonal (Ports & Adapters) + DDD

```
Focadu.Domain          <- entidades, value objects, regras de negocio, interfaces de
                           repositorio (ports). ZERO dependencia de EF Core ou qualquer
                           biblioteca de infraestrutura - C# puro.
Focadu.Application      <- casos de uso, DTOs, interfaces de servicos externos (ports:
                           IContentEvaluationService, IAudioTranscriptionService, IClock),
                           excecoes de aplicacao (NotFoundException, ConflictException,
                           ValidationException). So depende de Focadu.Domain.
Focadu.Infrastructure   <- adapters concretos: DbContext do EF Core, IEntityTypeConfiguration
                           por entidade, repositorios Postgres, UnitOfWork, SystemClock.
                           Depende de Focadu.Domain e Focadu.Application.
Focadu.Api              <- composicao (DI) + endpoints HTTP reais, validacao de request,
                           tratamento de erro padronizado. Depende dos tres acima.
Focadu.Tests            <- testes unitarios de dominio (xUnit). Depende de Domain e Application.
```

Regra de dependencia (sentido unico, nunca invertido): `Api -> Infrastructure -> Application ->
Domain`, e `Api -> Application -> Domain` diretamente tambem. `Domain` nunca aponta para fora de
si mesmo.

### Estrutura de pastas do backend (dentro de `backend/`)

```
Focadu.slnx
docker-compose.yml
src/
  Focadu.Domain/
    Common/Entity.cs               <- classe base: Id (Guid) gerado no proprio dominio
    Exceptions/DomainException.cs  <- carrega um Code (string) de erro, ver secao de API abaixo
    Policies/EvaluationPolicy.cs   <- as 3 constantes de negocio centralizadas
    Enums/                          <- CourseStatus, DailyStatus, DailyAccessMode, ActivityType,
                                       ActivityStatus, AnswerMode, TerminalQuality,
                                       CuratedContentType, WeeklyProjectStatus
    Courses/Course.cs
    Monthlies/Monthly.cs
    Weeklies/Weekly.cs              <- aggregate root "operacional" (ver secao de regras)
    Weeklies/WeeklyProject.cs
    Weeklies/WeeklyReinforcement.cs (+ WeakDailyLink interno, so para mapeamento EF)
    Dailies/Daily.cs
    Activities/DailyActivity.cs
    Activities/ActivityResponse.cs
    Activities/QuizOption.cs
    Activities/RoleplayNode.cs
    Activities/RoleplayOption.cs
    Content/CuratedContent.cs
    Repositories/                   <- ICourseRepository, IMonthlyRepository, IWeeklyRepository,
                                       IUnitOfWork (ports)
  Focadu.Application/
    AssemblyInfo.cs                 <- InternalsVisibleTo("Focadu.Tests"), desde a Fase 3 - permite
                                       testar direto membros internal (DailyStateMapper.ToDto,
                                       SubmitActivityResponseUseCase.ResolveScore) sem precisar de
                                       fakes de repositorio
    Ports/                          <- IClock, IContentEvaluationService (stub, sem impl),
                                       IAudioTranscriptionService (stub, sem impl)
    Exceptions/                     <- NotFoundException, ConflictException, ValidationException
    Shared/                         <- DTOs reaproveitados entre modulos (ex: sessoes de reforco,
                                       CuratedContentDto)
    Courses/                        <- ListCoursesUseCase, GetCourseDetailUseCase, Dtos.cs
    Weeklies/                       <- GetWeeklyDetailUseCase, Dtos.cs
    Content/                         <- CreateCuratedContentUseCase, UpdateCuratedContentUseCase (Fase 4)
    Dailies/                        <- GetDailyStateUseCase, GetTodayUseCase,
                                       StartOrResumeDailyUseCase, SubmitActivityResponseUseCase
                                       (+ ResolveScore, cobre os 4 ActivityType desde a Fase 4 -
                                       ver "Score no servidor" abaixo), CompleteDailyUseCase
                                       (retorna CompleteDailyResult), DailyStateMapper.cs
                                       (interno, compartilhado pelos casos de uso acima), Dtos.cs
    Seed/                            <- SeedWebSecurityCourseUseCase, ver secao de Seed
    DependencyInjection.cs
  Focadu.Infrastructure/
    Persistence/
      FocaduDbContext.cs
      FocaduDbContextFactory.cs    <- design-time factory p/ `dotnet ef migrations`
      Configurations/               <- 1 IEntityTypeConfiguration por entidade (12 arquivos)
      Repositories/                 <- CourseRepository, MonthlyRepository, WeeklyRepository
      UnitOfWork.cs
      Migrations/                   <- InitialCreate (Fase 1), AddPromptToDailyActivity (Fase 3),
                                       Fase4SchemaChanges (Daily.ReinforcementDailyId,
                                       ActivityResponse.Justification)
    Services/SystemClock.cs         <- implementacao real de IClock (hora local)
    DependencyInjection.cs
  Focadu.Api/
    Program.cs                      <- composicao de DI + 10 endpoints reais (ver secao abaixo)
    ErrorHandling/                  <- ApiExceptionHandler (IExceptionHandler), ErrorResponse
    Contracts/                      <- RouteParsing (parse de Guid com erro padronizado),
                                       SubmitActivityResponseRequest, CuratedContentRequests (Fase 4)
    appsettings.json                <- connection string default do Postgres local
tests/
  Focadu.Tests/
    Dailies/DailyTests.cs
    Weeklies/WeeklyTests.cs
    Policies/EvaluationPolicyTests.cs
    Domain/DomainExceptionCodeTests.cs  <- trava os Code usados pela Api (ver abaixo)
    Dailies/SubmitActivityResponseScoreTests.cs  <- ResolveScore, cobre os 4 ActivityType (Fase 4)
    Dailies/DailyStateMapperTests.cs             <- gabarito escondido/revelado (Fase 3)
    TestHelpers/DailyFixtures.cs
```

## Modelo de dominio

Hierarquia principal (cada nivel referencia o pai por Id escalar - Guid -, sem navegacao de
volta; navegacao e sempre pai -> filhos):

```
Course (Draft/Active/Archived)
└── Monthly (Number, Title)
    └── Weekly (Number, Title, Theme)
        ├── Daily (DayNumber, Date, Status, IsReinforcement, PenaltyPoints, ReinforcementDailyId?)
        │   └── DailyActivity (Type, OrderIndex, AnswerMode, Prompt?, ContentId?, ExpectedAnswer?)
        │       ├── ActivityResponse (AttemptNumber, Score, Passed, Transcript?, Justification?, AiFeedback?)
        │       ├── QuizOption (Text, IsCorrect)                  [Quiz e WordMatch]
        │       └── RoleplayNode (NodeKey, Text, IsTerminal, TerminalQuality?)  [Roleplay]
        │           └── RoleplayOption (Text, NextNodeId?)
        ├── CuratedContent (Type, Title, ExternalUrl?, BodyText?)
        ├── WeeklyProject (SpecText, Status, SubmissionUrl?)       [1:1 com Weekly]
        └── WeeklyReinforcement (TriggeredAt, WeakDailyIds)
```

`Weekly` e o **aggregate root operacional**: e ele quem concentra as regras de negocio que
precisam comparar Dailies entre si (acesso a Daily passada/futura, reforco diario, reforco
semanal), porque e o unico nivel que enxerga todas as Dailies da semana ao mesmo tempo. Por isso
`IWeeklyRepository` sempre carrega o grafo completo (Dailies, DailyActivities,
ActivityResponses, QuizOptions, RoleplayNodes/Options, CuratedContents, WeeklyProject,
WeeklyReinforcements) - ver `WeeklyRepository.FullGraph()`. Desde a Fase 2, o repositorio tambem
tem `GetByDateAsync(courseId, date)`, que resolve direto a Weekly (com grafo completo) que
contem uma Daily datada em `date` dentro daquele curso - usado pelo atalho "/hoje" da Api.

`Course` e `Monthly` sao aggregates mais simples, com repositorio proprio
(`ICourseRepository`, `IMonthlyRepository`), usados principalmente para navegacao/gestao de
conteudo, nao para as regras de acesso/reforco do dia a dia.

**`DailyActivity.Prompt` (Fase 3):** enunciado/pergunta da propria atividade (pergunta do Quiz,
termo do WordMatch, contexto do Cloze/Roleplay) - sempre visivel ao cliente (nunca redigido, e o
que o usuario precisa ler pra responder). Faltava na Fase 1: so existiam `QuizOption` (as opcoes)
e `ExpectedAnswer` (gabarito do Cloze), sem nenhum campo pra guardar o texto da pergunta em si.
Descoberto ao escrever o seed de conteudo real da Fase 3 e confirmado com o Falves antes de mexer
no schema - ver `docs/fase-3/resumo-implementacao-fase-3.md`.

**WordMatch: 1 termo = 1 `DailyActivity`, nao 1 atividade com varios pares (Fase 4, confirmado com
o Falves).** `Prompt` e o termo, `QuizOptions` sao as definicoes candidatas (exatamente 1
correta) - o mesmo mecanismo de Quiz, so reaproveitado. Varias `DailyActivity` WordMatch na mesma
`Daily` formam, juntas (do ponto de vista do frontend), um unico exercicio de associacao - mas
cada uma continua sendo uma atividade independente pro dominio (penalidade, historico de
respostas, etc). O schema nao suporta "N pares simultaneos numa unica atividade" - essa foi a
alternativa descartada, ver `docs/fase-4/resumo-implementacao-fase-4.md`.

**`Daily.ReinforcementDailyId` (Fase 4):** Guid? preenchido junto com `ReinforcementTriggered`
(`Weekly.CreateDailyReinforcement` grava o Id da Daily de reforco recem-criada na Daily de
origem). Antes da Fase 4, `ReinforcementTriggered` virava `true` mas nao havia como descobrir
*qual* Daily foi gerada a partir dela sem heuristica - agora e um link direto.

**`ActivityResponse.Justification` (Fase 4):** texto livre opcional, pedido no Cloze/FreeText
antes de revelar se a resposta esta certa - so armazenado, sem avaliacao de IA. Distinto de
`Transcript` (que carrega a resposta em si, seja ela transcrita de voz ou digitada) e de
`AiFeedback` (feedback vindo de uma avaliacao de IA sobre a resposta - ainda sem uso real).

## Regras de negocio centralizadas

Todas as constantes de negocio ficam em `Focadu.Domain.Policies.EvaluationPolicy` - unico lugar
a mudar se esses numeros precisarem ajustar no futuro:

| Constante | Valor | Significado |
|---|---|---|
| `PassingScore` | 80 | Score minimo (0-100) para uma `ActivityResponse` ser `Passed`. |
| `DailyPenaltyThreshold` | 3 | Pontos de penalidade em uma `Daily` que disparam a criacao de uma Daily de reforco. |
| `WeeklyWeakDaysThreshold` | 2 | "Dias fracos" na mesma `Weekly` que disparam um `WeeklyReinforcement`. |

### Ciclo de vida de uma Daily

- `Daily.Start()` muda `Locked`/`Available` -> `InProgress` (idempotente se ja `InProgress`).
  Nao checa data - quem checa "hoje" e sempre `Weekly` (ver abaixo), nunca a `Daily` sozinha.
- `Daily.SubmitActivityResponse(...)` registra uma nova `ActivityResponse` (nunca sobrescreve
  tentativas anteriores - `AttemptNumber` incrementa por atividade). **Antes** da primeira
  conclusao da Daily (`CompletedAt == null`), toda resposta reprovada incrementa
  `PenaltyPoints`. **Depois** da primeira conclusao, qualquer nova submissao e modo replay: fica
  no historico, mas nunca mexe em `PenaltyPoints` nem dispara reforco de novo.
- `Daily.Complete()`: primeira vez, seta `Status = Completed` e `CompletedAt`. Chamadas
  seguintes (replay) sao um no-op com hooks (`OnFirstCompleted` / `OnReplayCompleted`)
  propositalmente vazios, deixados para uma futura logica de recompensa/streak (fora de escopo
  ate agora).
- `Daily.ShouldTriggerDailyReinforcement()`: `true` quando, ainda na primeira rodada
  (`!HasEverCompleted`), `PenaltyPoints >= DailyPenaltyThreshold` e o reforco ainda nao foi
  disparado para essa Daily (`!ReinforcementTriggered`).

**Decisao de produto confirmada na Fase 2**: `Locked` e um status **conceitual** para Dailies
futuras - nao existe nenhum job/scheduler/cron que transiciona o status por horario. O
desbloqueio e inteiramente baseado em data: `Weekly.EvaluateDailyAccess` (abaixo) compara
`Daily.Date` com "hoje" (`IClock.Today()`) toda vez que o acesso e avaliado, e essa comparacao
por si so ja decide o que e permitido. Nenhum processo em background precisa "virar" o Status de
`Locked` para `Available` em nenhum horario - o valor `DailyStatus.Locked` so importa como ponto
de partida indiferenciado de `Available` (ambos aceitam `Daily.Start()` igualmente).

### Acesso a uma Daily (`Weekly.EvaluateDailyAccess`)

Dado "hoje" (`IClock.Today()`), retorna um `DailyAccessMode`:

- **Daily futura** (`Date > hoje`): sempre lanca `DomainException` (`Code = "daily_futura"`) -
  nunca acessivel.
- **Daily de hoje, ja concluida**: `Replay` - repeticao livre, sem limite, sem penalidade nova.
- **Daily de hoje, `InProgress`**: `Resume`.
- **Daily de hoje, ainda nao iniciada**: `Start`, **exceto** se ja existir outra Daily
  `InProgress` hoje (lanca `DomainException`, `Code = "daily_em_andamento"`).
- **Daily de dia anterior**: `ReadOnly` por padrao (resumo/gabarito, nunca reaberta para
  edicao), **exceto** `Replay` quando (a) nao ha nenhuma Daily `InProgress` no momento em
  lugar nenhum, e (b) a Daily alvo ja foi concluida ao menos uma vez.

### Reforco diario e semanal

Quando uma Daily atinge o limiar de penalidade, `Weekly.CreateDailyReinforcement` cria uma nova
`Daily` (`IsReinforcement = true`, vinculada a mesma `Weekly`), copiando apenas as
`DailyActivity` que tiveram ao menos uma resposta reprovada na Daily de origem. "Dia fraco" =
`Daily.IsWeakDay` (`PenaltyPoints >= DailyPenaltyThreshold`). Ao acumular
`WeeklyWeakDaysThreshold` dias fracos ainda nao cobertos por um `WeeklyReinforcement` anterior,
`Weekly.TriggerWeeklyReinforcement` cria o registro correspondente.

## Superficie da API (Focadu.Api)

Desde a Fase 2, `Focadu.Api` tem endpoints REST reais (nao mais so os 4 minimos de prova de
composicao da Fase 1). Todos sob `/api`, alem de `GET /health`:

| Metodo | Rota | Caso de uso | Sucesso |
|---|---|---|---|
| GET | `/api/courses` | `ListCoursesUseCase` | 200 |
| GET | `/api/courses/{courseId}` | `GetCourseDetailUseCase` | 200, 404 se nao existe |
| GET | `/api/weeklies/{weeklyId}` | `GetWeeklyDetailUseCase` | 200, 404 se nao existe |
| GET | `/api/dailies/{dailyId}` | `GetDailyStateUseCase` | 200, 404/400/409 (ver abaixo) |
| GET | `/api/today` | `GetTodayUseCase` | 200, 404/409 (ver abaixo) |
| POST | `/api/dailies/{dailyId}/start` | `StartOrResumeDailyUseCase` | 200 |
| POST | `/api/dailies/{dailyId}/activities/{activityId}/responses` | `SubmitActivityResponseUseCase` | 201 (cria uma nova `ActivityResponse`) |
| POST | `/api/dailies/{dailyId}/complete` | `CompleteDailyUseCase` | 200 (`CompleteDailyResult`, ver abaixo) |
| POST | `/api/curated-content` | `CreateCuratedContentUseCase` (Fase 4) | 201, 400/404 |
| PUT | `/api/curated-content/{id}` | `UpdateCuratedContentUseCase` (Fase 4) | 200, 400/404 |

As rotas da Api sao caminhos REST simples (`/api/weeklies/{weeklyId}`), **nao** um espelho das
rotas do frontend (`/start?course=&weekly=`) - o frontend usa query string no seu proprio router
para navegacao; a Api so precisa entregar o dado que cada tela pede, os formatos nao precisam
coincidir.

### GET /api/dailies/{dailyId} e GET /api/today retornam o mesmo shape (`DailyStateDto`)

Os dois usam `Weekly.EvaluateDailyAccess` internamente e devolvem o **mesmo formato**
(`DailyStateDto`, com a lista completa de `Activities`) tanto para a Daily ativa quanto para uma
Daily passada - quem diferencia "tela de estudo imersiva" de "resumo/gabarito" e o campo
`AccessMode` no corpo da resposta (`Start`/`Resume`/`Replay` = editavel; `ReadOnly` = so
consulta), nao um shape de resposta diferente. Isso vale tambem para a resposta de
`POST .../start` - ela retorna `DailyStateDto` direto, para o cliente sempre ter o estado
atualizado sem precisar de uma segunda chamada. `POST .../complete` retorna um shape diferente
(`CompleteDailyResult`, ver abaixo) porque, alem do estado da Daily, precisa reportar reforco.

`DailyActivityDto` expoe `Prompt` (enunciado) sempre, sem redacao - e o que o usuario precisa ler
pra responder. Ja `QuizOptions[].IsCorrect`, `ExpectedAnswer` e `RoleplayNodes[].TerminalQuality`
(o gabarito propriamente dito) **so aparecem depois que a atividade tem ao menos uma
`ActivityResponse` registrada** (Fase 3) - antes disso vem `null`. O gate e um unico booleano em
`DailyStateMapper.ToActivityDto` (`hasAnswered = activity.Responses.Count > 0`), aplicado aos tres
campos. Isso fecha a lacuna identificada na Fase 2 (gabarito visivel no DevTools antes de
responder).

### GET /api/today assume exatamente um Course com Status = Active

Como o dominio ainda nao tem conceito de usuario/curso "atual" (fora de escopo confirmado de
novo nesta fase - nenhuma entidade recebe `UserId`), o atalho "/hoje" resolve via
`ICourseRepository.GetAllAsync()` filtrado por `Status == Active`: zero cursos ativos vira 404
(`nenhum_curso_ativo`), mais de um vira 409 (`multiplos_cursos_ativos`, com a mensagem sugerindo
usar `/api/courses/{courseId}` para desambiguar). Isso e seguro para o cenario atual (um so
curso piloto, "Web Security"), mas para de funcionar sozinho se o produto crescer para varios
cursos ativos ao mesmo tempo sem um conceito de usuario - ver pontos abertos da Fase 2.

### Score no servidor para todo tipo de atividade (Fase 3 + Fase 4)

`POST .../responses` **nao tem mais campo `Score`** - desde a Fase 4, o Score de qualquer tipo de
atividade e sempre calculado dentro de `SubmitActivityResponseUseCase.ResolveScore`, nunca aceito
pronto do cliente (fecha de vez a lacuna que a Fase 3 tinha deixado aberta so pra Cloze/Roleplay,
que na epoca ainda recebiam `Score` do chamador):

| Tipo | Campo do request | Como o Score e calculado |
|---|---|---|
| `Quiz` / `WordMatch` | `SelectedOptionId` | 100 se a opcao existe nessa atividade e `IsCorrect = true`, senao 0 |
| `Cloze` + `AnswerMode.MultipleChoice` | `SelectedOptionId` | Mesmo mecanismo de Quiz/WordMatch (reaproveitado) |
| `Cloze` + `AnswerMode.FreeText` | `Transcript` | 100 se `Transcript.Trim()` bate com `ExpectedAnswer.Trim()` (case-insensitive), senao 0 - **ponytail**: comparacao textual simples, sem IA; upgrade natural e `IContentEvaluationService` |
| `Roleplay` | `SelectedRoleplayNodeId` | A partir do `TerminalQuality` do node terminal alcancado (ver tabela abaixo) - o node precisa ter `IsTerminal = true` |

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
| `selected_option_id_obrigatorio` | Quiz/WordMatch/Cloze(MultipleChoice) sem `SelectedOptionId` no corpo |
| `selected_option_id_invalido` | `SelectedOptionId` nao corresponde a uma `QuizOption` desta atividade |
| `transcript_obrigatorio` | Cloze(FreeText) sem `Transcript` no corpo |
| `selected_roleplay_node_id_obrigatorio` | Roleplay sem `SelectedRoleplayNodeId` no corpo |
| `selected_roleplay_node_id_invalido` | `SelectedRoleplayNodeId` nao corresponde a um `RoleplayNode` desta atividade |
| `selected_roleplay_node_nao_terminal` | `SelectedRoleplayNodeId` aponta pra um node com `IsTerminal = false` |

### Conclusao da Daily (`POST .../complete`) e reforco (Fase 4)

O reforco (diario e/ou semanal), quando existe, **ja foi disparado antes** - durante alguma
`SubmitActivityResponse` anterior (`Daily.ShouldTriggerDailyReinforcement()`/
`Weekly.ShouldTriggerWeeklyReinforcement()` sao avaliados resposta a resposta, nao no momento da
conclusao). `CompleteDailyUseCase` so reporta o estado ja existente:

```
CompleteDailyResult(
  Daily: DailyStateDto,
  DailyReinforcementTriggered: bool,     <- Daily.ReinforcementTriggered
  ReinforcementDailyId: Guid?,            <- Daily.ReinforcementDailyId
  WeeklyReinforcementTriggered: bool,     <- existe algum WeeklyReinforcement cobrindo esta Daily
  WeeklyReinforcementId: Guid?)
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
ASP.NET Core, registrado globalmente via `app.UseExceptionHandler()`), que reconhece 4 tipos de
excecao:

| Tipo | Onde vive | Status HTTP |
|---|---|---|
| `Focadu.Domain.Exceptions.DomainException` | Domain | Depende do `Code` (tabela abaixo); default 400 |
| `Focadu.Application.Exceptions.NotFoundException` | Application | Sempre 404 |
| `Focadu.Application.Exceptions.ConflictException` | Application | Sempre 409 |
| `Focadu.Application.Exceptions.ValidationException` | Application (lancada pela Api antes do caso de uso) | Sempre 400 |
| Qualquer outra excecao | - | 500, `Code = "erro_interno"`, logada via `ILogger` |

`DomainException` carrega um `Code` (string, snake_case) alem da `Message`, exatamente para a
Api conseguir decidir o status HTTP sem depender do texto da mensagem (que pode mudar de
redacao). Codigos de `DomainException` mapeados explicitamente para um status diferente do
default (400):

| Code | Status | Disparado por |
|---|---|---|
| `daily_futura` | 400 | `Weekly.EvaluateDailyAccess` numa Daily com `Date > hoje` |
| `daily_em_andamento` | 409 | `Weekly.EvaluateDailyAccess` quando outra Daily ja esta `InProgress` hoje |
| `daily_somente_leitura` | 409 | `Weekly.StartOrResumeDaily` numa Daily `ReadOnly` |
| `daily_ja_concluida` | 409 | `Daily.Start()` numa Daily ja `Completed` |
| `daily_nao_iniciada` | 409 | `Daily.SubmitActivityResponse` antes de `Start()` |
| `daily_nao_em_andamento` | 409 | `Daily.Complete()` fora de `InProgress` |
| `daily_nao_encontrada` | 404 | Daily/DailyId nao encontrado dentro da Weekly |
| `atividade_nao_encontrada` | 404 | `activityId` nao encontrado dentro da Daily |
| `reforco_semanal_condicoes_nao_atingidas` | 409 | guarda defensiva, nao alcancada pela Api hoje |
| `reforco_diario_condicoes_nao_atingidas` | 409 | guarda defensiva, nao alcancada pela Api hoje |

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
- Corpo de request malformado (JSON invalido) ainda pode gerar uma resposta de erro fora do
  formato padrao da Api, por vir do model binding do ASP.NET Core antes do endpoint rodar - ver
  pontos abertos da Fase 2.

### Autoria de conteudo curado (Fase 4)

`POST /api/curated-content` e `PUT /api/curated-content/{id}` sao os **unicos** endpoints de
autoria de conteudo da Api - Course/Monthly/Weekly/Daily/DailyActivity continuam so via seed (ver
"Fora de escopo"), porque a estrutura muda com pouca frequencia; o que muda toda semana e o
conteudo curado (leituras/videos/diagramas) em si.

- `POST`: corpo `{ weeklyId, type, title, externalUrl?, bodyText? }` - `type` e string
  (`"Reading"/"Video"/"Diagram"`, case-insensitive), mais legivel pra curadoria manual do que o
  numero que a Api usa nas respostas de leitura. `weeklyId`/`title` sao validados em `Program.cs`
  (formato de request, incondicional); `type` invalido e falta de `externalUrl`/`bodyText` sao
  validados dentro do caso de uso (`CreateCuratedContentUseCase`), porque dependem de logica de
  dominio/enum.
- `PUT`: corpo `{ title, externalUrl?, bodyText? }` - `Type`/`WeeklyId` nunca aparecem (nunca
  mudam depois de criado). Busca o `CuratedContent` direto por Id
  (`IWeeklyRepository.GetCuratedContentByIdAsync`, sem carregar o grafo completo da Weekly) e
  chama `CuratedContent.Update(...)`.
- Codes: `weekly_id_obrigatorio`, `titulo_obrigatorio` (400, `Program.cs`), `tipo_invalido`,
  `conteudo_obrigatorio` (400, caso de uso), `semana_nao_encontrada`, `conteudo_nao_encontrado`
  (404).
- Usado na pratica pra carregar o texto completo das 4 leituras da Semana 1 por cima dos
  placeholders do seed - ver `docs/fase-4/resumo-implementacao-fase-4.md`.

### CORS (Fase 3)

A Api libera `http://localhost:5173` (e `127.0.0.1:5173`) via `AddCors`/`UseCors`, para o
frontend Vite conseguir chamar a Api em dev - sem isso o navegador bloqueia toda chamada (portas
diferentes contam como origens diferentes, mesmo os dois em `localhost`). Hardcoded e so-dev de
proposito (unico usuario-teste, sem ambiente de deploy ainda) - ver pontos abertos.

## Seed de conteudo (Fase 3, estendido na Fase 4)

Course/Monthly/Weekly/Daily/DailyActivity nao tem endpoint de autoria (ver "Fora de escopo"),
entao o unico jeito de popular essa estrutura e via `SeedWebSecurityCourseUseCase`
(`Focadu.Application.Seed`) - idempotente por nome de Course ("Web Security"), monta o grafo
inteiro em memoria via API publica do dominio e persiste com uma unica chamada a
`ICourseRepository.AddAsync` + `IUnitOfWork.SaveChangesAsync` (o `Add` do EF Core cascateia o
grafo inteiro automaticamente, sem precisar de `IMonthlyRepository`/`IWeeklyRepository`
separados). `CuratedContent` em si tambem pode ser criado/editado via Api (ver "Autoria de
conteudo curado" acima) - o seed so garante que exista *algo* pra começar.

Popula a Semana 1 completa do curso "Web Security": 4 Dailies, CuratedContent por dia (texto
completo das 4 leituras carregado via `PUT /api/curated-content/{id}` - Fase 4, nao faz parte do
seed em si), e pelo menos 1 `DailyActivity` de cada tipo distribuida pelos 4 dias - Quiz (todos os
dias), WordMatch (2 termos, Dia 2), Cloze/MultipleChoice + Cloze/FreeText (Dia 3), Roleplay (3
niveis, Dia 4) - alem do `WeeklyProject`. Conteudo completo em
`docs/fase-3/resumo-implementacao-fase-3.md` e `docs/fase-4/resumo-implementacao-fase-4.md`.

Acionado via `dotnet run --project src/Focadu.Api -- seed` (checagem de `args` em `Program.cs`,
antes de `app.Run()` - roda e encerra, sem subir o servidor HTTP).

## Persistencia (EF Core + Postgres)

Tres migrations ate agora: `InitialCreate` (Fase 1), `AddPromptToDailyActivity` (Fase 3, coluna
nova `DailyActivities.Prompt`, nullable), e `Fase4SchemaChanges` (`Dailies.ReinforcementDailyId` -
Guid?, FK auto-relacionada com `SetNull` - e `ActivityResponses.Justification` - text, nullable).
Decisoes de design confirmadas na Fase 1 continuam
valendo integralmente (Guid como Id, tabela associativa real para
`WeeklyReinforcement.WeakDailyIds`, enums como `string`, etc.) - ver
`docs/fase-1/resumo-implementacao-fase-1.md` para o raciocinio completo de cada uma.

**Schema validado contra Postgres real pela primeira vez na Fase 3** (Docker disponivel nesta
sessao, diferente das Fases 1 e 2) - as duas migrations aplicam sem erro, e o fluxo completo
(seed, leitura, e responder uma atividade) foi exercitado de ponta a ponta via `curl` e via
navegador. Isso revelou um bug pre-existente:

**Bug de concorrencia do EF Core, corrigido na Fase 3.** Toda `Entity` gera seu proprio `Id`
(`Guid.NewGuid()`) no construtor, nunca o banco - mas nenhuma configuracao dizia isso ao EF Core
explicitamente. A convencao padrao do EF Core para chave Guid e `ValueGeneratedOnAdd`, e o change
tracker, ao descobrir uma entidade nova dentro de um grafo **ja rastreado** (carregado via query -
exatamente o que acontece em `SubmitActivityResponseUseCase`, que adiciona uma `ActivityResponse`
nova a uma `DailyActivity` ja carregada do banco), concluia erroneamente "ja tem Id, entao ja
existe" e emitia `UPDATE` em vez de `INSERT` - o `UPDATE` nao afetava nenhuma linha e virava
`DbUpdateConcurrencyException`. So aparece contra banco real (nunca em teste unitario de dominio
puro), e so em fluxos que adicionam uma entidade filha a um grafo ja tracked - por isso nunca
tinha aparecido: nenhum fluxo de escrita real tinha sido exercitado contra Postgres ate a Fase 3.
Corrigido uma unica vez, centralizado em `FocaduDbContext.OnModelCreating`
(`idProperty.ValueGenerated = ValueGenerated.Never` pra toda entidade) - sem migration nova, e so
metadado do EF Core, nao muda schema.

## Como rodar localmente

```bash
cd backend
docker compose up -d                                    # sobe Postgres em localhost:5432
dotnet ef database update -p src/Focadu.Infrastructure --startup-project src/Focadu.Infrastructure  # aplica as migrations
dotnet build Focadu.slnx                                # build de toda a solucao
dotnet test tests/Focadu.Tests/Focadu.Tests.csproj      # roda os testes de dominio
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

## Frontend (Fase 3, telas de atividade completadas na Fase 4)

```
frontend/
  index.html, vite.config.ts, package.json, tsconfig*.json
  .env.example, .env.local (gitignorado - VITE_API_BASE_URL)
  src/
    main.tsx              <- BrowserRouter + Routes
    App.tsx                <- shell com nav (Hoje / Inicio) + <Outlet/>
    index.css               <- @import "tailwindcss" + tokens @theme (paleta da identidade visual)
    api/
      types.ts               <- espelha os DTOs de Focadu.Application (enums como numero, com
                                   consts tipo ActivityType/AnswerMode/ActivityStatus/TerminalQuality)
      client.ts               <- fetch tipado, ApiError, VITE_API_BASE_URL
      useApiResource.ts        <- hook pra loading/error/cancelamento (usado pelas 4 sub-telas de /start)
    routes/
      TodayPage.tsx            <- /hoje (orquestra os 4 tipos de atividade + fluxo de conclusao)
      StartPage.tsx             <- /start (ramifica por query string)
    components/
      OptionsAnswer.tsx          <- nucleo "escolher opcao" - Quiz, cada termo de WordMatch, Cloze/MultipleChoice
      ClozeFreeTextActivity.tsx   <- Cloze/FreeText (resposta + justificativa)
      RoleplayActivity.tsx        <- navega o grafo de RoleplayNode client-side
      CompletionSummary.tsx       <- pos POST .../complete (reforco diario/semanal, se houver)
      Layout.tsx                  <- PageShell, Centered, ActivityScreen (shells compartilhados)
```

Roteamento exatamente como documentado (nao espelha as rotas REST da Api, que sao um recurso
diferente - ver "Rotas da Api nao espelham as rotas do frontend" na Fase 2):

| Rota | Consome | Tela |
|---|---|---|
| `/hoje` | `GET /api/today` | Daily ativa de hoje - **os 4 tipos de atividade implementados de ponta a ponta** |
| `/hoje?daily=` | `GET /api/dailies/{dailyId}` | Mesma tela de `/hoje`, mas pra uma Daily especifica (Fase 4 - deep-link pra sessao de reforco) |
| `/start` | `GET /api/courses` | Lista de cursos |
| `/start?course=` | `GET /api/courses/{courseId}` | Detalhe do curso |
| `/start?course=&weekly=` | `GET /api/weeklies/{weeklyId}` | Detalhe da semana |
| `/start?course=&weekly=&daily=` | `GET /api/dailies/{dailyId}` | Estado de uma Daily especifica (somente leitura) |

`TodayPage` (`/hoje`) chama `GET /api/today` (ou `GET /api/dailies/{id}` se `?daily=` estiver
presente) e, se `AccessMode` for `Start`/`Resume`, chama `POST .../start` antes de renderizar (a
Daily precisa estar `InProgress` pra aceitar respostas - `daily_nao_iniciada` senao).

**Maquina de passo (`Step`) - por que existe (Fase 4):** `TodayPage` nao re-deriva "o que
mostrar" a cada resposta recebida - ela mantem um `Step` "pinado" (`{kind:'activity', activityId}`
| `{kind:'wordMatchGroup'}` | `{kind:'done'}'}`) que so muda quando o usuario clica "Continuar".
Sem isso, a ultima atividade da sessao (ou o ultimo termo de um WordMatch) tinha o proprio reveal
engolido - assim que a resposta era enviada e os dados atualizavam, o componente pai ja trocava de
tela antes do usuario conseguir ler "Acertou!"/"Errou" (bug encontrado e corrigido durante a
verificacao ao vivo desta fase). Cada componente de atividade (`OptionsAnswer`,
`ClozeFreeTextActivity`, `RoleplayActivity`) recebe `onDailyRefetched` (atualiza os dados) e
`onContinue` (so chamado quando o usuario decide avancar) como callbacks separados.

**WordMatch, na tela:** todas as `DailyActivity` do tipo WordMatch da Daily sao renderizadas
juntas (uma linha `OptionsAnswer` por termo, cada uma pontuando/revelando de forma independente);
o botao "Continuar" do grupo so aparece quando todos os termos ja tem resposta.

**Roleplay, na tela:** navega o grafo inteiramente no cliente (todos os `RoleplayNode`/
`RoleplayOption` ja vieram no `DailyActivityDto` inicial - nao ha ida-e-volta a cada escolha). O
node com `NodeKey === "start"` e a convencao adotada pro node inicial (nao ha campo `IsStart` no
dominio). So ao selecionar uma opcao que leva a um node com `IsTerminal = true` e que o frontend
chama `POST .../responses` com `SelectedRoleplayNodeId`.

**`/start` continua funcional mas sem o mesmo polimento visual das telas de atividade** - decisao
da Fase 3, ainda valida (so as telas de `/hoje` precisavam estar "as mais validadas no Figma").

Paleta (Tailwind v4, tokens em `@theme` dentro de `index.css`, sem `tailwind.config.js`):
`--color-base` (`#0A0A0A`), `--color-surface` (`#151515`), `--color-surface-alt` (`#1E1E1E`),
`--color-accent` (`#39FF6A`), `--color-alert` (`#FF3B3B`), `--color-primary`/`secondary`/`muted`
(`#F5F5F5`/`#9A9A9A`/`#5C5C5C`).

## Fora de escopo ate agora

- Tela de resumo falado/microfone, menu de configuracoes, captura de voz real no frontend.
- Servico de WhatsApp (`whatsapp-service/` e so placeholder).
- Autenticacao/autorizacao real (usuario fixo/hardcoded, unico usuario-teste) - **reconfirmado
  na Fase 2**: nenhuma entidade recebe `UserId`.
- Captura, upload e transcricao de voz.
- Integracao com GitHub (Octokit.NET) e exigencia de publicacao publica (LinkedIn/GitHub).
- Geracao de conteudo/avaliacao via IA (Groq) - **reconfirmado na Fase 4**: Cloze/FreeText usa
  comparacao textual simples, Roleplay usa mapeamento fixo de `TerminalQuality` (ver "Score no
  servidor") - nenhum dos dois e avaliacao inteligente de verdade. So os ports
  (`IContentEvaluationService`, `IAudioTranscriptionService`) existem, sem adapter concreto nem
  registro no DI.
- Sistema de Gems/Marketplace/Ranking/Cosmeticos/Arcade/UGC.
- Endpoints de autoria de Course/Monthly/Weekly/Daily/DailyActivity - so `CuratedContent` tem
  autoria via Api desde a Fase 4 (ver "Autoria de conteudo curado"); o resto da estrutura
  continua so via `SeedWebSecurityCourseUseCase` (estrutural, muda com pouca frequencia).
- Tela de autoria de conteudo curado no frontend - os endpoints existem e foram usados via
  script/curl (Fase 4), mas nao ha UI pra isso ainda.
- CORS liberado so para `http://localhost:5173` (hardcoded, dev apenas).

## Fases concluidas

| Fase | Nome | Resumo |
|---|---|---|
| 1 | Dominio e Schema (Backend .NET) | `docs/fase-1/resumo-implementacao-fase-1.md` |
| 2 | Monorepo Git + API Real (Backend .NET) | `docs/fase-2/resumo-implementacao-fase-2.md` |
| 3 | Correcoes de Api, Seed de Conteudo e Inicio do Frontend | `docs/fase-3/resumo-implementacao-fase-3.md` |
| 4 | Autoria de Conteudo, Conclusao da Daily e Telas Restantes | `docs/fase-4/resumo-implementacao-fase-4.md` |

## O que uma proxima fase provavelmente precisa saber

- O contrato da Api (rotas, DTOs, formato de erro) esta documentado na secao "Superficie da
  API" acima; o client tipado do frontend (`frontend/src/api/`) e o exemplo de referencia de
  como consumi-lo.
- `GET /api/today` e `GET /api/dailies/{dailyId}` retornam o mesmo `DailyStateDto` -
  `AccessMode` e o campo que decide se a tela deve ser editavel ou so leitura.
- `POST .../responses` nao tem mais campo `Score` - todo tipo de atividade calcula o Score no
  servidor (ver "Score no servidor para todo tipo de atividade" acima). Qual campo usar
  (`SelectedOptionId`/`Transcript`/`SelectedRoleplayNodeId`) depende do `ActivityType`/`AnswerMode`.
- Gabarito (`IsCorrect`/`ExpectedAnswer`/`TerminalQuality`) so aparece depois da primeira
  resposta - o frontend precisa re-buscar o estado da Daily apos um submit pra ver o gabarito
  revelado (o resultado do submit em si nao traz as opcoes/nodes atualizados).
- Toda `Entity` precisa de `ValueGenerated.Never` no `Id` pra funcionar corretamente com EF Core
  quando adicionada a um grafo ja tracked (ver "Bug de concorrencia do EF Core", Fase 3) - se uma
  fase futura adicionar uma entidade nova, isso ja esta coberto globalmente em
  `FocaduDbContext.OnModelCreating`, nao precisa reconfigurar por entidade.
- `GET /api/today` assume exatamente um Course `Active`; isso quebra se o produto crescer para
  multiplos cursos ativos sem antes resolver o conceito de usuario/"curso atual". Alem disso,
  pode ficar ambiguo se houver 2+ Dailies com a mesma `Date` na mesma Weekly (`CreateDailyReinforcement`
  usa `IClock.Today()` como data da Daily de reforco, entao isso e possivel) - nao foi um
  problema pratico na Fase 4 porque `reinforcementDailyId` (retornado por `POST .../complete`)
  permite navegar direto pra sessao de reforco sem depender de `/api/today` escolher "o dia
  certo" sozinho, mas a ambiguidade em si continua existindo no caso geral.
- No frontend, qualquer tela que mostre mais de uma "atividade" em sequencia (como `TodayPage`)
  precisa decidir explicitamente *quando* avançar pra proxima, nao só reagir a toda mudança de
  dado - ver "Maquina de passo (Step)" na secao de Frontend. Reagir automaticamente a cada
  atualizacao de estado engole o feedback da ultima resposta.
- **UI de autoria de conteudo curado ainda nao existe** - os endpoints `POST/PUT
  /api/curated-content` (Fase 4) funcionam, mas so foram usados via script/curl ate agora.
- **Resolvido na Fase 3, nao e mais pendencia:** o schema ja foi validado contra um Postgres real
  rodando (Docker disponivel nesta sessao) - ver "Persistencia" acima para o relato completo,
  incluindo o bug de concorrencia do EF Core que essa validacao revelou e corrigiu.
