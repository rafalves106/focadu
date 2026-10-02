using Focadu.Application.Feedback;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Feedback;

public class DayFeedbackTests
{
    private static DayFeedback NewFeedback() => new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    [InlineData(-1)]
    public void Rate_RejectsClarityOutsideOneToFive(int clarity) =>
        Assert.Equal("clareza_invalida", Assert.Throws<DomainException>(() => NewFeedback().Rate(clarity, null, null)).Code);

    [Fact]
    public void Rate_KeepsTheActivityTypeAndOrder_SoTheReportSurvivesAReimport()
    {
        var weekly = DailyFixtures.NewWeekly();
        var (_, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, DailyFixtures.Today);
        var feedback = NewFeedback();

        feedback.Rate(2, activity, "  travei no quiz  ");

        Assert.Equal(2, feedback.Clarity);
        Assert.Equal(activity.Id, feedback.StuckActivityId);
        Assert.Equal(ActivityType.Quiz, feedback.StuckActivityType);
        Assert.Equal(0, feedback.StuckActivityOrder);
        Assert.Equal("travei no quiz", feedback.Comment);
    }

    [Fact]
    public void Rate_CanBeRewrittenAndClearsWhatWasNotSentAgain()
    {
        var weekly = DailyFixtures.NewWeekly();
        var (_, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, DailyFixtures.Today);
        var feedback = NewFeedback();
        feedback.Rate(2, activity, "ruim");

        feedback.Rate(5, null, "   ");

        Assert.Equal(5, feedback.Clarity);
        Assert.Null(feedback.StuckActivityId);
        Assert.Null(feedback.StuckActivityType);
        Assert.Null(feedback.Comment);
    }

    [Fact]
    public void Rate_RejectsACommentOverTheLimit() =>
        Assert.Equal("comentario_muito_longo",
            Assert.Throws<DomainException>(() => NewFeedback().Rate(3, null, new string('x', DayFeedback.MaxCommentLength + 1))).Code);

    [Fact]
    public void Report_FlagsWeekClarityBelowFour_ConsecutiveStuckDaysAndTwoBadFeedbacks()
    {
        var rows = new List<DayFeedbackRow>
        {
            new(1, 1, 5, null), new(1, 2, 5, null),                                 // semana 1 boa
            new(2, 7, 3, ActivityType.Quiz), new(2, 8, 3, ActivityType.Quiz), new(2, 9, 3, ActivityType.Quiz), // semana 2: 3 dias seguidos travando no Quiz
            new(2, 9, 1, null),                                                      // dia 9: so 1 ruim (a nota 3 nao conta)
            new(2, 10, 2, null), new(2, 10, 1, null),                                // dia 10: 2 ruins
        };

        var report = FeedbackReport.Build(rows);

        Assert.Contains(report.ReopenFlags, f => f.Contains("Semana 2: clareza media"));
        Assert.DoesNotContain(report.ReopenFlags, f => f.Contains("Semana 1: clareza"));
        Assert.Contains(report.ReopenFlags, f => f.Contains("3 dias seguidos") && f.Contains("Quiz"));
        Assert.Contains(report.ReopenFlags, f => f.Contains("dia 10: 2 feedbacks ruins"));
        Assert.DoesNotContain(report.ReopenFlags, f => f.Contains("dia 9: 2 feedbacks"));
        Assert.Equal(6, report.Days.Count);
        Assert.Equal(2, report.Days.Single(d => d.DayNumber == 10).Count);
    }

    [Fact]
    public void Report_TwoStuckDaysInARowOrNotConsecutive_AreNotFlagged()
    {
        var rows = new List<DayFeedbackRow>
        {
            new(1, 1, 5, ActivityType.Cloze), new(1, 2, 5, ActivityType.Cloze), new(1, 4, 5, ActivityType.Cloze),
        };

        Assert.Empty(FeedbackReport.Build(rows).ReopenFlags);
    }

    [Fact]
    public void Report_WithoutFeedback_IsEmpty()
    {
        var report = FeedbackReport.Build([]);
        Assert.Empty(report.Days);
        Assert.Empty(report.ReopenFlags);
    }
}
