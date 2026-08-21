using Focadu.Application.Achievements;
using Xunit;

namespace Focadu.Tests.Achievements;

/// <summary>GetUserBadgesUseCase.ComputeBadges e internal e testado direto (mesmo padrao de SubmitActivityResponseUseCase.ResolveScore/GetCourseRankingUseCase.ComputeScore) - sem repositorio nenhum, so os 4 numeros ja resolvidos.</summary>
public class GetUserBadgesUseCaseTests
{
    private static BadgeDto Find(UserBadgesDto badges, string code) => badges.Badges.Single(b => b.Code == code);

    [Theory]
    [InlineData(6, false)]
    [InlineData(7, true)]
    [InlineData(8, true)]
    public void Streak7Badge_AchievedAtExactlySevenOrMore(int longestStreak, bool expectedAchieved)
    {
        var badges = GetUserBadgesUseCase.ComputeBadges(longestStreak, 0, 0, false);

        Assert.Equal(expectedAchieved, Find(badges, "streak_7").Achieved);
    }

    [Theory]
    [InlineData(29, false)]
    [InlineData(30, true)]
    public void Streak30Badge_AchievedAtExactlyThirtyOrMore(int longestStreak, bool expectedAchieved)
    {
        var badges = GetUserBadgesUseCase.ComputeBadges(longestStreak, 0, 0, false);

        Assert.Equal(expectedAchieved, Find(badges, "streak_30").Achieved);
    }

    [Fact]
    public void Streak30Badge_DoesNotRequireStreak7ToAlsoBeChecked_BothCanBeTrueIndependently()
    {
        var badges = GetUserBadgesUseCase.ComputeBadges(30, 0, 0, false);

        Assert.True(Find(badges, "streak_7").Achieved);
        Assert.True(Find(badges, "streak_30").Achieved);
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(3, true)]
    public void EasyWeeklyBadge_AchievedWithAtLeastOnePerfectWeekly(int perfectWeeklyCount, bool expectedAchieved)
    {
        var badges = GetUserBadgesUseCase.ComputeBadges(0, perfectWeeklyCount, 0, false);

        var badge = Find(badges, "easy_weekly");
        Assert.Equal(expectedAchieved, badge.Achieved);
        Assert.Equal(perfectWeeklyCount, badge.Progress); // contagem cumulativa exibida ("3x")
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(1, true)]
    public void EmbaixadorBadge_AchievedWithAtLeastOneConfirmedReferral(int confirmedReferralCount, bool expectedAchieved)
    {
        var badges = GetUserBadgesUseCase.ComputeBadges(0, 0, confirmedReferralCount, false);

        Assert.Equal(expectedAchieved, Find(badges, "embaixador").Achieved);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void FounderBadge_MirrorsIsAmongFirstRegistered(bool isFounder)
    {
        var badges = GetUserBadgesUseCase.ComputeBadges(0, 0, 0, isFounder);

        Assert.Equal(isFounder, Find(badges, "founder").Achieved);
    }

    [Fact]
    public void ComputeBadges_AlwaysReturnsExactlyFiveBadges()
    {
        var badges = GetUserBadgesUseCase.ComputeBadges(0, 0, 0, false);

        Assert.Equal(5, badges.Badges.Count);
    }
}
