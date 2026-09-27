using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Squads;

/// <summary>
/// Pedido pra entrar num squad (Fase 77, decisoes do dono em 26-27/09/2026, rascunho
/// secret/rascunhos/squad-aprovacao-reentrada.md): quem usa o codigo de convite nao entra direto - vira
/// um pedido que o lider ou o colider aceita ou recusa. Recusar bane a pessoa daquele squad ate alguem
/// desfazer a recusa. O pedido vence em <see cref="ExpiresAfterDays"/> dias, calculado na leitura (sem
/// cron): vencido nao aparece mais e a pessoa pode pedir de novo. Uma pessoa tem no maximo 1 pedido
/// pendente por vez (a Application cancela o anterior).
/// </summary>
public class SquadJoinRequest : Entity
{
    public const int ExpiresAfterDays = 7;

    public Guid SquadId { get; private set; }
    public Guid UserId { get; private set; }
    public SquadJoinRequestStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? DecidedAt { get; private set; }
    /// <summary>Lider/colider que aceitou, recusou ou desfez a recusa (nulo quando quem pediu cancelou).</summary>
    public Guid? DecidedByUserId { get; private set; }

    private SquadJoinRequest()
    {
    }

    public SquadJoinRequest(Guid squadId, Guid userId, DateTime createdAtUtc)
    {
        SquadId = squadId;
        UserId = userId;
        Status = SquadJoinRequestStatus.Pending;
        CreatedAt = createdAtUtc;
    }

    public DateTime ExpiresAt => CreatedAt.AddDays(ExpiresAfterDays);

    /// <summary>Pendente e ainda dentro do prazo.</summary>
    public bool IsOpen(DateTime nowUtc) => Status == SquadJoinRequestStatus.Pending && nowUtc < ExpiresAt;

    public void Accept(Guid byUserId, DateTime nowUtc) => Decide(SquadJoinRequestStatus.Accepted, byUserId, nowUtc);

    public void Reject(Guid byUserId, DateTime nowUtc) => Decide(SquadJoinRequestStatus.Rejected, byUserId, nowUtc);

    /// <summary>Quem pediu desistiu (ou o pedido foi substituido) - vale mesmo vencido, pra limpar.</summary>
    public void Cancel(DateTime nowUtc)
    {
        if (Status != SquadJoinRequestStatus.Pending)
            throw new DomainException("Este pedido ja foi decidido.", "pedido_ja_decidido");
        Status = SquadJoinRequestStatus.Cancelled;
        DecidedAt = nowUtc;
        DecidedByUserId = null;
    }

    public void UndoRejection(Guid byUserId, DateTime nowUtc)
    {
        if (Status != SquadJoinRequestStatus.Rejected)
            throw new DomainException("So da pra desfazer um pedido recusado.", "pedido_nao_recusado");
        Status = SquadJoinRequestStatus.RejectionUndone;
        DecidedAt = nowUtc;
        DecidedByUserId = byUserId;
    }

    private void Decide(SquadJoinRequestStatus status, Guid byUserId, DateTime nowUtc)
    {
        if (!IsOpen(nowUtc))
            throw new DomainException("Este pedido nao esta mais aberto.", "pedido_indisponivel");
        Status = status;
        DecidedAt = nowUtc;
        DecidedByUserId = byUserId;
    }
}
