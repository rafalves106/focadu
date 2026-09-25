using Focadu.Application.Gamification;
using Focadu.Domain.Gamification;
using Xunit;

namespace Focadu.Tests.Gamification;

/// <summary>Fase 72: status de cada um dos ultimos 14 dias no Perfil (GetStudyCalendarUseCase.ResolveDays).</summary>
public class StudyCalendarTests
{
    private static readonly DateOnly Today = new(2026, 9, 24);

    [Fact]
    public void ResolveDays_FourteenDaysEndingToday_EachWithItsStatus()
    {
        var studied = new HashSet<DateOnly> { Today.AddDays(-1), Today.AddDays(-4) };
        var pauses = new[] { new StreakPause(Today.AddDays(-7), Today.AddDays(-6)) };

        var days = GetStudyCalendarUseCase.ResolveDays(Today, studied, pauses, lastRest: Today.AddDays(-2), joined: Today.AddDays(-10));

        Assert.Equal(14, days.Count);
        Assert.Equal(Today.AddDays(-13), days[0].Date);
        Assert.Equal(Today, days[^1].Date);
        string At(int ago) => days.Single(d => d.Date == Today.AddDays(-ago)).Status;
        Assert.Equal(StudyDayStatus.Today, At(0));
        Assert.Equal(StudyDayStatus.Studied, At(1));
        Assert.Equal(StudyDayStatus.Rest, At(2));
        Assert.Equal(StudyDayStatus.Missed, At(3));
        Assert.Equal(StudyDayStatus.Studied, At(4));
        Assert.Equal(StudyDayStatus.Paused, At(6));
        Assert.Equal(StudyDayStatus.Missed, At(10));
        Assert.Equal(StudyDayStatus.Before, At(11));
    }

    [Fact]
    public void ResolveDays_StudiedToday_IsStudiedNotToday()
    {
        var days = GetStudyCalendarUseCase.ResolveDays(Today, new HashSet<DateOnly> { Today }, [], null, DateOnly.MinValue);

        Assert.Equal(StudyDayStatus.Studied, days[^1].Status);
    }
}
