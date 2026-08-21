using Focadu.Application.Ranking;
using Focadu.Domain.Enums;
using Focadu.Domain.Weeklies;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Ranking;

/// <summary>
/// GetCourseRankingUseCase.ComputeScore/ResolveCurrentWeekly/RankEntries sao internal e testados
/// direto (mesmo padrao de SubmitActivityResponseUseCase.ResolveScore) - sem repositorio nenhum,
/// so objetos de dominio construidos a mao (Weekly/WeeklyTemplate tem construtor publico) ja que
/// os testes precisam de VARIAS Weeklies pra mesma "matricula" (mesmo EnrollmentId), o que
/// DailyFixtures.NewWeekly() (sempre 1 Weekly isolada) nao cobre.
/// </summary>
public class GetCourseRankingUseCaseTests
{
    private static readonly DateOnly Today = DailyFixtures.Today;

    // --- RankEntries: ordenacao + posicao, sem nenhum objeto de dominio -------------------------

    [Fact]
    public void RankEntries_OrdersDescendingByScore()
    {
        var scored = new[]
        {
            new ScoredEnrollment(Guid.NewGuid(), "Baixo", 10, DateTime.UtcNow),
            new ScoredEnrollment(Guid.NewGuid(), "Alto", 90, DateTime.UtcNow),
            new ScoredEnrollment(Guid.NewGuid(), "Medio", 50, DateTime.UtcNow),
        };

        var ranked = GetCourseRankingUseCase.RankEntries(scored);

        Assert.Equal(["Alto", "Medio", "Baixo"], ranked.Select(r => r.DisplayName));
        Assert.Equal([1, 2, 3], ranked.Select(r => r.Position));
    }

    [Fact]
    public void RankEntries_TiesBrokenByEarlierEnrollment()
    {
        var earlier = new ScoredEnrollment(Guid.NewGuid(), "Primeiro", 50, new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        var later = new ScoredEnrollment(Guid.NewGuid(), "Segundo", 50, new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc));

        var ranked = GetCourseRankingUseCase.RankEntries([later, earlier]);

        Assert.Equal("Primeiro", ranked[0].DisplayName);
        Assert.Equal("Segundo", ranked[1].DisplayName);
    }

    // --- ResolveCurrentWeekly: por posicao/data, nao calendario real ----------------------------

    [Fact]
    public void ResolveCurrentWeekly_PicksTheLatestWeeklyThatAlreadyStarted()
    {
        var enrollmentId = Guid.NewGuid();
        var monthlyId = Guid.NewGuid();
        var week1 = NewStartedWeekly(enrollmentId, monthlyId, 1, Today.AddDays(-10));
        var week2 = NewStartedWeekly(enrollmentId, monthlyId, 2, Today.AddDays(-3));
        var week3 = NewStartedWeekly(enrollmentId, monthlyId, 3, Today.AddDays(5)); // futuro, ainda nao comecou

        var current = GetCourseRankingUseCase.ResolveCurrentWeekly([week1, week2, week3], Today);

        Assert.Equal(2, current.Number);
    }

    [Fact]
    public void ResolveCurrentWeekly_FallsBackToFirstWeekly_WhenNoneStartedYet()
    {
        var enrollmentId = Guid.NewGuid();
        var monthlyId = Guid.NewGuid();
        var week1 = NewStartedWeekly(enrollmentId, monthlyId, 1, Today.AddDays(3));
        var week2 = NewStartedWeekly(enrollmentId, monthlyId, 2, Today.AddDays(10));

        var current = GetCourseRankingUseCase.ResolveCurrentWeekly([week1, week2], Today);

        Assert.Equal(1, current.Number);
    }

    // --- ComputeScore: os 3 recortes -------------------------------------------------------------

    [Fact]
    public void ComputeScore_Course_SumsAllCompletedWeeklies()
    {
        var enrollmentId = Guid.NewGuid();
        var monthlyId = Guid.NewGuid();
        var week1 = CompleteWeeklyWithScore(enrollmentId, monthlyId, 1, Today.AddDays(-10), score: 100);
        var week2 = CompleteWeeklyWithScore(enrollmentId, monthlyId, 2, Today.AddDays(-3), score: 0);

        var score = GetCourseRankingUseCase.ComputeScore([week1, week2], RankingScope.Course, Today);

        Assert.Equal(100, score);
    }

