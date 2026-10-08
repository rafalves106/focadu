using Focadu.Application.Shared;
using Focadu.Application.Users;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Users;
using Xunit;

namespace Focadu.Tests.Users;

public class EmailVerificationCodeTests
{
    private static readonly DateTime Now = new(2026, 10, 8, 12, 0, 0, DateTimeKind.Utc);

    private static EmailVerificationCode NewCode(Guid userId, string code) =>
        EmailVerificationCode.Create(userId, EmailVerificationCodeGenerator.Hash(userId, code), Now, Now.AddMinutes(15));

    [Fact]
    public void TryConsume_RightCode_MarksUsed()
    {
        var userId = Guid.NewGuid();
        var code = NewCode(userId, "123456");

        Assert.True(code.TryConsume(EmailVerificationCodeGenerator.Hash(userId, "123456"), Now.AddMinutes(1)));
        Assert.NotNull(code.UsedAt);
        Assert.False(code.IsUsable(Now.AddMinutes(1)));
    }

    [Fact]
    public void TryConsume_WrongCode_CountsAttempt_UntilBlocked()
    {
        var userId = Guid.NewGuid();
        var code = NewCode(userId, "123456");
        var wrong = EmailVerificationCodeGenerator.Hash(userId, "000000");

        for (var i = 0; i < EmailVerificationCode.MaxAttempts; i++)
            Assert.False(code.TryConsume(wrong, Now));

        var ex = Assert.Throws<DomainException>(() => code.TryConsume(EmailVerificationCodeGenerator.Hash(userId, "123456"), Now));
        Assert.Equal("codigo_bloqueado", ex.Code);
        Assert.Equal(EmailVerificationCode.MaxAttempts, code.FailedAttempts);
    }

    [Fact]
    public void TryConsume_Expired_Throws()
    {
        var userId = Guid.NewGuid();
        var code = NewCode(userId, "123456");

        var ex = Assert.Throws<DomainException>(() => code.TryConsume(EmailVerificationCodeGenerator.Hash(userId, "123456"), Now.AddMinutes(15)));

        Assert.Equal("codigo_expirado", ex.Code);
    }

    [Fact]
    public void Hash_DependsOnUser()
    {
        Assert.NotEqual(EmailVerificationCodeGenerator.Hash(Guid.NewGuid(), "123456"), EmailVerificationCodeGenerator.Hash(Guid.NewGuid(), "123456"));
    }

    [Fact]
    public void Generate_IsSixDigits()
    {
        for (var i = 0; i < 50; i++)
            Assert.Matches("^[0-9]{6}$", EmailVerificationCodeGenerator.Generate());
    }

    [Theory]
    [InlineData(" 123 456 ", "123456")]
    [InlineData("123-456", "123456")]
    [InlineData(null, "")]
    public void Normalize_StripsSpacesAndDashes(string? typed, string expected)
    {
        Assert.Equal(expected, EmailVerificationCodeGenerator.Normalize(typed));
    }

    [Fact]
    public void WaitBeforeResend_CountsDownFromLastSend()
    {
        Assert.Equal(0, SendEmailVerificationUseCase.WaitBeforeResend(null, Now));
        Assert.Equal(45, SendEmailVerificationUseCase.WaitBeforeResend(Now.AddSeconds(-15), Now));
        Assert.Equal(0, SendEmailVerificationUseCase.WaitBeforeResend(Now.AddSeconds(-60), Now));
    }

    [Fact]
    public void User_MarkEmailVerified_KeepsFirstDate()
    {
        var user = User.Create("a@b.com", "hash", "A");
        user.MarkEmailVerified(Now);
        user.MarkEmailVerified(Now.AddDays(1));

        Assert.Equal(Now, user.EmailVerifiedAt);
    }

    [Fact]
    public void SignupOptions_DefaultsOff()
    {
        var options = SignupOptions.FromSettings(null, "nao", " ");

        Assert.False(options.InviteOnly);
        Assert.False(options.EmailVerification);
        Assert.Null(options.ContactEmail);
        Assert.True(SignupOptions.FromSettings("true", "True", "x@y.com").EmailVerification);
    }
}
