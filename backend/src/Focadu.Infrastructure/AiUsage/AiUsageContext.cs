using Focadu.Application.Ports;

namespace Focadu.Infrastructure.AiUsage;

/// <summary>
/// Contexto da chamada de IA em AsyncLocal (Fase 94): o handler HTTP do Groq roda no mesmo fluxo async do caso de uso,
/// entao enxerga o que o caso de uso abriu, sem depender de HttpContext (vale tambem fora de requisicao).
/// </summary>
public sealed class AiUsageContext : IAiUsageContext
{
    private static readonly AsyncLocal<AiUsageScope?> CurrentScope = new();

    public static AiUsageScope? Current => CurrentScope.Value;

    public IDisposable Begin(Guid userId, Guid? dailyId = null, Guid? weeklyId = null)
    {
        var previous = CurrentScope.Value;
        CurrentScope.Value = new AiUsageScope(userId, dailyId, weeklyId);
        return new Restore(previous);
    }

    private sealed class Restore(AiUsageScope? previous) : IDisposable
    {
        public void Dispose() => CurrentScope.Value = previous;
    }
}

public sealed record AiUsageScope(Guid UserId, Guid? DailyId, Guid? WeeklyId);
