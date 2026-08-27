using Focadu.Domain.Common;

namespace Focadu.Domain.Gamification;

/// <summary>
/// Streak de dias consecutivos de um usuario (Fase 14) - 1:1 com User, criada sob demanda na
/// primeira conclusao de Daily (mesma logica lazy de UserGemBalance).
///
/// "Quebrar por inatividade" e deteccao de AUSENCIA de evento, nao presenca - sem job/cron no
/// projeto (mesmo principio ja usado pra DailyStatus.Locked, resolvido sob demanda comparando
/// datas na hora do acesso, ver Weekly.EvaluateDailyAccess). Aqui, a quebra e resolvida em 2
/// pontos: (a) na proxima RegisterCompletion, que reinicia a contagem em vez de incrementar se
/// detectar que ja tinha quebrado; (b) em qualquer LEITURA via CurrentStreakAsOf(today), que
/// nunca precisa esperar uma escrita futura pra reportar 0 corretamente - o campo persistido
/// (CurrentStreak) pode ficar "desatualizado" (nao reescrito) ate a proxima conclusao real, mas
/// nenhuma leitura enxerga esse valor stale.
///
/// ponytail: a janela de tolerancia usa "1 dia util" como proxy pro calendario real do curriculo
/// (fins de semana nao quebram), nao uma consulta real as Dailies agendadas do usuario - um hiato
/// legitimo maior que 1 dia util no curriculo (ex: gap entre Weeklies) quebraria o streak
/// incorretamente. Upgrade natural, se isso importar: checar contra as datas de Daily agendadas de
/// verdade (IWeeklyRepository) em vez do heuristico de dia util.
/// </summary>
public class UserStreak : Entity
{
    public Guid UserId { get; private set; }
    public int CurrentStreak { get; private set; }
    public int LongestStreak { get; private set; }
    public DateOnly? LastCompletedDate { get; private set; }

    /// <summary>
    /// Data em que uma quebra (streak > 0 virando 0) foi observada pela primeira vez e ainda nao
    /// foi reconhecida pelo usuario (Fase 10, tela "Streak Perdido") - setada como efeito colateral
    /// de <see cref="CurrentStreakAsOf"/>, o mesmo lugar que ja resolvia a quebra sob demanda (ver
    /// nota de design da classe). Null = nada pra mostrar (nunca quebrou, ja foi reconhecida via
    /// <see cref="AcknowledgeBreak"/>, ou o usuario ja recomecou um streak novo desde entao).
    /// </summary>
    public DateOnly? BrokenAt { get; private set; }

    private UserStreak()
    {
    }

    public UserStreak(Guid userId)
    {
        UserId = userId;
    }

    /// <summary>
    /// Registra a conclusao de uma Daily no dia correto (Date == hoje) - so chamada na primeira
    /// conclusao de uma Daily, nunca em replay (replay nao afeta streak). Idempotente pra 2
    /// conclusoes na mesma data (ex: Daily original + reforco no mesmo dia) - a 2a chamada com a
    /// mesma data e um no-op, nao soma streak duas vezes.
    /// </summary>
    public void RegisterCompletion(DateOnly completionDate)
    {
        if (LastCompletedDate == completionDate) return;

        if (HasBrokenAsOf(completionDate))
        {
            CurrentStreak = 0;
            // Streak novo ja comecando - "voce perdeu o streak" deixa de fazer sentido, o usuario
            // ja fez exatamente o que a tela pediria.
            BrokenAt = null;
        }

        CurrentStreak++;
        LongestStreak = Math.Max(LongestStreak, CurrentStreak);
        LastCompletedDate = completionDate;
    }

    /// <summary>
    /// Streak "ao vivo": aplica a quebra por inatividade silenciosa antes de expor o valor, sem
    /// precisar de uma escrita real pra refletir isso (ver nota de design acima). Efeito colateral:
    /// na 1a leitura que observa uma quebra ainda nao registrada (CurrentStreak persistido > 0),
    /// marca <see cref="BrokenAt"/> - e assim que o endpoint de gamificacao sabe que precisa expor
    /// a tela "Streak Perdido" (Fase 10) uma vez, sem repeti-la em leituras seguintes.
    /// </summary>
    public int CurrentStreakAsOf(DateOnly today)
    {
        if (!HasBrokenAsOf(today)) return CurrentStreak;

        if (CurrentStreak > 0 && BrokenAt is null) BrokenAt = today;
        return 0;
    }

    /// <summary>Marca a quebra atual como vista - a tela "Streak Perdido" nao aparece de novo ate a proxima quebra real.</summary>
    public void AcknowledgeBreak() => BrokenAt = null;

    private bool HasBrokenAsOf(DateOnly asOfDate) =>
        LastCompletedDate is { } last && NextBusinessDay(last) < asOfDate;

    private static DateOnly NextBusinessDay(DateOnly date) => (date.AddDays(1)).DayOfWeek switch
    {
        DayOfWeek.Saturday => date.AddDays(3),
        DayOfWeek.Sunday => date.AddDays(2),
        _ => date.AddDays(1),
    };
}
