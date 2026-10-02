using System.IO;
using System.Linq;
using Focadu.Application.Dailies;
using Focadu.Application.Seed;
using Focadu.Domain.Activities;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Weeklies;
using Xunit;

namespace Focadu.Tests.Seed;

/// <summary>Missao no terminal (dias normais do Linux): o bloco <c>missions</c> e o lab sem editor chegam do dia-N.json ao dominio (CURADORIA.md 5.3).</summary>
public class TerminalMissionImporterTests
{
    private static WeeklyTemplate NewWeeklyTemplate() => new(Guid.NewGuid(), 1, "Semana Teste");

    private const string Mission = """
    { "title": "Quem sou eu", "prompt": "Rode o comando que mostra seu usuario e grupos.", "hints": ["Pense em identidade.", "Sao duas letras."],
      "note": "O numero entre parenteses e o id.", "check": { "command": "^id\\b", "output": "uid=1000\\(ana\\)" } }
    """;

    private static string Day(string missions = Mission, string lab = """
        "lab": { "runtime": "bash", "image": "basico", "setup": ["addgroup -g 1002 devs", "adduser -D -s /bin/bash ana"], "user": "ana", "timeoutSeconds": 10 },
        """) => $$"""
    {
      "dayNumber": 2,
      {{lab}}
      "curatedContents": [ { "ref": "reading", "type": "Reading", "title": "t", "externalUrl": null, "bodyText": "x" } ],
      "activities": [
        { "type": "Reading", "answerMode": "MultipleChoice", "contentRef": "reading" },
        { "type": "TerminalMission", "answerMode": "FreeText", "prompt": "Mao na massa", "missions": [ {{missions}} ] },
        { "type": "Quiz", "answerMode": "MultipleChoice", "prompt": "q", "quizOptions": [ { "text": "a", "isCorrect": true }, { "text": "b", "isCorrect": false } ] }
      ]
    }
    """;

    [Fact]
    public void Import_ReadsTheMissions_TheEditorlessLab_AndDoesNotMakeTheDayABridge()
    {
        var week = NewWeeklyTemplate();
        CuratedDayImporter.Import(week, Day());

        var day = Assert.Single(week.DailyTemplates);
        Assert.False(day.IsBridge);
        Assert.True(day.Lab!.NoEditor);
        Assert.Equal("ana", day.Lab.User);
        Assert.Equal(["addgroup -g 1002 devs", "adduser -D -s /bin/bash ana"], day.Lab.Setup);

        var activity = day.Activities.Single(a => a.Type == ActivityType.TerminalMission);
        var mission = Assert.Single(activity.TerminalMissionList);
        Assert.Equal("Quem sou eu", mission.Title);
        Assert.Equal(2, mission.Hints.Count);
        Assert.Equal("^id\\b", mission.Check.Command);
        Assert.Null(mission.Check.Probe);
    }

    [Fact]
    public void Import_RejectsAMissionWithoutAnyCheck()
    {
        var bad = Mission.Replace("\"check\": { \"command\": \"^id\\\\b\", \"output\": \"uid=1000\\\\(ana\\\\)\" }", "\"check\": { }");
        var ex = Assert.Throws<DomainException>(() => CuratedDayImporter.Import(NewWeeklyTemplate(), Day(bad)));
        Assert.Equal("missao_sem_check", ex.Code);
    }

    [Fact]
    public void Import_RejectsAnInvalidRegex_AndAProbeWithoutState()
    {
        var regex = Mission.Replace("^id\\\\b", "(");
        Assert.Equal("missao_regex_invalida", Assert.Throws<DomainException>(() => CuratedDayImporter.Import(NewWeeklyTemplate(), Day(regex))).Code);

        var probe = Mission.Replace("\"output\"", "\"probe\": \"stat -c %a x\", \"output\"");
        Assert.Equal("missao_check_invalido", Assert.Throws<DomainException>(() => CuratedDayImporter.Import(NewWeeklyTemplate(), Day(probe))).Code);
    }

