using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Squads;

/// <summary>
/// Caso de uso: Owner promove um membro a Co-Leader, ou remove o Co-Leader atual (Fase 24b) -
/// targetUserId nulo limpa o cargo. Mesmo padrao "404 nao 403" de RemoveMemberUseCase pra quem
/// pede sem ter squad/sem ser o Owner.
/// </summary>
public class SetSquadCoLeaderUseCase
{
    private readonly ISquadRepository _squadRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SetSquadCoLeaderUseCase(ISquadRepository squadRepository, IUnitOfWork unitOfWork)
    {
        _squadRepository = squadRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task ExecuteAsync(Guid requestingUserId, Guid? targetUserId, CancellationToken cancellationToken = default)
    {
        var requesterMembership = await _squadRepository.GetMembershipByUserIdAsync(requestingUserId, cancellationToken)
            ?? throw new NotFoundException("squad_nao_encontrado", "Voce nao esta em nenhum squad.");

        var squad = await _squadRepository.GetByIdAsync(requesterMembership.SquadId, cancellationToken);
        if (squad is null || squad.OwnerUserId != requestingUserId)
            throw new NotFoundException("squad_nao_encontrado", "Voce nao esta em nenhum squad.");

        if (targetUserId is null)
        {
            squad.ClearCoLeader();
        }
        else
        {
            if (targetUserId == requestingUserId)
                throw new ConflictException("dono_nao_pode_ser_co_lider", "Voce ja e o lider - escolha outro membro pra co-lider.");

            var targetMembership = await _squadRepository.GetMembershipByUserIdAsync(targetUserId.Value, cancellationToken);
            if (targetMembership is null || targetMembership.SquadId != squad.Id)
                throw new NotFoundException("membro_nao_encontrado", "Este usuario nao e membro do seu squad.");

            squad.PromoteCoLeader(targetUserId.Value);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
