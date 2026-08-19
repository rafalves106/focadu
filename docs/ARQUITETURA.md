# Arquitetura da Focadu — estado atual

> Documento vivo. Nao e historico de decisoes (isso fica em `docs/fase-N/`) - e sempre um
> retrato do estado atual e consolidado do projeto. Ver `docs/CONVENCOES.md` para a regra de
> como e quando este arquivo e atualizado.
>
> Ultima fase que atualizou este documento: **Fase 3 - Correcoes de Api, Seed de Conteudo e
> Inicio do Frontend**.

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
    Shared/                         <- DTOs reaproveitados entre modulos (ex: sessoes de reforco)
    Courses/                        <- ListCoursesUseCase, GetCourseDetailUseCase, Dtos.cs
    Weeklies/                       <- GetWeeklyDetailUseCase, Dtos.cs
    Dailies/                        <- GetDailyStateUseCase, GetTodayUseCase,
                                       StartOrResumeDailyUseCase, SubmitActivityResponseUseCase
                                       (+ ResolveScore, ver "Score no servidor" abaixo),
                                       CompleteDailyUseCase, DailyStateMapper.cs (interno,
                                       compartilhado pelos casos de uso acima), Dtos.cs
    Seed/                            <- SeedWebSecurityCourseUseCase (Fase 3), ver secao de Seed
    DependencyInjection.cs
  Focadu.Infrastructure/
    Persistence/
      FocaduDbContext.cs
      FocaduDbContextFactory.cs    <- design-time factory p/ `dotnet ef migrations`
      Configurations/               <- 1 IEntityTypeConfiguration por entidade (12 arquivos)
      Repositories/                 <- CourseRepository, MonthlyRepository, WeeklyRepository
      UnitOfWork.cs
      Migrations/                   <- InitialCreate (Fase 1) + AddPromptToDailyActivity (Fase 3)
    Services/SystemClock.cs         <- implementacao real de IClock (hora local)
    DependencyInjection.cs
  Focadu.Api/
    Program.cs                      <- composicao de DI + 8 endpoints reais (ver secao abaixo)
    ErrorHandling/                  <- ApiExceptionHandler (IExceptionHandler), ErrorResponse
    Contracts/                      <- RouteParsing (parse de Guid com erro padronizado),
                                       SubmitActivityResponseRequest
    appsettings.json                <- connection string default do Postgres local
tests/
  Focadu.Tests/
    Dailies/DailyTests.cs
    Weeklies/WeeklyTests.cs
    Policies/EvaluationPolicyTests.cs
    Domain/DomainExceptionCodeTests.cs  <- trava os Code usados pela Api (ver abaixo)
    Dailies/SubmitActivityResponseScoreTests.cs  <- ResolveScore (Fase 3)
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
        ├── Daily (DayNumber, Date, Status, IsReinforcement, PenaltyPoints)
        │   └── DailyActivity (Type, OrderIndex, AnswerMode, Prompt?, ContentId?, ExpectedAnswer?)
        │       ├── ActivityResponse (AttemptNumber, Score, Passed, Transcript?, AiFeedback?)
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
| POST | `/api/dailies/{dailyId}/complete` | `CompleteDailyUseCase` | 200 |

As rotas da Api sao caminhos REST simples (`/api/weeklies/{weeklyId}`), **nao** um espelho das
rotas do frontend (`/start?course=&weekly=`) - o frontend usa query string no seu proprio router
para navegacao; a Api so precisa entregar o dado que cada tela pede, os formatos nao precisam
coincidir.

### GET /api/dailies/{dailyId} e GET /api/today retornam o mesmo shape (`DailyStateDto`)

Os dois usam `Weekly.EvaluateDailyAccess` internamente e devolvem o **mesmo formato**
(`DailyStateDto`, com a lista completa de `Activities`) tanto para a Daily ativa quanto para uma
Daily passada - quem diferencia "tela de estudo imersiva" de "resumo/gabarito" e o campo
`AccessMode` no corpo da resposta (`Start`/`Resume`/`Replay` = editavel; `ReadOnly` = so
consulta), nao um shape de resposta diferente. Isso vale tambem para as respostas de
`POST .../start` e `POST .../complete` - os tres retornam `DailyStateDto`, para o cliente sempre
ter o estado atualizado sem precisar de uma segunda chamada.

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