    [Fact]
    public void Import_RejectsSetupOutsideBash_AndACodeStepDayWithoutEntry()
    {
        var python = """
            "lab": { "runtime": "python", "setup": ["x"], "timeoutSeconds": 10 },
            """;
        Assert.Equal("lab_setup_invalido", Assert.Throws<DomainException>(() => CuratedDayImporter.Import(NewWeeklyTemplate(), Day(lab: python))).Code);

        const string codeDay = """
        { "dayNumber": 6, "lab": { "runtime": "bash", "image": "basico", "timeoutSeconds": 10 }, "curatedContents": [], "activities": [
          { "type": "CodeStep", "answerMode": "FreeText", "prompt": "p", "codeSolution": "a", "codeExpectedOutput": "b", "codeRubric": "c" } ] }
        """;
        Assert.Equal("lab_entry_obrigatorio", Assert.Throws<DomainException>(() => CuratedDayImporter.Import(NewWeeklyTemplate(), codeDay)).Code);
    }

    [Fact]
    public void ApplyMissions_InsertsTheActivityInTheMiddle_WithoutReimporting_AndIsIdempotent()
    {
        // dia ja no banco sem a missao (Reading, Quiz): so a missao entra, no meio, sem trocar os Ids.
        var week = NewWeeklyTemplate();
        var withoutMission = """
        { "dayNumber": 2, "curatedContents": [ { "ref": "reading", "type": "Reading", "title": "t", "externalUrl": null, "bodyText": "x" } ], "activities": [
          { "type": "Reading", "answerMode": "MultipleChoice", "contentRef": "reading" },
          { "type": "Quiz", "answerMode": "MultipleChoice", "prompt": "q", "quizOptions": [ { "text": "a", "isCorrect": true }, { "text": "b", "isCorrect": false } ] } ] }
        """;
        CuratedDayImporter.Import(week, withoutMission);
        var day = week.DailyTemplates.Single();
        var before = day.Activities.OrderBy(a => a.OrderIndex).Select(a => a.Id).ToList();

        var path = Path.Combine(Path.GetTempPath(), $"missao-{Guid.NewGuid():N}.json");
        File.WriteAllText(path, Day());
        try
        {
            Assert.True(CuratedDayImporter.ApplyMissions(day, path));
            var ordered = day.Activities.OrderBy(a => a.OrderIndex).ToList();
            Assert.Equal([ActivityType.Reading, ActivityType.TerminalMission, ActivityType.Quiz], ordered.Select(a => a.Type));
            Assert.Equal([0, 1, 2], ordered.Select(a => a.OrderIndex));
            Assert.Equal(before[0], ordered[0].Id);
            Assert.Equal(before[1], ordered[2].Id); // o Quiz so foi empurrado
            Assert.False(day.IsBridge);

            Assert.True(CuratedDayImporter.ApplyLab(week, day, path));
            Assert.True(day.Lab!.NoEditor);

            Assert.False(CuratedDayImporter.ApplyMissions(day, path)); // 2a vez: nada muda
            Assert.False(CuratedDayImporter.ApplyLab(week, day, path));
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public void ApplyMissions_RefusesADayWhoseOtherActivitiesDoNotMatchTheFile()
    {
        var week = NewWeeklyTemplate();
        CuratedDayImporter.Import(week, """{ "dayNumber": 2, "curatedContents": [], "activities": [ { "type": "Quiz", "answerMode": "MultipleChoice", "prompt": "q", "quizOptions": [ { "text": "a", "isCorrect": true }, { "text": "b", "isCorrect": false } ] } ] }""");
        var path = Path.Combine(Path.GetTempPath(), $"missao-{Guid.NewGuid():N}.json");
        File.WriteAllText(path, Day());
        try
        {
            Assert.Throws<InvalidOperationException>(() => CuratedDayImporter.ApplyMissions(week.DailyTemplates.Single(), path));
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public void RealLinuxDay2_ImportsWithFourMissionsAndAnEditorlessLab()
    {
        var path = TestContent.Resolve("linux", "semana-1", "dia-2.json");
        if (path is null) return; // curadoria fora do checkout (CI)

        var week = NewWeeklyTemplate();
        CuratedDayImporter.ImportFile(week, path);

        var day = Assert.Single(week.DailyTemplates);
        Assert.False(day.IsBridge);
        Assert.True(day.Lab!.NoEditor);
        Assert.Equal("agente", day.Lab.User);
        var missions = day.Activities.Single(a => a.Type == ActivityType.TerminalMission).TerminalMissionList;
        Assert.Equal(4, missions.Count);
        Assert.All(missions, m => Assert.InRange(m.Hints.Count, 1, 3));
    }

    [Theory]
    [InlineData("semana-1", 1)]
    [InlineData("semana-1", 3)]
    [InlineData("semana-1", 4)]
    [InlineData("semana-1", 5)]
    [InlineData("semana-2", 7)]
    [InlineData("semana-2", 8)]
    [InlineData("semana-2", 9)]
    [InlineData("semana-2", 11)]
    public void RealLinuxDays_HaveMissions_AndTheTerminalUserIsAgente(string week, int dayNumber)
    {
        var path = TestContent.Resolve("linux", week, $"dia-{dayNumber}.json");
        if (path is null) return; // curadoria fora do checkout (CI)

        var template = NewWeeklyTemplate();
        CuratedDayImporter.ImportFile(template, path);

        var day = Assert.Single(template.DailyTemplates);
        Assert.False(day.IsBridge);
        Assert.Equal("agente", day.Lab!.User);
        Assert.True(day.Lab.NoEditor);
        Assert.InRange(day.Activities.Single(a => a.Type == ActivityType.TerminalMission).TerminalMissionList.Count, 3, 5);
        Assert.DoesNotContain("docker run", template.CuratedContents.First(c => c.Type == Focadu.Domain.Enums.CuratedContentType.Reading).BodyText ?? "");
    }

    [Theory]
    [InlineData("semana-1", 6)]
    [InlineData("semana-2", 12)]
    public void RealLinuxBridges_RunTheTerminalAsAgente(string week, int dayNumber)
    {
        var path = TestContent.Resolve("linux", week, $"dia-{dayNumber}.json");
        if (path is null) return;

        var template = NewWeeklyTemplate();
        CuratedDayImporter.ImportFile(template, path);

        var day = Assert.Single(template.DailyTemplates);
        Assert.True(day.IsBridge);
        Assert.Equal("agente", day.Lab!.User);
        Assert.False(day.Lab.NoEditor);
    }

    [Fact]
    public void ResolveScore_TerminalMission_IsAFixedFullScore()
    {
        var week = NewWeeklyTemplate();
        CuratedDayImporter.Import(week, Day());
        var activity = week.DailyTemplates.Single().Activities.Single(a => a.Type == ActivityType.TerminalMission);

        Assert.Equal(100, SubmitActivityResponseUseCase.ResolveScore(activity, null, null, null));
    }

    [Fact]
    public void Import_ReadsTheV3Context_AndTheCommandSheet()
    {
        const string withContext = """
        { "title": "Ler as permissoes", "prompt": "crie o notas.txt e confira.", "hints": ["Tres passos."], "note": "rw-r-----.",
          "check": { "command": "^ls\\s+-l" }, "situation": " O time devs le suas notas. ", "goal": "Ver -rw-r-----.",
          "steps": ["Crie o arquivo", " ", "Confira com ls -l"] }
        """;
        var week = NewWeeklyTemplate();
        CuratedDayImporter.Import(week, Day(withContext).Replace(
            "\"missions\": [",
            "\"commands\": [ { \"command\": \"chmod 640 arq\", \"description\": \" dono, grupo, outros \" } ], \"missions\": ["));

        var activity = week.DailyTemplates.Single().Activities.Single(a => a.Type == ActivityType.TerminalMission);
        var mission = Assert.Single(activity.TerminalMissionList);
        Assert.Equal("O time devs le suas notas.", mission.Situation);
        Assert.Equal("Ver -rw-r-----.", mission.Goal);
        Assert.Equal(["Crie o arquivo", "Confira com ls -l"], mission.Steps);
        var command = Assert.Single(activity.TerminalCommandList);
        Assert.Equal(new TerminalCommand("chmod 640 arq", "dono, grupo, outros"), command);
    }

    [Fact]
    public void Parse_StillReadsTheOldListOnlyFormat()
    {
        const string old = """[{"title":"Quem sou eu","prompt":"p","hints":["h"],"note":"n","check":{"command":"^id"}}]""";

        var mission = Assert.Single(TerminalMissions.Parse(old));
        Assert.Equal("Quem sou eu", mission.Title);
        Assert.Null(mission.Situation);
        Assert.Empty(TerminalMissions.ParseCommands(old));
    }
}
