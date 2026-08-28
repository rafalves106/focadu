# Arquitetura da Focadu — estado atual

> Documento vivo. Nao e historico de decisoes (isso fica em `docs/fase-N/`) - e sempre um
> retrato do estado atual e consolidado do projeto. Ver `docs/CONVENCOES.md` para a regra de
> como e quando este arquivo e atualizado.
>
> Ultima fase que atualizou este documento: **Fase 22 - Sessao Expirada (Modal Global)**.

## Visao geral do projeto

Focadu e uma plataforma pessoal de estudo gamificada e multi-curso. O curso piloto e
"Web Security". **Desde a Fase 12, o app tem autenticacao real e multiusuario** (antes disso era
mono-usuario hardcoded, sem login). **Desde a Fase 13a, o dominio virou Template + Instancia**:
Course/Monthly/WeeklyTemplate/DailyTemplate/DailyActivity sao curriculo compartilhado (admin-
authored, via seed/`/admin/conteudo`); Weekly/Daily/ActivityResponse/WeeklyProject/
ModulePublication sao progresso por usuario, gerados na matricula (`Enrollment`, via
`EnrollUserInCourseUseCase`) - ver "Modelo de dominio" abaixo. A plataforma forca
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
                           ValidationException, ExternalServiceException). So depende de
                           Focadu.Domain.
Focadu.Infrastructure   <- adapters concretos: DbContext do EF Core, IEntityTypeConfiguration
                           por entidade, repositorios Postgres, UnitOfWork, SystemClock, adapters
                           Groq (transcricao + avaliacao, Fase 5). Depende de Focadu.Domain e
                           Focadu.Application.
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
    Enums/                          <- CourseStatus, DailyStatus, DailyAccessMode, ActivityType
                                       (Quiz/WordMatch/Cloze/Roleplay/VoiceSummary - Fase 5;
                                       Reading/Video - Fase 7), ActivityStatus, AnswerMode,
                                       TerminalQuality, CuratedContentType, WeeklyProjectStatus,
                                       PublicationPlatform/PublicationStatus (Fase 11)
    Courses/Course.cs                <- +Description (Fase 13, vitrine do card de selecao de curso)
    Monthlies/Monthly.cs             <- WeeklyTemplates (renomeado de Weeklies na Fase 13)
    Weeklies/WeeklyTemplate.cs       <- curriculo (Fase 13, RENAME do antigo Weekly - Number/
                                       Title/Theme/WeeklyProjectSpecText/DailyTemplates/
                                       CuratedContents, sem Status/Date)
    Weeklies/Weekly.cs              <- Fase 13: NOVO SIGNIFICADO - instancia por usuario
                                       (EnrollmentId/WeeklyTemplateId/StartDate/Dailies/Project/
                                       Reinforcements/Publication; Number/Title/Theme/MonthlyId
                                       viram pass-through pra Template). Continua o aggregate root
                                       "operacional" (ver secao de regras)
    Weeklies/WeeklyProject.cs        <- instancia (Fase 13): so Status/SubmissionUrl - SpecText
                                       virou curriculo (WeeklyTemplate.WeeklyProjectSpecText)
    Weeklies/WeeklyReinforcement.cs (+ WeakDailyLink interno, so para mapeamento EF)
    Weeklies/ModulePublication.cs   <- 1:1 com Weekly (instancia), publicacao publica exigida pra
                                       desbloquear o proximo modulo (Fase 11, ver secao propria)
    Enrollments/Enrollment.cs        <- matricula (Fase 13) - UserId/CourseId/EnrolledAt, gatilho
                                       de EnrollUserInCourseUseCase
    Users/User.cs                    <- +Interests/AdditionalProfileNotes/ProfileCompletedAt +
                                       CompleteProfile() (Fase 13, Entrevista de Perfil)
    Dailies/DailyTemplate.cs         <- curriculo (Fase 13, RENAME do antigo Daily) - so DayNumber
                                       + DailyActivities. WeeklyTemplateId NULLABLE (DailyTemplate
                                       "sintetico" pra reforco diario, ver secao propria)
    Dailies/Daily.cs                 <- Fase 13: NOVO SIGNIFICADO - instancia por usuario
                                       (WeeklyId/DailyTemplateId/DayNumber/Date/Status/
                                       PenaltyPoints/etc + Responses, que moveu de DailyActivity
                                       pra ca). Activities e pass-through pra Template.Activities
    Activities/DailyActivity.cs      <- curriculo (Fase 13): perdeu Status (era progresso
                                       disfarcado) e Responses (moveu pra Daily-instancia).
                                       DailyId renomeado pra DailyTemplateId
    Activities/ActivityResponse.cs
    Activities/QuizOption.cs
    Activities/RoleplayNode.cs
    Activities/RoleplayOption.cs
    Content/CuratedContent.cs        <- curriculo (Fase 13): WeeklyId renomeado pra WeeklyTemplateId
    Repositories/                   <- ICourseRepository (+GetFullTemplateGraphAsync, Fase 13),
                                       IMonthlyRepository, IWeeklyRepository (Fase 13: metodos
                                       reescritos pra instancia+userId), IWeeklyTemplateRepository
                                       (novo, Fase 13 - lado curriculo), IEnrollmentRepository
                                       (novo, Fase 13), IUserRepository (Fase 12), IUnitOfWork (ports)
  Focadu.Application/
    AssemblyInfo.cs                 <- InternalsVisibleTo("Focadu.Tests"), desde a Fase 3 - permite
                                       testar direto membros internal (DailyStateMapper.ToDto,
                                       SubmitActivityResponseUseCase.ResolveScore) sem precisar de
                                       fakes de repositorio
    Ports/                          <- IClock, IContentEvaluationService, IAudioTranscriptionService
                                       (adapters concretos desde a Fase 5, ver Focadu.Infrastructure/Services),
                                       IDraftGenerationService, IGitHubService (Fase 11, ver secao propria),
                                       IPasswordHasher, IJwtTokenService (Fase 12, ver secao propria)
    Exceptions/                     <- NotFoundException, ConflictException, ValidationException,
                                       ExternalServiceException (Fase 5 - erro de servico externo)
    Shared/                         <- DTOs reaproveitados entre modulos (ex: sessoes de reforco,
                                       CuratedContentDto)
    Courses/                        <- ListCoursesUseCase, GetCourseDetailUseCase (Fase 13:
                                       +userId, casa WeeklyTemplate com a Weekly-instancia da
                                       Enrollment), Dtos.cs
    Weeklies/                       <- GetWeeklyDetailUseCase, Dtos.cs, EvaluateWeeklyProjectUseCase
                                       (Fase 11 - fecha lacuna aberta desde a Fase 7),
                                       GetPublicationStatusUseCase, GenerateLinkedInDraftUseCase,
                                       GetGitHubRepositoriesUseCase, CommitModuleSummaryUseCase,
                                       SubmitPublicationUseCase, PublicationDtos.cs (Fase 11) -
                                       todos +userId na Fase 13 (filtro de propriedade)
    Content/                         <- CreateCuratedContentUseCase, UpdateCuratedContentUseCase
                                       (Fase 4; Fase 13: passam a usar IWeeklyTemplateRepository,
                                       CuratedContent e curriculo agora)
    Users/                            <- RegisterUserUseCase, LoginUserUseCase,
                                       GetCurrentUserUseCase (Fase 12), CompleteProfileUseCase
                                       (Fase 13 - so persiste, nao usa em prompt de IA nesta fase),
                                       Dtos.cs (UserDto +ProfileCompletedAt na Fase 13)
    Enrollments/                      <- EnrollUserInCourseUseCase, GetAvailableCoursesUseCase,
                                       GetMyEnrollmentsUseCase (Fase 13, ver secao propria)
    Dailies/                        <- GetDailyStateUseCase, GetTodayUseCase (Fase 13: reescrito
                                       pra resolver pela Enrollment do usuario logado, nao mais
                                       "1 Course Active" global),
                                       StartOrResumeDailyUseCase (Fase 11: checa bloqueio por
                                       publicacao pendente da Weekly anterior antes de liberar a
                                       primeira Daily de uma nova Weekly - Fase 13: escopo virou
                                       "mesma Enrollment", nao mais "mesmo Monthly"),
                                       SubmitActivityResponseUseCase (+ ResolveScore, cobre Quiz/
                                       WordMatch/Cloze/Roleplay - ver "Score no servidor" abaixo),
                                       SubmitVoiceSummaryResponseUseCase (Fase 5 - transcreve +
                                       avalia por IA), ActivityResponseRecorder (interno, Fase 5 -
                                       "grava resposta + checa reforco", compartilhado pelos 2
                                       casos de uso de submissao), CompleteDailyUseCase (retorna
                                       CompleteDailyResult), DailyStateMapper.cs (interno,
                                       compartilhado pelos casos de uso de leitura - Fase 13:
                                       "hasAnswered"/Status derivados de Daily.Responses, nao mais
                                       de um campo em DailyActivity), Dtos.cs - todos os casos de
                                       uso que recebem dailyId/weeklyId ganharam userId na Fase 13
    Seed/                            <- SeedWebSecurityCourseUseCase (Fase 13: so popula
                                       TEMPLATE, sem IClock/distribuicao de datas - isso virou
                                       trabalho de EnrollUserInCourseUseCase)
    DependencyInjection.cs
  Focadu.Infrastructure/
    Persistence/
      FocaduDbContext.cs
      FocaduDbContextFactory.cs    <- design-time factory p/ `dotnet ef migrations`
      Configurations/               <- 1 IEntityTypeConfiguration por entidade (18 arquivos -
                                       WeeklyTemplateConfiguration/DailyTemplateConfiguration/
                                       EnrollmentConfiguration novos na Fase 13)
      Repositories/                 <- CourseRepository (Fase 13: GetByIdAsync/GetAllAsync agora
                                       incluem Monthlies.WeeklyTemplates; +GetFullTemplateGraphAsync,
                                       grafo profundo so pra EnrollUserInCourseUseCase),
                                       MonthlyRepository, WeeklyRepository (Fase 13: reescrito -
                                       FullGraph() funde Template+Instancia, AsSplitQuery() novo;
                                       GetByIdAsync/GetByDailyIdAsync filtram por userId via
                                       Enrollment), WeeklyTemplateRepository (novo, Fase 13),
                                       EnrollmentRepository (novo, Fase 13), UserRepository (Fase 12)
      UnitOfWork.cs
      Migrations/                   <- InitialCreate ressincronizada na Fase 13 (schema mudou
                                       demais - renomes de tabela, colunas removidas/adicionadas -
                                       pra um diff incremental valer a pena; migrations de Fases
                                       1-12 apagadas e squashadas numa unica migration nova,
                                       banco recriado do zero - autorizado explicitamente, sem
                                       dado real pra preservar)
    Services/
      SystemClock.cs                 <- implementacao real de IClock (hora local)
      GroqOptions.cs                  <- ApiKey da Groq (Fase 5)
      GroqAudioTranscriptionService.cs  <- adapter de IAudioTranscriptionService (Fase 5)
      GroqContentEvaluationService.cs   <- adapter de IContentEvaluationService (Fase 5)
      GroqDraftGenerationService.cs      <- adapter de IDraftGenerationService (Fase 11 - rascunho
                                             de LinkedIn, mesmo HttpClient/erro do Groq, sem JSON mode)
      GitHubOptions.cs                    <- Token do GitHub (Fase 11)
      GitHubService.cs                     <- adapter de IGitHubService (Fase 11, ver secao propria)
      BCryptPasswordHasher.cs               <- adapter de IPasswordHasher via BCrypt.Net-Next (Fase 12)
      JwtOptions.cs                          <- SecretKey de assinatura dos JWT (Fase 12)
      JwtTokenService.cs                      <- adapter de IJwtTokenService (Fase 12, so gera - ver secao propria)
    DependencyInjection.cs
  Focadu.Api/
    Program.cs                      <- composicao de DI + 27 endpoints reais sob /api (quase todos
                                       com .RequireAuthorization() desde a Fase 13 - ver secao
                                       abaixo), + /health
    ErrorHandling/                  <- ApiExceptionHandler (IExceptionHandler), ErrorResponse
    Contracts/                      <- RouteParsing (parse de Guid com erro padronizado),
                                       SubmitActivityResponseRequest, CuratedContentRequests (Fase 4,
                                       WeeklyId renomeado pra WeeklyTemplateId na Fase 13),
                                       PublicationRequests (Fase 11), AuthRequests (Fase 12),
                                       ProfileRequests, EnrollmentRequests (Fase 13)
    appsettings.json                <- connection string + Groq:ApiKey + GitHub:Token +
                                       Jwt:SecretKey (todos vazios por padrao) default
    Focadu.Api.csproj                <- UserSecretsId (Fase 5, ver "Como configurar a chave da Groq"),
                                       Microsoft.AspNetCore.Authentication.JwtBearer (Fase 12)
tests/
  Focadu.Tests/
    Dailies/DailyTests.cs           <- + exigencia de ContentId pra VoiceSummary (Fase 5) -
                                       Fase 13: constroi via WeeklyTemplate.AddDailyTemplate +
                                       DailyTemplate.AddActivity antes de Weekly.AddDaily
    Weeklies/WeeklyTests.cs         <- + Weekly.GetDailyByDate (Fase 5), + IsModuleComplete/
                                       RequiresPublicationToUnlock (Fase 11), +
                                       InitializeProject idempotencia (Fase 13)
    Weeklies/WeeklyProjectTests.cs      <- Submit/Evaluate (Fase 13: usa Weekly.InitializeProject()
                                       no lugar do antigo DefineProject(specText))
    Weeklies/WeeklyTemplateTests.cs      <- SetProjectSpec/AddDailyTemplate (novo, Fase 13)
    Weeklies/ModulePublicationTests.cs  <- Submit/MarkValidated/MarkFailed/retry apos falha (Fase 11)
    Enrollments/EnrollmentTests.cs        <- Create (novo, Fase 13)
    Users/UserTests.cs                    <- Create valido/formato de email/nome/hash (Fase 12) +
                                       CompleteProfile (Fase 13)
    Users/RegisterUserUseCaseTests.cs      <- ValidatePassword (internal static, Fase 12)
    Policies/EvaluationPolicyTests.cs
    Domain/DomainExceptionCodeTests.cs  <- trava os Code usados pela Api (ver abaixo)
    Dailies/SubmitActivityResponseScoreTests.cs  <- ResolveScore, cobre Quiz/WordMatch/Cloze/
                                       Roleplay - Fase 13: so precisa de WeeklyTemplate.
                                       AddDailyTemplate + DailyTemplate.AddActivity (ResolveScore
                                       nunca precisou de uma Daily-instancia de verdade)
    Dailies/DailyStateMapperTests.cs             <- gabarito escondido/revelado (Fase 3)
    TestHelpers/DailyFixtures.cs         <- Fase 13: NewWeekly() monta WeeklyTemplate+Weekly
                                       minimos; NewDaily/NewDailyWithOneActivity/NewWeakDaily
                                       passam pelos metodos publicos de WeeklyTemplate/DailyTemplate
                                       (sem precisar de InternalsVisibleTo no Focadu.Domain);
                                       ResponsesFor(daily, activityId) - helper novo, Responses
                                       mora em Daily agora, nao mais em DailyActivity
```

## Modelo de dominio

### Template vs Instancia (Fase 13)

Ate a Fase 12, o dominio era um curriculo unico e global: `Weekly`/`Daily` eram ao mesmo tempo
"o que existe" (estrutura) e "o progresso de alguem nisso" (so fazia sentido enquanto so havia 1
usuario). A partir da Fase 13, isso virou dois grafos separados, casados por Id:

```
TEMPLATE (curriculo, admin-authored - seed / futuramente /admin/conteudo, muda raramente)
Course (Draft/Active/Archived, Description)
└── Monthly (Number, Title)
    └── WeeklyTemplate (Number, Title, Theme, WeeklyProjectSpecText)
        ├── DailyTemplate (DayNumber)                 [WeeklyTemplateId NULL = sintetico, ver reforco abaixo]
        │   └── DailyActivity (Type, OrderIndex, AnswerMode, Prompt?, ContentId?, ExpectedAnswer?)
        │       ├── QuizOption (Text, IsCorrect)                  [Quiz e WordMatch]
        │       └── RoleplayNode (NodeKey, Text, IsTerminal, TerminalQuality?)  [Roleplay]
        │           └── RoleplayOption (Text, NextNodeId?)
        └── CuratedContent (Type, Title, ExternalUrl?, BodyText?)

INSTANCIA (progresso por usuario, criada na matricula - EnrollUserInCourseUseCase)
User (Email, PasswordHash, DisplayName, Interests, AdditionalProfileNotes, ProfileCompletedAt)
└── Enrollment (UserId, CourseId, EnrolledAt)
    └── Weekly (EnrollmentId, WeeklyTemplateId, StartDate)  [Number/Title/Theme/MonthlyId = pass-through pro Template]
        ├── Daily (WeeklyId, DailyTemplateId, DayNumber, Date, Status, IsReinforcement,
        │         PenaltyPoints, ReinforcementDailyId?)     [Activities = pass-through pro Template]
        │   └── ActivityResponse (ActivityId [aponta pro DailyActivity template], AttemptNumber,
        │                          Score, Passed, Transcript?, Justification?, AiFeedback?)
        ├── WeeklyProject (Status, SubmissionUrl?)          [1:1 com Weekly - SpecText fica no Template]
        ├── WeeklyReinforcement (TriggeredAt, WeakDailyIds)
        └── ModulePublication (Status, Platform?, SubmittedUrl?, GeneratedDraft?,
                                ValidationError?)            [1:1 com Weekly, Fase 11 - criada sob demanda]
