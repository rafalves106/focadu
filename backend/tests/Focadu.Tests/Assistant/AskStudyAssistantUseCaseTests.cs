using Focadu.Application.Assistant;
using Focadu.Application.Ports;
using Xunit;

namespace Focadu.Tests.Assistant;

/// <summary>So a parte pura de AskStudyAssistantUseCase (Truncate/ClampHistory, internal static) - o resto do caso de uso depende de repositorio/servico externo, e este projeto nao tem fakes (ver docs/ARQUITETURA.md, "Focadu.Tests so testa dominio puro").</summary>
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

    [Fact]
    public void ClampHistory_Null_ReturnsEmpty()
    {
        Assert.Empty(AskStudyAssistantUseCase.ClampHistory(null));
    }

    [Fact]
    public void ClampHistory_FewerThanMax_ReturnsAllInOrder()
    {
        var history = new[] { new StudyAssistantChatTurn(true, "pergunta 1"), new StudyAssistantChatTurn(false, "resposta 1") };

        var clamped = AskStudyAssistantUseCase.ClampHistory(history);

        Assert.Equal(2, clamped.Count);
        Assert.Equal("pergunta 1", clamped[0].Content);
        Assert.Equal("resposta 1", clamped[1].Content);
    }

    [Fact]
    public void ClampHistory_MoreThanMax_KeepsOnlyMostRecentInChronologicalOrder()
    {
        var history = Enumerable.Range(1, AskStudyAssistantUseCase.MaxHistoryMessages + 4)
            .Select(i => new StudyAssistantChatTurn(i % 2 == 1, $"turno {i}"))
            .ToList();

        var clamped = AskStudyAssistantUseCase.ClampHistory(history);

        Assert.Equal(AskStudyAssistantUseCase.MaxHistoryMessages, clamped.Count);
        Assert.Equal("turno 5", clamped[0].Content); // descarta os 4 mais antigos (1-4), mantem a ordem cronologica dos que sobram
        Assert.Equal($"turno {AskStudyAssistantUseCase.MaxHistoryMessages + 4}", clamped[^1].Content);
    }

    [Fact]
    public void ClampHistory_BlankContent_IsDropped()
    {
        var history = new[] { new StudyAssistantChatTurn(true, "pergunta valida"), new StudyAssistantChatTurn(false, "   ") };

        var clamped = AskStudyAssistantUseCase.ClampHistory(history);

        Assert.Single(clamped);
        Assert.Equal("pergunta valida", clamped[0].Content);
    }

    [Fact]
    public void ClampHistory_ContentLongerThanMax_IsTruncated()
    {
        var history = new[] { new StudyAssistantChatTurn(false, new string('b', AskStudyAssistantUseCase.MaxHistoryMessageLength + 50)) };

        var clamped = AskStudyAssistantUseCase.ClampHistory(history);

        Assert.Equal(AskStudyAssistantUseCase.MaxHistoryMessageLength, clamped[0].Content.Length);
    }
}
