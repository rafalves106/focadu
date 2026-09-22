using Focadu.Domain.Exceptions;
using Focadu.Domain.GitHosting;
using Xunit;

namespace Focadu.Tests.Weeklies;

/// <summary>Fase 60: a Focadu nao guarda o token do Forgejo - so o final dele.</summary>
public class UserForgejoAccountTests
{
    [Fact]
    public void NewAccount_HasNoToken()
    {
        var account = new UserForgejoAccount(Guid.NewGuid(), "aluno-x");

        Assert.Null(account.TokenLastEight);
        Assert.Null(account.TokenGeneratedAt);
    }

    [Fact]
    public void RegisterGeneratedToken_KeepsOnlyLastEightChars()
    {
        var account = new UserForgejoAccount(Guid.NewGuid(), "aluno-x");

        account.RegisterGeneratedToken("7ed47c4cc7b5d94777d0764167a25124dbfbd1a0");

        Assert.Equal("dbfbd1a0", account.TokenLastEight);
        Assert.NotNull(account.TokenGeneratedAt);
    }

    [Fact]
    public void RegisterGeneratedToken_ReplacesPrevious()
    {
        var account = new UserForgejoAccount(Guid.NewGuid(), "aluno-x");
        account.RegisterGeneratedToken("aaaaaaaaaaaaaaaa11111111");

        account.RegisterGeneratedToken("bbbbbbbbbbbbbbbb22222222");

        Assert.Equal("22222222", account.TokenLastEight);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("curto")]
    public void RegisterGeneratedToken_RejectsInvalidToken(string token)
    {
        var account = new UserForgejoAccount(Guid.NewGuid(), "aluno-x");

        Assert.Throws<DomainException>(() => account.RegisterGeneratedToken(token));
    }
}
