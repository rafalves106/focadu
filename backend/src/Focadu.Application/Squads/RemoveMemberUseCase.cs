using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Squads;

/// <summary>
/// Caso de uso: Owner remove um membro do proprio squad (Fase 24) - sem fluxo de aprovacao pra
/// remocao, o Owner age direto. "Nao encontrado" (nunca um erro de permissao distinto) tanto pra
/// quem pede sem ter squad quanto pra quem pede sem ser o Owner - mesmo padrao ja usado em todo
/// GetXxxUseCase que filtra por dono (ex: IWeeklyRepository.GetByIdAsync(id, userId)): nunca vaza
/// se o recurso existe pra quem nao tem permissao sobre ele.
/// </summary>
public class RemoveMemberUseCase
{
    private readonly ISquadRepository _squadRepository;
    private readonly IUnitOfWork _unitOfWork;

    public RemoveMemberUseCase(ISquadRepository squadRepository, IUnitOfWork unitOfWork)
    {
        _squadRepository = squadRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task ExecuteAsync(Guid requestingUserId, Guid targetUserId, CancellationToken cancellationToken = default)
    {
        if (targetUserId == requestingUserId)
            throw new ConflictException("dono_nao_pode_se_remover", "Use 'sair do squad' pra sair voce mesmo.");

        var requesterMembership = await _squadRepository.GetMembershipByUserIdAsync(requestingUserId, cancellationToken)
            ?? throw new NotFoundException("squad_nao_encontrado", "Voce nao esta em nenhum squad.");

        var squad = await _squadRepository.GetByIdAsync(requesterMembership.SquadId, cancellationToken);
        if (squad is null || squad.OwnerUserId != requestingUserId)
            throw new NotFoundException("squad_nao_encontrado", "Voce nao esta em nenhum squad.");

        var targetMembership = await _squadRepository.GetMembershipByUserIdAsync(targetUserId, cancellationToken);
        if (targetMembership is null || targetMembership.SquadId != squad.Id)
            throw new NotFoundException("membro_nao_encontrado", "Este usuario nao e membro do seu squad.");

        await _squadRepository.RemoveMembershipAsync(targetMembership, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
