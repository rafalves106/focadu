using Focadu.Domain.Enums;
using Focadu.Domain.Gamification;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Gamification;

/// <summary>
/// Fase 69 (secret/rascunhos/ofensiva-conta-trabalho-no-projeto.md): os intervalos em que a
/// ofensiva do aluno fica pausada - do dia seguinte a conclusao da ultima Daily de uma semana ate
/// a semana fechar (projeto avaliado + publicacao validada, que e quando a proxima semana libera),
/// no maximo <see cref="MaxPauseDays"/> dias. Nesse tempo o aluno nao tem nenhuma Daily pra fazer
/// (Weekly.RequiresProjectToUnlock/RequiresPublicationToUnlock trancam a proxima semana), entao
/// a ofensiva quebraria sem ele ter como evitar.
///
/// Calculado na hora da leitura a partir das Weeklies, sem estado novo (MESTRE: "tudo sob
/// demanda, sem cron"). Vale pra ofensiva inteira, de qualquer curso (decisao do dono: um projeto
/// aberto pausa mesmo com Daily disponivel em outro curso).
/// </summary>
public class StreakPauseWindows
{
    public const int MaxPauseDays = 14;

    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;

    public StreakPauseWindows(IEnrollmentRepository enrollmentRepository, IWeeklyRepository weeklyRepository)
    {
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
    }

    public async Task<IReadOnlyCollection<StreakPause>> ForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var weeklies = new List<Weekly>();
        foreach (var enrollment in await _enrollmentRepository.GetByUserIdAsync(userId, cancellationToken))
            weeklies.AddRange(await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken));

        return Compute(weeklies);
    }

    /// <summary>Puro, pra teste: um intervalo por semana com as Dailies originais todas concluidas.</summary>
    internal static IReadOnlyCollection<StreakPause> Compute(IEnumerable<Weekly> weeklies)
    {
        var pauses = new List<StreakPause>();
        foreach (var weekly in weeklies)
        {
            if (!weekly.AreDailiesComplete()) continue;

            var lastDaily = weekly.Dailies
                .Where(d => !d.IsReinforcement && d.CompletedAt.HasValue)
                .Max(d => d.CompletedAt!.Value);
            var start = LocalDate(lastDaily);
            var end = start.AddDays(MaxPauseDays);

            if (IsClosed(weekly))
            {
                // Semana ja fechada: a pausa vai ate o dia em que fechou. Projeto avaliado antes da
                // Fase 69 nao tem EvaluatedAt - sem saber quando fechou, nao ha pausa pra reconstruir
                // (ela ja passou e nao muda mais nada).
                var closedAt = new[] { weekly.Project?.EvaluatedAt, weekly.Publication?.ValidatedAt }.Max();
                if (closedAt is null) continue;
                var closed = LocalDate(closedAt.Value);
                if (closed < end) end = closed;
            }

            if (end > start)
                pauses.Add(new StreakPause(start.AddDays(1), end));
        }
        return pauses;
    }

    /// <summary>A pausa que cobre <paramref name="today"/>, se houver - pra tela mostrar "ofensiva pausada ate X".</summary>
    public static StreakPause? Covering(IReadOnlyCollection<StreakPause> pauses, DateOnly today) =>
        pauses.Where(p => p.Contains(today)).Select(p => (StreakPause?)p).FirstOrDefault();

    private static bool IsClosed(Weekly weekly) =>
        weekly.Project is { Status: WeeklyProjectStatus.Evaluated }
        && weekly.Publication is { Status: PublicationStatus.Validated };

    // CompletedAt/EvaluatedAt/ValidatedAt sao UTC; o dia da ofensiva e o dia local (mesma conversao
    // de Weekly.EvaluateDailyAccess e IClock.Today).
    private static DateOnly LocalDate(DateTime utc) => DateOnly.FromDateTime(utc.ToLocalTime());
}
