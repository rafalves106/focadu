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
}
