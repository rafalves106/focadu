using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Weeklies;
using Focadu.Domain.Enrollments;
using Focadu.Domain.GitHosting;
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
    private readonly IReferralRepository _referralRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;
    private readonly CourseAccess _access;

    public EnrollUserInCourseUseCase(
        ICourseRepository courseRepository,
        IEnrollmentRepository enrollmentRepository,
        IWeeklyRepository weeklyRepository,
        IReferralRepository referralRepository,
        IUnitOfWork unitOfWork,
        IClock clock,
        CourseAccess access)
    {
        _access = access;
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _referralRepository = referralRepository;
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

        // Fase 81/96: curso que o aluno nao enxerga (rascunho fora da previa, "so pra turmas" sem turma, fora da turma
        // do aluno) responde como se nao existisse. Arquivado nunca.
        if (!(await _access.ForUserAsync(userId, cancellationToken)).CanEnroll(Domain.Courses.CourseRef.From(course)))
            throw new NotFoundException("curso_nao_encontrado", "Curso nao encontrado.");

        var enrollment = new Enrollment(userId, courseId);
        await _enrollmentRepository.AddAsync(enrollment, cancellationToken);

        var cursor = FirstBusinessDayOnOrAfter(_clock.Today());

        foreach (var monthly in course.Monthlies.OrderBy(m => m.Number))
        {
            foreach (var weeklyTemplate in monthly.WeeklyTemplates.OrderBy(w => w.Number))
            {
                // Fase 69: 1 Daily por dia - num dia com uma versao por linguagem (a ponte), a
                // Daily nasce na variante padrao e troca pra certa na escolha da linguagem.
                var orderedDailyTemplates = weeklyTemplate.DefaultDailyTemplatesByDay();
                if (orderedDailyTemplates.Count == 0) continue;

                var weekly = new Weekly(enrollment.Id, weeklyTemplate, cursor);

                foreach (var dailyTemplate in orderedDailyTemplates)
                {
                    weekly.AddDaily(dailyTemplate, cursor);
                    cursor = NextBusinessDay(cursor);
                }

                // Fase 81: semana sem Projeto Semanal (cursos de pre-requisito) fecha so com as Dailies.
                if (weeklyTemplate.IsPracticeOnly)
                {
                    await _weeklyRepository.AddAsync(weekly, cancellationToken);
                    continue;
                }

                var project = weekly.InitializeProject();

                // Fase 105: o repositorio do projeto nao nasce mais aqui - o fork sai quando o projeto abre
                // (WeeklyProjectRepositoryProvisioner), do modelo que existir nesse momento.

                await _weeklyRepository.AddAsync(weekly, cancellationToken);
            }
        }

        // Fase 17: se este usuario foi indicado por alguem (Referral criado no registro, ainda
        // nao confirmado), a matricula e a prova de uso real que confirma - alimenta o badge
        // Embaixador de quem indicou. Confirm() e idempotente, sem risco de dupla confirmacao.
        var pendingReferral = await _referralRepository.GetByReferredUserIdAsync(userId, cancellationToken);
        pendingReferral?.Confirm();

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
