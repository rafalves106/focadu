using Focadu.Application.Enrollments;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Courses;

/// <summary>
/// Caso de uso: listar os cursos (tela inicial, suporta a rota "/start" do frontend). Fase 81: curso
/// escondido (Draft, os de pre-requisito enquanto a curadoria nao termina) so aparece pra quem esta na
/// lista de previa ou ja se matriculou nele - o front usa esta lista no menu, no Start, no Ranking e no
/// guia. Os publicados vem primeiro (o guia abre o primeiro da lista).
/// </summary>
public class ListCoursesUseCase
{
    private readonly ICourseRepository _courseRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IUserRepository _userRepository;
    private readonly CoursePreviewOptions _previewOptions;

    public ListCoursesUseCase(
        ICourseRepository courseRepository, IEnrollmentRepository enrollmentRepository, IUserRepository userRepository,
        CoursePreviewOptions previewOptions)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _userRepository = userRepository;
        _previewOptions = previewOptions;
    }

    public async Task<IReadOnlyCollection<CourseSummaryDto>> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var courses = await _courseRepository.GetAllAsync(cancellationToken);

        var hidden = courses.Where(c => c.Status == CourseStatus.Draft).ToList();
        var visibleHidden = new HashSet<Guid>();
        if (hidden.Count > 0)
        {
            var enrolled = (await _enrollmentRepository.GetByUserIdAsync(userId, cancellationToken)).Select(e => e.CourseId).ToHashSet();
            var canPreview = _previewOptions.Emails.Count > 0
                && _previewOptions.CanPreview((await _userRepository.GetByIdAsync(userId, cancellationToken))?.Email);
            visibleHidden = hidden.Where(c => canPreview || enrolled.Contains(c.Id)).Select(c => c.Id).ToHashSet();
        }

        return courses
            .Where(c => c.Status != CourseStatus.Draft || visibleHidden.Contains(c.Id))
            .OrderBy(c => c.Status == CourseStatus.Active ? 0 : 1)
            .Select(c => new CourseSummaryDto(c.Id, c.Name, c.Status, c.Monthlies.Count))
            .ToList();
    }
}
