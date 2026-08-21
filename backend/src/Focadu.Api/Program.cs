using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Focadu.Api.Contracts;
using Focadu.Api.ErrorHandling;
using Focadu.Application;
using Focadu.Application.Content;
using Focadu.Application.Courses;
using Focadu.Application.Dailies;
using Focadu.Application.Enrollments;
using Focadu.Application.Exceptions;
using Focadu.Application.Gamification;
using Focadu.Application.Ranking;
using Focadu.Application.Seed;
using Focadu.Application.Users;
using Focadu.Application.Weeklies;
using Focadu.Domain.Enums;
using Focadu.Infrastructure;
using Focadu.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("Focadu")
    ?? throw new InvalidOperationException("Connection string 'Focadu' nao configurada (appsettings.json ou variavel de ambiente ConnectionStrings__Focadu).");

// Groq (Fase 5): diferente da connection string, uma chave ausente nao impede o app de subir -
// so a transcricao/avaliacao de VoiceSummary falham (com erro claro) quando de fato chamadas sem
// ela configurada. Configuravel via appsettings/user-secrets ("Groq:ApiKey") ou env var
// Groq__ApiKey - nunca hardcoded nem commitada (ver docs/ARQUITETURA.md).
var groqApiKey = builder.Configuration["Groq:ApiKey"] ?? string.Empty;

// GitHub (Fase 11): mesma decisao do Groq acima - token/username ausentes nao impedem o app de
// subir, so as chamadas de GitHubService falham (com erro claro) quando de fato invocadas sem
// eles configurados. "GitHub:Token" precisa de escopo de escrita (repo), nao so leitura - ver
// docs/ARQUITETURA.md.
var gitHubOptions = new GitHubOptions(
    builder.Configuration["GitHub:Token"] ?? string.Empty,
    builder.Configuration["GitHub:Username"] ?? string.Empty);

// Jwt:SecretKey (Fase 12): ao contrario de Groq/GitHub acima, esta e exigida no boot - a partir
// desta fase, autenticacao e fundacao (nao uma integracao opcional), e sem a chave literalmente
// nenhum login/registro/sessao funcionaria. Mesmo tratamento que a connection string (falha cedo,
// com mensagem clara, em vez de um erro criptico na primeira tentativa de gerar um token).
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"];
if (string.IsNullOrWhiteSpace(jwtSecretKey))
    throw new InvalidOperationException("Jwt:SecretKey nao configurada (user-secrets ou variavel de ambiente Jwt__SecretKey) - necessaria pra autenticacao funcionar, ver docs/ARQUITETURA.md.");

var jwtOptions = new JwtOptions(jwtSecretKey);
const string AuthCookieName = "focadu_auth";

builder.Services.AddFocaduApplication();
builder.Services.AddFocaduInfrastructure(connectionString, groqApiKey, gitHubOptions, jwtOptions);

builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();

// CORS para o frontend Vite (Passo 3) - porta diferente da Api conta como origem diferente, o
// navegador bloqueia sem isso mesmo os dois rodando em localhost. So dev por enquanto (unico
// usuario-teste, sem deploy ainda) - ver docs/ARQUITETURA.md se isso precisar virar configuravel.
// AllowCredentials (Fase 12, pro cookie de sessao ir junto nas requisicoes) exige origem explicita
// - nao pode conviver com AllowAnyOrigin por especificacao do CORS; ja usavamos WithOrigins.
const string FrontendDevCorsPolicy = "FrontendDev";
builder.Services.AddCors(options => options.AddPolicy(FrontendDevCorsPolicy, policy => policy
    .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
    .AllowCredentials()
    .AllowAnyHeader()
    .AllowAnyMethod()));

