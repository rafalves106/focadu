using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Enrollments;

/// <summary>
/// Caso de uso: lista cursos disponiveis pra matricula (Fase 13, Selecao de Curso Inicial) - so
/// cursos Active (Fase 81: e os Draft, pra quem esta em CoursePreviewOptions), excluindo os que o usuario logado ja esta matriculado (hoje isso nunca some a
/// lista inteira, so existe 1 curso - mas ja prepara pro dia em que existir mais de um).
/// EstimatedDuration e calculada ao vivo a partir do numero real de WeeklyTemplates do curriculo,
/// nunca um texto solto que pode ficar desatualizado.
/// </summary>
public class GetAvailableCoursesUseCase
{
    private readonly ICourseRepository _courseRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IUserRepository _userRepository;
    private readonly CoursePreviewOptions _previewOptions;
    private readonly IWeeklyRepository _weeklyRepository;

    public GetAvailableCoursesUseCase(
        ICourseRepository courseRepository, IEnrollmentRepository enrollmentRepository, IUserRepository userRepository,
        CoursePreviewOptions previewOptions, IWeeklyRepository weeklyRepository)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _userRepository = userRepository;
        _previewOptions = previewOptions;
        _weeklyRepository = weeklyRepository;
    }

    public async Task<IReadOnlyCollection<AvailableCourseDto>> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var courses = await _courseRepository.GetAllAsync(cancellationToken);
        var enrollments = await _enrollmentRepository.GetByUserIdAsync(userId, cancellationToken);
        var enrolledCourseIds = enrollments.Select(e => e.CourseId).ToHashSet();
        // Fase 81: curso escondido (Draft) so aparece pra quem esta na lista de previa.
        var canPreview = _previewOptions.Emails.Count > 0
            && _previewOptions.CanPreview((await _userRepository.GetByIdAsync(userId, cancellationToken))?.Email);

        var visible = courses.Where(c => c.Status == CourseStatus.Active || (canPreview && c.Status == CourseStatus.Draft)).ToList();

        // Fase 84: situacao do aluno em cada curso recomendado (so os que aparecem em alguma recomendacao).
        var recommendedNames = visible.SelectMany(c => c.RecommendedBefore).ToHashSet();
        var progress = new Dictionary<Guid, RecommendedCourseStatus>();
        foreach (var enrollment in enrollments)
        {
            var course = courses.FirstOrDefault(c => c.Id == enrollment.CourseId);
            if (course is null || !recommendedNames.Contains(course.Name)) continue;
            var weeklies = await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken);
            progress[course.Id] = weeklies.Count > 0 && weeklies.All(w => w.IsModuleComplete())
                ? RecommendedCourseStatus.Completed
                : RecommendedCourseStatus.InProgress;
        }

        return visible
            .Where(c => !enrolledCourseIds.Contains(c.Id))
            .OrderBy(c => c.Status == CourseStatus.Active ? 0 : 1)
            .Select(c => new AvailableCourseDto(
                c.Id, c.Name, c.Description ?? string.Empty, FormatDuration(c.Monthlies.Sum(m => m.WeeklyTemplates.Count)),
                c.Requirements.ToList(),
                c.RecommendedBefore
                    .Select(name => visible.FirstOrDefault(r => r.Name == name))
                    .OfType<Domain.Courses.Course>()
                    .Select(r => new RecommendedCourseDto(
                        r.Id, r.Name, FormatDuration(r.Monthlies.Sum(m => m.WeeklyTemplates.Count)),
                        progress.GetValueOrDefault(r.Id, RecommendedCourseStatus.NotStarted)))
                    .ToList(),
                visible.Where(o => o.RecommendedBefore.Contains(c.Name)).Select(o => o.Name).ToList(),
                c.PreparesText))
            .ToList();
    }

    private static string FormatDuration(int weeks) => weeks == 1 ? "1 semana" : $"{weeks} semanas";
}

/// <param name="Requirements">Fase 84: o que ajuda saber antes (vazio = comeca do zero).</param>
/// <param name="RecommendedBefore">Fase 84: cursos que a Focadu recomenda antes deste - so recomendacao, nada trava.</param>
/// <param name="PreparesFor">Fase 84: nomes dos cursos que recomendam este antes ("Prepara pro Web Security").</param>
/// <param name="PreparesText">Fase 84: como este curso prepara pros que o recomendam.</param>
public record AvailableCourseDto(
    Guid Id, string Title, string Description, string EstimatedDuration,
    IReadOnlyList<string> Requirements, IReadOnlyList<RecommendedCourseDto> RecommendedBefore,
    IReadOnlyList<string> PreparesFor, string? PreparesText);

/// <summary>Fase 84: um curso recomendado antes de outro, com a situacao do aluno nele.</summary>
public record RecommendedCourseDto(Guid Id, string Name, string EstimatedDuration, RecommendedCourseStatus Status);

public enum RecommendedCourseStatus
{
    NotStarted = 0,
    InProgress = 1,
    Completed = 2,
}
