using Focadu.Domain.Monthlies;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia para o aggregate Monthly.</summary>
public interface IMonthlyRepository
{
    Task<Monthly?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<Monthly>> GetByCourseIdAsync(Guid courseId, CancellationToken cancellationToken = default);

    Task AddAsync(Monthly monthly, CancellationToken cancellationToken = default);
}
