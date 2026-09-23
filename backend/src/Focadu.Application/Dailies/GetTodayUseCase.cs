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

    /// <param name="courseId">
    /// Tela de start com varios cursos (23/09/2026): escolhe a matricula daquele curso - a cota de
    /// "1 Daily por dia" ja e por matricula (decisao do dono: por curso). Sem ele, comportamento de
    /// sempre (exatamente 1 matricula, senao 409).
    /// </param>
    public async Task<DailyStateDto> ExecuteAsync(Guid userId, Guid? courseId = null, CancellationToken cancellationToken = default)
    {
        var enrollments = await _enrollmentRepository.GetByUserIdAsync(userId, cancellationToken);

        if (enrollments.Count == 0)
            throw new NotFoundException("nenhuma_matricula_ativa", "Usuario nao esta matriculado em nenhum curso.");

        Domain.Enrollments.Enrollment enrollment;
        if (courseId is { } id)
        {
            enrollment = enrollments.FirstOrDefault(e => e.CourseId == id)
                ?? throw new NotFoundException("matricula_nao_encontrada", "Usuario nao esta matriculado neste curso.");
        }
        else if (enrollments.Count > 1)
        {
            throw new ConflictException(
                "multiplas_matriculas_ativas",
                "Mais de uma matricula ativa encontrada; informe ?courseId= para escolher qual.");
        }
        else
        {
            enrollment = enrollments.First();
        }

        var allWeeklies = await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken);

        var target = DailySequencing.FindInProgress(allWeeklies) ?? DailySequencing.FindNext(allWeeklies);
        if (target is null)
            throw new NotFoundException("daily_hoje_nao_encontrada", "Nenhuma Daily pendente encontrada.");

        var weekly = allWeeklies.First(w => w.Id == target.WeeklyId);
        var today = _clock.Today();

        // Fase 56: vai em toda resposta deste atalho, seja qual for o modo de acesso - o botao de
        // reforco precisa aparecer tambem quando "Hoje" esta Blocked / WeekPendingClosure.
        var pendingReinforcementId = DailySequencing.FindPendingReinforcement(allWeeklies)?.Id;

        // Fase 54 (bug real, 21/09/2026): terminar a ultima Daily da Semana 1 fazia "/hoje" cair
        // direto na 1a Daily da Semana 2, sem o projeto da Semana 1 - que e o que vem depois. Se a
        // Weekly anterior (qualquer uma - Fase 55) ainda nao fechou (projeto nao avaliado / publicacao nao validada), nao ha
        // Daily "de hoje" pra mostrar: devolve a ultima Daily original dela, ja Completed, marcada
        // WeekPendingClosure - o cliente cai na Weekly certa (onde esta o card do projeto). Vem
        // ANTES da cota diaria: "voltar amanha" nao resolveria, amanha continua faltando o projeto.
        var pendingClosure = DailySequencing.FindPendingClosureBefore(allWeeklies, weekly);
        if (pendingClosure is not null)
        {
            var lastOriginalDaily = pendingClosure.Dailies.Where(d => !d.IsReinforcement).MaxBy(d => d.DayNumber)!;
            return DailyStateMapper.ToDto(lastOriginalDaily, DailyAccessMode.WeekPendingClosure)
                with { PendingReinforcementDailyId = pendingReinforcementId };
        }

        DailyAccessMode accessMode;
        try
        {
            accessMode = weekly.EvaluateDailyAccess(
                target.Id, today, DailySequencing.IsNext(allWeeklies, target.Id),
                DailySequencing.DailiesOfOtherWeeklies(allWeeklies, weekly));
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

        return DailyStateMapper.ToDto(target, accessMode) with { PendingReinforcementDailyId = pendingReinforcementId };
    }
}
