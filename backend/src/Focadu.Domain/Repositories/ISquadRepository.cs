using Focadu.Domain.Squads;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia pro aggregate Squad + SquadMembership (Fase 24).</summary>
public interface ISquadRepository
{
    Task<Squad?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Squad?> GetByJoinCodeAsync(string joinCode, CancellationToken cancellationToken = default);

    Task AddAsync(Squad squad, CancellationToken cancellationToken = default);

    /// <summary>Squad sem nenhum membro (ultimo saiu) e deletado, nunca fica orfao (ver LeaveSquadUseCase).</summary>
    Task RemoveAsync(Squad squad, CancellationToken cancellationToken = default);

    /// <summary>No maximo 1 por usuario (1 squad ativo) - null se o usuario nao esta em nenhum squad agora.</summary>
    Task<SquadMembership?> GetMembershipByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Todos os membros de um squad, dono incluso (o dono tambem tem sua propria SquadMembership).</summary>
    Task<IReadOnlyCollection<SquadMembership>> GetMembersAsync(Guid squadId, CancellationToken cancellationToken = default);

    Task AddMembershipAsync(SquadMembership membership, CancellationToken cancellationToken = default);

    Task RemoveMembershipAsync(SquadMembership membership, CancellationToken cancellationToken = default);
}
