using Focadu.Api.Contracts;
using Focadu.Api.ErrorHandling;
using Focadu.Application;
using Focadu.Application.Courses;
using Focadu.Application.Dailies;
using Focadu.Application.Exceptions;
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

var app = builder.Build();

// Middleware de erro primeiro: qualquer excecao lancada por qualquer endpoint abaixo (validacao,
// regra de dominio, recurso nao encontrado) passa por ApiExceptionHandler e vira o mesmo formato
// { error, message } com o status HTTP adequado.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

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

api.MapPost("/dailies/{dailyId}/activities/{activityId}/responses",
        async (string dailyId, string activityId, SubmitActivityResponseRequest? request, SubmitActivityResponseUseCase useCase, CancellationToken ct) =>
        {
            var dId = RouteParsing.RequireGuid(dailyId, "dailyId");
            var aId = RouteParsing.RequireGuid(activityId, "activityId");

            if (request?.Score is null)
                throw new ValidationException("score_obrigatorio", "O campo 'score' e obrigatorio.");
            if (request.Score is < 0 or > 100)
                throw new ValidationException("score_invalido", "O campo 'score' precisa estar entre 0 e 100.");

            var result = await useCase.ExecuteAsync(dId, aId, request.Score.Value, request.Transcript, request.AiFeedback, ct);
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
