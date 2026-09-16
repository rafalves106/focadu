using Focadu.Application.Dailies;
using Focadu.Domain.Enums;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Dailies;

/// <summary>
/// Fase 38b: DailySequencing substitui a resolucao antiga de "a Daily de hoje" por Daily.Date
/// (calendario, fixado de uma vez so na matricula - ver EnrollUserInCourseUseCase) por uma
/// resolucao puramente sequencial, cruzando todas as Weeklies da matricula. Bug motivador
/// (relatado ao vivo, 14->15/09/2026): concluir a Daily 1 num dia so liberava calendarmente a
/// Daily 4 (proxima data util 1-daily-por-dia-util), deixando as Dailies 2 e 3 presas em Locked
/// pra sempre.
/// </summary>
public class DailySequencingTests
{
    [Fact]
    public void FindNext_ReturnsEarliestDayNumber_AcrossMultipleWeeklies()
    {
        var weekly1 = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (daily1, activity) = DailyFixtures.NewDailyWithOneActivity(weekly1, 1, today);
        daily1.Start();
        daily1.SubmitActivityResponse(activity.Id, 100);
        daily1.Complete();
        DailyFixtures.NewDaily(weekly1, 2, today);
        DailyFixtures.NewDaily(weekly1, 3, today);

        var weekly2 = DailyFixtures.NewWeekly();
        var daily6 = DailyFixtures.NewDaily(weekly2, 6, today);

        var next = DailySequencing.FindNext(new[] { weekly1, weekly2 });

        // Daily 1 (weekly1) ja concluida - a proxima e a Daily 2, nao a Daily 6 (weekly2), mesmo
        // que a Daily 2 nunca tenha sido tocada e a Daily 6 exista numa Weekly "mais nova".
        Assert.Equal(2, next?.DayNumber);
        Assert.NotEqual(daily6.Id, next?.Id);
    }

    [Fact]
    public void FindNext_SkipsReinforcementDailies()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var weakDaily = DailyFixtures.NewWeakDaily(weekly, 1, today);
        var reinforcementDaily = weekly.CreateDailyReinforcement(weakDaily.Id, today);

        var next = DailySequencing.FindNext(new[] { weekly });

        // weakDaily ainda nao foi concluida (so reprovou atividades) - continua sendo a proxima,
        // mesmo com uma Daily de reforco pendente logo depois dela.
        Assert.Equal(weakDaily.Id, next?.Id);
        Assert.NotEqual(reinforcementDaily.Id, next?.Id);
    }

    [Fact]
    public void FindNext_ReturnsNull_WhenEverythingIsCompleted()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, today);
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, 100);
        daily.Complete();

        Assert.Null(DailySequencing.FindNext(new[] { weekly }));
    }

    [Fact]
    public void FindInProgress_TakesPriorityOverAnyOtherWeekly()
    {
        var weekly1 = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var abandonedDaily = DailyFixtures.NewDaily(weekly1, 1, today.AddDays(-5));
        abandonedDaily.Start();

        var weekly2 = DailyFixtures.NewWeekly();
        DailyFixtures.NewDaily(weekly2, 6, today);

        var inProgress = DailySequencing.FindInProgress(new[] { weekly1, weekly2 });

        Assert.Equal(abandonedDaily.Id, inProgress?.Id);
    }

    [Fact]
    public void IsNext_TrueOnlyForTheFrontierDaily()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var daily1 = DailyFixtures.NewDaily(weekly, 1, today);
        var daily2 = DailyFixtures.NewDaily(weekly, 2, today);

        Assert.True(DailySequencing.IsNext(new[] { weekly }, daily1.Id));
        Assert.False(DailySequencing.IsNext(new[] { weekly }, daily2.Id));
    }
}