    [Fact]
    public void ComputeScore_Weekly_UsesOnlyTheCurrentWeekly()
    {
        var enrollmentId = Guid.NewGuid();
        var monthlyId = Guid.NewGuid();
        var week1 = CompleteWeeklyWithScore(enrollmentId, monthlyId, 1, Today.AddDays(-10), score: 100);
        var week2 = CompleteWeeklyWithScore(enrollmentId, monthlyId, 2, Today.AddDays(-3), score: 40); // atual

        var score = GetCourseRankingUseCase.ComputeScore([week1, week2], RankingScope.Weekly, Today);

        Assert.Equal(40, score);
    }

    [Fact]
    public void ComputeScore_Monthly_SumsOnlyWeekliesOfTheCurrentMonthly()
    {
        var enrollmentId = Guid.NewGuid();
        var monthlyA = Guid.NewGuid();
        var monthlyB = Guid.NewGuid();
        var week1 = CompleteWeeklyWithScore(enrollmentId, monthlyA, 1, Today.AddDays(-20), score: 100);
        var week2 = CompleteWeeklyWithScore(enrollmentId, monthlyB, 2, Today.AddDays(-10), score: 50); // mes atual
        var week3 = CompleteWeeklyWithScore(enrollmentId, monthlyB, 3, Today.AddDays(-3), score: 20); // mes atual

        var score = GetCourseRankingUseCase.ComputeScore([week1, week2, week3], RankingScope.Monthly, Today);

        Assert.Equal(70, score); // so monthlyB: 50 + 20, monthlyA (Weekly antiga) fica de fora
    }

    [Fact]
    public void ComputeScore_TreatsIncompleteCurrentWeeklyAsZero_NeverNull()
    {
        var enrollmentId = Guid.NewGuid();
        var monthlyId = Guid.NewGuid();
        var week1 = NewStartedWeekly(enrollmentId, monthlyId, 1, Today); // nunca completada

        var score = GetCourseRankingUseCase.ComputeScore([week1], RankingScope.Weekly, Today);

        Assert.Equal(0, score);
    }

    [Fact]
    public void ComputeScore_NoWeeklies_IsZero()
    {
        Assert.Equal(0, GetCourseRankingUseCase.ComputeScore([], RankingScope.Course, Today));
    }

    // --- Helpers locais - Weekly/WeeklyTemplate tem construtor publico, sem precisar de acesso
    // internal cross-assembly (mesmo raciocinio de DailyFixtures). -------------------------------

    private static Weekly NewStartedWeekly(Guid enrollmentId, Guid monthlyId, int number, DateOnly date)
    {
        var template = new WeeklyTemplate(monthlyId, number, $"Semana {number}");
        var weekly = new Weekly(enrollmentId, template, date);
        weekly.AddDaily(template.AddDailyTemplate(1), date);
        return weekly;
    }

    /// <summary>Weekly com 1 Daily (1 Quiz) + Projeto, ambos avaliados com o mesmo "score" - Weekly.CalculateScore() = score (0.7*score + 0.3*score = score).</summary>
    private static Weekly CompleteWeeklyWithScore(Guid enrollmentId, Guid monthlyId, int number, DateOnly date, int score)
    {
        var template = new WeeklyTemplate(monthlyId, number, $"Semana {number}");
        var weekly = new Weekly(enrollmentId, template, date);
        var dailyTemplate = template.AddDailyTemplate(1);
        var activity = dailyTemplate.AddActivity(ActivityType.Quiz, 0, AnswerMode.MultipleChoice);
        var daily = weekly.AddDaily(dailyTemplate, date);
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, score);
        daily.Complete();

        var project = weekly.InitializeProject();
        project.Submit("https://github.com/x");
        project.Evaluate(score, "ok");

        return weekly;
    }
}
