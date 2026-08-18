namespace Focadu.Domain.Enums;

/// <summary>Situação de uma Daily no fluxo diário de estudo.</summary>
public enum DailyStatus
{
    Locked = 0,
    Available = 1,
    InProgress = 2,
    Completed = 3
}
