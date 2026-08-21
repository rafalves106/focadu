using Focadu.Domain.Activities;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Policies;

namespace Focadu.Application.Dailies;

/// <summary>
/// Traduz Daily (dominio) para DailyStateDto. Compartilhado por todo caso de uso que retorna o
/// estado de uma Daily (consulta, iniciar/retomar, concluir, atalho "hoje"), para nao duplicar o
/// mapeamento em varios lugares.
///
/// Fase 13: `Responses`/`Status` de uma atividade nao vem mais de `DailyActivity` (curriculo,
/// compartilhado) - `Daily.Responses` (instancia) e a fonte da verdade agora; "hasAnswered" e
/// "Status" sao derivados filtrando por ActivityId, nao lidos de um campo armazenado.
/// </summary>
internal static class DailyStateMapper
{
    public static DailyStateDto ToDto(Daily daily, DailyAccessMode accessMode)
    {
        var activities = daily.Activities
            .OrderBy(a => a.OrderIndex)
            .Select(a => ToActivityDto(daily, a))
            .ToList();

        return new DailyStateDto(
            daily.Id, daily.WeeklyId, daily.DayNumber, daily.Date,
            daily.Status, daily.IsReinforcement, daily.PenaltyPoints, EvaluationPolicy.DailyPenaltyThreshold,
            accessMode, activities);
    }

    private static DailyActivityDto ToActivityDto(Daily daily, DailyActivity activity)
    {
        var responses = daily.Responses
            .Where(r => r.ActivityId == activity.Id)
            .OrderBy(r => r.AttemptNumber)
            .Select(r => new ActivityResponseDto(
                r.Id, r.ActivityId, r.AttemptNumber, r.Score, r.Passed,
                r.Transcript, r.Justification, r.AiFeedback, r.CreatedAt))
            .ToList();

        // Gabarito (IsCorrect / ExpectedAnswer / TerminalQuality) só é revelado depois que o
        // usuário já tentou responder ao menos uma vez - antes disso, esses campos saem nulos,
        // para não dar pra ver a resposta certa direto no corpo da resposta HTTP antes de jogar.
        var hasAnswered = responses.Count > 0;

        var quizOptions = activity.QuizOptions
            .Select(o => new QuizOptionDto(o.Id, o.Text, hasAnswered ? o.IsCorrect : null))
            .ToList();

        var roleplayNodes = activity.RoleplayNodes
            .Select(n => new RoleplayNodeDto(
                n.Id, n.NodeKey, n.Text, n.IsTerminal, hasAnswered ? n.TerminalQuality : null,
                n.Options.Select(o => new RoleplayOptionDto(o.Id, o.Text, o.NextNodeId)).ToList()))
            .ToList();

        return new DailyActivityDto(
            activity.Id, activity.Type, activity.OrderIndex, activity.ContentId,
            hasAnswered ? ActivityStatus.Completed : ActivityStatus.Pending,
            activity.AnswerMode, activity.Prompt, hasAnswered ? activity.ExpectedAnswer : null,
            quizOptions, roleplayNodes, responses);
    }
}
