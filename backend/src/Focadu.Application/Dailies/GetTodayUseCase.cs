using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Enums;
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

        var enrollmentId = enrollments.First().Id;
        var today = _clock.Today();

        // Uma Daily InProgress tem SEMPRE prioridade sobre a Daily agendada pra hoje - nao so
        // quando nao ha nada agendado pra hoje (fim de semana/feriado), mas tambem quando HA algo
        // agendado: Weekly.EvaluateDailyAccess recusa iniciar uma Daily nova enquanto outra
        // continuar InProgress em QUALQUER lugar da matricula ("daily_em_andamento"), entao
        // resolver pra "hoje" primeiro e so descobrir esse bloqueio depois deixava o atalho preso
        // (o usuario so conseguia retomar indo direto na trilha/weekly, nunca por "/hoje" - bug
        // real, corrigido em 2026-09-14). Comeca pela Weekly de hoje (mesma consulta que ja ia
        // rodar de qualquer forma - cobre o caso comum, Daily abandonada na mesma semana da atual)
        // e so cai pra busca cross-Weekly se essa Weekly nao existir ou nao tiver nada InProgress.
        var todaysWeekly = await _weeklyRepository.GetByEnrollmentAndDateAsync(enrollmentId, today, cancellationToken);

        var weekly = todaysWeekly;
        var daily = todaysWeekly?.Dailies.FirstOrDefault(d => d.Status == DailyStatus.InProgress);

        if (daily is null)
        {
            var allWeeklies = await _weeklyRepository.GetByEnrollmentIdAsync(enrollmentId, cancellationToken);
            foreach (var candidate in allWeeklies)
            {
                var inProgress = candidate.Dailies.FirstOrDefault(d => d.Status == DailyStatus.InProgress);
                if (inProgress is null) continue;

                weekly = candidate;
                daily = inProgress;
                break;
            }
        }

        // Nenhuma Daily InProgress em lugar nenhum - cai pro comportamento original, a Daily
        // agendada exatamente pra hoje (se houver).
        daily ??= weekly?.GetDailyByDate(today);

        if (weekly is null || daily is null)
            throw new NotFoundException("daily_hoje_nao_encontrada", "Nenhuma Daily cadastrada para hoje.");

        var accessMode = weekly.EvaluateDailyAccess(daily.Id, today);

        return DailyStateMapper.ToDto(daily, accessMode);
    }
}