// Sessao via JWT em cookie httpOnly (Fase 12) - nunca acessivel via JS (mais seguro contra XSS que
// localStorage). O token nunca chega via header Authorization; OnMessageReceived le direto do
// cookie que os endpoints de login/registro setam (ver SetAuthCookie abaixo).
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Sem isso, o handler re-mapeia claims curtas ("sub") pra URIs longas de ClaimTypes.* por
        // baixo dos panos (comportamento legado do JwtSecurityTokenHandler) - mantem exatamente os
        // nomes de claim usados em JwtTokenService.GenerateToken ("sub", "email").
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
            ClockSkew = TimeSpan.Zero,
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies[AuthCookieName];
                return Task.CompletedTask;
            },
            // Sem isso, um 401 (sem cookie / token expirado) viria vazio - ApiExceptionHandler so
            // cobre excecoes lancadas dentro do endpoint; o challenge de autenticacao acontece
            // antes disso, no middleware, entao precisa do proprio envelope {error,message} aqui.
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new ErrorResponse("nao_autenticado", "Sessao invalida ou expirada."));
            },
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// Cookie de sessao (Fase 12): Secure=true exige HTTPS - desligado so em dev local (http://localhost),
// senao o navegador nunca gravaria o cookie. SameSite=Lax basta pro cenario atual (front e back em
// portas diferentes do mesmo host, sem cross-site de verdade).
void SetAuthCookie(HttpContext context, string token) =>
    context.Response.Cookies.Append(AuthCookieName, token, new CookieOptions
    {
        HttpOnly = true,
        Secure = !app.Environment.IsDevelopment(),
        SameSite = SameSiteMode.Lax,
        Expires = DateTimeOffset.UtcNow.AddDays(7),
        Path = "/",
    });

void ClearAuthCookie(HttpContext context) =>
    context.Response.Cookies.Append(AuthCookieName, string.Empty, new CookieOptions
    {
        HttpOnly = true,
        Secure = !app.Environment.IsDevelopment(),
        SameSite = SameSiteMode.Lax,
        Expires = DateTimeOffset.UnixEpoch,
        Path = "/",
    });

// Fase 13: todo endpoint protegido extrai o userId assim - claim "sub" do JWT, ja validado pelo
// middleware JwtBearer antes do endpoint rodar (nunca decodificado de novo aqui).
Guid CurrentUserId(ClaimsPrincipal principal) => Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

// Fase 16: scope ausente/vazio vira "course" (recorte mais completo) - so string invalida vira erro.
RankingScope ParseRankingScope(string? scope)
{
    if (string.IsNullOrWhiteSpace(scope)) return RankingScope.Course;
    if (!Enum.TryParse<RankingScope>(scope, ignoreCase: true, out var parsed) || !Enum.IsDefined(parsed))
        throw new ValidationException("scope_invalido", "O parametro 'scope' precisa ser 'weekly', 'monthly' ou 'course'.");

    return parsed;
}

// `dotnet run --project src/Focadu.Api -- seed`: popula o curso piloto "Web Security" e encerra,
// sem subir o servidor HTTP. Nao e um endpoint porque a Api ainda nao tem autoria de conteudo.
if (args.Contains("seed"))
{
    using var scope = app.Services.CreateScope();
    var seeder = scope.ServiceProvider.GetRequiredService<SeedWebSecurityCourseUseCase>();
    var result = await seeder.ExecuteAsync();

    Console.WriteLine(result.AlreadyExisted
        ? "Seed: curso 'Web Security' ja existe - nada foi inserido."
        : $"Seed: curso 'Web Security' criado com sucesso (CourseId={result.CourseId}).");

    return;
}

// Middleware de erro primeiro: qualquer excecao lancada por qualquer endpoint abaixo (validacao,
// regra de dominio, recurso nao encontrado) passa por ApiExceptionHandler e vira o mesmo formato
// { error, message } com o status HTTP adequado.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors(FrontendDevCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

var api = app.MapGroup("/api");

// --- Autenticacao (Fase 12) ------------------------------------------------------------------
// Fundacao de sessao - registro/login/logout/me. Endpoints de curso/weekly/daily abaixo
// continuam abertos por enquanto (sem [Authorize]/RequireAuthorization) - isso e trabalho da
// Fase 13, quando passarem a filtrar por usuario matriculado.

