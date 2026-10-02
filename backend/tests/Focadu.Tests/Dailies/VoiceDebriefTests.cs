using Focadu.Application.Dailies;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Infrastructure.Services;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Dailies;

/// <summary>Plano de curadoria (02/10/2026): devolutiva da conversa por voz = resposta correta (da curadoria) + pontos a melhorar (da IA).</summary>
public class VoiceDebriefTests
{
    [Fact]
    public void Response_KeepsTheCorrectAnswerAndTheImprovementPoints()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var content = weekly.Template.AddCuratedContent(CuratedContentType.Reading, "Bloco", bodyText: "texto");
        var voice = template.AddActivity(ActivityType.VoiceSummary, 0, AnswerMode.FreeText, "Pergunta?", content.Id);
        voice.ConfigureVoiceQuestion("A resposta correta.", "Pense no cookie.", isFinal: false, topics: null);
        var daily = weekly.AddDaily(template, DailyFixtures.Today);
        daily.Start();

        var response = daily.SubmitActivityResponse(
            voice.Id, 90, "transcricao", null, null, "faltou o servidor",
            correctAnswer: "A resposta correta.", improvementPoints: "faltou o servidor");

        Assert.Equal("A resposta correta.", response.CorrectAnswer);
        Assert.Equal("faltou o servidor", response.ImprovementPoints);
        var dto = Assert.Single(DailyStateMapper.ToDto(daily, DailyAccessMode.Start).Activities).Responses.Single();
        Assert.Equal("A resposta correta.", dto.CorrectAnswer);
        Assert.Equal("faltou o servidor", dto.ImprovementPoints);
    }

    [Fact]
    public void ActivityDto_ShowsTheHintAndTopicsButNeverTheReferenceAnswer()
    {
        var weekly = DailyFixtures.NewWeekly();
        var template = weekly.Template.AddDailyTemplate(1);
        var content = weekly.Template.AddCuratedContent(CuratedContentType.Reading, "Bloco", bodyText: "texto");
        var voice = template.AddActivity(ActivityType.VoiceSummary, 0, AnswerMode.FreeText, "Explique o dia.", content.Id);
        voice.ConfigureVoiceQuestion("Resumo secreto do dia.", "Pense nos tres topicos.", isFinal: true, topics: ["a", "b", "c"]);
        voice.SetTarget("t2");
        var daily = weekly.AddDaily(template, DailyFixtures.Today);

        var dto = Assert.Single(DailyStateMapper.ToDto(daily, DailyAccessMode.Start).Activities);

        Assert.Equal("Pense nos tres topicos.", dto.Hint);
        Assert.True(dto.IsFinalQuestion);
        Assert.Equal(["a", "b", "c"], dto.Topics);
        Assert.Equal("t2", dto.Target);
        Assert.DoesNotContain("Resumo secreto", System.Text.Json.JsonSerializer.Serialize(dto));
    }

    [Fact]
    public void ParseDebrief_ReadsScoreAndPoints_AndNeverInventsOne()
    {
        var (score, points) = GroqContentEvaluationService.ParseDebrief("""{"score": 80, "improvementPoints": "Faltou citar o servidor."}""");
        Assert.Equal(80, score);
        Assert.Equal("Faltou citar o servidor.", points);

        Assert.Throws<ExternalServiceException>(() => GroqContentEvaluationService.ParseDebrief("""{"score": 80}"""));
        Assert.Throws<ExternalServiceException>(() => GroqContentEvaluationService.ParseDebrief("""{"score": 180, "improvementPoints": "x"}"""));
        Assert.Throws<ExternalServiceException>(() => GroqContentEvaluationService.ParseDebrief("nao e json"));
        Assert.Throws<ExternalServiceException>(() => GroqContentEvaluationService.ParseDebrief(null));
    }

    [Fact]
    public void DebriefPrompts_AskOnlyForContent_InPortuguese_AndNameTheCourse()
    {
        var system = GroqContentEvaluationService.DebriefSystemPrompt("Linux");
        Assert.Contains("da Focadu (curso Linux)", system);
        Assert.Contains("em português", system);
        Assert.Contains("vícios de linguagem", system);
        Assert.DoesNotContain("{plataforma}", system);

        var user = GroqContentEvaluationService.BuildDebriefUserPrompt(
            new ContentEvaluationRequest("RESPOSTA-CERTA", "x", "PERGUNTA-FEITA", Debrief: true), "RESPOSTA-DO-ALUNO");
        Assert.Contains("PERGUNTA-FEITA", user);
        Assert.Contains("RESPOSTA-CERTA", user);
        Assert.Contains("RESPOSTA-DO-ALUNO", user);
    }
}
