using Focadu.Application.Squads;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Squads;
using Xunit;

namespace Focadu.Tests.Squads;

/// <summary>Pedidos de entrada no squad (Fase 77): a entidade e as regras puras de SquadJoinRules.</summary>
public class SquadJoinRequestTests
{
    private static readonly DateTime Now = new(2026, 9, 27, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void New_IsOpenUntilSevenDays()
    {
        var request = new SquadJoinRequest(Guid.NewGuid(), Guid.NewGuid(), Now);

        Assert.True(request.IsOpen(Now.AddDays(6.9)));
        Assert.False(request.IsOpen(Now.AddDays(7)));
    }

    [Fact]
    public void Accept_Expired_Throws()
    {
        var request = new SquadJoinRequest(Guid.NewGuid(), Guid.NewGuid(), Now);

        var ex = Assert.Throws<DomainException>(() => request.Accept(Guid.NewGuid(), Now.AddDays(8)));
        Assert.Equal("pedido_indisponivel", ex.Code);
    }

    [Fact]
    public void Reject_ThenUndo_RecordsWhoDecided()
    {
        var leader = Guid.NewGuid();
        var request = new SquadJoinRequest(Guid.NewGuid(), Guid.NewGuid(), Now);

        request.Reject(leader, Now.AddHours(1));
        Assert.Equal(SquadJoinRequestStatus.Rejected, request.Status);
        request.UndoRejection(leader, Now.AddHours(2));

        Assert.Equal(SquadJoinRequestStatus.RejectionUndone, request.Status);
        Assert.Equal(leader, request.DecidedByUserId);
    }

    [Fact]
    public void Undo_NotRejected_Throws()
    {
        var request = new SquadJoinRequest(Guid.NewGuid(), Guid.NewGuid(), Now);

        Assert.Throws<DomainException>(() => request.UndoRejection(Guid.NewGuid(), Now));
    }

    [Fact]
    public void DecideJoin_RejectedBySquad_IsBanned()
    {
        var squad = Guid.NewGuid();
        var rejected = new SquadJoinRequest(squad, Guid.NewGuid(), Now.AddDays(-30));
        rejected.Reject(Guid.NewGuid(), Now.AddDays(-29));

        var (outcome, _, _) = SquadJoinRules.DecideJoin([rejected], squad, Now);

        Assert.Equal(SquadJoinRules.JoinOutcome.Banned, outcome);
    }

    [Fact]
    public void DecideJoin_RejectionUndone_CanAskAgain()
    {
        var squad = Guid.NewGuid();
        var old = new SquadJoinRequest(squad, Guid.NewGuid(), Now.AddDays(-30));
        old.Reject(Guid.NewGuid(), Now.AddDays(-29));
        old.UndoRejection(Guid.NewGuid(), Now.AddDays(-1));

        var (outcome, _, _) = SquadJoinRules.DecideJoin([old], squad, Now);

        Assert.Equal(SquadJoinRules.JoinOutcome.Create, outcome);
    }

    [Fact]
    public void DecideJoin_OpenForSameSquad_ReturnsIt()
    {
        var squad = Guid.NewGuid();
        var open = new SquadJoinRequest(squad, Guid.NewGuid(), Now.AddDays(-1));

        var (outcome, existing, _) = SquadJoinRules.DecideJoin([open], squad, Now);

        Assert.Equal(SquadJoinRules.JoinOutcome.AlreadyRequested, outcome);
        Assert.Same(open, existing);
    }

    [Fact]
    public void DecideJoin_OpenForOtherSquad_CancelsIt()
    {
        var other = new SquadJoinRequest(Guid.NewGuid(), Guid.NewGuid(), Now.AddDays(-1));

        var (outcome, _, toCancel) = SquadJoinRules.DecideJoin([other], Guid.NewGuid(), Now);

        Assert.Equal(SquadJoinRules.JoinOutcome.Create, outcome);
        Assert.Contains(other, toCancel);
    }

    [Fact]
    public void DecideJoin_ExpiredForSameSquad_CreatesNewAndCancelsOld()
    {
        var squad = Guid.NewGuid();
        var expired = new SquadJoinRequest(squad, Guid.NewGuid(), Now.AddDays(-10));

        var (outcome, _, toCancel) = SquadJoinRules.DecideJoin([expired], squad, Now);

        Assert.Equal(SquadJoinRules.JoinOutcome.Create, outcome);
        Assert.Contains(expired, toCancel);
    }

    [Fact]
    public void Visible_ShowsOpenOrRejected_HidesExpiredAndCancelled()
    {
        var open = new SquadJoinRequest(Guid.NewGuid(), Guid.NewGuid(), Now.AddHours(-1));
        Assert.Same(open, SquadJoinRules.Visible([open], Now));

        var expired = new SquadJoinRequest(Guid.NewGuid(), Guid.NewGuid(), Now.AddDays(-8));
        Assert.Null(SquadJoinRules.Visible([expired], Now));

        var rejected = new SquadJoinRequest(Guid.NewGuid(), Guid.NewGuid(), Now.AddDays(-2));
        rejected.Reject(Guid.NewGuid(), Now.AddDays(-1));
        Assert.Same(rejected, SquadJoinRules.Visible([rejected], Now));

        var cancelled = new SquadJoinRequest(Guid.NewGuid(), Guid.NewGuid(), Now);
        cancelled.Cancel(Now);
        Assert.Null(SquadJoinRules.Visible([rejected, cancelled], Now));
    }

    [Fact]
    public void CanManage_OwnerAndCoLeaderOnly()
    {
        var owner = Guid.NewGuid();
        var coLeader = Guid.NewGuid();
        var squad = new Squad("Byte Force", owner);
        squad.PromoteCoLeader(coLeader);

        Assert.True(SquadJoinRules.CanManage(squad, owner));
        Assert.True(SquadJoinRules.CanManage(squad, coLeader));
        Assert.False(SquadJoinRules.CanManage(squad, Guid.NewGuid()));
    }
}
