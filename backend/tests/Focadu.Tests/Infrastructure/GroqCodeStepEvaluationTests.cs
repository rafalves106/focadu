using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Infrastructure.Services;
using Xunit;

namespace Focadu.Tests.Infrastructure;

/// <summary>Fase 79: o veredito do passo de codigo so vale no formato combinado - nunca inventado.</summary>
public class GroqCodeStepEvaluationTests
{
    [Fact]
    public void ParseResult_ReadsTheVerdictAndTheFeedback()
    {
        var result = GroqCodeStepEvaluationService.ParseResult("{\"passou\": false, \"feedback\": \" O que qname devolve? \"}");

        Assert.False(result.Passed);
        Assert.Equal("O que qname devolve?", result.Feedback);
    }

    [Theory]
    [InlineData("")]
    [InlineData("nao e json")]
    [InlineData("{\"feedback\": \"sem veredito\"}")]
    [InlineData("{\"passou\": true, \"feedback\": \"\"}")]
    public void ParseResult_RejectsAnythingOutsideTheFormat(string raw)
    {
        Assert.Throws<ExternalServiceException>(() => GroqCodeStepEvaluationService.ParseResult(raw));
    }

    [Fact]
    public void UserPrompt_MarksTheFirstStep_AndTheLastAttempt()
    {
        var prompt = GroqCodeStepEvaluationService.BuildUserPrompt(new CodeStepEvaluationRequest(
            "Python", "Abra o arquivo", "rdpcap", "pacotes: 54", "pacotes = rdpcap(x)", "", "print(54)", "pacotes: 54", 3, 3));

        Assert.Contains("este é o primeiro passo", prompt);
        Assert.Contains("última tentativa", prompt);
        Assert.Contains("print(54)", prompt);
    }
}
