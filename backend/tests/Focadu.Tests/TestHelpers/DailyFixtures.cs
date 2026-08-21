using Focadu.Domain.Activities;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Weeklies;

namespace Focadu.Tests.TestHelpers;

/// <summary>
/// Fixtures compartilhadas entre os testes de dominio, para nao repetir o mesmo setup em cada
/// teste. Fase 13: NewWeekly() monta um par WeeklyTemplate+Weekly (instancia) minimo - os testes
/// continuam construindo Daily/DailyActivity so por metodos publicos (WeeklyTemplate.
/// AddDailyTemplate, DailyTemplate.AddActivity, Weekly.AddDaily), sem precisar de acesso
/// `internal` cross-assembly.
/// </summary>
internal static class DailyFixtures
{
    public static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);

    public static Weekly NewWeekly()
    {
        var template = new WeeklyTemplate(Guid.NewGuid(), 1, "Semana de teste");
        return new Weekly(Guid.NewGuid(), template, Today);
    }

    /// <summary>Daily-instancia sem nenhuma atividade - equivalente ao antigo `weekly.AddDaily(dayNumber, date)` de antes da Fase 13 (agora precisa de um DailyTemplate por baixo).</summary>
    public static Daily NewDaily(Weekly weekly, int dayNumber, DateOnly date) =>
        weekly.AddDaily(weekly.Template.AddDailyTemplate(dayNumber), date);

    public static (Daily Daily, DailyActivity Activity) NewDailyWithOneActivity(Weekly weekly, int dayNumber, DateOnly date)
    {
        var dailyTemplate = weekly.Template.AddDailyTemplate(dayNumber);
        var daily = weekly.AddDaily(dailyTemplate, date);
        var activity = dailyTemplate.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        return (daily, activity);
    }

    /// <summary>Cria uma Daily com 3 atividades, inicia, e reprova todas (3 pontos de penalidade = dia fraco).</summary>
    public static Daily NewWeakDaily(Weekly weekly, int dayNumber, DateOnly date)
    {
        var dailyTemplate = weekly.Template.AddDailyTemplate(dayNumber);
        var daily = weekly.AddDaily(dailyTemplate, date);
        var activities = new[]
        {
            dailyTemplate.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice),
            dailyTemplate.AddActivity(ActivityType.Quiz, 1, AnswerMode.MultipleChoice),
            dailyTemplate.AddActivity(ActivityType.Quiz, 2, AnswerMode.MultipleChoice),
        };

        daily.Start();
        foreach (var activity in activities)
        {
            daily.SubmitActivityResponse(activity.Id, 0);
        }

        return daily;
    }

    /// <summary>Respostas de uma Daily-instancia pra uma atividade especifica - ActivityResponse mora em Daily desde a Fase 13, nao mais em DailyActivity (curriculo compartilhado).</summary>
    public static IEnumerable<ActivityResponse> ResponsesFor(Daily daily, Guid activityId) =>
        daily.Responses.Where(r => r.ActivityId == activityId);
}
