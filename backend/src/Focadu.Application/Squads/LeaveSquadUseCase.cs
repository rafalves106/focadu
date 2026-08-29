using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Squads;

/// <summary>
/// Caso de uso: usuario logado sai do proprio squad (Fase 24) - hard delete da SquadMembership
/// (ver comentario em SquadMembership). O Owner so pode sair sozinho (ultimo membro, o squad fica
/// orfao mas inerte - ninguem mais acha ele, GetMembershipByUserIdAsync nunca aponta pra ele de
/// novo) - com outros membros ainda dentro, sair exigiria decidir quem vira o novo Owner, uma
/// transferencia de posse fora do escopo desta fase (nenhuma outra regra alem de owner/member foi
/// pedida); bloqueado com uma mensagem clara em vez disso.
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
            var members = await _squadRepository.GetMembersAsync(squad.Id, cancellationToken);
            if (members.Count > 1)
                throw new ConflictException("dono_nao_pode_sair", "Remova todos os membros antes de sair do squad que voce criou.");
        }

        await _squadRepository.RemoveMembershipAsync(membership, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
