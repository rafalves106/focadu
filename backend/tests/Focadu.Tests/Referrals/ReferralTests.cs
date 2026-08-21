using Focadu.Domain.Exceptions;
using Focadu.Domain.Referrals;
using Xunit;

namespace Focadu.Tests.Referrals;

public class ReferralTests
{
    [Fact]
    public void Create_SetsReferrerAndReferredAndCreatedAt_UnconfirmedByDefault()
    {
        var referrerId = Guid.NewGuid();
        var referredId = Guid.NewGuid();
        var before = DateTime.UtcNow;

        var referral = new Referral(referrerId, referredId);

        Assert.Equal(referrerId, referral.ReferrerUserId);
        Assert.Equal(referredId, referral.ReferredUserId);
        Assert.InRange(referral.CreatedAt, before, DateTime.UtcNow);
        Assert.Null(referral.ConfirmedAt);
    }

    [Fact]
    public void Create_SelfReferral_Throws()
    {
        var userId = Guid.NewGuid();

        Assert.Throws<DomainException>(() => new Referral(userId, userId));
    }

    [Fact]
    public void Confirm_SetsConfirmedAt()
    {
        var referral = new Referral(Guid.NewGuid(), Guid.NewGuid());
        var before = DateTime.UtcNow;

        referral.Confirm();

        Assert.NotNull(referral.ConfirmedAt);
        Assert.InRange(referral.ConfirmedAt!.Value, before, DateTime.UtcNow);
    }

    [Fact]
    public void Confirm_CalledTwice_KeepsTheFirstTimestamp_NeverThrows()
    {
        var referral = new Referral(Guid.NewGuid(), Guid.NewGuid());

        referral.Confirm();
        var firstConfirmedAt = referral.ConfirmedAt;
        referral.Confirm();

        Assert.Equal(firstConfirmedAt, referral.ConfirmedAt);
    }
}
