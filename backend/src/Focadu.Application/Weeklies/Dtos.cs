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
    IReadOnlyCollection<WeeklyReinforcementSummaryDto> Reinforcements);

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
    string? SubmissionUrl);
