using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.AiUsage;

/// <summary>
/// Configuracao global da medicao (Fase 94), uma linha so. MeasuringSince e quando a medicao foi ligada (o uso de
/// antes nao existe). O teto mensal e so informativo: "medir antes de limitar" - passar dele nao bloqueia nem troca
/// modelo de ninguem nesta fase.
/// </summary>
public class AiUsageSettings : Entity
{
    public static readonly Guid SingletonId = new("9a4b2c1d-0000-4000-8000-000000000094");

    public DateTime MeasuringSince { get; private set; }
    public decimal? MonthlyCapUsd { get; private set; }

    private AiUsageSettings() { }

    public static AiUsageSettings Start(DateTime now) => new() { Id = SingletonId, MeasuringSince = now };

    public void SetMonthlyCap(decimal? capUsd)
    {
        if (capUsd <= 0)
            throw new DomainException("O teto precisa ser maior que zero (ou vazio).", "teto_invalido");

        MonthlyCapUsd = capUsd;
    }
}
