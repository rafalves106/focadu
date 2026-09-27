using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Squads;

/// <summary>
/// Caso de uso: o pedido que a pessoa sem squad ve (Fase 77) - aguardando ou recusado; nulo quando nao
/// ha nada pra mostrar (nunca pediu, vencido, cancelado, aceito).
/// </summary>
public class GetMySquadJoinRequestUseCase
{
    private readonly ISquadRepository _squadRepository;

    public GetMySquadJoinRequestUseCase(ISquadRepository squadRepository)
    {
        _squadRepository = squadRepository;
    }

    public async Task<SquadJoinRequestDto?> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var visible = SquadJoinRules.Visible(await _squadRepository.GetJoinRequestsByUserIdAsync(userId, cancellationToken), DateTime.UtcNow);
        if (visible is null) return null;
        var squad = await _squadRepository.GetByIdAsync(visible.SquadId, cancellationToken);
        return squad is null ? null : SquadJoinRequestDto.From(visible, squad);
    }
}

/// <summary>Caso de uso: quem pediu desiste do pedido aberto (Fase 77) - idempotente.</summary>
public class CancelMySquadJoinRequestUseCase
{
    private readonly ISquadRepository _squadRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CancelMySquadJoinRequestUseCase(ISquadRepository squadRepository, IUnitOfWork unitOfWork)
    {
        _squadRepository = squadRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var pending = (await _squadRepository.GetJoinRequestsByUserIdAsync(userId, cancellationToken))
            .Where(r => r.Status == Domain.Enums.SquadJoinRequestStatus.Pending).ToList();
        if (pending.Count == 0) return;
        foreach (var request in pending) request.Cancel(now);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
