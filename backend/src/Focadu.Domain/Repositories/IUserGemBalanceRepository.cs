using Focadu.Domain.Gamification;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia para o aggregate UserGemBalance (Fase 14) - 1:1 com User, sempre criado sob demanda (lazy), nunca no registro.</summary>
public interface IUserGemBalanceRepository
{
    Task<UserGemBalance?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task AddAsync(UserGemBalance balance, CancellationToken cancellationToken = default);
}
