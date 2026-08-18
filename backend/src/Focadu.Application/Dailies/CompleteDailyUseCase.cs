using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>Caso de uso: usuario conclui a Daily em andamento (ou uma repeticao/replay).</summary>
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

    public async Task<DailyStateDto> ExecuteAsync(Guid dailyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var daily = weekly.Dailies.First(d => d.Id == dailyId);
        daily.Complete();

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var accessMode = weekly.EvaluateDailyAccess(dailyId, _clock.Today());
        return DailyStateMapper.ToDto(daily, accessMode);
    }
}
