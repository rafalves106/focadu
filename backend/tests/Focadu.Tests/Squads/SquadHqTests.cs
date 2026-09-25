using Focadu.Application.Squads;
using Focadu.Domain.Enums;
using Focadu.Domain.Cosmetics;
using Focadu.Domain.Squads;
using Xunit;

namespace Focadu.Tests.Squads;

/// <summary>Fase 72: escalacao, meta da semana e feed do QG do Squad (funcoes puras de GetSquadHqUseCase) + chave do GG.</summary>
public class SquadHqTests
{
    // Quarta-feira: a semana da meta comeca na segunda 21/09.
    private static readonly DateOnly Today = new(2026, 9, 23);

    /// <summary>Meio-dia UTC do dia - cai no mesmo dia local em qualquer fuso do Brasil.</summary>
    private static DateTime At(DateOnly day, int hour = 15) => day.ToDateTime(new TimeOnly(hour, 0), DateTimeKind.Utc);

    private static MemberFacts Member(
        string name, DateTime? joinedAt = null, bool hideScores = false,
        CompletionFact[]? completions = null, ProjectFact[]? projects = null, AcquisitionFact[]? acquisitions = null) =>
        new(Guid.NewGuid(), name, hideScores, Guid.NewGuid(), joinedAt ?? At(Today.AddDays(-30)), null,
            completions ?? [], projects ?? [], acquisitions ?? []);

    private static CompletionFact Done(DateOnly day, int dayNumber = 1, bool reinforcement = false, double? score = 90) =>
        new(Guid.NewGuid(), dayNumber, reinforcement, At(day), score);

    [Fact]
    public void WeekStart_IsMonday()
    {
        Assert.Equal(new DateOnly(2026, 9, 21), SquadWeeklyGoal.WeekStart(Today));
        Assert.Equal(new DateOnly(2026, 9, 21), SquadWeeklyGoal.WeekStart(new DateOnly(2026, 9, 21)));
        Assert.Equal(new DateOnly(2026, 9, 21), SquadWeeklyGoal.WeekStart(new DateOnly(2026, 9, 27)));
    }

    [Fact]
    public void WeeklyGoal_CountsThisWeekOriginalDailies_AndWhoStudiedToday()
    {
        var ana = Member("Ana", completions: [Done(Today), Done(Today.AddDays(-1)), Done(Today.AddDays(-3)), Done(Today, reinforcement: true)]);
        var bia = Member("Bia", completions: [Done(Today.AddDays(-2))]);
        var caio = Member("Caio");

        var goal = GetSquadHqUseCase.BuildWeeklyGoal([ana, bia, caio], Today);

        // Domingo (-3) e da semana passada; reforco nao conta.
        Assert.Equal(3, goal.Completed);
        Assert.Equal(15, goal.Target);
        Assert.Equal(1, goal.StudiedToday);
        Assert.Equal(new DateOnly(2026, 9, 21), goal.WeekStart);
    }

    [Fact]
    public void Lineup_LeaderThenCoLeaderThenJoinOrder_WithStudiedToday()
    {
        var early = Member("Primeiro", joinedAt: At(Today.AddDays(-20)), completions: [Done(Today.AddDays(-1))]);
        var leader = Member("Lider", joinedAt: At(Today.AddDays(-10)), completions: [Done(Today)]);
        var coLeader = Member("Co", joinedAt: At(Today.AddDays(-5)));

        var lineup = GetSquadHqUseCase.BuildLineup([early, coLeader, leader], leader.UserId, coLeader.UserId, Today);

        Assert.Equal(["Lider", "Co", "Primeiro"], lineup.Select(m => m.DisplayName));
        Assert.True(lineup[0].StudiedToday);
        Assert.False(lineup[2].StudiedToday);
        Assert.Equal(Today.AddDays(-1), lineup[2].LastStudiedOn);
        Assert.Null(lineup[1].LastStudiedOn);
    }

