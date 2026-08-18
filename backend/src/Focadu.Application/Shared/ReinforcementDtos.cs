namespace Focadu.Application.Shared;

/// <summary>Uma Daily de reforco (IsReinforcement = true) dentro do curso/semana, para telas de historico.</summary>
public record DailyReinforcementSummaryDto(
    Guid DailyId,
    Guid WeeklyId,
    int DayNumber,
    DateOnly Date,
    int ActivityCount);

/// <summary>Um WeeklyReinforcement disparado (2+ dias fracos na mesma Weekly), para telas de historico.</summary>
public record WeeklyReinforcementSummaryDto(
    Guid Id,
    Guid WeeklyId,
    DateTime TriggeredAt,
    IReadOnlyCollection<Guid> WeakDailyIds);
