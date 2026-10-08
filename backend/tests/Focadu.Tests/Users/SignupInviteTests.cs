using Focadu.Domain.Exceptions;
using Focadu.Domain.Users;
using Xunit;

namespace Focadu.Tests.Users;

public class SignupInviteTests
{
    [Fact]
    public void Create_NormalizesCode_AndStartsUnused()
    {
        var invite = SignupInvite.Create(" abcd2345 ", " Fulano ", 1, null);

        Assert.Equal("ABCD2345", invite.Code);
        Assert.Equal("Fulano", invite.Note);
        Assert.Equal(0, invite.UsedCount);
    }

    [Theory]
    [InlineData("", "Fulano", 1)]
    [InlineData("ABCD2345", " ", 1)]
    [InlineData("ABCD2345", "Fulano", 0)]
    public void Create_InvalidInput_Throws(string code, string note, int maxUses)
    {
        Assert.Throws<DomainException>(() => SignupInvite.Create(code, note, maxUses, null));
    }

    [Fact]
    public void Consume_SingleUse_SecondTimeIsEsgotado()
    {
        var invite = SignupInvite.Create("ABCD2345", "Fulano", 1, DateTime.UtcNow.AddDays(7));

        invite.Consume(DateTime.UtcNow);
        var ex = Assert.Throws<DomainException>(() => invite.Consume(DateTime.UtcNow));

        Assert.Equal(1, invite.UsedCount);
        Assert.Equal("convite_esgotado", ex.Code);
    }

    [Fact]
    public void Consume_Expired_IsExpirado()
    {
        var invite = SignupInvite.Create("ABCD2345", "Fulano", 1, DateTime.UtcNow.AddMinutes(-1));

        var ex = Assert.Throws<DomainException>(() => invite.Consume(DateTime.UtcNow));

        Assert.Equal("convite_expirado", ex.Code);
        Assert.Equal(0, invite.UsedCount);
    }

    [Fact]
    public void Consume_WithoutExpiration_NeverExpires()
    {
        var invite = SignupInvite.Create("ABCD2345", "Leva", 2, null);

        invite.Consume(DateTime.UtcNow.AddYears(5));

        Assert.Equal(1, invite.UsedCount);
    }

    [Fact]
    public void Consume_Revoked_IsInvalido_AndRevokeKeepsFirstDate()
    {
        var invite = SignupInvite.Create("ABCD2345", "Fulano", 1, null);
        var first = DateTime.UtcNow;
        invite.Revoke(first);
        invite.Revoke(first.AddHours(1));

        var ex = Assert.Throws<DomainException>(() => invite.Consume(DateTime.UtcNow));

        Assert.Equal("convite_invalido", ex.Code);
        Assert.Equal(first, invite.RevokedAt);
    }

    [Fact]
    public void Consume_AllErrors_ShareTheSameMessage()
    {
        var revoked = SignupInvite.Create("AAAA2222", "a", 1, null);
        revoked.Revoke(DateTime.UtcNow);
        var expired = SignupInvite.Create("BBBB2222", "b", 1, DateTime.UtcNow.AddMinutes(-1));
        var used = SignupInvite.Create("CCCC2222", "c", 1, null);
        used.Consume(DateTime.UtcNow);

        var messages = new[] { revoked, expired, used }
            .Select(i => Assert.Throws<DomainException>(() => i.Consume(DateTime.UtcNow)).Message)
            .Distinct();

        Assert.Single(messages);
    }
}
