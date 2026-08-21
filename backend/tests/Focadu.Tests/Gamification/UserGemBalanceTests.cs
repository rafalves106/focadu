using Focadu.Domain.Gamification;
using Xunit;

namespace Focadu.Tests.Gamification;

public class UserGemBalanceTests
{
    private static readonly DateOnly Today = new(2026, 8, 21);

    [Fact]
    public void CreditDaily_AddsOneGem()
    {
        var balance = new UserGemBalance(Guid.NewGuid(), Today);

        var earned = balance.CreditDaily(Today);

        Assert.Equal(1, earned);
        Assert.Equal(1, balance.TotalGems);
        Assert.Equal(1, balance.GemsFromDailiesThisMonth);
    }

    [Fact]
    public void CreditWeekly_AddsFiveGems()
    {
        var balance = new UserGemBalance(Guid.NewGuid(), Today);

        var earned = balance.CreditWeekly(Today);

        Assert.Equal(5, earned);
        Assert.Equal(5, balance.TotalGems);
    }

    [Fact]
    public void CreditMonthly_AddsThirtyGems()
    {
        var balance = new UserGemBalance(Guid.NewGuid(), Today);

        var earned = balance.CreditMonthly(Today);

        Assert.Equal(30, earned);
        Assert.Equal(30, balance.TotalGems);
    }

    [Fact]
    public void CreditDaily_StopsCreditingAfterMonthlyCap()
    {
        var balance = new UserGemBalance(Guid.NewGuid(), Today);

        for (var i = 0; i < UserGemBalance.DailyMonthlyCap; i++)
        {
            balance.CreditDaily(Today);
        }

        Assert.Equal(UserGemBalance.DailyMonthlyCap, balance.TotalGems);

        var earnedAfterCap = balance.CreditDaily(Today);

        Assert.Equal(0, earnedAfterCap);
        Assert.Equal(UserGemBalance.DailyMonthlyCap, balance.TotalGems);
    }

    [Fact]
    public void Caps_AreIndependentPerCategory()
    {
        var balance = new UserGemBalance(Guid.NewGuid(), Today);

        for (var i = 0; i < UserGemBalance.DailyMonthlyCap; i++)
        {
            balance.CreditDaily(Today);
        }

        // Dailies bateu o cap - Weekly/Monthly continuam creditando normalmente.
        var weeklyEarned = balance.CreditWeekly(Today);
        var monthlyEarned = balance.CreditMonthly(Today);

        Assert.Equal(5, weeklyEarned);
        Assert.Equal(30, monthlyEarned);
        Assert.Equal(UserGemBalance.DailyMonthlyCap + 5 + 30, balance.TotalGems);
    }

    [Fact]
    public void MonthlyCounters_ResetWhenCalendarMonthChanges()
    {
        var balance = new UserGemBalance(Guid.NewGuid(), Today);
        for (var i = 0; i < UserGemBalance.DailyMonthlyCap; i++)
        {
            balance.CreditDaily(Today);
        }

        var nextMonth = new DateOnly(Today.Year, Today.Month, 1).AddMonths(1);
        var earnedNextMonth = balance.CreditDaily(nextMonth);

        Assert.Equal(1, earnedNextMonth);
        Assert.Equal(1, balance.GemsFromDailiesThisMonth);
        Assert.Equal(UserGemBalance.DailyMonthlyCap + 1, balance.TotalGems);
    }

    // Fase 15: CreditReinforcementBonus (Bonus de Superacao).

    [Fact]
    public void CreditReinforcementBonus_AddsTwoGems()
    {
        var balance = new UserGemBalance(Guid.NewGuid(), Today);

        var earned = balance.CreditReinforcementBonus(Today);

        Assert.Equal(2, earned);
        Assert.Equal(2, balance.TotalGems);
        Assert.Equal(2, balance.GemsFromDailiesThisMonth);
    }

    [Fact]
    public void CreditReinforcementBonus_SharesCapWithNormalDailyCredit()
    {
        var balance = new UserGemBalance(Guid.NewGuid(), Today);
        for (var i = 0; i < UserGemBalance.DailyMonthlyCap - 1; i++)
        {
            balance.CreditDaily(Today); // 19 Gems de Dailies normais
        }

        // So sobra 1 de espaco no cap - o bonus de +2 e clampado pra +1, nunca estoura o cap.
        var earned = balance.CreditReinforcementBonus(Today);

        Assert.Equal(1, earned);
        Assert.Equal(UserGemBalance.DailyMonthlyCap, balance.GemsFromDailiesThisMonth);
        Assert.Equal(UserGemBalance.DailyMonthlyCap, balance.TotalGems);
    }

    [Fact]
    public void CreditReinforcementBonus_ZeroAfterCategoryCapAlreadyReached()
    {
        var balance = new UserGemBalance(Guid.NewGuid(), Today);
        for (var i = 0; i < UserGemBalance.DailyMonthlyCap; i++)
        {
            balance.CreditDaily(Today);
        }

        var earned = balance.CreditReinforcementBonus(Today);

        Assert.Equal(0, earned);
        Assert.Equal(UserGemBalance.DailyMonthlyCap, balance.TotalGems);
    }

    [Fact]
    public void MonthlyCounters_DoNotReset_WithinTheSameMonth()
    {
        var balance = new UserGemBalance(Guid.NewGuid(), new DateOnly(2026, 8, 1));

        balance.CreditDaily(new DateOnly(2026, 8, 15));
        balance.CreditDaily(new DateOnly(2026, 8, 28));

        Assert.Equal(2, balance.GemsFromDailiesThisMonth);
        Assert.Equal(2, balance.TotalGems);
    }
}
