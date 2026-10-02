using System.Linq;
using Focadu.Application.Seed;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Weeklies;
using Focadu.Infrastructure.Services;
using Xunit;

namespace Focadu.Tests.Seed;

/// <summary>Plano de curadoria (02/10/2026): campos do molde v1, hash por dia e a decisao do importador.</summary>
public class CuratedDayMoldeV1Tests
{
    private static WeeklyTemplate NewWeeklyTemplate() => new(Guid.NewGuid(), 1, "Semana Teste");

    private static string DayJson(string bodyText = "Texto do bloco.", string prompt = "Explique o bloco.", string extra = "") => $$"""
    {
      "dayNumber": 3, "moldeVersion": "v1", "moldeTipo": "A",
      "targets": [ { "id": "t1", "text": "alvo um" }, { "id": "t2", "text": "alvo dois" }, { "id": "t3", "text": "alvo tres" } ],
      "curatedContents": [
        { "ref": "b1", "type": "Reading", "title": "Bloco 1", "bodyText": "{{bodyText}}", "source": "RFC 9110" }
      ],
      "activities": [
        { "type": "Reading", "answerMode": "MultipleChoice", "contentRef": "b1", "target": "t1" },
        { "type": "VoiceSummary", "answerMode": "FreeText", "contentRef": "b1", "target": "t1", "prompt": "{{prompt}}",
          "hint": "Pense no que o bloco explica.", "referenceAnswer": "A resposta correta e esta." },
        { "type": "VoiceSummary", "answerMode": "FreeText", "contentRef": "b1", "prompt": "Explique o dia.",
          "final": true, "topics": ["um", "dois", "tres"], "referenceAnswer": "Resumo do dia." }
        {{extra}}
      ]
    }
    """;

    [Fact]
    public void Import_MapsMoldeTargetsSourceAndVoiceFields()
    {
        var week = NewWeeklyTemplate();
        CuratedDayImporter.Import(week, DayJson());

        var day = Assert.Single(week.DailyTemplates);
        Assert.Equal("v1", day.MoldeVersion);
        Assert.Equal(3, day.Targets.Count);
        Assert.Equal("alvo dois", day.Targets[1].Text);
        Assert.Equal(CuratedDayImporter.ComputeHash(DayJson()), day.ContentHash);
        Assert.Equal("RFC 9110", week.CuratedContents.Single().Source);

        var voice = day.Activities.OrderBy(a => a.OrderIndex).Where(a => a.Type == ActivityType.VoiceSummary).ToList();
        Assert.Equal("t1", voice[0].Target);
        Assert.Equal("Pense no que o bloco explica.", voice[0].Hint);
        Assert.Equal("A resposta correta e esta.", voice[0].ReferenceAnswer);
        Assert.False(voice[0].IsFinalQuestion);
        Assert.True(voice[1].IsFinalQuestion);
        Assert.Equal(["um", "dois", "tres"], voice[1].Topics);
    }

    [Fact]
    public void Import_OldDayWithoutMoldeFieldsStillImports()
    {
        const string old = """
        { "dayNumber": 1, "curatedContents": [ { "ref": "r", "type": "Reading", "title": "T", "bodyText": "x" } ],
          "activities": [ { "type": "Reading", "answerMode": "MultipleChoice", "contentRef": "r" } ] }
        """;
        var week = NewWeeklyTemplate();
        CuratedDayImporter.Import(week, old);

        var day = Assert.Single(week.DailyTemplates);
        Assert.Null(day.MoldeVersion);
        Assert.Empty(day.Targets);
        Assert.NotNull(day.ContentHash);
    }

    [Fact]
    public void Import_FinalQuestionNeedsExactlyThreeTopics()
    {
        var bad = DayJson().Replace("[\"um\", \"dois\", \"tres\"]", "[\"um\"]");
        Assert.Throws<DomainException>(() => CuratedDayImporter.Import(NewWeeklyTemplate(), bad));
    }

    [Fact]
    public void Import_RejectsAnUnknownTarget()
    {
        var bad = DayJson().Replace("\"target\": \"t1\", \"prompt\"", "\"target\": \"t9\", \"prompt\"");
        Assert.Throws<DomainException>(() => CuratedDayImporter.Import(NewWeeklyTemplate(), bad));
    }

