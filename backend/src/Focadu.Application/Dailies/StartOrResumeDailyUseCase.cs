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
/// Fase 54/55: tambem bloqueia por projeto semanal nao avaliado (Weekly.RequiresProjectToUnlock),
/// e olha TODAS as Weeklies anteriores da matricula, nao so a mais proxima (ver
/// DailySequencing.FindPendingClosureBefore).
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
        // Fase 55: qualquer Weekly anterior ainda nao fechada trava esta (nao so a imediatamente
        // anterior) - ver DailySequencing.FindPendingClosureBefore.
        var pendingClosure = DailySequencing.FindPendingClosureBefore(siblingWeeklies, weekly);

        if (pendingClosure?.RequiresPublicationToUnlock() == true)
        {
            throw new DomainException(
                "Uma semana anterior precisa de uma publicacao validada antes de comecar esta.",
                "modulo_bloqueado_por_publicacao");
        }

        // Fase 54: sem isto a trava acima so ligava com o projeto JA avaliado - com o projeto ainda
        // pendente a Semana N+1 abria normalmente (bug real, 21/09/2026). Pendente aqui, e nao
        // por publicacao, so pode ser por projeto (RequiresPublicationToUnlock exige projeto avaliado).
        if (pendingClosure is not null)
        {
            throw new DomainException(
                "O projeto de uma semana anterior ainda nao foi concluido - envie-o e aguarde a avaliacao antes de comecar esta.",
                "projeto_semana_anterior_pendente");
        }

        var today = _clock.Today();
        var isNext = DailySequencing.IsNext(siblingWeeklies, dailyId);
        var otherWeekliesDailies = DailySequencing.DailiesOfOtherWeeklies(siblingWeeklies, weekly);
        var daily = weekly.StartOrResumeDaily(dailyId, today, isNext, otherWeekliesDailies);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var accessMode = weekly.EvaluateDailyAccess(dailyId, today, isNext, otherWeekliesDailies);
        return DailyStateMapper.ToDto(daily, accessMode);
    }
}
