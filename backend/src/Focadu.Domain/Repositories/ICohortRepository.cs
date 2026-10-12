using Focadu.Domain.Users;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia para Cohort (turma, Fase 96).</summary>
public interface ICohortRepository
{
    Task<Cohort?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Cohort>> ListAsync(CancellationToken cancellationToken = default);

    Task AddAsync(Cohort cohort, CancellationToken cancellationToken = default);
}
