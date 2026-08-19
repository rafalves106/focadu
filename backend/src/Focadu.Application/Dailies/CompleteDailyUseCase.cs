using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso: usuario conclui a Daily em andamento (ou uma repeticao/replay). O reforco diario/
/// semanal, quando existe, ja foi disparado antes disso (durante SubmitActivityResponseUseCase,
/// resposta a resposta - ver EvaluationPolicy) - aqui so reportamos o estado final pro cliente
/// saber se precisa navegar pra uma sessao de reforco (Fase 4).
/// </summary>
public class CompleteDailyUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public CompleteDailyUseCase(IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork, IClock clock)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<CompleteDailyResult> ExecuteAsync(Guid dailyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var daily = weekly.Dailies.First(d => d.Id == dailyId);
        daily.Complete();

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var accessMode = weekly.EvaluateDailyAccess(dailyId, _clock.Today());
        var dailyDto = DailyStateMapper.ToDto(daily, accessMode);

        var weeklyReinforcement = weekly.Reinforcements.FirstOrDefault(r => r.WeakDailyIds.Contains(daily.Id));

        return new CompleteDailyResult(
            dailyDto,
            daily.ReinforcementTriggered,
            daily.ReinforcementDailyId,
            weeklyReinforcement is not null,
            weeklyReinforcement?.Id);
    }
}
