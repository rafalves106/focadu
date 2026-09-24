using Focadu.Application.Gamification;
using Focadu.Application.Seed;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Weeklies;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Weeklies;

/// <summary>
/// Fase 69 (secret/rascunhos/ponte-teoria-projeto-semanal.md): semana de 6 Dailies + Projeto. O 6o
/// dia e a ponte pro projeto, uma versao por linguagem; a escolha da linguagem sai da abertura do
/// projeto e vai pra entrada da ponte; o reforco nunca ocupa a vaga da ponte; a renumeracao 60 -> 72.
/// </summary>
public class BridgeDayTests
{
    private const string Repo = "http://localhost:3020/aluno-1/template.git";

    // --- WeeklyTemplate: variantes de um dia -----------------------------------------------------

    [Fact]
    public void AddDailyTemplate_OneVariantPerLanguage_OnTheSameDay()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");

        var python = template.AddDailyTemplate(6, ProjectLanguage.Python);
        var javascript = template.AddDailyTemplate(6, ProjectLanguage.JavaScript);

        Assert.Equal(ProjectLanguage.Python, python.Language);
        Assert.Same(javascript, template.FindDailyTemplateVariant(6, ProjectLanguage.JavaScript));
    }

    [Fact]
    public void AddDailyTemplate_SameLanguageTwice_Throws()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        template.AddDailyTemplate(6, ProjectLanguage.Python);

        Assert.Throws<DomainException>(() => template.AddDailyTemplate(6, ProjectLanguage.Python));
    }

    [Fact]
    public void AddDailyTemplate_NeverMixesASingleDayWithVariants()
    {
        var single = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        single.AddDailyTemplate(6);
        Assert.Throws<DomainException>(() => single.AddDailyTemplate(6, ProjectLanguage.Python));

        var variants = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        variants.AddDailyTemplate(6, ProjectLanguage.Python);
        Assert.Throws<DomainException>(() => variants.AddDailyTemplate(6));
    }

    [Fact]
    public void DefaultDailyTemplatesByDay_OnePerDay_TheBridgeStartsOnTheFirstLanguage()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        template.AddDailyTemplate(5);
        template.AddDailyTemplate(6, ProjectLanguage.JavaScript);
        template.AddDailyTemplate(6, ProjectLanguage.Python);

        var defaults = template.DefaultDailyTemplatesByDay();

        Assert.Equal(new[] { 5, 6 }, defaults.Select(d => d.DayNumber));
        Assert.Equal(ProjectLanguage.Python, defaults[1].Language);
    }

    // --- Weekly: acesso a ponte e escolha da linguagem --------------------------------------------

    [Fact]
    public void EvaluateDailyAccess_Bridge_WithoutProjectLanguage_Throws()
    {
        var (weekly, bridge) = NewWeekWithContentDoneAndBridgePending();

        var ex = Assert.Throws<DomainException>(() =>
            weekly.EvaluateDailyAccess(bridge.Id, DailyFixtures.Today.AddDays(1), isNextInSequence: true));

        Assert.Equal("linguagem_nao_escolhida", ex.Code);
    }

    [Fact]
    public void EnsureProjectLanguageCanBeChosen_OnlyNeedsTheContentDays()
    {
        var (weekly, _) = NewWeekWithContentDoneAndBridgePending();

        weekly.EnsureProjectLanguageCanBeChosen(); // nao lanca: a ponte ainda esta pendente, e tudo bem
    }

    [Fact]
    public void EnsureProjectLanguageCanBeChosen_BeforeTheContentDays_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        AddLanguageVariants(weekly);
        DailyFixtures.NewDaily(weekly, 5, DailyFixtures.Today);
        AddBridge(weekly);
        weekly.InitializeProject();

        var ex = Assert.Throws<DomainException>(weekly.EnsureProjectLanguageCanBeChosen);
        Assert.Equal("projeto_semana_bloqueado", ex.Code);
    }

    [Fact]
    public void ChooseProjectLanguage_MovesTheBridgeToTheChosenVariant_AndUnlocksIt()
    {
        var (weekly, bridge) = NewWeekWithContentDoneAndBridgePending();
        Assert.Equal(ProjectLanguage.Python, bridge.Template.Language); // variante padrao

        weekly.ChooseProjectLanguage(ProjectLanguage.JavaScript, Repo);

        Assert.Equal(ProjectLanguage.JavaScript, bridge.Template.Language);
        Assert.Equal(weekly.Template.FindDailyTemplateVariant(6, ProjectLanguage.JavaScript)!.Id, bridge.DailyTemplateId);
        Assert.Equal(DailyAccessMode.Start,
            weekly.EvaluateDailyAccess(bridge.Id, DailyFixtures.Today.AddDays(1), isNextInSequence: true));
    }

    [Fact]
    public void SubmitProject_StillNeedsTheBridge()
    {
        var (weekly, _) = NewWeekWithContentDoneAndBridgePending();
        weekly.ChooseProjectLanguage(ProjectLanguage.Python, Repo);

        var ex = Assert.Throws<DomainException>(() => weekly.SubmitProject(Repo));
        Assert.Equal("projeto_semana_bloqueado", ex.Code);
    }

    // --- Reforco nunca ocupa a vaga da ponte -------------------------------------------------------

    [Fact]
    public void CreateDailyReinforcement_SkipsTheBridgeSlot_EvenBeforeTheBridgeExists()
    {
        var weekly = DailyFixtures.NewWeekly();
        var weak = DailyFixtures.NewWeakDaily(weekly, 5, DailyFixtures.Today);

        var reinforcement = weekly.CreateDailyReinforcement(weak.Id, DailyFixtures.Today);

        Assert.Equal(7, reinforcement.DayNumber); // 6 fica pra ponte, que pode ser curada depois
        weekly.AddDaily(weekly.Template.AddDailyTemplate(6, ProjectLanguage.Python), DailyFixtures.Today);
    }

    // --- Pausa da ofensiva ------------------------------------------------------------------------

    [Fact]
    public void StreakPauseWindows_OpenProject_PausesFromTomorrowForFourteenDays()
    {
        var weekly = DailyFixtures.NewWeekly();
        CompleteContentDay(weekly, 1);
        weekly.InitializeProject();

        var pause = Assert.Single(StreakPauseWindows.Compute([weekly]));

        var today = DateOnly.FromDateTime(DateTime.UtcNow.ToLocalTime());
        Assert.Equal(today.AddDays(1), pause.From);
        Assert.Equal(today.AddDays(StreakPauseWindows.MaxPauseDays), pause.To);
    }

    [Fact]
    public void StreakPauseWindows_NoPause_WhileADailyIsStillPending()
    {
        var (weekly, _) = NewWeekWithContentDoneAndBridgePending();

        Assert.Empty(StreakPauseWindows.Compute([weekly]));
    }

    [Fact]
    public void StreakPauseWindows_WeekClosedTheSameDay_NoPause()
    {
        var weekly = DailyFixtures.NewWeekly();
        CompleteContentDay(weekly, 1);
        weekly.InitializeProject();
        weekly.SubmitProject(Repo);
        weekly.Project!.Evaluate(90, null);
        var publication = weekly.StartPublication();
        publication.Submit(PublicationPlatform.LinkedIn, "https://www.linkedin.com/posts/aluno_teste-activity-1");
        publication.MarkValidated();

        Assert.Empty(StreakPauseWindows.Compute([weekly]));
    }

    // --- Renumeracao 60 -> 72 ---------------------------------------------------------------------

    [Theory]
    [InlineData(1, 1)]
    [InlineData(5, 5)]
    [InlineData(6, 7)]
    [InlineData(10, 11)]
    [InlineData(16, 19)]
    [InlineData(56, 67)]
    [InlineData(60, 71)]
    public void NewDayNumber_SixDaysPerWeek(int oldDay, int newDay) =>
        Assert.Equal(newDay, CurriculumRenumbering.NewDayNumber(oldDay));

    [Theory]
    [InlineData("SQLi (Dia 16) e SSTI (Dia 20)", "SQLi (Dia 19) e SSTI (Dia 23)")]
    [InlineData("Os Dias 16 a 20 cobriram", "Os Dias 19 a 23 cobriram")]
    [InlineData("injeções dos Dias 16-20", "injeções dos Dias 19-23")]
    [InlineData("CloudTrail (Dia 49, Dia 51)", "CloudTrail (Dia 58, Dia 61)")]
    [InlineData("Os Dias 1 a 5 desta semana", "Os Dias 1 a 5 desta semana")]
    [InlineData("No Dia 5, o Wireshark", "No Dia 5, o Wireshark")]
    [InlineData("nada de dia aqui", "nada de dia aqui")]
    public void RenumberDayReferences_RenumbersEveryDayInTheReference(string before, string after) =>
        Assert.Equal(after, CurriculumRenumbering.RenumberDayReferences(before));

    // --- helpers ------------------------------------------------------------------------------------

    /// <summary>Semana 1 com o Dia 5 concluido (ontem), a ponte (Dia 6) pendente nas 2 linguagens e o projeto Pending.</summary>
    private static (Weekly Weekly, Daily Bridge) NewWeekWithContentDoneAndBridgePending()
    {
        var weekly = DailyFixtures.NewWeekly();
        AddLanguageVariants(weekly);
        var day5 = CompleteContentDay(weekly, 5);
        DailyFixtures.BackdateCompletion(day5, 1);
        var bridge = AddBridge(weekly);
        weekly.InitializeProject();
        return (weekly, bridge);
    }

    private static void AddLanguageVariants(Weekly weekly)
    {
        weekly.Template.AddLanguageVariant(ProjectLanguage.Python, "template-python");
        weekly.Template.AddLanguageVariant(ProjectLanguage.JavaScript, "template-javascript");
    }

    private static Daily AddBridge(Weekly weekly)
    {
        weekly.Template.AddDailyTemplate(6, ProjectLanguage.Python);
        weekly.Template.AddDailyTemplate(6, ProjectLanguage.JavaScript);
        return weekly.AddDaily(weekly.Template.DefaultDailyTemplatesByDay().Single(t => t.DayNumber == 6), DailyFixtures.Today);
    }

    private static Daily CompleteContentDay(Weekly weekly, int dayNumber)
    {
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, dayNumber, DailyFixtures.Today);
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, 100);
        daily.Complete();
        return daily;
    }
}
