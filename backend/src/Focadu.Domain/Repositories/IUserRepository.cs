using Focadu.Domain.Users;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia para o aggregate User (Fase 12).</summary>
public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Fase 17: resolve quem indicou (RegisterUserUseCase) - null se o codigo informado nao existe.</summary>
    Task<User?> GetByReferralCodeAsync(string referralCode, CancellationToken cancellationToken = default);

    /// <summary>Fase 17, badge Founder: true se `userId` esta entre os `count` primeiros User registrados (ordem total deterministica por CreatedAt, empate por Id).</summary>
    Task<bool> IsAmongFirstRegisteredAsync(Guid userId, int count, CancellationToken cancellationToken = default);

    /// <summary>Fase 94: quem tem o papel (comando `admin listar`).</summary>
    Task<IReadOnlyList<User>> ListByRoleAsync(Enums.UserRole role, CancellationToken cancellationToken = default);

    /// <summary>Fase 97: conta desativada pelo admin? Consulta leve (sem tracking) feita a cada chamada autenticada; usuario inexistente conta como desativado.</summary>
    Task<bool> IsDisabledAsync(Guid id, CancellationToken cancellationToken = default);

    Task AddAsync(User user, CancellationToken cancellationToken = default);
}
