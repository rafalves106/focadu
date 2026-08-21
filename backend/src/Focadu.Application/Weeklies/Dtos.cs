using Focadu.Application.Shared;
using Focadu.Domain.Enums;

namespace Focadu.Application.Weeklies;

public record WeeklyDetailDto(
    Guid Id,
    Guid MonthlyId,
    int Number,
    string Title,
    string? Theme,
    IReadOnlyCollection<DailyOverviewDto> Dailies,
    IReadOnlyCollection<CuratedContentDto> CuratedContents,
    WeeklyProjectDto? Project,
    IReadOnlyCollection<WeeklyReinforcementSummaryDto> Reinforcements,
    /// <summary>Fase 11: true quando o modulo esta completo mas ainda falta uma publicacao Validated - o frontend usa isso pro banner/bloqueio, sem precisar de uma 2a chamada a /publication/status so pra saber "precisa ou nao".</summary>
    bool RequiresPublicationToUnlock,
    /// <summary>Fase 15: true quando existe um WeeklyReinforcement (2+ dias fracos) ainda nao totalmente atendido - ver Weekly.HasPendingWeeklyReinforcement. So indicador, nunca bloqueia nada.</summary>
    bool HasPendingWeeklyReinforcement);

/// <summary>Desempenho de um dia dentro da semana: quantas atividades tem, quantas ja foram feitas, quantas passaram.</summary>
public record DailyOverviewDto(
    Guid Id,
    int DayNumber,
    DateOnly Date,
    DailyStatus Status,
    bool IsReinforcement,
    int PenaltyPoints,
    bool IsWeakDay,
    int TotalActivities,
    int CompletedActivities,
    int PassedActivities);

public record WeeklyProjectDto(
    Guid Id,
    string SpecText,
    WeeklyProjectStatus Status,
    string? SubmissionUrl,
    /// <summary>Fase 16: nota (0-100) da avaliacao, preenchida junto com Status=Evaluated. Nulo ate entao.</summary>
    int? Score,
    string? Feedback);