api.MapPost("/auth/register", async (HttpContext http, RegisterRequest? request, RegisterUserUseCase useCase, CancellationToken ct) =>
    {
        var result = await useCase.ExecuteAsync(
            request?.Email ?? string.Empty, request?.Password ?? string.Empty, request?.DisplayName ?? string.Empty, ct);
        SetAuthCookie(http, result.Token);
        return Results.Created("/api/auth/me", result.User);
    })
    .WithName("Register");

api.MapPost("/auth/login", async (HttpContext http, LoginRequest? request, LoginUserUseCase useCase, CancellationToken ct) =>
    {
        var result = await useCase.ExecuteAsync(request?.Email ?? string.Empty, request?.Password ?? string.Empty, ct);
        SetAuthCookie(http, result.Token);
        return Results.Ok(result.User);
    })
    .WithName("Login");

api.MapPost("/auth/logout", (HttpContext http) =>
    {
        ClearAuthCookie(http);
        return Results.Ok();
    })
    .WithName("Logout");

api.MapGet("/auth/me", async (ClaimsPrincipal principal, GetCurrentUserUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetCurrentUser");

// PUT (nao POST): idempotente - concluir a Entrevista de Perfil de novo so substitui a lista de
// interesses inteira, nunca acumula (ver User.CompleteProfile).
api.MapPut("/users/me/profile", async (ClaimsPrincipal principal, CompleteProfileRequest? request, CompleteProfileUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), request?.Interests ?? [], request?.AdditionalNotes, ct)))
    .RequireAuthorization()
    .WithName("CompleteProfile");

