using Focadu.Domain.Exceptions;
using Focadu.Domain.Users;
using Xunit;

namespace Focadu.Tests.Users;

public class PasswordResetTokenTests
{
    [Fact]
    public void Create_SetsFields()
    {
        var userId = Guid.NewGuid();
        var expiresAt = DateTime.UtcNow.AddHours(1);
        var before = DateTime.UtcNow;

        var token = PasswordResetToken.Create(userId, "hash-abc", expiresAt);

        Assert.Equal(userId, token.UserId);
        Assert.Equal("hash-abc", token.TokenHash);
        Assert.Equal(expiresAt, token.ExpiresAt);
        Assert.InRange(token.CreatedAt, before, DateTime.UtcNow);
        Assert.Null(token.UsedAt);
    }

    [Fact]
    public void Create_EmptyTokenHash_Throws()
    {
        Assert.Throws<DomainException>(() => PasswordResetToken.Create(Guid.NewGuid(), "   ", DateTime.UtcNow.AddHours(1)));
    }

    [Fact]
    public void Consume_ValidToken_MarksUsedAt()
    {
        var token = PasswordResetToken.Create(Guid.NewGuid(), "hash-abc", DateTime.UtcNow.AddHours(1));
        var now = DateTime.UtcNow;

        token.Consume(now);

        Assert.Equal(now, token.UsedAt);
    }

    [Fact]
    public void Consume_AlreadyUsed_Throws_WithTokenInvalidoCode()
    {
        var token = PasswordResetToken.Create(Guid.NewGuid(), "hash-abc", DateTime.UtcNow.AddHours(1));
        token.Consume(DateTime.UtcNow);

        var ex = Assert.Throws<DomainException>(() => token.Consume(DateTime.UtcNow));

        Assert.Equal("token_invalido", ex.Code);
    }

    [Fact]
    public void Consume_Expired_Throws_WithTokenExpiradoCode()
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(-1);
        var token = PasswordResetToken.Create(Guid.NewGuid(), "hash-abc", expiresAt);

        var ex = Assert.Throws<DomainException>(() => token.Consume(DateTime.UtcNow));

        Assert.Equal("token_expirado", ex.Code);
    }
}
