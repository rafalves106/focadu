using System.Linq;
using Focadu.Application.Dailies;
using Focadu.Application.Exceptions;
using Focadu.Application.Seed;
using Focadu.Domain.Activities;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Dailies;

/// <summary>
/// Fase 113: ponte intercalada com editor fixo (secret/processo/molde/ponte.md, "Ponte intercalada"). Prever nao conta
/// erro do dia; ordenar linhas (Parsons) com nota no servidor e ordem certa so no fim; CodeStep com lacuna/erro marcados,
/// conferencia e "refaz" (o Corrigir e o Fazer do bloco 3 trocam o trecho anterior em vez de acrescentar).
/// </summary>
public class PonteIntercaladaTests
{
    private const string DayJson = """
    {
      "dayNumber": 6, "moldeVersion": "v1", "moldeTipo": "A", "ponte": true, "formatoPonte": "intercalada",
      "curatedContents": [
        { "ref": "abertura", "type": "Reading", "title": "Abertura", "bodyText": "o script" },
        { "ref": "b1", "type": "Reading", "title": "Bloco 1", "bodyText": "print" }
      ],
      "activities": [
        { "type": "Reading", "answerMode": "FreeText", "contentRef": "abertura" },
        { "type": "Reading", "answerMode": "FreeText", "contentRef": "b1" },
        { "type": "Quiz", "answerMode": "MultipleChoice", "prompt": "O que aparece?",
          "quizOptions": [ { "text": "status: 200", "isCorrect": true }, { "text": "status: resposta.status", "isCorrect": false } ] },
        { "type": "CodeStep", "answerMode": "FreeText", "prompt": "Complete a linha 2",
          "codeStarter": "print(\"Inspetor\")\nprint(\"endereço:\", ______)\n",
          "codeMarks": [ { "linha": 2, "tipo": "lacuna" } ],
          "codeSolution": "print(\"Inspetor\")\nprint(\"endereço:\", endereco)\n", "codeExpectedOutput": "Inspetor", "codeRubric": "usa a variavel" },
        { "type": "CodeStep", "answerMode": "FreeText", "prompt": "Corrija", "refaz": true,
          "codeStarter": "print(\"Inspetor\")\nprint(\"status:\", 200)\n",
          "codeMarks": [ { "linha": 2, "tipo": "erro" } ],
          "codeCheck": { "troca": ["https://lab:8443/", "http://lab:8080/vazia"], "saidaEsperada": "status: 204" },
          "codeSolution": "print(\"Inspetor\")\nprint(\"status:\", resposta.status)\n", "codeExpectedOutput": "status: 200", "codeRubric": "le o status" },
        { "type": "Parsons", "answerMode": "FreeText", "prompt": "Ordene",
          "parsonsFixed": [ "enderecos = [\"a\", \"b\"]" ],
          "parsonsLines": [ "for endereco in enderecos:", "    print(\"---\", endereco)", "    print(endereco.upper())" ] },
        { "type": "CodeStep", "answerMode": "FreeText", "prompt": "Faca sozinho", "refaz": true,
          "codeSolution": "for e in x:\n    try:\n        pass\n    except OSError:\n        pass\n", "codeExpectedOutput": "ok", "codeRubric": "try" }
      ]
    }
    """;

    private static (Daily Daily, DailyActivity[] Acts) NewDay()
    {
        var weekly = DailyFixtures.NewWeekly();
        CuratedDayImporter.Import(weekly.Template, DayJson);
        var template = weekly.Template.DailyTemplates.Single(d => d.DayNumber == 6);
        var daily = weekly.AddDaily(template, DailyFixtures.Today);
        daily.Start();
        return (daily, template.Activities.OrderBy(a => a.OrderIndex).ToArray());
    }

    [Fact]
    public void Import_ReadsFormatMarksCheckRefazAndParsons()
    {
        var (daily, acts) = NewDay();

        Assert.True(daily.Template.InterleavedBridge);
        Assert.True(daily.Template.IsBridge);
        Assert.Equal([new CodeMark(2, CodeMarkKind.Lacuna)], acts[3].CodeMarks);
        Assert.False(acts[3].ReplacesPreviousCode);
        Assert.Equal(new CodeCheck("https://lab:8443/", "http://lab:8080/vazia", "status: 204"), acts[4].CodeCheck);
        Assert.True(acts[4].ReplacesPreviousCode);
        Assert.Equal(["enderecos = [\"a\", \"b\"]"], acts[5].Parsons!.FixedLines);
        Assert.Equal(3, acts[5].Parsons!.Lines.Count);
    }

