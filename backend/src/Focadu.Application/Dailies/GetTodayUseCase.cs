using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso: atalho "/hoje" - resolve direto a Daily "atual" do usuario logado, sem o cliente
/// precisar informar weekly/daily. Fase 13: agora resolve pela Enrollment do usuario logado
/// (userId vem do JWT), nao mais por "1 Course com Status = Active" global. Hoje, no maximo 1
/// Enrollment por usuario (so existe 1 Course); mais de uma vira erro (mesmo tratamento defensivo
/// que "multiplos cursos ativos" tinha antes), preparado pro dia em que multiplos cursos
/// existirem de verdade.
///
/// Fase 38b (corrige bug real, 14->15/09/2026): "a Daily de hoje" era resolvida batendo Daily.Date
/// (fixado de uma vez so na matricula, 1 dia util por Daily - ver EnrollUserInCourseUseCase)
/// contra o calendario real. Qualquer folga entre esse ritmo hipotetico e o ritmo real do aluno
/// pulava Dailies inteiras (relatado ao vivo: concluir a Daily 1 num dia so liberou calendarmente
/// a Daily 4). Agora "hoje" e sempre: a Daily InProgress mais recente em qualquer Weekly da
/// matricula (prioridade de sempre - permite recuperar uma Daily abandonada), ou senao a Daily
/// nao concluida de menor DayNumber em toda a matricula (DailySequencing.FindNext) - nunca mais
/// calendario.
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

        var allWeeklies = await _weeklyRepository.GetByEnrollmentIdAsync(enrollments.First().Id, cancellationToken);

        var target = DailySequencing.FindInProgress(allWeeklies) ?? DailySequencing.FindNext(allWeeklies);
        if (target is null)
            throw new NotFoundException("daily_hoje_nao_encontrada", "Nenhuma Daily pendente encontrada.");

        var weekly = allWeeklies.First(w => w.Id == target.WeeklyId);
        var today = _clock.Today();

        DailyAccessMode accessMode;
        try
        {
            accessMode = weekly.EvaluateDailyAccess(target.Id, today, DailySequencing.IsNext(allWeeklies, target.Id));
        }
        catch (DomainException ex) when (ex.Code == "daily_limite_diario_atingido")
        {
            // "/hoje" e um GET best-effort ("o que devo mostrar agora?") - diferente de
            // StartOrResumeDaily/CompleteDaily, que legitimamente precisam recusar a mutacao com
            // 409 quando o limite diario ja foi atingido (ate mesmo por retomar uma Daily
            // atrasada de outro dia - ver Weekly.EvaluateDailyAccess). Aqui isso nao e um erro,
            // e sim um estado real pra descrever: a Daily de hoje existe, so nao pode ser
            // iniciada ainda.
            accessMode = DailyAccessMode.Blocked;
        }

        return DailyStateMapper.ToDto(target, accessMode);
    }
}
