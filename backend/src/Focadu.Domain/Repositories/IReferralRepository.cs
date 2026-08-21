using Focadu.Domain.Referrals;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia pro sistema de indicacao (Fase 17).</summary>
public interface IReferralRepository
{
    /// <summary>No maximo 1 por usuario indicado (indice unico) - null se este usuario nunca foi indicado por ninguem.</summary>
    Task<Referral?> GetByReferredUserIdAsync(Guid referredUserId, CancellationToken cancellationToken = default);

    /// <summary>Todas as indicacoes feitas por este usuario (confirmadas ou nao) - GetUserBadgesUseCase filtra as confirmadas em memoria.</summary>
    Task<IReadOnlyCollection<Referral>> GetByReferrerUserIdAsync(Guid referrerUserId, CancellationToken cancellationToken = default);

    Task AddAsync(Referral referral, CancellationToken cancellationToken = default);
}
