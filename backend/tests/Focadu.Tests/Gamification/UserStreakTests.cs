using Focadu.Domain.Gamification;
using Xunit;

namespace Focadu.Tests.Gamification;

public class UserStreakTests
{
    // Segunda-feira, so pra ter uma semana inteira de dias uteis disponivel pros testes de quebra.
    private static readonly DateOnly Monday = new(2026, 8, 17);
    private static readonly DateOnly Tuesday = Monday.AddDays(1);
    private static readonly DateOnly Wednesday = Monday.AddDays(2);
    private static readonly DateOnly Friday = Monday.AddDays(4);
    private static readonly DateOnly NextMonday = Monday.AddDays(7);

    [Fact]
    public void RegisterCompletion_FirstEver_SetsStreakToOne()
    {
        var streak = new UserStreak(Guid.NewGuid());

        streak.RegisterCompletion(Monday);

        Assert.Equal(1, streak.CurrentStreak);
        Assert.Equal(1, streak.LongestStreak);
        Assert.Equal(Monday, streak.LastCompletedDate);
    }

    [Fact]
    public void RegisterCompletion_OnConsecutiveBusinessDays_Increments()
    {
        var streak = new UserStreak(Guid.NewGuid());

        streak.RegisterCompletion(Monday);
        streak.RegisterCompletion(Tuesday);
        streak.RegisterCompletion(Wednesday);

        Assert.Equal(3, streak.CurrentStreak);
        Assert.Equal(3, streak.LongestStreak);
    }

    [Fact]
    public void RegisterCompletion_AcrossWeekend_DoesNotBreak()
    {
        var streak = new UserStreak(Guid.NewGuid());

        streak.RegisterCompletion(Friday);
        streak.RegisterCompletion(NextMonday);

        Assert.Equal(2, streak.CurrentStreak);
    }

    [Fact]
    public void RegisterCompletion_SkippingABusinessDay_ResetsStreakToOne()
    {
        var streak = new UserStreak(Guid.NewGuid());

        streak.RegisterCompletion(Monday);
        // Terca-feira (dia util) passou sem conclusao - Quarta reinicia a contagem.
        streak.RegisterCompletion(Wednesday);

        Assert.Equal(1, streak.CurrentStreak);
    }

    [Fact]
    public void RegisterCompletion_SameDateTwice_IsNoOp()
    {
        var streak = new UserStreak(Guid.NewGuid());

        streak.RegisterCompletion(Monday);
        streak.RegisterCompletion(Monday);

        Assert.Equal(1, streak.CurrentStreak);
    }

    [Fact]
    public void LongestStreak_KeepsRecordAfterABreak()
    {
        var streak = new UserStreak(Guid.NewGuid());

        streak.RegisterCompletion(Monday);
        streak.RegisterCompletion(Tuesday);
        streak.RegisterCompletion(Wednesday);
        // Pula uma semana inteira - quebra o streak atual, mas o recorde de 3 permanece.
        streak.RegisterCompletion(NextMonday.AddDays(7));

        Assert.Equal(1, streak.CurrentStreak);
        Assert.Equal(3, streak.LongestStreak);
    }

    [Fact]
    public void CurrentStreakAsOf_ReportsZero_WhenBrokenButNotYetPersisted()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Monday);

        // Terca (dia util) passou sem nenhuma nova conclusao - uma leitura na quarta ja deve
        // reportar 0, mesmo sem nenhuma escrita nova ter acontecido (CurrentStreak persistido
        // continua 1 internamente ate a proxima RegisterCompletion).
        Assert.Equal(0, streak.CurrentStreakAsOf(Wednesday));
        Assert.Equal(1, streak.CurrentStreak);
    }

    [Fact]
    public void CurrentStreakAsOf_StillAlive_OverTheWeekend()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Friday);

        Assert.Equal(1, streak.CurrentStreakAsOf(NextMonday));
    }

    [Fact]
    public void CurrentStreakAsOf_ZeroForFreshStreak()
    {
        var streak = new UserStreak(Guid.NewGuid());

        Assert.Equal(0, streak.CurrentStreakAsOf(Monday));
    }
}
