using Focadu.Application.Ports;
using Focadu.Infrastructure.Services;
using Xunit;

namespace Focadu.Tests.Infrastructure;

/// <summary>Fase 86: os interesses do perfil (etiquetas e texto livre) sao a fonte preferida da analogia.</summary>
public class GroqAnalogyPromptTests
{
    [Fact]
    public void UserPrompt_TreatsTheFreeTextAsInterests()
    {
        // O perfil real do dono: nenhuma etiqueta, tudo no texto livre.
        var prompt = GroqAnalogyGenerationService.BuildUserPrompt(
            new AnalogyRequest(["seção"], [], "Academia, Motos, Carros, Rock"));

        Assert.Contains("Interesses e hobbies do aluno (o que ele escreveu no perfil): Academia, Motos, Carros, Rock", prompt);
        Assert.DoesNotContain("(nenhum informado)", prompt);
    }

    [Fact]
    public void UserPrompt_JoinsTagsAndFreeText()
    {
        var prompt = GroqAnalogyGenerationService.BuildUserPrompt(new AnalogyRequest(["seção"], ["Games", "Música"], "trilhas de moto"));

        Assert.Contains("Games; Música; trilhas de moto", prompt);
    }

    [Fact]
    public void UserPrompt_WithoutAnything_SaysNoneInformed()
    {
        var prompt = GroqAnalogyGenerationService.BuildUserPrompt(new AnalogyRequest(["seção"], [], null));

        Assert.Contains("(nenhum informado)", prompt);
    }

    [Fact]
    public void SystemPrompt_PrefersTheInterests_AndKeepsTheFidelityRule()
    {
        var prompt = GroqAnalogyGenerationService.BuildSystemPrompt("Linux");

        Assert.Contains("fonte PREFERIDA", prompt);
        Assert.Contains("nunca invente regras", prompt);
        Assert.DoesNotContain("normal e esperado", prompt);
    }
}
