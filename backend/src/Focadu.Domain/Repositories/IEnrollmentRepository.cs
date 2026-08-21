using Focadu.Domain.Enrollments;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia para o aggregate Enrollment (Fase 13).</summary>
public interface IEnrollmentRepository
{
    Task<Enrollment?> GetByUserAndCourseAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default);

    /// <summary>Hoje, no maximo 1 por usuario (so existe 1 Course) - retorna lista pra ja preparar pra multiplos cursos no futuro (ver docs/fase-13).</summary>
    Task<IReadOnlyCollection<Enrollment>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task AddAsync(Enrollment enrollment, CancellationToken cancellationToken = default);
}
