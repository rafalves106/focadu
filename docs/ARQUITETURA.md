# Arquitetura da Focadu — estado atual

> Documento vivo. Nao e historico de decisoes (isso fica em `docs/fase-N/`) - e sempre um
> retrato do estado atual e consolidado do projeto. Ver `docs/CONVENCOES.md` para a regra de
> como e quando este arquivo e atualizado.
>
> Ultima fase que atualizou este documento: **Fase 2 - Monorepo Git + API Real**.

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
├── frontend/               <- Vite + React Router, implementacao prevista para o Passo 3
│   └── README.md            (placeholder ate la)
└── whatsapp-service/        <- servico Node isolado de notificacao, fase futura
    └── README.md             (placeholder ate la)
```

`docs/` fica na raiz (fora de `backend/`) de proposito: documenta decisoes que atravessam
backend, frontend e whatsapp-service, nao so o codigo .NET.

## Stack e ferramentas

- **Backend**: .NET 10, C# puro no dominio, PostgreSQL + EF Core (Code-First Migrations,
  provider Npgsql), xUnit, ASP.NET Core Web API (minimal APIs). Solucao no formato `.slnx`
  (`backend/Focadu.slnx`).
- **Frontend** (Passo 3, ainda nao implementado): Vite + React Router, planejado.
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
    Ports/                          <- IClock, IContentEvaluationService (stub, sem impl),
                                       IAudioTranscriptionService (stub, sem impl)
    Exceptions/                     <- NotFoundException, ConflictException, ValidationException
    Shared/                         <- DTOs reaproveitados entre modulos (ex: sessoes de reforco)
    Courses/                        <- ListCoursesUseCase, GetCourseDetailUseCase, Dtos.cs
    Weeklies/                       <- GetWeeklyDetailUseCase, Dtos.cs
    Dailies/                        <- GetDailyStateUseCase, GetTodayUseCase,
                                       StartOrResumeDailyUseCase, SubmitActivityResponseUseCase,
                                       CompleteDailyUseCase, DailyStateMapper.cs (interno,
                                       compartilhado pelos casos de uso acima), Dtos.cs
    DependencyInjection.cs
  Focadu.Infrastructure/
    Persistence/
      FocaduDbContext.cs
      FocaduDbContextFactory.cs    <- design-time factory p/ `dotnet ef migrations`
      Configurations/               <- 1 IEntityTypeConfiguration por entidade (12 arquivos)
      Repositories/                 <- CourseRepository, MonthlyRepository, WeeklyRepository
      UnitOfWork.cs
      Migrations/                   <- InitialCreate (schema completo, sem mudancas na Fase 2)
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
        │   └── DailyActivity (Type, OrderIndex, AnswerMode, ContentId?, ExpectedAnswer?)
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

`DailyActivityDto` expoe `QuizOptions[].IsCorrect`, `ExpectedAnswer` e
`RoleplayNodes[].TerminalQuality` sem redacao - o dominio ja e a fonte da verdade retornada
(so traduzida para DTO, nunca a entidade EF diretamente). Ver "Duvidas e pontos abertos" na
Fase 2 para a implicacao disso (gabarito visivel antes de responder).

### GET /api/today assume exatamente um Course com Status = Active

Como o dominio ainda nao tem conceito de usuario/curso "atual" (fora de escopo confirmado de
novo nesta fase - nenhuma entidade recebe `UserId`), o atalho "/hoje" resolve via
`ICourseRepository.GetAllAsync()` filtrado por `Status == Active`: zero cursos ativos vira 404
(`nenhum_curso_ativo`), mais de um vira 409 (`multiplos_cursos_ativos`, com a mensagem sugerindo
usar `/api/courses/{courseId}` para desambiguar). Isso e seguro para o cenario atual (um so
curso piloto, "Web Security"), mas para de funcionar sozinho se o produto crescer para varios
cursos ativos ao mesmo tempo sem um conceito de usuario - ver pontos abertos da Fase 2.

### POST .../responses ainda recebe o Score pronto

`SubmitActivityResponseUseCase` continua recebendo `Score` diretamente do chamador (nao computa
a partir de qual `QuizOption`/`RoleplayOption` foi escolhida) - a Fase 2 nao alterou esse
contrato, so adicionou validacao (`Score` obrigatorio, 0-100) e DTOs adequados. Calcular o Score
a partir da escolha do usuario (sem IA, so para Quiz/WordMatch) ou via `IContentEvaluationService`
(para Cloze/texto livre) continua em aberto - ver pontos abertos da Fase 2.

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
- `SubmitActivityResponseRequest.Score` e `int?` (nao `int`) para distinguir "campo ausente" de
  "veio 0"; validado explicitamente (`score_obrigatorio` se nulo, `score_invalido` se fora de
  0-100) antes de chamar o caso de uso.
- Corpo de request malformado (JSON invalido) ainda pode gerar uma resposta de erro fora do
  formato padrao da Api, por vir do model binding do ASP.NET Core antes do endpoint rodar - ver
  pontos abertos da Fase 2.

## Persistencia (EF Core + Postgres)

Sem mudancas de schema na Fase 2 (nenhuma migration nova) - so um metodo de leitura novo no
repositorio (`IWeeklyRepository.GetByDateAsync`). Decisoes de design confirmadas na Fase 1
continuam valendo integralmente (Guid como Id, tabela associativa real para
`WeeklyReinforcement.WeakDailyIds`, enums como `string`, etc.) - ver
`docs/fase-1/resumo-implementacao-fase-1.md` para o raciocinio completo de cada uma.

**Pendencia conhecida (ainda nao bloqueante):** o schema nunca foi validado contra um Postgres
real rodando - o ambiente de desenvolvimento usado nas Fases 1 e 2 nao tem Docker instalado. Na
Fase 2, validamos que a Api sobe corretamente e trata erros de conexao com o banco de forma
segura (500 com o envelope padrao, sem derrubar o processo), mas nenhum fluxo feliz (ler/escrever
dados de verdade) foi exercitado ainda. Continua sinalizado aqui ate ser validado.

## Como rodar localmente

```bash
cd backend
docker compose up -d                              # sobe Postgres em localhost:5432
dotnet ef database update -p src/Focadu.Infrastructure  # aplica a migration InitialCreate
dotnet build Focadu.slnx                            # build de toda a solucao
dotnet test tests/Focadu.Tests/Focadu.Tests.csproj  # roda os testes de dominio
dotnet run --project src/Focadu.Api                 # sobe a API completa
```

Connection string default (dev): `Host=localhost;Port=5432;Database=focadu;Username=focadu;
Password=focadu` (definida em `backend/src/Focadu.Api/appsettings.json` e como fallback em
`FocaduDbContextFactory`; pode ser sobrescrita pela env var `FOCADU_CONNECTION_STRING` para
ferramentas de design-time do EF, ou por `ConnectionStrings:Focadu` / env var equivalente para a
Api em runtime).

## Fora de escopo ate agora

- Frontend (`frontend/` e so placeholder ate o Passo 3).
- Servico de WhatsApp (`whatsapp-service/` e so placeholder).
- Autenticacao/autorizacao real (usuario fixo/hardcoded, unico usuario-teste) - **reconfirmado
  na Fase 2**: nenhuma entidade recebe `UserId`.
- Captura, upload e transcricao de voz.
- Integracao com GitHub (Octokit.NET) e exigencia de publicacao publica (LinkedIn/GitHub).
- Geracao de conteudo/avaliacao via IA (Groq) - **reconfirmado na Fase 2**: so os ports
  (`IContentEvaluationService`, `IAudioTranscriptionService`) existem, sem adapter concreto nem
  registro no DI.
- Sistema de Gems/Marketplace/Ranking/Cosmeticos/Arcade/UGC.
- Endpoints de autoria de conteudo (criar Course/Monthly/Weekly/Daily/DailyActivity/etc.) - a
  Api da Fase 2 e so leitura + as 3 acoes de progresso do aluno (iniciar, responder, concluir).
  Conteudo hoje so pode ser inserido via seed/script direto no banco.

## Fases concluidas

| Fase | Nome | Resumo |
|---|---|---|
| 1 | Dominio e Schema (Backend .NET) | `docs/fase-1/resumo-implementacao-fase-1.md` |
| 2 | Monorepo Git + API Real (Backend .NET) | `docs/fase-2/resumo-implementacao-fase-2.md` |

## O que uma proxima fase provavelmente precisa saber

- O contrato da Api (rotas, DTOs, formato de erro) esta documentado na secao "Superficie da
  API" acima - uma fase de frontend (Passo 3) pode consumir isso diretamente.
- `GET /api/today` e `GET /api/dailies/{dailyId}` retornam o mesmo `DailyStateDto` -
  `AccessMode` e o campo que decide se a tela deve ser editavel ou so leitura.
- Nenhum endpoint de autoria de conteudo existe - popular Course/Monthly/Weekly/Daily/
  DailyActivity para testar a Api manualmente exige um seed script direto no banco (nao
  implementado ainda em nenhuma fase).
- `SubmitActivityResponseUseCase` ainda recebe o `Score` pronto do chamador - uma fase futura
  de avaliacao/IA provavelmente precisa decidir se o Score passa a ser calculado no backend
  (a partir de `SelectedOptionId` para Quiz/WordMatch, e via `IContentEvaluationService` para
  Cloze/texto livre e Roleplay) ou se o frontend continua responsavel por isso.
- `GET /api/today` assume exatamente um Course `Active`; isso quebra se o produto crescer para
  multiplos cursos ativos sem antes resolver o conceito de usuario/"curso atual".
- Continua pendente validar o schema contra um Postgres real rodando (ambiente sem Docker ate
  agora).
- O ambiente de desenvolvimento usado nas Fases 1 e 2 bloqueia comandos de mover/apagar arquivo
  (`mv`, `Move-Item`, `rm`, `Remove-Item`) para o Claude Code - qualquer reorganizacao de pastas
  precisa ser feita pelo Falves rodando os comandos manualmente (ver
  `docs/fase-2/resumo-implementacao-fase-2.md` para o que isso afetou nesta fase).
