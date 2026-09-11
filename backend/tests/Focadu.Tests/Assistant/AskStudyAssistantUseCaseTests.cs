using Focadu.Application.Assistant;
using Xunit;

namespace Focadu.Tests.Assistant;

/// <summary>So a parte pura de AskStudyAssistantUseCase (Truncate, internal static) - o resto do caso de uso depende de repositorio/servico externo, e este projeto nao tem fakes (ver docs/ARQUITETURA.md, "Focadu.Tests so testa dominio puro").</summary>
public class AskStudyAssistantUseCaseTests
{
    [Fact]
    public void Truncate_Null_ReturnsNull()
    {
        Assert.Null(AskStudyAssistantUseCase.Truncate(null, 10));
    }

    [Fact]
    public void Truncate_WhitespaceOnly_ReturnsNull()
    {
        Assert.Null(AskStudyAssistantUseCase.Truncate("   ", 10));
    }

    [Fact]
    public void Truncate_ShorterThanMax_ReturnsTrimmedTextUnchanged()
    {
        Assert.Equal("texto curto", AskStudyAssistantUseCase.Truncate("  texto curto  ", 100));
    }

    [Fact]
    public void Truncate_LongerThanMax_CutsAtMaxLength()
    {
        var text = new string('a', 50);

        var truncated = AskStudyAssistantUseCase.Truncate(text, 10);

        Assert.Equal(10, truncated!.Length);
        Assert.Equal(new string('a', 10), truncated);
    }
}
