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
        var template = weekly.Template.AddDailyTemplate(1);

        Assert.Throws<DomainException>(
            () => template.AddActivity(ActivityType.VoiceSummary, 0, AnswerMode.FreeText, prompt: "Resuma o texto."));
    }

    [Fact]
    public void AddActivity_VoiceSummary_WithContentId_Succeeds()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var contentId = Guid.NewGuid();

        var activity = template.AddActivity(
            ActivityType.VoiceSummary, 0, AnswerMode.FreeText, prompt: "Resuma o texto.", contentId: contentId);

        Assert.Equal(ActivityType.VoiceSummary, activity.Type);
        Assert.Equal(contentId, activity.ContentId);
    }

    // Reading/Video (Fase 7): mesma regra de ContentId obrigatorio do VoiceSummary - ver
    // DailyActivity.ctor.
    [Theory]
    [InlineData(ActivityType.Reading)]
    [InlineData(ActivityType.Video)]
    public void AddActivity_ReadingOrVideo_WithoutContentId_Throws(ActivityType type)
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);

        Assert.Throws<DomainException>(() => template.AddActivity(type, 0, AnswerMode.MultipleChoice));
    }

    [Theory]
    [InlineData(ActivityType.Reading)]
    [InlineData(ActivityType.Video)]
    public void AddActivity_ReadingOrVideo_WithContentId_Succeeds(ActivityType type)
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var contentId = Guid.NewGuid();

        var activity = template.AddActivity(type, 0, AnswerMode.MultipleChoice, contentId: contentId);

        Assert.Equal(type, activity.Type);
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

        var responses = DailyFixtures.ResponsesFor(daily, activity.Id).ToList();
        Assert.Equal(2, responses.Count);
        Assert.Equal(1, responses.First().AttemptNumber);
        Assert.Equal(2, responses.Last().AttemptNumber);
    }

    [Fact]
    public void SubmitActivityResponse_FailingResponses_IncrementPenaltyPoints()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var daily = weekly.AddDaily(template, DailyFixtures.Today);
        var a1 = template.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        var a2 = template.AddActivity(ActivityType.Quiz, 1, AnswerMode.MultipleChoice);
        daily.Start();

        daily.SubmitActivityResponse(a1.Id, 100); // passou, nao penaliza
        daily.SubmitActivityResponse(a2.Id, 10);  // reprovou, penaliza

        Assert.Equal(1, daily.PenaltyPoints);
    }

    [Fact]
    public void ShouldTriggerDailyReinforcement_BecomesTrue_AtThreePenaltyPoints()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var daily = weekly.AddDaily(template, DailyFixtures.Today);
        var a1 = template.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        var a2 = template.AddActivity(ActivityType.Quiz, 1, AnswerMode.MultipleChoice);
        var a3 = template.AddActivity(ActivityType.Quiz, 2, AnswerMode.MultipleChoice);
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
        var template = weekly.Template.AddDailyTemplate(1);
        var daily = weekly.AddDaily(template, DailyFixtures.Today);
        var passed = template.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        var failed1 = template.AddActivity(ActivityType.Quiz, 1, AnswerMode.MultipleChoice);
        var failed2 = template.AddActivity(ActivityType.Quiz, 2, AnswerMode.MultipleChoice);
        var failed3 = template.AddActivity(ActivityType.Quiz, 3, AnswerMode.MultipleChoice);
        daily.Start();

        daily.SubmitActivityResponse(passed.Id, 100);
        daily.SubmitActivityResponse(failed1.Id, 0);
        daily.SubmitActivityResponse(failed2.Id, 0);
        daily.SubmitActivityResponse(failed3.Id, 0);

        var reinforcementDaily = weekly.CreateDailyReinforcement(daily.Id, DailyFixtures.Today.AddDays(1));

        Assert.True(reinforcementDaily.IsReinforcement);
        Assert.Equal(3, reinforcementDaily.Activities.Count);
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
        Assert.Equal(2, DailyFixtures.ResponsesFor(daily, activity.Id).Count());
        Assert.False(daily.ShouldTriggerDailyReinforcement());
    }
}
