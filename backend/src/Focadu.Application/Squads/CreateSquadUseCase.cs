using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;
using Focadu.Domain.Squads;

namespace Focadu.Application.Squads;

/// <summary>
/// Caso de uso: cria um squad novo, com o usuario logado como Owner e primeiro membro (Fase 24).
/// JoinCode NAO e gerado aqui - fica nulo ate a 1a vez que for pedido (lazy, ver
/// GetSquadRankingUseCase, mesmo padrao de GetReferralInfoUseCase).
/// </summary>
public class CreateSquadUseCase
{
    private readonly ISquadRepository _squadRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateSquadUseCase(ISquadRepository squadRepository, IUnitOfWork unitOfWork)
    {
        _squadRepository = squadRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<SquadDto> ExecuteAsync(Guid ownerUserId, string name, CancellationToken cancellationToken = default)
    {
        if (await _squadRepository.GetMembershipByUserIdAsync(ownerUserId, cancellationToken) is not null)
            throw new ConflictException("ja_esta_em_squad", "Voce ja esta em um squad - saia antes de criar outro.");

        var squad = new Squad(name, ownerUserId);
        await _squadRepository.AddAsync(squad, cancellationToken);
        await _squadRepository.AddMembershipAsync(new SquadMembership(squad.Id, ownerUserId), cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return SquadDto.From(squad);
    }
}

public record SquadDto(Guid Id, string Name, Guid OwnerUserId, Guid? CoLeaderUserId, DateTime CreatedAt)
{
    public static SquadDto From(Squad squad) => new(squad.Id, squad.Name, squad.OwnerUserId, squad.CoLeaderUserId, squad.CreatedAt);
}
