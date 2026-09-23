# Arquitetura da Focadu — estado atual

> Documento vivo. Nao e historico de decisoes (isso fica em `docs/fase-N/`) - e sempre um
> retrato do estado atual e consolidado do projeto. Ver `docs/CONVENCOES.md` para a regra de
> como e quando este arquivo e atualizado.
>
> Ultima fase que atualizou este documento: **Fase 62 - Menu global do Figma (node 178:143) + menu do usuario**.

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
                                       IPasswordHasher, IJwtTokenService (Fase 12, ver secao propria),
                                       IAiProviderHealthCheck (Fase 28 - status de IA, 1 impl por
                                       provedor, agregadas via IEnumerable no use case)
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
    System/                          <- GetAiProviderStatusUseCase (Fase 28), Dto no mesmo arquivo
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
      GroqHealthCheckService.cs             <- adapter de IAiProviderHealthCheck (Fase 28) -
                                                Singleton, cache em memoria de 45s, ver secao Groq
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
    Dailies/DailySequencingTests.cs <- FindNext/FindInProgress/IsNext cruzando Weeklies (Fase 38b) -
                                       Weekly.GetDailyByDate (Fase 5) removido, sequencia
                                       substitui data; + DailiesOfOtherWeeklies/FindPendingClosureBefore
                                       (Fase 54; regra transitiva na Fase 55), + FindPendingReinforcement
                                       (Fase 56)
    Weeklies/WeeklyTests.cs         <- + IsModuleComplete/RequiresPublicationToUnlock (Fase 11), +
                                       InitializeProject idempotencia (Fase 13), + acesso por
                                       isNextInSequence no lugar de Date (Fase 38b), +
                                       reforco fora da cota diaria, travas cross-Weekly e
                                       RequiresProjectToUnlock (Fase 54), + conclusao de reforco fora da
                                       cota diaria (Fase 55)
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
        │       ├── QuizOption (Text, IsCorrect)                  [Quiz, Cloze/MultipleChoice]
        │       ├── WordMatchPair (Term, DefinitionId, Definition)     [WordMatch, Fase 23]
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
        │                          Score, Passed, Transcript?, CorrectedTranscript? [Fase 39],
        │                          Justification?, AiFeedback?)
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

**`DailySequencing` (Application/Dailies, Fase 38b) substitui `Weekly.GetDailyByDate(date)` (Fase
5, removido):** resolve "qual Daily vem a seguir" cruzando TODAS as Weeklies da matricula
(`FindNext` = a Daily nao-reforco de menor `DayNumber` ainda nao concluida; `FindInProgress` =
qualquer Daily `InProgress` em qualquer Weekly, sempre prioridade). Reforco continua de fora da
sequencia principal por construcao (`FindNext` filtra `!IsReinforcement`) - acesso a ela e sempre
via link explicito (`Daily.ReinforcementDailyId`), nunca pelo atalho "/hoje". Ver "Acesso a uma
Daily" e "GET /api/today" abaixo pro motivo da troca (`Daily.Date` fixado na matricula nunca
acompanhava o ritmo real do aluno).

**`DailyActivity.Prompt` (Fase 3):** enunciado/pergunta da propria atividade (pergunta do Quiz,
contexto do Cloze/Roleplay) - sempre visivel ao cliente (nunca redigido, e o que o usuario precisa
ler pra responder). Faltava na Fase 1: so existiam `QuizOption` (as opcoes) e `ExpectedAnswer`
(gabarito do Cloze), sem nenhum campo pra guardar o texto da pergunta em si. Descoberto ao
escrever o seed de conteudo real da Fase 3 e confirmado com o Falves antes de mexer no schema -
ver `docs/fase-3/resumo-implementacao-fase-3.md`. WordMatch (Fase 23) normalmente nao usa este
campo - o "enunciado" e o proprio conjunto de `WordMatchPair`, ver abaixo.

**WordMatch: reforma completa do contrato na Fase 23 (revisita a decisao da Fase 4, ver
`docs/fase-9/resumo-implementacao-fase-9.md` pra por que ficou pendente ate aqui).** Ate a Fase
21: 1 termo = 1 `DailyActivity`, `Prompt` era o termo e `QuizOptions` eram as definicoes
candidatas (exatamente 1 correta) - o mesmo mecanismo de Quiz, reaproveitado; varias
`DailyActivity` WordMatch na mesma `Daily` formavam, juntas (so do ponto de vista do frontend), um
unico exercicio - cada termo continuava pontuando/penalizando independente pro dominio. A partir
da Fase 23, 1 `DailyActivity` WordMatch guarda o grupo de pares INTEIRO
(`DailyActivity.WordMatchPairs`, ver `WordMatchPair`) - submetido/pontuado de uma vez so
(`SubmitActivityResponseUseCase.ScoreFromWordMatchMatches`), nao mais 1 `ActivityResponse` por
termo. Pontuacao e parcial (percentual de pares certos, arredondado), nao tudo-ou-nada - reusa o
mesmo `EvaluationPolicy.PassingScore` (80) de qualquer outra atividade pra decidir `Passed`, entao
grupos pequenos (2-3 pares) na pratica exigem acertar quase tudo e grupos maiores (4+) toleram 1
erro, sem precisar de uma regra separada. `WordMatchPair.DefinitionId` e um Guid DELIBERADAMENTE
separado do `Id` do proprio par (que identifica o termo) - se o termo e a definicao saissem pro
cliente com o mesmo id, a correspondencia (o gabarito) vazaria so de olhar o JSON, sem jogar (ver
`DailyStateMapper`, que tambem embaralha a ordem das definicoes a cada carga pelo mesmo motivo).
Reforco (`CloneForReinforcement`) clona a atividade inteira, todos os pares - nao ha
granularidade menor que "o grupo todo" (mesma logica de "reforco nao clona so a alternativa
errada" do Quiz). `docs/fase-23/resumo-implementacao-fase-23.md` tem o detalhe completo.

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

**Streak**: dias consecutivos com pelo menos 1a conclusao de Daily no dia (`CompleteDailyUseCase`
so chama `RegisterCompletion` na 1a conclusao - replay nunca conta, nem soma nem quebra). Ate a
Fase 38b isso era condicionado a `Daily.Date == hoje` (comparando com o calendario hipotetico
fixado na matricula) - removido: uma 1a conclusao so pode mesmo acontecer "agora" (a acao e
sincrona), entao a checagem so servia pra parar de contar o streak de quem estivesse fora do
ritmo assumido na matricula, o mesmo bug de fundo do atalho "/hoje" (ver "GET /api/today" abaixo).
"Quebrar por inatividade" e deteccao de AUSENCIA de
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
tonalidade fixa por chamador (`PenaltyHeaderBadge`, `components/gamification/` - ate a Fase 35 era
`PenaltyGauge`, ver "Fase 36" na secao Frontend): neutro (0) -> amarelo (1) -> laranja (2,
`--color-project`) -> vermelho (limite atingido, `--color-alert`). Alimentado pelo
`PenaltyPoints`/`PenaltyThreshold` que ja vem no `DailyStateDto` - nenhum dado novo do backend so
pra isso, so exibicao.

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
Fases 14-17). `/perfil`, abas via query string `?tab=info|customizacao|conquistas|squad` (default
`info` - mesmo padrao de `/start?weekly=`). **Fase 24: 4a aba "Squad"** adicionada (decisao tomada
olhando `ProfileTabs.tsx` na hora - as 3 abas existentes sao leitura+acao pontual sobre o proprio
usuario, Squad tem fluxo proprio de criar/entrar/sair/remover + uma classificacao, entao ganhou aba
nova em vez de forcar dentro de Conquistas) - ver "Squad (Fase 24)" abaixo.

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
mesmo motivo de `IProjectEvaluationService`) 1 analogia POR SECAO do texto, ligando aquela secao
especifica a um cenario que reproduza o mecanismo dela (um interesse do aluno so entra quando o
reproduz fielmente - Fase 47, abaixo) - a "ancora pra analogia" que `CURADORIA.md` previa.
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

**Bug real, corrigido na Fase 38b:** o `SystemPrompt` de `GroqAnalogyGenerationService` nunca
pedia explicitamente "em portugues" (unico entre os adapters Groq do projeto - todos os outros
ja tinham essa instrucao) - `openai/gpt-oss-120b` ocasionalmente respondia em ingles, sobretudo
quando o interesse/hobby citado era um termo em ingles. Corrigido acrescentando a instrucao
explicita. Como `PersonalizedAnalogy` e gerado uma vez e nunca reavaliado (ver acima), uma
analogia ja cacheada em ingles antes deste fix continua em ingles ate o cache ser invalidado
manualmente (sem endpoint pra isso ainda - nao e o caso comum, avaliado como nao valer a pena
por ora).

