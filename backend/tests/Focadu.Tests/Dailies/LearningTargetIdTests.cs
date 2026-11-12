using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Dailies;

// Fase 108: o molde C tem um alvo por bloco de leitura, ate t15; os moldes A e B seguem em t1 a t3.
public class LearningTargetIdTests
{
    private static Focadu.Domain.Activities.DailyActivity NewActivity()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        return template.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice, "Pergunta?");
    }

    [Theory]
    [InlineData("t1")]
    [InlineData("t3")]
    [InlineData("t10")]
    [InlineData("t15")]
    [InlineData(null)]
    public void SetTarget_AcceptsT1ToT15(string? target)
    {
        var activity = NewActivity();
        activity.SetTarget(target);
        Assert.Equal(target, activity.Target);
    }

    [Theory]
    [InlineData("t0")]
    [InlineData("t16")]
    [InlineData("t01")]
    [InlineData("T1")]
    [InlineData("t")]
    [InlineData("x1")]
    public void SetTarget_RejectsAnythingElse(string target)
    {
        var ex = Assert.Throws<DomainException>(() => NewActivity().SetTarget(target));
        Assert.Equal("alvo_invalido", ex.Code);
    }

    private static IEnumerable<Focadu.Domain.Dailies.LearningTarget> Targets(int n) =>
        Enumerable.Range(1, n).Select(i => new Focadu.Domain.Dailies.LearningTarget($"t{i}", $"Alvo {i}"));

    [Theory]
    [InlineData(3)]
    [InlineData(11)]
    [InlineData(15)]
    public void SetCurationInfo_AcceptsThreeToFifteenTargets(int count)
    {
        var template = DailyFixtures.NewWeekly().Template.AddDailyTemplate(1);
        template.SetCurationInfo("v1", "hash", Targets(count));
        Assert.NotNull(template.TargetsJson);
    }

    [Theory]
    [InlineData(2)]
    [InlineData(16)]
    public void SetCurationInfo_RejectsOutsideThreeToFifteen(int count)
    {
        var template = DailyFixtures.NewWeekly().Template.AddDailyTemplate(1);
        var ex = Assert.Throws<DomainException>(() => template.SetCurationInfo("v1", "hash", Targets(count)));
        Assert.Equal("alvos_invalidos", ex.Code);
    }
}
