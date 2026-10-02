using Focadu.Application.Exceptions;
using Focadu.Domain.Activities;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Aquecimento do dia (plano de curadoria, 02/10/2026): 2 perguntas de dias anteriores, para recuperar o que ja foi
/// estudado antes de um conteudo novo (espacamento). Sob demanda: nao e atividade do dia, nao entra no Score nem na
/// ordem, e nada e gravado - a tela (passo C) decide como mostrar. As perguntas saem de Quiz e Cloze que o aluno ja
/// respondeu, entao o gabarito delas ja foi revelado antes.
///
/// Regra de escolha (<see cref="WarmupSelector"/>): as de menor nota primeiro (o que o aluno errou volta antes), depois as
/// mais antigas; cada dia de origem entra uma vez antes de repetir. Na ponte (dia 6) so contam os dias da mesma semana;
/// nos outros dias, qualquer dia anterior da matricula.
/// </summary>
public class GetWarmupUseCase
{
    public const int QuestionCount = 2;

    private readonly IWeeklyRepository _weeklyRepository;

    public GetWarmupUseCase(IWeeklyRepository weeklyRepository)
    {
        _weeklyRepository = weeklyRepository;
    }

    public async Task<IReadOnlyList<WarmupQuestionDto>> ExecuteAsync(Guid userId, Guid dailyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, userId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");
        var current = weekly.Dailies.First(d => d.Id == dailyId);

        var weeklies = current.Template.IsBridge
            ? [weekly]
            : (await _weeklyRepository.GetByEnrollmentIdAsync(weekly.EnrollmentId, cancellationToken)).ToList();

        var candidates = new List<WarmupCandidate>();
        foreach (var week in weeklies)
        {
            foreach (var daily in week.Dailies.Where(d => d.Id != current.Id && !d.IsReinforcement && IsBefore(week.Number, d.DayNumber, weekly.Number, current.DayNumber)))
            {
                foreach (var activity in daily.Activities.Where(a => a.Type is ActivityType.Quiz or ActivityType.Cloze))
                {
                    var last = daily.Responses.Where(r => r.ActivityId == activity.Id).OrderByDescending(r => r.AttemptNumber).FirstOrDefault();
                    if (last is null) continue;
                    candidates.Add(new WarmupCandidate(daily.Id, activity, week.Number, daily.DayNumber, last.Score));
                }
            }
        }

        return WarmupSelector.Select(candidates, QuestionCount).Select(ToDto).ToList();
    }

    private static bool IsBefore(int week, int day, int currentWeek, int currentDay) =>
        week < currentWeek || (week == currentWeek && day < currentDay);

    private static WarmupQuestionDto ToDto(WarmupCandidate c) =>
        new(c.Activity.Id, c.DailyId, c.WeekNumber, c.DayNumber, c.Activity.Type, c.Activity.AnswerMode, c.Activity.Prompt,
            c.Activity.ExpectedAnswer,
            c.Activity.QuizOptions.Select(o => new QuizOptionDto(o.Id, o.Text, o.IsCorrect)).ToList(), c.LastScore);
}

/// <summary>Uma pergunta que o aluno ja respondeu em um dia anterior e pode voltar no aquecimento.</summary>
public record WarmupCandidate(Guid DailyId, DailyActivity Activity, int WeekNumber, int DayNumber, int LastScore);

public record WarmupQuestionDto(
    Guid ActivityId, Guid SourceDailyId, int WeekNumber, int DayNumber, ActivityType Type, AnswerMode AnswerMode,
    string? Prompt, string? ExpectedAnswer, IReadOnlyCollection<QuizOptionDto> QuizOptions, int LastScore);

/// <summary>Escolha pura das perguntas do aquecimento, separada para teste.</summary>
public static class WarmupSelector
{
    public static IReadOnlyList<WarmupCandidate> Select(IEnumerable<WarmupCandidate> candidates, int count)
    {
        var ordered = candidates
            .OrderBy(c => c.LastScore).ThenBy(c => c.WeekNumber).ThenBy(c => c.DayNumber).ThenBy(c => c.Activity.OrderIndex)
            .ToList();

        var picked = new List<WarmupCandidate>();
        foreach (var candidate in ordered)
        {
            if (picked.Count == count) break;
            if (picked.All(p => p.DailyId != candidate.DailyId)) picked.Add(candidate);
        }
        foreach (var candidate in ordered)
        {
            if (picked.Count == count) break;
            if (!picked.Contains(candidate)) picked.Add(candidate);
        }
        return picked;
    }
}
