using Focadu.Domain.Activities;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Dailies;

public class DailyTests
{
    [Fact]
    public void AddActivity_VoiceSummary_WithoutContentId_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = weekly.AddDaily(1, DailyFixtures.Today);

        Assert.Throws<DomainException>(
            () => daily.AddActivity(ActivityType.VoiceSummary, 0, AnswerMode.FreeText, prompt: "Resuma o texto."));
    }

    [Fact]
    public void AddActivity_VoiceSummary_WithContentId_Succeeds()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = weekly.AddDaily(1, DailyFixtures.Today);
        var contentId = Guid.NewGuid();

        var activity = daily.AddActivity(
            ActivityType.VoiceSummary, 0, AnswerMode.FreeText, prompt: "Resuma o texto.", contentId: contentId);

        Assert.Equal(ActivityType.VoiceSummary, activity.Type);
        Assert.Equal(contentId, activity.ContentId);
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(79, false)]
    [InlineData(80, true)]
    [InlineData(100, true)]
    public void SubmitActivityResponse_CalculatesPassedFromScore(int score, bool expectedPassed)
    {
        var weekly = DailyFixtures.NewWeekly();
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, DailyFixtures.Today);
        daily.Start();

        var response = daily.SubmitActivityResponse(activity.Id, score);

        Assert.Equal(expectedPassed, response.Passed);
        Assert.Equal(score, response.Score);
    }

    [Fact]
    public void SubmitActivityResponse_NeverOverwritesPreviousAttempts()
    {
        var weekly = DailyFixtures.NewWeekly();
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, DailyFixtures.Today);
        daily.Start();

        daily.SubmitActivityResponse(activity.Id, 40);
        daily.SubmitActivityResponse(activity.Id, 90);

        Assert.Equal(2, activity.Responses.Count);
        Assert.Equal(1, activity.Responses.First().AttemptNumber);
        Assert.Equal(2, activity.Responses.Last().AttemptNumber);
    }

    [Fact]
    public void SubmitActivityResponse_FailingResponses_IncrementPenaltyPoints()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = weekly.AddDaily(1, DailyFixtures.Today);
        var a1 = daily.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        var a2 = daily.AddActivity(ActivityType.Quiz, 1, AnswerMode.MultipleChoice);
        daily.Start();

        daily.SubmitActivityResponse(a1.Id, 100); // passou, nao penaliza
        daily.SubmitActivityResponse(a2.Id, 10);  // reprovou, penaliza

        Assert.Equal(1, daily.PenaltyPoints);
    }

    [Fact]
    public void ShouldTriggerDailyReinforcement_BecomesTrue_AtThreePenaltyPoints()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = weekly.AddDaily(1, DailyFixtures.Today);
        var a1 = daily.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        var a2 = daily.AddActivity(ActivityType.Quiz, 1, AnswerMode.MultipleChoice);
        var a3 = daily.AddActivity(ActivityType.Quiz, 2, AnswerMode.MultipleChoice);
        daily.Start();

        daily.SubmitActivityResponse(a1.Id, 0);
        daily.SubmitActivityResponse(a2.Id, 0);
        Assert.False(daily.ShouldTriggerDailyReinforcement());

        daily.SubmitActivityResponse(a3.Id, 0);

        Assert.Equal(3, daily.PenaltyPoints);
        Assert.True(daily.IsWeakDay);
        Assert.True(daily.ShouldTriggerDailyReinforcement());
    }

    [Fact]
    public void CreateDailyReinforcement_OnlyClonesActivitiesThatFailed_AndMarksSourceAsTriggered()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = weekly.AddDaily(1, DailyFixtures.Today);
        var passed = daily.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        var failed1 = daily.AddActivity(ActivityType.Quiz, 1, AnswerMode.MultipleChoice);
        var failed2 = daily.AddActivity(ActivityType.Quiz, 2, AnswerMode.MultipleChoice);
        var failed3 = daily.AddActivity(ActivityType.Quiz, 3, AnswerMode.MultipleChoice);
        daily.Start();

        daily.SubmitActivityResponse(passed.Id, 100);
        daily.SubmitActivityResponse(failed1.Id, 0);
        daily.SubmitActivityResponse(failed2.Id, 0);
        daily.SubmitActivityResponse(failed3.Id, 0);

        var reinforcementDaily = weekly.CreateDailyReinforcement(daily.Id, DailyFixtures.Today.AddDays(1));

        Assert.True(reinforcementDaily.IsReinforcement);
        Assert.Equal(3, reinforcementDaily.Activities.Count);
        Assert.All(reinforcementDaily.Activities, a => Assert.Equal(ActivityStatus.Pending, a.Status));
        Assert.True(daily.ReinforcementTriggered);
        Assert.Equal(reinforcementDaily.Id, daily.ReinforcementDailyId);
    }

    [Fact]
    public void CreateDailyReinforcement_Throws_WhenPenaltyThresholdNotReached()
    {
        var weekly = DailyFixtures.NewWeekly();
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, DailyFixtures.Today);
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, 0);

        Assert.Throws<DomainException>(() => weekly.CreateDailyReinforcement(daily.Id, DailyFixtures.Today.AddDays(1)));
    }

    [Fact]
    public void Replay_AfterFirstCompletion_NeverAddsNewPenalty()
    {
        var weekly = DailyFixtures.NewWeekly();
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, DailyFixtures.Today);
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, 100);
        daily.Complete();

        Assert.True(daily.HasEverCompleted);
        Assert.Equal(0, daily.PenaltyPoints);

        // repeticao (replay): falha desta vez, mas nao pode gerar penalidade nova.
        daily.SubmitActivityResponse(activity.Id, 10);

        Assert.Equal(0, daily.PenaltyPoints);
        Assert.Equal(2, activity.Responses.Count);
        Assert.False(daily.ShouldTriggerDailyReinforcement());
    }
}
