using System.Linq;
using Focadu.Application.Seed;
using Focadu.Domain.Enums;
using Focadu.Domain.Weeklies;
using Xunit;

namespace Focadu.Tests.Seed;

public class CuratedDayImporterTests
{
    private static WeeklyTemplate NewWeeklyTemplate() => new(Guid.NewGuid(), 1, "Semana Teste");

    [Fact]
    public void Import_CreatesDailyTemplateWithContentAndActivitiesInOrder()
    {
        const string json = """
        {
          "dayNumber": 7,
          "curatedContents": [
            { "ref": "reading", "type": "Reading", "title": "Titulo", "externalUrl": null, "bodyText": "Corpo do texto" },
            { "ref": "video", "type": "Video", "title": "Video", "externalUrl": "https://youtube.com/x", "bodyText": null }
          ],
          "activities": [
            { "type": "Reading", "answerMode": "MultipleChoice", "contentRef": "reading" },
            { "type": "Video", "answerMode": "MultipleChoice", "contentRef": "video" },
            {
              "type": "Quiz", "answerMode": "MultipleChoice", "prompt": "Pergunta?",
              "quizOptions": [
                { "text": "Errada", "isCorrect": false },
                { "text": "Certa", "isCorrect": true }
              ]
            },
            { "type": "Cloze", "answerMode": "FreeText", "prompt": "Complete _____", "expectedAnswer": "isso" }
          ]
        }
        """;

        var weeklyTemplate = NewWeeklyTemplate();
        CuratedDayImporter.Import(weeklyTemplate, json);

        var daily = Assert.Single(weeklyTemplate.DailyTemplates);
        Assert.Equal(7, daily.DayNumber);
        Assert.Equal(2, weeklyTemplate.CuratedContents.Count);

        var activities = daily.Activities.OrderBy(a => a.OrderIndex).ToList();
        Assert.Equal(4, activities.Count);
        Assert.Equal([0, 1, 2, 3], activities.Select(a => a.OrderIndex));

        var reading = activities[0];
        Assert.Equal(ActivityType.Reading, reading.Type);
        Assert.Equal(weeklyTemplate.CuratedContents.Single(c => c.Title == "Titulo").Id, reading.ContentId);

        var quiz = activities[2];
        Assert.Equal(2, quiz.QuizOptions.Count);
        Assert.Single(quiz.QuizOptions, o => o is { Text: "Certa", IsCorrect: true });

        var cloze = activities[3];
        Assert.Equal("isso", cloze.ExpectedAnswer);
    }

    [Fact]
    public void Import_RoleplayNodeReferencingLaterNode_ResolvesNextNodeId()
    {
        // "start" aponta pra "term_ideal", que so aparece DEPOIS no array - mesmo padrao de
        // dia-1.json (a ordem do JSON nao e topologica), exercita as duas passadas do importer.
        const string json = """
        {
          "dayNumber": 1,
          "curatedContents": [],
          "activities": [
            {
              "type": "Roleplay", "answerMode": "FreeText", "prompt": "Cenario",
              "roleplayNodes": [
                { "nodeKey": "start", "text": "Inicio", "isTerminal": false, "options": [{ "text": "Ir", "nextNodeKey": "term_ideal" }] },
                { "nodeKey": "term_ideal", "text": "Fim", "isTerminal": true, "terminalQuality": "Ideal" }
              ]
            }
          ]
        }
        """;

        var weeklyTemplate = NewWeeklyTemplate();
        CuratedDayImporter.Import(weeklyTemplate, json);

        var roleplay = weeklyTemplate.DailyTemplates.Single().Activities.Single();
        var start = roleplay.RoleplayNodes.Single(n => n.NodeKey == "start");
        var terminal = roleplay.RoleplayNodes.Single(n => n.NodeKey == "term_ideal");

        var option = Assert.Single(start.Options);
        Assert.Equal(terminal.Id, option.NextNodeId);
    }

    [Fact]
    public void Import_ActivityWithUnknownContentRef_Throws()
    {
        const string json = """
        {
          "dayNumber": 1,
          "curatedContents": [],
          "activities": [
            { "type": "Reading", "answerMode": "MultipleChoice", "contentRef": "nao_existe" }
          ]
        }
        """;

        Assert.Throws<InvalidOperationException>(() => CuratedDayImporter.Import(NewWeeklyTemplate(), json));
    }
}
