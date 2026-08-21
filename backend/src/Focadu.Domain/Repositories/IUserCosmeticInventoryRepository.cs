using Focadu.Domain.Cosmetics;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia pro inventario de cosmeticos de um usuario (Fase 17) - registro permanente de posse, nunca removido.</summary>
public interface IUserCosmeticInventoryRepository
{
    Task<IReadOnlyCollection<UserCosmeticInventory>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<UserCosmeticInventory?> GetByUserAndItemAsync(Guid userId, Guid cosmeticItemId, CancellationToken cancellationToken = default);

    Task AddAsync(UserCosmeticInventory entry, CancellationToken cancellationToken = default);
}
