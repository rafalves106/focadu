using Focadu.Domain.AiUsage;

namespace Focadu.Application.Admin;

// Fase 94, Medicao de IA (Painel de gestao, aba Uso de IA). Todo custo e estimado: uso medido x tabela de precos atual.

public record AiUsageTotalsDto(
    decimal EstimatedCostUsd, decimal? CostPerActiveStudentUsd, double AudioMinutes,
    long InputTokens, long OutputTokens, int Calls, int FailedCalls, int ActiveStudents);

/// <param name="CallType">Nome do AiCallType ("Transcription", "ContentEvaluation"...) - texto, nao o numero do enum.</param>
public record AiUsageByTypeDto(string CallType, decimal CostUsd, double SharePercent, int Calls);

public record AiModelPriceDto(
    string Model, decimal? InputPerMillionUsd, decimal? OutputPerMillionUsd, decimal? AudioPerHourUsd,
    DateTime UpdatedAt, string UpdatedBy, string? Source)
{
    public static AiModelPriceDto From(AiModelPrice p) =>
        new(p.Model, p.InputPerMillionUsd, p.OutputPerMillionUsd, p.AudioPerHourUsd, p.UpdatedAt, p.UpdatedBy, p.Source);
}

public record AiMonthlyCapDto(decimal? CapUsd, decimal MonthCostUsd);

public record AiUsageOverviewDto(
    string Period, DateTime FromUtc, DateTime ToUtc, DateTime MeasuringSince, Guid? CourseId,
    AiUsageTotalsDto Totals, IReadOnlyList<AiUsageByTypeDto> ByType, AiMonthlyCapDto MonthlyCap,
    IReadOnlyList<AiModelPriceDto> Prices, IReadOnlyList<string> UnpricedModels);

public record AiUsageStudentRowDto(
    Guid UserId, string DisplayName, string Email, IReadOnlyList<string> Courses,
    decimal CostUsd, int Calls, double AudioMinutes, long Tokens, DateTime? LastCallAt);

public record AiUsageStudentsDto(string Period, DateTime FromUtc, DateTime ToUtc, decimal TotalCostUsd, IReadOnlyList<AiUsageStudentRowDto> Students);

public record AiCostByDayDto(int Day, decimal CostUsd, decimal? CourseAverageUsd);

public record AiUsageStudentCourseDto(Guid CourseId, string CourseName, decimal TotalCostUsd, IReadOnlyList<AiCostByDayDto> Days);

public record AiUsageStudentDetailDto(
    Guid UserId, string DisplayName, string Email, AiUsageTotalsDto Totals, IReadOnlyList<AiUsageByTypeDto> ByType,
    IReadOnlyList<AiUsageStudentCourseDto> Courses);
