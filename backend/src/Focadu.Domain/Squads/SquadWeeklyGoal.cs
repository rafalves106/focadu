namespace Focadu.Domain.Squads;

/// <summary>
/// Meta da semana do squad (Fase 72, aprovada pelo dono em 24/09/2026): Dailies concluidas somadas de
/// todos os membros, de segunda a domingo. A meta cresce com o squad - 5 por membro deixa uma folga
/// sobre as 6 Dailies da semana (Fase 69). A recompensa em Gems por bater a meta ainda NAO existe: o
/// valor sera decidido depois pelo dono, entao nada e creditado por enquanto.
/// </summary>
public static class SquadWeeklyGoal
{
    public const int DailiesPerMember = 5;

    public static int Target(int memberCount) => Math.Max(1, memberCount) * DailiesPerMember;

    /// <summary>Segunda-feira da semana de <paramref name="day"/> (a semana da meta vai de segunda a domingo).</summary>
    public static DateOnly WeekStart(DateOnly day) => day.AddDays(-(((int)day.DayOfWeek + 6) % 7));
}