**Fase 47: interesse do aluno virou opcional, prompt reescrito.** Feedback real: as analogias
saiam forcadas. O prompt original mandava "conecte um interesse do aluno ao conceito" e o modelo
inventava mecanica do hobby pra caber (ex: "lista de bans do CS" pra explicar OCSP, "convite/
confirmacao de partida do Valorant" pro handshake TCP); numa das rodadas de teste chegou a devolver
4 itens pra 3 secoes, que `ParseAnalogies` rejeita. `SystemPrompt` de `GroqAnalogyGenerationService`
agora manda: reproduzir o mecanismo elemento por elemento; usar o interesse SO quando isso for
verdade ("na duvida, nao use"); cair num cenario universal do cotidiano (correio, portaria, chaves,
cofres, filas...) nos demais casos; no maximo 3 frases curtas (~50 palavras); e traz um exemplo do
que nao fazer (handshake TCP explicado com a fila de uma partida de jogo) contra o que fazer
(ligacao telefonica). A mensagem do aluno passou a apresentar os interesses como opcionais e a
preferir cenario universal, e `temperature` caiu de 0.8 pra 0.4. Validado ao vivo contra a API real
do Groq antes de adotar (ver `docs/fase-47/`). So vale pras analogias geradas dali pra frente: o
cache `PersonalizedAnalogy` nao e reavaliado - pra regenerar uma leitura ja vista, apagar a linha
dela em `PersonalizedAnalogies` (as secoes, owned em `PersonalizedAnalogySections`, vao junto); sem
endpoint pra isso.

**Fase 48: guarda de idioma.** Logo apos o deploy da Fase 47 o modelo devolveu as 5 analogias do
dia 5 em INGLES (ja registrado na Fase 38b como comportamento ocasional de `openai/gpt-oss-120b`);
como o cache nunca e reavaliado, ficaria pra sempre. `GroqAnalogyGenerationService.ParseAnalogies`
agora rejeita a resposta se qualquer analogia parecer ingles (`LooksEnglish`: 3+ palavras funcionais
so do ingles E mais que as do portugues) com `ExternalServiceException("analogias_ia_idioma_invalido")`
- mesmo tratamento de JSON/contagem invalidos: nada e gravado, a leitura abre sem analogias dessa vez
e a proxima abertura tenta de novo. A mensagem do aluno tambem termina reforçando "em portugues do
Brasil". Sem retry automatico (uma 2a chamada custa ~3k tokens do limite gratuito de 8k/min do Groq).

**Fase 27: personalizacao estendida pra avaliacao de voz + rascunho de LinkedIn.** A Fase 21 so
cobria Leitura - `secret/MESTRE.md` secao 12 ainda listava "nenhum outro prompt de IA consome o
perfil" como pendencia (documento estava desatualizado nesse ponto, corrigido). Agora
`SubmitVoiceSummaryResponseUseCase` e `GenerateLinkedInDraftUseCase` tambem buscam `Interests`/
`AdditionalProfileNotes` do usuario (`IUserRepository.GetByIdAsync`) e repassam pro prompt -
`PersonalizationPromptBuilder` (`Focadu.Application.Shared`, publico ao contrario do resto da pasta
porque os adapters Groq moram em `Focadu.Infrastructure`) centraliza o texto da instrucao ("use
como analogia quando ajudar a explicar, sem forcar") pra nao duplicar a mesma frase nos 2
chamadores; retorna `null` sem interesses/notas, prompt fica identico ao de antes desta fase.
**Nunca entra no Score** - `GroqContentEvaluationService.BuildUserPrompt` injeta a instrucao so no
paragrafo de FEEDBACK, a nota continua vindo so de correcao/clareza (mesma garantia da Fase 4: nota
sempre recalculada no servidor, nunca influenciada por dado subjetivo do perfil).
`EvaluateWeeklyProjectUseCase` (avaliacao de projeto, mesmo `ContentEvaluationRequest`) foi deixado
de fora de proposito - decisao explicita, feedback sobre codigo nao ganha com analogia de hobby.
Sem teste dedicado pra `SubmitVoiceSummaryResponseUseCase`/`GenerateLinkedInDraftUseCase` (mesmo gap
ja documentado - "casos de uso simples... nunca tiveram teste dedicado", verificacao ao vivo);
`PersonalizationPromptBuilder.BuildInstruction` (a parte pura) tem teste dedicado
(`PersonalizationPromptBuilderTests`).

**Fase 30: diagramas de fluxo simples no Texto Cru - feedback do usuario de que texto corrido sem
referencia visual fica dificil de entender.** Extensao de convencao de markdown, sem nenhuma
mudanca de dominio/schema/migration (`BodyText` continua string livre - desde a Fase 13b nao ha UI
de autoria, tudo entra via skill `curar-conteudo` -> JSON -> seed). Um bloco cercado
` ```diagrama ` dentro do `BodyText` vira um diagrama de fluxo (`origem -> destino: rotulo` por
linha, ver `secret/curadoria/CURADORIA.md` secao 2.1); qualquer outro bloco cercado ` ``` ` vira
bloco de codigo monoespacado simples (bonus de baixo custo, mesma deteccao de fence). Frontend:
`lib/markdown.ts` ganhou `splitFences`/`stripFencedBlocks` (pre-passo pra isolar fences ANTES do
parser linha-a-linha de `MarkdownBlock.tsx`, que agora itera segmentos em vez do texto bruto) e
`parseDiagramSteps`/`DiagramStep` (parser do DSL, usado por `components/activities/
DiagramBlock.tsx` - layout unico de linhas empilhadas `[origem] -> [destino]`, cobre tanto
ping-pong entre 2 atores (three-way handshake TCP) quanto cadeia linear de N atores (resolucao
DNS), sem SVG). `ReadingActivity.tsx`: `wordCount` usa `stripFencedBlocks` antes de contar, pra
sintaxe do DSL nao inflar a estimativa de tempo de leitura. Backend: `GetCuratedContentUseCase`
ganhou `StripFencedBlocks` (internal static, mesmo padrao de `SplitIntoSections`), aplicado a cada
secao antes de montar o `AnalogyRequest` - o DSL de diagrama e ruido pro prompt da IA de
analogias, nao prosa explicavel; nao muda a quantidade de secoes, entao a correspondencia
secao<->analogia por indice e o cache em `PersonalizedAnalogy` continuam intactos. Prova de
conceito aplicada de verdade no Dia 1 (`semana-1/dia-1.json` - cadeia DNS + handshake TCP); os
outros 59 dias ficam como backlog (`CURADORIA.md` secao 4), retrofitados sob demanda via skill
nova `aplicar-elementos-visuais` (um dia por vez, nunca em lote - evita diagrama forcado num dia
sem sequencia real de atores). Ver `docs/fase-30/resumo-implementacao-fase-30.md`.

**Fase 31: mais 3 tipos de diagrama (`comparacao`/`camadas`/`partes`), alem do `sequencia` da Fase
30 - usuario pediu "tipos diferentes" depois de ver o primeiro funcionando.** So frontend mudou
(backend trata o bloco `diagrama` como texto opaco a stripar, independente do tipo por dentro -
`StripFencedBlocks` nao precisou de nenhuma mudanca). `lib/markdown.ts` ganhou
`parseDiagram(text): DiagramData` - dispatcher que le a 1a linha nao-vazia do fence (`tipo:
<nome>`); sem essa linha (retrocompatibilidade com os blocos da Fase 30), o tipo e `sequencia`.
`DiagramBlock.tsx` despacha pra 4 sub-componentes internos (`SequenceDiagram`/`ComparisonDiagram`/
`LayersDiagram`/`PartsDiagram`) + `EmptyDiagram` compartilhado - `comparacao` e um grid CSS 2
colunas (`esquerda | direita` por linha), `camadas` empilha caixas com indentacao crescente
(`marginInline` inline, proporcional ao indice), `partes` reaproveita o visual de pilula do
`sequencia` mas conectado por "+" em vez de "->" (composicao, nao causalidade). Prova de conceito
com 1 exemplo real de cada tipo novo: Dia 8 (`semana-2/dia-8.json`, `comparacao` - RBAC vs. ABAC),
Dia 56 (`semana-12/dia-56.json`, `camadas` - Defesa em Profundidade), Dia 1 ganhou tambem 1
`partes` (Anatomia da Requisicao HTTP). Ver `docs/fase-31/resumo-implementacao-fase-31.md`.

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
curso (troféu por 100% de conclusao) tambem nao existem - Squad existe desde a Fase 24, mas
XP/Level/Elo/Patente continuam fora de escopo (nunca foram parte do pedido de Squad, ver secao
propria abaixo). "Recorde de Streak" do mockup virou dado real (`GamificationSummaryDto.longestStreak`).
O 4o grupo de customizacao do mockup ("Avatar", a ilustracao do personagem) nao existe como slot
compravel - so os 3 slots reais de `CosmeticSlot` (Moldura/Cor do Nome/Banner) aparecem na aba
Customizacao.

### Squad (Fase 24)

Grupo de usuarios com 1 dono (`Squad.OwnerUserId`) - 3 papeis existem (owner/co-leader opcional/
member, ver "Sucessao de lideranca" abaixo, Fase 24b), sem aprovacao de convite: quem tem o
`JoinCode` (8 caracteres, mesmo alfabeto sem `0/O/1/I` de
`ReferralCode` - `Focadu.Application.Shared.UniqueCodeGenerator`, extraido nesta fase e
reaproveitado pelos dois) entra direto. "1 squad ativo por usuario" e garantido em 2 camadas: a
Application checa antes de criar/entrar, e um indice unico em `SquadMemberships.UserId` garante no
banco - sair do squad e hard delete da linha (sem flag "inativo"), permitindo entrar em outro
squad depois.

`JoinCode` nasce nulo e e gerado lazy (mesmo padrao de `User.ReferralCode`/`GetReferralInfoUseCase`)
dentro de `GetSquadRankingUseCase` - nao ha endpoint dedicado "GET /squads/me": a consulta de
ranking ja devolve nome/codigo/classificacao/agregados numa unica chamada, dobrando de "tela
inicial do squad" pro frontend.

`Members` do ranking e paginado (`?page=`, 20 por pagina fixo - Fase 24c, squad nao tem cap de
tamanho) - agregados/`CurrentUserEntry` continuam sobre o squad inteiro, so a lista e cortada.

**Ranking do squad reaproveita `GetCourseRankingUseCase.ComputeScore`/`RankEntries`/
`RankingEntryDto` (Fase 16) direto** - mesmo principio de Score sempre computado sob demanda,
escopado por `RankingScope` (weekly/monthly/course). **Gems, ao contrario de Score, NUNCA
respeitam `scope`** - `UserGemBalance` (Fase 14) so guarda o saldo total + um contador "neste mes
calendario" (pro cap de ganho), sem historico por semana/posicao no curriculo; `TotalGems`/
`AverageGems` no `SquadRankingResultDto` sao sempre o saldo total de cada membro. `TotalScore`/
`AverageScore` (que respeitam `scope`) e `TotalGems`/`AverageGems` juntos cobrem o "soma/media de
Score/Gems dos membros" pedido - alem da lista de membros (`RankingEntryDto[]`, mesmo shape do
ranking de Course, reaproveitado sem alteracao no frontend: `RankingTable`/`CurrentUserRankingCard`
servem os dois sem parametro squad-especifico).

**Resolvido na Fase 24b, nao e mais pendencia: sucessao de lideranca + limpeza de squad orfao.**
Owner sair nao bloqueia mais com outros membros dentro - a lideranca e transferida (referencia
Clash of Clans, decisao do usuario): `Squad.CoLeaderUserId` (opcional, promovido pelo Owner via
`PUT /api/squads/co-leader/{userId}`/`DELETE /api/squads/co-leader`, `SetSquadCoLeaderUseCase`)
herda primeiro; sem Co-Leader, o membro com `SquadMembership.JoinedAt` mais antigo (selecao pura
em `LeaveSquadUseCase.ResolveSuccessor`, testada sem repositorio). Owner sozinho: o squad e
deletado junto (`ISquadRepository.RemoveAsync`) - nunca mais fica orfao no banco.

**Fora de escopo, confirmado no prompt da Fase 24 (Co-Leader adicionado na 24b e a unica excecao)**:
papeis alem de owner/co-leader/member, aprovacao de convite, um usuario em N squads ao mesmo
tempo, qualquer entidade de "partida"/Challenge/PvP, Elo/Patente - continuam nao existindo.

### Caderninho de Anotacoes (Fase 29)

Anotacao livre do aluno (`Note`, `Focadu.Domain.Notes`), criada no contexto de uma Daily
especifica - ideia trazida por um colega, validada e mapeada em detalhe (incluindo mockups Figma)
em `secret/rascunhos/caderninho-de-anotacoes.md` antes desta fase. `Note` e aggregate root proprio
(nao filho de `Daily`): guarda so `UserId`/`DailyId` - nunca duplica `WeeklyId`/`CourseId`, esse
caminho ja existe via `Daily -> Weekly -> Enrollment -> Course` (mesmo principio de `Referral`/
`Enrollment`, sem navegacao de volta). `Content` e markdown livre (negrito/lista/link - ver
`MarkdownBlock.tsx` no frontend, estendido nesta fase pra suportar `**negrito**`/`[texto](url)`
inline, antes so tinha `###`/`####`/`- item`; `*italico*` entrou na Fase 51, com regra mais
restrita que o CommonMark - ver a Fase 51; codigo inline em crase e formatacao inline nos titulos
entraram na Fase 52; lista numerada `1.` e sub-bullets indentados entraram na Fase 58, quando a
especificacao do Projeto Semanal passou a usar o mesmo `MarkdownBlock`); `Tags` e `List<string>` mapeado como `text[]` nativo
do Postgres, mesmo padrao de `User.Interests` (sem tabela associativa - tags sao livres, sem
taxonomia pre-definida). Limites (`Focadu.Domain.Policies.NotePolicy`): `MaxContentLength` =
20.000 chars, `MaxTagCount` = 10, `MaxTagLength` = 40; tags sao trim + dedupe case-insensitive
(`NormalizeTags`) na criacao/edicao.

CRUD completo, sem restricao de janela de tempo. `CreateNoteUseCase`/`EditNoteUseCase` resolvem
`Weekly.Number`/`Daily.DayNumber` via `IWeeklyRepository.GetByDailyIdAsync` (mesmo idiom de
`GetDailyStateUseCase`) pra montar `NoteDto.WeekNumber`/`DayNumber` - o vinculo "Semana X, Dia Y"
que a UI mostra explicito, sem `Note` guardar isso. `ListNotesUseCase` (histico por Course, aba
"Caderninho") resolve os `DailyId` de toda a Enrollment via `IWeeklyRepository.
GetByEnrollmentIdAsync` (mesmo grafo de `GetCourseDetailUseCase`) e filtra `Note` por esse
conjunto - filtro por periodo/busca textual/tag acontece em memoria (volume por curso e pequeno,
dezenas de Dailies), nao via query composta no banco. **Filtro `dailyId` (Fase 57):** restringe as
notas a uma sessao - a Daily pedida **e, se ela for um reforco, a Daily base que o gerou**
(`NoteDailyScope.Resolve`, via `Weekly.FindReinforcementSource`, que segue `Daily.ReinforcementDailyId`
da origem pro reforco); Daily fora da matricula do usuario vira 404 `daily_nao_encontrada`, nunca
vaza nota de ninguem. `ListNoteTagsUseCase` reaproveita
`ListNotesUseCase` sem filtro, so extrai tags distintas (autocomplete).

**Frontend**: painel de captura rapida (`components/notebook/QuickNotePanel.tsx`), no sidebar de
material (`useMaterialSidebar.tsx`) - so escreve e salva, nunca lista nada, mantem o foco da
sessao. Ate a Fase 36 ficava empilhado embaixo do `MaterialSidebar`, na mesma coluna; a Fase 37
reagrupou o sidebar em 2 colunas (ver "Frontend" abaixo) e moveu o Caderninho pra coluna direita,
ao lado do novo `StudyAssistantPanel`. Aba "Caderninho" (`components/notebook/NotebookTab.tsx`)
dentro de `CourseDetailPage` (que ganhou abas pela 1a vez nesta fase -
`components/notebook/CourseDetailTabs.tsx`, mesmo padrao de `ProfileTabs.tsx`, lido via
`?tab=` na query string de `/start?course=` - precisa mesclar com os outros params da URL, nao so
substituir como `ProfilePage` faz, porque `/start` e uma rota so orientada por query string) -
lista agrupada por Semana/Dia, filtro por periodo/busca/tag, edicao/exclusao via
`NoteEditorModal.tsx`. `WeeklyDetailDto` ganhou `CourseId` nesta fase (ver tabela de endpoints
acima) - unico jeito do frontend montar o link "CADERNINHO" e o autocomplete de tags a partir do
contexto de uma Daily em andamento, sem endpoint novo.

**Consulta no Resumo Falado (Fase 35, ver `secret/rascunhos/caderninho-no-resumo-falado.md`):**
`VoiceSummaryActivity` ganhou o botao "📓 Ver minhas anotações de hoje", que abre
`DailyNotesModal.tsx` (novo, so-leitura, mesmo chrome de `ContentPreviewModal`) listando as notas
da Daily atual (ate a Fase 56 por DATA: `api.listNotes(courseId, {from: Daily.Date, to: Daily.Date})`;
**desde a Fase 57 por `dailyId`**, e num reforco o modal vira "Anotações do dia base" e mostra as
notas do dia que gerou o reforco - a busca por data deixava o reforco sempre vazio, porque o reforco
e outra Daily com a Date do dia em que foi gerado, e ainda vazava notas quando essa Date coincidia
com a data agendada de uma Daily futura). **So disponivel ANTES de comecar a gravar**
(`state === 'idle' | 'permission_denied'` no componente) - decisao deliberada: reler a propria nota
pra relembrar antes de falar e legitimo, mas poder ler ela em voz alta DURANTE a gravacao
esvaziaria o proposito da atividade (Score/Feedback avaliam recall real, ver "Resumo falado por
voz" abaixo). O botao some (e o modal fecha sozinho, defensivo) assim que `state` vira
`'recording'`.

**Inconsistencia conhecida, nao resolvida:** `MaterialSidebar`/`ContentPreviewModal` (Fase 23) ja
permitiam reler o material-fonte ORIGINAL (nao so a propria nota) a qualquer momento durante o
Resumo Falado, inclusive durante a gravacao - motivado por Dailies de reforco onde o Resumo Falado
e a UNICA atividade. Ou seja, o app ja era mais permissivo com o material-fonte do que a Fase 35 e
com as proprias notas do aluno - nao foi pedido resolver essa inconsistencia, so registrada (ver
rascunho) pra quem for mexer nisso de novo.

**`ContentPreviewModal` ganha 2a coluna com o Caderninho (Fase 36, correcao de bug real):**
`dailyId`/`courseId` novos e opcionais - quando os dois vem (todo call site real hoje, via
`useMaterialSidebar`), o modal (`fixed inset-0`, cobre a tela inteira) mostra `QuickNotePanel` numa
coluna ao lado do video/texto (`w-[940px]` em vez de `w-[640px]`). Antes disso o modal tampava o
proprio Caderninho que fica no sidebar - dava pra assistir o video OU anotar o que entendeu, nunca
os dois ao mesmo tempo, reportado numa verificacao ao vivo. Sem os 2 props cai pro layout de 1
coluna de antes (defensivo - nenhum call site atual deixa de passar os dois).

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
desbloqueio e inteiramente baseado em **sequencia** (desde a Fase 38b - ate entao era baseado em
data, ver "Acesso a uma Daily" abaixo pro porque da troca): `Weekly.EvaluateDailyAccess` recebe
`isNextInSequence` (calculado por `DailySequencing`, Application) toda vez que o acesso e
avaliado, e esse booleano por si so ja decide o que e permitido. Nenhum processo em background
precisa "virar" o Status de `Locked` para `Available` em nenhum horario - o valor
`DailyStatus.Locked` so importa como ponto de partida indiferenciado de `Available` (ambos aceitam
`Daily.Start()` igualmente).

### Acesso a uma Daily (`Weekly.EvaluateDailyAccess`)

> **Fase 38b (14->15/09/2026) - reescrita pra sequencia, nao mais calendario.** Ate aqui, a
> barreira pra Dailies ainda nao iniciadas comparava `Daily.Date` (fixado de uma vez so na
> matricula, 1 dia util por Daily - ver `EnrollUserInCourseUseCase`) com "hoje". Bug real relatado
> ao vivo: o aluno concluiu a Daily 1 num dia so, e no acesso seguinte "/hoje" pulou direto pra
> Daily 4 (calendarmente "a data de hoje"), deixando as Dailies 2 e 3 presas em `Locked` pra
> sempre - qualquer folga entre o ritmo hipotetico de 1-dia-util-por-Daily e o ritmo real do aluno
> tinha esse efeito. A barreira agora e sempre `isNextInSequence` (Daily nao-reforco de menor
> `DayNumber` ainda nao concluida, cruzando TODAS as Weeklies da matricula - ver
> `DailySequencing`), nunca mais uma comparacao de data. `Daily.Date` continua existindo (ainda
> populado por `EnrollUserInCourseUseCase`, ainda usado pro caso `Completed`/`Replay` abaixo e por
> exibicao no frontend), so parou de gatilhar acesso.

Dado "hoje" (`IClock.Today()`) e `isNextInSequence` (`DailySequencing.IsNext`, calculado fora da
Weekly - uma Weekly sozinha nunca enxerga as irmas), retorna um `DailyAccessMode`:

- **Daily `InProgress`, qualquer posicao na sequencia**: `Resume` - **independente de ser ou nao a
  `isNextInSequence`**, inclusive uma abandonada ha mais tempo. E a regra que permite recuperar uma
  Daily abandonada (o aluno comecou e nao terminou) em vez dela ficar presa nesse status pra sempre.
- **Daily `Completed`**: `Replay` se `Date == hoje`; senao `Replay` tambem, **exceto** `ReadOnly`
  quando ha alguma outra Daily `InProgress` em qualquer lugar da Weekly no momento (prioriza
  terminar o que esta pendente antes de repetir algo ja feito) - unico lugar do metodo que ainda
  compara `Date`, deliberado (ver nota acima: decide so o comportamento de replay de algo ja
  concluido, nunca bloqueia conteudo novo).
- **Daily ainda nao iniciada (`Locked`/`Available`) e NAO e a `isNextInSequence`** (e nao e
  reforco): sempre lanca `DomainException` (`Code = "daily_bloqueada"`) - ainda nao chegou a vez
  dela. Reforco (`IsReinforcement`) nunca disputa a sequencia principal - acesso e sempre por link
  explicito (`Daily.ReinforcementDailyId`), permitido mesmo sem ser a `isNextInSequence`.
- **Daily ainda nao iniciada e (`isNextInSequence` OU reforco)**: `Start`, **exceto**
  `DomainException` quando ja existe outra Daily `InProgress` em qualquer lugar da **matricula**
  (`Code = "daily_em_andamento"`, conclua/retome-a primeiro) ou quando outra Daily ja foi
  concluida hoje em qualquer lugar da matricula (`Code = "daily_limite_diario_atingido"`,
  comparando `CompletedAt` em hora local - ver comentario no metodo sobre UTC vs. hora local).
  **Reforco fica de fora da cota diaria nos dois sentidos** (Fase 55): nao e barrado por ela e a
  conclusao dele tambem nao a consome - so conclusoes de Dailies originais (nao-reforco) contam
  pra "uma por dia". "Uma em andamento por vez" continua valendo pra ele.

> **Fase 54 (21/09/2026) - as duas travas acima passaram a valer pra matricula inteira, e o
> reforco saiu da cota diaria.** Dois bugs reais relatados ao vivo no mesmo dia (Daily 5, a ultima
> da Semana 1):
>
> 1. **Reforco nao abria (409).** A tela de conclusao oferece "Ir para a sessao de reforco" na
>    hora, mas o reforco cai na mesma Weekly da Daily de origem, que acabara de gastar a cota
>    diaria - `daily_limite_diario_atingido`, mostrado como "Algo Deu Errado". O teste antigo
>    `AllowsStart_ForReinforcementDaily...` so passava porque avaliava em `today + 1`. Agora o
>    reforco nao e barrado pela cota (e, desde a Fase 55, a conclusao dele tambem nao a consome -
>    ver o bullet acima; na Fase 54 ele ainda contava).
> 2. **"Hoje" abria a Daily 6 (Semana 2) no mesmo dia.** `EvaluateDailyAccess` so enxerga a propria
>    Weekly, entao "1 por dia" e "1 em andamento" eram checados por Weekly, nao por matricula.
>    `EvaluateDailyAccess`/`StartOrResumeDaily` ganharam o parametro opcional
>    `otherWeekliesDailies` (as Dailies das OUTRAS Weeklies, montado por
>    `DailySequencing.DailiesOfOtherWeeklies`); `null` (default) = so a propria Weekly, o que
>    mantem os testes de dominio isolados intactos. Todos os casos de uso que avaliam acesso
>    (`GetTodayUseCase`, `GetDailyStateUseCase`, `StartOrResumeDailyUseCase`) passam o parametro.
>
> Efeito colateral a conhecer: uma Daily deixada `InProgress` em outra Weekly agora **bloqueia**
> iniciar o reforco (`daily_em_andamento`). Nao ha mais como chegar nesse estado pela Api. O dado
> que o bug antigo deixou no banco do aluno (Daily 6 `InProgress`, sem respostas) foi revertido pra
> `Locked` na mao em 21/09/2026 (UPDATE de 1 linha, autorizado pelo dono, com backup antes em
> `_backups/focadu-antes-update-dia6-*.dump`) - os "pontos abertos" de `docs/fase-54/` e
> `docs/fase-55/` que o citam sao historico e ja foram resolvidos.

### Reforco diario e semanal

Quando uma Daily atinge o limiar de penalidade, `Weekly.CreateDailyReinforcement` cria uma nova
`Daily` (`IsReinforcement = true`, vinculada a mesma `Weekly`), copiando apenas as
`DailyActivity` que tiveram ao menos uma resposta reprovada na Daily de origem - desde a Fase 13,
essas copias moram num `DailyTemplate` "sintetico" (`WeeklyTemplateId = null`, ver "Template vs
Instancia" acima), nao mais direto na Daily. "Dia fraco" = `Daily.IsWeakDay` (`PenaltyPoints >=
DailyPenaltyThreshold`). Ao acumular `WeeklyWeakDaysThreshold` dias fracos ainda nao cobertos por
um `WeeklyReinforcement` anterior, `Weekly.TriggerWeeklyReinforcement` cria o registro
correspondente.

**Como o aluno chega ate um reforco (Fase 56).** Ate a Fase 55 o unico caminho era o link "Ir para a
sessao de reforco" da `CompletionSummary` (tela de conclusao da Daily de origem), que aparece **uma
vez so** - nem a trilha nem a semana listam reforcos (ambas filtram `IsReinforcement`). Se o aluno
saisse dali, ou o clique falhasse (foi o caso da Fase 54), perdia o acesso. Agora
`DailySequencing.FindPendingReinforcement` acha a Daily de reforco **nao concluida** da matricula
(Status diferente de `Completed`; a `InProgress` primeiro, depois a da Weekly mais antiga) e
`GetTodayUseCase` devolve o id em `DailyStateDto.PendingReinforcementDailyId` - **so em
`GET /api/today`**, em qualquer `AccessMode` (inclusive `Blocked` e `WeekPendingClosure`); `null`
nos demais endpoints e quando nao ha reforco pendente. O frontend mostra o botao
(`PendingReinforcementCard`) no `StartDashboard`, acima do card de hoje, e dentro dos avisos de
"Hoje" bloqueado da `TodayPage` (cota diaria gasta e semana esperando o projeto). Some sozinho
quando a Daily de reforco e concluida. O texto vira "Continuar a sessao de reforco" quando o proprio
alvo de hoje e o reforco em andamento (`daily.id === pendingReinforcementDailyId`). Sem endpoint novo.

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
- **`Weekly.RequiresProjectToUnlock()`** (Fase 54): `AreDailiesComplete() && Project.Status !=
  Evaluated` (projeto `Pending` ou `Submitted`). Existe porque `RequiresPublicationToUnlock()` so
  liga com o modulo **ja completo** (projeto `Evaluated`): com o projeto ainda pendente **nada**
  segurava a proxima semana - bug real, a Daily 6 (Semana 2) abriu com o projeto da Semana 1
  `Pending`. Falso enquanto as Dailies nao estao todas concluidas (ai quem segura e a sequencia,
  `daily_bloqueada`) e falso sem projeto definido (nunca deve ocorrer; travar o curso pra sempre
  por dado ausente seria pior). A Weekly "fecha" (MESTRE 2.3) com Dailies + projeto avaliado +
  publicacao validada; `DailySequencing.FindPendingClosureBefore` junta as duas travas.
- **Bloqueio em si vive em `StartOrResumeDailyUseCase`** (Application), nao em `Weekly` -
  `Weekly.EvaluateDailyAccess` so enxerga a propria Weekly, nunca as irmas. O use case busca as
  Weeklies da mesma `EnrollmentId` (`IWeeklyRepository.GetByEnrollmentIdAsync` - trocado de
  `GetByMonthlyIdAsync` na Fase 13) e pergunta a `DailySequencing.FindPendingClosureBefore` se
  alguma Weekly anterior ainda nao fechou: se ela `RequiresPublicationToUnlock()`, lanca
  `modulo_bloqueado_por_publicacao` (409); se `RequiresProjectToUnlock()` (Fase 54), lanca
  `projeto_semana_anterior_pendente` (409) - ambos antes de chamar `Weekly.StartOrResumeDaily`.
  **Escopo: TODAS as Weeklies anteriores da mesma Enrollment** (Fase 55, decisao do dono: "se
  existe um projeto, todas as semanas seguintes ficam bloqueadas, do mesmo curso"; ate a Fase 54
  so a `Number - 1` era olhada, entao uma semana fechada no meio nao mantinha bloqueadas as
  seguintes a uma mais antiga ainda pendente). Devolve a mais antiga pendente. A troca pra
  Enrollment (Fase 13) fechou de graca a limitacao antiga ("nao atravessa Monthlies"): uma
  Enrollment cobre o Course inteiro, nao um Monthly especifico.
- **A trilha usa a mesma regra (Fase 55):** `WeeklyOverviewDto.IsLocked` (em
  `GET /api/courses/{courseId}`) e calculado no servidor por `FindPendingClosureBefore` - antes o
  `CourseDetailPage` trancava so a Weekly `N+1` e so por `requiresPublicationToUnlock` do
  cliente, entao com o projeto pendente as semanas seguintes apareciam destrancadas.
- **`GET /api/today` e a trava (Fase 54):** `GetTodayUseCase` e um GET "best-effort" - devolver a
  1a Daily da semana seguinte pra o cliente so descobrir o 409 ao clicar seria enganoso. Se alguma
  Weekly anterior a da Daily-alvo ainda nao fechou (`FindPendingClosureBefore`), ele devolve a
  **ultima Daily original dessa Weekly** (ja `Completed`) com `DailyAccessMode.WeekPendingClosure`
  (valor 5) - o cliente cai na Weekly que ainda tem o card do projeto/publicacao. Isso vem
  **antes** da checagem da cota diaria (`Blocked`): "volte amanha" nao resolveria. `StartOrResume`
  continua recusando a mutacao com 409.
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
  sem tela propria (nao ha papel de "revisor" neste app de usuario unico). **Ate a Fase 27b, nada
  no frontend chamava esse endpoint** - `SubmitWeeklyProjectUseCase` agora dispara essa avaliacao
  automaticamente logo apos aceitar a URL (composicao, chama `EvaluateWeeklyProjectUseCase.
  ExecuteAsync` por dentro), entao o bloqueio acima passou de "nunca engata de verdade" pra
  funcional - ver "Fase 27b" no changelog de fases.
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
| 🔒 GET | `/api/courses/available` | `GetAvailableCoursesUseCase` (Fase 13) | 200 - so cursos `Active` em que o usuario ainda nao esta matriculado |
| 🔒 POST | `/api/enrollments` | `EnrollUserInCourseUseCase` (Fase 13) | 201, 409 `ja_matriculado` - gera Weekly/Daily/WeeklyProject-instancia pra todo o curriculo do curso |
| 🔒 GET | `/api/enrollments/me` | `GetMyEnrollmentsUseCase` (Fase 13) | 200 (lista - hoje no maximo 1) |
| 🔒 GET | `/api/courses` | `ListCoursesUseCase` | 200 |
| 🔒 GET | `/api/courses/{courseId}` | `GetCourseDetailUseCase` | 200, 404 se nao existe/usuario nao matriculado (Fase 8: `WeeklyOverviewDto.Days` traz status por dia, pro mini-grid de `CourseDetailPage`) |
| 🔒 GET | `/api/courses/{courseId}/curriculum` | `GetCourseCurriculumUseCase` (Fase 13b) | 200, 404 - curriculo (Course -> Monthly -> WeeklyTemplate), sem exigir matricula; so `/admin/conteudo` usa isso |
| 🔒 GET | `/api/weeklies/{weeklyId}` | `GetWeeklyDetailUseCase` | 200, 404 se nao existe/nao e do usuario - Fase 15: `WeeklyDetailDto` ganhou `HasPendingWeeklyReinforcement`. Fase 29: ganhou `CourseId` (resolvido via `IMonthlyRepository.GetByIdAsync(weekly.MonthlyId)` - Weekly/instancia nao guarda CourseId direto, so Monthly/template). Fase 39: `DailyOverviewDto` ganhou `Title` (titulo do `CuratedContent` da atividade de Leitura do dia, Video como fallback; nulo se nenhum dos dois existir) - Daily nao tem titulo proprio, so usado por `WeeklyDetailPage` |
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
| 🔒 POST | `/api/users/me/forgejo-token` | `GenerateForgejoTokenUseCase` (Fase 60) | 200 `ForgejoTokenDto` - gera token novo do Forgejo e revoga o anterior; unico lugar onde o token inteiro aparece (nao e persistido). 404 `conta_git_inexistente` sem conta no Forgejo |
| 🔒 POST | `/api/weeklies/{weeklyId}/project/evaluate` | `EvaluateWeeklyProjectUseCase` (Fase 11) | 200, 400/404 - `WeeklyProject.Evaluate` existia desde a Fase 1, so faltava endpoint (so backend, sem tela propria). Fase 16: virou PUT com corpo `{score, feedback}` obrigatorio. Fase 21: voltou a ser POST sem corpo - nota/feedback agora vem da IA (GitHub + Groq, ver secao acima). Fase 27b: `SubmitWeeklyProjectUseCase` passou a chamar isso sozinho (composicao) logo apos o submit - nenhum chamador HTTP direto novo, o endpoint continua existindo do mesmo jeito |
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
| 🔒 POST | `/api/squads` | `CreateSquadUseCase` (Fase 24) | 201 (`SquadDto`), 409 `ja_esta_em_squad` |
| 🔒 POST | `/api/squads/join` | `JoinSquadUseCase` (Fase 24) | 200 (`SquadDto`), 404 `codigo_invalido`, 409 `ja_esta_em_squad` |
| 🔒 DELETE | `/api/squads/members/{userId}` | `LeaveSquadUseCase` (se `{userId}` = usuario logado) ou `RemoveMemberUseCase` (Fase 24) | 204, 404 `squad_nao_encontrado`/`membro_nao_encontrado`, 409 `dono_nao_pode_sair`/`dono_nao_pode_se_remover` |
| 🔒 GET | `/api/squads/me/ranking?scope=&page=` | `GetSquadRankingUseCase` (Fase 24) | 200 (`SquadRankingResultDto`) - gera `JoinCode` na 1a consulta (lazy), `Members` paginado (Fase 24c), 404 `squad_nao_encontrado` |
| 🔒 GET | `/api/system/ai-status` | `GetAiProviderStatusUseCase` (Fase 28) | 200 (array de `AiProviderStatusDto` - hoje so Groq), nunca 404/erro (a checagem em si nunca lanca, ver secao Groq abaixo) |
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
so que agora por usuario em vez de global.

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
achar `.git` (o seed pode rodar tanto da raiz quanto de `backend/`) - **Fase 40:** ou, se a env var
`CURATED_CONTENT_ROOT` estiver definida (caso do container Docker, que nao tem `.git`), usa ela
direto sem subir diretorio nenhum (ver "Docker e Deploy" abaixo). Dias 2-4 continuam no
placeholder - so o Dia 1 foi pedido nesta fase, trocar os outros e a mesma 1 linha cada.

## Certificacoes de mercado sugeridas por modulo (Fase 45)

Informativo (nunca emissao de certificado): mostra ao aluno quais certificacoes de seguranca
reconhecidas pelo mercado (CompTIA Security+, eJPT, CEH, PNPT - lista aberta, nao travada nessas
4) o curriculo ja cobre ou se aproxima de cobrir, por `Monthly` (os 4 modulos grandes do curso -
diferente da granularidade de `Weekly`/"modulo" usada por `ModulePublication`, ver "Prova publica
de evolucao" abaixo; os dois usos de "modulo" nao coincidem, cuidado ao ler codigo antigo). Origem:
`secret/rascunhos/informativo-certificacoes.md`.

**Dominio**: `CertificationCoverage` (`Focadu.Domain.Monthlies`) - entidade filha de `Monthly`,
mesmo padrao de `CuratedContent` (filha de `WeeklyTemplate`): imutavel apos criacao, so
instanciavel via `Monthly.AddCertificationCoverage(code, name, certifier, coveredDomains)`, nunca
via API de autoria. Guarda contra `CertificationCode` duplicado no mesmo `Monthly` (indice unico
`MonthlyId+CertificationCode`, mesmo espirito de `AddMonthly`/`AddWeeklyTemplate`).

**Curadoria/seed**: `secret/curadoria/web-security/certificacoes.json` - primeiro arquivo de
curadoria em nivel de *curso* nessa pasta (todo o resto e por dia/semana), schema documentado em
`secret/curadoria/CURADORIA.md` secao 6. Importado por `CertificationCoverageImporter`
(`Focadu.Application.Seed`, mesmo formato de `CuratedDayImporter`/`CuratedProjectImporter`),
chamado uma vez em `SeedWebSecurityCourseUseCase.BuildCourse()` (nao dentro do loop por semana).
`CuratedContentPath` ganhou suporte a `weekFolder` vazio/nulo pra resolver esse arquivo de nivel
de curso.

**Gotcha de idempotencia do seed, resolvido nesta fase**: o seed e idempotente por nome de
`Course` - reexecutar contra um banco que ja tem "Web Security" (todo ambiente hoje, local/
producao) nao inseria nada de novo, incluindo esta cobertura de certificacao
adicionada depois do curso original ja seedado. `SeedWebSecurityCourseUseCase.ExecuteAsync` agora,
mesmo quando o curso ja existe, carrega o grafo completo e roda o importer como *backfill* se
nenhum `Monthly` ainda tiver `CertificationCoverage` - idempotente (nao duplica numa segunda
execucao), verificado ao vivo contra o Postgres local.

**Aplicacao/Api - sem endpoint novo**: `MonthlyOverviewDto` (dentro de `CourseDetailDto`, `GET
/api/courses/{id}`) e `WeeklyDetailDto` (`GET /api/weeklies/{id}`) ganharam
`Certifications`/`ModuleCertifications` (`CertificationCoverageDto`, novo em
`Focadu.Application.Shared`) - os dois endpoints existentes ja carregavam o `Monthly` certo, so
precisavam devolver o campo.

**Frontend**, 4 pontos de contato, todos reaproveitando `CourseDetailDto` ja carregado (sem
fetch novo em 3 dos 4):
- 3a aba "Certificações" em `CourseDetailPage` (`CertificationsTab`, novo em
  `components/certifications/`).
- Card resumo novo em `StartDashboard` (`CertificationsSummaryCard`).
- Bloco sempre visivel em `WeeklyDetailPage` + reforco no `SuccessStep` do `PublicationModal`
  (momento da prova publica de fim de `Weekly`) - usando `weekly.moduleCertifications`.
- Tela dedicada com a matriz completa modulo x certificacao (`CertificationsPage`, novo em
  `routes/`), roteada via `/start?course=&certifications=1` (mesmo padrao de `?ranking=`).

"Ja estudado" (desbloqueio visual, so cosmetico) e derivado no frontend
(`lib/certifications.ts#isMonthlyComplete`) a partir de campos que `WeeklyOverviewDto` ja tinha
(`completedDailies`/`totalDailies`) - sem campo novo no backend so pra isso.

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
`https://api.groq.com/openai/v1/`. Timeout por tentativa diferenciado por adapter (ver "Retry
automatico" abaixo) - diferente dos outros 3 adapters Groq (rascunho de post, avaliacao de
projeto, analogia de leitura), que continuam com 60s de chamada unica, sem retry (prompts
maiores, sem o orcamento apertado do fluxo de resumo falado).

### Retry automatico

`TranscribeAsync` e `EvaluateAsync` (as duas chamadas do fluxo de resumo falado por voz,
`SubmitVoiceSummaryResponseUseCase`) fazem ate 2 retries (3 tentativas) via `HttpRetry`
(`Focadu.Infrastructure.Services.HttpRetry`) - helper generico e reutilizavel (sem interface/DI, e
detalhe de HTTP), tambem usado por `GitHubService` (ver secao GitHub abaixo).

- **Retryable:** `HttpRequestException` (falha de transporte), `TaskCanceledException` que nao
  veio de cancelamento do usuario (timeout do `HttpClient`), HTTP 429 e HTTP 5xx. Groq/GitHub 4xx
  fora 429 nunca e retryable (o pedido em si esta errado). Resposta 200 mas com conteudo
  inutilizavel (`transcricao_vazia`, `avaliacao_ia_formato_invalido`) tambem retry - a Groq roda
  com `temperature=0.2`, nao e deterministica - mas entra no mesmo orcamento de 2 retries, nao e
  retry indefinido. `groq_api_key_nao_configurada` nunca retry (falha antes de qualquer chamada
  HTTP).
- **Backoff:** exponencial + jitter (~500ms na 1a espera, ~1s na 2a), com teto de 2s de espera por
  tentativa - mesmo se a Groq mandar um `Retry-After` maior num 429.
- **Timeout por tentativa - corrigido em 2026-09-13 e 2026-09-17, verificacao ao vivo:**
  `EvaluateAsync` (avaliacao, texto puro) usa 6s (`GroqContentEvaluationAttemptTimeout`) - valor
  original era 2s (cobria folgado o tempo real de resposta da Groq em chat completion simples),
  mas se mostrou curto demais depois da Fase 39 ter acrescentado um passo de raciocinio/correcao
  ao prompt antes do score: confirmado ao vivo (logs de 2026-09-17) que as 3 tentativas bateram no
  timeout de 2s em sequencia sem nenhuma completar. Esse timeout de 6s se aplica a CADA UMA das 2
  chamadas Groq que `EvaluateAsync` faz desde a Fase 42 (correcao de transcricao numa chamada
  dedicada, depois a nota numa 2a - ver secao "Resumo falado por voz" acima). `TranscribeAsync`
  (transcricao) usa 15s (`GroqAudioTranscriptionAttemptTimeout`) - **valor original tambem era
  2s, mas se mostrou curto demais na pratica**: diferente de `EvaluateAsync`, essa chamada faz
  upload do audio gravado (multipart) antes da Groq comecar a processar, e o tempo de upload
  depende da conexao real do usuario, nao so da velocidade da LPU. Confirmado ao vivo com uma
  gravacao real: as 3 tentativas bateram no timeout de 2s sem nenhuma completar, gerando
  `groq_timeout` (`"A transcricao demorou demais para responder"`) num audio legitimo, nao numa
  falha de rede de verdade.
- **Orcamento do fluxo:** pior caso de transcricao+avaliacao juntas (transcricao ate 3 tentativas
  de 15s + avaliacao = 2 chamadas sequenciais, cada uma ate 3 tentativas de 6s, mais backoff) fica
  em ~85s, dentro dos 95s que o frontend usa como referencia pro timeout dessa chamada
  (`VOICE_SUMMARY_TIMEOUT_MS = 95_000`, `frontend/src/api/client.ts` - 70_000 ate a Fase 42, quando
  a avaliacao virou 2 chamadas em vez de 1).
- Falha definitiva (depois de esgotar as tentativas) cai no mesmo erro/`Code` de antes
  (`groq_transcricao_falhou`, `groq_avaliacao_falhou`, `groq_timeout`, `groq_indisponivel`,
  `transcricao_vazia`, `avaliacao_ia_formato_invalido`) - sem mudanca de contrato pro frontend,
  que ja trata esses erros no mesmo estado `submitting`/erro de sempre (nenhum estado novo).
- `# ponytail: loop manual, migrar pra Polly se aparecer necessidade de circuit breaker/policy
  composta` - decisao registrada no proprio `HttpRetry`.

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

### Status de IA (badge no GlobalNav, Fase 28)

`GET /api/system/ai-status` devolve o status de cada `IAiProviderHealthCheck` registrado (hoje so
`GroqHealthCheckService`) - pensado pra ajudar o Falves a perceber de relance, direto na tela, quando
precisa trocar a chave da Groq ou desativar uma atividade que depende de IA (VoiceSummary, avaliacao
de projeto, rascunho de LinkedIn, analogia de leitura - todas usam a mesma `Groq:ApiKey`).

- **Ping de verdade, nao so "a chave existe":** `GroqHealthCheckService` faz `GET models` (lista o
  catalogo de modelos da Groq) - leve, nao consome cota de geracao, mas confirma que a chave e
  valida e a Groq esta respondendo, nao so que uma env var esta preenchida.
- **`Configured=false` nunca tenta a chamada** - mesma distincao de "nao configurado" vs "configurado
  mas fora do ar" que os outros adapters Groq ja fazem.
- **Cache de 45s em memoria** (dentro do proprio `GroqHealthCheckService`, `Singleton` - unico
  adapter Groq que nao e `Transient` via `AddHttpClient<TService>`, ver `DependencyInjection.cs`):
  varios usuarios com o GlobalNav aberto ao mesmo tempo geram no maximo 1 chamada de teste a cada
  45s, nao 1 por requisicao de badge. `SemaphoreSlim` evita 2 chamadas simultaneas quando o cache
  expira com requisicoes concorrentes.
- **Nunca lanca `ExternalServiceException`** - ao contrario dos outros adapters Groq, uma falha de
  rede/timeout aqui vira `Available=false` + `ErrorMessage` no DTO, nao um erro HTTP - o endpoint
  sempre devolve 200, o proprio "esta fora do ar" e um resultado valido, nao uma excecao.
- Endpoint atras de `.RequireAuthorization()` (mesmo criterio "app so mostra GlobalNav pra usuario
  logado"), mas sem filtro por usuario - o status do provedor e global, nao por conta.
- **Frontend:** `lib/useAiStatus.ts` faz polling a cada 45s (mesma janela do cache do backend);
  desde a Fase 62 o detalhe por provedor (`AiStatusDetails`, em `AiStatusBadge.tsx`) fica dentro do
  menu do usuario (`UserMenu`, no `GlobalNav`) - nao ha mais selo fixo na barra. Com a IA parcial/
  fora/sem resposta, um ponto colorido aparece no avatar.

### Suporte Rapido de IA (botao flutuante durante a sessao, Fase 32)

Implementa a ideia ja registrada em `secret/rascunhos/visual-ui-ux.md` ("Suporte Rápido de IA: Um
botão flutuante acessível para dúvidas pontuais... interações curtas e diretas, impedindo que o
usuário se perca em diálogos longos") - `QuickQuestionOrb` (`SessionShell.tsx`) existia desde a
Fase 19 como stub desativado (`return null`, os 2 call sites - `SessionLayout`/`WeeklyProjectPage`
- ja existiam) e volta a renderizar de verdade nesta fase.

- **`IStudyAssistantService`/`GroqStudyAssistantService`**: adapter Groq a mais (mesmo
  `HttpClient`/`GroqOptions`, `GroqDefaultTimeout` = 60s, sem retry - mesma categoria de
  Draft/ProjectEvaluation/Analogy, ver "Retry automatico" acima), texto livre (sem JSON mode,
  mesmo estilo de `GroqDraftGenerationService` - a resposta E o texto mostrado ao aluno).
  `GroqStudyAssistantService.BuildMessages` monta `system` (persona) + `system` (contexto da
  sessao + personalizacao, quando houver - valem a conversa inteira, por isso ficam fora do turno
  atual) + 1 mensagem `user`/`assistant` por item de `History` (ordem cronologica) + a pergunta
  atual como ultimo turno `user`.
- **`AskStudyAssistantUseCase`** (`Focadu.Application.Assistant`) **sem buscar Daily/Weekly/
  CuratedContent por Id**: recebe `Context` (string livre, opcional) ja pronto do frontend - o que
  ja esta na tela (titulo+trecho da leitura em andamento, especificacao do projeto semanal, ou so
  "tema da semana + etapa atual" como fallback generico) - evita duplicar toda a logica de posse/
  autorizacao que ja rodou quando o frontend buscou esses dados nos proprios endpoints
  (`GetDailyStateUseCase`, `GetCuratedContentUseCase`, `GetWeeklyDetailUseCase`). `Question`
  limitada a 500 chars (`pergunta_muito_longa`), `Context` truncado em 6000 chars (nunca erro, so
  corta) - constantes `internal` na propria classe, testadas puras (`Focadu.Tests.Assistant`).
  Personalizacao por interesses/notas (Fase 21/22/27) reaproveitada via
  `PersonalizationPromptBuilder`, mesmo padrao dos outros prompts de IA - bonus, nunca obrigatorio.
  **`History` (Fase 33, reversao parcial de uma decisao da Fase 32):** a Fase 32 tinha decidido de
  proposito NAO enviar nenhum historico ao backend, pra bater literalmente com "interacoes curtas
  e diretas" do rascunho - revertido apos o Falves testar ao vivo e ver o custo real: uma pergunta
  de seguimento natural ("como o cache e organizado?", sem repetir "do SO") perdeu o fio, porque o
  backend nao tinha como saber a qual dos 2 caches discutidos antes (navegador/DNS) a pergunta se
  referia, e respondeu com a leitura mais ampla do conteudo da tela. `ClampHistory` (`internal
  static`, testado puro) mantem so as ultimas `MaxHistoryMessages` = 8 mensagens (~4 trocas
  pergunta+resposta) - historico **curto** de proposito, nao memoria de conversa ilimitada: o
  espirito original da Fase 32 continua valendo, so a decisao de "zero historico" que virou "pouco
  historico". Cada item de `History` tambem trunca em `MaxHistoryMessageLength` = 800 chars.
- **Frontend**: `StudyAssistantWidget.tsx` (botao flutuante `fixed bottom-6 right-6` + painel de
  chat `fixed bottom-24 right-6` quando aberto) - `QuickQuestionOrb` (`SessionShell.tsx`) so
  renderiza isso. `context` vem de `useStudyAssistantContext()` (`lib/studyAssistantContext.ts`) -
  store externo modulo-level (mesmo padrao de `sessionExpiredHandler` em `api/client.ts`), nao
  React Context: `SessionLayout` seta isso sozinho via `useEffect` (prop nova opcional
  `assistantContext`, cai no fallback `eyebrow + stepLabel` quando omitida) e `WeeklyProjectPage`
  seta direto (nao usa `SessionLayout`) - nenhum dos ~9 pontos que ja renderizavam
  `<SessionLayout>`/`<QuickQuestionOrb/>` precisou de prop nova pra ganhar o botao em si, so
  `ReadingActivity`/`VideoActivity` passam `assistantContext` mais rico (titulo + corpo/descricao
  do conteudo) por serem o cenario mais provavel de duvida sobre o material.
  - `messages` (transcript local) e enviado como `History` (`StudyAssistantHistoryItem[]`, Fase
    33) a cada pergunta nova - o array de ANTES da pergunta atual, capado em
    `STUDY_ASSISTANT_MAX_HISTORY` = 8 no proprio cliente (mesmo numero do backend, so evita
    payload crescendo sem necessidade numa conversa longa - quem realmente garante o limite e o
    `ClampHistory` do backend).
  - **Fechar (✕ ou clique fora) so oculta o painel, nunca apaga `messages`** - so "Limpar" (botao
    no cabecalho, aparece so quando ha mensagens) ou digitar `/clear` (reconhecido localmente
    antes de virar pergunta - Fase 33: no teste real, "/clear" foi mandado como texto literal e a
    IA "respondeu" sem limpar nada de verdade) apagam o transcript de fato. `messages` some por
    completo so quando o componente desmonta (troca de atividade/pagina).
  - Clique fora fecha via `mousedown` em `document` checando `containerRef.current.contains(e.
    target)` (nao um backdrop `fixed inset-0` como `SettingsMenu` - o assistente nao e modal, o
    resto da tela continua interativo com o painel aberto).
  - **Fase 37 (pedido explicito: "ao inves do botao, algo mais parecido com um chat"):** nas telas
    com "material de hoje" (`SessionLayout`/`useMaterialSidebar`), o botao flutuante deu lugar ao
    card fixo `StudyAssistantPanel` (`components/assistant/`) no sidebar direito, ao lado do
    `QuickNotePanel`. Estado/logica (enviar pergunta, historico, `/clear`, erro) extraida pro hook
    `useStudyAssistantChat` (`lib/`) - compartilhado pelos 2 componentes, so a apresentacao muda
    (card sempre visivel vs. painel que abre por cima de tudo). `StudyAssistantWidget`/
    `QuickQuestionOrb` continuam existindo (WeeklyProjectPage nao tem esse sidebar).

## GitHub (commit de resumo do modulo, Fase 11)

`IGitHubService` (`Focadu.Infrastructure.Services.GitHubService`) e um adapter via `HttpClient`
tipado cru pra `https://api.github.com/` - **sem pacote Octokit.NET**, mesmo padrao ja usado pro
Groq (`services.AddHttpClient<IGitHubService, GitHubService>(...)`), apesar do prompt da Fase 11
ter dito duas vezes que "Octokit ja estava configurado desde a Fase 1" (afirmacao falsa,
verificada por `grep` antes de implementar - ver `docs/fase-11/resumo-implementacao-fase-11.md`).
Headers fixos: `Authorization: Bearer {token}` (so quando configurado), `User-Agent: Focadu/1.0`
(exigido pela API do GitHub), `Accept: application/vnd.github+json`. Timeout de 20s por chamada,
com o mesmo retry automatico (`HttpRetry`) documentado na secao Groq acima - 404 (usado como
"nao existe" em `GetOptionalAsync`) nunca entra no retry, e resposta valida, nao falha.

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
  dedicado - `HttpRetry.EnsureSuccessAsync` ja bota qualquer status de erro (nao só 404, que vira `null` via
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
  5. ~~`POST /project/evaluate` (`EvaluateWeeklyProjectUseCase`) contra um repo com codigo de
     verdade~~ - **desde a Fase 46, esse fluxo nao usa mais `IGitHubService`** (migrou pro
     Forgejo interno, ver secao propria abaixo). O checklist original desta fase (Fase 11) ficou
     obsoleto nesse item especifico - os outros 5 continuam valendo pro fluxo de prova publica de
     modulo, que segue no GitHub de verdade.
  6. Token **sem** escopo `repo` (ou vazio) - confirma `github_token_nao_configurado`/
     `github_falhou` em vez de um erro sem contexto.

| Code | Status | Quando |
|---|---|---|
| `github_token_nao_configurado` | 502 | `GitHub:Token` vazio - qualquer chamada que precise dele |
| `github_timeout` | 503 | GitHub nao respondeu a tempo (timeout de 20s) |
| `github_indisponivel` / `github_falhou` | 502 | Erro de rede ou status HTTP de erro vindo do GitHub - inclui rate limit e token sem escopo, ver acima |

## Forgejo interno - repositorios de Projeto Semanal (Fase 46)

Antes desta fase, o repositorio do Projeto Semanal era criado pelo proprio aluno no GitHub
pessoal dele e a URL era colada manualmente (`WeeklyProjectPage`). Desde a Fase 46, a Focadu
hospeda e provisiona esses repositorios sozinha, num **Forgejo self-hosted** (container `forgejo`
novo, `codeberg.org/forgejo/forgejo:9`, SQLite - sem Postgres proprio, app isolada sem join com o
dominio C#) - ver `secret/rascunhos/repositorios-gerenciados-projeto-semanal.md` pro raciocinio
completo por tras da decisao.

**`IForgejoService`** (`Focadu.Application.Ports`) + **`ForgejoService`** (adapter concreto,
`Focadu.Infrastructure.Services`) - mesmo padrao sem SDK do `IGitHubService`/`GitHubService`
(HttpClient cru + `HttpRetry`), 3 operacoes:

- `CreateUserAccountAsync` - cria a conta do aluno via API administrativa (`POST /admin/users`),
  desabilita criacao de repositorio pra ela (`PATCH .../max_repo_creation=0` - "so a Focadu cria
  repositorio", nunca vira um GitHub generico dentro da Focadu). Desde a Fase 60 nao gera token.
- `RegenerateAccessTokenAsync` (Fase 60) - gera o token do aluno sob demanda e revoga o anterior.
  **Ponytail confirmado ao vivo**: `/users/{username}/tokens` recusa autenticacao via API token
  (mesmo com header `Sudo`) - so aceita Basic Auth de verdade (Gitea/Forgejo bloqueiam de
  proposito "um token gerar outro token"). Como a Focadu descarta a senha aleatoria do aluno,
  redefine outra via admin (`PATCH /admin/users/{u}` so com `password`), apaga o token anterior
  pelo nome fixo `focadu-projeto-semanal` (404 = nao havia; nome repetido daria 400) e cria outro,
  as 2 ultimas chamadas com Basic Auth como o aluno - unico caminho deste service que nao usa o
  token administrativo padrao.
- `ForkTemplateAsync` - fork de um repositorio-template (dono: conta administrativa
  `focadu-admin`) pra dentro da conta do aluno, via impersonacao administrativa (header `Sudo`) -
  o template nunca e alterado. **Confirmado ao vivo**: `max_repo_creation: 0` bloqueia o aluno de
  criar repositorio pela propria conta, mas nao impede o fork feito via `Sudo` - o mecanismo de
  restricao funciona exatamente como desenhado. Corpo da requisicao precisa ser `{}` explicito
  (nao `null`/sem `Content-Type`) - confirmado ao vivo, o Forgejo responde `422 "Empty
  Content-Type"` sem isso, mesmo o corpo sendo semanticamente opcional.
- `GetContentSnapshotAsync` - mesma forma que o equivalente do GitHub (arvore recursiva + blobs,
  filtro por extensao/limite de tamanho), reaproveitado por `EvaluateWeeklyProjectUseCase`.

**`UserForgejoAccount`** (`Focadu.Domain.GitHosting`, novo namespace) - 1:1 com `User`, lazy
(mesmo principio de `UserGemBalance`/`UserStreak`, Fase 14): `ForgejoUsername` + `TokenLastEight`/
`TokenGeneratedAt`. Um so token por aluno, reusado por todos os repositorios que sao dele no
Forgejo - nao 1 token por `WeeklyProject`. Username/email derivados deterministicamente do
`User.Id` (nunca do email real do aluno - login no Forgejo em si nao e usado, so o access token).

**Token nunca persistido (Fase 60).** Ate a Fase 59 a coluna `AccessToken` guardava o token em
texto puro e a tela o mostrava sempre. Agora o aluno gera sob demanda (`POST /api/users/me/forgejo-
token`, `GenerateForgejoTokenUseCase` -> `ForgejoTokenDto {forgejoUsername, accessToken,
generatedAt}`, 404 `conta_git_inexistente` sem conta no Forgejo), ve o valor uma unica vez e a
Focadu guarda so os 8 ultimos caracteres (`RegisterGeneratedToken`), que `WeeklyProjectDto.
ForgejoTokenLastEight` expoe pra tela dizer qual token esta valendo. Gerar outro revoga o anterior.
A migration `RemoveStoredForgejoToken` copiou o final dos tokens existentes antes de apagar a
coluna - eles continuam valendo no Forgejo.

**Forks publicos (ponto aberto, Fase 60).** O fork herda a visibilidade do template (publico) e o
codigo nunca define `private`: clone anonimo funciona, push exige o token. Decidir antes de abrir o
Forgejo pra outros alunos.

**`WeeklyTemplate.ForgejoTemplateSlug`** (campo legado, nullable) - nome do repositorio-template no
Forgejo (dono: `focadu-admin`), mantido pela curadoria (mesmo espirito de `secret/curadoria/`) -
sem isso preenchido, aquela semana simplesmente nao recebe repositorio (nao bloqueia a matricula).
Semana sem variante de linguagem (ver abaixo) continua usando esse campo direto, exatamente como
antes da Fase 59.

**`EnrollUserInCourseUseCase`** - dentro do mesmo loop que ja cria `Weekly`/`WeeklyProject` pra
cada `WeeklyTemplate` (eager, na matricula - decisao confirmada com o Falves, nao lazy no primeiro
acesso a tela): semana **sem** variante de linguagem (`!HasLanguageVariants`) da fork na hora,
como sempre foi - garante a `UserForgejoAccount` (lazy, uma vez so por matricula) e anexa a URL via
`WeeklyProject.AttachRepository` (so seta `SubmissionUrl`, mantem `Status = Pending`, diferente de
`Submit`). Semana **com** variante nao da fork nenhum aqui desde a Fase 59 - o fork passou pra
escolha da linguagem (`ChooseWeeklyProjectLanguageUseCase`, abaixo). Falha do Forgejo (fora do ar,
etc) **nunca derruba a matricula** - mesmo espirito "bonus, nunca core" ja usado em
`SubmitWeeklyProjectUseCase` pra falha de avaliacao automatica; o projeto so fica sem
`SubmissionUrl`.

### Linguagem do Projeto Semanal (Fase 59, piloto Semana 1: Python/JavaScript)

Pedido do Falves, logo apos a Fase 58 - ver `secret/rascunhos/linguagem-preferida-e-referencias-do-
projeto.md` pro raciocinio completo. O aluno marca no perfil quais linguagens topa usar nos
Projetos Semanais e, quando o projeto de uma semana ja curada por linguagem e desbloqueado, escolhe
(de forma **definitiva**, sem troca depois) em qual delas vai realiza-lo - so entao ganha o
repositorio-modelo (fork daquela linguagem, so o esqueleto - a implementacao e do aluno) e as
referencias (bibliotecas/documentacao) curadas pra ela. Piloto so na Semana 1; as outras 11 seguem
com o comportamento de sempre ate serem curadas.

**`ProjectLanguage`** (`Focadu.Domain.Enums`) - lista fechada, `Python`/`JavaScript`. Nomes que a
Api e o `projeto.json` esperam sao os proprios nomes do enum (case-insensitive), resolvidos por
`ProjectLanguages.TryParse` (`Focadu.Application.Weeklies`, compartilhado entre a Api e o
`CuratedProjectImporter`).

**`WeeklyTemplate.LanguageVariants`** (`WeeklyTemplateLanguage`, novo) - 1 repositorio-modelo
(`ForgejoTemplateSlug`) por linguagem daquela semana. `HasLanguageVariants` decide se a semana
entrou no piloto; `ResolveForgejoTemplateSlug(language)` devolve o slug certo (o da variante
quando ha linguagem escolhida, senao o `ForgejoTemplateSlug` legado).

**`EvaluateWeeklyProjectUseCase`** parou de depender de `IGitHubService`/`GitHubUrlParser` desde a
Fase 46 (que continuam existindo, intocados, so pro fluxo de prova publica de modulo abaixo) -
resolve owner/repo direto (`ForgejoUsername` do aluno + o slug de `ResolveForgejoTemplateSlug`,
desde a Fase 59 - antes era `ForgejoTemplateSlug` direto), sem parsear a `SubmissionUrl`.

**`WeeklyTemplate.References`** (`WeeklyTemplateReference`, novo) - links de referencia (biblioteca/
documentacao), curadoria manual e estatica (cada link conferido contra a documentacao oficial antes
de entrar - nunca gerado por IA, decisao do dono). `Language` nulo = comum a todas as linguagens da
semana (ex: uma RFC); `ReferencesFor(language)` devolve as da linguagem + as comuns, na ordem da
curadoria (`Position`). Registro estruturado (com `Id` e `LastVerifiedAt`) de proposito, nao texto
dentro do `SpecText` - e o que um futuro aviso de "link fora do ar" (painel de gestao, ainda nao
implementado) vai precisar pra apontar pra um link especifico.

**`WeeklyProject.Language`** - nulo ate a escolha, gravada uma unica vez (`ChooseLanguage`, so com
`Status = Pending`) junto da URL do fork daquela linguagem (substitui um eventual `SubmissionUrl`
de fork legado). `Weekly.EnsureProjectLanguageCanBeChosen`/`ChooseProjectLanguage` repetem a mesma
trava de `SubmitProject` - so depois que `AreDailiesComplete()` (decisao do dono: a escolha so
acontece com o projeto ja desbloqueado, igual ao envio).

**`ChooseWeeklyProjectLanguageUseCase`** (`POST /weeklies/{id}/project/language`) - valida tudo
(semana com a variante, linguagem marcada no `User.PreferredLanguages`, projeto desbloqueado e
ainda sem linguagem) ANTES de chamar o Forgejo; so grava a escolha depois do fork dar certo, pra
uma falha no meio poder ser tentada de novo sem ficar "meio escolhida". `ForgejoService.
ForkTemplateAsync` ganhou tratamento de 409 (fork ja existe) reaproveitando o repositorio existente
em vez de falhar - cobre exatamente esse caso de retry. 2ª tentativa depois da escolha (mesma
linguagem ou outra) sempre 409 `linguagem_ja_escolhida`.

**`WeeklyProjectDtoMapper`** (`Focadu.Application.Weeklies`, novo - substitui a montagem manual do
DTO que existia em 3 casos de uso) - calcula `ProjectLanguageStep` (`None` = semana sem variante,
comportamento de sempre; `NeedsPreference` = tem variante mas o aluno nao marcou nenhuma linguagem
compativel no perfil; `NeedsChoice` = marcou, falta escolher; `Chosen` = escolhida) e so libera
`SpecText`/`SubmissionUrl`/credenciais/`References` depois de `Chosen` (ou em `None`, que nunca foi
gated) - "o projeto so e disponibilizado depois da escolha da linguagem" (decisao do dono).

**`User.PreferredLanguages`** - marcado na Entrevista de Perfil (`ProfileInterviewPage`, chip igual
ao de interesses), opcional (como os interesses - quem nao marca so ve o aviso na hora de abrir o
projeto de uma semana com variante). `CompleteProfileUseCase` trata a lista nula como "nao mexe"
(edicao de interesses continua funcionando sem reenviar linguagem) e vazia como "limpa".

**Frontend (`WeeklyProjectPage.tsx`)** - os 3 estados novos aparecem no lugar da especificacao,
antes dela ser liberada: aviso pra marcar linguagem no perfil, seletor com **confirmacao em 2
passos** (decisao do dono - a escolha e irreversivel, sem desfazer pelo aluno), e o card de
referencias (so quando ja escolhida). O bloqueio de Dailies (`isLocked`) esconde esses 3 estados
inteiros, nao so o botao de envio - semana com variante ainda bloqueada mostra so o cadeado, igual
a antes desta fase.

**Publicacao no GitHub pessoal do aluno (portfolio) e manual, fora do produto** - decisao
confirmada com o Falves: o aluno adiciona um segundo `git remote` local e da `git push` com as
proprias credenciais (SSH key/`gh auth login` ja configuradas na maquina dele), sem nenhuma
orquestracao da Focadu (nada de push-mirror, nada de token de GitHub pessoal guardado no banco).
Ver "Publicacao publica e bloqueio de modulo" abaixo - esse fluxo (GitHub+LinkedIn, prova publica
de MODULO) e **completamente separado e continua intocado**: o Forgejo e o ambiente de trabalho/
avaliacao do Projeto Semanal, nao substitui a prova publica.

**Bootstrap administrativo (fora de codigo, feito manualmente por enquanto)**: conta
`focadu-admin` + token administrativo criados via CLI (`docker exec ... forgejo admin user
create`/`generate-access-token`), nao pela web -
`FORGEJO__security__INSTALL_LOCK: "true"` pula o wizard de instalacao interativo. Configuracao via
`Forgejo:BaseUrl`/`Forgejo:AdminToken` (mesmo padrao de 3 formas de `GitHub:Token`, nunca bloqueia
o boot se ausente - so as chamadas que precisam falham com erro claro).

**`FORGEJO__server__ROOT_URL` precisa ser setado explicitamente** - sem isso, o Forgejo deriva a
URL de clone da porta *interna* do container (3000), nao da porta que o host expoe, gerando
`clone_url` inacessivel de fora do container (confirmado ao vivo). Porta padrao do Forgejo (3000)
evitada de proposito neste host - ja em uso por outro projeto (`homepage-homepage-1`) - produção
usa 3020 (ver tabela de portas em `docs/DOCKER.md`). **`ROOT_URL` aponta pra
`localhost` por enquanto** (teste rodando no mesmo host) - precisa virar o endereco real
alcancavel pelos alunos antes de qualquer acesso de fora desta maquina.

**`START_SSH_SERVER` precisa ser `"false"` explicito** - `"true"` entra em conflito com o sshd
externo que a propria imagem do Forgejo ja sobe por padrao (`listen tcp :22: bind: address
already in use`, confirmado ao vivo) - o sshd externo ja serve git+ssh sozinho, o servidor Go
interno do Forgejo e redundante e nunca deveria ser ligado nesta imagem.

**Testado ao vivo, ponta a ponta** (nao so leitura de codigo): matricula real via API criou a
conta Forgejo + fork automaticamente, `git clone`/`git commit`/`git push` funcionaram de verdade
com as credenciais devolvidas pela Api, e o snapshot de arvore/blob leu o conteudo pusheado
corretamente - ver `docs/fase-46/resumo-implementacao-fase-46.md` pros 3 bugs reais encontrados
nesse processo (nenhum visivel so por leitura de codigo).

**Pendente pra fases futuras**: SAST em si (Fase 24c, os 8 checks ja escopados, webhook receiver
ainda nao construido - o gancho natural seria o webhook de push do Forgejo disparando o mesmo
pipeline de `GetContentSnapshotAsync` + avaliacao por IA), repositorio-template pras outras 11
semanas do curso piloto, wiring da curadoria pra gerar isso automaticamente.

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

### Redefinicao de senha (Fase 41)

`User` nao tinha nenhum jeito de recuperar acesso perdido - `LoginPage.tsx` chegou a documentar
isso como decisao deliberada ("Esqueci minha senha - sem fluxo de recuperacao de senha construido,
nao deixado como link morto"), porque nao havia infraestrutura de email nenhuma no projeto. Esta
fase implementa o fluxo completo:

- **`PasswordResetToken`** (`Focadu.Domain.Users`) - aggregate root proprio (nao filho de `User`),
  guarda so `UserId` + `TokenHash` (SHA-256, nunca o token em texto puro - mesmo raciocinio de
  `User.PasswordHash`) + `ExpiresAt`/`UsedAt`. `Consume(now)` valida (nao usado, nao expirado - 1h
  de validade, definida em `RequestPasswordResetUseCase`) e marca `UsedAt` na mesma chamada -
  nunca reaproveitavel, mesmo se a troca de senha em si falhar depois.
- **`PasswordResetTokenGenerator`** (`Focadu.Application.Shared`, internal static, testado direto)
  - `RandomNumberGenerator` (nao `Random.Shared` como `UniqueCodeGenerator`): este token protege
  troca de senha/acesso a conta, precisa ser imprevisivel, nao so "nao repetido" como um codigo de
  indicacao. 32 bytes aleatorios, base64url; `Hash()` e SHA-256 simples (nao BCrypt) - a entropia
  do token sozinha ja torna brute-force inviavel, sem precisar do hashing lento de senha.
- **`RequestPasswordResetUseCase`** (`POST /auth/forgot-password`) - nunca revela se o email existe
  (mesmo raciocinio de `credenciais_invalidas`): sempre 200, so gera token + manda email quando o
  usuario existe de verdade.
- **`ResetPasswordUseCase`** (`POST /auth/reset-password`) - valida o token (`token_invalido`/
  `token_expirado`) e a forca da nova senha (reaproveita `RegisterUserUseCase.ValidatePassword`,
  nunca duplicada), troca o hash (`User.SetPasswordHash`, mutator novo) e marca o token usado, tudo
  antes de 1 `SaveChangesAsync`.
- **`IPasswordResetEmailSender`** (port, `Focadu.Application.Ports`) - recebe o token em TEXTO PURO
  (unico lugar que ve essa versao) e quem monta o link final (dominio do frontend + rota
  `/redefinir-senha?token=`) e o adapter concreto, nao a Application - mesma decisao de
  `GitHubService` conhecer sua propria `BaseAddress`. Adapter: `SmtpPasswordResetEmailSender`
  (`Focadu.Infrastructure.Services`) via `System.Net.Mail.SmtpClient` puro (sem lib de terceiro) -
  generico, funciona com qualquer provedor SMTP (Gmail com senha de app, Outlook, etc), decisao
  tomada em vez de uma API transacional (Resend/SendGrid) pra nao amarrar a um servico novo nem
  exigir criar conta antes de funcionar.
- **`Smtp:*`/`Frontend:BaseUrl`** (config) - mesma decisao do Groq/GitHub: `Smtp:Host` ausente nao
  impede o app de subir, so o envio falha (com erro claro, `smtp_nao_configurado`) quando de fato
  chamado. `Frontend:BaseUrl` default `http://localhost:5173` (dev) - **producao
  precisa configurar de verdade** (env var `FRONTEND_BASE_URL`, ver `docs/DOCKER.md`), senao o
  link do email aponta pro localhost de quem hospeda o backend, inutil pra quem recebe o email.

```bash
cd backend/src/Focadu.Api
dotnet user-secrets set "Smtp:Host" "smtp.gmail.com"
dotnet user-secrets set "Smtp:Port" "587"
dotnet user-secrets set "Smtp:User" "seu-email@gmail.com"
dotnet user-secrets set "Smtp:Password" "sua-senha-de-app"  # nao a senha normal da conta, ver https://myaccount.google.com/apppasswords
dotnet user-secrets set "Frontend:BaseUrl" "http://localhost:5173"
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

## Docker e Deploy (Fase 40)

Guia pratico completo (comandos, variaveis, runbook de deploy) em `docs/DOCKER.md` - esta secao
so resume as decisoes de arquitetura.

**Dois Dockerfiles, multi-stage:**
- `backend/Dockerfile`: SDK 10.0 restaura/publica so `Focadu.Api.csproj` -> runtime `aspnet:10.0`
  (porta interna 8080, `HEALTHCHECK` em `/health`, `curl` instalado so pra isso).
- `frontend/Dockerfile`: `node:22-alpine` builda (`npm ci && npm run build`) -> `nginx:alpine`
  serve `dist/` (porta interna 80). `VITE_API_BASE_URL` e build ARG (Vite embute em build-time,
  nao da pra trocar depois em runtime) - default vazio, ver proxy abaixo.

**Frontend e backend nunca ficam em dominios separados** - `frontend/nginx.conf` faz proxy
same-origin de `/api/` pro container do backend (mesmo truque do projeto "financas"). Como
`frontend/src/api/client.ts` ja monta URLs como `${BASE_URL}${path}` com `path` incluindo `/api/...`
e `BASE_URL` cai pra string vazia quando `VITE_API_BASE_URL` nao e definida, o SPA em producao
chama caminhos relativos e o navegador nunca faz uma requisicao cross-origin de verdade. Isso
evita precisar de subdominio de API dedicado no Cloudflare Tunnel e evita mexer na allowlist de
CORS (`Program.cs`, ainda fixa em `localhost:5173`/`127.0.0.1:5173` - so precisaria mudar se um dia
o backend for exposto num dominio proprio).

**`docker-compose.yml`** (producao) vive na raiz do repo, ao lado de `.env.example`. Servicos:
`postgres`/`backend`/`frontend`/**`forgejo`** (Fase 46, ver secao propria "Forgejo interno"
acima). Portas de host (via `.env`, nao versionado): frontend `5280`/backend `5282`/postgres
`5432`/forgejo `3020`.

**Sincronizacao com `secret/` (Fase 40, achado importante):** o conteudo curado
(`secret/curadoria/*.json`) so e lido pelo comando `dotnet run -- seed`
(`SeedWebSecurityCourseUseCase`), nunca por nenhum endpoint HTTP em runtime normal (ver "Seed de
conteudo" acima). `CuratedContentPath` originalmente resolvia o caminho subindo diretorios ate
achar `.git` - isso nao existe dentro de um container (a imagem so tem o publish output). Fase 40
adicionou um atalho: se a env var `CURATED_CONTENT_ROOT` estiver definida, o metodo usa ela
diretamente (`Path.Combine(root, "curadoria", CourseSlug, ...)`), sem subir diretorio nenhum. O
compose monta `secret/` do host como bind mount **read-only** no container do backend (path fixo
`/secret`) e seta `CURATED_CONTENT_ROOT=/secret` - assim uma atualizacao do clone de
`focadu-secret` no host fica visivel pro container sem rebuild de imagem, so precisa reiniciar (ou
re-executar o seed).

**Ressalva que fica pro futuro, nao resolvida nesta fase:** `SeedWebSecurityCourseUseCase` e
idempotente **por Curso** - depois que "Web Security" ja existe no banco, `ExecuteAsync` retorna
sem ler nenhum arquivo de novo. Ou seja: editar um `dia-N.json` ja seedado e reiniciar/re-rodar o
seed **nao** atualiza o conteudo ja carregado no Postgres; isso so reflete de verdade num banco
ainda vazio (primeiro deploy de um ambiente, ou logo apos um reset de banco). Reseed
incremental (por semana/dia, nao so por curso inteiro) ainda nao existe - ver `docs/fase-40/
resumo-implementacao-fase-40.md` pra mais detalhe.

**CI/CD (dois repositorios, dois gatilhos):**
- `focadu/.github/workflows/ci.yml`: build+test do backend (.NET) e lint+build do frontend
  (Node), em push/PR pra `main`.
- `focadu/.github/workflows/deploy.yml`: dispara via `workflow_run` apos o CI passar (so em push,
  nunca em PR) **so na branch `main`** (producao e o unico ambiente de deploy), `git reset --hard` no path do
  codigo E no `secret/` (o mesmo diretorio onde se desenvolve: edicao nao commitada e perdida),
  `docker compose up -d --build`, roda o seed (idempotente, seguro toda vez), healthcheck HTTP no
  frontend.
- `focadu-secret/.github/workflows/deploy.yml` (repo separado, so branch `main`): `git reset
  --hard` no `secret/` do checkout de producao, restart + seed do backend (sem rebuild de imagem,
  ja que `secret/` e bind mount).
- Runner: `[self-hosted, macOS, falveshub-server]` (ARM64), um por repositorio, todos neste Mac em
  `/Users/falves/actions-runners/<repo>/` como servico launchd - ver `docs/DOCKER.md`.
- Convencao de pasta no host: `/Users/falves/Dev/Servidor/focadu` (producao, branch `main`), com
  `secret/` dentro como clone de `focadu-secret`.

**Fuso horario do container (Fase 43, bug real relatado ao vivo):** o container do backend roda
o relogio do SO em UTC por padrao - sem nenhuma variavel `TZ` setada, `DateTime.Now` (usado por
`SystemClock.Today()`, a "hora local" de que as regras de acesso a Daily dependem) na verdade
retornava hora UTC, nao hora de Brasilia. Concluir uma Daily entre ~21h e 23h59 no horario local
gravava `CompletedAt` (UTC) ja no dia seguinte em UTC; a comparacao de "1 Daily por dia corrido"
(`Weekly.EvaluateDailyAccess`, correcao da Fase 38b) fazia `ToLocalTime()` sobre esse timestamp
mas o "local" do container era o proprio UTC - entao ela achava que a conclusao ja tinha
acontecido "hoje" e bloqueava o usuario o dia inteiro seguinte, so liberando de novo na virada do
dia em UTC (21h de Brasilia, nao meia-noite local). Correcao: `TZ: America/Sao_Paulo` fixo (nao
via `.env`) no `environment` do servico `backend` do `docker-compose.yml` - imagem runtime
(`aspnet:10.0`, Debian) ja tem `tzdata`, `TimeZoneInfo.FindSystemTimeZoneById` funciona sem
mudanca de codigo. Não precisa de rebuild de imagem, so recreate do container (`docker compose up
-d backend`) pra pegar a env var nova.

## Frontend (Fase 3, telas de atividade completadas nas Fases 4 e 5, autoria na Fase 6)

**Layout sem rolagem externa (Fase 61, por enquanto so no Projeto Semanal):** a pagina ocupa a altura
que sobra abaixo do `GlobalNav` (`lg:h-[calc(100dvh-57px)] lg:overflow-hidden`) e so os cartoes rolam,
via `ScrollArea` (`components/ScrollArea.tsx`): barra nativa escondida (`scrollbar-none`, `index.css`)
+ barra propria de 4px que aparece so enquanto rola e some com desfoque. Todo contêiner flex no
caminho ate a area que rola precisa de `min-h-0`. Abaixo de `lg`, fluxo empilhado com rolagem normal.
Plano do dono: levar pro sistema inteiro - abordagem e armadilhas em `docs/fase-61/`.
`WeeklyProjectPage` segue o Figma node `178:132`: repositorio (esquerda), especificacao com entrega
fixa no rodape (centro), referencias + chat alto `StudyAssistantPanel tall` (direita) - o botao
flutuante `QuickQuestionOrb` nao e mais usado em nenhuma tela.

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

**Etapa Anterior + Contador de Erros no Header + Timer Pomodoro (Fase 36):** 3 mudancas
independentes na tela de sessao, todas a partir de verificacao ao vivo/pedido direto do Falves.
(1) `SessionTopBar`/`IntroCard` ganharam `onBack` opcional ("← Etapa anterior") - revisita a
atividade anterior da MESMA Daily sem refazer nada (cada atividade decide seu proprio "ja
respondida" via `activity.responses`); `TodayPage.handleContinue` parou de recalcular "1a atividade
pendente" (`resolveStep`) a cada Continuar (so no carregamento inicial agora) e passou a avancar 1
posicao a partir do `step` atual, senao voltar e seguir em frente pulava direto pro fim da revisao.
Reading/Video (unicos sem nenhum indicador de "ja respondida") ganharam "✓ Já concluída" +
"PRÓXIMA ETAPA" pra nao parecer etapa nova ao revisitar. (2) O contador de erros (`PenaltyGauge`,
`fixed left-6 top-[72px]` desde a Fase 15) saiu do HUD fixo - confundido com contador de etapa por
ficar perto do `SessionTopBar` - e virou `PenaltyHeaderBadge` no `GlobalNav`, publicado via novo
`lib/dailyPenaltyContext.ts` (store `useSyncExternalStore`, mesmo padrao de
`studyAssistantContext.ts`). `SessionLayout`/`IntroCard` tiveram o `pt-20` (folga historica pro HUD
fixo) reduzido pra `pt-8` - virou espaco vazio sem funcao, sobrava scroll demais. (3) Timer
Pomodoro novo (`lib/pomodoroTimer.ts` + `components/pomodoro/`) - ver "Fora de escopo" pra por que
e 100% client-side, e as entradas de `PomodoroWidget`/`PomodoroHeaderBadge` acima pro
funcionamento.

**Sessao em 2 Colunas + Suporte Rapido de IA em Painel Fixo (Fase 37):** pedidos explicitos de
refinamento visual da sessao. `SessionLayout` ganhou `leftSidebar` (2a coluna, `items-stretch` pra
igualar a altura do cartao central) - `useMaterialSidebar.tsx` passou a devolver
`{ weekly, materialSidebar, sidebar }` em vez de so `sidebar`: `materialSidebar` (esquerda) tem
"Material de hoje" + `PomodoroWidget` (que ganhou `flex-1` pra preencher o espaco sobrando -
"esse card podia ocupar esse espaco"); `sidebar` (direita) tem `QuickNotePanel` + o novo
`StudyAssistantPanel` (Suporte Rapido de IA em card fixo - "algo mais parecido com um chat" em vez
do botao flutuante `QuickQuestionOrb`, que continua so em WeeklyProjectPage). Estado do chat
extraido pro hook `useStudyAssistantChat` (compartilhado pelos 2 componentes). Layout da pagina
ganhou mais orcamento de largura (`max-w-[1360px]`->`max-w-[1600px]`, `px-10`->`px-6`) pra caber os
2 sidebars de 280px sem espremer o cartao central.

```
frontend/
  index.html, vite.config.ts, package.json, tsconfig*.json
  .env.example, .env.local (gitignorado - VITE_API_BASE_URL)
  src/
    main.tsx              <- BrowserRouter + AuthProvider + SettingsProvider (Fase 25, ver
                              contexts/SettingsProvider.tsx) + Routes ("/" Splash, "/login" fora do
                              ProtectedRoute; /esqueci-senha e /redefinir-senha (Fase 41) tambem
                              fora, mesmo motivo; onboarding/onboarding/perfil/selecionar-curso/start
                              fora do <App/> - so start SEM params fica sem shell de verdade, ver
                              routes/StartPage.tsx; /hoje voltou pra DENTRO do <Route
                              element={<App/>}> na Fase 25, usa <TodayPage/> direto - era
                              <TodayRoute/> fora do shell desde a Fase 20, ver App.tsx abaixo);
                              /conquistas vira <Navigate to="/perfil?tab=conquistas"/> desde a
                              Fase 18)
    App.tsx                <- shell com <GlobalNav/> (Fase 25, ver components/GlobalNav.tsx -
                              substitui o antigo <nav> de 2 links) + <ErrorBoundary
                              key={pathname+search}><Outlet/></ErrorBoundary> (Fase 10; `+search`
                              desde a Fase 25, cobre /hoje trocando de Daily via `?daily=` sem
                              trocar de pathname). `children` prop opcional (Fase 25) - StartPage
                              chama `<App>...</App>` manualmente nas 5 sub-telas de `/start?...`
                              que ainda querem o menu global (a 6a, sem params, fica sem shell,
                              full-bleed - ver "Mapa do Mundo" abaixo). Fase 20-24: `/hoje` ficava
                              fora deste shell (full-bleed) pro nav fixo nao sobrepor o
                              PenaltyGauge/botao de configuracoes - Fase 25 reverteu isso
                              (PenaltyGauge reposicionado, botao de configuracoes proprio removido -
                              ver "Menu global unico" abaixo), `/hoje` volta a ganhar o shell
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
      worldPosition.ts                <- getSavedWorldPosition/saveWorldPosition (Fase 25) -
                                   localStorage por userId, ultima posicao do personagem no mapa
                                   (continuidade cosmetica, mesmo principio de nao-sincronizar-entre-
                                   dispositivos ja usado pro limite de gravacao)
      dailyPenaltyContext.ts            <- setDailyPenalty/useDailyPenalty (Fase 36) - store externo
                                   modulo-level via useSyncExternalStore (nao React Context, mesmo
                                   padrao de studyAssistantContext.ts abaixo). TodayPage seta via
                                   useEffect com o penaltyPoints/penaltyThreshold da Daily atual;
                                   null fora de sessao ativa. Existe pra PenaltyHeaderBadge
                                   (GlobalNav, sempre montado) ler o contador sem precisar de Provider
                                   novo envolvendo o app inteiro so pra isso
      pomodoroTimer.ts                  <- store modulo-level do Timer Pomodoro (Fase 36, ver
                                   secret/rascunhos/timer-pomodoro-sessao.md) - mesmo padrao
                                   useSyncExternalStore de dailyPenaltyContext.ts, com setInterval
                                   proprio (independente de qualquer componente montado, por isso o
                                   badge do header continua contando ao navegar pra fora da sessao).
                                   Manual (aluno liga/desliga, sem relacao com Daily.Start/Resume/
                                   Complete); predefinicoes fixas (25/5, 50/10, 15/3) em vez de
                                   duracao livre; fim de ciclo troca de fase automaticamente + bipe
                                   (Web Audio API, sem asset de audio novo) + destaque visual por
                                   ~5s. 100% client-side/cosmetico - sem endpoint novo, sem Gems,
                                   reseta se a aba fechar (ver "Fora de escopo")
      useStudyAssistantChat.ts           <- hook (Fase 37) com a logica do Suporte Rapido de IA
                                   (enviar pergunta, historico, /clear, erro), extraida de dentro de
                                   StudyAssistantWidget quando o "material de hoje" ganhou uma 2a
                                   apresentacao (StudyAssistantPanel, card fixo) - os 2 componentes
                                   compartilham o mesmo estado/comportamento, so a apresentacao muda
    contexts/
      authContextObject.ts         <- createContext + AuthContextValue (Fase 12) - so o objeto/tipo,
                                   separado do Provider e do hook pelo mesmo motivo de statusBadge.ts;
                                   login/register devolvem o UserDto (Fase 13b), pra quem chama nao
                                   depender do proximo render do contexto pra saber quem logou
      AuthContext.tsx                <- AuthProvider (Fase 12) - carrega GET /api/auth/me 1x no mount
      useAuth.ts                      <- hook useAuth() (Fase 12)
      settingsContextObject.ts         <- createContext + SettingsContextValue (Fase 25), mesmo
                                   padrao de authContextObject.ts
      SettingsProvider.tsx               <- Provider (Fase 25) - estado do SettingsMenu (Fase 7)
                                   virou 1 instancia so pro app inteiro (antes era estado local de
                                   TodayPage) - GlobalNav abre de qualquer tela, useSessionExitGuard
                                   (TodayPage, ESC/voltar do navegador em sessao ativa) continua
                                   abrindo tambem, agora os dois compartilham o mesmo estado.
                                   Renderiza <SettingsMenu/> 1x como irmao de children (mesmo padrao
                                   de AuthProvider+SessionExpiredModal). onExit continua
                                   `window.location.href` (nao navigate) - preservado identico
      useSettings.ts                      <- hook useSettings() (Fase 25), mesmo padrao de useAuth.ts
    api/
      types.ts               <- espelha os DTOs de Focadu.Application (enums como numero, com
                                   consts tipo ActivityType/AnswerMode/ActivityStatus/TerminalQuality/
                                   WeeklyProjectStatus/DailyStatus/CourseStatus (Fase 8, viraram
                                   const), ACTIVITY_TYPE_LABEL/CURATED_CONTENT_TYPE_NAMES,
                                   PublicationPlatform/PublicationStatus/ModulePublicationDto/
                                   GitHubRepoDto (Fase 11)
      client.ts               <- fetch tipado, ApiError, VITE_API_BASE_URL, suporte a FormData
                                   (upload de audio, Fase 5, sem forcar Content-Type json); request()
                                   usa AbortSignal.timeout() desde a Fase 10 (10s padrao, 95s pro
                                   endpoint de audio - ver "Timeout de requisicoes"); credentials:
                                   'include' desde a Fase 12 (senao o cookie de sessao nunca vai/volta)
      useApiResource.ts        <- hook pra loading/error/cancelamento (usado pelas sub-telas de /start e /admin/conteudo);
                                   `error` e um `ApiFailure` classificado (nao string) + `retry()` desde a Fase 10
    routes/
      SplashPage.tsx             <- "/" (Fase 12) - checa sessao (AuthProvider) e redireciona pra
                                   /login, ou resolveLandingPath(user) (onboarding/selecao de
                                   curso/start - Fase 13b), duracao minima de 700ms
      LoginPage.tsx                <- "/login" (Fase 12) - abas Entrar/Criar Conta; onSuccess de
                                   ambos os forms passa pelo mesmo resolveLandingPath (Fase 13b).
                                   Fase 41: link "Esqueci minha senha" -> /esqueci-senha (antes
                                   deliberadamente ausente, sem backend pra sustentar)
      ForgotPasswordPage.tsx      <- /esqueci-senha (Fase 41) - fora do <ProtectedRoute/>, layout
                                   proprio (cartao centralizado, nao reproduz o painel de marca
                                   dividido da LoginPage - sem node de Figma pra esta tela).
                                   POST /api/auth/forgot-password sempre "sucesso", mesma tela pra
                                   email cadastrado ou nao
      ResetPasswordPage.tsx       <- /redefinir-senha?token= (Fase 41) - token vem da query string
                                   (link do email); POST /api/auth/reset-password,
                                   token_invalido/token_expirado mostrados como veio do backend
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
      TodayPage.tsx            <- /hoje (orquestra os 7 tipos de atividade e o fluxo de conclusao -
                                   Fase 7); ReinforcementIntroScreen como gate quando
                                   `daily.isReinforcement` e nenhuma atividade ainda respondida
                                   (Fase 15). Fase 25: `TodayRoute` removido (o `<App/>` cobre o
                                   `<ErrorBoundary key={pathname+search}>` agora, `/hoje` esta dentro
                                   do shell de novo) - `TodayPage` e o elemento de rota direto; botao/
                                   estado proprio de Configuracoes saiu (usa `useSettings()`, ver
                                   contexts/SettingsProvider.tsx). Fase 36: o contador de erros (antigo
                                   `PenaltyGauge` `fixed left-6 top-[72px]`) saiu daqui - publicado
                                   via `setDailyPenalty` (`lib/dailyPenaltyContext.ts`) num useEffect
                                   proprio, pro `GlobalNav` mostrar (`PenaltyHeaderBadge`); limpo
                                   (`null`) ao completar a Daily, trocar de Daily ou desmontar. Fase
                                   36 tambem trouxe "Etapa anterior" (`goToActivity`, pino manual num
                                   `activityId` especifico - `handleContinue` passou a so avancar 1
                                   posicao a partir do `step` atual, nunca mais recalcular "1a
                                   pendente" do zero via `resolveStep` a cada Continuar, que divergia
                                   ao voltar e depois seguir em frente)
      StartPage.tsx             <- /start (so o roteador por query string - Fase 8: as 3 telas
                                   viraram arquivos proprios abaixo, StartPage so decide qual mostrar);
                                   `<WeeklyDetailPage key={weeklyId} .../>` desde a Fase 11 (ver
                                   "Bug real: modal preso ao trocar de Weekly" abaixo); `?ranking=1`
                                   -> RankingPage (Fase 16, mesmo padrao de flag de `?project=`);
                                   sem params -> `WorldMapPage` no desktop desde a Fase 25 (era
                                   `StartDashboard` ate a Fase 24), `StartDashboard` de volta no
                                   celular (`useIsMobile()`, viewport < 768px - mapa exige teclado,
                                   sem sentido num touchscreen; `StartDashboard` roda dentro de
                                   `<App>` como sempre rodou). **Desativado pro lancamento (pos-
                                   Fase 26, commit `51bd45c`)**: sem params volta a cair sempre em
                                   `StartDashboard`, desktop e celular - `isMobile`/`WorldMapPage`
                                   pararam de ser referenciados aqui (nada apagado, so o `if`
                                   sumiu). Reverter e restaurar o branch acima, ver comentario em
                                   `StartPage.tsx`
      world/WorldMapPage.tsx     <- /start sem params (Fase 25, Parte A) - hub de entrada virou mapa
                                   top-down. **Sem referencia em StartPage desde o lancamento pos-
                                   Fase 26** (ver nota acima) - arquivo intacto, so nao esta no
                                   caminho de nenhuma rota no momento
                                   top-down (`assets/world/mapa-vilarejo.png`, arte trazida pelo
                                   Falves) com personagem controlavel (setas/WASD, sem colisao contra
                                   predio - so as 5 trigger zones das portas importam), FULL-BLEED
                                   (unica tela sem `<GlobalNav/>`, ver App.tsx acima); GemBadge/
                                   StreakIndicator sobrepostos no HUD (mesma fonte de dado da Fase 14
                                   que o StartDashboard usava); guarda de `nenhuma_matricula_ativa`
                                   preservada identica (renderiza EmptyStateStartPage). Posicao
                                   persistida entre visitas via `lib/worldPosition.ts` (localStorage
                                   por userId) - salva no instante de entrar numa casa (`handleEnterZone`
                                   chama `pushAwayFromZone`, NAO a posicao exata do gatilho - fix
                                   real, nascer dentro do proprio raio da trigger zone fazia o 1o
                                   movimento re-disparar a mesma zona, personagem preso entrando e
                                   saindo da mesma casa) e em segundo plano ~400ms depois que o
                                   personagem para (`useEffect` debounced,
                                   cobre sair sem passar por trigger zone). Personagem e
                                   so placeholder (bolinha + indicador de direcao) - sem asset de
                                   personagem ainda, ver "Fora de escopo" abaixo. `HouseLabel`
                                   (components/world/) sempre visivel acima de cada porta - so o
                                   titulo (Hoje/Trilha do Curso/etc), posicao derivada da propria
                                   trigger zone (x igual, y = topo do circulo + gap). Botao "Ajustar
                                   zonas" no canto (state local, sem query param) mostra os circulos
                                   das 5 trigger zones + coordenada atual do personagem - nao e
                                   feature, e ferramenta de calibracao contra a arte
      world/worldConfig.ts        <- coordenadas das 5 trigger zones (espaco de pixels da imagem,
                                   2304x1296) + pra onde cada uma navega - torre->Hoje, castelo->
                                   Trilha do Curso (Ranking continua ancorado la dentro), casinha->
                                   Perfil, celeiro->Loja, campo de treino->Squad
      world/useWorldMovement.ts    <- hook do loop de movimento (keydown/keyup + requestAnimationFrame,
                                   sem lib externa - mesmo principio de "fetch nativo sem lib extra"
                                   do resto do frontend) + deteccao de entrada em trigger zone.
                                   `normalizeKey` (Fase 25, fix real) - `event.key` vem maiusculo
                                   com Caps Lock ligado/Shift segurado, nao batia com as entradas
                                   minusculas de MOVE_VECTORS (WASD parava de funcionar
                                   silenciosamente, setas continuavam OK por nao serem letras)
      lib/useIsMobile.ts (Fase 25)   <- hook - true com viewport < 768px (breakpoint `md`), usado
                                   por StartPage pro fallback mobile em /start
      GlobalNav.tsx (Fase 25)       <- menu global unico (components/) - substitui o antigo <nav> de
                                   2 links do App.tsx. Fase 62 (Figma node 178:143): Hoje, Trilhas,
                                   Ranking | botao central | Squad, Loja + PenaltyHeaderBadge +
                                   PomodoroHeaderBadge (Fase 36) + UserMenu ("@usuario" + avatar;
                                   abre Meu perfil, Configuracoes e o status da IA - os dois ultimos
                                   sairam da barra, o Figma nao os tem). 73px de altura e texto 24px
                                   em `xl` (>= 1280px), tamanho antigo abaixo; altura em
                                   `--nav-height` (index.css), descontada pelas telas sem rolagem
                                   externa. Botao central "volta pro mapa" - placeholder (emoji),
                                   sem PNG pixel art de verdade ainda (ver "Fora de escopo").
                                   **PenaltyHeaderBadge** (`gamification/`, Fase 36): contador de
                                   erros da Daily em andamento - substitui o antigo `PenaltyGauge`
                                   `fixed left-6 top-[72px]` sobre o canto de QUALQUER tela de sessao
                                   (reportado numa verificacao ao vivo como confuso ali, parecendo
                                   contador de etapa por ficar perto do SessionTopBar); le
                                   `lib/dailyPenaltyContext.ts` (TodayPage seta via useEffect), null
                                   fora de Daily ativa - o proprio componente decide nao renderizar
                                   nada. Ganhou legenda + tooltip explicando o numero (antes so o
                                   `title` nativo do navegador). **PomodoroHeaderBadge**
                                   (`pomodoro/`, Fase 36): versao compacta do Timer Pomodoro da
                                   sessao (ver `PomodoroWidget` abaixo e `lib/pomodoroTimer.ts`), so
                                   aparece depois que o aluno da play pela 1a vez; clicavel (play/
                                   pausa direto do header).
                                   `courseId` resolvido com busca propria (GET /api/courses, mesmo
                                   fallback Active->primeiro que WorldMapPage/StartDashboard sempre
                                   usaram) - self-contained, mesmo padrao de UserMenu. Sem
                                   destaque de "item ativo" (NavLink so compara pathname, destacaria
                                   Trilha/Ranking juntos incorretamente - usa Link simples).
                                   Responsivo (Fase 25, descoberto testando o fallback mobile - 7
                                   itens + botao central + badge nao cabiam em ~390px): abaixo do
                                   breakpoint `md`, os 2 grupos de texto viram um botao "☰" que abre
                                   um menu suspenso em lista (fecha ao navegar); botao central e
                                   UserMenu (so o avatar) continuam sempre visiveis. Acima
                                   de `md`, layout identico ao original
      StartDashboard.tsx (Fase 8-24)  <- hub antigo em cards ("Comecar Hoje"/"Projeto"/"Trilha") -
                                   volta a ter uso na Fase 25 como fallback mobile de `/start` (ver
                                   `docs/fase-25/resumo-implementacao-fase-25.md`), nao removido por
                                   decisao tecnica
      WeeklyDetailPage.tsx        <- /start?weekly= - dias da semana + projeto + navegacao entre semanas
                                   (Fase 8); banner + trigger do PublicationModal quando
                                   `requiresPublicationToUnlock` (Fase 11); WeeklyReinforcementBadge
                                   no cabecalho quando `hasPendingWeeklyReinforcement` (Fase 15).
                                   Fase 39: `DayCard` mostra `day.title` (titulo do material do dia)
                                   em vez de so "Dia N"; container alargado (`max-w-6xl`/`px-6 py-8`,
                                   mesmo ajuste ja feito em `SessionShell.tsx`)
      CourseDetailPage.tsx        <- /start?course= - trilha completa (semanas + mini-grid de dias)
                                   (Fase 8); badge "🔒 Bloqueado" na Weekly seguinte a uma que ainda
                                   precisa de publicacao (Fase 11); links "🏆 Ver Ranking" ->
                                   /start?course=&ranking=1 (Fase 16) e "🎖️ Conquistas" -> /conquistas
                                   (Fase 17). Fase 39: `findCurrentWeekId` destaca (borda accent) a
                                   1a semana acessivel e ainda incompleta em `WeekSummaryCard`, no
                                   lugar do emoji ▶️/🔒 fixo por semana (🔒 continua so quando bloqueada)
      RankingPage.tsx            <- /start?course=&ranking=1 (Fase 16, tela 13 do inventario
                                   original) - abas Semana/Mes/Curso (RankingScopeTabs), top 10
                                   (RankingTable) + posicao do usuario sempre visivel
                                   (CurrentUserRankingCard)
      MarketplacePage.tsx        <- /loja (Fase 17, tela 14 do inventario original). Fase 25: "em
                                   breve" (pedido do Falves - vai montar um kit inicial de pixel
                                   art pros cosmeticos) - so `GemBadge` + `ComingSoon` (novo,
                                   components/), filtro por slot (CosmeticSlotFilter) + grid
                                   (CosmeticItemCard) saíram desta tela (arquivos continuam no
                                   repo, sem uso); `purchaseCosmeticItem`/`equipCosmetic`/
                                   `unequipCosmetic` (api/client.ts) intactos, so nao exercitados
                                   aqui mais
      ProfilePage.tsx            <- /perfil (Fase 18) - 4 abas via ?tab= (Informacoes/Customizacao/
                                   Conquistas/Squad, default Informacoes); ProfileHeader (nome+
                                   moldura+Gems+Streak) acima das abas, sempre visivel, le
                                   `data.catalog` direto (Fase 25: `catalogOverride`/`busyItemId`/
                                   `actionError`/`runAction` saíram - so existiam pra alimentar a
                                   aba Customizacao, que virou "em breve", ver CustomizationTab.tsx)
      WeeklyProjectPage.tsx      <- projeto pratico da semana (Fase 7; a especificacao
                                   renderiza via MarkdownBlock desde a Fase 58, antes era
                                   texto corrido com a sintaxe crua; escolha de linguagem
                                   com confirmacao em 2 passos desde a Fase 59, piloto
                                   Semana 1)
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
                                   UserMenu
      UserMenu.tsx                   <- Fase 62 (substitui HeaderUserBadge, Fase 18) - "@usuario"
                                   (DisplayName sem espacos/acentos, minusculo - User nao tem
                                   username) + avatar com moldura; clique abre Meu perfil,
                                   Configuracoes e o status da IA; fecha no clique fora/Esc. Cor do
                                   nome: cosmetico equipado ou verde `accent`. Ponto no avatar
                                   quando a IA nao esta ok
      AiStatusBadge.tsx              <- Fase 28 (Fase 62: so o detalhe, `AiStatusDetails`, sem o
                                   selo) - resumo + nome/status/erro por provedor; estado vem de
                                   `lib/useAiStatus.ts` (GET /api/system/ai-status, polling 45s)
      auth/
        LoginForm.tsx                <- email + senha (Fase 12); onSuccess recebe o UserDto (Fase 13b)
        RegisterForm.tsx              <- nome + email + senha + confirmacao (Fase 12); onSuccess
                                   recebe o UserDto (Fase 13b); `referralCode` opcional (Fase 17,
                                   vem de /login?ref=, ver LoginPage)
        ForgotPasswordForm.tsx       <- Fase 41 - so email, onSubmitted(email) (nao ha UserDto, essa
                                   chamada nunca cria sessao)
        ResetPasswordForm.tsx        <- Fase 41 - nova senha + confirmacao (mesmo padrao de
                                   RegisterForm), recebe `token` por prop (vem da query string de
                                   ResetPasswordPage), onSuccess() sem payload
      onboarding/                  <- Fase 13b
        InterestChip.tsx                <- chip de interesse multi-select (Entrevista de Perfil)
        OnboardingStepper.tsx             <- "Passo X de 3" + pontinhos, compartilhado pelas 3 telas
      gamification/                 <- Fase 14
        GemBadge.tsx                     <- icone + contador de Gems, mesmo padrao pill de StatusBadge
        StreakIndicator.tsx               <- "🔥 N dias" - StartDashboard (real) e EmptyStateStartPage (fixo em 0)
        PenaltyHeaderBadge.tsx             <- Fase 15 (`PenaltyGauge`) / Fase 36 (renomeado e movido
                                   pro GlobalNav) - "conta-giros" de erros da Daily em andamento,
                                   cor por faixa (neutro/amarelo/laranja/vermelho); mesma linguagem
                                   visual do ProgressBar (Fase 8). Ate a Fase 35 era `PenaltyGauge`,
                                   `fixed left-6 top-[72px]` sobre QUALQUER tela de sessao (ver
                                   GlobalNav.tsx acima pro raciocinio da mudanca) - le
                                   `lib/dailyPenaltyContext.ts` em vez de receber props diretas
      pomodoro/                     <- Fase 36 (ver secret/rascunhos/timer-pomodoro-sessao.md)
        PomodoroWidget.tsx                 <- versao "design exclusivo" do Timer Pomodoro, empilhada
                                   no sidebar esquerdo da sessao (ver useMaterialSidebar.tsx) -
                                   digitos grandes, ProgressBar (tone accent=foco/project=pausa),
                                   pills de preset (25/5, 50/10, 15/3), play/pausar/zerar. Fase 37:
                                   ganhou `flex-1` (cresce pra preencher a coluna esquerda inteira,
                                   pedido explicito - antes sobrava vao vazio empilhado acima dele)
        PomodoroHeaderBadge.tsx              <- versao compacta pro GlobalNav, ver entrada acima
      assistant/                    <- Fase 37
        StudyAssistantPanel.tsx              <- Suporte Rapido de IA em card fixo (pedido explicito:
                                   "algo mais parecido com um chat" em vez do botao flutuante) -
                                   empilhado no sidebar direito da sessao (ver useMaterialSidebar.tsx),
                                   ao lado do QuickNotePanel. Mesmo estado/logica que
                                   StudyAssistantWidget via useStudyAssistantChat (lib/), so a
                                   apresentacao muda (card sempre visivel em vez de painel que abre
                                   por cima de tudo). Lista de mensagens com altura fixa (h-[200px],
                                   scroll proprio) - pedido explicito de "tamanho similar ao
                                   Pomodoro" pros 2 lados do sidebar ficarem equilibrados
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
        CustomizationTab.tsx                  <- Fase 18: inventario agrupado pelos 3 slots reais
                                   (CosmeticSlot). Fase 25: "em breve" (mesmo motivo da
                                   MarketplacePage) - componente sem props, so `ComingSoon`
        ConquestsTab.tsx                       <- BadgeGrid + ReferralCard movidos de
                                   AchievementsPage.tsx (removido) - mesmo conteudo, novo lar
      activities/                 <- primitivas visuais das atividades avaliaveis (Fase 9)
        IntroCard.tsx                <- tela de intro (badge/titulo/descricao/regras/CTA) - gate local (`started`), nao e passo novo no Step do TodayPage
        OptionCard.tsx                <- card de opcao (neutro/selecionado/correto/errado/esmaecido) - Quiz, Roleplay, e (Fase 23) os 2
                                   lados do matcher de WordMatch (reaproveitado sem mudanca).
                                   Fase 19: "selecionado" ganhou preenchimento verde translucido
                                   (bg-accent/25, nao so a borda), padding px-[18px]/py-4 exatos do Figma
        CodeHighlight.tsx              <- realca a lacuna "___" do prompt de Cloze - fonte mono (Fira Code, Fase 19) em vez de somar a fonte "Cousine" do Figma so pra este bloco
      QuizActivity.tsx             <- Quiz e Cloze/MultipleChoice (Intro + OptionsAnswer) (Fase 9). Fase 19: pos-Intro usa SessionLayout (era ActivityScreen simples)
      WordMatchActivity.tsx         <- matcher visual de 2 colunas por toque (tap-to-connect), 1 DailyActivity = 1 grupo de pares inteiro
                                   (Fase 23, reforma completa - substitui a versao Fase 9/19 que
                                   reaproveitava OptionsAnswer por termo, ver nota de divergencia
                                   removida do proprio arquivo). Fase 44 (bug real relatado ao
                                   vivo): em handleSubmit, o refetch do gabarito (api.getDaily ->
                                   setTerms/setDefinitions) precisa terminar ANTES de
                                   setLastResponse (o que vira `answered=true` e revela o
                                   resultado) - na ordem antiga, havia 1 render com answered=true
                                   e terms ainda sem CorrectDefinitionId, e termVerdict acusava
                                   "errado" em todos os pares nesse instante (flash de feedback
                                   falso antes do resultado real).
      OptionsAnswer.tsx          <- nucleo "escolher opcao" - Quiz, Cloze/MultipleChoice; usa OptionCard desde a Fase 9. WordMatch usava isto ate a Fase 21, tem interacao propria desde a Fase 23 (ver WordMatchActivity.tsx)
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
                                   sidebar + orbe) que Reading/Video ja tinham como JSX proprio duplicado.
                                   Fase 36: SessionTopBar ganhou `onBack` opcional - mostra "← Etapa
                                   anterior" acima do stepLabel, volta pra atividade anterior da MESMA
                                   Daily pra revisar (nunca refaz - cada atividade decide seu proprio
                                   "ja respondida" via `activity.responses`, ver TodayPage.goToActivity);
                                   omitido na 1a atividade ou quando o chamador julgar inseguro (ex:
                                   VoiceSummaryActivity gravando). Fase 37: SessionLayout ganhou
                                   `leftSidebar` (2 colunas em vez de 1 - ver useMaterialSidebar.tsx),
                                   `items-stretch` (as 2 colunas ganham a altura do cartao central),
                                   `max-w-[1360px]`->`max-w-[1600px]`/`px-10`->`px-6` (orcamento de
                                   largura extra pros 2 sidebars de 280px sem espremer o cartao
                                   central); parou de renderizar `QuickQuestionOrb` sozinho (nas telas
                                   com esse sidebar o botao flutuante deu lugar ao
                                   `StudyAssistantPanel` fixo - unico call site restante de
                                   `QuickQuestionOrb` e WeeklyProjectPage, que nao tem esse sidebar)
      useMaterialSidebar.tsx      <- hook (Fase 19, arquivo proprio - co-exportar com SessionShell.tsx quebraria o fast refresh) - busca a Weekly e monta o MaterialSidebar com os itens/concluidos da Daily atual; reaproveitado pelas 7 telas de sessao.
                                   Fase 29: ganhou QuickNotePanel do Caderninho. Fase 36: ganhou
                                   PomodoroWidget. Fase 37 (reagrupado em 2 colunas, pedido
                                   explicito): retorna `{ weekly, materialSidebar, sidebar }` (era so
                                   `sidebar`) - `materialSidebar` (coluna esquerda, vira `leftSidebar`
                                   no SessionLayout) tem MaterialSidebar + PomodoroWidget (que ganha
                                   `flex-1` pra preencher o espaco sobrando); `sidebar` (coluna
                                   direita) tem QuickNotePanel + StudyAssistantPanel (`justify-between`
                                   no container, Caderninho de tamanho fixo + vao antes do chat)
      MaterialSidebar.tsx         <- "Material de hoje", compartilhado por Reading/Video (Fase 7), demais telas de sessao desde a Fase 19 (via useMaterialSidebar). `activeContentId` virou nullable (so Reading/Video tem conteudo proprio pra destacar)
      SettingsMenu.tsx            <- menu de configuracoes (overlay), Fase 7 - so o componente
                                   visual (props open/onClose/onExit/onLogout, sem estado proprio);
                                   montado em SettingsProvider desde a Fase 25 (era TodayPage direto)
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
| `/esqueci-senha` | `POST /api/auth/forgot-password` | `ForgotPasswordPage` (Fase 41) - fora do `<ProtectedRoute/>` |
| `/redefinir-senha?token=` | `POST /api/auth/reset-password` | `ResetPasswordPage` (Fase 41) - fora do `<ProtectedRoute/>`, token vem da query string (link do email) |
| `/onboarding` | `PUT /api/users/me/profile` (so no "Pular tour") | `OnboardingWelcomePage` (Fase 13b) - passo 1/3 |
| `/onboarding/perfil` | `PUT /api/users/me/profile` | `ProfileInterviewPage` (Fase 13b) - passo 2/3, Entrevista de Perfil. `?edit=1` (Fase 18) - mesma tela em modo edicao, pre-populada, volta pro `/perfil` |
| `/selecionar-curso` | `GET /api/courses/available` + `POST /api/enrollments` | `CourseSelectionPage` (Fase 13b) - passo 3/3 |
| `/hoje` | `GET /api/today` | Daily ativa de hoje - **os 7 tipos de atividade implementados de ponta a ponta** (Reading/Video desde a Fase 7). Fora do shell `<App/>` da Fase 20 ate a 24 (full-bleed); dentro do shell de novo desde a Fase 25 (ganhou `GlobalNav`); contador de erros saiu do HUD fixo e virou badge no proprio `GlobalNav` desde a Fase 36 (`PenaltyHeaderBadge`) |
| `/hoje?daily=` | `GET /api/dailies/{dailyId}` | Mesma tela de `/hoje`, mas pra uma Daily especifica (Fase 4 - deep-link pra sessao de reforco; Fase 8: tambem usada como "reprise" de um dia ja concluido, clicado a partir da Visao Semanal) |
| `/start` (sem params) | `GET /api/today` + `GET /api/courses` + `GET /api/users/me/gamification` | `StartDashboard` (Fase 8-24, e de volta desktop+celular pos-Fase 26 - `WorldMapPage` da Fase 25 desativado pro lancamento, ver nota em "Frontend" acima) |
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
| `{kind:'done'}`) que so muda quando o usuario clica "Continuar". Sem isso, a ultima atividade da
sessao tinha o proprio reveal engolido - assim que a resposta era enviada e os dados atualizavam,
o componente pai ja trocava de tela antes do usuario conseguir ler "Acertou!"/"Errou" (bug
encontrado e corrigido durante a verificacao ao vivo desta fase). Cada componente de atividade
(`OptionsAnswer`, `WordMatchActivity`, `ClozeFreeTextActivity`, `RoleplayActivity`) recebe
`onDailyRefetched` (atualiza os dados) e `onContinue` (so chamado quando o usuario decide avancar)
como callbacks separados. Ate a Fase 21, `Step` tinha um terceiro caso (`{kind:'wordMatchGroup'}`)
so pra WordMatch, porque varias `DailyActivity` do tipo formavam 1 exercicio na tela mas
continuavam sendo N atividades separadas pro dominio - a Fase 23 (WordMatch = 1 unica
`DailyActivity` por grupo) removeu esse caso especial: WordMatch virou uma atividade comum como
qualquer outra no `Step`, e se um dia tiver mais de 1 grupo, cada um vira sua propria etapa
sequencial, sem logica extra em `TodayPage`.

**WordMatch, na tela (Fase 23):** cada `DailyActivity` do tipo WordMatch vira 1 tela de matcher de
2 colunas (`WordMatchActivity.tsx`) - termos a esquerda, definicoes embaralhadas a direita, ligados
por toque (tap-to-connect, nao drag-and-drop - ver nota no proprio arquivo pra o motivo). O botao
"Continuar" so aparece quando todos os pares estao ligados; a resposta e enviada de uma vez so
(`wordMatchMatches`). Se uma Daily tiver mais de 1 grupo de WordMatch (o molde de curadoria em
`secret/curadoria/CURADORIA.md` preve 3 grupos por dia), cada `DailyActivity` vira sua propria etapa
sequencial no `Step` - sem agrupamento especial, como qualquer outro tipo de atividade.

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
por padrao (`DEFAULT_TIMEOUT_MS`), exceto `submitVoiceSummaryResponse` (95s desde a Fase 42, 70s
antes, `VOICE_SUMMARY_TIMEOUT_MS`) - o endpoint de audio transcreve e avalia por IA em sequencia no
backend (avaliacao virou 2 chamadas Groq na Fase 42, ver "Resumo falado por voz" acima pro
orcamento completo de timeout/retry); um timeout de cliente de 10s quebraria essa atividade toda
vez.

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

**`cursor: pointer` em `<button>` (Fase 34):** o Preflight do Tailwind v4 nao da isso a `<button>`
de graca (so `<a href>` ja vem assim do proprio navegador) - como boa parte do app usa `<button>`
estilizado como link/acao (`text-accent hover:underline`, abas, "Fechar (ESC)", etc.), ficavam com
o cursor de seta padrao apesar de clicaveis. Regra global em `index.css`
(`button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer }`, dentro de `@layer
base`) resolve pro app inteiro de uma vez - nenhum componente precisou de `cursor-pointer`
manual. `:not(:disabled)` preserva o cursor default nos botoes desabilitados (`disabled:opacity-40`).

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
- **Resolvido na Fase 14 (Gems/Streak), Fase 16 (Ranking/Score de Estudo), Fase 17
  (Marketplace/Cosmeticos/Trofeus/Indicacao) e Fase 24 (Squad), nao e mais pendencia:** ver
  secoes correspondentes em "Modelo de dominio" acima. **Ainda em standby:** Arcade/UGC e
  XP/Level/Elo/Patente, alem de qualquer entidade de "partida"/Challenge/PvP - confirmado
  explicitamente fora do escopo tanto da Fase 14 quanto da Fase 24 (Squad ficou so em
  owner/member + ranking, sem PvP nenhum entre squads).
- Endpoints de autoria de Course/Monthly/WeeklyTemplate/DailyTemplate/DailyActivity/CuratedContent
  - nada disso tem API de criacao/edicao (CuratedContent teve, Fase 4 a 13b, removida - decisao do
  usuario, ver "Autoria de conteudo curado"). Toda a estrutura, incluindo conteudo curado, e so via
  `SeedWebSecurityCourseUseCase`/`CuratedDayImporter`.
- Exclusao (`DELETE`) de `CuratedContent` - so criacao/edicao existem; nunca foi pedido um
  endpoint de remocao.
- CORS liberado so para `http://localhost:5173` (hardcoded, dev apenas).
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
  virar `true` de verdade. **Ressalva que durou ate a Fase 27b:** o endpoint existir nao bastava -
  nada no frontend o chamava, entao `IsModuleComplete()` de fato nunca virava `true` pra usuario
  nenhum ate `SubmitWeeklyProjectUseCase` passar a disparar a avaliacao sozinho.
- **Resolvido na Fase 10, nao e mais pendencia:** telas de erro no frontend (sem conexao, timeout,
  vazio, erro generico) - antes uma falha de fetch so mostrava texto vermelho solto
  (`<Centered text={error} tone="alert" />`).
- "Modo Offline" (cache local pra continuar navegando sem servidor) e "Reportar" (mailto/formulario
  de feedback no erro generico) - ambos citados no prompt da Fase 10 como "futuro", sem cache local
  nem endereco de suporte pra apontar ainda.
- **Resolvido na Fase 22, nao e mais pendencia:** sistema de sessao/expiracao - o design "Erro -
  Sessao Expirada" da Fase 10 ganhou tela, como modal global - ver "Sessao expirada: interceptor
  global de 401 (Fase 22)" acima.
- **Timer Pomodoro (Fase 36) e 100% client-side/cosmetico** - decisao explicita do Falves ao
  fechar as perguntas em aberto de `secret/rascunhos/timer-pomodoro-sessao.md`: sem endpoint novo,
  sem Gems, sem relatorio de tempo estudado (so engajamento visual, `lib/pomodoroTimer.ts`, reseta
  se a aba fechar). Persistir tempo estudado por Daily/dia (metrica nova de dominio) continua em
  aberto se um dia virar prioridade real de produto.

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
| 23 | Ligar Palavras (Matcher de 2 Colunas) | `docs/fase-23/resumo-implementacao-fase-23.md` |
| 24 | Squad (Fase A) | `docs/fase-24/resumo-implementacao-fase-24.md` |
| 25 (Parte A) | Mapa do Mundo (Navegacao) | `docs/fase-25/resumo-implementacao-fase-25.md` |
| 26 | Fechamento do Curriculo Web Security (Semanas 2-12) | `docs/fase-26/resumo-implementacao-fase-26.md` |
| 27 | Personalizacao por Analogia Estendida (Voz + LinkedIn) | `docs/fase-27/resumo-implementacao-fase-27.md` |
| 27b | Avaliacao Automatica do Projeto Semanal | `docs/fase-27b/resumo-implementacao-fase-27b.md` |
| 28 | Status de IA (badge no GlobalNav) | `docs/fase-28/resumo-implementacao-fase-28.md` |
| 29 | Caderninho de Anotacoes | `docs/fase-29/resumo-implementacao-fase-29.md` |
| 30 | Diagramas de Fluxo Simples na Curadoria | `docs/fase-30/resumo-implementacao-fase-30.md` |
| 31 | Mais Tipos de Diagrama na Curadoria | `docs/fase-31/resumo-implementacao-fase-31.md` |
| 32 | Suporte Rapido de IA (botao flutuante) | `docs/fase-32/resumo-implementacao-fase-32.md` |
| 33 | Historico Curto no Suporte Rapido de IA | `docs/fase-33/resumo-implementacao-fase-33.md` |
| 34 | Cursor Pointer Global em Botoes | `docs/fase-34/resumo-implementacao-fase-34.md` |
| 35 | Caderninho no Resumo Falado | `docs/fase-35/resumo-implementacao-fase-35.md` |
| 36 | Etapa Anterior na Sessao + Contador de Erros no Header + Timer Pomodoro | `docs/fase-36/resumo-implementacao-fase-36.md` |
| 37 | Sessao em 2 Colunas + Suporte Rapido de IA em Painel Fixo | `docs/fase-37/resumo-implementacao-fase-37.md` |
| 38 | Bloqueio do Projeto Semanal + Painel de Inicio + Sequenciamento de Daily por Progresso | `docs/fase-38/resumo-implementacao-fase-38.md` |
| 39 | Correcao de Transcricao de Voz Antes da Avaliacao + Titulo do Dia + Destaque de Semana Atual | `docs/fase-39/resumo-implementacao-fase-39.md` |
| 40 | Dockerizacao (Backend + Frontend) e CI/CD de Deploy Automatico | `docs/fase-40/resumo-implementacao-fase-40.md` |
| 41-45 | Redefinicao de Senha, correcoes ao vivo (Transcricao/Fuso/Ligar Palavras) e Certificacoes de Mercado | `docs/fase-41/` a `docs/fase-45/` - tabela nao mantida atualizada entre a Fase 40 e a Fase 46, ver pastas individuais |
| 46 | Repositorios de Projeto Semanal no Forgejo interno | `docs/fase-46/resumo-implementacao-fase-46.md` |

## O que uma proxima fase provavelmente precisa saber

- **Inconsistencia conhecida entre Fase 23 e Fase 35, nao resolvida de proposito:** o
  Resumo Falado deixa reler o material-fonte ORIGINAL a qualquer momento (inclusive durante a
  gravacao, via `MaterialSidebar`/`ContentPreviewModal`, Fase 23) mas so deixa reler as PROPRIAS
  notas do Caderninho antes de comecar a gravar (Fase 35, trava durante `state === 'recording'`) -
  ver `secret/rascunhos/caderninho-no-resumo-falado.md` pro raciocinio completo. Se decidir
  uniformizar (apertar o material-fonte pra bater com as notas, ou afrouxar as notas pra bater com
  o material-fonte), e decisao de produto nova, nao um bug.
- **Suporte Rapido de IA (Fase 32) ganhou historico curto na Fase 33** (`History`, ~4 trocas, ver
  secao Groq acima) - a decisao original de "zero historico" nao sobreviveu ao 1o teste real (uma
  pergunta de seguimento perdeu o fio sem ele). Se precisar aumentar `MaxHistoryMessages`/
  `MaxHistoryMessageLength` (`AskStudyAssistantUseCase`) no futuro, e so ajustar as 2 constantes -
  nao ha teto rigido de produto documentado, so o "curto de proposito" do espirito original.
  Mesmo padrao do QA descartavel da Fase 25: um usuario de teste
  (`smoketest-fase32@example.com`) ficou no banco local, criado so pra validar o endpoint novo
  ponta a ponta com a chave real da Groq - sem endpoint de remocao de usuario pra limpar via API.
- **Seed nao e upsert - reseedar um curso que ja existe exige apagar manualmente primeiro, na
  ordem certa** (Fase 26): `SeedWebSecurityCourseUseCase` e idempotente **por nome** (se o `Course`
  ja existe, nao insere nada de novo, nao atualiza). Pra recarregar do zero: `RoleplayOptions`
  primeiro (FK `NextNodeId` e `RESTRICT`, auto-referencia - apagar o `Course` direto em cascata
  bate nela) -> `Enrollments` (cascata pra `Weeklies`/`Dailies`/etc. - precisa ir **antes** do
  `Course`, porque `Weeklies.WeeklyTemplateId`/`Dailies.DailyTemplateId` tambem sao `RESTRICT`
  contra os Templates que o `Course` apagaria em cascata) -> `Courses`. Um `DELETE FROM "Courses"`
  direto esbarra nas 2 constraints acima.
- **Conteudo curado (`secret/curadoria/`) hoje mora num repositorio irmao separado**
  (`focadu-secret/`, com `.git` proprio, ao lado de `focadu/`) - `CuratedContentPath` (Seed) e
  `CuratedContentAllFilesTests` tentam `<raiz-deste-repo>/secret/...` primeiro (compatibilidade com
  quem tiver symlink local) e caem pro repo irmao se nao acharem. Lembrar de `git pull` no repo
  irmao antes de rodar o seed - o conteudo pode estar atrasado ali sem nenhum aviso no `focadu/`.
  `CuratedContentAllFilesTests` importa todo `dia-N.json`/`projeto.json` contra os importers reais
  sem precisar de banco - roda antes de qualquer seed real pra pegar erro de schema/enum cedo.
- **Fase 25 e "Parte A" de proposito - varias pendencias conhecidas, nao esquecimento:**
  personagem no `WorldMapPage` e so um placeholder geometrico (sem spritesheet/animacao de
  caminhada ainda - o Falves vai montar um kit inicial proprio, mesmo kit que cobre os itens da
  Loja tambem, ver abaixo); o botao central do `GlobalNav` ("volta pro mapa") tambem e placeholder
  (emoji, sem PNG pixel art proprio ainda); o HUD sobreposto no mapa (GemBadge/StreakIndicator) e o
  proprio `GlobalNav` vao ser refeitos em UI propria de pixel art (decisao do Falves, ainda nao
  desenhada); **Loja/Customizacao viraram "em breve"** (`ComingSoon`) ate esse kit inicial chegar -
  os itens sempre foram bloco de cor solida por raridade, placeholder desde a Fase 17; mecanismo
  de comprar/equipar continua intacto em `api/client.ts`, so as 2 telas pararam de exercitar;
  sem colisao contra predio no mapa (decisao explicita da fase - so as 5 trigger zones
  das portas bloqueiam/liberam algo); coordenadas das trigger zones/letreiros em `worldConfig.ts`
  sao uma estimativa calibrada visualmente (ver `docs/fase-25/`), nao uma medicao exaustiva -
  reajustar se alguma porta continuar "errada" na pratica. Posicao do personagem persistida
  (`lib/worldPosition.ts`) e so `localStorage` - por navegador/dispositivo, nao por conta (nao
  sincroniza entre aparelhos); vira campo de backend de verdade so se algum dia isso importar.
  Um usuario de QA descartavel (`qa-fase25@example.com`) ficou no banco local, criado so pra
  verificar `GlobalNav`/`/hoje`/fallback mobile com login real - sem endpoint de remocao de
  usuario pra limpar via API. **Fallback mobile cobre so `/start` sem params** - as outras telas
  (Loja/Perfil/Trilha/Ranking/Projeto/Squad/Hoje) nao passaram por auditoria de responsividade
  nesta fase, so o `GlobalNav` (que aparece em todas) ganhou o tratamento `md:`/hamburguer.
  `useIsMobile` e so largura de viewport (768px), sem checar touch/user-agent.
- O contrato da Api (rotas, DTOs, formato de erro) esta documentado na secao "Superficie da
  API" acima; o client tipado do frontend (`frontend/src/api/`) e o exemplo de referencia de
  como consumi-lo.
- **Resolvido na Fase 23, nao e mais pendencia:** Ligar Palavras virou um matcher visual de 2
  colunas de verdade (tap-to-connect, nao drag-and-drop - ver `WordMatchActivity.tsx` pro motivo),
  com reforma de contrato completa (1 `DailyActivity` = 1 grupo de pares, nao mais 1 termo por
  atividade). Ver "WordMatch: reforma completa do contrato na Fase 23" acima e
  `docs/fase-23/resumo-implementacao-fase-23.md`.
- **Resolvido na Fase 19, nao e mais pendencia:** Cloze e Roleplay (Dias 3/4 do seed) nao tinham
  sido exercitados ao vivo desde a Fase 9 (so Quiz e WordMatch) - verificados via Playwright com
  data ajustada por SQL (mesma tecnica das Fases 15-18), confirmando fidelidade visual dos 8 telas
  de sessao de ponta a ponta.
- **Resolvido na Fase 22, nao e mais pendencia:** "Sessao Expirada" (1 dos 4 designs do Figma da
  Fase 10) - interceptor global de 401 "nao_autenticado" + `SessionExpiredModal`, ver "Sessao
  expirada: interceptor global de 401 (Fase 22)" acima.
- **Resolvido na Fase 10 (retomada), nao e mais pendencia:** "Streak Perdido" (o outro dos 4
  designs do Figma da Fase 10) ganhou tela - `UserStreak.BrokenAt`, `streakJustBroken` no
  `GamificationSummaryDto`, `PUT .../streak/acknowledge-broken` e `StreakLostModal` disparado pelo
  `StartDashboard`. Ver `docs/fase-10/resumo-implementacao-fase-10.md`.
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
- **Resolvido na Fase 5, superado na Fase 38b:** a ambiguidade de `/api/today` quando 2+ Dailies
  compartilhavam a mesma `Date` (Daily normal + Daily de reforco geradas no mesmo dia) era
  resolvida priorizando a nao-reforco em `Weekly.GetDailyByDate`. Esse metodo foi removido na
  Fase 38b (resolucao de "hoje" deixou de comparar `Date` inteiramente - ver `DailySequencing`) -
  a ambiguidade nem chega a existir mais, ja que `FindNext` sempre filtra `!IsReinforcement`.
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
- **"Auditoria de Repositorios" (citada no prompt da Fase 11 como proxima fase) - decisao de
  escopo tomada em 2026-08-31: estatica (SAST)**, ler o codigo do repo sem executar nada, mesmo
  padrao sincrono do fluxo de avaliacao atual - dinamica (DAST, testar a app rodando de verdade)
  descartada por enquanto. **Atualizado na Fase 46**: o snapshot de codigo que a auditoria
  reaproveitaria deixou de vir do GitHub (`IGitHubService.GetContentSnapshotAsync`) e passou a vir
  do Forgejo interno (`IForgejoService.GetContentSnapshotAsync`, mesma forma) - `EvaluateWeeklyProjectUseCase`
  ja usa esse caminho novo. O gatilho tambem ficou mais concreto: o webhook de push do Forgejo
  (ainda nao construido) dispararia o mesmo pipeline a cada `git push` do aluno, nao so na
  submissao manual - ver "Forgejo interno" acima.
  **Lista de checks definida em 2026-08-31 (Fase 24c)** - escopo web (curriculo do curso, nao
  scanner generico de qualquer linguagem), cada um marcado com como seria detectado dado o modelo
  atual (determinístico/regex em C#, mais barato e sem alucinacao, vs. julgamento via LLM Groq
  igual `GroqProjectEvaluationService`, pra tudo que exige entender o codigo):
  1. **Segredo commitado** (regex) - chave de API/token, private key (`-----BEGIN...PRIVATE KEY-----`),
     AWS key (`AKIA[0-9A-Z]{16}`), connection string com senha em texto puro, `.env`/`secrets.json`
     presente na arvore. Severidade alta.
  2. **Dependencia desatualizada/vulneravel conhecida** (LLM, heuristico) - le `package.json`/
     `requirements.txt`/`*.csproj`/`go.mod` e aponta versoes que o modelo reconhece como antigas/com
     CVE conhecida da propria base de conhecimento - NAO e consulta a uma base de vulnerabilidades
     ao vivo (nao e OSV/Snyk), best-effort e limitado ao corte de treino do modelo, precisa ficar
     claro no texto do finding pro aluno nao confiar cegamente.
  3. **Header de seguranca ausente na configuracao do servidor** (LLM) - procura configuracao
     explicita (Express/helmet, middleware ASP.NET, nginx.conf) de `Content-Security-Policy`,
     `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options`. So sinaliza ausencia
     quando ha um servidor HTTP de verdade no repo (nao se aplica a script/CLI sem servidor).
  4. **Injecao de SQL** (LLM) - concatenacao/interpolacao de string direto numa query, em vez de
     parametrizacao/ORM.
  5. **XSS refletido/armazenado** (LLM) - saida de dado do usuario sem escape (`innerHTML`,
     `dangerouslySetInnerHTML`, `render_template_string`, eco direto de query param em HTML) sem
     sanitizacao visivel.
  6. **CORS permissivo** (LLM) - `Access-Control-Allow-Origin: *` combinado com
     `Access-Control-Allow-Credentials: true`, ou `cors()`/equivalente sem `origin` restrito.
  7. **Senha em texto puro / hash fraco** (LLM) - senha comparada/armazenada sem hash, ou hash
     MD5/SHA1 sem salt, em vez de bcrypt/argon2/scrypt.
  8. **Autenticacao/autorizacao ausente em rota sensivel** (LLM) - endpoint que mexe em dado de
     usuario (delete/update/admin) sem nenhuma checagem de sessao/token visivel no handler.

  Cada finding devolvido estruturado (arquivo, categoria, severidade alta/media/baixa, trecho,
  explicacao curta em portugues) - mesmo formato JSON-mode que `GroqProjectEvaluationService` ja
  usa pra nao inventar nota fora do formato esperado. **Ainda nao implementada** - esta lista fecha
  o unico bloqueio que faltava ("falta definir os checks"), pronta pra virar prompt tecnico de uma
  proxima fase.
- **Resolvido na Fase 13a:** todo endpoint de curso/weekly/daily/publicacao/conteudo curado agora
  tem `[Authorize]` e filtra pela Enrollment do usuario logado (ver "Superficie da API" e "Modelo
  de dominio" acima) - a excecao documentada e `/admin/conteudo`, que ainda depende de endpoints
  de autoria que nao foram adaptados pro lado Template (ver bullet acima).
- **Resolvido, nao e mais pendencia:** botao de logout na UI - `SettingsMenu.tsx` chama
  `POST /api/auth/logout`.
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
- **`GetCourseRankingUseCase.ResolveCurrentWeekly` ainda resolve a "Weekly atual" comparando
  `Daily.Date` com "hoje"** (ver "Ranking" acima) - a mesma fragilidade de fundo corrigida no
  atalho "/hoje" na Fase 38b (`Daily.Date` e fixado de uma vez na matricula e pode divergir do
  ritmo real do aluno). Nao corrigido nesta fase por estar num caso de uso separado, so
  descoberto na varredura da Fase 38b - o efeito pratico e mais brando aqui (afeta so o RECORTE
  do ranking - qual Weekly conta pro escopo `weekly`/`monthly` - nunca bloqueia acesso a
  conteudo), mas o mesmo `DailySequencing` desta fase resolveria isso tambem se/quando for
  revisitado.
