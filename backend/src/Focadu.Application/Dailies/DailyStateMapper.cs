using Focadu.Domain.Activities;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;

namespace Focadu.Application.Dailies;

/// <summary>
/// Traduz Daily (dominio) para DailyStateDto. Compartilhado por todo caso de uso que retorna o
/// estado de uma Daily (consulta, iniciar/retomar, concluir, atalho "hoje"), para nao duplicar o
/// mapeamento em varios lugares.
/// </summary>
internal static class DailyStateMapper
{
    public static DailyStateDto ToDto(Daily daily, DailyAccessMode accessMode)
    {
        var activities = daily.Activities
            .OrderBy(a => a.OrderIndex)
            .Select(ToActivityDto)
            .ToList();

        return new DailyStateDto(
            daily.Id, daily.WeeklyId, daily.DayNumber, daily.Date,
            daily.Status, daily.IsReinforcement, daily.PenaltyPoints, accessMode, activities);
    }

    private static DailyActivityDto ToActivityDto(DailyActivity activity)
    {
        var quizOptions = activity.QuizOptions
            .Select(o => new QuizOptionDto(o.Id, o.Text, o.IsCorrect))
            .ToList();

        var roleplayNodes = activity.RoleplayNodes
            .Select(n => new RoleplayNodeDto(
                n.Id, n.NodeKey, n.Text, n.IsTerminal, n.TerminalQuality,
                n.Options.Select(o => new RoleplayOptionDto(o.Id, o.Text, o.NextNodeId)).ToList()))
            .ToList();

        var responses = activity.Responses
            .OrderBy(r => r.AttemptNumber)
            .Select(r => new ActivityResponseDto(
                r.Id, r.ActivityId, r.AttemptNumber, r.Score, r.Passed, r.Transcript, r.AiFeedback, r.CreatedAt))
            .ToList();

        return new DailyActivityDto(
            activity.Id, activity.Type, activity.OrderIndex, activity.ContentId, activity.Status,
            activity.AnswerMode, activity.ExpectedAnswer, quizOptions, roleplayNodes, responses);
    }
}
