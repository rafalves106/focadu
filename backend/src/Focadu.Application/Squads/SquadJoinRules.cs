using Focadu.Domain.Enums;
using Focadu.Domain.Squads;

namespace Focadu.Application.Squads;

/// <summary>
/// Regras puras dos pedidos de entrada (Fase 77), fora dos casos de uso pra testar sem repositorio
/// (mesmo criterio de LeaveSquadUseCase.ResolveSuccessor).
/// </summary>
internal static class SquadJoinRules
{
    internal enum JoinOutcome { AlreadyRequested, Banned, Create }

    /// <summary>
    /// O que fazer quando alguem usa o codigo de um squad, dado o historico de pedidos dessa pessoa:
    /// recusado (e nao desfeito) pra este squad = banido; pedido aberto pra este squad = devolve o mesmo;
    /// senao cria um novo e cancela o pedido aberto pra outro squad (1 pedido por vez).
    /// </summary>
    internal static (JoinOutcome Outcome, SquadJoinRequest? Existing, IReadOnlyList<SquadJoinRequest> ToCancel) DecideJoin(
        IReadOnlyCollection<SquadJoinRequest> userRequests, Guid squadId, DateTime nowUtc)
    {
        var forSquad = userRequests.Where(r => r.SquadId == squadId).OrderByDescending(r => r.CreatedAt).ToList();
        if (forSquad.Any(r => r.Status == SquadJoinRequestStatus.Rejected))
            return (JoinOutcome.Banned, null, []);
        var open = forSquad.FirstOrDefault(r => r.IsOpen(nowUtc));
        if (open is not null)
            return (JoinOutcome.AlreadyRequested, open, []);
        var toCancel = userRequests.Where(r => r.Status == SquadJoinRequestStatus.Pending).ToList();
        return (JoinOutcome.Create, null, toCancel);
    }

    /// <summary>Lider ou colider - quem decide os pedidos.</summary>
    internal static bool CanManage(Squad squad, Guid userId) => squad.OwnerUserId == userId || squad.CoLeaderUserId == userId;

    /// <summary>
    /// O pedido que a pessoa ve na tela sem squad: o mais recente, se estiver aberto (aguardando) ou
    /// recusado; vencido, cancelado, aceito ou com a recusa desfeita nao mostram nada.
    /// </summary>
    internal static SquadJoinRequest? Visible(IReadOnlyCollection<SquadJoinRequest> userRequests, DateTime nowUtc)
    {
        var latest = userRequests.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
        if (latest is null) return null;
        return latest.IsOpen(nowUtc) || latest.Status == SquadJoinRequestStatus.Rejected ? latest : null;
    }
}
