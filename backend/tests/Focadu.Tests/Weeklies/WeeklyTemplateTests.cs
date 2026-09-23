using Focadu.Domain.Exceptions;
using Focadu.Domain.Weeklies;
using Xunit;

namespace Focadu.Tests.Weeklies;

/// <summary>Fase 13: WeeklyTemplate e o lado curriculo do split (era o antigo Weekly). SetProjectSpec substitui o antigo DefineProject(specText) - so guarda o texto, nao cria mais um WeeklyProject (isso agora e responsabilidade de Weekly-instancia, ver EnrollUserInCourseUseCase).</summary>
public class WeeklyTemplateTests
{
    [Fact]
    public void SetProjectSpec_SetsText()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");

        template.SetProjectSpec("Faca X.");

        Assert.Equal("Faca X.", template.WeeklyProjectSpecText);
    }

    [Fact]
    public void SetProjectSpec_Empty_Throws()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");

        Assert.Throws<DomainException>(() => template.SetProjectSpec(""));
    }

    [Fact]
    public void SetProjectSpec_CalledTwice_Throws()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        template.SetProjectSpec("Faca X.");

        Assert.Throws<DomainException>(() => template.SetProjectSpec("Faca Y."));
    }

    [Fact]
    public void AddDailyTemplate_DuplicateDayNumber_Throws()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        template.AddDailyTemplate(1);

        Assert.Throws<DomainException>(() => template.AddDailyTemplate(1));
    }

    // Fase 64: briefing da Focada no Projeto Semanal.

    [Fact]
    public void SetProjectBriefing_SetsLinesAndStateLines()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");

        template.SetProjectBriefing(["Agente, missao nova.", "Boa sorte."], new Dictionary<string, string> { ["entregue"] = "Recebido." });

        Assert.Equal(["Agente, missao nova.", "Boa sorte."], template.WeeklyProjectBriefing);
        Assert.Equal("Recebido.", template.WeeklyProjectStateLines["entregue"]);
    }

    [Fact]
    public void SetProjectBriefing_NoStateLines_LeavesDictionaryEmpty()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");

        template.SetProjectBriefing(["Agente."]);

        Assert.Empty(template.WeeklyProjectStateLines);
    }

    [Fact]
    public void SetProjectBriefing_EmptyOrBlankLine_Throws()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");

        Assert.Throws<DomainException>(() => template.SetProjectBriefing([]));
        Assert.Throws<DomainException>(() => template.SetProjectBriefing(["Agente.", " "]));
    }

    [Fact]
    public void SetProjectBriefing_LineOverMaxLength_Throws()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        var tooLong = new string('a', WeeklyTemplate.MaxDialogueLineLength + 1);

        Assert.Throws<DomainException>(() => template.SetProjectBriefing([tooLong]));
        Assert.Throws<DomainException>(() => template.SetProjectBriefing(["Ok."], new Dictionary<string, string> { ["entregue"] = tooLong }));
    }

    [Fact]
    public void SetProjectBriefing_UnknownStateKey_Throws()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");

        Assert.Throws<DomainException>(() => template.SetProjectBriefing(["Ok."], new Dictionary<string, string> { ["aprovado"] = "Oi." }));
    }

    [Fact]
    public void SetProjectBriefing_CalledTwice_Throws()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana 1");
        template.SetProjectBriefing(["Agente."]);

        Assert.Throws<DomainException>(() => template.SetProjectBriefing(["De novo."]));
    }
}
