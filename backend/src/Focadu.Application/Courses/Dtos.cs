using Focadu.Application.Shared;
using Focadu.Domain.Enums;

namespace Focadu.Application.Courses;

public record CourseSummaryDto(
    Guid Id,
    string Name,
    CourseStatus Status,
    int MonthlyCount);

public record CourseDetailDto(
    Guid Id,
    string Name,
    CourseStatus Status,
    CourseProgressDto Progress,
    IReadOnlyCollection<MonthlyOverviewDto> Monthlies,
    IReadOnlyCollection<DailyReinforcementSummaryDto> DailyReinforcements,
    IReadOnlyCollection<WeeklyReinforcementSummaryDto> WeeklyReinforcements);

/// <summary>"Conclusao" do curso: quantas Dailies existem, quantas ja foram concluidas, quantas sao de reforco.</summary>
public record CourseProgressDto(
    int TotalDailies,
    int CompletedDailies,
    int ReinforcementDailies,
    double CompletionPercentage);

public record MonthlyOverviewDto(
    Guid Id,
    int Number,
    string Title,
    IReadOnlyCollection<WeeklyOverviewDto> Weeklies);

public record WeeklyOverviewDto(
    Guid Id,
    int Number,
    string Title,
    string? Theme,
    int TotalDailies,
    int CompletedDailies,
    int WeakDailies,
    bool HasWeeklyReinforcement,
    /// <summary>Fase 8: pra grids de navegacao (Detalhes do Curso) mostrarem status por dia sem precisar buscar WeeklyDetailDto de cada semana.</summary>
    IReadOnlyCollection<DailyStatusSummaryDto> Days,
    /// <summary>Fase 11: true quando ESTA Weekly esta com o modulo completo mas sem publicacao Validated - o proximo Weekly (Number+1) fica bloqueado por causa disso, ver StartOrResumeDailyUseCase.</summary>
    bool RequiresPublicationToUnlock);

/// <summary>Resumo enxuto de uma Daily pra grids de navegacao (Fase 8) - versao mais leve de DailyOverviewDto (WeeklyDetailDto), sem PenaltyPoints/PassedActivities que essas telas nao usam.</summary>
public record DailyStatusSummaryDto(
    Guid Id,
    int DayNumber,
    DateOnly Date,
    DailyStatus Status,
    bool IsReinforcement,
    int TotalActivities,
    int CompletedActivities);
