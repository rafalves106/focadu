using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso: usuario responde a uma DailyActivity. Registra a tentativa, e em seguida checa
/// (na ordem) se essa resposta faz a Daily disparar reforco diario e se a Weekly, por sua vez,
/// disparou reforco semanal - as duas regras centrais de EvaluationPolicy.
///
/// Nota de escopo (Fase 2): o Score ainda e informado diretamente pelo chamador. A avaliacao real
/// via IContentEvaluationService (IA) continua fora de escopo - so a interface existe, sem
/// adapter concreto. Isso deixa a porta aberta para, numa fase futura, computar o Score aqui
/// dentro em vez de recebe-lo pronto.
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
        int score,
        string? transcript,
        string? aiFeedback,
        CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var daily = weekly.Dailies.First(d => d.Id == dailyId);
        var response = daily.SubmitActivityResponse(activityId, score, transcript, aiFeedback);

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
}
