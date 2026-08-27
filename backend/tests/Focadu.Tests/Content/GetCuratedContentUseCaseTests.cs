using Focadu.Application.Content;
using Xunit;

namespace Focadu.Tests.Content;

/// <summary>So a parte pura de GetCuratedContentUseCase (SplitIntoSections, internal static) - o resto do caso de uso depende de repositorios/servicos externos, e este projeto nao tem fakes (ver docs/ARQUITETURA.md, "Focadu.Tests so testa dominio puro").</summary>
public class GetCuratedContentUseCaseTests
{
    [Fact]
    public void SplitIntoSections_SplitsOnHeadingsAndDropsPreamble()
    {
        const string text = "### Titulo geral\n\nParagrafo de abertura.\n\n#### Secao 1\nTexto 1.\n\n#### Secao 2\nTexto 2.";

        var sections = GetCuratedContentUseCase.SplitIntoSections(text);

        Assert.Equal(2, sections.Count);
        Assert.StartsWith("#### Secao 1", sections[0]);
        Assert.Contains("Texto 1.", sections[0]);
        Assert.StartsWith("#### Secao 2", sections[1]);
        Assert.Contains("Texto 2.", sections[1]);
    }

    [Fact]
    public void SplitIntoSections_WithoutAnyHeading_ReturnsWholeTextAsOneSection()
    {
        const string text = "Texto sem nenhuma secao marcada.";

        var sections = GetCuratedContentUseCase.SplitIntoSections(text);

        Assert.Equal([text], sections);
    }
}
