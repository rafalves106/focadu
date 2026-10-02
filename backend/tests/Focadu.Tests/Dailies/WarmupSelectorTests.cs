using Focadu.Application.Dailies;
using Focadu.Domain.Activities;
using Focadu.Domain.Enums;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Dailies;

/// <summary>Aquecimento (plano de curadoria, 02/10/2026): 2 perguntas de dias anteriores, as de menor nota primeiro.</summary>
public class WarmupSelectorTests
{
    private static WarmupCandidate Candidate(Guid dailyId, int week, int day, int score, int order = 0)
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(day);
        var activity = template.AddActivity(ActivityType.Quiz, order, AnswerMode.MultipleChoice, $"pergunta s{week} d{day} #{order}");
        return new WarmupCandidate(dailyId, activity, week, day, score);
    }

    [Fact]
    public void Select_PicksTheLowestScoresFirst()
    {
        var a = Candidate(Guid.NewGuid(), 1, 1, 100);
        var b = Candidate(Guid.NewGuid(), 1, 2, 40);
        var c = Candidate(Guid.NewGuid(), 1, 3, 70);

        var picked = WarmupSelector.Select([a, b, c], 2);

        Assert.Equal([b, c], picked);
    }

    [Fact]
    public void Select_TiesGoToTheOldestDay()
    {
        var newer = Candidate(Guid.NewGuid(), 2, 8, 100);
        var older = Candidate(Guid.NewGuid(), 1, 2, 100);

        Assert.Equal([older, newer], WarmupSelector.Select([newer, older], 2));
    }

    [Fact]
    public void Select_UsesEachSourceDayOnceBeforeRepeatingOne()
    {
        var sameDay = Guid.NewGuid();
        var low1 = Candidate(sameDay, 1, 1, 10, order: 0);
        var low2 = Candidate(sameDay, 1, 1, 20, order: 1);
        var otherDay = Candidate(Guid.NewGuid(), 1, 2, 90);

        var picked = WarmupSelector.Select([low1, low2, otherDay], 2);

        Assert.Equal([low1, otherDay], picked);
    }

    [Fact]
    public void Select_RepeatsADayWhenThereIsNoOtherChoice()
    {
        var sameDay = Guid.NewGuid();
        var q1 = Candidate(sameDay, 1, 1, 10, order: 0);
        var q2 = Candidate(sameDay, 1, 1, 20, order: 1);

        Assert.Equal([q1, q2], WarmupSelector.Select([q2, q1], 2));
    }

    [Fact]
    public void Select_WithFewerCandidatesThanRequested_ReturnsWhatThereIs()
    {
        Assert.Empty(WarmupSelector.Select([], 2));
        var only = Candidate(Guid.NewGuid(), 1, 1, 50);
        Assert.Equal([only], WarmupSelector.Select([only], 2));
    }
}
