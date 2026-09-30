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

    public GetAvailableCoursesUseCase(
        ICourseRepository courseRepository, IEnrollmentRepository enrollmentRepository, IUserRepository userRepository,
        CoursePreviewOptions previewOptions)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _userRepository = userRepository;
        _previewOptions = previewOptions;
    }

    public async Task<IReadOnlyCollection<AvailableCourseDto>> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var courses = await _courseRepository.GetAllAsync(cancellationToken);
        var enrollments = await _enrollmentRepository.GetByUserIdAsync(userId, cancellationToken);
        var enrolledCourseIds = enrollments.Select(e => e.CourseId).ToHashSet();
        // Fase 81: curso escondido (Draft) so aparece pra quem esta na lista de previa.
        var canPreview = _previewOptions.Emails.Count > 0
            && _previewOptions.CanPreview((await _userRepository.GetByIdAsync(userId, cancellationToken))?.Email);

        return courses
            .Where(c => (c.Status == CourseStatus.Active || (canPreview && c.Status == CourseStatus.Draft))
                && !enrolledCourseIds.Contains(c.Id))
            .OrderBy(c => c.Status == CourseStatus.Active ? 0 : 1)
            .Select(c => new AvailableCourseDto(
                c.Id, c.Name, c.Description ?? string.Empty, FormatDuration(c.Monthlies.Sum(m => m.WeeklyTemplates.Count))))
            .ToList();
    }

    private static string FormatDuration(int weeks) => weeks == 1 ? "1 semana" : $"{weeks} semanas";
}

public record AvailableCourseDto(Guid Id, string Title, string Description, string EstimatedDuration);
