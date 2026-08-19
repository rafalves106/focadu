using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Activities;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso: usuario responde a uma DailyActivity. Registra a tentativa, e em seguida checa
/// (na ordem) se essa resposta faz a Daily disparar reforco diario e se a Weekly, por sua vez,
/// disparou reforco semanal - as duas regras centrais de EvaluationPolicy.
///
/// O Score nunca vem pronto do cliente para Quiz/WordMatch (ver ResolveScore) - so para
/// Cloze/Roleplay, que ainda dependem de IContentEvaluationService (sem adapter concreto ate
/// agora, so a porta existe).
/// </summary>
public class SubmitActivityResponseUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public SubmitActivityResponseUseCase(IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork, IClock clock)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<SubmitActivityResponseResult> ExecuteAsync(
        Guid dailyId,
        Guid activityId,
        int? score,
        Guid? selectedOptionId,
        string? transcript,
        string? aiFeedback,
        CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var daily = weekly.Dailies.First(d => d.Id == dailyId);
        var activity = daily.Activities.FirstOrDefault(a => a.Id == activityId)
            ?? throw new DomainException("Atividade não encontrada nesta Daily.", "atividade_nao_encontrada");

        var resolvedScore = ResolveScore(activity, score, selectedOptionId);
        var response = daily.SubmitActivityResponse(activityId, resolvedScore, transcript, aiFeedback);

        Guid? reinforcementDailyId = null;
        var dailyReinforcementTriggered = false;
        if (daily.ShouldTriggerDailyReinforcement())
        {
            var reinforcementDaily = weekly.CreateDailyReinforcement(daily.Id, _clock.Today());
            reinforcementDailyId = reinforcementDaily.Id;
            dailyReinforcementTriggered = true;
        }

        var weeklyReinforcementTriggered = false;
        if (weekly.ShouldTriggerWeeklyReinforcement())
        {
            weekly.TriggerWeeklyReinforcement();
            weeklyReinforcementTriggered = true;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var responseDto = new ActivityResponseDto(
            response.Id, response.ActivityId, response.AttemptNumber,
            response.Score, response.Passed, response.Transcript, response.AiFeedback, response.CreatedAt);

        return new SubmitActivityResponseResult(
            responseDto, dailyReinforcementTriggered, reinforcementDailyId, weeklyReinforcementTriggered);
    }

    /// <summary>
    /// Quiz/WordMatch: o Score e sempre calculado aqui a partir da opcao escolhida - o dominio ja
    /// tem QuizOption.IsCorrect como fonte da verdade, entao nao ha necessidade de IA nem de
    /// confiar num Score que o cliente poderia mandar pronto (100 pra qualquer atividade).
    /// Cloze/Roleplay: sem IContentEvaluationService implementado ainda, o Score continua vindo
    /// pronto do chamador - unico caminho legado que sobra depois desta mudanca.
    /// </summary>
    internal static int ResolveScore(DailyActivity activity, int? score, Guid? selectedOptionId)
    {
        if (activity.Type is ActivityType.Quiz or ActivityType.WordMatch)
        {
            if (selectedOptionId is null)
            {
                throw new ValidationException(
                    "selected_option_id_obrigatorio", "O campo 'selectedOptionId' e obrigatorio para esta atividade.");
            }

            var option = activity.QuizOptions.FirstOrDefault(o => o.Id == selectedOptionId);
            if (option is null)
            {
                throw new ValidationException(
                    "selected_option_id_invalido", "O 'selectedOptionId' informado nao corresponde a uma opcao desta atividade.");
            }

            return option.IsCorrect ? 100 : 0;
        }

        // Cloze/Roleplay: mesma validacao que a Api fazia antes desta mudanca.
        if (score is null)
            throw new ValidationException("score_obrigatorio", "O campo 'score' e obrigatorio para esta atividade.");
        if (score is < 0 or > 100)
            throw new ValidationException("score_invalido", "O campo 'score' precisa estar entre 0 e 100.");

        return score.Value;
    }
}
