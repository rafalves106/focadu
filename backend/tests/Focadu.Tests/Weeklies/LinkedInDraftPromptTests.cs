using Focadu.Application.Weeklies;
using Xunit;

namespace Focadu.Tests.Weeklies;

public class LinkedInDraftPromptTests
{
    [Fact]
    public void ExtractTakeaways_ReadsNumberedListUnderHeading()
    {
        var body = "Texto do dia.\n\n### O que levar daqui\n\n1. Primeiro ponto.\n2. Segundo ponto.\n3. Terceiro ponto.\n4. Quarto ponto.\n\n### Outra seção\n\n1. Fora.";

        var takeaways = GenerateLinkedInDraftUseCase.ExtractTakeaways(body);

        Assert.Equal(["Primeiro ponto.", "Segundo ponto.", "Terceiro ponto."], takeaways);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Texto sem a seção.\n\n1. Solto.")]
    public void ExtractTakeaways_WithoutHeading_ReturnsEmpty(string? body)
    {
        Assert.Empty(GenerateLinkedInDraftUseCase.ExtractTakeaways(body));
    }

    [Fact]
    public void ExtractObjective_ReturnsFirstParagraphOfObjectiveSection()
    {
        var spec = "### Objetivo\n\nVocê completa o Inspetor de site.\n\n### Entregável\n\nUm repositório.";

        Assert.Equal("Você completa o Inspetor de site.", GenerateLinkedInDraftUseCase.ExtractObjective(spec));
    }

    [Fact]
    public void ExtractObjective_WithoutSpec_ReturnsNull()
    {
        Assert.Null(GenerateLinkedInDraftUseCase.ExtractObjective(null));
    }

    [Fact]
    public void BuildPrompt_CitesCourseDaysProjectAndHidesScore()
    {
        var days = new List<GenerateLinkedInDraftUseCase.WeekDay>
        {
            new("Códigos de status", ["O primeiro dígito dá a família."]),
            new("Cabeçalhos", []),
        };

        var prompt = GenerateLinkedInDraftUseCase.BuildPrompt(
            "Web Security", "HTTP por dentro", days, "Você completa o Inspetor de site.", "Leu bem os códigos de status.", null);

        Assert.Contains("\"Web Security\"", prompt);
        Assert.Contains("HTTP por dentro", prompt);
        Assert.Contains("- Códigos de status: O primeiro dígito dá a família.", prompt);
        Assert.Contains("- Cabeçalhos", prompt);
        Assert.Contains("Objetivo do projeto: Você completa o Inspetor de site.", prompt);
        Assert.Contains("nunca cite erro, ponto fraco ou nota", prompt);
        Assert.Contains("português", prompt);
        Assert.DoesNotContain("segurança web", prompt);
    }

    [Fact]
    public void BuildPrompt_WithoutCourseOrProject_StaysGeneric()
    {
        var prompt = GenerateLinkedInDraftUseCase.BuildPrompt(null, "Tema", [], null, null, null);

        Assert.Contains("um curso da Focadu", prompt);
        Assert.DoesNotContain("Objetivo do projeto", prompt);
        Assert.DoesNotContain("Comentário da avaliação", prompt);
    }
}
