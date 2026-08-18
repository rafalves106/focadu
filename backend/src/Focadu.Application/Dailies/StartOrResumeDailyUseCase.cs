using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso: usuario quer abrir uma Daily (iniciar, retomar ou repetir). Delega toda a decisao
/// de acesso para Weekly.EvaluateDailyAccess / StartOrResumeDaily, e retorna o estado completo
/// resultante (mesmo shape usado pela consulta de estado), para o cliente já ter tudo que precisa
/// para renderizar a tela de estudo sem uma segunda chamada.
/// </summary>
public class StartOrResumeDailyUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public StartOrResumeDailyUseCase(IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork, IClock clock)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<DailyStateDto> ExecuteAsync(Guid dailyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var today = _clock.Today();
        var daily = weekly.StartOrResumeDaily(dailyId, today);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var accessMode = weekly.EvaluateDailyAccess(dailyId, today);
        return DailyStateMapper.ToDto(daily, accessMode);
    }
}
