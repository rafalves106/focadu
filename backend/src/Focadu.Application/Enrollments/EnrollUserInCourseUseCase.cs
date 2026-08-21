using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Enrollments;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Enrollments;

/// <summary>
/// Caso de uso: matricula o usuario logado num Course (Fase 13) - o gatilho que transforma
/// estrutura curricular (Course/Monthly/WeeklyTemplate/DailyTemplate) em progresso real (Weekly/
/// Daily-instancia). Datas sao calculadas a partir de "hoje" no momento da matricula, mesma logica
/// de distribuicao por dia util que SeedWebSecurityCourseUseCase usava antes da Fase 13 (agora so
/// faz sentido nesse momento - antes, com curso global, "hoje" era fixo no momento do seed).
/// </summary>
public class EnrollUserInCourseUseCase
{
    private readonly ICourseRepository _courseRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public EnrollUserInCourseUseCase(
        ICourseRepository courseRepository,
        IEnrollmentRepository enrollmentRepository,
        IWeeklyRepository weeklyRepository,
        IUnitOfWork unitOfWork,
        IClock clock)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<EnrollmentDto> ExecuteAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        var existing = await _enrollmentRepository.GetByUserAndCourseAsync(userId, courseId, cancellationToken);
        if (existing is not null)
            throw new ConflictException("ja_matriculado", "Usuario ja esta matriculado neste curso.");

        var course = await _courseRepository.GetFullTemplateGraphAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("curso_nao_encontrado", "Curso nao encontrado.");

        var enrollment = new Enrollment(userId, courseId);
        await _enrollmentRepository.AddAsync(enrollment, cancellationToken);

        var cursor = FirstBusinessDayOnOrAfter(_clock.Today());

        foreach (var monthly in course.Monthlies.OrderBy(m => m.Number))
        {
            foreach (var weeklyTemplate in monthly.WeeklyTemplates.OrderBy(w => w.Number))
            {
                var orderedDailyTemplates = weeklyTemplate.DailyTemplates.OrderBy(d => d.DayNumber).ToList();
                if (orderedDailyTemplates.Count == 0) continue;

                var weekly = new Weekly(enrollment.Id, weeklyTemplate, cursor);

                foreach (var dailyTemplate in orderedDailyTemplates)
                {
                    weekly.AddDaily(dailyTemplate, cursor);
                    cursor = NextBusinessDay(cursor);
                }

                weekly.InitializeProject();
                await _weeklyRepository.AddAsync(weekly, cancellationToken);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new EnrollmentDto(enrollment.Id, course.Id, course.Name, enrollment.EnrolledAt);
    }

    private static DateOnly FirstBusinessDayOnOrAfter(DateOnly date) => date.DayOfWeek switch
    {
        DayOfWeek.Saturday => date.AddDays(2),
        DayOfWeek.Sunday => date.AddDays(1),
        _ => date
    };

    private static DateOnly NextBusinessDay(DateOnly date) => FirstBusinessDayOnOrAfter(date.AddDays(1));
}

public record EnrollmentDto(Guid Id, Guid CourseId, string CourseName, DateTime EnrolledAt);
