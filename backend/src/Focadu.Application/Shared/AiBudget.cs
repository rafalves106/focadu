using Focadu.Application.Admin;
using Focadu.Application.Ports;
using Focadu.Domain.AiUsage;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Shared;

/// <inheritdoc cref="IAiBudget"/>
public class AiBudget : IAiBudget
{
    private readonly IAiUsageRepository _usage;
    private readonly IClock _clock;

    public AiBudget(IAiUsageRepository usage, IClock clock)
    {
        _usage = usage;
        _clock = clock;
    }

    public async Task EnsureDailyBudgetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var settings = await _usage.GetSettingsAsync(cancellationToken);
        if (settings?.DailyBudgetUsd is not { } budget) return;

        var (from, to) = AiUsageMath.DayRange(_clock.Today());
        var records = await _usage.ListRecordsByUserAsync(userId, from, to, cancellationToken);
        if (records.Count == 0) return;

        var spent = AiUsageMath.Totals(records, await _usage.ListPricesAsync(cancellationToken)).EstimatedCostUsd;
        if (IsExhausted(spent, budget))
        {
            throw new DomainException(
                "Você chegou ao limite de IA de hoje. Seu progresso está salvo — volte amanhã para continuar.",
                "orcamento_ia_esgotado");
        }
    }

    public async Task<AiCapStatus> GetMonthlyStatusAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _usage.GetSettingsAsync(cancellationToken);
        var prices = await _usage.ListPricesAsync(cancellationToken);
        var (_, from, to) = AiUsageMath.Range("mes", _clock.Today());
        var cost = AiUsageMath.Totals(await _usage.ListRecordsAsync(from, to, null, cancellationToken), prices).EstimatedCostUsd;

        return CapStatus(settings, prices, cost);
    }

    /// <summary>Gasto de hoje chegou ao orcamento (igual ja conta como esgotado).</summary>
    internal static bool IsExhausted(decimal spentUsd, decimal budgetUsd) => spentUsd >= budgetUsd;

    internal static AiCapStatus CapStatus(AiUsageSettings? settings, IReadOnlyList<AiModelPrice> prices, decimal monthCostUsd)
    {
        // Modelo reserva sem preco na tabela custaria "zero" na conta e o gasto sumiria da medicao: so troca se tiver preco.
        var fallback = settings?.FallbackModel is { } m && prices.Any(p => p.Model == m) ? m : null;
        var cap = settings?.MonthlyCapUsd;
        return new AiCapStatus(cap is { } c && monthCostUsd >= c, fallback, monthCostUsd, cap);
    }
}
