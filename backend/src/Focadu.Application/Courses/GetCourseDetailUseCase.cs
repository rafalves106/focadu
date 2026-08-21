using Focadu.Application.Exceptions;
using Focadu.Application.Shared;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Courses;

/// <summary>
/// Caso de uso: detalhe de um curso (suporta "/start?course=") - conclusao, visao geral de cada
/// Monthly/WeeklyTemplate, e as sessoes de reforco (diario e semanal) disparadas ate agora no
/// curso. Fase 13: course.Monthlies.WeeklyTemplates e curriculo (igual pra todo mundo) - o
/// progresso real (Status/reforcos/conclusao) vem das Weeklies-instancia da Enrollment do usuario
/// logado, casadas por WeeklyTemplateId.
/// </summary>
public class GetCourseDetailUseCase
{
    private readonly ICourseRepository _courseRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;

    public GetCourseDetailUseCase(
        ICourseRepository courseRepository, IEnrollmentRepository enrollmentRepository, IWeeklyRepository weeklyRepository)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
    }

    public async Task<CourseDetailDto> ExecuteAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        var course = await _courseRepository.GetByIdAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("curso_nao_encontrado", "Curso nao encontrado.");

        var enrollment = await _enrollmentRepository.GetByUserAndCourseAsync(userId, courseId, cancellationToken)
            ?? throw new NotFoundException("matricula_nao_encontrada", "Usuario nao esta matriculado neste curso.");

        var instanceWeeklies = await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken);
        var weeklyByTemplateId = instanceWeeklies.ToDictionary(w => w.WeeklyTemplateId);

        var monthlyDtos = new List<MonthlyOverviewDto>();
        var dailyReinforcements = new List<DailyReinforcementSummaryDto>();
        var weeklyReinforcements = new List<WeeklyReinforcementSummaryDto>();
        var totalDailies = 0;
        var completedDailies = 0;
        var reinforcementDailies = 0;

        foreach (var monthly in course.Monthlies.OrderBy(m => m.Number))
        {
            var weeklyDtos = new List<WeeklyOverviewDto>();

            foreach (var weeklyTemplate in monthly.WeeklyTemplates.OrderBy(w => w.Number))
            {
                // So deveria faltar se a matricula estiver no meio da criacao (nunca deveria
                // acontecer em uso normal - EnrollUserInCourseUseCase cria 1 Weekly por
                // WeeklyTemplate atomicamente) - pular em vez de derrubar a tela inteira.
                if (!weeklyByTemplateId.TryGetValue(weeklyTemplate.Id, out var weekly))
                    continue;

                var weeklyTotal = weekly.Dailies.Count;
                var weeklyCompleted = weekly.Dailies.Count(d => d.Status == Domain.Enums.DailyStatus.Completed);
                var weeklyWeak = weekly.GetWeakDailies().Count;

                var dayDtos = weekly.Dailies
                    .OrderBy(d => d.DayNumber)
                    .Select(d => new DailyStatusSummaryDto(
                        d.Id, d.DayNumber, d.Date, d.Status, d.IsReinforcement,
                        d.Activities.Count, d.Activities.Count(a => d.Responses.Any(r => r.ActivityId == a.Id))))
                    .ToList();

                weeklyDtos.Add(new WeeklyOverviewDto(
                    weekly.Id, weekly.Number, weekly.Title, weekly.Theme,
                    weeklyTotal, weeklyCompleted, weeklyWeak, weekly.Reinforcements.Count > 0, dayDtos,
                    weekly.RequiresPublicationToUnlock()));

                totalDailies += weeklyTotal;
                completedDailies += weeklyCompleted;
                reinforcementDailies += weekly.Dailies.Count(d => d.IsReinforcement);

                dailyReinforcements.AddRange(weekly.Dailies
                    .Where(d => d.IsReinforcement)
                    .Select(d => new DailyReinforcementSummaryDto(d.Id, weekly.Id, d.DayNumber, d.Date, d.Activities.Count)));

                weeklyReinforcements.AddRange(weekly.Reinforcements
                    .Select(r => new WeeklyReinforcementSummaryDto(r.Id, weekly.Id, r.TriggeredAt, r.WeakDailyIds)));
            }

            monthlyDtos.Add(new MonthlyOverviewDto(monthly.Id, monthly.Number, monthly.Title, weeklyDtos));
        }

        var completionPercentage = totalDailies == 0 ? 0d : Math.Round(100d * completedDailies / totalDailies, 1);
        var progress = new CourseProgressDto(totalDailies, completedDailies, reinforcementDailies, completionPercentage);

        return new CourseDetailDto(
            course.Id, course.Name, course.Status, progress,
            monthlyDtos, dailyReinforcements, weeklyReinforcements);
    }
}
