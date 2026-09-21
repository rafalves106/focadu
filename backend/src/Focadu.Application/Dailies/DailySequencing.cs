using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Dailies;

/// <summary>
/// Resolve qual Daily "vem a seguir" cruzando TODAS as Weeklies da matricula - uma Weekly sozinha
/// so enxerga as proprias Dailies, entao essa comparacao nao da pra fazer dentro do dominio (ver
/// Weekly.EvaluateDailyAccess). Fase 38b: substitui a resolucao antiga por Daily.Date (calendario,
/// fixado de uma vez so na matricula) - "a Daily de hoje" virou "a Daily nao concluida com o menor
/// DayNumber em toda a matricula", nunca mais calendario (ver GetTodayUseCase pro bug motivador).
/// Reforco fica sempre de fora: nao disputa a sequencia principal, acesso e sempre por link
/// explicito (Daily.ReinforcementDailyId).
/// </summary>
internal static class DailySequencing
{
    /// <summary>Daily InProgress em qualquer Weekly da matricula, se houver - tem sempre prioridade sobre a proxima da sequencia (ver GetTodayUseCase).</summary>
    public static Daily? FindInProgress(IEnumerable<Weekly> weeklies) =>
        weeklies.SelectMany(w => w.Dailies).FirstOrDefault(d => d.Status == DailyStatus.InProgress);

    /// <summary>A Daily nao-reforco de menor DayNumber que ainda nao foi concluida, em toda a matricula.</summary>
    public static Daily? FindNext(IEnumerable<Weekly> weeklies) =>
        weeklies
            .SelectMany(w => w.Dailies)
            .Where(d => !d.IsReinforcement && d.Status != DailyStatus.Completed)
            .OrderBy(d => d.DayNumber)
            .FirstOrDefault();

    public static bool IsNext(IEnumerable<Weekly> weeklies, Guid dailyId) =>
        FindNext(weeklies)?.Id == dailyId;

    /// <summary>
    /// Fase 54: as Dailies de todas as OUTRAS Weeklies da matricula - o que Weekly.
    /// EvaluateDailyAccess precisa pra aplicar "1 Daily por dia" e "1 em andamento por vez" na
    /// matricula inteira (uma Weekly sozinha so enxerga as proprias Dailies; bug real,
    /// 21/09/2026: concluir a Daily 5 da Semana 1 nao impedia abrir a Daily 6 da Semana 2 no mesmo dia).
    /// </summary>
    public static IReadOnlyCollection<Daily> DailiesOfOtherWeeklies(IEnumerable<Weekly> weeklies, Weekly weekly) =>
        weeklies.Where(w => w.Id != weekly.Id).SelectMany(w => w.Dailies).ToList();

    /// <summary>A Weekly imediatamente anterior a <paramref name="weekly"/> na matricula (maior Number menor que o dela), se houver.</summary>
    public static Weekly? FindPreviousWeekly(IEnumerable<Weekly> weeklies, Weekly weekly) =>
        weeklies
            .Where(w => w.Number < weekly.Number)
            .OrderByDescending(w => w.Number)
            .FirstOrDefault();

    /// <summary>
    /// A Weekly anterior a <paramref name="weekly"/> que ainda nao "fechou" e por isso segura a
    /// entrada nela - projeto semanal nao avaliado ou, depois dele, publicacao nao validada
    /// (Weekly.RequiresProjectToUnlock / RequiresPublicationToUnlock). Null = pode entrar.
    /// </summary>
    public static Weekly? FindPendingClosureBefore(IEnumerable<Weekly> weeklies, Weekly weekly)
    {
        var previous = FindPreviousWeekly(weeklies, weekly);
        return previous is not null && (previous.RequiresProjectToUnlock() || previous.RequiresPublicationToUnlock())
            ? previous
            : null;
    }
}
