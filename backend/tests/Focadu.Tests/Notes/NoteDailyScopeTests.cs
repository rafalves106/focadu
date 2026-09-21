using Focadu.Application.Exceptions;
using Focadu.Application.Notes;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Notes;

/// <summary>
/// Fase 57 (bug real, 21/09/2026): "Suas anotacoes de hoje" (Resumo Falado) buscava por DATA da
/// Daily e a sessao de reforco aparecia vazia - a Daily de reforco e outra Daily (outro Id, outra
/// Date), e as notas do dia ficam presas ao DailyId de origem. Alem de vazio, a busca por data
/// vazava: a Date do reforco (o dia em que foi gerado) pode coincidir com a data agendada de uma
/// Daily futura. O escopo agora e por Daily, incluindo a Daily base do reforco.
/// </summary>
public class NoteDailyScopeTests
{
    [Fact]
    public void Resolve_ForANormalDaily_IsJustThatDaily()
    {
        var weekly = DailyFixtures.NewWeekly();
        var daily = DailyFixtures.NewDaily(weekly, 1, DailyFixtures.Today);

        var scope = NoteDailyScope.Resolve(new[] { weekly }, daily.Id);

        Assert.Equal(new[] { daily.Id }, scope);
    }

    [Fact]
    public void Resolve_ForAReinforcementDaily_IncludesItsBaseDaily()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var baseDaily = DailyFixtures.NewWeakDaily(weekly, 5, today);
        var reinforcement = weekly.CreateDailyReinforcement(baseDaily.Id, today);

        var scope = NoteDailyScope.Resolve(new[] { weekly }, reinforcement.Id);

        Assert.Equal(2, scope.Count);
        Assert.Contains(reinforcement.Id, scope); // notas feitas durante o proprio reforco
        Assert.Contains(baseDaily.Id, scope);     // notas do dia base
    }

    [Fact]
    public void Resolve_ForTheBaseDaily_DoesNotPullTheReinforcement()
    {
        // So o reforco puxa o dia base - o contrario nao (as notas do reforco nao sao "do dia").
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var baseDaily = DailyFixtures.NewWeakDaily(weekly, 5, today);
        weekly.CreateDailyReinforcement(baseDaily.Id, today);

        Assert.Equal(new[] { baseDaily.Id }, NoteDailyScope.Resolve(new[] { weekly }, baseDaily.Id));
    }

    [Fact]
    public void Resolve_FindsTheBaseDaily_EvenWhenOtherWeekliesExist()
    {
        var week1 = DailyFixtures.NewWeekly(1);
        var week2 = DailyFixtures.NewWeekly(2);
        var today = DailyFixtures.Today;
        var baseDaily = DailyFixtures.NewWeakDaily(week1, 5, today);
        var reinforcement = week1.CreateDailyReinforcement(baseDaily.Id, today);
        DailyFixtures.NewDaily(week2, 6, today);

        var scope = NoteDailyScope.Resolve(new[] { week2, week1 }, reinforcement.Id);

        Assert.Contains(baseDaily.Id, scope);
    }

    [Fact]
    public void Resolve_Throws_WhenTheDailyIsNotInTheEnrollment()
    {
        // Daily de outra matricula/usuario nunca resolve: o caso de uso so enxerga as Weeklies do usuario logado.
        var weekly = DailyFixtures.NewWeekly();
        DailyFixtures.NewDaily(weekly, 1, DailyFixtures.Today);

        var ex = Assert.Throws<NotFoundException>(() => NoteDailyScope.Resolve(new[] { weekly }, Guid.NewGuid()));
        Assert.Equal("daily_nao_encontrada", ex.Code);
    }
}