### Score no servidor para Quiz/WordMatch (Fase 3)

`POST .../responses` recebe `SelectedOptionId` (Guid) para atividades `Quiz`/`WordMatch`, nao mais
`Score` pronto - o `Score` e sempre calculado dentro de `SubmitActivityResponseUseCase.ResolveScore`
(100 se a opcao escolhida existe nessa atividade e `IsCorrect = true`, 0 caso contrario). Qualquer
`Score` que o cliente mande junto e ignorado para esses dois tipos. `Cloze`/`Roleplay` continuam
recebendo `Score` pronto do chamador - comentario explicito no codigo (`ResolveScore`) explicando
que isso e assim porque dependem de `IContentEvaluationService`, ainda sem adapter concreto.

Validacao (`ValidationException`, mesmo envelope padrao de erro):

| Code | Quando |
|---|---|
| `selected_option_id_obrigatorio` | Quiz/WordMatch sem `SelectedOptionId` no corpo |
| `selected_option_id_invalido` | `SelectedOptionId` nao corresponde a uma `QuizOption` desta atividade |
| `score_obrigatorio` | Cloze/Roleplay sem `Score` no corpo |
| `score_invalido` | Cloze/Roleplay com `Score` fora de 0-100 |

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
- `SubmitActivityResponseRequest` tem `SelectedOptionId` (Guid?) e `Score` (int?, legado para
  Cloze/Roleplay) - qual e obrigatorio depende do `ActivityType`, validado dentro do caso de uso
  (ver "Score no servidor" acima), nao mais em `Program.cs`.
- Corpo de request malformado (JSON invalido) ainda pode gerar uma resposta de erro fora do
  formato padrao da Api, por vir do model binding do ASP.NET Core antes do endpoint rodar - ver
  pontos abertos da Fase 2.

### CORS (Fase 3)

A Api libera `http://localhost:5173` (e `127.0.0.1:5173`) via `AddCors`/`UseCors`, para o
frontend Vite conseguir chamar a Api em dev - sem isso o navegador bloqueia toda chamada (portas
diferentes contam como origens diferentes, mesmo os dois em `localhost`). Hardcoded e so-dev de
proposito (unico usuario-teste, sem ambiente de deploy ainda) - ver pontos abertos.

## Seed de conteudo (Fase 3)

Nao ha endpoint de autoria de conteudo na Api (ver "Fora de escopo"), entao o unico jeito de
popular Course/Monthly/Weekly/Daily/DailyActivity/CuratedContent e via
`SeedWebSecurityCourseUseCase` (`Focadu.Application.Seed`) - idempotente por nome de Course
("Web Security"), monta o grafo inteiro em memoria via API publica do dominio e persiste com uma
unica chamada a `ICourseRepository.AddAsync` + `IUnitOfWork.SaveChangesAsync` (o `Add` do EF Core
cascateia o grafo inteiro automaticamente, sem precisar de `IMonthlyRepository`/`IWeeklyRepository`
separados). Popula a Semana 1 completa do curso "Web Security" (4 Dailies, CuratedContent por dia,
1 DailyActivity Quiz por dia, WeeklyProject) - conteudo completo em
`docs/fase-3/resumo-implementacao-fase-3.md`.

Acionado via `dotnet run --project src/Focadu.Api -- seed` (checagem de `args` em `Program.cs`,
antes de `app.Run()` - roda e encerra, sem subir o servidor HTTP).

## Persistencia (EF Core + Postgres)

Duas migrations ate agora: `InitialCreate` (Fase 1) e `AddPromptToDailyActivity` (Fase 3, coluna
nova `DailyActivities.Prompt`, nullable). Decisoes de design confirmadas na Fase 1 continuam
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

