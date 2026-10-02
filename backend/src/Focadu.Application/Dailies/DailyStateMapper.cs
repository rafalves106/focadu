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
            accessMode, activities, CodeRepositoryUrl: daily.CodeRepositoryUrl, Lab: ToLabDto(daily.Template.Lab));
    }

    private static LabConfigDto? ToLabDto(LabConfig? lab) =>
        lab is null
            ? null
            : new LabConfigDto(lab.Runtime, lab.Image, lab.FileContentIds, lab.Packages, lab.Services, lab.Entry, lab.Command, lab.TimeoutSeconds, lab.Setup ?? [], lab.User);

    private static DailyActivityDto ToActivityDto(Daily daily, DailyActivity activity)
    {
        var responses = daily.Responses
            .Where(r => r.ActivityId == activity.Id)
            .OrderBy(r => r.AttemptNumber)
            .Select(r => new ActivityResponseDto(
                r.Id, r.ActivityId, r.AttemptNumber, r.Score, r.Passed,
                r.Transcript, r.CorrectedTranscript, r.Justification, r.AiFeedback, r.CreatedAt,
                r.CorrectAnswer, r.ImprovementPoints))
            .ToList();

        // Gabarito (IsCorrect / ExpectedAnswer / TerminalQuality) só é revelado depois que o
        // usuário já tentou responder ao menos uma vez - antes disso, esses campos saem nulos,
        // para não dar pra ver a resposta certa direto no corpo da resposta HTTP antes de jogar.
        var hasAnswered = responses.Count > 0;

        var quizOptions = activity.QuizOptions
            .Select(o => new QuizOptionDto(o.Id, o.Text, hasAnswered ? o.IsCorrect : null))
            .ToList();

        // WordMatch (Fase 23): termos e definicoes vao em 2 listas separadas, nao aninhadas -
        // manda-las juntas (mesmo objeto/mesma posicao) entregaria a correspondencia so de olhar
        // o JSON, sem nem jogar (ver WordMatchPair). Definicoes embaralhadas a cada carga
        // (Guid.NewGuid() como chave de ordenacao) pra posicao tambem nao vazar a resposta.
        var wordMatchTerms = activity.WordMatchPairs
            .Select(p => new WordMatchTermDto(p.Id, p.Term, hasAnswered ? p.DefinitionId : null))
            .ToList();
        var wordMatchDefinitions = activity.WordMatchPairs
            .Select(p => new WordMatchDefinitionDto(p.DefinitionId, p.Definition))
            .OrderBy(_ => Guid.NewGuid())
            .ToList();

        var roleplayNodes = activity.RoleplayNodes
            .Select(n => new RoleplayNodeDto(
                n.Id, n.NodeKey, n.Text, n.IsTerminal, hasAnswered ? n.TerminalQuality : null,
                n.Options.Select(o => new RoleplayOptionDto(o.Id, o.Text, o.NextNodeId)).ToList()))
            .ToList();

        // Fase 79: passo de codigo so fica Completed quando acaba (passou ou gastou as tentativas) -
        // uma tentativa "ajuste isto" nao conclui o passo, e a sessao volta pra ele ao recarregar.
        CodeStepDto? codeStep = null;
        var completed = hasAnswered;
        if (activity.Type == ActivityType.CodeStep)
        {
            var done = daily.IsCodeStepDone(activity.Id);
            completed = done;
            var usesLab = daily.Template.StepUsesLab(activity);
            var hints = usesLab
                ? daily.Hints
                    .Where(h => h.ActivityId == activity.Id)
                    .OrderBy(h => h.Number)
                    .Select(h => new CodeStepHintDto(h.Number, h.Right, h.Wrong, h.Improve, h.CreatedAt))
                    .ToList()
                : null;
            codeStep = new CodeStepDto(
                daily.PriorCode(activity.Id), done, CodeStepProgress.MaxAttempts,
                done ? activity.CodeSolution : null, done ? activity.CodeExpectedOutput : null,
                usesLab, usesLab ? activity.CodeStarter : null, usesLab ? CodeStepProgress.MaxHints : 0, hints);
        }

        return new DailyActivityDto(
            activity.Id, activity.Type, activity.OrderIndex, activity.ContentId,
            completed ? ActivityStatus.Completed : ActivityStatus.Pending,
            activity.AnswerMode, activity.Prompt, hasAnswered ? activity.ExpectedAnswer : null,
            quizOptions, wordMatchTerms, wordMatchDefinitions, roleplayNodes, responses, codeStep,
            Missions: activity.Type == ActivityType.TerminalMission
                ? activity.TerminalMissionList
                    .Select(m => new TerminalMissionDto(
                        m.Title, m.Prompt, m.Hints, m.Note, new TerminalMissionCheckDto(m.Check.Command, m.Check.Output, m.Check.Probe, m.Check.State),
                        m.Situation, m.Goal, m.Steps))
                    .ToList()
                : null,
            Commands: activity.Type == ActivityType.TerminalMission
                ? activity.TerminalCommandList.Select(c => new TerminalCommandDto(c.Command, c.Description)).ToList()
                : null,
            Hint: activity.Hint,
            IsFinalQuestion: activity.IsFinalQuestion,
            Topics: activity.IsFinalQuestion ? activity.Topics : null,
            Target: activity.Target);
    }
}
