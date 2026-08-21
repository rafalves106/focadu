using Focadu.Domain.Gamification;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia para o aggregate UserStreak (Fase 14) - 1:1 com User, sempre criado sob demanda (lazy), nunca no registro.</summary>
public interface IUserStreakRepository
{
    Task<UserStreak?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task AddAsync(UserStreak streak, CancellationToken cancellationToken = default);
}
