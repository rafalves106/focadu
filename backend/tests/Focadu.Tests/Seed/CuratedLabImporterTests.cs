using System.IO;
using System.Linq;
using Focadu.Application.Seed;
using Focadu.Domain.Enums;
using Focadu.Domain.Weeklies;
using Xunit;

namespace Focadu.Tests.Seed;

/// <summary>Fase 86: o bloco lab, o codigo inicial e o opt-out por passo chegam do dia-N.json ao dominio (CURADORIA.md 5.2).</summary>
public class CuratedLabImporterTests
{
    private static WeeklyTemplate NewWeeklyTemplate() => new(Guid.NewGuid(), 2, "Semana Teste");

    private const string LinuxDay = """
    {
      "dayNumber": 12,
      "lab": { "runtime": "bash", "image": "servidor", "files": ["arquivo"], "services": ["lab_http.py"],
               "entry": "auditar.sh", "command": "bash auditar.sh lab", "timeoutSeconds": 10 },
      "curatedContents": [
        { "ref": "arquivo", "type": "File", "title": "lab_http.py", "externalUrl": "/ponte/linux/semana-2/lab_http.py", "bodyText": null }
      ],
      "activities": [
        { "type": "CodeStep", "answerMode": "FreeText", "contentRef": "arquivo", "prompt": "p1", "codeStarter": "set -euo pipefail",
          "codeSolution": "a", "codeExpectedOutput": "b", "codeRubric": "c" },
        { "type": "CodeStep", "answerMode": "FreeText", "contentRef": "arquivo", "prompt": "p2", "lab": false,
          "codeSolution": "a", "codeExpectedOutput": "b", "codeRubric": "c" }
      ]
    }
    """;

    [Fact]
    public void Import_ReadsTheLab_TheStarter_AndTheStepOptOut()
    {
        var week = NewWeeklyTemplate();
        CuratedDayImporter.Import(week, LinuxDay);

        var day = Assert.Single(week.DailyTemplates);
        var file = Assert.Single(week.CuratedContents);
        Assert.Equal("bash", day.Lab!.Runtime);
        Assert.Equal("servidor", day.Lab.Image);
        Assert.Equal([file.Id], day.Lab.FileContentIds);
        Assert.Equal(["lab_http.py"], day.Lab.Services);
        Assert.Equal("bash auditar.sh lab", day.Lab.Command);

        var steps = day.Activities.OrderBy(a => a.OrderIndex).ToList();
        Assert.Equal("set -euo pipefail", steps[0].CodeStarter);
        Assert.False(steps[0].LabDisabled);
        Assert.True(steps[1].LabDisabled);
    }

    [Fact]
    public void Import_WithoutLab_LeavesTheDayAsItWas()
    {
        var week = NewWeeklyTemplate();
        CuratedDayImporter.Import(week, """
        { "dayNumber": 6, "curatedContents": [], "activities": [
          { "type": "CodeStep", "answerMode": "FreeText", "prompt": "p", "codeSolution": "a", "codeExpectedOutput": "b", "codeRubric": "c" } ] }
        """);

        var day = Assert.Single(week.DailyTemplates);
        Assert.Null(day.Lab);
        Assert.Null(day.Activities.Single().CodeStarter);
    }

    [Theory]
    [InlineData("\"files\": [\"arquivo\"]", "\"files\": [\"reading\"]", "nao e um File")]            // ref que e uma Reading
    [InlineData("\"files\": [\"arquivo\"]", "\"files\": [\"inexistente\"]", "nao e um File")]        // ref que nao existe
    [InlineData("\"services\": [\"lab_http.py\"]", "\"services\": [\"outro.py\"]", "nao e o titulo de um File")] // servico fora dos files
    public void Import_RejectsALabThatPointsAtTheWrongFiles(string original, string replacement, string expectedMessage)
    {
        const string reading = "{ \"ref\": \"reading\", \"type\": \"Reading\", \"title\": \"t\", \"externalUrl\": null, \"bodyText\": \"x\" },";
        var json = LinuxDay.Replace("\"curatedContents\": [", "\"curatedContents\": [" + reading).Replace(original, replacement);

        var ex = Assert.Throws<InvalidOperationException>(() => CuratedDayImporter.Import(NewWeeklyTemplate(), json));
        Assert.Contains(expectedMessage, ex.Message);
    }

