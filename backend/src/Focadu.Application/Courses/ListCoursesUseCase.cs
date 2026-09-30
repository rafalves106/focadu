using Focadu.Domain.Courses;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Courses;

/// <summary>
/// Caso de uso: listar os cursos do usuario (tela inicial, suporta a rota "/start" do frontend). O front
/// usa esta lista no menu, no Start, no Perfil, no Ranking e no guia, e pede o detalhe de cada curso
/// (GET /api/courses/{id}, que exige matricula) - por isso so entram os cursos em que o usuario esta
/// matriculado. Antes (Fase 81) entravam tambem os escondidos da lista de previa sem matricula, e o
/// detalhe desses dava 404 e derrubava o Start. Descobrir curso novo e papel de GET /api/courses/available.
/// Os publicados vem primeiro (o guia abre o primeiro da lista).
/// </summary>
public class ListCoursesUseCase
{
    private readonly ICourseRepository _courseRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;

    public ListCoursesUseCase(ICourseRepository courseRepository, IEnrollmentRepository enrollmentRepository)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
    }

    public async Task<IReadOnlyCollection<CourseSummaryDto>> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var courses = await _courseRepository.GetAllAsync(cancellationToken);
        var enrolled = (await _enrollmentRepository.GetByUserIdAsync(userId, cancellationToken)).Select(e => e.CourseId).ToHashSet();
        return EnrolledCourses(courses, enrolled);
    }

    internal static IReadOnlyCollection<CourseSummaryDto> EnrolledCourses(IEnumerable<Course> courses, IReadOnlySet<Guid> enrolledCourseIds) =>
        courses
            .Where(c => enrolledCourseIds.Contains(c.Id))
            .OrderBy(c => c.Status == CourseStatus.Active ? 0 : 1)
            .Select(c => new CourseSummaryDto(c.Id, c.Name, c.Status, c.Monthlies.Count))
            .ToList();
}
