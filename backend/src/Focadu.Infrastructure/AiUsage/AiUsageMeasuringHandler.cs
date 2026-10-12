using System.Text.Json;
using Focadu.Domain.AiUsage;
using Focadu.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Focadu.Infrastructure.AiUsage;

/// <summary>
/// Mede cada chamada HTTP ao Groq (Fase 94, Medicao de IA) sem mexer nos adapters: le o modelo do corpo enviado e o
/// uso devolvido pela Groq ("usage" do chat completion; "duration" da transcricao em verbose_json) e grava um
/// AiUsageRecord num escopo proprio de DbContext, separado da unidade de trabalho do caso de uso. Medir nunca pode
/// quebrar o fluxo do aluno: qualquer falha da medicao vira so um aviso no log. Cada tentativa (retry) conta, porque
/// cada uma e cobrada.
/// </summary>
public sealed class AiUsageMeasuringHandler : DelegatingHandler
{
    private readonly AiCallType _callType;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AiUsageMeasuringHandler> _logger;

    public AiUsageMeasuringHandler(AiCallType callType, IServiceScopeFactory scopeFactory, ILogger<AiUsageMeasuringHandler> logger)
    {
        _callType = callType;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var model = await ReadModelAsync(request, cancellationToken);
        var scope = AiUsageContext.Current;

        HttpResponseMessage response;
        try
        {
            response = await base.SendAsync(request, cancellationToken);
        }
        catch
        {
            await RecordAsync(model, scope, new Usage(0, 0, 0), succeeded: false);
            throw;
        }

        var usage = new Usage(0, 0, 0);
        if (response.IsSuccessStatusCode && response.Content is not null)
        {
            try
            {
                await response.Content.LoadIntoBufferAsync(cancellationToken);
                usage = ParseUsage(await response.Content.ReadAsStringAsync(cancellationToken));
            }
            catch (Exception ex) when (ex is JsonException or InvalidOperationException)
            {
                _logger.LogWarning(ex, "Medicao de IA: nao deu pra ler o uso da resposta ({CallType}).", _callType);
            }
        }

        await RecordAsync(model, scope, usage, response.IsSuccessStatusCode);
        return response;
    }

    private async Task RecordAsync(string model, AiUsageScope? scope, Usage usage, bool succeeded)
    {
        try
        {
            using var serviceScope = _scopeFactory.CreateScope();
            var db = serviceScope.ServiceProvider.GetRequiredService<FocaduDbContext>();

            Guid? courseId = null;
            int? courseDay = null;
            if (scope?.DailyId is { } dailyId)
            {
                var where = await (
                    from d in db.Dailies.AsNoTracking()
                    join w in db.Weeklies on d.WeeklyId equals w.Id
                    join e in db.Enrollments on w.EnrollmentId equals e.Id
                    where d.Id == dailyId
                    select new { e.CourseId, d.DayNumber }).FirstOrDefaultAsync();
                courseId = where?.CourseId;
                courseDay = where?.DayNumber;
            }
            else if (scope?.WeeklyId is { } weeklyId)
            {
                courseId = await (
                    from w in db.Weeklies.AsNoTracking()
                    join e in db.Enrollments on w.EnrollmentId equals e.Id
                    where w.Id == weeklyId
                    select (Guid?)e.CourseId).FirstOrDefaultAsync();
            }

            db.AiUsageRecords.Add(AiUsageRecord.Create(
                DateTime.UtcNow, _callType, model, scope?.UserId, courseId, courseDay,
                usage.InputTokens, usage.OutputTokens, usage.AudioSeconds, succeeded));
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Medicao de IA: nao deu pra gravar a chamada ({CallType}, {Model}).", _callType, model);
        }
    }

    /// <summary>Modelo pedido: campo "model" do JSON (chat) ou parte "model" do multipart (transcricao).</summary>
    private static async Task<string> ReadModelAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        try
        {
            switch (request.Content)
            {
                case MultipartFormDataContent multipart:
                    foreach (var part in multipart)
                        if (part.Headers.ContentDisposition?.Name?.Trim('"') == "model")
                            return (await part.ReadAsStringAsync(cancellationToken)).Trim();
                    break;
                case { } content when content.Headers.ContentType?.MediaType == "application/json":
                    using (var doc = JsonDocument.Parse(await content.ReadAsStringAsync(cancellationToken)))
                        if (doc.RootElement.TryGetProperty("model", out var m) && m.ValueKind == JsonValueKind.String)
                            return m.GetString()!;
                    break;
            }
        }
        catch (JsonException)
        {
        }

        return "desconhecido";
    }

    internal static Usage ParseUsage(string body)
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        if (root.ValueKind != JsonValueKind.Object)
            return new Usage(0, 0, 0);

        var input = 0;
        var output = 0;
        if (root.TryGetProperty("usage", out var usage) && usage.ValueKind == JsonValueKind.Object)
        {
            if (usage.TryGetProperty("prompt_tokens", out var p) && p.TryGetInt32(out var pv)) input = pv;
            if (usage.TryGetProperty("completion_tokens", out var c) && c.TryGetInt32(out var cv)) output = cv;
        }

        var seconds = root.TryGetProperty("duration", out var d) && d.TryGetDouble(out var dv) ? dv : 0;
        return new Usage(input, output, seconds);
    }

    internal readonly record struct Usage(int InputTokens, int OutputTokens, double AudioSeconds);
}
