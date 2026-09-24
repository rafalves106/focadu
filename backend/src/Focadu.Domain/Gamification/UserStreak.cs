using Focadu.Domain.Common;

namespace Focadu.Domain.Gamification;

/// <summary>
/// Um intervalo de dias em que a ofensiva fica pausada (Fase 69): nem quebra nem cresce. Inclusivo
/// nas duas pontas. Hoje so existe um motivo: o Projeto Semanal aberto (ver StreakPauseWindows na
/// Application), quando o aluno nao tem nenhuma Daily pra fazer.
/// </summary>
public readonly record struct StreakPause(DateOnly From, DateOnly To)
{
    public bool Contains(DateOnly day) => day >= From && day <= To;
}

/// <summary>
/// Streak de dias consecutivos de um usuario (Fase 14) - 1:1 com User, criada sob demanda na
/// primeira conclusao de Daily (mesma logica lazy de UserGemBalance).
///
/// "Quebrar por inatividade" e deteccao de AUSENCIA de evento, nao presenca - sem job/cron no
/// projeto (mesmo principio ja usado pra DailyStatus.Locked, resolvido sob demanda comparando
/// datas na hora do acesso, ver Weekly.EvaluateDailyAccess). Aqui, a quebra e resolvida em 2
/// pontos: (a) na proxima RegisterCompletion, que reinicia a contagem em vez de incrementar se
/// detectar que ja tinha quebrado; (b) em qualquer LEITURA via CurrentStreakAsOf(today), que
/// nunca precisa esperar uma escrita futura pra reportar 0 corretamente - e a 1a leitura que
/// observa a quebra ja zera o campo persistido (CurrentStreak), junto com a marca BrokenAt.
///
/// Fase 69 (secret/rascunhos/ofensiva-conta-trabalho-no-projeto.md): a tolerancia de "fim de
/// semana nao quebra" saiu - o curso deixou de seguir o calendario. No lugar dela:
/// - Folga movel: 1 dia sem estudo a cada 7, em qualquer dia da semana, gasta sozinha (o 1o dia
///   sem estudo) e sem acumular. A ofensiva quebra com 2 dias sem estudo dentro de qualquer
///   janela de 7 dias - guardar a data da ultima folga (LastRestDate) basta pra saber isso.
/// - Pausa: dias dentro de um StreakPause nao contam como "sem estudo" (nem gastam a folga). Os
///   intervalos chegam de fora, calculados na hora da leitura a partir do estado dos projetos.
/// </summary>
public class UserStreak : Entity
{
    /// <summary>Fase 69: a folga movel volta a ficar disponivel 7 dias depois do dia em que foi usada.</summary>
    public const int RestWindowDays = 7;

    public Guid UserId { get; private set; }
    public int CurrentStreak { get; private set; }
    public int LongestStreak { get; private set; }
    public DateOnly? LastCompletedDate { get; private set; }

    /// <summary>Fase 69: o ultimo dia sem estudo coberto pela folga movel. Nulo = nunca usou.</summary>
    public DateOnly? LastRestDate { get; private set; }

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
    public void RegisterCompletion(DateOnly completionDate, IReadOnlyCollection<StreakPause>? pauses = null)
    {
        if (LastCompletedDate == completionDate) return;

        var missed = MissedDaysBefore(completionDate, pauses);
        if (IsBroken(missed))
        {
            CurrentStreak = 0;
            // Streak novo ja comecando - "voce perdeu o streak" deixa de fazer sentido, o usuario
            // ja fez exatamente o que a tela pediria.
            BrokenAt = null;
        }
        else if (missed.Count == 1)
        {
            LastRestDate = missed[0];
        }

        CurrentStreak++;
        LongestStreak = Math.Max(LongestStreak, CurrentStreak);
        LastCompletedDate = completionDate;
    }

    /// <summary>
    /// Streak "ao vivo": aplica a quebra por inatividade silenciosa antes de expor o valor, sem
    /// precisar de uma escrita real pra refletir isso (ver nota de design acima). Efeito colateral:
    /// na 1a leitura que observa uma quebra ainda nao registrada (CurrentStreak persistido > 0),
    /// marca <see cref="BrokenAt"/> e zera o CurrentStreak persistido - e assim que o endpoint de
    /// gamificacao sabe que precisa expor a tela "Streak Perdido" (Fase 10) uma vez so.
    ///
    /// Zerar aqui e o que garante o "uma vez so" (bug real, 23/09/2026): antes o CurrentStreak
    /// ficava com o valor antigo ate a proxima conclusao, e depois de <see cref="AcknowledgeBreak"/>
    /// limpar BrokenAt, a leitura seguinte via "quebrou + CurrentStreak > 0 + BrokenAt nulo" de novo
    /// e remarcava - o aviso voltava a cada abertura da tela de start.
    /// </summary>
    public int CurrentStreakAsOf(DateOnly today, IReadOnlyCollection<StreakPause>? pauses = null)
    {
        if (!IsBroken(MissedDaysBefore(today, pauses))) return CurrentStreak;

        if (CurrentStreak > 0)
        {
            BrokenAt ??= today;
            CurrentStreak = 0;
        }
        return 0;
    }

    /// <summary>
    /// Fase 69: a folga movel esta livre pra cobrir um dia sem estudo em <paramref name="day"/> -
    /// pra tela mostrar "folga disponivel". Leitura pura.
    /// </summary>
    public bool IsRestAvailableOn(DateOnly day) =>
        LastRestDate is not { } rest || day.DayNumber - rest.DayNumber >= RestWindowDays;

    /// <summary>Marca a quebra atual como vista - a tela "Streak Perdido" nao aparece de novo ate a proxima quebra real.</summary>
    public void AcknowledgeBreak() => BrokenAt = null;

    /// <summary>Dias sem estudo entre a ultima conclusao e <paramref name="day"/> (exclusivo nas duas pontas), fora das pausas.</summary>
    private List<DateOnly> MissedDaysBefore(DateOnly day, IReadOnlyCollection<StreakPause>? pauses)
    {
        var missed = new List<DateOnly>();
        if (LastCompletedDate is not { } last) return missed;

        for (var d = last.AddDays(1); d < day; d = d.AddDays(1))
        {
            if (pauses is null || !pauses.Any(p => p.Contains(d)))
                missed.Add(d);
        }
        return missed;
    }

    /// <summary>Quebra com 2+ dias sem estudo, ou com 1 dia quando a folga desse dia ja foi gasta nos 7 dias anteriores.</summary>
    private bool IsBroken(List<DateOnly> missed) =>
        missed.Count >= 2 || (missed.Count == 1 && !IsRestAvailableOn(missed[0]));
}