```

**Por que `ActivityResponse` mudou de dono.** Antes da Fase 13, `ActivityResponse` pertencia a
`DailyActivity` (fazia sentido: so existia 1 instancia global). Com `DailyActivity` virando
curriculo compartilhado por N usuarios matriculados, isso pararia de fazer sentido - uma unica
lista de respostas compartilhada por todo mundo. `ActivityResponse` agora pertence a `Daily`
(instancia), so referenciando `ActivityId` (o `DailyActivity` que ela responde) - `AttemptNumber`
conta dentro do `_responses` da propria Daily-instancia. O indice unico no banco precisou incluir
o dono (`DailyId`, shadow property) alem de `(ActivityId, AttemptNumber)` - sem isso, o 2º usuario
a responder a mesma `DailyActivity` colidiria com o `AttemptNumber = 1` do 1º (bug pego em design,
verificado ao vivo com 2 usuarios reais que nao colidem - ver `docs/fase-13a/`).

**Reforco diario e `DailyTemplate` "sintetico".** Reforco (Fase 4) gera atividades novas, por
usuario, copiadas da Daily de origem - nunca foi curriculo real. Em vez de dar a `DailyActivity`
uma 2ª FK opcional, `DailyTemplate.WeeklyTemplateId` e **nullable**:
`DailyTemplate.CreateSynthetic(dayNumber)` cria um DailyTemplate orfao (nunca adicionado a
nenhuma `WeeklyTemplate.DailyTemplates`) so pra guardar as atividades clonadas daquele reforco
especifico. Assim toda `Daily`-instancia sempre tem exatamente 1 `DailyTemplateId` (curricular ou
sintetico) e todo `DailyActivity` sempre pertence a exatamente 1 `DailyTemplate` - nenhum
consumidor (`daily.Activities`, mappers, use cases) precisa saber a diferenca.

`Weekly` (instancia) continua o **aggregate root operacional**: e ele quem concentra as regras de
negocio que precisam comparar Dailies entre si (acesso a Daily passada/futura, reforco diario,
reforco semanal) - migrou praticamente inalterada do antigo `Weekly` (rename + split de dados
estruturais), so trocando a fonte dos campos curriculares (`Number`/`Title`/`Theme`/`MonthlyId`
viraram pass-through computados pra `Template`, nunca duplicados). `IWeeklyRepository` carrega o
grafo completo TEMPLATE+INSTANCIA fundido (Dailies com seus DailyTemplate.Activities.QuizOptions/
RoleplayNodes/Options + Responses, WeeklyTemplate.CuratedContents, WeeklyProject,
WeeklyReinforcements, ModulePublication) - `AsSplitQuery()` novo na Fase 13, a fusao dos dois
grafos ficou grande demais pra um JOIN unico sem risco de explosao cartesiana. `GetByIdAsync`/
`GetByDailyIdAsync` agora recebem `userId` e filtram pela Enrollment dona na propria query -
ver "Autenticacao" abaixo.

`IWeeklyTemplateRepository` (novo) e o lado leitura do curriculo (usado pela autoria de
`CuratedContent`, `/admin/conteudo`) - sem filtro de usuario, curriculo e compartilhado.
`ICourseRepository.GetFullTemplateGraphAsync` (novo) carrega o grafo TEMPLATE completo (ate
`DailyTemplate.Activities.QuizOptions/RoleplayNodes`) - so `EnrollUserInCourseUseCase` precisa
disso; `GetByIdAsync`/`GetAllAsync` continuam mais rasos (so `Monthlies.WeeklyTemplates`,
estrutural) pras leituras mais leves (`ListCoursesUseCase`, `GetCourseDetailUseCase`).

**`User` (Fase 12) ganhou `Enrollment` (Fase 13)** - `IEnrollmentRepository`, UserId+CourseId
unico (checado na Application antes de criar + indice unico no banco, mesmo padrao de
`email` unico). `EnrollUserInCourseUseCase` e o unico jeito de criar instancias
(`Weekly`/`Daily`/`WeeklyProject`) - sem matricula, nao ha progresso pra ver. Ver "Matricula"
abaixo pro fluxo completo.

**`Weekly.GetDailyByDate(date)` (Fase 5):** resolve qual `Daily` desta Weekly esta datada em
`date`, preferindo sempre a Daily **nao-reforco** quando houver mais de uma na mesma data (ex:
uma Daily normal e a Daily de reforco gerada a partir dela no mesmo dia -
`CreateDailyReinforcement` usa "hoje" como data). `GetTodayUseCase` usa este metodo - o atalho
"/hoje" nunca deve resolver acidentalmente pra uma Daily de reforco; acesso a ela e sempre via
link explicito (`Daily.ReinforcementDailyId`). Fecha a ambiguidade documentada como pendente
desde a Fase 4.

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
`AiFeedback` (feedback vindo de uma avaliacao de IA sobre a resposta).

**`ActivityType.VoiceSummary` (Fase 5):** resumo falado sobre um `CuratedContent`. Diferente dos
outros 4 tipos: `ContentId` e **obrigatorio** na criacao (`DomainException` senao - e o texto de
referencia que a IA usa pra avaliar), `Prompt` e a instrucao ("Explique com suas palavras..."), e
nunca usa `QuizOption` nem `ExpectedAnswer` - a resposta e sempre `ActivityResponse.Transcript`
(a transcricao do audio), com `Score`/`AiFeedback` vindos inteiramente da avaliacao por IA (ver
"Score no servidor" abaixo). `AnswerMode` usado pro seed e `FreeText` (nao ha nocao de multipla
escolha pra um resumo falado).

**`ActivityType.Reading`/`Video` (Fase 7):** etapas de consumo de um `CuratedContent` - mesma regra
de `ContentId` obrigatorio do `VoiceSummary` (generalizada em `DailyActivity.ctor`), mas sem
avaliacao nenhuma: concluir a etapa e o proprio "acerto". `SubmitActivityResponseUseCase.
ResolveScore` sempre devolve 100 pra esses dois tipos - a `ActivityResponse` e gravada pelo mesmo
`Daily.SubmitActivityResponse`/`ActivityResponseRecorder` que os outros 4 tipos usam (mesma tabela,
mesmo pipeline de conclusao), so que nunca reprova (Score 100 >= `PassingScore`), entao nunca soma
`PenaltyPoints` nem dispara reforco. O request de `POST .../responses` pra esses tipos vai vazio
(nenhum campo de `SubmitActivityResponseRequest` e usado). Preencheu a lacuna que existia desde a
Fase 3: antes so havia tela pras atividades avaliaveis, nunca pro texto/video em si.

### Gamificacao: Gems e Streak (Fase 14, Bonus de Superacao na Fase 15)

Primeira fase real de gamificacao - ate aqui, todo elemento de Gems/Streak que apareceu nos
designs do Figma (Fases 8, 9, 13b) foi deliberadamente descartado por nao ter dado real por
tras. Dois aggregates novos, ambos **1:1 com `User`, criados sob demanda (lazy)** - nunca no
registro (`RegisterUserUseCase` continua sem tocar neles), so na primeira conclusao que gera
Gems/streak:

```
Focadu.Domain.Gamification
UserGemBalance (UserId, TotalGems, GemsFromDailiesThisMonth, GemsFromWeekliesThisMonth,
                GemsFromMonthlyThisMonth, CurrentMonthPeriod)
UserStreak (UserId, CurrentStreak, LongestStreak, LastCompletedDate?)
```

**Gems**: +1 por Daily completa pela primeira vez, +5 por Weekly perfeita (`Weekly.IsPerfect()` -
`IsModuleComplete()` e nenhuma Daily original com `PenaltyPoints > 0`), +30 por Monthly perfeito
(todas as `WeeklyTemplates` do Monthly com Weekly-instancia perfeita). Cap mensal **por
categoria** (20/20/30 = 70 no total), resetado quando o mes calendario (`Year`/`Month` de
`IClock.Today()`) muda - `UserGemBalance.CreditDaily/CreditWeekly/CreditMonthly` devolvem quanto
foi creditado de verdade (0 se o cap da categoria ja foi atingido nesse mes). Nunca expira,
acumula indefinidamente.

**Streak**: dias consecutivos com Daily completada no dia certo (`Daily.Date == hoje`) -
replay nunca conta (nem soma nem quebra). "Quebrar por inatividade" e deteccao de AUSENCIA de
evento, nao presenca - sem job/cron no projeto (mesmo principio ja usado pra `DailyStatus.Locked`,
resolvido sob demanda comparando datas no momento do acesso). Resolvido em 2 pontos:
`RegisterCompletion` reinicia a contagem (em vez de incrementar) se detectar que ja tinha
quebrado antes desta conclusao; `CurrentStreakAsOf(today)` (usado em toda LEITURA) nunca precisa
esperar uma escrita futura pra reportar `0` - o campo persistido pode ficar "desatualizado" ate a
proxima conclusao real, mas nenhuma leitura enxerga esse valor stale.

**ponytail**: a janela de tolerancia usa "1 dia util" (segunda-sexta) como proxy pro calendario
real do curriculo - fins de semana nao quebram, mas um hiato legitimo maior que 1 dia util
(ex: gap entre Weeklies, se um curso futuro tiver) quebraria o streak incorretamente. Upgrade
natural se isso importar: checar contra as datas de Daily agendadas de verdade (`IWeeklyRepository`)
em vez do heuristico de dia util. `UserStreak`/`EnrollUserInCourseUseCase` cada um tem sua propria
copia do helper `NextBusinessDay`/`FirstBusinessDayOnOrAfter` (Domain nao pode depender de
Application, entao nao da pra compartilhar 1 so) - duplicacao deliberada de ~3 linhas, nao vale
uma abstracao cross-camada pra isso.

**Onde a decisao mora - por que nao nos hooks `Daily.OnFirstCompleted`/`OnReplayCompleted`.**
Esses hooks (`protected virtual`, ja existiam desde a Fase 4, propositalmente vazios) pareciam o
ponto de entrada natural, mas `Daily` nao tem acesso a `UserGemBalance`/`UserStreak` (aggregates
diferentes - dar a `Daily` um repositorio quebraria a arquitetura hexagonal), e o projeto **nao
tem nenhum mecanismo de Domain Events** (confirmado - nenhuma fase anterior introduziu esse
padrao). Resolvido na camada de aplicacao (`CompleteDailyUseCase`), a abordagem mais simples que
ja se encaixa no estilo do projeto - os hooks continuam vazios, sem uso.

**`GamificationCreditor` - por que credita em 2 lugares diferentes.** `Weekly.IsPerfect()` so
fica `true` quando AMBAS as condicoes batem: todas as Dailies completas E o projeto avaliado
(`IsModuleComplete()`). No fluxo tipico (confirmado na propria verificacao ao vivo da Fase 13a:
"concluir a Daily -> submeter e avaliar o projeto"), o projeto e avaliado **depois** de todas as
Dailies - ou seja, o evento que de fato "fecha" a Weekly costuma ser a avaliacao do projeto, nao a
ultima Daily. Um `GamificationCreditor` extraido (`Focadu.Application.Gamification`) e chamado a
partir de `CompleteDailyUseCase` **e** de `EvaluateWeeklyProjectUseCase` - qualquer um dos dois
pode ser quem observa `IsPerfect()` virar `true` pela primeira vez, dependendo da ordem que o
aluno segue. Seguro contra credito duplicado: `WeeklyProject.Evaluate()` ja rejeita ser chamado
2x (`DomainException` se `Status != Submitted`), e uma Daily so tem "primeira conclusao" uma vez -
entao, pra qualquer Weekly, so existe 1 momento em que `IsPerfect()` vira `true` pela primeira
vez, nao importa qual dos 2 chamadores observa esse momento (verificado ao vivo, ver "Testes"
abaixo).

**Bonus de Superacao (Fase 15).** Concluir uma Daily de reforco (`IsReinforcement`) com **todas**
as atividades aprovadas (`Daily.AllActivitiesPassed()` - usa a tentativa MAIS RECENTE de cada
Activity, nunca a primeira, permitindo corrigir por retry) credita
`UserGemBalance.CreditReinforcementBonus` (`EvaluationPolicy.ReinforcementBonusGems = 2`) **em vez
de** `CreditDaily` normal (nunca os dois juntos) - substitui, nao soma. Um reforco concluido sem
sucesso total continua ganhando o credito normal de Daily (so sem o bonus) - "reforco nunca gera
penalidade adicional, so deixa de dar o bonus". A categoria/cap e a MESMA de Dailies normais
(`GemsFromDailiesThisMonth`, 20/mes) - de proposito, pra nao criar uma 4a categoria de cap so pra
isso. Isso expos um caso que `UserGemBalance.Credit` (privado, compartilhado pelas 4 chamadas
publicas desde a Fase 15) precisou passar a **clampar** em vez de tudo-ou-nada: com 2 valores
diferentes (+1 Daily, +2 bonus) na mesma categoria, um usuario a 19/20 no mes pode legitimamente
receber so +1 de um bonus de +2 (nunca estourar o cap por 1) - antes da Fase 15, os 3 valores
(1/5/30) sempre dividiam exatamente os proprios caps (20/20/30), entao tudo-ou-nada e clamping
davam o mesmo resultado; a partir de agora nao dariam mais.

**`WeeklyReinforcement.IsResolved(dailies)`/`Weekly.HasPendingWeeklyReinforcement()` (Fase 15) -
so leitura, nao mudam a logica de disparo existente (Fase 4).** Um `WeeklyReinforcement` (2+ dias
fracos) esta "atendido" quando toda Daily fraca que o disparou (`WeakDailyIds`) ja tem sua Daily
de reforco (`Daily.ReinforcementDailyId`) com `Status == Completed`. `WeeklyReinforcement` nao
navega pra `Daily` diretamente (so guarda `Guid`s) - `IsResolved` recebe a colecao `Weekly.Dailies`
de quem chama como parametro. Usado so pro indicador visual "Revisao semanal disponivel"
(`WeeklyReinforcementBadge`, sem bloquear nada).

**Conta-giros de penalidade (Fase 15) - sem node Figma.** O "conta-giros" nunca apareceu desenhado
no inventario original de telas - reaproveitada a linguagem visual ja estabelecida (`ProgressBar`,
Fase 8: trilho + preenchimento arredondado), so com a cor subindo por faixa de risco em vez de uma
tonalidade fixa por chamador (`PenaltyGauge`, `components/gamification/`): neutro (0) -> amarelo
(1) -> laranja (2, `--color-project`) -> vermelho (limite atingido, `--color-alert`). Alimentado
pelo `PenaltyPoints`/`PenaltyThreshold` que ja vem no `DailyStateDto` - nenhum dado novo do
backend so pra isso, so exibicao.

### Score de Estudo e Ranking (Fase 16)

Diferenca fundamental de Gems: Gems recompensam CONSISTENCIA (concluir - Fase 14), Score
recompensa QUALIDADE (o quao bem). Um usuario pode ter Gems altas (estuda todo dia) e Score baixo
(entende mal), e vice-versa - as duas metricas convivem sem se misturar.

**Composicao (tudo calculado sob demanda, nunca persistido - mesmo padrao ja estabelecido pra
`DailyStatus`/`Weekly.Number` desde a Fase 13a, reforcado explicitamente no prompt desta fase):**

```
Daily.CalculateScore()   = media ponderada de ActivityResponse.Score (tentativa MAIS RECENTE de
                            cada Activity avaliavel) - pesos em EvaluationPolicy.ActivityScoreWeight:
                            VoiceSummary 2x, Roleplay 1.5x, Cloze 1.5x, Quiz/WordMatch 1x.
                            Reading/Video excluidos (sempre 100, ruido artificial). Dailies de
                            reforco (IsReinforcement) SEMPRE null - ja tem recompensa propria em
                            Gems (Bonus de Superacao, Fase 15); contar no Score incentivaria errar
                            de proposito pra "score duplo".

Weekly.CalculateScore()  = 0.7 * media(Daily.CalculateScore() das Dailies originais) +
                            0.3 * WeeklyProject.Score - null enquanto o modulo nao esta completo
                            (mesmo criterio de IsModuleComplete()) - NUNCA um score parcial de
                            semana em andamento (evita rankear quem ainda esta no meio da semana
                            como se tivesse tirado nota zero).

Score do Course (Ranking) = soma cumulativa (snowball) de Weekly.CalculateScore() de cada Weekly
                            completa da Enrollment - so no escopo "course" (ver abaixo).
```

**`WeeklyProject` ganhou `Score`/`Feedback`.** Antes da Fase 16, `WeeklyProject.Evaluate()` nao
tinha parametro nenhum (so aprovar por status). Passou a exigir `Evaluate(int score, string?
feedback)` - `score` (0-100) alimenta 30% do Score da Weekly; `feedback` so armazenado, sem uso em
calculo nenhum. Continua sem UI propria (app nao tem papel de "revisor").

**Fase 21: avaliacao automatica por IA.** `score`/`feedback` deixaram de vir do corpo da requisicao
(nao ha mais chamador humano decidindo a nota) - `EvaluateWeeklyProjectUseCase` busca o conteudo do
repositorio publico via `IGitHubService.GetContentSnapshotAsync` (Git Trees API recursiva + leitura
de cada blob - o codigo de verdade, nao so nomes de arquivo/README; filtrado por extensao e
limitado em quantidade/tamanho pra caber no prompt, ver `GitHubService.CodeExtensions`/`MaxFiles`/
`MaxTotalChars`) e pede pro Groq (`IProjectEvaluationService`/`GroqProjectEvaluationService`, port a
parte de `IContentEvaluationService` por ter prompt proprio) comparar contra
`WeeklyTemplate.WeeklyProjectSpecText`. `POST /api/weeklies/{weeklyId}/project/evaluate` (voltou a
ser `POST` sem corpo, era `PUT {score,feedback}` na Fase 16) - so funciona se `SubmissionUrl` for
um repositorio GitHub (parseado por `GitHubUrlParser`, compartilhado com `SubmitPublicationUseCase`);
outros formatos (ex: link do LinkedIn) nao tem conteudo pra IA analisar.

**Ranking - 3 recortes, "Weekly"/"Monthly" por POSICAO no curriculo, nao calendario real
(decisao confirmada com o usuario).** Como cada Course tem 1 curriculo compartilhado mas cada
Enrollment se matricula em dias diferentes, "a semana atual" de um aluno pode cair numa data bem
diferente da de outro - comparar por posicao relativa (ex: "semana 1 de cada um") e o que faz um
ranking justo, sem exigir nenhuma logica de corte por calendario:

- `course`: soma TODAS as Weeklies completas da Enrollment (snowball completo, sem depender de
  posicao nenhuma) - o unico recorte "definitivo".
- `monthly`: soma as Weeklies completas que pertencem ao MESMO Monthly da "Weekly atual" da
  Enrollment.
- `weekly`: so o Score da "Weekly atual" da Enrollment.
- **"Weekly atual"** (`GetCourseRankingUseCase.ResolveCurrentWeekly`): a de maior `Number` que ja
  tem ao menos 1 `Daily` datada em hoje-ou-antes (mesmo criterio de "hoje" que `GetTodayUseCase`/
  `EvaluateDailyAccess` usam no resto do app) - cai pra Weekly de menor Number se nenhuma comecou
  ainda (defensivo).
- **Weekly incompleta conta como `0` no ranking (nunca `null`)** - unica excecao deliberada ao
  "nunca mostrar score parcial": um ranking PRECISA de um numero ordenavel; "ainda nao pontuou
  neste recorte" e razoavelmente `0` aqui, diferente do aviso que vale pras telas de progresso do
  proprio usuario (`Weekly.CalculateScore()` continua `null` em qualquer outro contexto).

**`GetCourseRankingUseCase`**: busca todas as `Enrollment` do Course (`IEnrollmentRepository.
GetByCourseIdAsync`, novo), calcula o Score de cada uma no recorte pedido, ordena decrescente
(empate: quem matriculou primeiro), devolve os 10 primeiros + a posicao real do usuario chamador
(mesmo se fora do top 10 - `CurrentUserEntry` so e `null` se o chamador nao tem Enrollment neste
Course). `ComputeScore`/`ResolveCurrentWeekly`/`RankEntries` sao `internal static` e testados
direto, sem repositorio nenhum (mesmo padrao de `SubmitActivityResponseUseCase.ResolveScore`).

**Tela: `RankingPage` (Fase 16, tela 13 do inventario original - finalmente ganha funcao real).**
Ancorada em `CourseDetailPage` ("🏆 Ver Ranking"), de proposito - o Documento Mestre original ja
dizia "ranking fica ancorado na visualizacao global do Course, pra nao distrair o aluno durante a
Daily". `/start?course=&ranking=1` (mais um flag na query string do `/start`, mesmo padrao de
`?project=`).

### Marketplace de Cosmeticos, Troféus/Badges e Indicação (Fase 17)

Fecha o ciclo economico da gamificacao - Gems (Fase 14) finalmente tem onde ser gastas. Sem node
Figma validado pra "Loja de Cosmeticos"/"Perfil — Conquistas" ainda (confirmado com o usuario) -
cor por raridade (Comum=cinza, Raro=azul, Epico=roxo) como placeholder visual, sem ilustracao
nenhuma, mesma paleta escura/neon ja estabelecida.

```
Focadu.Domain.Cosmetics
CosmeticItem (Name, Slot, Rarity, PriceGems, AssetUrl?, IsAnimated=false) - catalogo fixo, seed
UserCosmeticInventory (UserId, CosmeticItemId, AcquiredAt) - posse permanente, "sem usar e perder"
UserEquippedCosmetics (UserId, EquippedFrameId?, EquippedNameColorId?, EquippedBannerId?) - 1:1
                        com User, lazy - Equip(slot, itemId) so sobrescreve o campo do slot
                        (desequipa o anterior automaticamente, sem passo separado)

