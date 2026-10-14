using Focadu.Application.Ports;
using Microsoft.Extensions.DependencyInjection;

namespace Focadu.Infrastructure.AiUsage;

/// <summary>
/// Contexto da chamada de IA em AsyncLocal (Fase 94): o handler HTTP do Groq roda no mesmo fluxo async do caso de uso,
/// entao enxerga o que o caso de uso abriu, sem depender de HttpContext (vale tambem fora de requisicao).
/// </summary>
public sealed class AiUsageContext : IAiUsageContext
{
    private static readonly AsyncLocal<AiUsageScope?> CurrentScope = new();

    private readonly IServiceScopeFactory _scopeFactory;

    public AiUsageContext(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async Task EnsureBudgetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Escopo proprio: o contexto e Singleton e o orcamento le o banco (DbContext e scoped).
        using var scope = _scopeFactory.CreateScope();
        await scope.ServiceProvider.GetRequiredService<IAiBudget>().EnsureDailyBudgetAsync(userId, cancellationToken);
    }

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
