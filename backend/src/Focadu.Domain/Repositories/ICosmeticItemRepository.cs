using Focadu.Domain.Cosmetics;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia pro catalogo de cosmeticos (Fase 17) - catalogo fixo via seed, sem autoria via Api nesta fase.</summary>
public interface ICosmeticItemRepository
{
    Task<IReadOnlyCollection<CosmeticItem>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<CosmeticItem?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task AddAsync(CosmeticItem item, CancellationToken cancellationToken = default);
}
