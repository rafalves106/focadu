using Focadu.Domain.Repositories;

namespace Focadu.Application.Courses;

/// <summary>Caso de uso: listar todos os cursos (tela inicial, suporta a rota "/start" do frontend).</summary>
public class ListCoursesUseCase
{
    private readonly ICourseRepository _courseRepository;

    public ListCoursesUseCase(ICourseRepository courseRepository)
    {
        _courseRepository = courseRepository;
    }

    public async Task<IReadOnlyCollection<CourseSummaryDto>> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var courses = await _courseRepository.GetAllAsync(cancellationToken);

        return courses
            .Select(c => new CourseSummaryDto(c.Id, c.Name, c.Status, c.Monthlies.Count))
            .ToList();
    }
}
