using Focadu.Application.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Courses;

/// <summary>
/// Caso de uso: estrutura curricular de um curso (Course -> Monthly -> WeeklyTemplate), sem exigir
/// matricula (Fase 13b) - usado por `/admin/conteudo` pra navegar ate uma WeeklyTemplate e curar
/// CuratedContent, sem depender de Enrollment/Weekly-instancia como GetCourseDetailUseCase exige.
/// Reaproveita ICourseRepository.GetByIdAsync (ja traz Monthlies.WeeklyTemplates, ver
/// CourseRepository) - so exige login (RequireAuthorization), igual /curated-content.
/// </summary>
public class GetCourseCurriculumUseCase
{
    private readonly ICourseRepository _courseRepository;

    public GetCourseCurriculumUseCase(ICourseRepository courseRepository)
    {
        _courseRepository = courseRepository;
    }

    public async Task<CourseCurriculumDto> ExecuteAsync(Guid courseId, CancellationToken cancellationToken = default)
    {
        var course = await _courseRepository.GetByIdAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("curso_nao_encontrado", "Curso nao encontrado.");

        var monthlyDtos = course.Monthlies
            .OrderBy(m => m.Number)
            .Select(m => new MonthlyCurriculumDto(
                m.Id, m.Number, m.Title,
                m.WeeklyTemplates.OrderBy(w => w.Number)
                    .Select(w => new WeeklyTemplateSummaryDto(w.Id, w.Number, w.Title, w.Theme))
                    .ToList()))
            .ToList();

        return new CourseCurriculumDto(course.Id, course.Name, monthlyDtos);
    }
}

public record CourseCurriculumDto(Guid Id, string Name, IReadOnlyCollection<MonthlyCurriculumDto> Monthlies);

public record MonthlyCurriculumDto(Guid Id, int Number, string Title, IReadOnlyCollection<WeeklyTemplateSummaryDto> WeeklyTemplates);

public record WeeklyTemplateSummaryDto(Guid Id, int Number, string Title, string? Theme);