Focadu.Domain.Referrals
Referral (ReferrerUserId, ReferredUserId, CreatedAt, ConfirmedAt?) - Confirm() idempotente
```

**`UserGemBalance.TrySpend`** (novo) - gasto NUNCA mexe nos contadores mensais de cap
(`GemsFromDailiesThisMonth`/etc): caps controlam quanto se GANHA por mes, nao quanto se pode
GASTAR do saldo acumulado - sistemas independentes de proposito.

**Marketplace - toda acao devolve o catalogo inteiro recalculado.** `GetMarketplaceCatalogUseCase`
monta `MarketplaceCatalogDto` (Owned/Equipped ja resolvidos por item) e e reaproveitado por
`Purchase`/`Equip`/`UnequipCosmeticItemUseCase` - cada um so muda o estado e delega a leitura de
volta, pra nunca duplicar a montagem do DTO em 4 lugares. `PurchaseCosmeticItemUseCase` reaproveita
`GamificationCreditor.GetOrCreateGemBalanceAsync` (Fase 14) - mesmo criterio de "so cria a linha
quando precisa mexer nela de verdade".

**Sistema de Indicacao - confirmado so na matricula, nunca no registro.** Todo `User` ganha um
`ReferralCode` unico (8 caracteres, alfabeto sem `0/O/1/I` pra evitar confusao visual), gerado
lazy na 1a consulta (`GetReferralInfoUseCase`, unicidade checada contra o repositorio antes de
atribuir). `POST /api/auth/register` aceita `referralCode` opcional - se corresponder a um User de
verdade, cria um `Referral` AINDA NAO confirmado (codigo invalido/de ninguem so e ignorado,
silenciosamente, nunca bloqueia o registro). A confirmacao de verdade (`ConfirmedAt`) so acontece
em `EnrollUserInCourseUseCase` - prova de uso real (o indicado de fato se matriculou), nao so
cadastro vazio. `/login?ref=CODIGO` (deep link) pula a `LoginPage` direto pra aba de registro e
preenche `referralCode` automaticamente.

**Troféus/Badges - tudo calculado sob demanda, nada persistido** (mesmo principio ja usado desde a
Fase 13a pra `DailyStatus`/`Weekly.Number`). `GetUserBadgesUseCase` le `UserStreak.LongestStreak`,
conta `Weekly.IsPerfect()` do historico (todas as Enrollments do usuario), indicacoes confirmadas
(`Referral.ConfirmedAt != null`) e posicao de registro (`IUserRepository.
IsAmongFirstRegisteredAsync`, ordem total deterministica por `(CreatedAt, Id)` pra nunca empatar
ambiguamente). O nucleo (`ComputeBadges`) e `internal static`, testado direto com os 4 numeros ja
resolvidos - mesmo padrao de `SubmitActivityResponseUseCase.ResolveScore`/`GetCourseRankingUseCase.
ComputeScore`. 5 badges, `code` estavel (`streak_7`/`streak_30`/`easy_weekly`/`embaixador`/
`founder`) - label/icone/descricao sao so apresentacao no frontend (`BadgeGrid`).

**Onde Badges/ReferralCard moram.** `/conquistas` era rota propria (`AchievementsPage`) nesta fase -
virou a aba "Conquistas" do Perfil na Fase 18 (`/conquistas` agora so redireciona).
`MarketplacePage` (`/loja`) acessivel clicando no `GemBadge` do header do `StartDashboard` (ficou
clicavel nesta fase).

**Aplicacao visual dos cosmeticos equipados** ficou pra Fase 18 (cor do nome no Ranking, moldura no
avatar do header) - esta fase so constroi comprar/equipar/guardar estado.

### Perfil, 3 Abas (Fase 18)

Fase de consolidacao - nenhum sistema novo, so compoe dado que ja existia (`GetGamificationSummaryUseCase`/
`GetUserBadgesUseCase`/`GetReferralInfoUseCase`/`GetMarketplaceCatalogUseCase`/`User.Interests`,
Fases 14-17). `/perfil`, 3 abas via query string `?tab=info|customizacao|conquistas` (default
`info` - mesmo padrao de `/start?weekly=`).

**Sem endpoint consolidado novo** (`GET /api/users/me/profile-summary` era opcional no prompt) -
`ProfilePage` faz `Promise.all([getGamification, getMarketplaceCatalog])` pro cabecalho, cada aba
busca o resto sozinha (`InformationTab` cursos/ranking, `ConquestsTab` badges/indicacao) - mesmo
padrao ja usado em `StartDashboard`/`AchievementsPage`, mais simples que orquestrar isso no backend
pra uma fase que e so composicao de leitura.

**`UserDto` ganhou `Interests`/`AdditionalProfileNotes`** (Fase 18) - a aba Informacoes le direto do
`user` do `AuthContext` (ja carregado via `GET /api/auth/me`), sem precisar de uma chamada nova.
`PUT /api/users/me/profile` (`CompleteProfileUseCase`) ja aceitava ser chamado de novo desde a Fase
13 (sem guarda de "so uma vez") - so faltava UI de edicao: `ProfileInterviewPage` ganhou `?edit=1`
(pre-popula com o que ja foi salvo, volta pro `/perfil` em vez de `/selecionar-curso` ao salvar, em
vez de virar uma tela nova).

**Fase 21: `Interests`/`AdditionalProfileNotes` finalmente usados em prompt de IA.** Desde a
Fase 13 o comentario em `User.cs` dizia "uso automatico em prompts de IA fica pra uma fase futura" -
essa fase e o primeiro uso: `GetCuratedContentUseCase`, ao servir uma leitura (`Reading` com
`BodyText`), gera (via `IAnalogyGenerationService`/`GroqAnalogyGenerationService`, port a parte pelo
mesmo motivo de `IProjectEvaluationService`) 1 analogia POR SECAO do texto, conectando aquela secao
especifica a um interesse do aluno - exatamente a "ancora pra analogia" que `CURADORIA.md` previa.
Nao 1 analogia so cobrindo o texto inteiro (opcao mais simples, descartada durante o desenvolvimento
desta mesma fase - ficava perdida no fim de leituras longas, menos intuitivo que reexplicar cada
secao com a analogia dela): `GetCuratedContentUseCase.SplitIntoSections` divide o Texto Cru por titulo
`"#### ..."` (convencao 100% consistente nos 20 `dia-N.json` ja curados - `### Titulo` geral + N
subsecoes `####`), manda todas as N secoes numa unica chamada Groq (JSON mode, pede exatamente N
analogias na mesma ordem - nunca menos/mais, formato errado vira `ExternalServiceException`), e
`ReadingActivity.tsx` (frontend, `splitReadingSections` espelhando a mesma regex) intercala cada
secao com sua analogia (card "💡 PRA VOCÊ" logo abaixo) - a preamble (titulo geral + paragrafo de
abertura) fica sem analogia. Cacheado em `PersonalizedAnalogy` (aggregate com colecao owned
`AnalogySection`, `SectionIndex`+`Text` cada, tabela `PersonalizedAnalogySections` - mesmo padrao de
`WeeklyReinforcement`/`WeakDailyLink`) por `UserId`+`CuratedContentId` unico - gerado uma vez, nunca
reavaliado mesmo se o aluno editar os interesses (ou a leitura for editada, mudando o numero de
secoes) depois (mesmo principio de "nao reescrever historico" de `WeeklyProject.Feedback`). Sem
interesse nenhum cadastrado (perfil ainda nao completado, ou completado so com texto livre vazio -
`CompleteProfile` aceita isso), ou fora do tipo `Reading`, simplesmente nao gera nada - nunca
bloqueia a leitura em si; falha do Groq na geracao tambem so degrada pra "sem analogias dessa vez".

**`EquippedNameColor` no Ranking - token estavel, nao hex.** `GetCourseRankingUseCase` resolve, por
Enrollment, o `Name` do `CosmeticItem` equipado no slot `NameColor` (ex: "Verde Neon") e devolve em
`RankingEntryDto.EquippedNameColor`. O frontend mapeia token -> cor de verdade
(`lib/cosmeticStyle.ts`, `nameColorClass`) - mesmo padrao ja estabelecido de `BadgeDto.code` ->
label/icone (`BadgeGrid`) e `CosmeticRarity` -> swatch (`CosmeticItemCard`). Decisao: nenhum campo
de cor/hex foi adicionado ao dominio (`CosmeticItem` continua so com `Name`/`Slot`/`Rarity`) -
adicionar um "de verdade" seria inventar dado que a arte real (`AssetUrl`) ainda nao define.

**Avatar/moldura - so um placeholder, de proposito.** Escopo controlado (confirmado no prompt): sem
upload de foto/avatar de verdade. `EquippedFramePreview` (`components/`) mostra as iniciais do nome
num circulo, com um anel colorido por raridade (`RARITY_STYLE`, mesma cor do swatch da loja) quando
uma Moldura esta equipada - reaproveitado no cabecalho do Perfil (`ProfileHeader`) e no nav global
(`HeaderUserBadge`, unico jeito de chegar em `/perfil` pela UI - antes o app nao tinha nenhum lugar
mostrando o nome do usuario logado fora do Perfil).

