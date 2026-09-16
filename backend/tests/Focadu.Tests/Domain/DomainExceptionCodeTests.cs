using Focadu.Domain.Exceptions;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Domain;

/// <summary>
/// A Api (Focadu.Api.ErrorHandling.ApiExceptionHandler) mapeia DomainException.Code para status
/// HTTP via uma tabela fixa de strings. Estes testes travam exatamente os codigos que a Api
/// depende, para um typo em qualquer um dos dois lados quebrar o build de testes em vez de
/// silenciosamente virar um 400 generico em producao.
/// </summary>
public class DomainExceptionCodeTests
{
    [Fact]
    public void EvaluateDailyAccess_NotNextInSequence_UsesCode_daily_bloqueada()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var daily = DailyFixtures.NewDaily(weekly, 1, today);

        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(daily.Id, today, isNextInSequence: false));

        Assert.Equal("daily_bloqueada", ex.Code);
    }

    [Fact]
    public void EvaluateDailyAccess_AnotherDailyInProgressToday_UsesCode_daily_em_andamento()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var daily1 = DailyFixtures.NewDaily(weekly, 1, today);
        var daily2 = DailyFixtures.NewDaily(weekly, 2, today);
        weekly.StartOrResumeDaily(daily1.Id, today, isNextInSequence: true);

        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(daily2.Id, today, isNextInSequence: true));

        Assert.Equal("daily_em_andamento", ex.Code);
    }

    [Fact]
    public void EvaluateDailyAccess_AlreadyCompletedADailyToday_UsesCode_daily_limite_diario_atingido()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (daily1, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, today);
        daily1.Start();
        daily1.SubmitActivityResponse(activity.Id, 100);
        daily1.Complete();
        var daily2 = DailyFixtures.NewDaily(weekly, 2, today);

        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(daily2.Id, today, isNextInSequence: true));

        Assert.Equal("daily_limite_diario_atingido", ex.Code);
    }

    [Fact]
    public void SubmitActivityResponse_BeforeStart_UsesCode_daily_nao_iniciada()
    {
        var weekly = DailyFixtures.NewWeekly();
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, DailyFixtures.Today);

        var ex = Assert.Throws<DomainException>(() => daily.SubmitActivityResponse(activity.Id, 100));

        Assert.Equal("daily_nao_iniciada", ex.Code);
    }

    [Fact]
    public void Complete_WhenNotInProgress_UsesCode_daily_nao_em_andamento()
    {
        var weekly = DailyFixtures.NewWeekly();
        var (daily, _) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, DailyFixtures.Today);

        var ex = Assert.Throws<DomainException>(() => daily.Complete());

        Assert.Equal("daily_nao_em_andamento", ex.Code);
    }

    [Fact]
    public void StartOrResumeDaily_OnReadOnlyCompletedDaily_UsesCode_daily_somente_leitura()
    {
        // ReadOnly so existe pra uma Daily ja Completed (dia anterior) enquanto outra Daily
        // segue InProgress - ver Weekly.EvaluateDailyAccess (Fase 38b: deixou de existir ReadOnly
        // pra Daily nunca iniciada, ver DailySequencing).
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (pastDaily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, today.AddDays(-1));
        pastDaily.Start();
        pastDaily.SubmitActivityResponse(activity.Id, 100);
        pastDaily.Complete();
        var todayDaily = DailyFixtures.NewDaily(weekly, 2, today);
        todayDaily.Start();

        var ex = Assert.Throws<DomainException>(() => weekly.StartOrResumeDaily(pastDaily.Id, today, isNextInSequence: true));

        Assert.Equal("daily_somente_leitura", ex.Code);
    }

    [Fact]
    public void DomainException_WithoutExplicitCode_FallsBackToGenericCode()
    {
        var ex = new DomainException("mensagem qualquer");

        Assert.Equal("regra_de_negocio_violada", ex.Code);
    }
}
