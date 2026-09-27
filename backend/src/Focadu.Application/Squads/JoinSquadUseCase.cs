using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;
using Focadu.Domain.Squads;

namespace Focadu.Application.Squads;

/// <summary>
/// Caso de uso: usar o codigo de convite de um squad. Desde a Fase 77 (decisao do dono, 26/09/2026)
/// ninguem entra direto: vira um pedido que o lider ou o colider aceita (SquadJoinRequest). Quem ja
/// foi recusado por este squad nao pode pedir de novo (ate a recusa ser desfeita); pedir pra outro
/// squad substitui o pedido anterior; pedir de novo pro mesmo squad devolve o pedido que ja esta aberto.
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

    public async Task<SquadJoinRequestDto> ExecuteAsync(Guid userId, string joinCode, CancellationToken cancellationToken = default)
    {
        if (await _squadRepository.GetMembershipByUserIdAsync(userId, cancellationToken) is not null)
            throw new ConflictException("ja_esta_em_squad", "Voce ja esta em um squad - saia antes de entrar em outro.");

        var squad = await _squadRepository.GetByJoinCodeAsync(joinCode.Trim(), cancellationToken)
            ?? throw new NotFoundException("codigo_invalido", "Codigo de squad invalido.");

        var now = DateTime.UtcNow;
        var requests = await _squadRepository.GetJoinRequestsByUserIdAsync(userId, cancellationToken);
        var (outcome, existing, toCancel) = SquadJoinRules.DecideJoin(requests, squad.Id, now);
        if (outcome == SquadJoinRules.JoinOutcome.Banned)
            throw new ConflictException("pedido_recusado", "Este squad recusou seu pedido - tenta outro codigo.");
        if (existing is not null)
            return SquadJoinRequestDto.From(existing, squad);

        foreach (var old in toCancel) old.Cancel(now);
        var request = new SquadJoinRequest(squad.Id, userId, now);
        await _squadRepository.AddJoinRequestAsync(request, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return SquadJoinRequestDto.From(request, squad);
    }
}

/// <summary>Um pedido visto por quem pediu (tela sem squad): pro squad tal, aguardando ou recusado.</summary>
/// <param name="Status">"pending" ou "rejected" (os outros nao aparecem pra quem pediu).</param>
public record SquadJoinRequestDto(Guid Id, Guid SquadId, string SquadName, string Status, DateTime CreatedAt, DateTime ExpiresAt)
{
    public static SquadJoinRequestDto From(SquadJoinRequest request, Squad squad) =>
        new(request.Id, squad.Id, squad.Name, SquadJoinRequestStatusName.Of(request.Status), request.CreatedAt, request.ExpiresAt);
}
