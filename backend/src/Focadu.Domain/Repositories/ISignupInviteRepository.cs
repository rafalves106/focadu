using Focadu.Domain.Users;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia para SignupInvite (Fase 93).</summary>
public interface ISignupInviteRepository
{
    Task<SignupInvite?> GetByCodeAsync(string code, CancellationToken cancellationToken = default);

    Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SignupInvite>> ListAsync(CancellationToken cancellationToken = default);

    Task AddAsync(SignupInvite invite, CancellationToken cancellationToken = default);
}
