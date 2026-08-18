using Focadu.Domain.Activities;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Weeklies;

namespace Focadu.Tests.TestHelpers;

/// <summary>Fixtures compartilhadas entre os testes de dominio, para nao repetir o mesmo setup em cada teste.</summary>
internal static class DailyFixtures
{
    public static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);

    public static Weekly NewWeekly() => new(Guid.NewGuid(), 1, "Semana de teste");

    public static (Daily Daily, DailyActivity Activity) NewDailyWithOneActivity(Weekly weekly, int dayNumber, DateOnly date)
    {
        var daily = weekly.AddDaily(dayNumber, date);
        var activity = daily.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        return (daily, activity);
    }

    /// <summary>Cria uma Daily com 3 atividades, inicia, e reprova todas (3 pontos de penalidade = dia fraco).</summary>
    public static Daily NewWeakDaily(Weekly weekly, int dayNumber, DateOnly date)
    {
        var daily = weekly.AddDaily(dayNumber, date);
        var activities = new[]
        {
            daily.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice),
            daily.AddActivity(ActivityType.Quiz, 1, AnswerMode.MultipleChoice),
            daily.AddActivity(ActivityType.Quiz, 2, AnswerMode.MultipleChoice),
        };

        daily.Start();
        foreach (var activity in activities)
        {
            daily.SubmitActivityResponse(activity.Id, 0);
        }

        return daily;
    }
}