// Gems/Streak (Fase 14) - UserGemBalance/UserStreak sao lazy (so existem apos a 1a conclusao que
// gera Gems/streak), entao um usuario que nunca completou nada devolve o estado zerado normalmente
// (200, nunca 404 - nao ter gamificado ainda nao e um erro).
api.MapGet("/users/me/gamification", async (ClaimsPrincipal principal, GetGamificationSummaryUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetGamificationSummary");

// --- Matricula (Fase 13) ---------------------------------------------------------------------

api.MapGet("/courses/available", async (ClaimsPrincipal principal, GetAvailableCoursesUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetAvailableCourses");

api.MapPost("/enrollments", async (ClaimsPrincipal principal, CreateEnrollmentRequest? request, EnrollUserInCourseUseCase useCase, CancellationToken ct) =>
    {
        if (request?.CourseId is null)
            throw new ValidationException("course_id_obrigatorio", "O campo 'courseId' e obrigatorio.");

        var result = await useCase.ExecuteAsync(CurrentUserId(principal), request.CourseId.Value, ct);
        return Results.Created("/api/enrollments/me", result);
    })
    .RequireAuthorization()
    .WithName("CreateEnrollment");

api.MapGet("/enrollments/me", async (ClaimsPrincipal principal, GetMyEnrollmentsUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetMyEnrollments");

// --- Cursos --------------------------------------------------------------------------------

api.MapGet("/courses", async (ListCoursesUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(ct)))
    .RequireAuthorization()
    .WithName("ListCourses");

api.MapGet("/courses/{courseId}", async (ClaimsPrincipal principal, string courseId, GetCourseDetailUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(courseId, "courseId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("GetCourseDetail");

// Curriculo (Course -> Monthly -> WeeklyTemplate), sem exigir matricula (Fase 13b) - so
// `/admin/conteudo` usa isso, pra navegar ate uma WeeklyTemplate sem depender de Enrollment como
// GetCourseDetail acima exige (ver docs/fase-13a, "Pendencia conhecida").
api.MapGet("/courses/{courseId}/curriculum", async (string courseId, GetCourseCurriculumUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(courseId, "courseId");
        return Results.Ok(await useCase.ExecuteAsync(id, ct));
    })
    .RequireAuthorization()
    .WithName("GetCourseCurriculum");

// Ranking (Fase 16) - scope opcional na query string, default "course" (o recorte mais seguro/
// completo - snowball desde o inicio). Guid|nome invalido em "scope" vira 400 padronizado, mesmo
// tratamento de CreateCuratedContentUseCase.ParseType (Enum.TryParse + IsDefined).
api.MapGet("/courses/{courseId}/ranking", async (ClaimsPrincipal principal, string courseId, string? scope, GetCourseRankingUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(courseId, "courseId");
        var rankingScope = ParseRankingScope(scope);
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, rankingScope, ct));
    })
    .RequireAuthorization()
    .WithName("GetCourseRanking");

// --- Semanas ---------------------------------------------------------------------------------

api.MapGet("/weeklies/{weeklyId}", async (ClaimsPrincipal principal, string weeklyId, GetWeeklyDetailUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("GetWeeklyDetail");

// WeeklyTemplate (curriculo), sem exigir matricula (Fase 13b) - mesma motivacao do curriculum
// acima, so pra `/admin/conteudo` listar/curar CuratedContent de uma semana.
api.MapGet("/weekly-templates/{id}", async (string id, GetWeeklyTemplateDetailUseCase useCase, CancellationToken ct) =>
    {
        var templateId = RouteParsing.RequireGuid(id, "id");
        return Results.Ok(await useCase.ExecuteAsync(templateId, ct));
    })
    .RequireAuthorization()
    .WithName("GetWeeklyTemplateDetail");

// Submissao do projeto pratico da semana (Fase 7) - WeeklyProject.Submit ja existia no dominio
// desde a Fase 1, so faltava endpoint. SubmissionUrl e a unica entrada do cliente; Status muda
// pra Submitted dentro do proprio dominio (WeeklyProject.Submit).
api.MapPost("/weeklies/{weeklyId}/project/submit", async (ClaimsPrincipal principal, string weeklyId, SubmitWeeklyProjectRequest? request, SubmitWeeklyProjectUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
        if (string.IsNullOrWhiteSpace(request?.SubmissionUrl))
            throw new ValidationException("submission_url_obrigatoria", "O campo 'submissionUrl' e obrigatorio.");

        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, request.SubmissionUrl, ct));
    })
    .RequireAuthorization()
    .WithName("SubmitWeeklyProject");

// Avaliacao do projeto (Fase 11) - WeeklyProject.Evaluate() existia no dominio desde a Fase 1 sem
// endpoint (gap documentado na Fase 7); precisou ganhar um porque Weekly.IsModuleComplete() exige
// Project Evaluated. Sem tela propria - ver EvaluateWeeklyProjectUseCase. PUT (nao POST, Fase 16):
// o corpo agora carrega o estado final da avaliacao (Score+Feedback), nao so uma acao vazia.
api.MapPut("/weeklies/{weeklyId}/project/evaluate", async (ClaimsPrincipal principal, string weeklyId, EvaluateWeeklyProjectRequest? request, EvaluateWeeklyProjectUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
        if (request?.Score is not { } score)
            throw new ValidationException("score_obrigatorio", "O campo 'score' e obrigatorio.");

        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, score, request.Feedback, ct));
    })
    .RequireAuthorization()
    .WithName("EvaluateWeeklyProject");

// --- Publicacao publica do modulo (Fase 11) -------------------------------------------------
// Prova de aprendizado exigida ao completar uma Weekly (Documento Mestre, Secao 2.3) - LinkedIn
// (rascunho por IA + URL colada manualmente) ou GitHub (commit automatico via GitHubService, ja
// validado no proprio commit). /submit cobre tanto a primeira submissao quanto "tentar de novo"
// (resubmete a mesma URL/platform).

api.MapGet("/weeklies/{weeklyId}/publication/status", async (ClaimsPrincipal principal, string weeklyId, GetPublicationStatusUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("GetPublicationStatus");

api.MapPost("/weeklies/{weeklyId}/publication/draft", async (ClaimsPrincipal principal, string weeklyId, GenerateLinkedInDraftUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("GenerateLinkedInDraft");

api.MapPost("/weeklies/{weeklyId}/publication/github-commit",
        async (ClaimsPrincipal principal, string weeklyId, GitHubCommitRequest? request, CommitModuleSummaryUseCase useCase, CancellationToken ct) =>
        {
            var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
            if (string.IsNullOrWhiteSpace(request?.RepoName))
                throw new ValidationException("repo_name_obrigatorio", "O campo 'repoName' e obrigatorio.");

            return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, request.RepoName, request.IsNewRepo, ct));
        })
    .RequireAuthorization()
    .WithName("CommitModuleSummary");

api.MapPost("/weeklies/{weeklyId}/publication/submit",
        async (ClaimsPrincipal principal, string weeklyId, SubmitPublicationRequest? request, SubmitPublicationUseCase useCase, CancellationToken ct) =>
        {
            var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
            if (string.IsNullOrWhiteSpace(request?.Url))
                throw new ValidationException("url_obrigatoria", "O campo 'url' e obrigatorio.");
            if (!Enum.TryParse<PublicationPlatform>(request.Platform, ignoreCase: true, out var platform) || !Enum.IsDefined(platform))
                throw new ValidationException("platform_invalida", "O campo 'platform' precisa ser LinkedIn ou GitHub.");

            return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, platform, request.Url, ct));
        })
    .RequireAuthorization()
    .WithName("SubmitPublication");

api.MapGet("/github/repositories", async (GetGitHubRepositoriesUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(ct)))
    .RequireAuthorization()
    .WithName("GetGitHubRepositories");

// --- Conteudo curado (autoria) ---------------------------------------------------------------
// Unico tipo de conteudo com endpoint de criacao/edicao ate agora - Course/Monthly/WeeklyTemplate/
// DailyTemplate/DailyActivity continuam so via seed (estrutura muda raramente; conteudo curado
// muda toda semana, ver docs/ARQUITETURA.md). WeeklyTemplateId/Type/Title sao exigidos aqui
// (formato de request, nao depende de nenhum dado de dominio); "Type invalido" e "falta
// ExternalUrl/BodyText" moram no caso de uso, que e quem sabe validar contra o enum e as regras
// de CuratedContent. Exige login (RequireAuthorization) mas nao filtra por usuario - curriculo e
// compartilhado, nao ha papel de "admin" separado neste app de usuario unico ainda.

api.MapGet("/curated-content/{id}", async (string id, GetCuratedContentUseCase useCase, CancellationToken ct) =>
    {
        var contentId = RouteParsing.RequireGuid(id, "id");
        return Results.Ok(await useCase.ExecuteAsync(contentId, ct));
    })
    .RequireAuthorization()
    .WithName("GetCuratedContent");

api.MapPost("/curated-content", async (CreateCuratedContentRequest? request, CreateCuratedContentUseCase useCase, CancellationToken ct) =>
    {
        if (request?.WeeklyTemplateId is null)
            throw new ValidationException("weekly_template_id_obrigatorio", "O campo 'weeklyTemplateId' e obrigatorio.");
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("titulo_obrigatorio", "O campo 'title' e obrigatorio.");

        var result = await useCase.ExecuteAsync(
            request.WeeklyTemplateId.Value, request.Type, request.Title, request.ExternalUrl, request.BodyText, ct);
        return Results.Created($"/api/curated-content/{result.Id}", result);
    })
    .RequireAuthorization()
    .WithName("CreateCuratedContent");

api.MapPut("/curated-content/{id}", async (string id, UpdateCuratedContentRequest? request, UpdateCuratedContentUseCase useCase, CancellationToken ct) =>
    {
        var contentId = RouteParsing.RequireGuid(id, "id");
        if (string.IsNullOrWhiteSpace(request?.Title))
            throw new ValidationException("titulo_obrigatorio", "O campo 'title' e obrigatorio.");

        var result = await useCase.ExecuteAsync(contentId, request.Title, request.ExternalUrl, request.BodyText, ct);
        return Results.Ok(result);
    })
    .RequireAuthorization()
    .WithName("UpdateCuratedContent");

// --- Dailies -------------------------------------------------------------------------------

api.MapGet("/dailies/{dailyId}", async (ClaimsPrincipal principal, string dailyId, GetDailyStateUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(dailyId, "dailyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("GetDailyState");

// Atalho "/hoje": resolve a Daily de hoje pra Enrollment do usuario logado (Fase 13 - nao mais
// "1 Course Active" global, ver GetTodayUseCase).
api.MapGet("/today", async (ClaimsPrincipal principal, GetTodayUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetToday");

api.MapPost("/dailies/{dailyId}/start", async (ClaimsPrincipal principal, string dailyId, StartOrResumeDailyUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(dailyId, "dailyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("StartOrResumeDaily");

// Qual campo e obrigatorio/valido depende do tipo (e, pro Cloze, do AnswerMode) da atividade -
// essa decisao mora dentro do caso de uso, que e quem enxerga o ActivityType/AnswerMode
// (ver SubmitActivityResponseUseCase.ResolveScore). O Score nunca vem do cliente.
api.MapPost("/dailies/{dailyId}/activities/{activityId}/responses",
        async (ClaimsPrincipal principal, string dailyId, string activityId, SubmitActivityResponseRequest? request, SubmitActivityResponseUseCase useCase, CancellationToken ct) =>
        {
            var dId = RouteParsing.RequireGuid(dailyId, "dailyId");
            var aId = RouteParsing.RequireGuid(activityId, "activityId");

            var result = await useCase.ExecuteAsync(
                CurrentUserId(principal), dId, aId, request?.SelectedOptionId, request?.SelectedRoleplayNodeId,
                request?.Transcript, request?.Justification, request?.AiFeedback, ct);
            return Results.Created($"/api/dailies/{dailyId}/activities/{activityId}/responses/{result.Response.Id}", result);
        })
    .RequireAuthorization()
    .WithName("SubmitActivityResponse");

// Endpoint separado do texto (POST .../responses) porque o corpo aqui e binario (multipart/
// form-data), nao JSON. Fluxo: transcreve (Groq Whisper) -> avalia contra o CuratedContent de
// referencia (Groq chat completion) -> Score/Passed vem da avaliacao, nunca do cliente.
api.MapPost("/dailies/{dailyId}/activities/{activityId}/responses/audio",
        async (ClaimsPrincipal principal, string dailyId, string activityId, IFormFile? audio, SubmitVoiceSummaryResponseUseCase useCase, CancellationToken ct) =>
        {
            var dId = RouteParsing.RequireGuid(dailyId, "dailyId");
            var aId = RouteParsing.RequireGuid(activityId, "activityId");

            if (audio is null)
                throw new ValidationException("audio_obrigatorio", "O arquivo de audio e obrigatorio.");

            await using var stream = audio.OpenReadStream();
            var result = await useCase.ExecuteAsync(CurrentUserId(principal), dId, aId, stream, audio.Length, ct);
            return Results.Created($"/api/dailies/{dailyId}/activities/{activityId}/responses/{result.Response.Id}", result);
        })
    .RequireAuthorization()
    .WithName("SubmitVoiceSummaryResponse")
    .DisableAntiforgery();

api.MapPost("/dailies/{dailyId}/complete", async (ClaimsPrincipal principal, string dailyId, CompleteDailyUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(dailyId, "dailyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("CompleteDaily");

app.Run();

// Necessario para o WebApplicationFactory de testes de integracao (fora de escopo neste passo,
// mas deixamos a classe Program acessivel para quando esses testes forem adicionados).
public partial class Program
{
}
