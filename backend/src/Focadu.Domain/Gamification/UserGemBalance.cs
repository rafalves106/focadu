using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Policies;

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
    public int CreditDaily(DateOnly today) =>
        Credit(today, DailyGemAmount, DailyMonthlyCap, () => GemsFromDailiesThisMonth, v => GemsFromDailiesThisMonth = v);

    /// <summary>
    /// Bonus de Superacao (Fase 15): +2 Gems (EvaluationPolicy.ReinforcementBonusGems) por
    /// concluir uma Daily de reforco com TODAS as atividades aprovadas - substitui o CreditDaily
    /// normal (nunca os dois juntos, ver CompleteDailyUseCase), mas conta na MESMA categoria/cap
    /// de Dailies (20/mes) - nao ganhou cap proprio de proposito, manter a Fase 14 simples.
    /// </summary>
    public int CreditReinforcementBonus(DateOnly today) =>
        Credit(today, EvaluationPolicy.ReinforcementBonusGems, DailyMonthlyCap, () => GemsFromDailiesThisMonth, v => GemsFromDailiesThisMonth = v);

    /// <summary>+5 Gems por Weekly perfeita, respeitando o cap de 20/mes vindas de Weeklies.</summary>
    public int CreditWeekly(DateOnly today) =>
        Credit(today, WeeklyGemAmount, WeeklyMonthlyCap, () => GemsFromWeekliesThisMonth, v => GemsFromWeekliesThisMonth = v);

    /// <summary>+30 Gems por Monthly perfeito, respeitando o cap de 30/mes vindas de Monthly.</summary>
    public int CreditMonthly(DateOnly today) =>
        Credit(today, MonthlyGemAmount, MonthlyMonthlyCap, () => GemsFromMonthlyThisMonth, v => GemsFromMonthlyThisMonth = v);

    /// <summary>
    /// Gasta `amount` do saldo (Fase 17, Marketplace) - false e nao mexe em nada se o saldo for
    /// insuficiente. Gasto NUNCA mexe nos contadores mensais de cap (GemsFromDailiesThisMonth/
    /// etc) - caps controlam quanto se GANHA por mes, nao quanto se pode GASTAR do acumulado; sao
    /// sistemas independentes de proposito.
    /// </summary>
    public bool TrySpend(int amount)
    {
        if (amount <= 0)
            throw new DomainException("Valor a gastar deve ser maior que zero.");
        if (TotalGems < amount)
            return false;

        TotalGems -= amount;
        return true;
    }

    /// <summary>
    /// Credita `amount` na categoria informada, sem nunca ultrapassar `monthlyCap` (Fase 15:
    /// clampado, nao mais tudo-ou-nada - o Bonus de Superacao (+2) compartilha cap com o credito
    /// normal de Daily (+1), entao um usuario a 19/20 no mes pode legitimamente so receber +1 de
    /// um bonus de +2, nunca estourar o cap por 1). Devolve quanto foi creditado de verdade.
    /// </summary>
    private int Credit(DateOnly today, int amount, int monthlyCap, Func<int> getCategoryCounter, Action<int> setCategoryCounter)
    {
        ResetMonthlyCountersIfNeeded(today);

        var remaining = monthlyCap - getCategoryCounter();
        if (remaining <= 0) return 0;

        var credited = Math.Min(amount, remaining);
        setCategoryCounter(getCategoryCounter() + credited);
        TotalGems += credited;
        return credited;
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
