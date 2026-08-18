using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Weeklies;

public class WeeklyTests
{
    [Fact]
    public void ShouldTriggerWeeklyReinforcement_BecomesTrue_AtTwoWeakDailies()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;

        var day1 = DailyFixtures.NewWeakDaily(weekly, 1, today.AddDays(-2));
        Assert.False(weekly.ShouldTriggerWeeklyReinforcement());

        var day2 = DailyFixtures.NewWeakDaily(weekly, 2, today.AddDays(-1));

        Assert.True(weekly.ShouldTriggerWeeklyReinforcement());

        var reinforcement = weekly.TriggerWeeklyReinforcement();

        Assert.Equal(2, reinforcement.WeakDailyIds.Count);
        Assert.Contains(day1.Id, reinforcement.WeakDailyIds);
        Assert.Contains(day2.Id, reinforcement.WeakDailyIds);
    }

    [Fact]
    public void TriggerWeeklyReinforcement_Throws_WhenThresholdNotReached()
    {
        var weekly = DailyFixtures.NewWeekly();
        DailyFixtures.NewWeakDaily(weekly, 1, DailyFixtures.Today.AddDays(-1));

        Assert.Throws<DomainException>(() => weekly.TriggerWeeklyReinforcement());
    }

    [Fact]
    public void ShouldTriggerWeeklyReinforcement_DoesNotDoubleCountDaysAlreadyCovered()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        DailyFixtures.NewWeakDaily(weekly, 1, today.AddDays(-2));
        DailyFixtures.NewWeakDaily(weekly, 2, today.AddDays(-1));
        weekly.TriggerWeeklyReinforcement();

        // Nenhum dia fraco novo desde entao: nao deve disparar de novo.
        Assert.False(weekly.ShouldTriggerWeeklyReinforcement());
    }

    [Fact]
    public void EvaluateDailyAccess_ThrowsForFutureDaily()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var futureDaily = weekly.AddDaily(1, today.AddDays(1));

        Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(futureDaily.Id, today));
    }

    [Fact]
    public void EvaluateDailyAccess_AllowsStart_ForTodayNotYetStarted()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var daily = weekly.AddDaily(1, today);

        Assert.Equal(DailyAccessMode.Start, weekly.EvaluateDailyAccess(daily.Id, today));
    }

    [Fact]
    public void EvaluateDailyAccess_Throws_WhenAnotherDailyInProgressToday()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var daily1 = weekly.AddDaily(1, today);
        var daily2 = weekly.AddDaily(2, today);

        weekly.StartOrResumeDaily(daily1.Id, today);

        Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(daily2.Id, today));
    }

    [Fact]
    public void EvaluateDailyAccess_TodayCompleted_IsReplay_WithNoAttemptLimit()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, today);
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, 100);
        daily.Complete();

        Assert.Equal(DailyAccessMode.Replay, weekly.EvaluateDailyAccess(daily.Id, today));
    }

    [Fact]
    public void EvaluateDailyAccess_PastCompletedDaily_AllowsVoluntaryReplay_WhenNothingInProgress()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (pastDaily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, today.AddDays(-1));
        pastDaily.Start();
        pastDaily.SubmitActivityResponse(activity.Id, 100);
        pastDaily.Complete();

        Assert.Equal(DailyAccessMode.Replay, weekly.EvaluateDailyAccess(pastDaily.Id, today));
    }

    [Fact]
    public void EvaluateDailyAccess_PastDaily_IsReadOnly_WhenAnotherDailyIsInProgress()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (pastDaily, pastActivity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, today.AddDays(-1));
        pastDaily.Start();
        pastDaily.SubmitActivityResponse(pastActivity.Id, 100);
        pastDaily.Complete();

        var todayDaily = weekly.AddDaily(2, today);
        weekly.StartOrResumeDaily(todayDaily.Id, today);

        Assert.Equal(DailyAccessMode.ReadOnly, weekly.EvaluateDailyAccess(pastDaily.Id, today));
    }

    [Fact]
    public void EvaluateDailyAccess_PastDaily_NeverCompleted_IsReadOnly()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var pastDaily = weekly.AddDaily(1, today.AddDays(-3));

        Assert.Equal(DailyAccessMode.ReadOnly, weekly.EvaluateDailyAccess(pastDaily.Id, today));
    }
}
