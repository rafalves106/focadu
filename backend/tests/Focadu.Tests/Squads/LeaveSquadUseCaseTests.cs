using Focadu.Application.Squads;
using Focadu.Domain.Squads;
using Xunit;

namespace Focadu.Tests.Squads;

/// <summary>Sucessao de lideranca (Fase 24b, referencia Clash of Clans) - so o metodo puro ResolveSuccessor, sem repositorio (mesmo criterio de GetCourseRankingUseCase.ComputeScore).</summary>
public class LeaveSquadUseCaseTests
{
    private static SquadMembership MemberJoinedAt(DateTime joinedAt)
    {
        var membership = new SquadMembership(Guid.NewGuid(), Guid.NewGuid());
        typeof(SquadMembership).GetProperty(nameof(SquadMembership.JoinedAt))!.SetValue(membership, joinedAt);
        return membership;
    }

    [Fact]
    public void ResolveSuccessor_WithCoLeaderAmongRemaining_PicksCoLeader()
    {
        var coLeader = MemberJoinedAt(DateTime.UtcNow); // mais novo, mas e o co-lider
        var oldest = MemberJoinedAt(DateTime.UtcNow.AddDays(-10));
        var remaining = new[] { oldest, coLeader };

        var successor = LeaveSquadUseCase.ResolveSuccessor(remaining, coLeader.UserId);

        Assert.Equal(coLeader.UserId, successor);
    }

    [Fact]
    public void ResolveSuccessor_NoCoLeader_PicksOldestMember()
    {
        var newest = MemberJoinedAt(DateTime.UtcNow);
        var oldest = MemberJoinedAt(DateTime.UtcNow.AddDays(-10));
        var remaining = new[] { newest, oldest };

        var successor = LeaveSquadUseCase.ResolveSuccessor(remaining, coLeaderUserId: null);

        Assert.Equal(oldest.UserId, successor);
    }

    [Fact]
    public void ResolveSuccessor_CoLeaderNoLongerAMember_FallsBackToOldest()
    {
        var newest = MemberJoinedAt(DateTime.UtcNow);
        var oldest = MemberJoinedAt(DateTime.UtcNow.AddDays(-10));
        var remaining = new[] { newest, oldest };

        // CoLeaderUserId aponta pra alguem que ja saiu (nao esta em `remaining`).
        var successor = LeaveSquadUseCase.ResolveSuccessor(remaining, Guid.NewGuid());

        Assert.Equal(oldest.UserId, successor);
    }
}