## Frontend (Fase 3)

```
frontend/
  index.html, vite.config.ts, package.json, tsconfig*.json
  .env.example, .env.local (gitignorado - VITE_API_BASE_URL)
  src/
    main.tsx              <- BrowserRouter + Routes
    App.tsx                <- shell com nav (Hoje / Inicio) + <Outlet/>
    index.css               <- @import "tailwindcss" + tokens @theme (paleta da identidade visual)
    api/
      types.ts               <- espelha os DTOs de Focadu.Application (enums como numero)
      client.ts               <- fetch tipado, ApiError, VITE_API_BASE_URL
      useApiResource.ts        <- hook pra loading/error/cancelamento (usado pelas 4 sub-telas de /start)
    routes/
      TodayPage.tsx            <- /hoje
      StartPage.tsx             <- /start (ramifica por query string)
    components/
      QuizActivity.tsx           <- a tela de Quiz de verdade (a mais validada no Figma)
      Layout.tsx                  <- PageShell, Centered (compartilhados pelas telas de /start)
```

Roteamento exatamente como documentado (nao espelha as rotas REST da Api, que sao um recurso
diferente - ver "Rotas da Api nao espelham as rotas do frontend" na Fase 2):

| Rota | Consome | Tela |
|---|---|---|
| `/hoje` | `GET /api/today` | Daily ativa de hoje - **Quiz implementado de ponta a ponta** |
| `/start` | `GET /api/courses` | Lista de cursos |
| `/start?course=` | `GET /api/courses/{courseId}` | Detalhe do curso |
| `/start?course=&weekly=` | `GET /api/weeklies/{weeklyId}` | Detalhe da semana |
| `/start?course=&weekly=&daily=` | `GET /api/dailies/{dailyId}` | Estado de uma Daily especifica |

`/hoje` chama `GET /api/today` e, se `AccessMode` for `Start`/`Resume`, chama
`POST .../start` antes de renderizar (a Daily precisa estar `InProgress` pra aceitar respostas -
`daily_nao_iniciada` senao). So a atividade tipo `Quiz` tem tela real (`QuizActivity`); outros
tipos mostram uma mensagem simples de "ainda nao implementado". `QuizActivity`: opcoes sem
gabarito -> selecao -> `POST .../responses` com `SelectedOptionId` -> busca a Daily de novo (o
resultado do submit nao traz as opcoes) pra pegar o gabarito ja revelado e mostrar
certo/errado. As 4 variacoes de `/start` sao funcionais mas nao receberam o mesmo polimento
visual que `/hoje` (fora de escopo explicito desta fase - so a tela de Quiz precisava estar
"a mais validada no Figma").

Paleta (Tailwind v4, tokens em `@theme` dentro de `index.css`, sem `tailwind.config.js`):
`--color-base` (`#0A0A0A`), `--color-surface` (`#151515`), `--color-surface-alt` (`#1E1E1E`),
`--color-accent` (`#39FF6A`), `--color-alert` (`#FF3B3B`), `--color-primary`/`secondary`/`muted`
(`#F5F5F5`/`#9A9A9A`/`#5C5C5C`).

## Fora de escopo ate agora

- Telas de WordMatch, Cloze e Roleplay no frontend - so Quiz esta implementado (Fase 3).
- Tela de resumo falado/microfone, menu de configuracoes, captura de voz real no frontend.
- `POST .../complete` nao e chamado pelo frontend ainda - a tela de Quiz cobre responder uma
  atividade, nao concluir a Daily inteira.
- Servico de WhatsApp (`whatsapp-service/` e so placeholder).
- Autenticacao/autorizacao real (usuario fixo/hardcoded, unico usuario-teste) - **reconfirmado
  na Fase 2**: nenhuma entidade recebe `UserId`.
