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
    private readonly ForgejoAccountProvisioner _forgejoAccountProvisioner;
    private readonly IForgejoService _forgejoService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public EnrollUserInCourseUseCase(
        ICourseRepository courseRepository,
        IEnrollmentRepository enrollmentRepository,
        IWeeklyRepository weeklyRepository,
        IReferralRepository referralRepository,
        ForgejoAccountProvisioner forgejoAccountProvisioner,
        IForgejoService forgejoService,
        IUnitOfWork unitOfWork,
        IClock clock)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _referralRepository = referralRepository;
        _forgejoAccountProvisioner = forgejoAccountProvisioner;
        _forgejoService = forgejoService;
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

        // Repositorios de Projeto Semanal (Forgejo interno) - conta do aluno e criada uma vez so,
        // sob demanda, na 1a matricula que de fato precisar de um fork (nunca no registro, mesmo
        // principio lazy de UserGemBalance/UserStreak). Resolvida fora do loop de Weeklies porque
        // e a MESMA conta pra todos os forks desta matricula (1 token por aluno, nao por semana -
        // ver secret/rascunhos/repositorios-gerenciados-projeto-semanal.md).
        UserForgejoAccount? forgejoAccount = null;

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

                var project = weekly.InitializeProject();

                // Sem repositorio-template configurado ainda pra esta semana (curadoria nao
                // preencheu WeeklyTemplate.ForgejoTemplateSlug) - projeto fica Pending sem
                // SubmissionUrl, exatamente como sempre foi ate esta fase. Nunca bloqueia a
                // matricula.
                // Fase 59: semana com variantes de linguagem NAO da fork aqui - o repositorio e o do
                // modelo da linguagem que o aluno escolhe depois (ChooseWeeklyProjectLanguageUseCase).
                // O slug unico de antes fica no banco so pra avaliar quem ja tinha o fork antigo.
                if (!weeklyTemplate.HasLanguageVariants && weeklyTemplate.ForgejoTemplateSlug is { } templateSlug)
                {
                    // Falha de Forgejo (fora do ar, etc) NUNCA derruba a matricula - mesmo espirito
                    // "bonus, nunca core" ja usado em SubmitWeeklyProjectUseCase pra falha da
                    // avaliacao automatica por IA. O projeto so fica sem SubmissionUrl; nada
                    // tenta de novo automaticamente ainda (upgrade natural se isso importar).
                    try
                    {
                        forgejoAccount ??= await _forgejoAccountProvisioner.GetOrCreateAsync(userId, cancellationToken);
                        var repoUrl = await _forgejoService.ForkTemplateAsync(templateSlug, forgejoAccount.ForgejoUsername, cancellationToken);
                        project.AttachRepository(repoUrl);
                    }
                    catch (ExternalServiceException)
                    {
                        // Ver comentario acima - segue sem repositorio pra esta Weekly.
                    }
                }

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
