using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso: atalho "/hoje" - resolve direto a Daily de hoje, sem o cliente precisar informar
/// weekly/daily. Fase 13: agora resolve pela Enrollment do usuario logado (userId vem do JWT),
/// nao mais por "1 Course com Status = Active" global - fecha a limitacao documentada desde a
/// Fase 2. Hoje, no maximo 1 Enrollment por usuario (so existe 1 Course); mais de uma vira erro
/// (mesmo tratamento defensivo que "multiplos cursos ativos" tinha antes), preparado pro dia em
/// que multiplos cursos existirem de verdade.
/// </summary>
public class GetTodayUseCase
{
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IClock _clock;

    public GetTodayUseCase(IEnrollmentRepository enrollmentRepository, IWeeklyRepository weeklyRepository, IClock clock)
    {
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _clock = clock;
    }

    public async Task<DailyStateDto> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var enrollments = await _enrollmentRepository.GetByUserIdAsync(userId, cancellationToken);

        if (enrollments.Count == 0)
            throw new NotFoundException("nenhuma_matricula_ativa", "Usuario nao esta matriculado em nenhum curso.");

        if (enrollments.Count > 1)
        {
            throw new ConflictException(
                "multiplas_matriculas_ativas",
                "Mais de uma matricula ativa encontrada; use /api/weeklies/{weeklyId} para escolher qual.");
        }

        var today = _clock.Today();
        var weekly = await _weeklyRepository.GetByEnrollmentAndDateAsync(enrollments.First().Id, today, cancellationToken)
            ?? throw new NotFoundException("daily_hoje_nao_encontrada", "Nenhuma Daily cadastrada para hoje.");

        var daily = weekly.GetDailyByDate(today)
            ?? throw new NotFoundException("daily_hoje_nao_encontrada", "Nenhuma Daily cadastrada para hoje.");
        var accessMode = weekly.EvaluateDailyAccess(daily.Id, today);

        return DailyStateMapper.ToDto(daily, accessMode);
    }
}
