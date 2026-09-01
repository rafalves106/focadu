using Focadu.Application.Shared;
using Xunit;

namespace Focadu.Tests.Shared;

/// <summary>UniqueCodeGenerator e internal, testado direto (mesmo padrao de GetCourseRankingUseCase.ComputeScore) - so precisa do delegate `isTaken`, sem repositorio nenhum.</summary>
public class UniqueCodeGeneratorTests
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    [Fact]
    public async Task GenerateAsync_ReturnsCodeFromAlphabet_WithCorrectLength()
    {
        var code = await UniqueCodeGenerator.GenerateAsync(_ => Task.FromResult(false));

        Assert.Equal(8, code.Length);
        Assert.All(code, c => Assert.Contains(c, Alphabet));
    }

    [Fact]
    public async Task GenerateAsync_RetriesUntilAnUntakenCandidateAppears()
    {
        var attempts = 0;

        var code = await UniqueCodeGenerator.GenerateAsync(_ =>
        {
            attempts++;
            return Task.FromResult(attempts < 3); // taken nas 2 primeiras tentativas, livre na 3a
        });

        Assert.Equal(3, attempts);
        Assert.Equal(8, code.Length);
    }

    [Fact]
    public async Task GenerateAsync_AlwaysTaken_ThrowsAfterMaxAttempts()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => UniqueCodeGenerator.GenerateAsync(_ => Task.FromResult(true)));
    }
}
