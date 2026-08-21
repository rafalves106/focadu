using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso: usuario quer abrir uma Daily (iniciar, retomar ou repetir). Delega toda a decisao
/// de acesso para Weekly.EvaluateDailyAccess / StartOrResumeDaily, e retorna o estado completo
/// resultante (mesmo shape usado pela consulta de estado), para o cliente já ter tudo que precisa
/// para renderizar a tela de estudo sem uma segunda chamada.
///
/// Fase 11: antes de iniciar, checa se a Weekly ANTERIOR (mesma matricula, Number menor, a mais
/// proxima) ainda exige publicacao (Weekly.RequiresPublicationToUnlock) - se sim, bloqueia.
/// Fase 13: o escopo virou "mesma Enrollment" (era "mesma Monthly") ao trocar
/// GetByMonthlyIdAsync por GetByEnrollmentIdAsync - isso fecha de graca a limitacao documentada
/// desde a Fase 11 ("nao atravessa Monthly"), ja que uma Enrollment cobre o Course inteiro,
/// nao um Monthly especifico. Nunca bloqueia reabrir uma Daily ja vista/concluida - so a entrada
/// nova (Start/Resume) de uma Daily cuja Weekly ainda nao pode comecar.
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

    public async Task<DailyStateDto> ExecuteAsync(Guid userId, Guid dailyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, userId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var siblingWeeklies = await _weeklyRepository.GetByEnrollmentIdAsync(weekly.EnrollmentId, cancellationToken);
        var previousWeekly = siblingWeeklies
            .Where(w => w.Number < weekly.Number)
            .OrderByDescending(w => w.Number)
            .FirstOrDefault();

        if (previousWeekly?.RequiresPublicationToUnlock() == true)
        {
            throw new DomainException(
                "A semana anterior precisa de uma publicacao validada antes de comecar esta.",
                "modulo_bloqueado_por_publicacao");
        }

        var today = _clock.Today();
        var daily = weekly.StartOrResumeDaily(dailyId, today);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var accessMode = weekly.EvaluateDailyAccess(dailyId, today);
        return DailyStateMapper.ToDto(daily, accessMode);
    }
}
