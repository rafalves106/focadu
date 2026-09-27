namespace Focadu.Domain.Enums;

/// <summary>Situacao de um pedido pra entrar num squad (Fase 77).</summary>
public enum SquadJoinRequestStatus
{
    Pending = 0,
    Accepted = 1,
    /// <summary>Recusado: a pessoa nao pode pedir de novo pra este squad (decisao do dono, 26/09/2026).</summary>
    Rejected = 2,
    /// <summary>Cancelado por quem pediu (ou substituido por outro pedido / criou um squad).</summary>
    Cancelled = 3,
    /// <summary>A recusa foi desfeita pelo lider ou colider - a pessoa volta a poder pedir.</summary>
    RejectionUndone = 4,
}
