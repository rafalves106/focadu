using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.AiUsage;

/// <summary>
/// Configuracao global da medicao (Fase 94), uma linha so. MeasuringSince e quando a medicao foi ligada (o uso de
/// antes nao existe). Desde a Fase 101 os limites valem: <see cref="DailyBudgetUsd"/> e quanto cada aluno pode gastar de
/// IA por dia (estimado, uso medido x tabela de precos) e <see cref="MonthlyCapUsd"/> e o teto do gasto de todos no
/// mes - ao passar dele as chamadas de texto trocam para <see cref="FallbackModel"/> (mais barato) em vez de parar.
/// </summary>
public class AiUsageSettings : Entity
{
    public static readonly Guid SingletonId = new("9a4b2c1d-0000-4000-8000-000000000094");

    public DateTime MeasuringSince { get; private set; }
    public decimal? MonthlyCapUsd { get; private set; }

    /// <summary>Fase 101: gasto diario maximo por aluno, em US$ (estimado). Nulo = sem limite. O dia e o dia vivido no Brasil (IClock).</summary>
    public decimal? DailyBudgetUsd { get; private set; }

    /// <summary>Fase 101: modelo de texto mais barato usado quando o teto mensal e atingido. Nulo = nao troca. Precisa ter linha na tabela de precos.</summary>
    public string? FallbackModel { get; private set; }

    private AiUsageSettings() { }

    public static AiUsageSettings Start(DateTime now) => new() { Id = SingletonId, MeasuringSince = now };

    public void SetMonthlyCap(decimal? capUsd)
    {
        if (capUsd <= 0)
            throw new DomainException("O teto precisa ser maior que zero (ou vazio).", "teto_invalido");

        MonthlyCapUsd = capUsd;
    }

    public void SetDailyBudget(decimal? budgetUsd)
    {
        if (budgetUsd <= 0)
            throw new DomainException("O limite diario precisa ser maior que zero (ou vazio, sem limite).", "limite_invalido");

        DailyBudgetUsd = budgetUsd;
    }

    public void SetFallbackModel(string? model)
    {
        FallbackModel = string.IsNullOrWhiteSpace(model) ? null : model.Trim();
    }
}
