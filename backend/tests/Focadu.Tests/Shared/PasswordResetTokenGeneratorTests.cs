using Focadu.Application.Shared;
using Xunit;

namespace Focadu.Tests.Shared;

/// <summary>PasswordResetTokenGenerator e internal, testado direto (mesmo padrao de UniqueCodeGeneratorTests) - sem repositorio nenhum.</summary>
public class PasswordResetTokenGeneratorTests
{
    [Fact]
    public void Generate_ReturnsUrlSafeToken_WithHighEntropy()
    {
        var token = PasswordResetTokenGenerator.Generate();

        Assert.True(token.Length >= 32);
        Assert.DoesNotContain('+', token);
        Assert.DoesNotContain('/', token);
        Assert.DoesNotContain('=', token);
    }

    [Fact]
    public void Generate_CalledTwice_ReturnsDifferentTokens()
    {
        var first = PasswordResetTokenGenerator.Generate();
        var second = PasswordResetTokenGenerator.Generate();

        Assert.NotEqual(first, second);
    }

    [Fact]
    public void Hash_IsDeterministic_ForSameInput()
    {
        var token = PasswordResetTokenGenerator.Generate();

        Assert.Equal(PasswordResetTokenGenerator.Hash(token), PasswordResetTokenGenerator.Hash(token));
    }

    [Fact]
    public void Hash_DiffersForDifferentTokens()
    {
        var first = PasswordResetTokenGenerator.Hash("token-a");
        var second = PasswordResetTokenGenerator.Hash("token-b");

        Assert.NotEqual(first, second);
    }
}
