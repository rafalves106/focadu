using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Weeklies;

public class WeeklyProjectTests
{
    [Fact]
    public void Submit_SetsSubmissionUrlAndStatus()
    {
        var weekly = DailyFixtures.NewWeekly();
        var project = weekly.DefineProject("Faca X.");

        project.Submit("https://github.com/falves/projeto");

        Assert.Equal(WeeklyProjectStatus.Submitted, project.Status);
        Assert.Equal("https://github.com/falves/projeto", project.SubmissionUrl);
    }

    [Fact]
    public void Submit_WithoutUrl_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var project = weekly.DefineProject("Faca X.");

        Assert.Throws<DomainException>(() => project.Submit(""));
    }

    [Fact]
    public void Submit_AfterEvaluated_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var project = weekly.DefineProject("Faca X.");
        project.Submit("https://github.com/falves/projeto");
        project.Evaluate();

        Assert.Throws<DomainException>(() => project.Submit("https://github.com/falves/outro"));
    }
}
