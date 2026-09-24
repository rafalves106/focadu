using Focadu.Domain.Gamification;
using Xunit;

namespace Focadu.Tests.Gamification;

public class UserStreakTests
{
    // Fase 69: o dia da semana nao importa mais (folga movel no lugar do fim de semana) - os nomes
    // sao so pra ler a sequencia. Day1 e uma segunda-feira, mas poderia ser qualquer dia.
    private static readonly DateOnly Day1 = new(2026, 8, 17);
    private static readonly DateOnly Day2 = Day1.AddDays(1);
    private static readonly DateOnly Day3 = Day1.AddDays(2);
    private static readonly DateOnly Day4 = Day1.AddDays(3);
    private static readonly DateOnly Day5 = Day1.AddDays(4);

    [Fact]
    public void RegisterCompletion_FirstEver_SetsStreakToOne()
    {
        var streak = new UserStreak(Guid.NewGuid());

        streak.RegisterCompletion(Day1);

        Assert.Equal(1, streak.CurrentStreak);
        Assert.Equal(1, streak.LongestStreak);
        Assert.Equal(Day1, streak.LastCompletedDate);
    }

    [Fact]
    public void RegisterCompletion_OnConsecutiveDays_Increments()
    {
        var streak = new UserStreak(Guid.NewGuid());

        streak.RegisterCompletion(Day1);
        streak.RegisterCompletion(Day2);
        streak.RegisterCompletion(Day3);

        Assert.Equal(3, streak.CurrentStreak);
        Assert.Equal(3, streak.LongestStreak);
    }

    [Fact]
    public void RegisterCompletion_OneDayOff_UsesTheRestDay()
    {
        var streak = new UserStreak(Guid.NewGuid());

        streak.RegisterCompletion(Day1);
        streak.RegisterCompletion(Day3); // Day2 sem estudo: a folga cobre

        Assert.Equal(2, streak.CurrentStreak);
        Assert.Equal(Day2, streak.LastRestDate);
    }

    [Fact]
    public void RegisterCompletion_TwoDaysOffInARow_ResetsStreakToOne()
    {
        var streak = new UserStreak(Guid.NewGuid());

        streak.RegisterCompletion(Day1);
        streak.RegisterCompletion(Day4); // Day2 e Day3 sem estudo: a folga so cobre um

        Assert.Equal(1, streak.CurrentStreak);
    }

    [Fact]
    public void RegisterCompletion_SecondDayOffWithinSevenDays_ResetsStreak()
    {
        var streak = new UserStreak(Guid.NewGuid());

        streak.RegisterCompletion(Day1);
        streak.RegisterCompletion(Day3); // folga em Day2
        streak.RegisterCompletion(Day5); // Day4 sem estudo, 2 dias depois da folga

        Assert.Equal(1, streak.CurrentStreak);
    }