    [Fact]
    public void Import_UnknownBridgeFormat_IsRejected()
    {
        var weekly = DailyFixtures.NewWeekly();
        var json = DayJson.Replace("\"formatoPonte\": \"intercalada\"", "\"formatoPonte\": \"outra\"");

        var ex = Assert.Throws<DomainException>(() => CuratedDayImporter.Import(weekly.Template, json));
        Assert.Equal("formato_ponte_invalido", ex.Code);
    }

    [Fact]
    public void Import_RefazOnTheFirstCodeStep_IsRejected()
    {
        var weekly = DailyFixtures.NewWeekly();
        var json = DayJson.Replace("\"prompt\": \"Complete a linha 2\",", "\"prompt\": \"Complete a linha 2\", \"refaz\": true,");

        var ex = Assert.Throws<DomainException>(() => CuratedDayImporter.Import(weekly.Template, json));
        Assert.Equal("refaz_invalido", ex.Code);
    }

    [Fact]
    public void Import_MarkOutsideTheStarter_IsRejected()
    {
        var weekly = DailyFixtures.NewWeekly();
        var json = DayJson.Replace("{ \"linha\": 2, \"tipo\": \"lacuna\" }", "{ \"linha\": 9, \"tipo\": \"lacuna\" }");

        var ex = Assert.Throws<DomainException>(() => CuratedDayImporter.Import(weekly.Template, json));
        Assert.Equal("marca_invalida", ex.Code);
    }

    [Fact]
    public void WrongPrediction_DoesNotCountAsAMistake_NorGoToReinforcement_NorScore()
    {
        var (daily, acts) = NewDay();

        Assert.True(daily.Template.IsPrediction(acts[2]));
        daily.SubmitActivityResponse(acts[2].Id, 0);
        daily.SubmitActivityResponse(acts[5].Id, 0, transcript: "x");

        Assert.Equal(0, daily.PenaltyPoints);
        Assert.Empty(daily.GetFailedActivities());
        Assert.Null(daily.CalculateScore());
    }

