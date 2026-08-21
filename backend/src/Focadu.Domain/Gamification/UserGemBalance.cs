using Focadu.Domain.Common;

namespace Focadu.Domain.Gamification;

/// <summary>
/// Saldo de Gems de um usuario (Fase 14) - 1:1 com User, criada sob demanda na primeira conclusao
/// que gera Gems (lazy, ver GamificationCreditor - evita tocar em RegisterUserUseCase so pra criar
/// uma linha vazia que a maioria dos usuarios pode nunca precisar no mesmo dia do registro).
/// Cap mensal por categoria (Dailies/Weeklies/Monthly), resetado quando o mes calendario muda -
/// "mes" aqui e sempre Year/Month de `today` (parametro explicito, nunca IClock injetado no
/// dominio - mesmo padrao de Weekly.EvaluateDailyAccess/StartOrResumeDaily).
/// </summary>
public class UserGemBalance : Entity
{
    public const int DailyGemAmount = 1;
    public const int WeeklyGemAmount = 5;
    public const int MonthlyGemAmount = 30;

    public const int DailyMonthlyCap = 20;
    public const int WeeklyMonthlyCap = 20;
    public const int MonthlyMonthlyCap = 30;

    public Guid UserId { get; private set; }
    public int TotalGems { get; private set; }
    public int GemsFromDailiesThisMonth { get; private set; }
    public int GemsFromWeekliesThisMonth { get; private set; }
    public int GemsFromMonthlyThisMonth { get; private set; }

    /// <summary>Primeiro dia do mes calendario corrente (Year/Month de "today" na ultima escrita) - so pra saber quando os 3 contadores acima precisam zerar.</summary>
    public DateOnly CurrentMonthPeriod { get; private set; }

    private UserGemBalance()
    {
    }

    public UserGemBalance(Guid userId, DateOnly today)
    {
        UserId = userId;
        CurrentMonthPeriod = FirstDayOf(today);
    }

    /// <summary>+1 Gem por Daily completa pela primeira vez, respeitando o cap de 20/mes vindas de Dailies. Retorna quanto foi creditado de verdade (0 se o cap ja foi atingido).</summary>
    public int CreditDaily(DateOnly today)
    {
        ResetMonthlyCountersIfNeeded(today);
        if (GemsFromDailiesThisMonth >= DailyMonthlyCap) return 0;

        GemsFromDailiesThisMonth += DailyGemAmount;
        TotalGems += DailyGemAmount;
        return DailyGemAmount;
    }

    /// <summary>+5 Gems por Weekly perfeita, respeitando o cap de 20/mes vindas de Weeklies.</summary>
    public int CreditWeekly(DateOnly today)
    {
        ResetMonthlyCountersIfNeeded(today);
        if (GemsFromWeekliesThisMonth >= WeeklyMonthlyCap) return 0;

        GemsFromWeekliesThisMonth += WeeklyGemAmount;
        TotalGems += WeeklyGemAmount;
        return WeeklyGemAmount;
    }

    /// <summary>+30 Gems por Monthly perfeito, respeitando o cap de 30/mes vindas de Monthly.</summary>
    public int CreditMonthly(DateOnly today)
    {
        ResetMonthlyCountersIfNeeded(today);
        if (GemsFromMonthlyThisMonth >= MonthlyMonthlyCap) return 0;

        GemsFromMonthlyThisMonth += MonthlyGemAmount;
        TotalGems += MonthlyGemAmount;
        return MonthlyGemAmount;
    }

    private void ResetMonthlyCountersIfNeeded(DateOnly today)
    {
        var period = FirstDayOf(today);
        if (period == CurrentMonthPeriod) return;

        CurrentMonthPeriod = period;
        GemsFromDailiesThisMonth = 0;
        GemsFromWeekliesThisMonth = 0;
        GemsFromMonthlyThisMonth = 0;
    }

    private static DateOnly FirstDayOf(DateOnly date) => new(date.Year, date.Month, 1);
}
