using Focadu.Domain.Repositories;

namespace Focadu.Application.Enrollments;

/// <summary>
/// Caso de uso: lista as matriculas do usuario logado (Fase 13) - hoje no maximo 1 (so existe 1
/// Course), mas devolve como lista ja preparado pro futuro. Usado pelo frontend pra decidir se
/// redireciona pra /selecionar-curso (lista vazia) ou /start (lista nao vazia).
/// </summary>
public class GetMyEnrollmentsUseCase
{
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly ICourseRepository _courseRepository;

    public GetMyEnrollmentsUseCase(IEnrollmentRepository enrollmentRepository, ICourseRepository courseRepository)
    {
        _enrollmentRepository = enrollmentRepository;
        _courseRepository = courseRepository;
    }

    public async Task<IReadOnlyCollection<EnrollmentDto>> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var enrollments = await _enrollmentRepository.GetByUserIdAsync(userId, cancellationToken);
        var dtos = new List<EnrollmentDto>();

        foreach (var enrollment in enrollments)
        {
            var course = await _courseRepository.GetByIdAsync(enrollment.CourseId, cancellationToken);
            dtos.Add(new EnrollmentDto(enrollment.Id, enrollment.CourseId, course?.Name ?? string.Empty, enrollment.EnrolledAt));
        }

        return dtos;
    }
}
