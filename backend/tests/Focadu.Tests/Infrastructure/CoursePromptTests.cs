using Focadu.Infrastructure.Services;
using Xunit;

namespace Focadu.Tests.Infrastructure;

/// <summary>Fase 85: os prompts de IA citam o curso certo - antes todos diziam "plataforma de estudo de seguranca web".</summary>
public class CoursePromptTests
{
    public static TheoryData<string, Func<string?, string>> Prompts => new()
    {
        { "analogia", GroqAnalogyGenerationService.BuildSystemPrompt },
        { "correcao da transcricao", GroqContentEvaluationService.CorrectionSystemPrompt },
        { "nota do resumo falado", GroqContentEvaluationService.GradingSystemPrompt },
        { "chat rapido", GroqStudyAssistantService.BuildSystemPrompt },
        { "passo de codigo", GroqCodeStepEvaluationService.BuildSystemPrompt },
        { "revisao do caderninho", GroqNotesReviewService.BuildSystemPrompt },
    };

    [Theory]
    [MemberData(nameof(Prompts))]
    public void WithTheCourse_NamesItAndDropsWebSecurity(string _, Func<string?, string> build)
    {
        var prompt = build("Linux");

        Assert.Contains("da Focadu (curso Linux)", prompt);
        Assert.DoesNotContain("segurança web", prompt);
        Assert.DoesNotContain("Web Security", prompt);
        Assert.DoesNotContain("{plataforma}", prompt);
    }

    [Theory]
    [MemberData(nameof(Prompts))]
    public void WithoutTheCourse_OnlyNamesFocadu(string _, Func<string?, string> build)
    {
        var prompt = build(null);

        Assert.Contains("da Focadu", prompt);
        Assert.DoesNotContain("(curso", prompt);
        Assert.DoesNotContain("{plataforma}", prompt);
    }

    [Fact]
    public void CodeStep_NoLongerAssumesANetworkCapture()
    {
        Assert.DoesNotContain("captura de rede", GroqCodeStepEvaluationService.BuildSystemPrompt("Linux"));
    }
}