    [Fact]
    public void Feed_NewestFirst_OnlyLastFourteenDays_WithStableKeys()
    {
        var ana = Member("Ana", joinedAt: At(Today.AddDays(-40)), completions: [Done(Today, 12), Done(Today.AddDays(-20), 2)],
            projects: [new ProjectFact(Guid.NewGuid(), 1, At(Today.AddDays(-1)), 92)]);

        var feed = GetSquadHqUseCase.BuildFeed([ana], Guid.NewGuid(), Today);

        Assert.Equal([SquadActivityType.Daily, SquadActivityType.Project], feed.Select(a => a.Type));
        Assert.Equal(12, feed[0].DayNumber);
        Assert.Equal(1, feed[1].WeekNumber);
        Assert.Equal(92, feed[1].Score);
        Assert.StartsWith($"daily:{ana.UserId}:", feed[0].Key);
        Assert.Equal(ana.UserId, ToggleSquadCheerUseCase.ParseAuthor(feed[0].Key));
    }

    [Fact]
    public void Feed_HidesScores_OfWhoAskedTo_ButNotFromThemselves()
    {
        var shy = Member("Timida", hideScores: true, completions: [Done(Today, score: 77)]);

        var seenByOther = GetSquadHqUseCase.BuildFeed([shy], Guid.NewGuid(), Today);
        var seenBySelf = GetSquadHqUseCase.BuildFeed([shy], shy.UserId, Today);

        Assert.Null(seenByOther.Single(a => a.Type == SquadActivityType.Daily).Score);
        Assert.Equal(77, seenBySelf.Single(a => a.Type == SquadActivityType.Daily).Score);
    }

    [Fact]
    public void Feed_AgentCreation_IsOneActivity_FreeHairIsNotAPurchase_ShopItemIs()
    {
        var created = At(Today.AddDays(-2));
        var kit = AgentStarter.KitCodes.Select(code => new AcquisitionFact(Guid.NewGuid(), new CosmeticItem(code, CosmeticSlot.Top, CosmeticRarity.Common, 0, code, isStarter: true), created));
        var freeHair = new AcquisitionFact(Guid.NewGuid(), new CosmeticItem("Cabelo curto", CosmeticSlot.Hair, CosmeticRarity.Common, 30, "cabelo/curto"), created.AddSeconds(1));
        var jacket = new AcquisitionFact(Guid.NewGuid(), new CosmeticItem("Jaqueta âmbar", CosmeticSlot.Top, CosmeticRarity.Rare, 120, "parte-de-cima/jaqueta"), At(Today));
        var bia = Member("Bia", acquisitions: [.. kit, freeHair, jacket]);

        var feed = GetSquadHqUseCase.BuildFeed([bia], Guid.NewGuid(), Today);

        Assert.Equal([SquadActivityType.Purchase, SquadActivityType.Agent], feed.Select(a => a.Type));
        Assert.Equal("Jaqueta âmbar", feed[0].ItemName);
        Assert.Equal(CosmeticRarity.Rare, feed[0].ItemRarity);
    }

    [Fact]
    public void Feed_JoinedSquad_ShowsUpWhileRecent()
    {
        var lu = Member("Lu", joinedAt: At(Today.AddDays(-1)));

        var feed = GetSquadHqUseCase.BuildFeed([lu], Guid.NewGuid(), Today);

        Assert.Equal(SquadActivityType.Joined, Assert.Single(feed).Type);
    }

    [Theory]
    [InlineData("daily:not-a-guid:x")]
    [InlineData("daily")]
    [InlineData("")]
    [InlineData(null)]
    public void ParseAuthor_RejectsMalformedKeys(string? key)
    {
        Assert.Null(ToggleSquadCheerUseCase.ParseAuthor(key));
    }

    [Fact]
    public void SquadCheer_RejectsBlankOrHugeKey()
    {
        Assert.Throws<Focadu.Domain.Exceptions.DomainException>(() => new SquadCheer(Guid.NewGuid(), " ", Guid.NewGuid()));
        Assert.Throws<Focadu.Domain.Exceptions.DomainException>(() => new SquadCheer(Guid.NewGuid(), new string('x', 121), Guid.NewGuid()));
    }
}
