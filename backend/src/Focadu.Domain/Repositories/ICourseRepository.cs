using Focadu.Domain.Courses;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia para o aggregate Course.</summary>
public interface ICourseRepository
{
    Task<Course?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<Course>> GetAllAsync(CancellationToken cancellationToken = default);

    Task AddAsync(Course course, CancellationToken cancellationToken = default);
}
