using Focadu.Domain.Exceptions;
using Focadu.Domain.Weeklies;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Weeklies;

/// <summary>Fase 81: semana sem Projeto Semanal (cursos de pre-requisito) fecha so com as Dailies.</summary>
public class PracticeOnlyWeekTests
{
    private static Weekly CompletedWeeklyWithoutProject(int score = 80)
    {
        var weekly = DailyFixtures.NewWeekly();
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, DailyFixtures.Today);
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, score);
        daily.Complete();
        return weekly;
    }

    [Fact]
    public void IsModuleComplete_True_WithOnlyDailies_WhenThereIsNoProject()
    {
        var weekly = CompletedWeeklyWithoutProject();

        Assert.Null(weekly.Project);
        Assert.True(weekly.IsModuleComplete());
    }

    [Fact]
    public void WeekWithoutProject_NeverRequiresProjectOrPublication()
    {
        var weekly = CompletedWeeklyWithoutProject();

        Assert.False(weekly.RequiresProjectToUnlock());
        Assert.False(weekly.RequiresPublicationToUnlock());
    }

    [Fact]
    public void CalculateScore_IsTheDailyAverage_WhenThereIsNoProject()
    {
        var weekly = CompletedWeeklyWithoutProject();

        Assert.Equal(weekly.Dailies.Single().CalculateScore(), weekly.CalculateScore());
    }

    [Fact]
    public void WeekWithProject_StillRequiresPublication()
    {
        // Regressao: com projeto, nada muda - modulo completo exige publicacao.
        var weekly = CompletedWeeklyWithoutProject();
        var project = weekly.InitializeProject();
        project.Submit("https://github.com/x");
        project.Evaluate(90, "ok");

        Assert.True(weekly.RequiresPublicationToUnlock());
    }

    [Fact]
    public void IsPracticeOnly_NeedsPracticeLanguageAndNoProjectSpec()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana");
        Assert.False(template.IsPracticeOnly);

        template.SetPracticeLanguage("Bash");
        Assert.True(template.IsPracticeOnly);

        template.SetProjectSpec("Projeto");
        Assert.False(template.IsPracticeOnly);
    }

    [Fact]
    public void SetPracticeLanguage_CannotChangeOnceDefined()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana");
        template.SetPracticeLanguage("Bash");
        template.SetPracticeLanguage("Bash");

        Assert.Throws<DomainException>(() => template.SetPracticeLanguage("Python"));
    }
}
