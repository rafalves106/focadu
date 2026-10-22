using Focadu.Application.Seed;
using Focadu.Domain.Enums;
using Focadu.Domain.Weeklies;
using Focadu.Infrastructure.Services;
using Xunit;

namespace Focadu.Tests.Seed;

/// <summary>Importador de projeto.json: substituir o projeto antigo (variantes, referencias) e saber se ja esta igual.</summary>
public class CuratedProjectImportTests
{
    private const string OldJson = """
    { "weekNumber": 1, "title": "Antigo", "specText": "### Objetivo\nantigo",
      "languages": [ { "language": "python", "forgejoTemplateSlug": "modelo-py" }, { "language": "javascript", "forgejoTemplateSlug": "modelo-js" } ],
      "references": [ { "language": "python", "title": "Doc", "url": "https://docs.python.org", "documents": "urllib", "verifiedAt": "2026-09-21" } ],
      "briefing": ["fala antiga"] }
    """;

    private const string NewJson = """
    { "weekNumber": 1, "title": "Inspetor", "specText": "### Objetivo\nnovo", "forgejoTemplateSlug": "modelo-inspetor",
      "briefing": ["fala um", "fala dois", "fala tres"] }
    """;

    private static WeeklyTemplate Week() => new(Guid.NewGuid(), 1, "Semana 1");

    [Fact]
    public void ClearProject_ThenImport_ReplacesEverythingFromTheOldProject()
    {
        var week = Week();
        CuratedProjectImporter.Import(week, OldJson);
        Assert.True(week.HasLanguageVariants);

        week.ClearProject();
        CuratedProjectImporter.Import(week, NewJson);

        Assert.Equal("### Objetivo\nnovo", week.WeeklyProjectSpecText);
        Assert.Equal(["fala um", "fala dois", "fala tres"], week.WeeklyProjectBriefing);
        Assert.Equal("modelo-inspetor", week.ForgejoTemplateSlug);
        Assert.False(week.HasLanguageVariants);
        Assert.Empty(week.References);
    }

    [Fact]
    public void Matches_IsTrueOnlyWhenTheWeekIsEqualToTheFile()
    {
        var week = Week();
        CuratedProjectImporter.Import(week, NewJson);
        Assert.True(CuratedProjectImporter.Matches(week, NewJson));
        Assert.False(CuratedProjectImporter.Matches(week, NewJson.Replace("fala dois", "outra fala")));
        Assert.False(CuratedProjectImporter.Matches(week, OldJson));

        var old = Week();
        CuratedProjectImporter.Import(old, OldJson);
        Assert.False(CuratedProjectImporter.Matches(old, NewJson));
    }

    [Fact]
    public void NodeDayLinter_ParseProject_ReadsPassedAndFailedOutput()
    {
        Assert.True(NodeDayLinter.ParseProject(0, "PASSOU\n", "").Passed);

        var bad = NodeDayLinter.ParseProject(1, "REPROVOU\n- briefing deve ter de 3 a 5 falas\n- 7 critérios (máx. 6)\n", "");
        Assert.True(bad.Available);
        Assert.False(bad.Passed);
        Assert.Equal(["briefing deve ter de 3 a 5 falas", "7 critérios (máx. 6)"], bad.Errors);

        Assert.False(NodeDayLinter.ParseProject(2, "", "uso").Available);
    }
}
