using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;
using Focadu.Domain.Squads;

namespace Focadu.Application.Squads;

/// <summary>
/// Caso de uso: usuario logado sai do proprio squad (Fase 24, sucessao na Fase 24b) - hard delete
/// da SquadMembership (ver comentario em SquadMembership). Membro comum: so sai, e se era o
/// Co-Leader o cargo esvazia (Squad.ClearCoLeaderIfMatches). Owner com outros membros dentro: a
/// lideranca e transferida (referencia Clash of Clans) - Co-Leader primeiro, senao o membro com
/// SquadMembership.JoinedAt mais antigo. Owner sozinho: o squad e deletado junto (nunca fica
/// orfao - antes disso, o squad so ficava inerte pra sempre, ver docs/fase-24).
/// </summary>
public class LeaveSquadUseCase
{
    private readonly ISquadRepository _squadRepository;
    private readonly IUnitOfWork _unitOfWork;

    public LeaveSquadUseCase(ISquadRepository squadRepository, IUnitOfWork unitOfWork)
    {
        _squadRepository = squadRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var membership = await _squadRepository.GetMembershipByUserIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("squad_nao_encontrado", "Voce nao esta em nenhum squad.");

        var squad = await _squadRepository.GetByIdAsync(membership.SquadId, cancellationToken)
            ?? throw new NotFoundException("squad_nao_encontrado", "Voce nao esta em nenhum squad.");

        if (squad.OwnerUserId == userId)
        {
            var remaining = (await _squadRepository.GetMembersAsync(squad.Id, cancellationToken))
                .Where(m => m.UserId != userId)
                .ToList();

            if (remaining.Count == 0)
            {
                await _squadRepository.RemoveMembershipAsync(membership, cancellationToken);
                await _squadRepository.RemoveAsync(squad, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                return;
            }

            squad.TransferOwnership(ResolveSuccessor(remaining, squad.CoLeaderUserId));
        }
        else
        {
            squad.ClearCoLeaderIfMatches(userId);
        }

        await _squadRepository.RemoveMembershipAsync(membership, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Logica pura de sucessao (Fase 24b, ver comentario da classe) - `remaining` nunca vazio (chamador ja tratou esse caso separadamente).</summary>
    internal static Guid ResolveSuccessor(IReadOnlyCollection<SquadMembership> remaining, Guid? coLeaderUserId) =>
        (remaining.FirstOrDefault(m => m.UserId == coLeaderUserId) ?? remaining.OrderBy(m => m.JoinedAt).First()).UserId;
}
