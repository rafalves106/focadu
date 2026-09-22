using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Users;
using Focadu.Domain.Weeklies;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Weeklies;

/// <summary>
/// Fase 59 (piloto da Semana 1): linguagem do Projeto Semanal - variantes por linguagem e
/// referencias na WeeklyTemplate, escolha irreversivel no WeeklyProject/Weekly e preferencia do
/// aluno no User.
/// </summary>
public class ProjectLanguageTests
{
    private const string PythonSlug = "template-web-security-semana-1-python";
    private const string JavaScriptSlug = "template-web-security-semana-1-javascript";
    private const string PythonRepo = "http://localhost:3020/aluno-1/template-web-security-semana-1-python.git";

    // --- WeeklyTemplate: variantes ---------------------------------------------------------------

    [Fact]
    public void HasLanguageVariants_IsFalse_UntilAVariantIsAdded()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        Assert.False(template.HasLanguageVariants);

        template.AddLanguageVariant(ProjectLanguage.Python, PythonSlug);

        Assert.True(template.HasLanguageVariants);
    }

    [Fact]
    public void AddLanguageVariant_SameLanguageTwice_Throws()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        template.AddLanguageVariant(ProjectLanguage.Python, PythonSlug);

        Assert.Throws<DomainException>(() => template.AddLanguageVariant(ProjectLanguage.Python, "outro-slug"));
    }

    [Fact]
    public void AddLanguageVariant_SameSlugInTwoLanguages_Throws()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        template.AddLanguageVariant(ProjectLanguage.Python, PythonSlug);

        Assert.Throws<DomainException>(() => template.AddLanguageVariant(ProjectLanguage.JavaScript, PythonSlug));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void AddLanguageVariant_EmptySlug_Throws(string slug)
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");

        Assert.Throws<DomainException>(() => template.AddLanguageVariant(ProjectLanguage.Python, slug));
    }

    [Fact]
    public void AddLanguageVariant_UndefinedLanguage_Throws()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");

        var ex = Assert.Throws<DomainException>(() => template.AddLanguageVariant((ProjectLanguage)99, PythonSlug));

        Assert.Equal("linguagem_invalida", ex.Code);
    }

    // --- WeeklyTemplate: slug resolvido (fork e avaliacao) ---------------------------------------

    [Fact]
    public void ResolveForgejoTemplateSlug_UsesTheChosenLanguagesVariant()
    {
        var template = NewTemplateWithBothLanguages();

        Assert.Equal(PythonSlug, template.ResolveForgejoTemplateSlug(ProjectLanguage.Python));
        Assert.Equal(JavaScriptSlug, template.ResolveForgejoTemplateSlug(ProjectLanguage.JavaScript));
    }

    [Fact]
    public void ResolveForgejoTemplateSlug_WithoutChosenLanguage_FallsBackToTheLegacySlug()
    {
        // Projeto que nasceu antes da Fase 59: fork unico, sem linguagem - a avaliacao dele
        // continua lendo o repositorio de sempre.
        var template = NewTemplateWithBothLanguages();
        template.SetProjectTemplateRepo("template-web-security-semana-1");

        Assert.Equal("template-web-security-semana-1", template.ResolveForgejoTemplateSlug(null));
    }

    [Fact]
    public void ResolveForgejoTemplateSlug_WeekWithoutVariants_IsTheLegacySlug()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 2, "Semana 2");
        template.SetProjectTemplateRepo("template-web-security-semana-2");

        Assert.Equal("template-web-security-semana-2", template.ResolveForgejoTemplateSlug(null));
    }

    // --- WeeklyTemplate: referencias -------------------------------------------------------------

    [Fact]
    public void ReferencesFor_ReturnsTheLanguagesReferencesPlusTheCommonOnes_InCurationOrder()
    {
        var template = NewTemplateWithBothLanguages();
        template.AddReference(ProjectLanguage.Python, "Scapy", "https://scapy.readthedocs.io/", "Captura e leitura de pcap");
        template.AddReference(null, "RFC 9293", "https://www.rfc-editor.org/rfc/rfc9293", "Handshake de 3 vias do TCP");
        template.AddReference(ProjectLanguage.JavaScript, "child_process", "https://nodejs.org/api/child_process.html", "Rodar o tshark");

        var forPython = template.ReferencesFor(ProjectLanguage.Python);

        Assert.Equal(new[] { "Scapy", "RFC 9293" }, forPython.Select(r => r.Title));
        Assert.Equal(new[] { "RFC 9293", "child_process" }, template.ReferencesFor(ProjectLanguage.JavaScript).Select(r => r.Title));
    }

    [Fact]
    public void AddReference_ForALanguageWithoutVariant_Throws()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        template.AddLanguageVariant(ProjectLanguage.Python, PythonSlug);

        Assert.Throws<DomainException>(() =>
            template.AddReference(ProjectLanguage.JavaScript, "x", "https://exemplo.com/", "y"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("nao-e-url")]
    [InlineData("ftp://exemplo.com/arquivo")]
    [InlineData("/caminho/relativo")]
    public void AddReference_InvalidUrl_Throws(string url)
    {
        var template = NewTemplateWithBothLanguages();

        var ex = Assert.Throws<DomainException>(() => template.AddReference(null, "Titulo", url, "Documenta algo"));

        Assert.Equal("url_referencia_invalida", ex.Code);
    }

    [Fact]
    public void AddReference_WithoutTitleOrDocuments_Throws()
    {
        var template = NewTemplateWithBothLanguages();

        Assert.Throws<DomainException>(() => template.AddReference(null, "", "https://exemplo.com/", "Documenta algo"));
        // "o que documenta" e obrigatorio: e o que a conferencia manual do link confirma.
        Assert.Throws<DomainException>(() => template.AddReference(null, "Titulo", "https://exemplo.com/", " "));
    }

    // --- WeeklyProject.ChooseLanguage ------------------------------------------------------------

    [Fact]
    public void ChooseLanguage_SetsLanguageAndRepository()
    {
        var project = NewWeeklyWithVariants().InitializeProject();

        project.ChooseLanguage(ProjectLanguage.Python, PythonRepo);

        Assert.Equal(ProjectLanguage.Python, project.Language);
        Assert.Equal(PythonRepo, project.SubmissionUrl);
        Assert.Equal(WeeklyProjectStatus.Pending, project.Status);
    }

    [Fact]
    public void ChooseLanguage_ReplacesALegacyRepositoryWithoutLanguage()
    {
        var project = NewWeeklyWithVariants().InitializeProject();
        project.AttachRepository("http://localhost:3020/aluno-1/template-web-security-semana-1.git"); // fork de antes da Fase 59

        project.ChooseLanguage(ProjectLanguage.Python, PythonRepo);

        Assert.Equal(PythonRepo, project.SubmissionUrl);
    }

    [Fact]
    public void ChooseLanguage_CannotBeChangedAfterwards()
    {
        var project = NewWeeklyWithVariants().InitializeProject();
        project.ChooseLanguage(ProjectLanguage.Python, PythonRepo);

        var ex = Assert.Throws<DomainException>(() => project.ChooseLanguage(ProjectLanguage.JavaScript, "http://x/y.git"));

        Assert.Equal("linguagem_ja_escolhida", ex.Code);
        Assert.Equal(ProjectLanguage.Python, project.Language);
        Assert.Equal(PythonRepo, project.SubmissionUrl);
    }

    [Fact]
    public void ChooseLanguage_AfterSubmit_Throws()
    {
        var project = NewWeeklyWithVariants().InitializeProject();
        project.Submit("https://github.com/falves/projeto");

        var ex = Assert.Throws<DomainException>(() => project.ChooseLanguage(ProjectLanguage.Python, PythonRepo));

        Assert.Equal("projeto_nao_pendente", ex.Code);
        Assert.Null(project.Language);
    }

    [Fact]
    public void ChooseLanguage_WithoutRepositoryUrl_Throws()
    {
        var project = NewWeeklyWithVariants().InitializeProject();

        Assert.Throws<DomainException>(() => project.ChooseLanguage(ProjectLanguage.Python, " "));
        Assert.Null(project.Language);
    }

    // --- Weekly: quando da pra escolher ----------------------------------------------------------

    [Fact]
    public void ChooseProjectLanguage_Throws_WhileDailiesArentAllCompleted()
    {
        // Decisao do dono: so com o projeto desbloqueado (mesma regra de SubmitProject).
        var weekly = DailyFixtures.NewWeekly();
        weekly.Template.AddLanguageVariant(ProjectLanguage.Python, PythonSlug);
        DailyFixtures.NewDaily(weekly, 1, DailyFixtures.Today);
        weekly.InitializeProject();

        var ex = Assert.Throws<DomainException>(() => weekly.ChooseProjectLanguage(ProjectLanguage.Python, PythonRepo));

        Assert.Equal("projeto_semana_bloqueado", ex.Code);
        Assert.Null(weekly.Project!.Language);
    }

    [Fact]
    public void ChooseProjectLanguage_Succeeds_WhenUnlocked()
    {
        var weekly = NewWeeklyWithVariants();
        weekly.InitializeProject();

        var project = weekly.ChooseProjectLanguage(ProjectLanguage.JavaScript, "http://localhost:3020/aluno-1/js.git");

        Assert.Equal(ProjectLanguage.JavaScript, project.Language);
    }

    [Fact]
    public void ChooseProjectLanguage_Throws_ForALanguageTheWeekDoesNotHave()
    {
        var weekly = DailyFixtures.NewWeekly();
        weekly.Template.AddLanguageVariant(ProjectLanguage.Python, PythonSlug); // so Python
        CompleteDailies(weekly);
        weekly.InitializeProject();

        var ex = Assert.Throws<DomainException>(() => weekly.ChooseProjectLanguage(ProjectLanguage.JavaScript, "http://x/y.git"));

        Assert.Equal("linguagem_indisponivel", ex.Code);
    }

    [Fact]
    public void EnsureProjectLanguageCanBeChosen_Throws_ForAWeekWithoutVariants()
    {
        // Piloto so da Semana 1: as demais semanas nao tem escolha de linguagem.
        var weekly = DailyFixtures.NewWeekly(2);
        CompleteDailies(weekly);
        weekly.InitializeProject();

        var ex = Assert.Throws<DomainException>(() => weekly.EnsureProjectLanguageCanBeChosen());

        Assert.Equal("semana_sem_variantes_de_linguagem", ex.Code);
    }

    [Fact]
    public void EnsureProjectLanguageCanBeChosen_Throws_WhenAlreadyChosen()
    {
        var weekly = NewWeeklyWithVariants();
        weekly.InitializeProject();
        weekly.ChooseProjectLanguage(ProjectLanguage.Python, PythonRepo);

        var ex = Assert.Throws<DomainException>(() => weekly.EnsureProjectLanguageCanBeChosen());

        Assert.Equal("linguagem_ja_escolhida", ex.Code);
    }

    // --- User.PreferredLanguages -----------------------------------------------------------------

    [Fact]
    public void CompleteProfile_SetsPreferredLanguages_DistinctAndOrdered()
    {
        var user = NewUser();

        user.CompleteProfile(["Games"], null, [ProjectLanguage.JavaScript, ProjectLanguage.Python, ProjectLanguage.JavaScript]);

        Assert.Equal(new[] { ProjectLanguage.Python, ProjectLanguage.JavaScript }, user.PreferredLanguages);
    }

    [Fact]
    public void CompleteProfile_WithoutLanguages_KeepsWhatWasAlreadyChosen()
    {
        // Cliente antigo (que ainda nao manda linguagens) nao pode apagar a escolha do aluno.
        var user = NewUser();
        user.CompleteProfile(["Games"], null, [ProjectLanguage.Python]);

        user.CompleteProfile(["Cinema"], "notas", preferredLanguages: null);

        Assert.Equal(new[] { ProjectLanguage.Python }, user.PreferredLanguages);
        Assert.Equal(new[] { "Cinema" }, user.Interests);
    }

    [Fact]
    public void CompleteProfile_WithEmptyLanguages_ClearsThem()
    {
        var user = NewUser();
        user.CompleteProfile([], null, [ProjectLanguage.Python]);

        user.CompleteProfile([], null, []);

        Assert.Empty(user.PreferredLanguages);
    }

    [Fact]
    public void CompleteProfile_WithAnInvalidLanguage_ChangesNothing()
    {
        var user = NewUser();
        user.CompleteProfile(["Games"], null, [ProjectLanguage.Python]);

        Assert.Throws<DomainException>(() => user.CompleteProfile(["Cinema"], null, [(ProjectLanguage)99]));

        Assert.Equal(new[] { "Games" }, user.Interests);
        Assert.Equal(new[] { ProjectLanguage.Python }, user.PreferredLanguages);
    }

    // --- helpers ---------------------------------------------------------------------------------

    private static WeeklyTemplate NewTemplateWithBothLanguages()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        template.AddLanguageVariant(ProjectLanguage.Python, PythonSlug);
        template.AddLanguageVariant(ProjectLanguage.JavaScript, JavaScriptSlug);
        return template;
    }

    /// <summary>Semana com as 2 variantes e as Dailies ja concluidas (projeto desbloqueado).</summary>
    private static Weekly NewWeeklyWithVariants()
    {
        var weekly = DailyFixtures.NewWeekly();
        weekly.Template.AddLanguageVariant(ProjectLanguage.Python, PythonSlug);
        weekly.Template.AddLanguageVariant(ProjectLanguage.JavaScript, JavaScriptSlug);
        CompleteDailies(weekly);
        return weekly;
    }

    private static void CompleteDailies(Weekly weekly)
    {
        var (_, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, weekly.Dailies.Count + 1, DailyFixtures.Today);
        var daily = weekly.Dailies.Last();
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, 100);
        daily.Complete();
    }

    private static User NewUser() => User.Create("aluno@example.com", "hash", "Aluno");
}