    [Fact]
    public void RegisterCompletion_RestDayComesBack_SevenDaysLater()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Day1);
        streak.RegisterCompletion(Day3); // folga em Day2
        for (var d = Day3.AddDays(1); d <= Day2.AddDays(6); d = d.AddDays(1))
            streak.RegisterCompletion(d);

        // Day2 + 7 sem estudo: a folga ja voltou
        streak.RegisterCompletion(Day2.AddDays(8));

        Assert.Equal(Day2.AddDays(7), streak.LastRestDate);
        Assert.True(streak.CurrentStreak > 1);
    }

    [Fact]
    public void RegisterCompletion_PausedDays_DoNotBreakNorUseTheRestDay()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Day1);
        var pauses = new[] { new StreakPause(Day2, Day1.AddDays(10)) };

        streak.RegisterCompletion(Day1.AddDays(11), pauses);

        Assert.Equal(2, streak.CurrentStreak);
        Assert.Null(streak.LastRestDate);
    }

    [Fact]
    public void RegisterCompletion_AfterPauseEnds_CountsTheDaysLeft()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Day1);
        var pauses = new[] { new StreakPause(Day2, Day3) };

        // Day4 e Day5 fora da pausa e sem estudo: 2 dias, quebra
        streak.RegisterCompletion(Day1.AddDays(5), pauses);

        Assert.Equal(1, streak.CurrentStreak);
    }

    [Fact]
    public void RegisterCompletion_SameDateTwice_IsNoOp()
    {
        var streak = new UserStreak(Guid.NewGuid());

        streak.RegisterCompletion(Day1);
        streak.RegisterCompletion(Day1);

        Assert.Equal(1, streak.CurrentStreak);
    }

    [Fact]
    public void LongestStreak_KeepsRecordAfterABreak()
    {
        var streak = new UserStreak(Guid.NewGuid());

        streak.RegisterCompletion(Day1);
        streak.RegisterCompletion(Day2);
        streak.RegisterCompletion(Day3);
        streak.RegisterCompletion(Day1.AddDays(14));

        Assert.Equal(1, streak.CurrentStreak);
        Assert.Equal(3, streak.LongestStreak);
    }

    [Fact]
    public void CurrentStreakAsOf_ReportsZero_WhenBrokenButNotYetPersisted()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Day1);

        // Day2 e Day3 passaram sem conclusao - uma leitura em Day4 ja deve reportar 0 e zerar o
        // valor persistido junto (ver o teste do aviso repetido abaixo).
        Assert.Equal(0, streak.CurrentStreakAsOf(Day4));
        Assert.Equal(0, streak.CurrentStreak);
        Assert.Equal(1, streak.LongestStreak);
    }

    [Fact]
    public void CurrentStreakAsOf_StillAlive_WithOneDayOff()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Day1);

        // Day2 sem estudo, mas a folga cobre - ainda da pra estudar em Day3.
        Assert.Equal(1, streak.CurrentStreakAsOf(Day3));
    }

    [Fact]
    public void CurrentStreakAsOf_Broken_WithOneDayOffAndNoRestLeft()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Day1);
        streak.RegisterCompletion(Day3); // folga em Day2

        Assert.Equal(0, streak.CurrentStreakAsOf(Day5)); // Day4 sem estudo e sem folga
    }

    [Fact]
    public void CurrentStreakAsOf_StillAlive_DuringAPause()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Day1);
        var pauses = new[] { new StreakPause(Day2, Day1.AddDays(14)) };

        Assert.Equal(1, streak.CurrentStreakAsOf(Day1.AddDays(10), pauses));
        Assert.Null(streak.BrokenAt);
    }

    [Fact]
    public void IsRestAvailableOn_FollowsTheSevenDayWindow()
    {
        var streak = new UserStreak(Guid.NewGuid());
        Assert.True(streak.IsRestAvailableOn(Day1));

        streak.RegisterCompletion(Day1);
        streak.RegisterCompletion(Day3); // folga em Day2

        Assert.False(streak.IsRestAvailableOn(Day2.AddDays(6)));
        Assert.True(streak.IsRestAvailableOn(Day2.AddDays(7)));
    }

    [Fact]
    public void CurrentStreakAsOf_ZeroForFreshStreak()
    {
        var streak = new UserStreak(Guid.NewGuid());

        Assert.Equal(0, streak.CurrentStreakAsOf(Day1));
    }

    [Fact]
    public void CurrentStreakAsOf_MarksBrokenAt_OnFirstObservation()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Day1);

        Assert.Null(streak.BrokenAt);
        streak.CurrentStreakAsOf(Day4);
        Assert.Equal(Day4, streak.BrokenAt);

        // Leitura seguinte, mesma quebra ja observada: nao reescreve a data.
        streak.CurrentStreakAsOf(Day5);
        Assert.Equal(Day4, streak.BrokenAt);
    }

    [Fact]
    public void CurrentStreakAsOf_NeverMarksBrokenAt_WhenStreakStillAlive()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Day1);

        streak.CurrentStreakAsOf(Day2);

        Assert.Null(streak.BrokenAt);
    }

    [Fact]
    public void RegisterCompletion_ClearsBrokenAt_WhenRestartingAfterABreak()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Day1);
        streak.CurrentStreakAsOf(Day4);
        Assert.NotNull(streak.BrokenAt);

        streak.RegisterCompletion(Day4);

        Assert.Null(streak.BrokenAt);
    }

    [Fact]
    public void AcknowledgeBreak_DoesNotComeBack_OnLaterReads()
    {
        // Bug real (23/09/2026): depois de fechar o aviso, a proxima leitura remarcava BrokenAt e o
        // "Streak Perdido" voltava a cada abertura da tela de start.
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Day1);
        streak.CurrentStreakAsOf(Day4);

        streak.AcknowledgeBreak();

        Assert.Equal(0, streak.CurrentStreakAsOf(Day4));
        Assert.Null(streak.BrokenAt);
        Assert.Equal(0, streak.CurrentStreakAsOf(Day5));
        Assert.Null(streak.BrokenAt);
    }

    [Fact]
    public void RegisterCompletion_AfterAcknowledgedBreak_StartsAtOne()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Day1);
        streak.RegisterCompletion(Day2);
        streak.CurrentStreakAsOf(Day5);
        streak.AcknowledgeBreak();

        streak.RegisterCompletion(Day1.AddDays(7));

        Assert.Equal(1, streak.CurrentStreak);
        Assert.Equal(2, streak.LongestStreak);
        Assert.Null(streak.BrokenAt);
    }

    [Fact]
    public void AcknowledgeBreak_ClearsBrokenAt()
    {
        var streak = new UserStreak(Guid.NewGuid());
        streak.RegisterCompletion(Day1);
        streak.CurrentStreakAsOf(Day4);

        streak.AcknowledgeBreak();

        Assert.Null(streak.BrokenAt);
    }
}
