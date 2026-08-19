using Focadu.Application.Ports;
using Focadu.Domain.Dailies;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Dailies;

/// <summary>
/// Passo comum a toda submissao de resposta, depois que o Score ja foi calculado - por qualquer
/// mecanismo (ResolveScore sincrono pros tipos com opcao/texto/roleplay, ou avaliacao de IA
/// assincrona pro VoiceSummary): grava a ActivityResponse, checa reforco diario/semanal, salva,
/// mapeia pro DTO de resultado. Compartilhado entre SubmitActivityResponseUseCase e
/// SubmitVoiceSummaryResponseUseCase pra nao duplicar essa logica (Fase 5).
/// </summary>
internal static class ActivityResponseRecorder
{
    public static async Task<SubmitActivityResponseResult> RecordAsync(
        Weekly weekly,
        Daily daily,
        Guid activityId,
        int score,
        string? transcript,
        string? justification,
        string? aiFeedback,
        IClock clock,
        IUnitOfWork unitOfWork,
        CancellationToken cancellationToken)
    {
        var response = daily.SubmitActivityResponse(activityId, score, transcript, justification, aiFeedback);

        Guid? reinforcementDailyId = null;
        var dailyReinforcementTriggered = false;
        if (daily.ShouldTriggerDailyReinforcement())
        {
            var reinforcementDaily = weekly.CreateDailyReinforcement(daily.Id, clock.Today());
            reinforcementDailyId = reinforcementDaily.Id;
            dailyReinforcementTriggered = true;
        }

        var weeklyReinforcementTriggered = false;
        if (weekly.ShouldTriggerWeeklyReinforcement())
        {
            weekly.TriggerWeeklyReinforcement();
            weeklyReinforcementTriggered = true;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        var responseDto = new ActivityResponseDto(
            response.Id, response.ActivityId, response.AttemptNumber, response.Score, response.Passed,
            response.Transcript, response.Justification, response.AiFeedback, response.CreatedAt);

        return new SubmitActivityResponseResult(
            responseDto, dailyReinforcementTriggered, reinforcementDailyId, weeklyReinforcementTriggered);
    }
}
