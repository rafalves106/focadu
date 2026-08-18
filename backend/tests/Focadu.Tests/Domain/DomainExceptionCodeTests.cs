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
    public void EvaluateDailyAccess_FutureDaily_UsesCode_daily_futura()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var futureDaily = weekly.AddDaily(1, today.AddDays(1));

        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(futureDaily.Id, today));

        Assert.Equal("daily_futura", ex.Code);
    }

    [Fact]
    public void EvaluateDailyAccess_AnotherDailyInProgressToday_UsesCode_daily_em_andamento()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var daily1 = weekly.AddDaily(1, today);
        var daily2 = weekly.AddDaily(2, today);
        weekly.StartOrResumeDaily(daily1.Id, today);

        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(daily2.Id, today));

        Assert.Equal("daily_em_andamento", ex.Code);
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
    public void StartOrResumeDaily_OnReadOnlyPastDaily_UsesCode_daily_somente_leitura()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var pastDaily = weekly.AddDaily(1, today.AddDays(-3));

        var ex = Assert.Throws<DomainException>(() => weekly.StartOrResumeDaily(pastDaily.Id, today));

        Assert.Equal("daily_somente_leitura", ex.Code);
    }

    [Fact]
    public void DomainException_WithoutExplicitCode_FallsBackToGenericCode()
    {
        var ex = new DomainException("mensagem qualquer");

        Assert.Equal("regra_de_negocio_violada", ex.Code);
    }
}