    [Fact]
    public void ComputeHash_IgnoresLineEndingsAndTrailingWhitespaceButNotContent()
    {
        var a = "{\n  \"x\": 1\n}\n";
        Assert.Equal(CuratedDayImporter.ComputeHash(a), CuratedDayImporter.ComputeHash(a.Replace("\n", "\r\n").TrimEnd()));
        Assert.NotEqual(CuratedDayImporter.ComputeHash(a), CuratedDayImporter.ComputeHash(a.Replace("1", "2")));
        Assert.Equal(64, CuratedDayImporter.ComputeHash(a).Length);
    }

    [Fact]
    public void ReplaceDay_SwapsActivitiesAndContentsKeepingTheSameTemplate()
    {
        var week = NewWeeklyTemplate();
        CuratedDayImporter.Import(week, DayJson());
        var template = week.DailyTemplates.Single();
        var oldFirstActivityId = template.Activities.OrderBy(a => a.OrderIndex).First().Id;

        var changed = DayJson(bodyText: "Texto novo do bloco.", prompt: "Pergunta nova.");
        var previous = CuratedDayImporter.ReplaceDay(week, template, changed);

        Assert.Same(template, week.DailyTemplates.Single());
        Assert.Equal(CuratedDayImporter.ComputeHash(changed), template.ContentHash);
        Assert.Equal(3, template.Activities.Count);
        Assert.DoesNotContain(template.Activities, a => a.Id == oldFirstActivityId);
        Assert.Equal("Pergunta nova.", template.Activities.Single(a => a.Type == ActivityType.VoiceSummary && !a.IsFinalQuestion).Prompt);
        Assert.Single(previous);
        // O conteudo antigo ainda esta na semana (quem chama remove os sem uso); o novo foi criado.
        Assert.Equal(2, week.CuratedContents.Count);
    }

    [Fact]
    public void ReplaceDay_RejectsAFileOfAnotherDay()
    {
        var week = NewWeeklyTemplate();
        CuratedDayImporter.Import(week, DayJson());
        var other = DayJson().Replace("\"dayNumber\": 3", "\"dayNumber\": 4");
        Assert.Throws<InvalidOperationException>(() => CuratedDayImporter.ReplaceDay(week, week.DailyTemplates.Single(), other));
    }

    [Theory]
    [InlineData(null, "h2", false, 0, false, ImportDecision.Create)]
    [InlineData("h1", "h1", true, 5, false, ImportDecision.Skip)]
    [InlineData("h1", "h2", true, 0, false, ImportDecision.Replace)]
    [InlineData(null, "h2", true, 0, false, ImportDecision.Replace)]
    [InlineData("h1", "h2", true, 3, false, ImportDecision.NeedsConfirmation)]
    [InlineData("h1", "h2", true, 3, true, ImportDecision.Replace)]
    [InlineData("h1", "h1", true, 3, true, ImportDecision.Skip)]
    public void ImportPlanner_Decide(string? stored, string fresh, bool exists, int responses, bool confirmed, ImportDecision expected) =>
        Assert.Equal(expected, ImportPlanner.Decide(stored, fresh, exists, responses, confirmed));

    [Fact]
    public void NodeDayLinter_Parse_ReadsThePassedAndFailedReports()
    {
        var ok = NodeDayLinter.Parse("""[{"nome":"x","modo":"completo","aprovado":true,"erros":[]}]""");
        Assert.True(ok.Available);
        Assert.True(ok.Passed);
        Assert.Equal("completo", ok.Mode);

        var bad = NodeDayLinter.Parse("""
        [{"modo":"completo","aprovado":false,"erros":[{"grupo":"Leitura","campo":"b1","regra":"frase muito longa","medido":"30 palavras","limite":"max 25"}]}]
        """);
        Assert.False(bad.Passed);
        Assert.Equal("Leitura | b1 | frase muito longa | 30 palavras | limite: max 25", Assert.Single(bad.Errors));

        Assert.False(NodeDayLinter.Parse("nao e json").Available);
    }
}