    [Fact]
    public void QuizOutsideTheInterleavedBridge_StillCounts()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(2);
        var quiz = template.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice, "?");
        var daily = weekly.AddDaily(template, DailyFixtures.Today);
        daily.Start();

        Assert.False(template.IsPrediction(quiz));
        daily.SubmitActivityResponse(quiz.Id, 0);
        Assert.Equal(1, daily.PenaltyPoints);
    }

    [Fact]
    public void Refaz_ReplacesThePreviousPart_AndStartsFromItWithoutAStarter()
    {
        var (daily, acts) = NewDay();
        var (fazer, corrigir, ordenar, fazer3) = (acts[3], acts[4], acts[5], acts[6]);

        daily.SubmitActivityResponse(fazer.Id, 100, transcript: "print(\"Inspetor\")\nprint(\"endereço:\", endereco)\n");
        // O Corrigir troca o bloco: o script anterior a ele nao tem o trecho do Fazer.
        Assert.Equal("", daily.PriorCode(corrigir.Id));
        Assert.Equal("print(\"Inspetor\")\nprint(\"endereço:\", endereco)", daily.ReplacedCode(corrigir.Id));

        daily.SubmitActivityResponse(corrigir.Id, 100, transcript: "print(\"status:\", resposta.status)\n");
        Assert.Equal("print(\"status:\", resposta.status)", daily.PriorCode(ordenar.Id));
        Assert.Null(daily.PriorCode(fazer3.Id));

        // Ordenar acabou (3 conferencias erradas): entrega a ordem certa, e o Fazer do bloco 3 parte dela.
        for (var i = 0; i < CodeStepProgress.MaxAttempts; i++)
            daily.SubmitActivityResponse(ordenar.Id, 0, transcript: "x");
        Assert.Equal("print(\"status:\", resposta.status)", daily.PriorCode(fazer3.Id));
        Assert.Equal(ordenar.Parsons!.Code, daily.ReplacedCode(fazer3.Id));
        Assert.StartsWith("enderecos = [", daily.ReplacedCode(fazer3.Id));
    }

    [Fact]
    public void Parsons_ScoredOnTheServer_OnlyTheWholeOrderPasses()
    {
        var (_, acts) = NewDay();
        var parsons = acts[5];
        var right = string.Join("\n", parsons.Parsons!.Lines);
        var swapped = string.Join("\n", new[] { parsons.Parsons.Lines[0], parsons.Parsons.Lines[2], parsons.Parsons.Lines[1] });

        Assert.Equal(100, SubmitActivityResponseUseCase.ResolveScore(parsons, null, null, right));
        Assert.Equal(0, SubmitActivityResponseUseCase.ResolveScore(parsons, null, null, swapped));
        var ex = Assert.Throws<ValidationException>(() =>
            SubmitActivityResponseUseCase.ResolveScore(parsons, null, null, "for endereco in enderecos:"));
        Assert.Equal("ordem_invalida", ex.Code);
    }

    [Fact]
    public void Parsons_Shuffle_IsStablePerActivity_AndNeverTheRightOrder()
    {
        var puzzle = ParsonsPuzzle.Create([], ["a", "b", "c"]);
        for (var i = 0; i < 50; i++)
        {
            var seed = Guid.NewGuid();
            Assert.Equal(puzzle.Shuffled(seed), puzzle.Shuffled(seed));
            Assert.NotEqual(puzzle.Lines, puzzle.Shuffled(seed));
            Assert.True(puzzle.IsPermutation(puzzle.Shuffled(seed)));
        }
    }

    [Fact]
    public void Parsons_NeedsAtLeastThreeDifferentLines()
    {
        Assert.Throws<DomainException>(() => ParsonsPuzzle.Create([], ["a", "b"]));
        Assert.Throws<DomainException>(() => ParsonsPuzzle.Create([], ["a", "a", "a"]));
        Assert.Throws<DomainException>(() => ParsonsPuzzle.Create([], ["a", "", "c"]));
    }

    [Fact]
    public void ParsonsDto_HidesTheOrderUntilDone_AndReportsTheLastCheckByPosition()
    {
        var puzzle = ParsonsPuzzle.Create(["fixa"], ["a", "b", "c"]);
        var id = Guid.NewGuid();

        var open = DailyStateMapper.ToParsonsDto(puzzle, id, done: false, lastAnswer: "a\nc\nb", priorCode: "");
        Assert.Null(open.Solution);
        Assert.Equal([true, false, false], open.LastCheck);
        Assert.Equal(puzzle.Shuffled(id), open.Lines);

        var done = DailyStateMapper.ToParsonsDto(puzzle, id, done: true, lastAnswer: "a\nb\nc", priorCode: "");
        Assert.Equal(["a", "b", "c"], done.Solution);
    }

    [Fact]
    public void MapperExposesFormatPredictionAndStepOptions()
    {
        var (daily, acts) = NewDay();
        daily.SubmitActivityResponse(acts[3].Id, 100, transcript: "ok\n");

        var dto = DailyStateMapper.ToDto(daily, DailyAccessMode.Resume);
        Assert.Equal("intercalada", dto.BridgeFormat);
        Assert.Equal("ok", dto.BridgePreview);
        var list = dto.Activities.OrderBy(a => a.OrderIndex).ToList();
        Assert.True(list[2].IsPrediction);
        Assert.False(list[0].IsPrediction);
        Assert.NotNull(list[5].Parsons);
        Assert.Equal(ActivityStatus.Pending, list[5].Status);
    }

    [Fact]
    public void Check_GoesToTheEvaluationWithTheSwapAndTheExpectedOutput()
    {
        var check = new CodeCheck("https://lab:8443/", "http://lab:8080/vazia", "status: 204");

        var text = SubmitCodeStepResponseUseCase.WithCheck("status: 200", check, "status: 200\n");
        Assert.Contains("trocando https://lab:8443/ por http://lab:8080/vazia", text);
        Assert.EndsWith("status: 204", text);
        Assert.Equal("status: 200", SubmitCodeStepResponseUseCase.WithCheck("status: 200", null, "x"));
        Assert.Equal("status: 200", SubmitCodeStepResponseUseCase.WithCheck("status: 200", check, null));
    }
}