**Divergencias deliberadas do Figma (3 nodes conferidos - Informacoes/Customizacao/Conquistas)** -
nenhuma tem dado real por tras, mesmo criterio ja usado em outras telas (ver `OnboardingWelcomePage`):
upload de foto, "Apelido/Username", "Sua frase de guerra" e toda a secao "Analogias de Aprendizado"
(preview de IA) nao existem no dominio - omitidos. Nivel/XP, "Sessoes completas" e Platinas por
curso (troféu por 100% de conclusao) tambem nao existem - confirmado fora de escopo ate Squad/PvP
existir (mesma decisao ja tomada nas fases anteriores pra Elo/Patente). "Recorde de Streak" do
mockup virou dado real (`GamificationSummaryDto.longestStreak`). O 4o grupo de customizacao do
mockup ("Avatar", a ilustracao do personagem) nao existe como slot compravel - so os 3 slots reais
de `CosmeticSlot` (Moldura/Cor do Nome/Banner) aparecem na aba Customizacao.

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
`DailyActivity` que tiveram ao menos uma resposta reprovada na Daily de origem - desde a Fase 13,
essas copias moram num `DailyTemplate` "sintetico" (`WeeklyTemplateId = null`, ver "Template vs
Instancia" acima), nao mais direto na Daily. "Dia fraco" = `Daily.IsWeakDay` (`PenaltyPoints >=
DailyPenaltyThreshold`). Ao acumular `WeeklyWeakDaysThreshold` dias fracos ainda nao cobertos por
um `WeeklyReinforcement` anterior, `Weekly.TriggerWeeklyReinforcement` cria o registro
correspondente.

### Publicacao publica e bloqueio de modulo (Fase 11)

Implementa a filosofia central do produto (Documento Mestre, Secao 2.3 - "prova de evolucao
publica"): completar uma Weekly nao basta mais, e preciso publicar prova disso (LinkedIn ou
GitHub) antes da proxima Weekly liberar.

- **`Weekly.IsModuleComplete()`**: todos os Dailies **originais** (`!IsReinforcement`) com
  `Status == Completed` **e** `WeeklyProject.Status == Evaluated`. Dailies de reforco ficam de
  fora de proposito - um reforco pendente nao deveria travar quem ja terminou o conteudo
  original da semana.
- **`Weekly.RequiresPublicationToUnlock()`**: `IsModuleComplete() && Publication?.Status !=
  Validated`. `Weekly.Publication` so existe depois da primeira acao do usuario no modal
  (`StartPublication()`, idempotente) - antes disso e `null`, e o front interpreta isso como
  `Pending` quando o modulo ja esta completo (`GetPublicationStatusUseCase`).
- **Bloqueio em si vive em `StartOrResumeDailyUseCase`** (Application), nao em `Weekly` -
  `Weekly.EvaluateDailyAccess` so enxerga a propria Weekly, nunca as irmas. O use case busca as
  Weeklies da mesma `EnrollmentId` (`IWeeklyRepository.GetByEnrollmentIdAsync` - trocado de
  `GetByMonthlyIdAsync` na Fase 13), acha a de `Number - 1` e, se ela
  `RequiresPublicationToUnlock()`, lanca `modulo_bloqueado_por_publicacao` (409) antes de chamar
  `Weekly.StartOrResumeDaily`. **Escopo: so a Weekly anterior dentro da mesma Enrollment** - a
  troca pra Enrollment (Fase 13) fechou de graca a limitacao antiga ("nao atravessa Monthlies"):
  uma Enrollment cobre o Course inteiro, nao um Monthly especifico.
- **Acesso a conteudo ja visto nunca e bloqueado** - o bloqueio so entra no caminho de
  `StartOrResumeDailyUseCase` (comecar/retomar uma Daily nova); `Weekly.EvaluateDailyAccess`
  (Replay/ReadOnly de Dailies passadas) nunca passa por essa checagem.
- **`ModulePublication`** (entidade, 1:1 com `Weekly`): `GenerateDraft(text)` (rascunho da IA),
  `Submit(platform, url)` (`Status -> Submitted`; lanca `publicacao_ja_validada` **so** se ja
  `Validated` - depois de `Failed` e re-chamavel, e como um retry reseta `ValidationError`),
  `MarkValidated()`/`MarkFailed(reason)` (exigem `Status == Submitted`).
- **`EvaluateWeeklyProjectUseCase`** (novo, Fase 11): `WeeklyProject.Evaluate()` existia desde a
  Fase 1 sem endpoint (pendencia documentada desde a Fase 7) - sem ele, `IsModuleComplete()`
  nunca seria `true` de verdade. `POST /api/weeklies/{weeklyId}/project/evaluate`, so backend,
  sem UI (nao ha papel de "revisor" neste app de usuario unico).
- **Geracao do rascunho de LinkedIn** (`GenerateLinkedInDraftUseCase` + `GroqDraftGenerationService`):
  usa `Weekly.Theme` (ou `Title`) + ate 3 titulos de `CuratedContent` (`Reading`/`Video`) como
  contexto - **nao** usa `AiFeedback` de nenhuma `ActivityResponse` de proposito (evita vazar o
  resultado de uma tentativa especifica num post publico). Groq sem JSON mode (texto livre, tom
  pessoal em primeira pessoa).
- **Fluxo GitHub** (`GetGitHubRepositoriesUseCase`, `CommitModuleSummaryUseCase`,
  `GitHubService`): lista repos publicos, cria/reusa um repo, commita um resumo Markdown
  (`MODULO-{n}.md`) via `PUT /repos/{owner}/{repo}/contents/{path}`. O commit bem sucedido *e* a
  prova - `CommitModuleSummaryUseCase` ja chama `Submit`+`MarkValidated` na mesma operacao, sem
  round-trip de validacao redundante depois.
- **Validacao de LinkedIn e so estrutural, decisao permanente (Fase 21+), nao e mais pendencia**:
  regex (`linkedin.com/(posts|feed/update)/...`) confirma que a URL tem formato de post, nunca que
  o post fala sobre o modulo de verdade. Avaliado e descartado validar conteudo via API oficial do
  LinkedIn - ao contrario de Google/GitHub OAuth, ler post de terceiro exige aprovacao no programa
  de parceiros da LinkedIn (processo de negocio, nao self-serve), desproporcional pra um app de
  estudo pessoal solo. Fluxo GitHub continua validando de verdade (`IGitHubService.
  GetRepositoryAsync`, acima) porque a API do GitHub e publica e gratuita pra isso.
- **Um unico `SubmitPublicationUseCase` cobre LinkedIn e GitHub** (nao ha
  `ValidatePublicationUseCase` separado) - GitHub valida via `IGitHubService.GetRepositoryAsync`
  (owner/repo extraidos da URL, exige `IsPrivate == false`); retry e so resubmeter a mesma URL
  pelo mesmo endpoint, nao precisa de logica nova.
- **GitHub nunca foi testado contra a API real** (decisao explicita do usuario na Fase 11, ver
  `docs/fase-11/resumo-implementacao-fase-11.md`) - verificado via `page.route()` do Playwright
  mockando as chamadas que tocariam GitHub de verdade. Revisado por leitura de codigo nesta fase
  (achou e corrigiu um bug real de `sha` ausente no commit - ver "Como configurar o token do
  GitHub" acima) - validacao ao vivo continua pendente, checklist na mesma secao.

## Superficie da API (Focadu.Api)

Desde a Fase 2, `Focadu.Api` tem endpoints REST reais (nao mais so os 4 minimos de prova de
composicao da Fase 1). Todos sob `/api`, alem de `GET /health`:

**Desde a Fase 13, quase todo endpoint exige sessao (`.RequireAuthorization()`)** - marcado 🔒
na tabela. Os 🔒 que operam sobre uma instancia especifica (`weeklyId`/`dailyId`) tambem **filtram
pelo dono** (via Enrollment do `userId` do JWT) direto na query do repositorio - um id de outro
usuario sempre vira 404 igual "nao existe", nunca revela que aquele recurso existe mas nao e seu.
So `POST /api/auth/register`/`login`/`logout` ficam de fora (sao o proprio bootstrap da sessao).

| Metodo | Rota | Caso de uso | Sucesso |
|---|---|---|---|
| POST | `/api/auth/register` | `RegisterUserUseCase` (Fase 12) | 201, seta cookie `focadu_auth`, 409/400 (ver "Autenticacao") - Fase 17: aceita `referralCode` opcional |
| POST | `/api/auth/login` | `LoginUserUseCase` (Fase 12) | 200, seta cookie, 401 `credenciais_invalidas` |
| POST | `/api/auth/logout` | - (limpa o cookie direto no endpoint) | 200 |
| 🔒 GET | `/api/auth/me` | `GetCurrentUserUseCase` (Fase 12) | 200, 401 `nao_autenticado` - Fase 18: `UserDto` ganhou `interests`/`additionalProfileNotes` (aba Informações do Perfil le direto daqui, sem endpoint novo) |
| 🔒 PUT | `/api/users/me/profile` | `CompleteProfileUseCase` (Fase 13) | 200 - Entrevista de Perfil (Onboarding); sem guarda de "so uma vez", Fase 18 reaproveita pra editar depois |
| 🔒 GET | `/api/users/me/gamification` | `GetGamificationSummaryUseCase` (Fase 14) | 200 (`GamificationSummaryDto`) - nunca 404, `UserGemBalance`/`UserStreak` sao lazy |
| 🔒 GET | `/api/courses/available` | `GetAvailableCoursesUseCase` (Fase 13) | 200 - so cursos `Active` em que o usuario ainda nao esta matriculado |
| 🔒 POST | `/api/enrollments` | `EnrollUserInCourseUseCase` (Fase 13) | 201, 409 `ja_matriculado` - gera Weekly/Daily/WeeklyProject-instancia pra todo o curriculo do curso |
| 🔒 GET | `/api/enrollments/me` | `GetMyEnrollmentsUseCase` (Fase 13) | 200 (lista - hoje no maximo 1) |
| 🔒 GET | `/api/courses` | `ListCoursesUseCase` | 200 |
| 🔒 GET | `/api/courses/{courseId}` | `GetCourseDetailUseCase` | 200, 404 se nao existe/usuario nao matriculado (Fase 8: `WeeklyOverviewDto.Days` traz status por dia, pro mini-grid de `CourseDetailPage`) |
| 🔒 GET | `/api/courses/{courseId}/curriculum` | `GetCourseCurriculumUseCase` (Fase 13b) | 200, 404 - curriculo (Course -> Monthly -> WeeklyTemplate), sem exigir matricula; so `/admin/conteudo` usa isso |
| 🔒 GET | `/api/weeklies/{weeklyId}` | `GetWeeklyDetailUseCase` | 200, 404 se nao existe/nao e do usuario - Fase 15: `WeeklyDetailDto` ganhou `HasPendingWeeklyReinforcement` |
| 🔒 GET | `/api/weekly-templates/{id}` | `GetWeeklyTemplateDetailUseCase` (Fase 13b) | 200, 404 - WeeklyTemplate (curriculo), sem exigir matricula; so `/admin/conteudo` usa isso |
| 🔒 GET | `/api/dailies/{dailyId}` | `GetDailyStateUseCase` | 200, 404/400/409 (ver abaixo) |
| 🔒 GET | `/api/today` | `GetTodayUseCase` | 200, 404/409 (ver "GET /api/today" abaixo) |
| 🔒 POST | `/api/dailies/{dailyId}/start` | `StartOrResumeDailyUseCase` | 200 |
| 🔒 POST | `/api/dailies/{dailyId}/activities/{activityId}/responses` | `SubmitActivityResponseUseCase` | 201 (cria uma nova `ActivityResponse`) |
| 🔒 POST | `/api/dailies/{dailyId}/activities/{activityId}/responses/audio` | `SubmitVoiceSummaryResponseUseCase` (Fase 5) | 201, `multipart/form-data`, so pra `VoiceSummary` |
| 🔒 POST | `/api/dailies/{dailyId}/complete` | `CompleteDailyUseCase` | 200 (`CompleteDailyResult`, ver abaixo - Fase 14: ganhou `GemsEarned`/`StreakAfterCompletion`; Fase 15: ganhou `WasReinforcementBonus`) |
| 🔒 GET | `/api/curated-content/{id}` | `GetCuratedContentUseCase` (Fase 7) | 200, 404 - exige login, mas nao filtra por usuario (curriculo compartilhado). Fase 21: resposta ganhou `personalizedAnalogies` (array, 1 por secao "####" do texto - so quando `Reading` + usuario com interesses cadastrados, ver secao acima) |
| 🔒 POST | `/api/curated-content` | `CreateCuratedContentUseCase` (Fase 4) | 201, 400/404 - Fase 13: campo `weeklyTemplateId` (era `weeklyId`) |
| 🔒 PUT | `/api/curated-content/{id}` | `UpdateCuratedContentUseCase` (Fase 4) | 200, 400/404 |
| 🔒 POST | `/api/weeklies/{weeklyId}/project/submit` | `SubmitWeeklyProjectUseCase` (Fase 7) | 200, 400/404 - `WeeklyProject.Submit` existia desde a Fase 1, so faltava endpoint |
| 🔒 POST | `/api/weeklies/{weeklyId}/project/evaluate` | `EvaluateWeeklyProjectUseCase` (Fase 11) | 200, 400/404 - `WeeklyProject.Evaluate` existia desde a Fase 1, so faltava endpoint (so backend, sem UI). Fase 16: virou PUT com corpo `{score, feedback}` obrigatorio. Fase 21: voltou a ser POST sem corpo - nota/feedback agora vem da IA (GitHub + Groq, ver secao acima) |
| 🔒 GET | `/api/courses/{courseId}/ranking?scope=` | `GetCourseRankingUseCase` (Fase 16) | 200 (`RankingResultDto`) - `scope` = `weekly`\|`monthly`\|`course`, default `course` se omitido. Fase 18: `RankingEntryDto` ganhou `EquippedNameColor` (Name do cosmetico equipado, nao hex - ver secao abaixo) |
| 🔒 GET | `/api/users/me/badges` | `GetUserBadgesUseCase` (Fase 17) | 200 (`UserBadgesDto`, 5 badges calculados sob demanda) |
| 🔒 GET | `/api/users/me/referral` | `GetReferralInfoUseCase` (Fase 17) | 200 (`ReferralInfoDto`) - gera o `ReferralCode` na 1a consulta |
| 🔒 GET | `/api/marketplace/catalog` | `GetMarketplaceCatalogUseCase` (Fase 17) | 200 (`MarketplaceCatalogDto`) |
| 🔒 POST | `/api/marketplace/purchase` | `PurchaseCosmeticItemUseCase` (Fase 17) | 200 (catalogo recalculado), 404, 409 (`item_ja_possuido`/`gems_insuficientes`) |
| 🔒 POST | `/api/marketplace/equip` | `EquipCosmeticUseCase` (Fase 17) | 200 (catalogo recalculado), 404, 409 (`item_nao_possuido`) |
| 🔒 POST | `/api/marketplace/unequip` | `UnequipCosmeticUseCase` (Fase 17) | 200 (catalogo recalculado) - no-op se nada equipado ainda |
| 🔒 GET | `/api/weeklies/{weeklyId}/publication/status` | `GetPublicationStatusUseCase` (Fase 11) | 200, 404 |
| 🔒 POST | `/api/weeklies/{weeklyId}/publication/draft` | `GenerateLinkedInDraftUseCase` (Fase 11) | 200, 404, 502 (Groq) |
| 🔒 POST | `/api/weeklies/{weeklyId}/publication/github-commit` | `CommitModuleSummaryUseCase` (Fase 11) | 200, 400/404, 502 (GitHub) |
| 🔒 POST | `/api/weeklies/{weeklyId}/publication/submit` | `SubmitPublicationUseCase` (Fase 11) | 200, 400/404 - LinkedIn valida por regex, GitHub chama a API real |
| 🔒 GET | `/api/github/repositories` | `GetGitHubRepositoriesUseCase` (Fase 11) | 200, 502 (GitHub) - exige login, sem filtro por usuario (1 token global do GitHub) |

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
`DailyStateMapper.ToActivityDto` (`hasAnswered = daily.Responses.Where(r => r.ActivityId ==
activity.Id).Any()` desde a Fase 13 - `Responses` mora em `Daily`/instancia agora, nao mais em
`DailyActivity`/template, ver "Template vs Instancia"), aplicado aos tres campos. Isso fecha a
lacuna identificada na Fase 2 (gabarito visivel no DevTools antes de responder).

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
so que agora por usuario em vez de global.

### Score no servidor para todo tipo de atividade (Fase 3 + Fase 4 + Fase 5)

`POST .../responses` **nao tem mais campo `Score`** - desde a Fase 4, o Score de qualquer tipo de
atividade e sempre calculado no servidor, nunca aceito pronto do cliente:

| Tipo | Campo do request | Como o Score e calculado |
|---|---|---|
| `Quiz` / `WordMatch` | `SelectedOptionId` | 100 se a opcao existe nessa atividade e `IsCorrect = true`, senao 0 |
| `Cloze` + `AnswerMode.MultipleChoice` | `SelectedOptionId` | Mesmo mecanismo de Quiz/WordMatch (reaproveitado) |
| `Cloze` + `AnswerMode.FreeText` | `Transcript` | 100 se `Transcript.Trim()` bate com `ExpectedAnswer.Trim()` (case-insensitive), senao 0 - **ponytail**: comparacao textual simples, sem IA |
| `Roleplay` | `SelectedRoleplayNodeId` | A partir do `TerminalQuality` do node terminal alcancado (ver tabela abaixo) - o node precisa ter `IsTerminal = true` |
| `VoiceSummary` | Arquivo de audio (`POST .../responses/audio`, endpoint separado - ver "Resumo falado por voz" abaixo) | Resultado de `IContentEvaluationService.EvaluateAsync` (Groq, Fase 5) |
| `Reading` / `Video` (Fase 7) | Nenhum (corpo vazio) | Sempre 100 - sem avaliacao, concluir a etapa e o proprio "acerto" (nunca reprova, nunca soma `PenaltyPoints`) |

Os 4 primeiros tipos sao resolvidos sincronamente em
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
| `selected_option_id_obrigatorio` | Quiz/WordMatch/Cloze(MultipleChoice) sem `SelectedOptionId` no corpo |
| `selected_option_id_invalido` | `SelectedOptionId` nao corresponde a uma `QuizOption` desta atividade |
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
   `ContentEvaluationResult(Score, Feedback)`. O modelo original
   escolhido na Fase 5 (`llama-3.3-70b-versatile`) saiu do catalogo da Groq antes mesmo do
   primeiro teste com chave real - corrigido pra `openai/gpt-oss-120b` nessa mesma validacao (ver
   `ponytail:` no codigo de `GroqContentEvaluationService` - catalogo de modelos da Groq muda com
   frequencia, checar `GET /v1/models` se `model_not_found` aparecer de novo).
5. Grava a resposta e checa reforco via `ActivityResponseRecorder` (mesmo passo compartilhado com
   `SubmitActivityResponseUseCase`) - `Transcript` = transcricao, `AiFeedback` = feedback da IA,
   `Score` = nota da IA, `Justification` = nulo (nao se aplica a VoiceSummary).

Prompt de avaliacao (formato confirmado com o Falves antes de implementar - decisao registrada em
`docs/fase-5/resumo-implementacao-fase-5.md`): 1 chamada, JSON mode, pedindo 1 nota unica de 0 a
100 que ja pondera "conteudo correto" e "clareza da explicacao" juntos, mais 1 feedback curto em
PT-BR. Texto exato dos prompts (sistema + usuario) em
`Focadu.Infrastructure.Services.GroqContentEvaluationService`.

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
| `modulo_bloqueado_por_publicacao` | 409 | `StartOrResumeDailyUseCase` quando a Weekly anterior (mesmo Monthly) ainda `RequiresPublicationToUnlock` (Fase 11) |
| `publicacao_ja_validada` | 409 | `ModulePublication.Submit` chamado depois que a publicacao ja esta `Validated` (Fase 11) |
| `credenciais_invalidas` | 401 | `LoginUserUseCase` - email nao existe OU senha errada (nunca diferenciado, ver "Autenticacao") (Fase 12) |

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

### Autoria de conteudo curado (Fase 4, tela de UI na Fase 6, virou curriculo na Fase 13)

`POST /api/curated-content` e `PUT /api/curated-content/{id}` sao os **unicos** endpoints de
autoria de conteudo da Api - Course/Monthly/WeeklyTemplate/DailyTemplate/DailyActivity continuam
so via seed (ver "Fora de escopo"), porque a estrutura muda com pouca frequencia; o que muda toda
semana e o conteudo curado (leituras/videos) em si.

- `POST`: corpo `{ weeklyTemplateId, type, title, externalUrl?, bodyText? }` (campo renomeado de
  `weeklyId` na Fase 13 - `CuratedContent` e curriculo agora, vinculado a uma `WeeklyTemplate`,
  nunca a uma Weekly-instancia de usuario nenhum). `type` e string (`"Reading"/"Video"`,
  case-insensitive), mais legivel pra curadoria manual do que o numero que a Api usa nas respostas
  de leitura. `weeklyTemplateId`/`title` sao validados em `Program.cs` (formato de request,
  incondicional); `type` invalido e falta de `externalUrl`/`bodyText` sao validados dentro do caso
  de uso (`CreateCuratedContentUseCase`), porque dependem de logica de dominio/enum.
- `PUT`: corpo `{ title, externalUrl?, bodyText? }` - `Type`/`WeeklyTemplateId` nunca aparecem
  (nunca mudam depois de criado). Busca o `CuratedContent` direto por Id
  (`IWeeklyTemplateRepository.GetCuratedContentByIdAsync`, novo na Fase 13 - sem carregar o grafo
  completo da WeeklyTemplate) e chama `CuratedContent.Update(...)`.
- Codes: `weekly_template_id_obrigatorio` (renomeado de `weekly_id_obrigatorio`),
  `titulo_obrigatorio` (400, `Program.cs`), `tipo_invalido`, `conteudo_obrigatorio` (400, caso de
  uso), `semana_nao_encontrada`, `conteudo_nao_encontrado` (404).
- **Resolvido na Fase 13b: `/admin/conteudo` (frontend) voltou a funcionar.** A quebra da Fase
  13a (`GET /api/weeklies/{weeklyId}`/`GET /api/courses/{id}` viraram instancia, exigem
  Enrollment) foi consertada por 2 endpoints TEMPLATE novos, sem exigir matricula:
  `GET /api/courses/{courseId}/curriculum` (Course -> Monthly -> WeeklyTemplate, so
  id/number/title/theme) e `GET /api/weekly-templates/{id}` (`WeeklyTemplateDetailDto`, com
  `curatedContents` - reaproveita `IWeeklyTemplateRepository.GetByIdAsync`, que
  `CreateCuratedContentUseCase` ja usava). `AdminContentPage.tsx` passou a navegar com
  `WeeklyTemplateId` (nunca mais id de Weekly-instancia), e `createCuratedContent` no client
  passou a mandar `weeklyTemplateId` no corpo (era `weeklyId` - mismatch silencioso com o contrato
  do backend desde a Fase 13a). Ver `docs/fase-13b/resumo-implementacao-fase-13b.md`.
- **UI (`/admin/conteudo`, Fase 6)**: `frontend/src/routes/AdminContentPage.tsx` - mesmo padrao de
  navegacao por query string do `/start` (curso -> semana), lista o conteudo da semana com
  indicador Completo/Pendente (`externalUrl || bodyText` preenchido), formulario unico serve
  criacao e edicao (`Type` fixo na edicao - nunca muda depois de criado). Sem autenticacao, sem
  polimento visual alem do padrao de `/start`. Usada na pratica pra carregar o texto completo das
  4 leituras (Fase 4) e os 4 SVGs de diagrama (Fase 6) da Semana 1 por cima dos placeholders do
  seed.

### CORS (Fase 3)

A Api libera `http://localhost:5173` (e `127.0.0.1:5173`) via `AddCors`/`UseCors`, para o
frontend Vite conseguir chamar a Api em dev - sem isso o navegador bloqueia toda chamada (portas
diferentes contam como origens diferentes, mesmo os dois em `localhost`). Hardcoded e so-dev de
proposito (unico usuario-teste, sem ambiente de deploy ainda) - ver pontos abertos.

## Seed de conteudo (Fase 3, estendido na Fase 4, so template desde a Fase 13)

Course/Monthly/WeeklyTemplate/DailyTemplate/DailyActivity nao tem endpoint de autoria (ver "Fora
de escopo"), entao o unico jeito de popular essa estrutura e via `SeedWebSecurityCourseUseCase`
(`Focadu.Application.Seed`) - idempotente por nome de Course ("Web Security"), monta o grafo
TEMPLATE inteiro em memoria via API publica do dominio e persiste com uma unica chamada a
`ICourseRepository.AddAsync` + `IUnitOfWork.SaveChangesAsync` (o `Add` do EF Core cascateia o
grafo inteiro automaticamente, sem precisar de `IMonthlyRepository`/`IWeeklyTemplateRepository`
separados). `CuratedContent` em si tambem pode ser criado/editado via Api (ver "Autoria de
conteudo curado" acima) - o seed so garante que exista *algo* pra começar. **Fase 13: o seed nao
cria mais nenhuma instancia** (Weekly/Daily-instancia, com datas reais) - isso virou trabalho de
`EnrollUserInCourseUseCase`, disparado quando alguem de fato se matricula (ver "Template vs
Instancia").

Popula a Semana 1 completa do curso "Web Security": 4 Dailies, CuratedContent por dia (texto
completo das 4 leituras carregado via `PUT /api/curated-content/{id}` - Fase 4, nao faz parte do
seed em si), e pelo menos 1 `DailyActivity` de cada tipo distribuida pelos 4 dias - Quiz (todos os
dias), WordMatch (2 termos, Dia 2), Cloze/MultipleChoice + Cloze/FreeText (Dia 3), Roleplay (3
niveis, Dia 4), VoiceSummary (Dia 1, referenciando a leitura "Como a web funciona" - Fase 5) -
alem do `WeeklyProject`. Conteudo completo em `docs/fase-3/resumo-implementacao-fase-3.md`,
`docs/fase-4/resumo-implementacao-fase-4.md` e `docs/fase-5/resumo-implementacao-fase-5.md`.

Acionado via `dotnet run --project src/Focadu.Api -- seed` (checagem de `args` em `Program.cs`,
antes de `app.Run()` - roda e encerra, sem subir o servidor HTTP).

**Fase 21: Dia 1 passou a usar conteudo curado de verdade.** `CuratedDayImporter`
(`Focadu.Application.Seed`, generico por design - o roteiro real tem 60 dias, um metodo `AddDayN`
por dia nao escala) le um `dia-N.json` (schema em `secret/curadoria/CURADORIA.md`, escrito pela
skill `curar-conteudo`) do disco e aplica a uma `WeeklyTemplate`: cria `DailyTemplate`,
`CuratedContent`s e `DailyActivity`s em ordem (`QuizOption`s e o grafo de `RoleplayNode`s
incluidos, resolvido em 2 passadas porque `NodeKey` pode apontar pra um node definido depois no
JSON). `SeedWebSecurityCourseUseCase.AddDay1` chama `CuratedDayImporter.ImportFile` em vez do
placeholder hardcoded que existia (o `TODO` original); acha a raiz do repo subindo diretorios ate
achar `.git` (o seed pode rodar tanto da raiz quanto de `backend/`). Dias 2-4 continuam no
placeholder - so o Dia 1 foi pedido nesta fase, trocar os outros e a mesma 1 linha cada.

## Persistencia (EF Core + Postgres)

**Fase 14: `AddGamification`** - 2a migration desde o squash da Fase 13 (`InitialCreate` +
`AddGamification`), cria `UserGemBalances`/`UserStreaks` (1:1 com `Users`, indice unico em
`UserId`, `OnDelete Cascade`) - mesmo padrao de `Enrollments` (referencia "fraca", sem navegacao
de volta em `User`). Aplicada contra o Postgres de dev existente sem precisar recriar o banco (ao
contrario do squash da Fase 13) - schema so aditivo, nenhuma tabela existente mudou.

**Fase 13: migrations de Fases 1-12 apagadas e squashadas numa unica `InitialCreate` nova** - o
schema mudou demais (renomes de tabela, colunas removidas/adicionadas, tabelas novas) pra um diff
incremental valer a pena; banco recriado do zero (autorizado explicitamente pelo prompt da fase,
sem dado real pra preservar). Historico de decisoes anteriores continua documentado nos
`docs/fase-N/` de cada fase, so a migration em si foi consolidada. Decisoes de design confirmadas
na Fase 1 continuam valendo integralmente (Guid como Id, tabela associativa real para
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

**Bug real: navegacao 1:1 sem `HasOne`, corrigido na Fase 11.** `WeeklyConfiguration` nunca
declarava `HasOne(w => w.Publication).WithOne().HasForeignKey<ModulePublication>(p =>
p.WeeklyId)` (ao contrario de `Project`, que ja tinha o equivalente desde antes). Sem essa
declaracao, `.Include(w => w.Publication)` em `WeeklyRepository.FullGraph()` derrubava
`GET /api/courses/{id}` inteiro com `InvalidOperationException` ("'w.Publication' is invalid
inside an Include operation") - so apareceu ao vivo, carregando um curso de teste (nenhum teste de
unidade cobre repositorio, ver "`Focadu.Tests` so testa dominio puro" nos pontos abertos).
Corrigido adicionando o `HasOne` que faltava + uma segunda migration
(`Fase11ModulePublicationNavigation`, so adiciona a FK que devia existir desde a primeira). **Toda
navegacao 1:1 nova precisa do `HasOne`/`WithOne` explicito na configuration correspondente, nao so
a coluna FK/indice unico** - sem isso o EF Core nem reconhece a propriedade como navegacao.

**Bug real: propriedades pass-through computadas confundem a convencao do EF Core, corrigido na
Fase 13.** `Weekly.Number`/`Title`/`Theme`/`MonthlyId` e `Daily.Activities` viraram getters
computados (`=> Template.Number`, etc. - ver "Template vs Instancia") sem nenhum backing field
proprio. Sem um `Ignore(...)` explicito, a convencao de descoberta do EF Core tentava mapear isso
como propriedade/navegacao normal e falhava no boot com `InvalidOperationException: "No backing
field was found for property 'Daily.Activities'"` - so apareceu tentando `dotnet ef database
drop`/gerar a migration (o `DbContext` precisa ser instanciado pra isso). Corrigido com
`builder.Ignore(w => w.Number)` (e os outros 4) em `WeeklyConfiguration`/`DailyConfiguration`.
**Toda propriedade computada que so faz `=> OutraEntidade.Campo` (sem field proprio) precisa de
`Ignore` explicito** - o EF nunca deveria tentar mapear isso como coluna/navegacao sozinho.

## Groq (transcricao e avaliacao por IA, Fase 5)

Os dois ports que existiam so como stub desde a Fase 1 (`IAudioTranscriptionService`,
`IContentEvaluationService`) agora tem adapter concreto via Groq
(`Focadu.Infrastructure.Services`) - ver "Resumo falado por voz" acima pro fluxo completo. Os
dois usam `HttpClient` tipado (`services.AddHttpClient<TPort, TAdapter>`), base address
`https://api.groq.com/openai/v1/`, timeout de 60s.

### Como configurar a chave da Groq

A chave **nunca** fica hardcoded nem commitada - vem de `Groq:ApiKey` na configuracao do
ASP.NET Core, com 3 formas de prover isso (da mais recomendada pra dev, a de producao/CI):

```bash
# 1. Recomendado em dev: user-secrets (Focadu.Api.csproj ja tem UserSecretsId configurado)
cd backend/src/Focadu.Api
dotnet user-secrets set "Groq:ApiKey" "sua-chave-aqui"

# 2. Alternativa: variavel de ambiente (funciona em qualquer ambiente, inclusive CI/deploy)
export Groq__ApiKey="sua-chave-aqui"   # note o duplo underscore - convencao do ASP.NET Core p/ chaves aninhadas

# 3. Nunca faca isso: colocar a chave em appsettings.json ou appsettings.Development.json -
# esses arquivos sao commitados no Git.
```

Sem a chave configurada, o resto da Api sobe normalmente (diferente da connection string, que
falha o startup se ausente) - so as duas chamadas à Groq falham, com um erro claro
(`groq_api_key_nao_configurada`, 502) em vez de um 401 sem contexto vindo da Groq. Chave obtida em
[console.groq.com](https://console.groq.com).

## GitHub (commit de resumo do modulo, Fase 11)

`IGitHubService` (`Focadu.Infrastructure.Services.GitHubService`) e um adapter via `HttpClient`
tipado cru pra `https://api.github.com/` - **sem pacote Octokit.NET**, mesmo padrao ja usado pro
Groq (`services.AddHttpClient<IGitHubService, GitHubService>(...)`), apesar do prompt da Fase 11
ter dito duas vezes que "Octokit ja estava configurado desde a Fase 1" (afirmacao falsa,
verificada por `grep` antes de implementar - ver `docs/fase-11/resumo-implementacao-fase-11.md`).
Headers fixos: `Authorization: Bearer {token}` (so quando configurado), `User-Agent: Focadu/1.0`
(exigido pela API do GitHub), `Accept: application/vnd.github+json`. Timeout de 20s.

### Como configurar o token do GitHub

Mesmo padrao de 3 formas da chave da Groq acima (user-secrets em dev, variavel de ambiente em
producao/CI, nunca em `appsettings.json`):

```bash
cd backend/src/Focadu.Api
dotnet user-secrets set "GitHub:Token" "seu-token-aqui"      # precisa de escopo de escrita (repo), nao so leitura
```

`GitHubOptions` so tem `Token` - o campo `Username` de quando isso foi escrito nunca foi lido em
lugar nenhum (`GitHubService` sempre recebe `owner` explicito: da propria resposta da API pra
criar/listar repos, ou da URL parseada por `GitHubUrlParser` pra validar/avaliar) - removido nesta
revisao (dead config), um secret a menos pra configurar.

Sem o token configurado, o resto da Api sobe normalmente - so as chamadas que tocam o GitHub
falham com `github_token_nao_configurado` (502).

**Revisao de codigo desta fase (sem chave real ainda - Falves valida ao vivo, mesmo padrao da
validacao real do Groq na Fase 5):**

- **Bug real encontrado e corrigido:** `CommitFileAsync` fazia `PUT /repos/{owner}/{repo}/contents/
  {path}` sem `sha` - a API do GitHub so aceita isso pra criar um arquivo que ainda nao existe;
  sobrescrever um que ja existe sem `sha` responde `422 "sha wasnt supplied"` em vez de commitar.
  Um repo novo (`auto_init=true`) e imune na 1a chamada, mas um repo reaproveitado
  (`CommitModuleSummaryUseCase` com `isNewRepo=false`) ou qualquer retry do mesmo commit (ex: a
  Api falha em `SaveChangesAsync` *depois* do commit ir pro GitHub) batiam nesse 422. Corrigido:
  `CommitFileAsync` busca o `sha` atual (`GET .../contents/{path}`, 404 vira "nao existe" -
  criacao pura) antes do `PUT`.
- **Rate limit / repo privado-inexistente / token sem escopo `repo`:** nenhum ganhou tratamento
  dedicado - `EnsureSuccessAsync` ja bota qualquer status de erro (nao só 404, que vira `null` via
  `GetOptionalAsync`) dentro de `github_falhou`/`github_indisponivel` (502) com o corpo real da
  resposta do GitHub anexado na mensagem, mesmo padrao ja usado pros erros genericos da Groq -
  rate limit e token sem escopo chegam pro usuario com a mensagem literal que o GitHub devolveu
  (ex: "API rate limit exceeded...", "Resource not accessible by personal access token"), sem
  precisar de um `Code` por status.
- **Ainda pendente (exige chave real, nao verificavel so por leitura de codigo):** confirmar que
  os fluxos abaixo batem na API de verdade e que as mensagens acima realmente aparecem assim.
  Checklist pro Falves (mesmo escopo do pedido original da Fase 11):
  1. `github-commit` (`CommitModuleSummaryUseCase`) num repo **novo** - confirma o caminho feliz.
  2. `github-commit` **de novo pro mesmo modulo** (mesmo repo, mesmo `MODULO-{n}.md`) - e o teste
     que valida o fix do `sha` acima; sem ele, essa chamada quebrava com 422.
  3. `submit` (`SubmitPublicationUseCase`) com uma URL de repo GitHub **publica** real - caminho
     feliz de `GetRepositoryAsync`.
  4. `submit` com URL de repo **privado** ou **inexistente** - confirma que cai no
     `GitHubValidationError` (nao um 502 cru).
  5. `POST /project/evaluate` (`EvaluateWeeklyProjectUseCase`) contra um repo com codigo de
     verdade - confirma `GetContentSnapshotAsync` (Git Trees API + blobs) e o prompt de
     `GroqProjectEvaluationService` juntos; e o unico dos 3 fluxos que tambem depende da Groq.
  6. Token **sem** escopo `repo` (ou vazio) - confirma `github_token_nao_configurado`/
     `github_falhou` em vez de um erro sem contexto.

| Code | Status | Quando |
|---|---|---|
| `github_token_nao_configurado` | 502 | `GitHub:Token` vazio - qualquer chamada que precise dele |
| `github_timeout` | 503 | GitHub nao respondeu a tempo (timeout de 20s) |
| `github_indisponivel` / `github_falhou` | 502 | Erro de rede ou status HTTP de erro vindo do GitHub - inclui rate limit e token sem escopo, ver acima |

## Autenticacao (Fase 12)

A partir desta fase o app deixa de ser mono-usuario hardcoded - `User` (email/senha/nome) e
sessao real via JWT. Fundacao apenas: nenhum endpoint de curso/weekly/daily foi protegido ainda
(ver "Fora de escopo" abaixo) - isso e trabalho da Fase 13, quando esses endpoints passarem a
filtrar por usuario matriculado.

- **Senha**: hash via `BCrypt.Net-Next` (`BCryptPasswordHasher`), nunca armazenada em texto puro.
- **Sessao**: JWT (claims `sub`=userId, `email`; expira em 7 dias) entregue via **cookie
  `focadu_auth`, `HttpOnly`** - nunca acessivel via JS (mais seguro contra XSS que guardar o token
  em `localStorage` e mandar via header `Authorization`). `Secure=true` so fora de
  `IsDevelopment()` (exige HTTPS - em dev local, `http://localhost`, isso quebraria o cookie).
  `SameSite=Lax` (suficiente pro cenario atual: front e back em portas diferentes do mesmo host,
  sem cross-site de verdade).
- **Validacao do token**: feita inteiramente pelo middleware `JwtBearer` do ASP.NET Core
  (`AddAuthentication().AddJwtBearer(...)`, `Program.cs`), configurado pra ler o token do cookie
  (`OnMessageReceived`) em vez do header padrao `Authorization`. `IJwtTokenService` (Application/
  Infrastructure) **so gera** o token - nao tem um metodo de validacao manual, porque o middleware
  ja cobre isso antes de qualquer endpoint rodar.
- **`options.MapInboundClaims = false`** (gotcha do .NET) - sem isso, o `JwtSecurityTokenHandler`
  remapeia a claim curta `"sub"` pra uma URI longa de `ClaimTypes.NameIdentifier` por baixo dos
  panos (comportamento legado da lib), quebrando `principal.FindFirstValue(JwtRegisteredClaimNames.Sub)`
  no endpoint `/me` silenciosamente. Verificado ao vivo antes de fechar a fase.
- **401 com o mesmo envelope de erro do resto da Api**: o challenge de autenticacao (sem cookie /
  token expirado) acontece no middleware, antes do endpoint rodar - `ApiExceptionHandler` nunca
  veria essa falha. Por isso `JwtBearerEvents.OnChallenge` escreve `{error:"nao_autenticado",
  message:"..."}` manualmente, no mesmo formato de qualquer outro erro da Api.
- **`credenciais_invalidas` nunca diferencia "email nao existe" de "senha errada"** (boa pratica
  basica de seguranca - nao da pista de quais emails estao cadastrados). Usa `DomainException` com
  `Code` proprio (mapeado pra 401 em `ApiExceptionHandler.DomainCodeStatusOverrides`) em vez de
  `ValidationException`, que sempre mapeia pra 400 sem mecanismo de override por `Code`.
- **CORS precisou de `AllowCredentials()`** - sem isso, o navegador nunca manda o cookie de volta
  nas requisicoes, mesmo autenticado. Exige origem explicita (`WithOrigins`, ja era o caso aqui) -
  nao pode conviver com `AllowAnyOrigin` por especificacao do CORS.

### Como configurar a chave JWT

Mesmo mecanismo de configuracao de `Groq:ApiKey`/`GitHub:Token` (user-secrets em dev, variavel de
ambiente em producao/CI, nunca em `appsettings.json`) - **mas, diferente dos dois, ausente derruba
o boot da Api** (mesmo tratamento que a connection string): autenticacao e fundacao a partir desta
fase, nao uma integracao opcional - sem a chave, nenhum login/registro/sessao funcionaria.

```bash
cd backend/src/Focadu.Api
dotnet user-secrets set "Jwt:SecretKey" "uma-chave-longa-e-aleatoria-aqui"
```

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

## Frontend (Fase 3, telas de atividade completadas nas Fases 4 e 5, autoria na Fase 6)

**Fidelidade visual da Sessao Diaria (Fase 19):** fase so de estilo, sem mudanca de logica/API/
estrutura de dados - as 8 telas de atividade (Leitura/Resumo Falado/Video/Quiz/Ligar Palavras/
Cloze/Roleplay/Feedback IA) e as pecas compartilhadas (`SessionShell`/`MaterialSidebar`/
`IntroCard`/`OptionCard`/`CodeHighlight`/`FeedbackPanel`/`PenaltyGauge`) tiveram cores/tipografia/
espacamento/raios conferidos contra o Figma. Maior mudanca estrutural (ainda assim so layout):
Quiz/Ligar Palavras/Cloze/Roleplay/Resumo Falado ganharam o mesmo chrome que Reading/Video ja
tinham desde a Fase 7 (`SessionTopBar` + cartao + `MaterialSidebar` + orbe) via `SessionLayout`
(novo, `SessionShell.tsx`) - antes usavam `ActivityScreen` (`Layout.tsx`), um shell generico sem
esse chrome. Token novo: `--color-stroke` (`#2A2A2A`, borda - distinto de `--color-surface-alt`,
que e fundo). Fonte nova: Inter virou `--font-sans`, o default do app inteiro (nenhuma tela tinha
fonte propria antes desta fase). Divergencias do Figma mantidas conscientemente (nenhuma delas e
"resgate de conteudo descartado" - sao elementos sem dado real por tras, ver
`docs/fase-19/resumo-implementacao-fase-19.md`): grafo de arraste do Ligar Palavras (Fase 4/9,
reafirmado), 2 colunas do Feedback IA (Fase 7, reafirmado), indicador "arvore de decisao" numerada
do Roleplay (profundidade do grafo e variavel), legenda "Baseado em" do Resumo Falado (exigiria
chamada de API nova), campo de justificativa do Cloze como microfone (Justification e sempre texto
no dominio), fonte "Cousine" do bloco de codigo (reaproveitado Fira Code em vez de somar uma 4a
familia de fonte), rodape de telemetria fake em qualquer tela (nenhuma tela deste app mostra numero
sem dado real por tras).

**Fidelidade visual de Navegacao & Perfil + correcao de rota full-bleed (Fase 20):** `/hoje` saiu
do shell `<App/>` (full-bleed, `TodayRoute` - ver acima) - resolve a pendencia da Fase 19 (nav
global sobrepondo o HUD da sessao). `SessionLayout`/`IntroCard` ganharam mais folga no topo
(`pt-20`) pra nao colidir com o PenaltyGauge/botao de configuracoes agora que o nav nao da mais
essa folga de graca. As 8 telas de Navegacao/Perfil (StartDashboard/WeeklyDetailPage/
WeeklyProjectPage/SettingsMenu/Perfil-3-abas/RankingPage/MarketplacePage) e componentes
compartilhados (StreakIndicator/StatusBadge/WeeklyProjectCard/RankingScopeTabs/RankingTable)
conferidos contra o Figma - nenhum token novo (reconciliado com `--color-stroke`/`--font-sans` da
Fase 19). Maiores fabricacoes confirmadas e mantidas fora (mesmo criterio de sempre, ver
`docs/fase-20/resumo-implementacao-fase-20.md`): Nivel/XP, "Sessoes completas", Platinas por curso,
"blockchain focadu" no Perfil; ranking global com podium/XP/usuarios ficticios e painel "Seu
Desempenho" com delta/percentil/sparkline no Ranking; grid "Seus Cursos" com 2 cursos bloqueados
"libera no nivel X" no StartDashboard (so existe 1 Course Active, decisao da Fase 8 reafirmada).
**"Sair da Conta" (SettingsMenu) virou o botao vermelho de largura total do Figma** - divergencia
documentada desde a Fase 13a, corrigida nesta fase por decisao explicita (nao obrigatoria, mas
natural durante o refinamento da mesma tela).

```
frontend/
  index.html, vite.config.ts, package.json, tsconfig*.json
  .env.example, .env.local (gitignorado - VITE_API_BASE_URL)
  src/
    main.tsx              <- BrowserRouter + AuthProvider + Routes ("/" Splash, "/login" fora do
                              ProtectedRoute; onboarding/onboarding/perfil/selecionar-curso/hoje
                              fora do <App/> (Fase 12/13b/20) - so start/perfil/loja/admin/conteudo
                              continuam dentro do shell; /conquistas vira
                              <Navigate to="/perfil?tab=conquistas"/> desde a Fase 18; /hoje usa
                              <TodayRoute/>, nao <TodayPage/> direto - ver routes/TodayPage.tsx)
    App.tsx                <- shell com nav (Hoje / Inicio / Conteudo) + HeaderUserBadge (nome+
                              moldura equipados, link pra /perfil - Fase 18) +
                              <ErrorBoundary key={pathname}><Outlet/></ErrorBoundary> (Fase 10).
                              /hoje NAO fica mais dentro deste shell desde a Fase 20 (full-bleed,
                              mesmo tratamento de onboarding/login) - o nav fixo sobrepondo o
                              PenaltyGauge/botao de configuracoes (pendencia da Fase 19) foi
                              resolvido movendo a rota pra fora, nao ajustando o nav
    index.css               <- @import "tailwindcss" + tokens @theme (paleta + fontes da identidade
                              visual, ver secao "Frontend" acima)
    assets/reading/          <- SVGs do design Figma (dots, play, check, orbe) - bytes exatos, Fase 7
    lib/
      statusBadge.ts           <- dailyStatusBadgeProps (Fase 8) - separado de components/StatusBadge.tsx
                                   pra nao co-exportar funcao junto com componente (fast refresh)
      apiError.ts               <- classifyApiError/ApiFailure (Fase 10) - classifica qualquer erro
                                   de fetch/Api numa das 5 categorias que as telas de erro sabem renderizar
      validation.ts               <- isValidEmail/MIN_PASSWORD_LENGTH (Fase 12) - compartilhado por
                                   LoginForm/RegisterForm, servidor nunca confia so nisso
      onboarding.ts                <- resolveLandingPath(user) (Fase 13b) - unico lugar que decide
                                   /onboarding vs /selecionar-curso vs /start; usado por SplashPage
                                   e pelo onSuccess de login/registro (LoginPage), nunca duplicado
      cosmeticStyle.ts               <- RARITY_STYLE (Fase 18, movido de CosmeticItemCard - fonte
                                   unica pra "raridade -> cor", reaproveitado por
                                   EquippedFramePreview) + nameColorClass(token) - token do
                                   CosmeticItem equipado (Name, nao hex) -> classe de cor de verdade
    contexts/
      authContextObject.ts         <- createContext + AuthContextValue (Fase 12) - so o objeto/tipo,
                                   separado do Provider e do hook pelo mesmo motivo de statusBadge.ts;
                                   login/register devolvem o UserDto (Fase 13b), pra quem chama nao
                                   depender do proximo render do contexto pra saber quem logou
      AuthContext.tsx                <- AuthProvider (Fase 12) - carrega GET /api/auth/me 1x no mount
      useAuth.ts                      <- hook useAuth() (Fase 12)
    api/
      types.ts               <- espelha os DTOs de Focadu.Application (enums como numero, com
                                   consts tipo ActivityType/AnswerMode/ActivityStatus/TerminalQuality/
                                   WeeklyProjectStatus/DailyStatus/CourseStatus (Fase 8, viraram
                                   const), ACTIVITY_TYPE_LABEL/CURATED_CONTENT_TYPE_NAMES,
                                   PublicationPlatform/PublicationStatus/ModulePublicationDto/
                                   GitHubRepoDto (Fase 11)
      client.ts               <- fetch tipado, ApiError, VITE_API_BASE_URL, suporte a FormData
                                   (upload de audio, Fase 5, sem forcar Content-Type json); request()
                                   usa AbortSignal.timeout() desde a Fase 10 (10s padrao, 70s pro
                                   endpoint de audio - ver "Timeout de requisicoes"); credentials:
                                   'include' desde a Fase 12 (senao o cookie de sessao nunca vai/volta)
      useApiResource.ts        <- hook pra loading/error/cancelamento (usado pelas sub-telas de /start e /admin/conteudo);
                                   `error` e um `ApiFailure` classificado (nao string) + `retry()` desde a Fase 10
    routes/
      SplashPage.tsx             <- "/" (Fase 12) - checa sessao (AuthProvider) e redireciona pra
                                   /login, ou resolveLandingPath(user) (onboarding/selecao de
                                   curso/start - Fase 13b), duracao minima de 700ms
      LoginPage.tsx                <- "/login" (Fase 12) - abas Entrar/Criar Conta; onSuccess de
                                   ambos os forms passa pelo mesmo resolveLandingPath (Fase 13b)
      OnboardingWelcomePage.tsx   <- /onboarding (Fase 13b, passo 1/3) - "Pular tour" conclui o
                                   perfil com interesses vazios (User.CompleteProfile aceita lista
                                   vazia) e pula direto pra /selecionar-curso
      ProfileInterviewPage.tsx    <- /onboarding/perfil (Fase 13b, passo 2/3) - Entrevista de
                                   Perfil, InterestChip multi-select + notas livres, salva via
                                   PUT /api/users/me/profile (CompleteProfileUseCase). `?edit=1`
                                   (Fase 18): mesma tela reaproveitada pra editar depois do
                                   onboarding (pre-popula com UserDto.interests/
                                   additionalProfileNotes, volta pro /perfil ao salvar em vez de
                                   seguir pra /selecionar-curso)
      CourseSelectionPage.tsx     <- /selecionar-curso (Fase 13b, passo 3/3) - GET
                                   /api/courses/available, matricula via POST /api/enrollments
      EmptyStateStartPage.tsx     <- guarda de seguranca em /start (Fase 13b) - renderizada por
                                   StartDashboard quando GET /api/today devolve 404
                                   `nenhuma_matricula_ativa`; StreakIndicator fixo em 0 (Fase 14,
                                   sem chamada a API - quem nao se matriculou nunca tem streak)
      TodayPage.tsx            <- /hoje (orquestra os 7 tipos de atividade, o menu de configuracoes
                                   e o fluxo de conclusao - Fase 7); PenaltyGauge fixo no HUD +
                                   ReinforcementIntroScreen como gate quando `daily.isReinforcement`
                                   e nenhuma atividade ainda respondida (Fase 15). `TodayRoute`
                                   (Fase 20, exportado deste arquivo) - wrapper com
                                   `<ErrorBoundary key={pathname+search}>`, usado direto em
                                   main.tsx no lugar de `<TodayPage/>` - repoe o boundary que
                                   `<App/>` dava de graca antes de `/hoje` sair do shell dele
      StartPage.tsx             <- /start (so o roteador por query string - Fase 8: as 3 telas
                                   viraram arquivos proprios abaixo, StartPage so decide qual mostrar);
                                   `<WeeklyDetailPage key={weeklyId} .../>` desde a Fase 11 (ver
                                   "Bug real: modal preso ao trocar de Weekly" abaixo); `?ranking=1`
                                   -> RankingPage (Fase 16, mesmo padrao de flag de `?project=`)
      StartDashboard.tsx         <- /start sem params - hub "Comecar Hoje"/"Projeto"/"Trilha" (Fase 8);
                                   renderiza EmptyStateStartPage no lugar do erro generico quando
                                   `error.code === 'nenhuma_matricula_ativa'` (Fase 13b);
                                   GemBadge/StreakIndicator no header via GET /api/users/me/
                                   gamification (Fase 14); WeeklyReinforcementBadge (linkado pra
                                   /start?weekly=) quando `weekly.hasPendingWeeklyReinforcement`
                                   (Fase 15)
      WeeklyDetailPage.tsx        <- /start?weekly= - dias da semana + projeto + navegacao entre semanas
                                   (Fase 8); banner + trigger do PublicationModal quando
                                   `requiresPublicationToUnlock` (Fase 11); WeeklyReinforcementBadge
                                   no cabecalho quando `hasPendingWeeklyReinforcement` (Fase 15)
      CourseDetailPage.tsx        <- /start?course= - trilha completa (semanas + mini-grid de dias)
                                   (Fase 8); badge "🔒 Bloqueado" na Weekly seguinte a uma que ainda
                                   precisa de publicacao (Fase 11); links "🏆 Ver Ranking" ->
                                   /start?course=&ranking=1 (Fase 16) e "🎖️ Conquistas" -> /conquistas
                                   (Fase 17)
      RankingPage.tsx            <- /start?course=&ranking=1 (Fase 16, tela 13 do inventario
                                   original) - abas Semana/Mes/Curso (RankingScopeTabs), top 10
                                   (RankingTable) + posicao do usuario sempre visivel
                                   (CurrentUserRankingCard)
      MarketplacePage.tsx        <- /loja (Fase 17, tela 14 do inventario original) - acessivel
                                   clicando no GemBadge do header do StartDashboard; filtro por
                                   slot (CosmeticSlotFilter) + grid (CosmeticItemCard);
                                   comprar/equipar/desequipar cada um devolve o catalogo inteiro
                                   recalculado, guardado em `catalogOverride` (derivado no render,
                                   nunca via effect) - cai pro `data` original ate a 1a acao
      ProfilePage.tsx            <- /perfil (Fase 18) - 3 abas via ?tab= (Informacoes/Customizacao/
                                   Conquistas, default Informacoes); ProfileHeader (nome+moldura+
                                   Gems+Streak) acima das abas, sempre visivel; catalogo (pra
                                   equipar/desequipar na aba Customizacao) guardado em
                                   `catalogOverride`, mesmo padrao derivado-no-render de
                                   MarketplacePage
      WeeklyProjectPage.tsx      <- projeto pratico da semana (Fase 7)
      AdminContentPage.tsx       <- /admin/conteudo (autoria de CuratedContent, Fase 6) - navega
                                   com WeeklyTemplateId desde a Fase 13b (getCourseCurriculum/
                                   getWeeklyTemplate, sem exigir matricula)
    components/
      ProtectedRoute.tsx           <- guarda de rota client-side (Fase 12) - so le AuthContext, nunca
                                   busca sessao de novo sozinho; backend exige [Authorize] em tudo
                                   isso desde a Fase 13a
      EquippedFramePreview.tsx      <- Fase 18 - placeholder de avatar (iniciais do nome + anel
                                   colorido por raridade quando uma Moldura esta equipada, sem
                                   upload/ilustracao real); reaproveitado por ProfileHeader e
                                   HeaderUserBadge
      HeaderUserBadge.tsx            <- Fase 18 - nome+moldura equipados no nav global (App.tsx),
                                   link pra /perfil; busca o catalogo sozinho, cai pro nome sem
                                   cor/moldura se ainda nao carregou (nao bloqueia o nav)
      auth/
        LoginForm.tsx                <- email + senha (Fase 12); onSuccess recebe o UserDto (Fase 13b)
        RegisterForm.tsx              <- nome + email + senha + confirmacao (Fase 12); onSuccess
                                   recebe o UserDto (Fase 13b); `referralCode` opcional (Fase 17,
                                   vem de /login?ref=, ver LoginPage)
      onboarding/                  <- Fase 13b
        InterestChip.tsx                <- chip de interesse multi-select (Entrevista de Perfil)
        OnboardingStepper.tsx             <- "Passo X de 3" + pontinhos, compartilhado pelas 3 telas
      gamification/                 <- Fase 14
        GemBadge.tsx                     <- icone + contador de Gems, mesmo padrao pill de StatusBadge
        StreakIndicator.tsx               <- "🔥 N dias" - StartDashboard (real) e EmptyStateStartPage (fixo em 0)
        PenaltyGauge.tsx                   <- Fase 15, "conta-giros" - PenaltyPoints/PenaltyThreshold,
                                   cor por faixa (neutro/amarelo/laranja/vermelho); mesma linguagem
                                   visual do ProgressBar (Fase 8), sem node Figma proprio (borda
                                   trocada pra border-stroke na Fase 19, mesmo token do resto)
      ReinforcementIntroScreen.tsx  <- Fase 15 - transicao pra Daily de reforco, reaproveita IntroCard
      WeeklyReinforcementBadge.tsx   <- Fase 15 - so apresentacao ("📋 Revisao semanal disponivel"),
                                   sem link embutido, sem bloquear nada
      ranking/                     <- Fase 16
        RankingScopeTabs.tsx              <- abas Semana/Mes/Curso, mesmo padrao das abas Entrar/
                                   Criar Conta do LoginPage
        RankingTable.tsx                   <- top N (medalha nos 3 primeiros), destaca o proprio
                                   usuario quando ele aparece na lista
        CurrentUserRankingCard.tsx           <- posicao do usuario sempre visivel, mesmo fora do
                                   top N; null quando o usuario nao tem matricula no curso
      marketplace/                  <- Fase 17
        CosmeticItemCard.tsx              <- swatch de cor por raridade (sem arte real ainda,
                                   RARITY_STYLE em lib/cosmeticStyle.ts desde a Fase 18) + nome +
                                   preco/comprar OU equipar/desequipar (Owned/Equipped ja
                                   resolvidos pelo backend). `onPurchase` opcional (Fase 18): sem
                                   ele, item nao possuido mostra "Ver na Loja" (link pra /loja) em
                                   vez do botao de comprar - reaproveitado tal como esta pela aba
                                   Customizacao do Perfil (inventario, nao vende nada por la)
        CosmeticSlotFilter.tsx             <- filtro Tudo/Molduras/Cores/Banners, mesmo padrao das
                                   abas do RankingScopeTabs
      badges/
        BadgeGrid.tsx                     <- Fase 17 - grid dos 5 badges, conquistado (borda accent)
                                   vs esmaecido (opacity-40); code -> label/icone/descricao mapeado
                                   no frontend (mesmo padrao de DailyStatus -> lib/statusBadge.ts)
      referral/
        ReferralCard.tsx                   <- Fase 17 - codigo + copiar link (clipboard) + contador
                                   de indicacoes confirmadas
      profile/                      <- Fase 18
        ProfileHeader.tsx                  <- cabecalho do /perfil - EquippedFramePreview + nome
                                   colorido (nameColorClass) + GemBadge/StreakIndicator reaproveitados
        ProfileTabs.tsx                     <- abas Informacoes/Customizacao/Conquistas, mesmo
                                   padrao de RankingScopeTabs/CosmeticSlotFilter
        InformationTab.tsx                   <- nome/email so leitura, interesses/notas salvos
                                   (UserDto), link "Editar meus interesses" (-> /onboarding/
                                   perfil?edit=1), estatisticas basicas (cursos, Recorde de
                                   Streak, Score no curso ativo)
        CustomizationTab.tsx                  <- inventario agrupado pelos 3 slots reais
                                   (CosmeticSlot), reaproveita CosmeticItemCard tal como esta
                                   (sem onPurchase); preview ao vivo e o ProfileHeader acima, nao
                                   duplicado aqui
        ConquestsTab.tsx                       <- BadgeGrid + ReferralCard movidos de
                                   AchievementsPage.tsx (removido) - mesmo conteudo, novo lar
      activities/                 <- primitivas visuais das atividades avaliaveis (Fase 9)
        IntroCard.tsx                <- tela de intro (badge/titulo/descricao/regras/CTA) - gate local (`started`), nao e passo novo no Step do TodayPage
        OptionCard.tsx                <- card de opcao (neutro/selecionado/correto/errado/esmaecido) - Quiz, termos do WordMatch, decisoes do Roleplay.
                                   Fase 19: "selecionado" ganhou preenchimento verde translucido
                                   (bg-accent/25, nao so a borda), padding px-[18px]/py-4 exatos do Figma
        CodeHighlight.tsx              <- realca a lacuna "___" do prompt de Cloze - fonte mono (Fira Code, Fase 19) em vez de somar a fonte "Cousine" do Figma so pra este bloco
      QuizActivity.tsx             <- Quiz e Cloze/MultipleChoice (Intro + OptionsAnswer) (Fase 9). Fase 19: pos-Intro usa SessionLayout (era ActivityScreen simples)
      WordMatchActivity.tsx         <- grupo de termos do WordMatch (Intro + progresso "X de Y termos") (Fase 9). Fase 19: idem, SessionLayout - mecanica de multipla escolha independente mantida (ver nota de divergencia no proprio arquivo)
      OptionsAnswer.tsx          <- nucleo "escolher opcao" - Quiz, cada termo de WordMatch, Cloze/MultipleChoice; usa OptionCard desde a Fase 9
      ClozeFreeTextActivity.tsx   <- Cloze/FreeText (resposta + justificativa); Intro + CodeHighlight desde a Fase 9. Fase 19: SessionLayout + bloco de codigo/labels fieis ao node "sessao-cloze-test" - campo de justificativa continua texto (nao microfone, ver nota no arquivo)
      RoleplayActivity.tsx        <- navega o grafo de RoleplayNode client-side; Intro + OptionCard desde a Fase 9. Fase 19: SessionLayout + badge ambar "Roleplay de Decisoes" + bloco "Cenario" persistente (activity.prompt, antes so na Intro) + opcoes numeradas; indicador de "arvore de decisao" (1->2->3->4) do Figma omitido (profundidade do grafo e variavel, nao um numero fixo de passos)
      VoiceSummaryActivity.tsx    <- grava audio (MediaRecorder), envia multipart, mostra transcricao+feedback (Fase 5). Fase 19: SessionLayout `card={false}` (unica tela de sessao sem cartao, mic orb 180px) + legenda "Gravando - MM:SS / limite 10:00"; legenda "Baseado em: ..." do Figma omitida (exigiria 1 chamada de API nova so pra isso).
                                   Fase 21: le a pergunta em voz alta ao entrar (Web Speech API,
                                   nativa - sem servico externo), destacando cada palavra falada
                                   (`onboundary`, degrada pra colorir tudo de uma vez se o navegador/
                                   voz nao disparar por palavra) + botao "Ouvir de novo"; prefere voz
                                   pt-BR "de rede" (Google/Microsoft Online) por heuristica de nome
      ReadingActivity.tsx         <- etapa de leitura de um CuratedContent (Fase 7). Fase 19: usa SessionLayout/useMaterialSidebar (chrome generalizado, era JSX proprio)
      VideoActivity.tsx           <- etapa de video - embed real do YouTube (Fase 7). Fase 19: idem
      FeedbackPanel.tsx           <- bloco de resultado compartilhado pelos 5 componentes de atividade (Fase 7). Fase 19: gauge 72px (era 56px) com preenchimento bg-accent/25 quando passou, tracking/bordas fieis ao node "feedback-ia" - 2 colunas acertos/melhorias do Figma continuam fora (AiFeedback e 1 string so, ver Fase 7)
      SessionShell.tsx            <- SessionTopBar + QuickQuestionOrb + SessionLayout, compartilhados por Reading/Video/Projeto (Fase 7) e, desde a Fase 19, tambem por Quiz/Ligar Palavras/Cloze/Roleplay/Resumo Falado.
                                   SessionTopBar usa ProgressBar por baixo desde a Fase 8. SessionLayout
                                   (Fase 19) generaliza o chrome inteiro (topbar + cartao/sem cartao +
                                   sidebar + orbe) que Reading/Video ja tinham como JSX proprio duplicado
      useMaterialSidebar.tsx      <- hook (Fase 19, arquivo proprio - co-exportar com SessionShell.tsx quebraria o fast refresh) - busca a Weekly e monta o MaterialSidebar com os itens/concluidos da Daily atual; reaproveitado pelas 7 telas de sessao
      MaterialSidebar.tsx         <- "Material de hoje", compartilhado por Reading/Video (Fase 7), demais telas de sessao desde a Fase 19 (via useMaterialSidebar). `activeContentId` virou nullable (so Reading/Video tem conteudo proprio pra destacar)
      SettingsMenu.tsx            <- menu de configuracoes (overlay), montado em TodayPage (Fase 7)
      StatusBadge.tsx              <- badge de status generico, so apresentacao (Fase 8)
      ProgressBar.tsx               <- barra de progresso generica, extraida de SessionTopBar (Fase 8)
      WeeklyProjectCard.tsx          <- card do projeto semanal, usado por StartDashboard e WeeklyDetailPage (Fase 8)
      CompletionSummary.tsx       <- pos POST .../complete (reforco diario/semanal, se houver); resumo real +
                                   badge "Conceito Dominado" (aprovacao >= 90%) + "Refazer este dia" desde a Fase 9;
                                   "+N 💎" discreto quando `gemsEarned > 0` (Fase 14 - texto pequeno,
                                   sem popup/confete, alinhado ao minimalismo do produto); troca pra
                                   "🎯 Bonus de Superacao: +N 💎" quando `wasReinforcementBonus` (Fase 15)
      ErrorBoundary.tsx            <- class component, pega excecoes de render (Fase 10) - montado em App.tsx
      publication/
        PublicationModal.tsx          <- modal de publicacao publica (Fase 11) - maquina de passo local
                                          (`Step`), 8 sub-componentes no mesmo arquivo (os 9 arquivos
                                          sugeridos no prompt viraram 1 - ver resumo da fase)
      errors/                       <- telas de erro (Fase 10)
        ErrorLayout.tsx                <- chrome compartilhado (icone/legenda/titulo/descricao/CTAs)
        EmptyStateError.tsx             <- dado carregado com sucesso mas vazio (nao e erro de rede)
        NoConnectionError.tsx            <- fetch falhou de verdade (TypeError/offline)
        TimeoutError.tsx                  <- AbortSignal.timeout() disparou
        GenericError.tsx                   <- 5xx/404/excecao inesperada - tambem usado pelo ErrorBoundary
        ApiErrorScreen.tsx                  <- dispatcher: escolhe a tela certa a partir de ApiFailure.type
      Layout.tsx                  <- PageShell, Centered, ActivityScreen (shells compartilhados)
```

Roteamento exatamente como documentado (nao espelha as rotas REST da Api, que sao um recurso
diferente - ver "Rotas da Api nao espelham as rotas do frontend" na Fase 2):

| Rota | Consome | Tela |
|---|---|---|
| `/` | `GET /api/auth/me` (via AuthProvider) | `SplashPage` (Fase 12) - decide entre `/login` e `resolveLandingPath(user)` (Fase 13b) |
| `/login` | `POST /api/auth/register` ou `/login` | `LoginPage` (Fase 12) - abas Entrar/Criar Conta; `?ref=CODIGO` (Fase 17) pula pra Criar Conta com o codigo pre-preenchido |
| `/onboarding` | `PUT /api/users/me/profile` (so no "Pular tour") | `OnboardingWelcomePage` (Fase 13b) - passo 1/3 |
| `/onboarding/perfil` | `PUT /api/users/me/profile` | `ProfileInterviewPage` (Fase 13b) - passo 2/3, Entrevista de Perfil. `?edit=1` (Fase 18) - mesma tela em modo edicao, pre-populada, volta pro `/perfil` |
| `/selecionar-curso` | `GET /api/courses/available` + `POST /api/enrollments` | `CourseSelectionPage` (Fase 13b) - passo 3/3 |
| `/hoje` | `GET /api/today` | Daily ativa de hoje - **os 7 tipos de atividade implementados de ponta a ponta** (Reading/Video desde a Fase 7). Fora do shell `<App/>` desde a Fase 20 (full-bleed, `TodayRoute`) |
| `/hoje?daily=` | `GET /api/dailies/{dailyId}` | Mesma tela de `/hoje`, mas pra uma Daily especifica (Fase 4 - deep-link pra sessao de reforco; Fase 8: tambem usada como "reprise" de um dia ja concluido, clicado a partir da Visao Semanal) |
| `/start` | `GET /api/today` + `GET /api/weeklies/{id}` + `GET /api/courses` + `GET /api/courses/{id}` + `GET /api/users/me/gamification` (Fase 14) | `StartDashboard` (Fase 8) - hub "Comecar Hoje"/"Projeto desta Semana"/"Trilha Completa" |
| `/start?course=` | `GET /api/courses/{courseId}` | `CourseDetailPage` (Fase 8) - trilha completa do curso |
| `/start?course=&ranking=1` | `GET /api/courses/{courseId}/ranking?scope=` | `RankingPage` (Fase 16) - Score de Estudo, top 10 + posicao do usuario |
| `/loja` | `GET /api/marketplace/catalog` + `POST .../purchase`\|`/equip`\|`/unequip` | `MarketplacePage` (Fase 17) - catalogo de cosmeticos |
| `/perfil` (`?tab=info`\|`customizacao`\|`conquistas`) | `GET /api/users/me/gamification` + `GET /api/marketplace/catalog` (+ `GET /api/courses`/`.../ranking` na aba Informacoes, `GET /api/users/me/badges`/`referral` na aba Conquistas) | `ProfilePage` (Fase 18) - 3 abas, ver secao "Perfil, 3 Abas" acima |
| `/conquistas` | - (so redireciona) | `<Navigate to="/perfil?tab=conquistas"/>` (Fase 18, era `AchievementsPage` na Fase 17 - mantido como redirect pra nao quebrar links/favoritos antigos) |
| `/start?course=&weekly=` | `GET /api/weeklies/{weeklyId}` (+ `GET /api/courses/{courseId}` pra navegacao entre semanas) | `WeeklyDetailPage` (Fase 8) - dias da semana + projeto |
| `/start?course=&weekly=&daily=` | `GET /api/dailies/{dailyId}` | Estado de uma Daily especifica (somente leitura) |
| `/start?course=&weekly=&project=1` | `GET /api/weeklies/{weeklyId}` | Projeto pratico da semana (`WeeklyProjectPage`, Fase 7 - submissao via `POST .../project/submit`) |
| `/admin/conteudo` | `GET /api/courses` | Autoria (Fase 6) - lista de cursos |
| `/admin/conteudo?course=` | `GET /api/courses/{courseId}/curriculum` (Fase 13b, era `GET /api/courses/{courseId}`) | Autoria - semanas (WeeklyTemplate) do curso |
| `/admin/conteudo?course=&weekly=` | `GET /api/weekly-templates/{id}` (Fase 13b, era `GET /api/weeklies/{weeklyId}`) | Autoria - lista + formulario de `CuratedContent` da semana (`POST`/`PUT /api/curated-content`, corpo com `weeklyTemplateId`) |

**Autenticacao no frontend (Fase 12):** `AuthProvider` (`contexts/AuthContext.tsx`) e a fonte
unica de "quem esta logado" - chama `GET /api/auth/me` uma vez no mount e guarda `user`/`isLoading`
em state; `SplashPage` e `ProtectedRoute` so leem esse mesmo state (nunca buscam de novo sozinhos).
Um 401 em `/me` (sem cookie/expirado) e o caminho **esperado** de "ninguem logado ainda" - vira
`user: null` silenciosamente, nunca um erro pra propagar (o contexto nao tem campo `error` de
proposito). `ProtectedRoute` envolve `/onboarding`, `/onboarding/perfil`, `/selecionar-curso`,
`/hoje`, `/start`, `/loja`, `/perfil`, `/admin/conteudo` (Fase 13b: as 4 primeiras ficam fora do
`<App/>` shell, sem o nav Hoje/Inicio/Conteudo - mesmo tratamento full-bleed de `LoginPage`/
`SplashPage`; `/hoje` entrou nesse grupo na Fase 20) - mostra um
spinner enquanto `isLoading`, `<Navigate to="/login"/>` se `!user`, `<Outlet/>` senao. Backend exige
`[Authorize]` em tudo isso desde a Fase 13a (ver "Autenticacao" acima). `LoginPage` redireciona pra
`/` (nao mais direto pra `/start`) se ja houver sessao - passa pela `SplashPage`, que roda o mesmo
`resolveLandingPath` (`lib/onboarding.ts`, Fase 13b: `!profileCompletedAt` -> `/onboarding`;
sem `Enrollment` (`GET /api/enrollments/me`) -> `/selecionar-curso`; senao -> `/start`) usado no
`onSuccess` de `LoginForm`/`RegisterForm` - nunca duas implementacoes da mesma decisao.

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
o botao "Continuar" do grupo so aparece quando todos os termos ja tem resposta. Desde a Fase 9 vive
em `WordMatchActivity.tsx` (extraido de `TodayPage.renderStep`), com uma Intro e progresso real
"X de Y termos conectados".

**Intro por atividade (Fase 9):** Quiz/Cloze/WordMatch/Roleplay mostram uma tela de intro
(`IntroCard`) antes da pergunta/desafio/cenario - `started` e um `useState` local em cada
componente (`QuizActivity`, `ClozeFreeTextActivity`, `RoleplayActivity`, `WordMatchActivity`),
**nao um passo novo no `Step` do `TodayPage`** - a maquina de estado nem sabe que a intro existe, a
atividade so vira "concluida" quando o usuario responde de verdade. Pula automaticamente pra quem
ja respondeu antes (`activity.responses.length > 0`), evitando reintro ao reabrir uma atividade ja
feita (ex: `/hoje?daily=` num dia passado).

**Estados de erro (Fase 10):** `useApiResource.error` e `TodayPage`'s error state sao um
`ApiFailure` classificado (`lib/apiError.ts`, `classifyApiError`) em vez de string solta -
`noConnection` (fetch lancou `TypeError`, ou `navigator.onLine === false`), `timeout`
(`AbortSignal.timeout()` disparou - rejeita com `DOMException` `name: "TimeoutError"`, **nao**
`"AbortError"`, que e so pra cancelamento manual), `serverError`/`notFound`/`generic` (`ApiError`
com `status` 5xx/404/outro). `components/errors/ApiErrorScreen.tsx` e o dispatcher: cada tela troca
`if (error) return <Centered text={error} .../>` por
`if (error) return <ApiErrorScreen error={error} onRetry={retry} />` - `retry` (`useApiResource`)
so incrementa um contador ja nas deps do efeito, refaz o fetch sem duplicar logica.
`components/errors/EmptyStateError.tsx` fica fora do dispatcher - nao e erro de rede/Api, e uma
condicao sobre dados carregados com sucesso (ex: `CourseDetailPage` sem semanas), quem chama decide
isso direto. `components/ErrorBoundary.tsx` (class component, montado em `App.tsx` ao redor do
`<Outlet/>`, `key={location.pathname}` pra resetar sozinho ao navegar) pega excecoes de **render**
que nenhum catch de fetch cobriria - mostra `GenericError`, caminho totalmente separado do
`ApiErrorScreen`. **Dois dos 4 links do Figma desta fase nao correspondiam ao nome do prompt**
("Sem Conexao" apontava pra uma tela de sessao expirada, "Erro Generico" pra uma tela de streak
perdido - nenhum dos dois foi construido, ver `docs/fase-10/resumo-implementacao-fase-10.md`).

**Sessao expirada: interceptor global de 401 (Fase 22).** Fecha a pendencia deixada pela Fase 10
(node Figma `13-978`, "Erro - Sessao Expirada") - so foi possivel agora porque login/JWT so
existem desde a Fase 12. `request()` (`api/client.ts`) e o unico ponto de entrada de toda chamada
de Api (ver "O contrato da Api" acima), entao e onde o interceptor mora: todo 401 com
`error === "nao_autenticado"` (o codigo que `JwtBearerEvents.OnChallenge` escreve no middleware,
ver "Autenticacao" acima) dispara um callback modulo-level - `setSessionExpiredHandler` - antes de
lancar o `ApiError` de sempre; quem fez a chamada continua tratando a falha exatamente como antes
(`useApiResource.error`, catch local), o interceptor so ADICIONA o aviso global, nunca substitui o
tratamento existente. `AuthProvider` (`AuthContext.tsx`) se registra nesse callback (unico
assinante) e guarda `sessionExpired` num state **separado** de `user` - de proposito: zerar `user`
desmontaria toda rota atras de `ProtectedRoute` (`<Navigate to="/login"/>`), perdendo a URL atual e
qualquer estado local em andamento (resposta ja digitada, audio ja gravado) - o objetivo desta fase
e o oposto disso. `SessionExpiredModal` (`components/auth/`) e montado como IRMAO de `children`
dentro do proprio `AuthContext.Provider` (nunca dentro de uma rota) - fica por cima de qualquer
tela sem afetar o React Router. Reaproveita `LoginForm` (Fase 12) tal qual, so com
`submitLabel="Retomar Sessao"` (prop nova, default inalterado) - reautenticar so chama
`AuthContext.login()` (atualiza `user`) e fecha o modal, nunca navega; a tela por baixo nunca foi
desmontada, entao nada se perde. Chrome de card modal (`fixed inset-0` + painel), no lugar do
`ErrorLayout`/`ApiErrorScreen` de tela cheia (Fase 10) - mesmo motivo ja documentado em
`PublicationModal` (Fase 11): `ErrorLayout` pressupoe `min-h-screen`, incompativel com sobrepor uma
rota que continua viva por baixo. **`GET /api/auth/me` no boot precisa de escape hatch**: um 401 ali
e o caminho ESPERADO "ninguem logado ainda" (ver `AuthContext.tsx`), nao sessao expirada de
verdade - `request(path, { skipAuthRedirect: true })` (novo, mesmo padrao de `timeoutMs`) e como
esse UNICO chamador se exclui do interceptor. **Sem retry automatico apos reautenticar** - decisao
deliberada: paginas que usam `useApiResource` ja tem "Tentar Novamente" (`ApiErrorScreen`, Fase
10); pra uma acao de escrita (submeter resposta) o usuario so precisa clicar em enviar de novo, o
que ja funciona porque o campo/audio nunca foi limpo - encadear um retry automatico exigiria uma
fila generica de "ultima acao que falhou" sem necessidade real pra isso.

**Modal de Publicacao Publica (Fase 11):** `PublicationModal` recebe `weeklyId`/`courseId`/
`onClose` (sem `onPublished` - ver "Bug real" abaixo) e gerencia sozinho uma maquina de passo
(`intro` → `linkedinDraft`/`githubSelect` → `linkedinEditor`/`urlSubmit` → `validating` →
`success`/`error`), mesmo padrao ja usado em `TodayPage` (Fase 4), so que a arvore inteira cabe
num unico componente porque nao e uma sequencia de N atividades. Erros de rede usam
`classifyApiError` (Fase 10) num bloco compacto, nao `ErrorLayout`/`ApiErrorScreen` (pressupoe
`min-h-screen`, incompativel com um card de modal); erro de **validacao** (URL invalida/repo
privado) e estado de dominio (`ModulePublicationDto.status === Failed`), tela propria, sem relacao
com erro de rede.

**Bug real: `onPublished` desmontava o modal antes do usuario ver o sucesso (Fase 11).** A
primeira versao de `WeeklyDetailPage` chamava `retry()` (`useApiResource`) dentro de um callback
`onPublished`, disparado *antes* do `PublicationModal` terminar de renderizar `SuccessStep`.
`retry()` seta `loading = true`, que faz `WeeklyDetailPage` retornar so `<Centered/>` - isso
desmonta o modal (e todo seu `step`) no meio do fluxo; o usuario nunca via "Publicado com
Sucesso!", so via o modal reabrir do zero em `'intro'`. Corrigido movendo o refetch pra `onClose`
(so quando o usuario decide sair do modal) - `onPublished` foi removido do componente por nao
sobrar nenhum uso real. Licao geral: **nunca dispare um refetch que muda `loading` do componente
pai enquanto um modal filho ainda esta no meio de mostrar seu proprio resultado.**

**Bug real: modal preso ao trocar de Weekly via "Proximo Modulo" (Fase 11).** `StartPage`
renderizava `<WeeklyDetailPage weeklyId={weeklyId} .../>` sem `key` - trocar a query string
(`?weekly=`) so muda props, nao remonta o componente, entao `showPublicationModal` (e o
`SuccessStep` da Weekly *anterior*) ficava aberto por cima da Weekly nova. Corrigido com
`key={weeklyId}`, mesmo padrao ja usado em `App.tsx` (`key={location.pathname}` no
`ErrorBoundary`, Fase 10) - **qualquer estado local que deveria resetar ao trocar de "entidade
exibida" via query string precisa de uma `key` que muda junto**, React nao remonta sozinho so
porque uma prop mudou.

**Timeout de requisicoes (Fase 10):** `api/client.ts.request()` usa `AbortSignal.timeout()` - 10s
por padrao (`DEFAULT_TIMEOUT_MS`), exceto `submitVoiceSummaryResponse` (70s,
`VOICE_SUMMARY_TIMEOUT_MS`) - o endpoint de audio transcreve + avalia por IA em sequencia no
backend, que ja tem seu proprio timeout de 60s pra Groq (ver "Resumo falado por voz" acima); um
timeout de cliente de 10s quebraria essa atividade toda vez.

**Roleplay, na tela:** navega o grafo inteiramente no cliente (todos os `RoleplayNode`/
`RoleplayOption` ja vieram no `DailyActivityDto` inicial - nao ha ida-e-volta a cada escolha). O
node com `NodeKey === "start"` e a convencao adotada pro node inicial (nao ha campo `IsStart` no
dominio). So ao selecionar uma opcao que leva a um node com `IsTerminal = true` e que o frontend
chama `POST .../responses` com `SelectedRoleplayNodeId`.

**VoiceSummary, na tela (Fase 5):** `MediaRecorder` grava o audio do microfone - botao circular
central com glow (verde parado/hover, vermelho pulsante durante a gravacao), contador MM:SS,
limite de 10min (parada automatica + botao manual). Ao parar, envia o `Blob` gravado via
`multipart/form-data` pro endpoint de audio; mostra "transcrevendo e avaliando..." enquanto
espera, depois transcricao + feedback da IA + certo/errado, mesmo padrao visual dos outros tipos.

**Reading/Video, na tela (Fase 7):** telas proprias (`ReadingActivity`/`VideoActivity`), com um
chrome diferente do `ActivityScreen` centralizado das outras 5 - barra de progresso real
(`ETAPA {posicao} DE {total}`, calculada a partir de `daily.activities` ordenadas por
`OrderIndex`), sidebar "Material de hoje" (`MaterialSidebar`, filtrado pelos `ContentId` das
`DailyActivity` da Daily atual - `weekly.curatedContents` traz os 4 dias juntos, sem esse filtro
mostraria a semana inteira) e o orbe decorativo (`QuickQuestionOrb`) - chrome compartilhado via
`SessionShell.tsx`. `VideoActivity` embeda o YouTube de verdade (`youtube-nocookie.com`, a partir
de `CuratedContent.ExternalUrl`) - `rel=0`+`modestbranding=1` reduzem a interface do player ao
minimo que a API do YouTube permite sem uma integracao paga (nao remove 100% dos videos
recomendados no final). Concluir qualquer uma das duas so faz `POST .../responses` com corpo
vazio (Score sempre 100 no servidor, ver acima) e avanca - sem `FeedbackPanel`, ja que nao ha
gabarito pra revelar.

**Menu de configuracoes (Fase 7):** `SettingsMenu`, montado em `TodayPage` sobre a tela de estudo -
`backdrop-blur` nativo (sem borrar a arvore de tras manualmente). ESC e o botao "voltar" do
navegador, enquanto a sessao esta ativa (ha um `step` resolvido e a Daily ainda nao foi concluida
nesta visita), abrem o menu em vez de deixar o usuario sair - `useSessionExitGuard` (hook local em
`TodayPage.tsx`) empurra uma entrada de historico "sentinela" via `history.pushState` e a
"recusa" no `popstate`, porque o app usa `<BrowserRouter>` declarativo (nao `createBrowserRouter`),
que nao expoe `useBlocker`. Acoes reais: fechar (fecha o menu), "Sair e salvar progresso" (navega pra `/start` - o progresso
ja esta salvo a cada resposta enviada ao servidor, nao ha nada extra pra persistir) e, desde a
Fase 13, **"Sair da Conta"** (`onLogout` - `useAuth().logout()` + navega pra `/login`; pede
confirmacao via `window.confirm` antes, pra evitar logout acidental no meio de uma sessao de
estudo). O node do Figma pra este menu mostrava so "Fechar (ESC)"/"Sair da conta" (sem a opcao de
Fase 7) - as duas convivem, sao acoes diferentes (sair da sessao de estudo != sair da conta), e o
botao foi implementado como link de texto simples (nao o botao grande com preenchimento vermelho
do Figma) pra manter consistencia visual com os outros 2 links ja existentes nesse menu.
Aparencia/Som/Notificacoes/Limite de gravacao/Perfil e Analogias/Atalhos continuam placeholders
visuais, sem persistencia.

**Feedback unificado (Fase 7):** `FeedbackPanel`, usado pelos 5 componentes de atividade avaliada
(`OptionsAnswer`, `ClozeFreeTextActivity`, `RoleplayActivity`, `VoiceSummaryActivity`) no lugar do
bloco de "reveal" que cada um tinha por conta propria - gauge circular de `Score`, inset com a
resposta do usuario (so quando ha `transcript`), texto de `aiFeedback` (so quando existe) e uma
linha de detalhe especifica do tipo (`Resposta esperada`/`Qualidade do desfecho`, via a prop
`detail`). Nao reproduz a divisao em 2 colunas "o que acertou / onde melhorar" do design porque o
dominio so guarda `AiFeedback` como 1 string unica (`GroqContentEvaluationService`), nao uma lista
estruturada - sem mudar nenhum comportamento funcional dos 5 componentes, so a apresentacao final.
Permissao de microfone negada mostra uma mensagem clara **e mantem o botao disponivel** pra
tentar de novo (bug corrigido durante a verificacao ao vivo - a primeira versao escondia o botao
inteiro nesse estado, sem jeito de tentar de novo sem recarregar a pagina).

**`/admin/conteudo`, autoria de conteudo curado (Fase 6):** tela de bastidor, sem autenticacao,
mesmo padrao funcional (nao visual) de `/start` - ramifica por query string (`?course=`,
`?weekly=`), reaproveitando os mesmos endpoints de leitura que `/start` ja consumia. Lista o
`CuratedContent` da semana com indicador Completo/Pendente (`externalUrl || bodyText` preenchido)
e um formulario unico que cria (`POST`) ou edita (`PUT`) dependendo se um item da lista esta
selecionado - `Type` so e editavel na criacao (nunca muda depois, regra que ja existia no
backend desde a Fase 4). Existe porque a curadoria de leitura/video (ao contrario da estrutura
Course/Monthly/Weekly/Daily, que muda raramente e continua so via seed) se repete toda semana -
ver `docs/fase-6/resumo-implementacao-fase-6.md`.

**`/start` continua funcional mas sem o mesmo polimento visual das telas de atividade** - decisao
da Fase 3, ainda valida (so as telas de `/hoje` precisavam estar "as mais validadas no Figma").
`/admin/conteudo` segue o mesmo padrao de "funcional, nao o mesmo nivel de `/hoje`".

Paleta (Tailwind v4, tokens em `@theme` dentro de `index.css`, sem `tailwind.config.js`):
`--color-base` (`#0A0A0A`), `--color-surface` (`#151515`), `--color-surface-alt` (`#1E1E1E`,
"surface-raised" no Figma - fundo de pilulas/linhas elevadas), `--color-stroke` (`#2A2A2A`, Fase
19 - borda de cards/inputs, distinto de `surface-alt` mesmo sendo um cinza proximo), `--color-accent`
(`#39FF6A`), `--color-alert` (`#FF3B3B`), `--color-primary`/`secondary`/`muted`
(`#F5F5F5`/`#9A9A9A`/`#5C5C5C`), `--color-project` (`#FFB800`, Fase 7 - tema ambar de Projeto
Semanal, reaproveitado no badge "Roleplay de Decisoes" desde a Fase 19). Tons translucidos de
"preenchimento" (selecionado-mas-nao-confirmado no Quiz, gauge de Score no FeedbackPanel) usam
`bg-accent/25`/`bg-project/15` (opacidade Tailwind) em vez de token proprio - aproximam o
"neon-green-dim" (`#1F5C33`) do Figma sem inventar mais uma cor fixa pra um uso so de translucidez.

Fontes: `--font-sans` (Inter, Fase 19 - default do app inteiro, nenhuma tela tinha fonte propria
antes), `--font-display` (Archivo) e `--font-mono` (Fira Code) - os 2 ultimos escopados so a
elementos explicitos do Login/Registro (Fase 18), nao o default. Todas carregadas via Google Fonts
(`@import url(...)` no topo de `index.css`, antes de `@import "tailwindcss"` - ordem exigida por
CSS).

## Fora de escopo ate agora

- Servico de WhatsApp (`whatsapp-service/` e so placeholder).
- **Resolvido na Fase 13a, nao e mais pendencia:** autenticacao real (`User`, Fase 12) +
  matricula (`Enrollment`, Fase 13) + protecao (`.RequireAuthorization()` + filtro por dono) em
  todo endpoint de curso/weekly/daily/publicacao.
- **Resolvido na Fase 13b, nao e mais pendencia:** UI de onboarding/selecao de curso
  (`OnboardingWelcomePage`/`ProfileInterviewPage`/`CourseSelectionPage`/`EmptyStateStartPage`,
  ver secao de Frontend) - um usuario novo agora e guiado do registro ate `/start` sem travar em
  nenhum ponto, sem precisar de `curl` manual.
- **Resolvido na Fase 11, nao e mais pendencia:** integracao com GitHub (via `HttpClient` cru, sem
  Octokit.NET - a afirmacao do prompt de que "Octokit ja estava configurado desde a Fase 1" era
  falsa) e exigencia de publicacao publica (LinkedIn/GitHub) pra desbloquear o proximo modulo -
  ver "Publicacao publica e bloqueio de modulo" acima. O fluxo GitHub em si nunca foi exercitado
  contra a API real do GitHub (decisao explicita do usuario nesta fase).
- Geracao de conteudo/avaliacao via IA pra Cloze/Roleplay - **reconfirmado na Fase 4**:
  Cloze/FreeText usa comparacao textual simples, Roleplay usa mapeamento fixo de
  `TerminalQuality` (ver "Score no servidor") - nenhum dos dois e avaliacao inteligente de
  verdade. So `VoiceSummary` usa avaliacao por IA de verdade (Groq, desde a Fase 5).
- **Resolvido parcialmente na Fase 14:** Gems/Streak agora sao dado real (ver "Gamificacao" na
  secao de Modelo de dominio). **Ainda em standby:** Marketplace/Cosmeticos/Arcade/UGC (nada pra
  gastar Gems ainda, Fase 17), Ranking/Score de Estudo (Fase 16), XP/Level/Elo/Patente (reservado
  pra quando existir Squad/PvP, Fase 19+, confirmado explicitamente fora do escopo da Fase 14).
- Endpoints de autoria de Course/Monthly/WeeklyTemplate/DailyTemplate/DailyActivity - so
  `CuratedContent` tem autoria via Api desde a Fase 4 (ver "Autoria de conteudo curado"); o resto
  da estrutura continua so via `SeedWebSecurityCourseUseCase` (estrutural, muda com pouca
  frequencia).
- **Resolvido na Fase 6, quebrado de novo na Fase 13a, reconsertado na Fase 13b:** tela de
  autoria de conteudo curado no frontend (`/admin/conteudo`) - ver "Autoria de conteudo curado"
  acima.
- Exclusao (`DELETE`) de `CuratedContent` - so criacao/edicao existem; nunca foi pedido um
  endpoint de remocao.
- CORS liberado so para `http://localhost:5173` (hardcoded, dev apenas).
- Retry automatico em falha da chamada a Groq - se a transcricao/avaliacao falhar (rede, rate
  limit), o usuario precisa gravar de novo manualmente.
- **Resolvido na Fase 7, nao e mais pendencia:** menu de configuracoes no frontend - so que
  Aparencia/Som/Notificacoes/Limite de gravacao/Perfil/Atalhos continuam so visuais, sem
  persistencia (ver "Menu de configuracoes" na secao de Frontend).
- Cosmeticos/ranking (mesma pendencia acima) - reconfirmado em standby na Fase 7, mesmo aparecendo
  em telas adjacentes do Figma usado nessa fase; Gems deixou de estar nesta lista na Fase 14.
- O enunciado do Projeto Semanal (`WeeklyProjectSpecText`, hoje em `WeeklyTemplate` - Fase 13a
  moveu pra la, curriculo compartilhado) so e texto livre unico - o mockup do Figma da tela de
  Projeto Semanal mostra titulo/objetivos/recursos adicionais como campos separados, que o dominio
  nao tem (ver "Duvidas" em `docs/fase-7/resumo-implementacao-fase-7.md`).
- **Resolvido na Fase 11, nao e mais pendencia:** `WeeklyProject.Evaluate()` ganhou endpoint
  (`POST .../project/evaluate`, `EvaluateWeeklyProjectUseCase`) - so backend, sem UI (nao ha papel
  de "revisor" neste app de usuario unico), mas necessario pra `IsModuleComplete()` algum dia
  virar `true` de verdade.
- **Resolvido na Fase 10, nao e mais pendencia:** telas de erro no frontend (sem conexao, timeout,
  vazio, erro generico) - antes uma falha de fetch so mostrava texto vermelho solto
  (`<Centered text={error} tone="alert" />`).
- "Modo Offline" (cache local pra continuar navegando sem servidor) e "Reportar" (mailto/formulario
  de feedback no erro generico) - ambos citados no prompt da Fase 10 como "futuro", sem cache local
  nem endereco de suporte pra apontar ainda.
- **Resolvido na Fase 22, nao e mais pendencia:** sistema de sessao/expiracao - o design "Erro -
  Sessao Expirada" da Fase 10 ganhou tela, como modal global - ver "Sessao expirada: interceptor
  global de 401 (Fase 22)" acima.

## Fases concluidas

| Fase | Nome | Resumo |
|---|---|---|
| 1 | Dominio e Schema (Backend .NET) | `docs/fase-1/resumo-implementacao-fase-1.md` |
| 2 | Monorepo Git + API Real (Backend .NET) | `docs/fase-2/resumo-implementacao-fase-2.md` |
| 3 | Correcoes de Api, Seed de Conteudo e Inicio do Frontend | `docs/fase-3/resumo-implementacao-fase-3.md` |
| 4 | Autoria de Conteudo, Conclusao da Daily e Telas Restantes | `docs/fase-4/resumo-implementacao-fase-4.md` |
| 5 | Correcao de Ambiguidade + Captura e Avaliacao de Voz | `docs/fase-5/resumo-implementacao-fase-5.md` |
| 6 | Tela de Autoria de Conteudo Curado | `docs/fase-6/resumo-implementacao-fase-6.md` |
| 7 | Etapas de Conteudo, Projeto Semanal, Menu de Configuracoes e Feedback Unificado | `docs/fase-7/resumo-implementacao-fase-7.md` |
| 8 | Polimento das Telas de Navegacao (Start, Visao Semanal, Detalhes do Curso) | `docs/fase-8/resumo-implementacao-fase-8.md` |
| 9 | Polimento das Atividades Individuais (Quiz, Cloze, Ligar Palavras, Roleplay) | `docs/fase-9/resumo-implementacao-fase-9.md` |
| 10 | Estados de Erro | `docs/fase-10/resumo-implementacao-fase-10.md` |
| 11 | Sistema de Publicacao Publica | `docs/fase-11/resumo-implementacao-fase-11.md` |
| 12 | Fundacao de Autenticacao (Backend) + Splash & Login/Registro (UI) | `docs/fase-12/resumo-implementacao-fase-12.md` |
| 13a | Template vs Instancia, Matricula e Logout (Backend) | `docs/fase-13a/resumo-implementacao-fase-13a.md` |
| 13b | Onboarding (UI) + Correcao do /admin/conteudo | `docs/fase-13b/resumo-implementacao-fase-13b.md` |
| 14 | Motor de Gems + Streak | `docs/fase-14/resumo-implementacao-fase-14.md` |
| 15 | Conta-Giros Visual + Bonus de Superacao | `docs/fase-15/resumo-implementacao-fase-15.md` |
| 16 | Score de Estudo + Ranking | `docs/fase-16/resumo-implementacao-fase-16.md` |
| 17 | Marketplace de Cosmeticos + Trofeus/Badges + Sistema de Indicacao | `docs/fase-17/resumo-implementacao-fase-17.md` |
| 18 | Perfil, 3 Abas | `docs/fase-18/resumo-implementacao-fase-18.md` |
| 19 | Fidelidade Visual - Sessao Diaria | `docs/fase-19/resumo-implementacao-fase-19.md` |
| 20 | Fidelidade Visual - Navegacao & Perfil + Correcao de Rota Full-Bleed | `docs/fase-20/resumo-implementacao-fase-20.md` |
| 21 | Avaliacao de Projeto e Conteudo por IA + Narracao por Voz | `docs/fase-21/resumo-implementacao-fase-21.md` |
| 22 | Sessao Expirada (Modal Global) | `docs/fase-22/resumo-implementacao-fase-22.md` |

## O que uma proxima fase provavelmente precisa saber

- O contrato da Api (rotas, DTOs, formato de erro) esta documentado na secao "Superficie da
  API" acima; o client tipado do frontend (`frontend/src/api/`) e o exemplo de referencia de
  como consumi-lo.
- **Ligar Palavras ainda nao e um matcher visual de 2 colunas com drag-and-drop** (o design do
  Figma mostra essa interacao) - cada termo continua sendo respondido como multipla escolha
  independente (`OptionsAnswer`, decisao da Fase 4). Reconstruir a interacao pra bater com o Figma
  e um pedido explicito pra uma fase futura, nao um ajuste de polimento (ver
  `docs/fase-9/resumo-implementacao-fase-9.md`).
- **Resolvido na Fase 19, nao e mais pendencia:** Cloze e Roleplay (Dias 3/4 do seed) nao tinham
  sido exercitados ao vivo desde a Fase 9 (so Quiz e WordMatch) - verificados via Playwright com
  data ajustada por SQL (mesma tecnica das Fases 15-18), confirmando fidelidade visual dos 8 telas
  de sessao de ponta a ponta.
- **Resolvido na Fase 22, nao e mais pendencia:** "Sessao Expirada" (1 dos 4 designs do Figma da
  Fase 10) - interceptor global de 401 "nao_autenticado" + `SessionExpiredModal`, ver "Sessao
  expirada: interceptor global de 401 (Fase 22)" acima.
- **"Streak Perdido" (o outro dos 4 designs do Figma da Fase 10) continua sem tela** - tela
  dedicada de "voce perdeu o streak" - Streak virou dado real na Fase 14 (`UserStreak`), mas
  nenhuma tela de alerta especifica foi pedida/construida - o streak quebrado so aparece como `0`
  no `StreakIndicator` normal.
  Ver `docs/fase-10/resumo-implementacao-fase-10.md` pra tabela completa do que cada link do Figma
  continha de verdade vs. o que o prompt dizia.
- **Testando erros de rede com Playwright: usar o host completo no glob de `page.route()`**
  (ex: `http://localhost:5282/api/**`), nunca so `**/api/**` - o Vite dev server serve os arquivos-
  fonte do frontend por HTTP (`/src/api/client.ts`, `/src/api/types.ts`), um glob generico demais
  intercepta esses modulos tambem e quebra o app inteiro (tela em branco) antes mesmo de qualquer
  chamada de Api de verdade acontecer - descoberto durante a verificacao ao vivo da Fase 10.
- **Timeout do cliente e por chamada** (`request(path, { timeoutMs })`, `api/client.ts`) - qualquer
  endpoint futuro que demore mais que os 10s padrao (como o de audio, ver "Timeout de requisicoes")
  precisa passar seu proprio `timeoutMs`, senao a `TimeoutError` aparece antes do backend ter
  chance de responder de verdade.
- **`Focadu.Tests` so testa dominio puro** (entidades, `Weekly`/`Daily`, `EvaluationPolicy`) e
  funcoes `internal static` da camada de aplicacao que nao dependem de repositorio
  (`SubmitActivityResponseUseCase.ResolveScore`, `DailyStateMapper.ToDto`) - **nao ha fakes de
  `ICourseRepository`/`IWeeklyRepository`/etc. em lugar nenhum do projeto**, entao casos de uso
  simples de leitura/mapeamento (`GetCourseDetailUseCase`, `GetWeeklyDetailUseCase`) nunca tiveram
  teste dedicado; a checagem desses fica pra verificacao ao vivo (Postgres real + `dotnet run` +
  requisicoes reais), nao unit test. Se uma fase futura decidir que vale a pena introduzir fakes de
  repositorio, isso e uma decisao de infraestrutura de teste nova pro projeto, nao so "mais um
  teste".
- `WeeklyOverviewDto` (dentro de `CourseDetailDto`, usado por `CourseDetailPage` no frontend) tem
  um campo `Days` (Fase 8) com status por dia - pensado pra grids de navegacao, nao pra logica de
  negocio. Se o numero de Dailies por Weekly crescer muito, isso engorda a resposta de
  `GET /api/courses/{courseId}` proporcionalmente.
- `GET /api/today` e `GET /api/dailies/{dailyId}` retornam o mesmo `DailyStateDto` -
  `AccessMode` e o campo que decide se a tela deve ser editavel ou so leitura.
- `POST .../responses` nao tem mais campo `Score` - todo tipo de atividade calcula o Score no
  servidor (ver "Score no servidor para todo tipo de atividade" acima). Qual campo usar
  (`SelectedOptionId`/`Transcript`/`SelectedRoleplayNodeId`/arquivo de audio) depende do
  `ActivityType`/`AnswerMode`.
- Gabarito (`IsCorrect`/`ExpectedAnswer`/`TerminalQuality`) so aparece depois da primeira
  resposta - o frontend precisa re-buscar o estado da Daily apos um submit pra ver o gabarito
  revelado (o resultado do submit em si nao traz as opcoes/nodes atualizados).
- Toda `Entity` precisa de `ValueGenerated.Never` no `Id` pra funcionar corretamente com EF Core
  quando adicionada a um grafo ja tracked (ver "Bug de concorrencia do EF Core", Fase 3) - se uma
  fase futura adicionar uma entidade nova, isso ja esta coberto globalmente em
  `FocaduDbContext.OnModelCreating`, nao precisa reconfigurar por entidade.
- **Resolvido na Fase 13:** `GET /api/today` nao assume mais "1 Course Active" global - resolve
  pela Enrollment do usuario logado. Ainda assume no maximo 1 Enrollment por usuario (`409
  multiplas_matriculas_ativas` se houver mais de uma) - quebra sozinho se um usuario puder se
  matricular em varios cursos ativos ao mesmo tempo sem um jeito de escolher "qual curso agora".
- No frontend, qualquer tela que mostre mais de uma "atividade" em sequencia (como `TodayPage`)
  precisa decidir explicitamente *quando* avançar pra proxima, nao só reagir a toda mudança de
  dado - ver "Maquina de passo (Step)" na secao de Frontend. Reagir automaticamente a cada
  atualizacao de estado engole o feedback da ultima resposta - o mesmo cuidado vale pra qualquer
  estado com "tentar de novo" (ex: permissao de microfone negada): nunca esconder a acao que
  permite ao usuario reagir ao proprio erro.
- Model binding malformado (JSON invalido, `multipart/form-data` sem o campo esperado) lanca
  `BadHttpRequestException` *antes* do endpoint rodar - `ApiExceptionHandler` ja trata isso
  globalmente (`requisicao_invalida`, 400) desde a Fase 5, nenhum endpoint novo precisa se
  preocupar com isso individualmente.
- **`GET /api/curated-content/{id}` (Fase 7)** existe pra dar ao frontend o conteudo de uma
  `DailyActivity` Reading/Video - se uma fase futura extinguir esse padrao (ex: embutir o
  `CuratedContent` direto no `DailyActivityDto`), vale revisar se o endpoint isolado ainda e
  necessario (autoria/`/admin/conteudo` nao o usa, so `ReadingActivity`/`VideoActivity`).
- **Resolvido na Fase 5, nao e mais pendencia:** transcricao/avaliacao por voz validadas
  end-to-end com uma chave Groq real - transcricao (`whisper-large-v3`) funcionou de primeira;
  avaliacao expos que `llama-3.3-70b-versatile` (escolha original) tinha saido do catalogo da
  Groq (`model_not_found`), corrigido pra `openai/gpt-oss-120b`. Resposta real obtida: score,
  feedback em portugues e transcricao corretos. Ver `ponytail:` em `GroqContentEvaluationService`.
- **Resolvido na Fase 5, nao e mais pendencia:** a ambiguidade de `/api/today` quando 2+ Dailies
  compartilham a mesma `Date` (Daily normal + Daily de reforco geradas no mesmo dia) - ver
  `Weekly.GetDailyByDate` acima.
- **GitHub nunca foi testado contra a API real** (Fase 11, decisao explicita do usuario) - o
  codigo (`GitHubService`, `CommitModuleSummaryUseCase`, `SubmitPublicationUseCase`,
  `EvaluateWeeklyProjectUseCase`) espelha o padrao ja comprovado do Groq, mas so foi verificado
  estruturalmente (Playwright `page.route()` mockando as respostas). Revisao de codigo nesta fase
  (sem chave real ainda) achou e corrigiu um bug real - `CommitFileAsync` fazia `PUT contents` sem
  `sha`, o que quebra ao sobrescrever um arquivo que ja existe (422) - e removeu `GitHubOptions.
  Username` (dead config, nunca foi lido). Validacao ao vivo continua pendente (mesmo padrao da
  Fase 5 com o Groq, feita pelo Falves): checklist completo em "Como configurar o token do
  GitHub" acima, cobrindo `github-commit` (incluindo commitar 2x pro mesmo modulo, o caso que
  quebrava), `submit` com repo publico/privado/inexistente, `POST /project/evaluate` contra
  codigo de verdade, e token sem escopo `repo`.
- **Validacao de publicacao no LinkedIn e so estrutural** (Fase 11) - confirma o formato da URL
  (`linkedin.com/posts/...` ou `linkedin.com/feed/update/...`), nunca o conteudo do post. Nao ha
  API gratuita simples de conteudo do LinkedIn pra resolver isso - limitacao conhecida, ja
  sinalizada assim no prompt original da fase.
- **Resolvido na Fase 13a:** bloqueio de modulo ja atravessa Monthlies - a troca de
  `GetByMonthlyIdAsync` por `GetByEnrollmentIdAsync` em `StartOrResumeDailyUseCase` (feita pelo
  refactor Template/Instance, nao um pedido explicito) faz o bloqueio olhar a Weekly `Number - 1`
  em qualquer Monthly da mesma Enrollment, nao so dentro do mesmo Monthly. Ver "Publicacao publica
  e bloqueio de modulo" acima.
- **Toda navegacao 1:1 nova entre entidades precisa de `HasOne`/`WithOne` explicito** na
  `IEntityTypeConfiguration` correspondente (ver "Bug real: navegacao 1:1 sem HasOne", secao de
  Persistencia) - a coluna FK + indice unico sozinhos nao bastam pro EF Core reconhecer a
  propriedade como navegacao inclui­vel.
- **Qualquer estado local (`useState`) de um componente que deveria resetar ao trocar de
  "entidade exibida" via query string precisa de uma `key` na instancia** (ver "Bug real: modal
  preso ao trocar de Weekly", secao de Frontend) - trocar so a prop nao remonta o componente
  sozinho em React.
- **Nunca dispare um refetch que muda `loading` do componente pai enquanto um modal filho ainda
  esta mostrando seu proprio resultado** (ver "Bug real: `onPublished` desmontava o modal", secao
  de Frontend) - o refetch precisa esperar o usuario decidir sair (`onClose`), nao disparar no
  meio do fluxo de sucesso/erro do modal.
- **"Auditoria de Repositorios" (citada no prompt da Fase 11 como proxima fase) depende de uma
  decisao de escopo (estatica vs. dinamica) antes de virar um prompt tecnico** - ainda em aberto
  (a Fase 12 acabou entrando antes, com a mudanca de direcao pra autenticacao real).
- **Resolvido na Fase 13a:** todo endpoint de curso/weekly/daily/publicacao/conteudo curado agora
  tem `[Authorize]` e filtra pela Enrollment do usuario logado (ver "Superficie da API" e "Modelo
  de dominio" acima) - a excecao documentada e `/admin/conteudo`, que ainda depende de endpoints
  de autoria que nao foram adaptados pro lado Template (ver bullet acima).
- **Sem botao de logout na UI** (Fase 12) - fora do checklist desta fase (so splash + login/
  registro); verificado ao vivo direto via `POST /api/auth/logout`. Uma fase futura de Perfil e
  provavelmente o lugar certo.
- **`IJwtTokenService` so gera token, nao valida** - a validacao de qualquer JWT recebido e feita
  pelo middleware `JwtBearer` do ASP.NET Core (`Program.cs`), nao por um metodo do port. Se uma
  fase futura precisar validar um token fora do pipeline HTTP normal (ex: um worker em background),
  vale revisitar essa decisao.
- **`Jwt:SecretKey` e a unica config nova que derruba o boot da Api se ausente** (mesmo tratamento
  da connection string) - diferente do padrao "ausente e tolerado" usado por `Groq:ApiKey`/
  `GitHub:Token`. Motivo: autenticacao virou fundacao a partir desta fase, no sentido literal de
  que nada relacionado a sessao funciona sem essa chave.
- **Propriedade computada sem campo de apoio (`Weekly.Number`, `Daily.Activities` etc., Fase 13a)
  precisa de `builder.Ignore(...)` explicito na `IEntityTypeConfiguration`** - sem isso o EF Core
  tenta mapea-la como navegacao/coluna de verdade e derruba o `DbContext` inteiro na primeira
  query com `InvalidOperationException: "No backing field was found for property..."`. Qualquer
  propriedade nova do tipo `=> Template.Algo` numa fase futura precisa do mesmo tratamento (ver
  "Persistencia" acima).
- **Indice unico que envolve uma entidade que passou a ser Template compartilhado precisa incluir
  o "dono" por usuario na chave** (ver `ActivityResponses (DailyId, ActivityId, AttemptNumber)`,
  Fase 13a) - `ActivityId` sozinho (ou junto de `AttemptNumber`) colide entre usuarios diferentes
  assim que a entidade referenciada deixa de ser 1-por-instalacao e vira curriculo compartilhado.
  Esse bug foi pego em design, nunca chegou a rodar - qualquer indice unico novo que referencie
  uma entidade do lado Template precisa da mesma pergunta ("2 usuarios diferentes podem bater
  nesse mesmo par de valores?").
- **Matricula em mais de um Course quebra `/hoje` (`GetTodayUseCase`, Fase 13a) - nao corrigido na
  Fase 13b.** `CourseSelectionPage` so filtra cursos em que o usuario ainda nao esta matriculado
  (via `GetAvailableCoursesUseCase`), mas nao impede matricular-se num 2° curso enquanto ja tem 1
  ativo - hoje isso nunca acontece na pratica (so existe 1 Course seedado), mas assim que um
  2° Course real existir, um usuario que se matricule em ambos passa a receber
  `409 multiplas_matriculas_ativas` em `/hoje` pra sempre (`GetTodayUseCase` so aceita exatamente
  1 Enrollment). *ponytail: guarda client-side ausente de proposito (YAGNI - sem 2° curso real
  pra exercitar o caminho); se/quando um 2° Course for seedado, adicionar o guard em
  `CourseSelectionPage` (ou resolver `/hoje` pra aceitar N enrollments, escolhendo 1) antes disso
  virar alcancavel de verdade.*
