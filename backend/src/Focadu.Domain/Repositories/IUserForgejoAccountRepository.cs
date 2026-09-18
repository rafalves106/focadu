using Focadu.Domain.GitHosting;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia para o aggregate UserForgejoAccount - 1:1 com User, sempre criado sob demanda (lazy), mesmo padrao de IUserGemBalanceRepository.</summary>
public interface IUserForgejoAccountRepository
{
    Task<UserForgejoAccount?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task AddAsync(UserForgejoAccount account, CancellationToken cancellationToken = default);
}
