using System.Globalization;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Feedback;

/// <summary>
/// Relatorio de clareza de um curso a partir do feedback dos alunos (plano de curadoria, secao 14). Os limites para
/// "reabrir" um curso sao PROVISORIOS, calibrados com dados do uso real: clareza media da semana abaixo de 4; 3 dias
/// seguidos com "travei" no mesmo tipo de bloco; 2 feedbacks ruins no mesmo dia. Dia reaberto volta a ficha (D1).
/// </summary>
public static class FeedbackReport
{
    public const double WeekClarityMin = 4.0;
    public const int ConsecutiveStuckDays = 3;
    public const int BadClarityMax = 2;
    public const int BadFeedbacksPerDay = 2;

    public static FeedbackReportResult Build(IReadOnlyList<DayFeedbackRow> rows)
    {
        var days = rows
            .GroupBy(r => (r.WeekNumber, r.DayNumber))
            .OrderBy(g => g.Key.WeekNumber).ThenBy(g => g.Key.DayNumber)
            .Select(g => new DayLine(
                g.Key.WeekNumber, g.Key.DayNumber, g.Count(), Math.Round(g.Average(r => r.Clarity), 1),
                g.Count(r => r.Clarity <= BadClarityMax),
                g.Where(r => r.StuckActivityType is not null).GroupBy(r => r.StuckActivityType!.Value)
                    .ToDictionary(t => t.Key, t => t.Count())))
            .ToList();

        var flags = new List<string>();
        foreach (var week in days.GroupBy(d => d.WeekNumber))
        {
            var all = rows.Where(r => r.WeekNumber == week.Key).ToList();
            var average = all.Average(r => r.Clarity);
            if (average < WeekClarityMin)
                flags.Add($"Semana {week.Key}: clareza media {average.ToString("0.0", CultureInfo.InvariantCulture)} (limite {WeekClarityMin.ToString("0.0", CultureInfo.InvariantCulture)}) - volta a ficha da semana.");

            foreach (var type in Enum.GetValues<ActivityType>())
            {
                var stuckDays = week.Where(d => d.StuckByType.ContainsKey(type)).Select(d => d.DayNumber).OrderBy(n => n).ToList();
                var run = LongestConsecutiveRun(stuckDays);
                if (run.Length >= ConsecutiveStuckDays)
                    flags.Add($"Semana {week.Key}: {run.Length} dias seguidos (dias {run.Start} a {run.Start + run.Length - 1}) com travas em {type} - volta a ficha dos dias.");
            }
        }

        foreach (var day in days.Where(d => d.BadCount >= BadFeedbacksPerDay))
            flags.Add($"Semana {day.WeekNumber}, dia {day.DayNumber}: {day.BadCount} feedbacks ruins (clareza ate {BadClarityMax}) - volta a ficha do dia.");

        return new FeedbackReportResult(days, flags);
    }

    private static (int Start, int Length) LongestConsecutiveRun(IReadOnlyList<int> sortedDays)
    {
        (int Start, int Length) best = (0, 0);
        var start = 0;
        var length = 0;
        for (var i = 0; i < sortedDays.Count; i++)
        {
            if (i > 0 && sortedDays[i] == sortedDays[i - 1] + 1) length++;
            else { start = sortedDays[i]; length = 1; }
            if (length > best.Length) best = (start, length);
        }
        return best;
    }
}

public record DayLine(int WeekNumber, int DayNumber, int Count, double AverageClarity, int BadCount, IReadOnlyDictionary<ActivityType, int> StuckByType);

public record FeedbackReportResult(IReadOnlyList<DayLine> Days, IReadOnlyList<string> ReopenFlags);

/// <summary>Caso de uso do relatorio de clareza de um curso (CLI `feedback &lt;curso&gt;`).</summary>
public class GetFeedbackReportUseCase
{
    private readonly ICourseRepository _courseRepository;
    private readonly IDayFeedbackRepository _feedbackRepository;

    public GetFeedbackReportUseCase(ICourseRepository courseRepository, IDayFeedbackRepository feedbackRepository)
    {
        _courseRepository = courseRepository;
        _feedbackRepository = feedbackRepository;
    }

    public async Task<FeedbackReportResult?> ExecuteAsync(string courseName, CancellationToken cancellationToken = default)
    {
        var course = (await _courseRepository.GetAllAsync(cancellationToken)).FirstOrDefault(c => c.Name == courseName);
        return course is null ? null : FeedbackReport.Build(await _feedbackRepository.ListByCourseAsync(course.Id, cancellationToken));
    }
}
