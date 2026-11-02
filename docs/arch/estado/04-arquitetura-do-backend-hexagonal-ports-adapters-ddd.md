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
                                       "sintetico" pra reforco diario, ver secao propria). Fase 69:
                                       Language? (variante por linguagem do dia - a ponte)
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
                                       SubmitPublicationUseCase (Fase 106: o fluxo GitHub
                                       saiu), PublicationDtos.cs (Fase 11) -
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