- Captura, upload e transcricao de voz.
- Integracao com GitHub (Octokit.NET) e exigencia de publicacao publica (LinkedIn/GitHub).
- Geracao de conteudo/avaliacao via IA (Groq) - **reconfirmado na Fase 3**: `Cloze`/`Roleplay`
  continuam recebendo `Score` pronto do chamador (ver "Score no servidor"); so os ports
  (`IContentEvaluationService`, `IAudioTranscriptionService`) existem, sem adapter concreto nem
  registro no DI.
- Sistema de Gems/Marketplace/Ranking/Cosmeticos/Arcade/UGC.
- Endpoints de autoria de conteudo (criar Course/Monthly/Weekly/Daily/DailyActivity/etc.) - a
  Api e so leitura + as 3 acoes de progresso do aluno (iniciar, responder, concluir). Conteudo
  hoje so pode ser inserido via `SeedWebSecurityCourseUseCase` (ver "Seed de conteudo" acima).
- CORS liberado so para `http://localhost:5173` (hardcoded, dev apenas).

## Fases concluidas

| Fase | Nome | Resumo |
|---|---|---|
| 1 | Dominio e Schema (Backend .NET) | `docs/fase-1/resumo-implementacao-fase-1.md` |
| 2 | Monorepo Git + API Real (Backend .NET) | `docs/fase-2/resumo-implementacao-fase-2.md` |
| 3 | Correcoes de Api, Seed de Conteudo e Inicio do Frontend | `docs/fase-3/resumo-implementacao-fase-3.md` |

## O que uma proxima fase provavelmente precisa saber

- O contrato da Api (rotas, DTOs, formato de erro) esta documentado na secao "Superficie da
  API" acima; o client tipado do frontend (`frontend/src/api/`) e o exemplo de referencia de
  como consumi-lo.
- `GET /api/today` e `GET /api/dailies/{dailyId}` retornam o mesmo `DailyStateDto` -
  `AccessMode` e o campo que decide se a tela deve ser editavel ou so leitura.
- `SelectedOptionId` (Quiz/WordMatch) e `Score` (Cloze/Roleplay) sao mutuamente exclusivos no
  corpo de `POST .../responses`, decidido pelo `ActivityType` da atividade - ver "Score no
  servidor" acima.
- Gabarito (`IsCorrect`/`ExpectedAnswer`/`TerminalQuality`) so aparece depois da primeira
  resposta - o frontend precisa re-buscar o estado da Daily apos um submit pra ver o gabarito
  revelado (o resultado do submit em si nao traz as opcoes atualizadas).
- Toda `Entity` precisa de `ValueGenerated.Never` no `Id` pra funcionar corretamente com EF Core
  quando adicionada a um grafo ja tracked (ver "Bug de concorrencia do EF Core") - se uma fase
  futura adicionar uma entidade nova, isso ja esta coberto globalmente em
  `FocaduDbContext.OnModelCreating`, nao precisa reconfigurar por entidade.
- `GET /api/today` assume exatamente um Course `Active`; isso quebra se o produto crescer para
  multiplos cursos ativos sem antes resolver o conceito de usuario/"curso atual".
- WordMatch, Cloze e Roleplay ainda nao tem tela no frontend - so a estrutura de dados e a Api
  ja suportam esses tipos.
- **Resolvido na Fase 3, nao e mais pendencia:** o schema ja foi validado contra um Postgres real
  rodando (Docker disponivel nesta sessao) - ver "Persistencia" acima para o relato completo,
  incluindo o bug de concorrencia do EF Core que essa validacao revelou e corrigiu.
- **Resolvido na Fase 3, nao e mais pendencia:** o bloqueio de comandos de mover/apagar arquivo
  que afetou as Fases 1 e 2 (`mv`, `Move-Item`, `rm`, `Remove-Item` negados, exigindo que o
  Falves rodasse scripts manualmente) nao se aplicou nesta sessao - comandos de arquivo foram
  executados diretamente sem problema. Nao ha garantia de que uma sessao futura tenha o mesmo
  ambiente; se o bloqueio voltar, o padrao descrito em
  `docs/fase-2/resumo-implementacao-fase-2.md` (entregar o script exato pro Falves rodar) ainda
  vale.
