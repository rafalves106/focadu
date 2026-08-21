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
        project.Evaluate(90, "Bom trabalho.");

        Assert.Throws<DomainException>(() => project.Submit("https://github.com/falves/outro"));
    }

    // Fase 16: Score de Estudo - Evaluate agora exige uma nota.

    [Fact]
    public void Evaluate_SetsScoreFeedbackAndStatus()
    {
        var weekly = DailyFixtures.NewWeekly();
        var project = weekly.InitializeProject();
        project.Submit("https://github.com/falves/projeto");

        project.Evaluate(85, "Faltou tratar erros.");

        Assert.Equal(WeeklyProjectStatus.Evaluated, project.Status);
        Assert.Equal(85, project.Score);
        Assert.Equal("Faltou tratar erros.", project.Feedback);
    }

    [Fact]
    public void Evaluate_WithoutFeedback_LeavesFeedbackNull()
    {
        var weekly = DailyFixtures.NewWeekly();
        var project = weekly.InitializeProject();
        project.Submit("https://github.com/falves/projeto");

        project.Evaluate(70, null);

        Assert.Null(project.Feedback);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void Evaluate_ScoreOutOfRange_Throws(int score)
    {
        var weekly = DailyFixtures.NewWeekly();
        var project = weekly.InitializeProject();
        project.Submit("https://github.com/falves/projeto");

        Assert.Throws<DomainException>(() => project.Evaluate(score, "x"));
    }

    [Fact]
    public void Evaluate_BeforeSubmit_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var project = weekly.InitializeProject();

        Assert.Throws<DomainException>(() => project.Evaluate(90, "x"));
    }

    [Fact]
    public void Evaluate_CalledTwice_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        var project = weekly.InitializeProject();
        project.Submit("https://github.com/falves/projeto");
        project.Evaluate(90, "x");

        Assert.Throws<DomainException>(() => project.Evaluate(50, "y"));
    }
}
