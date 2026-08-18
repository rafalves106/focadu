using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Policies;

namespace Focadu.Domain.Weeklies;

/// <summary>
/// Registro de que uma Weekly precisa de um dia extra de revisao antes de avancar para a
/// proxima Weekly, disparado ao acumular WeeklyWeakDaysThreshold "dias fracos".
/// </summary>
public class WeeklyReinforcement : Entity
{
    public Guid WeeklyId { get; private set; }
    public DateTime TriggeredAt { get; private set; }

    private readonly List<WeakDailyLink> _weakDailyLinks = new();

    /// <summary>Ids das Dailies fracas que dispararam este reforco semanal.</summary>
    public IReadOnlyCollection<Guid> WeakDailyIds => _weakDailyLinks.Select(l => l.DailyId).ToList().AsReadOnly();

    private WeeklyReinforcement()
    {
    }

    internal WeeklyReinforcement(Guid weeklyId, IEnumerable<Guid> weakDailyIds)
    {
        var ids = weakDailyIds.ToList();
        if (ids.Count < EvaluationPolicy.WeeklyWeakDaysThreshold)
        {
            throw new DomainException(
                $"WeeklyReinforcement exige ao menos {EvaluationPolicy.WeeklyWeakDaysThreshold} dias fracos.");
        }

        WeeklyId = weeklyId;
        TriggeredAt = DateTime.UtcNow;
        _weakDailyLinks.AddRange(ids.Select(id => new WeakDailyLink(id)));
    }
}

/// <summary>
/// Elo tecnico entre um WeeklyReinforcement e uma Daily fraca. Existe so para permitir que a
/// Infrastructure mapeie WeakDailyIds como uma tabela associativa de verdade (com FK real para
/// Daily), em vez de uma coluna jsonb/array sem integridade referencial. Nao faz parte da API
/// publica do dominio: de fora deste assembly, so se enxerga WeeklyReinforcement.WeakDailyIds,
/// que e um IReadOnlyCollection de Guid.
/// </summary>
internal class WeakDailyLink
{
    public Guid DailyId { get; private set; }

    private WeakDailyLink()
    {
    }

    internal WeakDailyLink(Guid dailyId)
    {
        DailyId = dailyId;
    }
}
