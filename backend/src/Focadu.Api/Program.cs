using Focadu.Api.Contracts;
using Focadu.Api.ErrorHandling;
using Focadu.Application;
using Focadu.Application.Content;
using Focadu.Application.Courses;
using Focadu.Application.Dailies;
using Focadu.Application.Exceptions;
using Focadu.Application.Seed;
using Focadu.Application.Weeklies;
using Focadu.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("Focadu")
    ?? throw new InvalidOperationException("Connection string 'Focadu' nao configurada (appsettings.json ou variavel de ambiente ConnectionStrings__Focadu).");

builder.Services.AddFocaduApplication();
builder.Services.AddFocaduInfrastructure(connectionString);

builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();

// CORS para o frontend Vite (Passo 3) - porta diferente da Api conta como origem diferente, o
// navegador bloqueia sem isso mesmo os dois rodando em localhost. So dev por enquanto (unico
// usuario-teste, sem deploy ainda) - ver docs/ARQUITETURA.md se isso precisar virar configuravel.
const string FrontendDevCorsPolicy = "FrontendDev";
builder.Services.AddCors(options => options.AddPolicy(FrontendDevCorsPolicy, policy => policy
    .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

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

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

var api = app.MapGroup("/api");

// --- Cursos --------------------------------------------------------------------------------

api.MapGet("/courses", async (ListCoursesUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(ct)))
    .WithName("ListCourses");

api.MapGet("/courses/{courseId}", async (string courseId, GetCourseDetailUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(courseId, "courseId");
        return Results.Ok(await useCase.ExecuteAsync(id, ct));
    })
    .WithName("GetCourseDetail");

// --- Semanas ---------------------------------------------------------------------------------

api.MapGet("/weeklies/{weeklyId}", async (string weeklyId, GetWeeklyDetailUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
        return Results.Ok(await useCase.ExecuteAsync(id, ct));
    })
    .WithName("GetWeeklyDetail");

// --- Conteudo curado (autoria) ---------------------------------------------------------------
// Unico tipo de conteudo com endpoint de criacao/edicao ate agora - Course/Monthly/Weekly/Daily/
// DailyActivity continuam so via seed (estrutura muda raramente; conteudo curado muda toda
// semana, ver docs/ARQUITETURA.md). WeeklyId/Type/Title sao exigidos aqui (formato de request,
// nao depende de nenhum dado de dominio); "Type invalido" e "falta ExternalUrl/BodyText" moram
// no caso de uso, que e quem sabe validar contra o enum e as regras de CuratedContent.

api.MapPost("/curated-content", async (CreateCuratedContentRequest? request, CreateCuratedContentUseCase useCase, CancellationToken ct) =>
    {
        if (request?.WeeklyId is null)
            throw new ValidationException("weekly_id_obrigatorio", "O campo 'weeklyId' e obrigatorio.");
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("titulo_obrigatorio", "O campo 'title' e obrigatorio.");

        var result = await useCase.ExecuteAsync(
            request.WeeklyId.Value, request.Type, request.Title, request.ExternalUrl, request.BodyText, ct);
        return Results.Created($"/api/curated-content/{result.Id}", result);
    })
    .WithName("CreateCuratedContent");

api.MapPut("/curated-content/{id}", async (string id, UpdateCuratedContentRequest? request, UpdateCuratedContentUseCase useCase, CancellationToken ct) =>
    {
        var contentId = RouteParsing.RequireGuid(id, "id");
        if (string.IsNullOrWhiteSpace(request?.Title))
            throw new ValidationException("titulo_obrigatorio", "O campo 'title' e obrigatorio.");

        var result = await useCase.ExecuteAsync(contentId, request.Title, request.ExternalUrl, request.BodyText, ct);
        return Results.Ok(result);
    })
    .WithName("UpdateCuratedContent");

// --- Dailies -------------------------------------------------------------------------------

api.MapGet("/dailies/{dailyId}", async (string dailyId, GetDailyStateUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(dailyId, "dailyId");
        return Results.Ok(await useCase.ExecuteAsync(id, ct));
    })
    .WithName("GetDailyState");

// Atalho "/hoje": resolve a Daily de hoje sem o cliente precisar informar course/weekly/daily.
api.MapGet("/today", async (GetTodayUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(ct)))
    .WithName("GetToday");

api.MapPost("/dailies/{dailyId}/start", async (string dailyId, StartOrResumeDailyUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(dailyId, "dailyId");
        return Results.Ok(await useCase.ExecuteAsync(id, ct));
    })
    .WithName("StartOrResumeDaily");

// Qual campo e obrigatorio/valido depende do tipo (e, pro Cloze, do AnswerMode) da atividade -
// essa decisao mora dentro do caso de uso, que e quem enxerga o ActivityType/AnswerMode
// (ver SubmitActivityResponseUseCase.ResolveScore). O Score nunca vem do cliente.
api.MapPost("/dailies/{dailyId}/activities/{activityId}/responses",
        async (string dailyId, string activityId, SubmitActivityResponseRequest? request, SubmitActivityResponseUseCase useCase, CancellationToken ct) =>
        {
            var dId = RouteParsing.RequireGuid(dailyId, "dailyId");
            var aId = RouteParsing.RequireGuid(activityId, "activityId");

            var result = await useCase.ExecuteAsync(
                dId, aId, request?.SelectedOptionId, request?.SelectedRoleplayNodeId,
                request?.Transcript, request?.Justification, request?.AiFeedback, ct);
            return Results.Created($"/api/dailies/{dailyId}/activities/{activityId}/responses/{result.Response.Id}", result);
        })
    .WithName("SubmitActivityResponse");

api.MapPost("/dailies/{dailyId}/complete", async (string dailyId, CompleteDailyUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(dailyId, "dailyId");
        return Results.Ok(await useCase.ExecuteAsync(id, ct));
    })
    .WithName("CompleteDaily");

app.Run();

// Necessario para o WebApplicationFactory de testes de integracao (fora de escopo neste passo,
// mas deixamos a classe Program acessivel para quando esses testes forem adicionados).
public partial class Program
{
}
