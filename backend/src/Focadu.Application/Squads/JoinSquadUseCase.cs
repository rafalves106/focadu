using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;
using Focadu.Domain.Squads;

namespace Focadu.Application.Squads;

/// <summary>
/// Caso de uso: entra num squad existente via JoinCode (Fase 24) - sem fluxo de aprovacao, quem
/// tem o codigo entra direto. Mesmo tratamento de codigo invalido de ReferralCode/RegisterUserUseCase
/// (so, aqui, um codigo invalido bloqueia a acao - entrar num squad e uma acao explicita do
/// usuario, diferente de "referralCode opcional no registro").
/// </summary>
public class JoinSquadUseCase
{
    private readonly ISquadRepository _squadRepository;
    private readonly IUnitOfWork _unitOfWork;

    public JoinSquadUseCase(ISquadRepository squadRepository, IUnitOfWork unitOfWork)
    {
        _squadRepository = squadRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<SquadDto> ExecuteAsync(Guid userId, string joinCode, CancellationToken cancellationToken = default)
    {
        if (await _squadRepository.GetMembershipByUserIdAsync(userId, cancellationToken) is not null)
            throw new ConflictException("ja_esta_em_squad", "Voce ja esta em um squad - saia antes de entrar em outro.");

        var squad = await _squadRepository.GetByJoinCodeAsync(joinCode.Trim(), cancellationToken)
            ?? throw new NotFoundException("codigo_invalido", "Codigo de squad invalido.");

        await _squadRepository.AddMembershipAsync(new SquadMembership(squad.Id, userId), cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return SquadDto.From(squad);
    }
}
