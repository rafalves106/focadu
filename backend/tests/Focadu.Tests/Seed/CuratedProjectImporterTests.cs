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
}
