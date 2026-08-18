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
    bool HasWeeklyReinforcement);
