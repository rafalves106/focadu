using Focadu.Domain.Enums;

namespace Focadu.Application.Squads;

/// <summary>Status do pedido em texto pro frontend - mesmo estilo de SquadActivityDto.Type ("daily", "project"...).</summary>
internal static class SquadJoinRequestStatusName
{
    internal static string Of(SquadJoinRequestStatus status) => status switch
    {
        SquadJoinRequestStatus.Pending => "pending",
        SquadJoinRequestStatus.Accepted => "accepted",
        SquadJoinRequestStatus.Rejected => "rejected",
        SquadJoinRequestStatus.Cancelled => "cancelled",
        _ => "rejectionUndone",
    };
}