    [Fact]
    public void ApplyLab_UpdatesAnExistingDay_WithoutReimporting_AndIsIdempotent()
    {
        // dia ja no banco no formato da Fase 79 (sem lab), com o mesmo File
        var week = NewWeeklyTemplate();
        CuratedDayImporter.Import(week, LinuxDay.Replace("\"lab\": { \"runtime\"", "\"semLab\": { \"runtime\"").Replace("\"codeStarter\": \"set -euo pipefail\",", "").Replace("\"lab\": false,", ""));
        var day = week.DailyTemplates.Single();
        Assert.Null(day.Lab);
        var activityIds = day.Activities.Select(a => a.Id).ToList();

        var path = Path.Combine(Path.GetTempPath(), $"lab-{Guid.NewGuid():N}.json");
        File.WriteAllText(path, LinuxDay);
        try
        {
            Assert.True(CuratedDayImporter.ApplyLab(week, day, path));
            Assert.Equal("bash", day.Lab!.Runtime);
            Assert.Equal(week.CuratedContents.Single().Id, day.Lab.FileContentIds.Single());
            var steps = day.Activities.OrderBy(a => a.OrderIndex).ToList();
            Assert.Equal("set -euo pipefail", steps[0].CodeStarter);
            Assert.True(steps[1].LabDisabled);
            Assert.Equal(activityIds, day.Activities.Select(a => a.Id)); // mesmas atividades: nada foi reimportado

            Assert.False(CuratedDayImporter.ApplyLab(week, day, path)); // 2a vez: nada muda
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public void ApplyLab_WithLanguageVariants_KeepsEachDaysOwnFile()
    {
        // Python e JavaScript importam, cada uma, um File com o mesmo externalUrl na mesma semana. O sync
        // nao pode apontar o lab da variante JavaScript pro File da Python (bug pego no seed de verdade).
        var week = NewWeeklyTemplate();
        CuratedDayImporter.Import(week, LinuxDay, ProjectLanguage.Python);
        CuratedDayImporter.Import(week, LinuxDay, ProjectLanguage.JavaScript);
        var python = week.DailyTemplates.Single(d => d.Language == ProjectLanguage.Python);
        var javascript = week.DailyTemplates.Single(d => d.Language == ProjectLanguage.JavaScript);
        Assert.NotEqual(python.Lab!.FileContentIds.Single(), javascript.Lab!.FileContentIds.Single());

        var path = Path.Combine(Path.GetTempPath(), $"lab-{Guid.NewGuid():N}.json");
        File.WriteAllText(path, LinuxDay);
        try
        {
            Assert.False(CuratedDayImporter.ApplyLab(week, python, path));
            Assert.False(CuratedDayImporter.ApplyLab(week, javascript, path));
            Assert.Contains(javascript.Lab!.FileContentIds.Single(), javascript.Activities.Select(a => a.ContentId!.Value));
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public void ApplyLab_ADayWhoseFileLostTheLab_TurnsTheLabOff()
    {
        var week = NewWeeklyTemplate();
        CuratedDayImporter.Import(week, LinuxDay);
        var day = week.DailyTemplates.Single();

        var path = Path.Combine(Path.GetTempPath(), $"lab-{Guid.NewGuid():N}.json");
        File.WriteAllText(path, LinuxDay.Replace("\"lab\": { \"runtime\"", "\"semLab\": { \"runtime\""));
        try
        {
            Assert.True(CuratedDayImporter.ApplyLab(week, day, path));
            Assert.Null(day.Lab);
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public void ApplyLab_RefusesWhenTheStepsDoNotMatch()
    {
        var week = NewWeeklyTemplate();
        // dia ja no banco com 1 passo de codigo; o arquivo (LinuxDay) tem 2
        CuratedDayImporter.Import(week, """
        { "dayNumber": 12, "curatedContents": [], "activities": [
          { "type": "CodeStep", "answerMode": "FreeText", "prompt": "p1", "codeSolution": "a", "codeExpectedOutput": "b", "codeRubric": "c" } ] }
        """);
        var day = week.DailyTemplates.Single();

        var path = Path.Combine(Path.GetTempPath(), $"lab-{Guid.NewGuid():N}.json");
        File.WriteAllText(path, LinuxDay);
        try
        {
            var ex = Assert.Throws<InvalidOperationException>(() => CuratedDayImporter.ApplyLab(week, day, path));
            Assert.Contains("reimporte", ex.Message);
        }
        finally
        {
            File.Delete(path);
        }
    }
}
