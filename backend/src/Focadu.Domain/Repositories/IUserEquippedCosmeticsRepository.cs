using Focadu.Domain.Cosmetics;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia pro que um usuario tem equipado agora (Fase 17) - 1:1 com User, sempre criado sob demanda (lazy), nunca no registro.</summary>
public interface IUserEquippedCosmeticsRepository
{
    Task<UserEquippedCosmetics?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task AddAsync(UserEquippedCosmetics equipped, CancellationToken cancellationToken = default);
}
