using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Weeklies;

/// <summary>Fase 13: WeeklyProject (instancia) so rastreia Status/SubmissionUrl - SpecText virou curriculo (WeeklyTemplate.WeeklyProjectSpecText), InitializeProject substitui o antigo DefineProject(specText).</summary>
public class WeeklyProjectTests
{
    [Fact]
    public void Submit_SetsSubmissionUrlAndStatus()
    {
        var weekly = DailyFixtures.NewWeekly();
        var project = weekly.InitializeProject();

        project.Submit("https://github.com/falves/projeto");

        Assert.Equal(WeeklyProjectStatus.Submitted, project.Status);
        Assert.Equal("https://github.com/falves/projeto", project.SubmissionUrl);
    }

    [Fact]
    public void Submit_WithoutUrl_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var project = weekly.InitializeProject();

        Assert.Throws<DomainException>(() => project.Submit(""));
    }

    [Fact]
    public void Submit_AfterEvaluated_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var project = weekly.InitializeProject();
        project.Submit("https://github.com/falves/projeto");
        project.Evaluate();

        Assert.Throws<DomainException>(() => project.Submit("https://github.com/falves/outro"));
    }
}
