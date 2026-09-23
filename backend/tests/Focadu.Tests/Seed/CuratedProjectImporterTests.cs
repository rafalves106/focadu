using Focadu.Application.Seed;
using Focadu.Domain.Weeklies;
using Xunit;

namespace Focadu.Tests.Seed;

public class CuratedProjectImporterTests
{
    private static WeeklyTemplate NewWeeklyTemplate() => new(Guid.NewGuid(), 1, "Semana Teste");

    [Fact]
    public void Import_SetsProjectSpecFromSpecTextField()
    {
        const string json = """
        {
          "weekNumber": 1,
          "title": "Sniffer CLI",
          "specText": "### Objetivo\n\nTexto do enunciado do projeto."
        }
        """;

        var weeklyTemplate = NewWeeklyTemplate();
        CuratedProjectImporter.Import(weeklyTemplate, json);

        Assert.Equal("### Objetivo\n\nTexto do enunciado do projeto.", weeklyTemplate.WeeklyProjectSpecText);
    }

    [Fact]
    public void Import_EmptySpecText_ThrowsDomainException()
    {
        const string json = """
        {
          "weekNumber": 1,
          "title": "Sniffer CLI",
          "specText": ""
        }
        """;

        Assert.Throws<Focadu.Domain.Exceptions.DomainException>(() =>
            CuratedProjectImporter.Import(NewWeeklyTemplate(), json));
    }

    // Fase 64: "briefing" e "falasDeEstado" opcionais.

    [Fact]
    public void Import_WithBriefingAndStateLines_SetsBoth()
    {
        const string json = """
        {
          "weekNumber": 1,
          "title": "Sniffer CLI",
          "specText": "### Objetivo",
          "briefing": ["Agente, missao nova.", "O enunciado completo esta no README."],
          "falasDeEstado": { "avaliadoAlta": "Nada mal, agente." }
        }
        """;

        var weeklyTemplate = NewWeeklyTemplate();
        CuratedProjectImporter.Import(weeklyTemplate, json);

        Assert.Equal(2, weeklyTemplate.WeeklyProjectBriefing.Length);
        Assert.Equal("Nada mal, agente.", weeklyTemplate.WeeklyProjectStateLines["avaliadoAlta"]);
    }

    [Fact]
    public void Import_WithoutBriefing_LeavesBriefingEmpty()
    {
        const string json = """
        { "weekNumber": 2, "title": "X", "specText": "### Objetivo" }
        """;

        var weeklyTemplate = NewWeeklyTemplate();
        CuratedProjectImporter.Import(weeklyTemplate, json);

        Assert.Empty(weeklyTemplate.WeeklyProjectBriefing);
    }

    [Fact]
    public void Import_StateLinesWithoutBriefing_ThrowsDomainException()
    {
        const string json = """
        { "weekNumber": 2, "title": "X", "specText": "### Objetivo", "falasDeEstado": { "entregue": "Oi." } }
        """;

        Assert.Throws<Focadu.Domain.Exceptions.DomainException>(() =>
            CuratedProjectImporter.Import(NewWeeklyTemplate(), json));
    }
}
