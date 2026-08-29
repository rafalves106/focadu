using Focadu.Domain.Exceptions;
using Focadu.Domain.Squads;
using Xunit;

namespace Focadu.Tests.Squads;

public class SquadTests
{
    [Fact]
    public void Create_SetsNameOwnerAndCreatedAt_NoJoinCodeYet()
    {
        var ownerId = Guid.NewGuid();
        var before = DateTime.UtcNow;

        var squad = new Squad("Hackers do Bem", ownerId);

        Assert.Equal("Hackers do Bem", squad.Name);
        Assert.Equal(ownerId, squad.OwnerUserId);
        Assert.InRange(squad.CreatedAt, before, DateTime.UtcNow);
        Assert.Null(squad.JoinCode);
    }

    [Fact]
    public void Create_BlankName_Throws()
    {
        Assert.Throws<DomainException>(() => new Squad("  ", Guid.NewGuid()));
    }

    [Fact]
    public void AssignJoinCode_SetsCode()
    {
        var squad = new Squad("Squad A", Guid.NewGuid());

        squad.AssignJoinCode("ABC23456");

        Assert.Equal("ABC23456", squad.JoinCode);
    }

    [Fact]
    public void AssignJoinCode_CalledTwice_Throws()
    {
        var squad = new Squad("Squad A", Guid.NewGuid());
        squad.AssignJoinCode("ABC23456");

        Assert.Throws<DomainException>(() => squad.AssignJoinCode("OUTRO123"));
    }

    [Fact]
    public void AssignJoinCode_Blank_Throws()
    {
        var squad = new Squad("Squad A", Guid.NewGuid());

        Assert.Throws<DomainException>(() => squad.AssignJoinCode(" "));
    }
}

public class SquadMembershipTests
{
    [Fact]
    public void Create_SetsSquadUserAndJoinedAt()
    {
        var squadId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var before = DateTime.UtcNow;

        var membership = new SquadMembership(squadId, userId);

        Assert.Equal(squadId, membership.SquadId);
        Assert.Equal(userId, membership.UserId);
        Assert.InRange(membership.JoinedAt, before, DateTime.UtcNow);
    }
}
