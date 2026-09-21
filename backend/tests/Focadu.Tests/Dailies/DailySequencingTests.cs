using Focadu.Application.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Weeklies;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Dailies;

/// <summary>
/// Fase 38b: DailySequencing substitui a resolucao antiga de "a Daily de hoje" por Daily.Date
/// (calendario, fixado de uma vez so na matricula - ver EnrollUserInCourseUseCase) por uma
/// resolucao puramente sequencial, cruzando todas as Weeklies da matricula. Bug motivador
/// (relatado ao vivo, 14->15/09/2026): concluir a Daily 1 num dia so liberava calendarmente a
/// Daily 4 (proxima data util 1-daily-por-dia-util), deixando as Dailies 2 e 3 presas em Locked
/// pra sempre.
/// </summary>
public class DailySequencingTests
{
    [Fact]
    public void FindNext_ReturnsEarliestDayNumber_AcrossMultipleWeeklies()
    {
        var weekly1 = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (daily1, activity) = DailyFixtures.NewDailyWithOneActivity(weekly1, 1, today);
        daily1.Start();
        daily1.SubmitActivityResponse(activity.Id, 100);
        daily1.Complete();
        DailyFixtures.NewDaily(weekly1, 2, today);
        DailyFixtures.NewDaily(weekly1, 3, today);

        var weekly2 = DailyFixtures.NewWeekly();
        var daily6 = DailyFixtures.NewDaily(weekly2, 6, today);

        var next = DailySequencing.FindNext(new[] { weekly1, weekly2 });

        // Daily 1 (weekly1) ja concluida - a proxima e a Daily 2, nao a Daily 6 (weekly2), mesmo
        // que a Daily 2 nunca tenha sido tocada e a Daily 6 exista numa Weekly "mais nova".
        Assert.Equal(2, next?.DayNumber);
        Assert.NotEqual(daily6.Id, next?.Id);
    }

    [Fact]
    public void FindNext_SkipsReinforcementDailies()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var weakDaily = DailyFixtures.NewWeakDaily(weekly, 1, today);
        var reinforcementDaily = weekly.CreateDailyReinforcement(weakDaily.Id, today);

        var next = DailySequencing.FindNext(new[] { weekly });

        // weakDaily ainda nao foi concluida (so reprovou atividades) - continua sendo a proxima,
        // mesmo com uma Daily de reforco pendente logo depois dela.
        Assert.Equal(weakDaily.Id, next?.Id);
        Assert.NotEqual(reinforcementDaily.Id, next?.Id);
    }

    [Fact]
    public void FindNext_ReturnsNull_WhenEverythingIsCompleted()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, today);
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, 100);
        daily.Complete();

        Assert.Null(DailySequencing.FindNext(new[] { weekly }));
    }

    [Fact]
    public void FindInProgress_TakesPriorityOverAnyOtherWeekly()
    {
        var weekly1 = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var abandonedDaily = DailyFixtures.NewDaily(weekly1, 1, today.AddDays(-5));
        abandonedDaily.Start();

        var weekly2 = DailyFixtures.NewWeekly();
        DailyFixtures.NewDaily(weekly2, 6, today);

        var inProgress = DailySequencing.FindInProgress(new[] { weekly1, weekly2 });

        Assert.Equal(abandonedDaily.Id, inProgress?.Id);
    }

    [Fact]
    public void IsNext_TrueOnlyForTheFrontierDaily()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var daily1 = DailyFixtures.NewDaily(weekly, 1, today);
        var daily2 = DailyFixtures.NewDaily(weekly, 2, today);

        Assert.True(DailySequencing.IsNext(new[] { weekly }, daily1.Id));
        Assert.False(DailySequencing.IsNext(new[] { weekly }, daily2.Id));
    }

    // Fase 54 (bug real, 21/09/2026): as travas entre semanas ("1 Daily por dia", "1 em andamento",
    // "projeto da semana anterior") precisam enxergar a matricula inteira - uma Weekly sozinha so
    // ve as proprias Dailies, entao a Application cruza as Weeklies e entrega pronto pro dominio.

    [Fact]
    public void DailiesOfOtherWeeklies_ExcludesTheWeeklyItself()
    {
        var week1 = DailyFixtures.NewWeekly(1);
        var week2 = DailyFixtures.NewWeekly(2);
        var today = DailyFixtures.Today;
        var dailyOfWeek1 = DailyFixtures.NewDaily(week1, 5, today);
        DailyFixtures.NewDaily(week2, 6, today);

        var others = DailySequencing.DailiesOfOtherWeeklies(new[] { week1, week2 }, week2);

        Assert.Equal(new[] { dailyOfWeek1.Id }, others.Select(d => d.Id));
    }

    [Fact]
    public void FindPendingClosureBefore_ReturnsThePreviousWeekly_WhenItsProjectIsPending()
    {
        var week1 = DailyFixtures.NewWeekly(1);
        var week2 = DailyFixtures.NewWeekly(2);
        var (lastOfWeek1, activity) = DailyFixtures.NewDailyWithOneActivity(week1, 5, DailyFixtures.Today);
        lastOfWeek1.Start();
        lastOfWeek1.SubmitActivityResponse(activity.Id, 100);
        lastOfWeek1.Complete();
        week1.InitializeProject(); // Pending: nunca enviado.

        var pending = DailySequencing.FindPendingClosureBefore(new[] { week1, week2 }, week2);

        Assert.Equal(week1.Id, pending?.Id);
    }

    [Fact]
    public void FindPendingClosureBefore_ReturnsThePreviousWeekly_WhenProjectIsEvaluatedButPublicationIsNot()
    {
        var week1 = DailyFixtures.NewWeekly(1);
        var week2 = DailyFixtures.NewWeekly(2);
        var (lastOfWeek1, activity) = DailyFixtures.NewDailyWithOneActivity(week1, 5, DailyFixtures.Today);
        lastOfWeek1.Start();
        lastOfWeek1.SubmitActivityResponse(activity.Id, 100);
        lastOfWeek1.Complete();
        var project = week1.InitializeProject();
        project.Submit("https://github.com/x");
        project.Evaluate(90, "Bom trabalho.");

        var pending = DailySequencing.FindPendingClosureBefore(new[] { week1, week2 }, week2);

        Assert.Equal(week1.Id, pending?.Id);
    }

    [Fact]
    public void FindPendingClosureBefore_ReturnsNull_WhenPreviousWeeklyIsFullyClosed()
    {
        var week1 = DailyFixtures.NewWeekly(1);
        var week2 = DailyFixtures.NewWeekly(2);
        var (lastOfWeek1, activity) = DailyFixtures.NewDailyWithOneActivity(week1, 5, DailyFixtures.Today);
        lastOfWeek1.Start();
        lastOfWeek1.SubmitActivityResponse(activity.Id, 100);
        lastOfWeek1.Complete();
        var project = week1.InitializeProject();
        project.Submit("https://github.com/x");
        project.Evaluate(90, "Bom trabalho.");
        var publication = week1.StartPublication();
        publication.Submit(PublicationPlatform.GitHub, "https://github.com/falves/x");
        publication.MarkValidated();

        Assert.Null(DailySequencing.FindPendingClosureBefore(new[] { week1, week2 }, week2));
    }

    [Fact]
    public void FindPendingClosureBefore_ReturnsNull_ForTheFirstWeekly()
    {
        var week1 = DailyFixtures.NewWeekly(1);

        Assert.Null(DailySequencing.FindPendingClosureBefore(new[] { week1 }, week1));
    }

    // Fase 55 (decisao do dono, 21/09/2026): "se existe um projeto [pendente], todas as semanas
    // seguintes ficam bloqueadas, do mesmo curso" - nao so a imediatamente seguinte.

    [Fact]
    public void FindPendingClosureBefore_BlocksEveryLaterWeekly_NotJustTheNextOne()
    {
        var week1 = ClosableWeek(1, projectEvaluated: false, published: false); // projeto pendente
        var week2 = ClosableWeek(2, projectEvaluated: true, published: true);   // fechada
        var week3 = DailyFixtures.NewWeekly(3);
        var week4 = DailyFixtures.NewWeekly(4);
        var all = new[] { week4, week2, week3, week1 };

        // A semana 2 esta fechada, mas isso nao "destranca" as seguintes: a 1 continua pendente.
        Assert.Equal(week1.Id, DailySequencing.FindPendingClosureBefore(all, week2)?.Id);
        Assert.Equal(week1.Id, DailySequencing.FindPendingClosureBefore(all, week3)?.Id);
        Assert.Equal(week1.Id, DailySequencing.FindPendingClosureBefore(all, week4)?.Id);
    }

    [Fact]
    public void FindPendingClosureBefore_ReturnsTheEarliestPendingWeekly()
    {
        // A que o aluno precisa fechar primeiro e a mais antiga.
        var week1 = ClosableWeek(1, projectEvaluated: false, published: false);
        var week2 = ClosableWeek(2, projectEvaluated: false, published: false);
        var week3 = DailyFixtures.NewWeekly(3);

        Assert.Equal(week1.Id, DailySequencing.FindPendingClosureBefore(new[] { week3, week2, week1 }, week3)?.Id);
    }

    [Fact]
    public void FindPendingClosureBefore_DoesNotLookAtTheWeeklyItselfOrLaterOnes()
    {
        var week1 = DailyFixtures.NewWeekly(1);
        var week2 = ClosableWeek(2, projectEvaluated: false, published: false); // pendente, mas e POSTERIOR a week1

        Assert.Null(DailySequencing.FindPendingClosureBefore(new[] { week1, week2 }, week1));
        Assert.Null(DailySequencing.FindPendingClosureBefore(new[] { week1, week2 }, week2)); // nem ela mesma
    }

    [Fact]
    public void FindPendingClosureBefore_ReturnsNull_WhenEveryEarlierWeeklyIsClosed()
    {
        var week1 = ClosableWeek(1, projectEvaluated: true, published: true);
        var week2 = ClosableWeek(2, projectEvaluated: true, published: true);
        var week3 = DailyFixtures.NewWeekly(3);

        Assert.Null(DailySequencing.FindPendingClosureBefore(new[] { week1, week2, week3 }, week3));
    }

    /// <summary>Weekly com 1 Daily ja concluida (todas as originais feitas) e o projeto/publicacao no ponto pedido - "fechar" a semana = projeto avaliado + publicacao validada.</summary>
    private static Weekly ClosableWeek(int number, bool projectEvaluated, bool published)
    {
        var week = DailyFixtures.NewWeekly(number);
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(week, 1, DailyFixtures.Today);
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, 100);
        daily.Complete();

        var project = week.InitializeProject();
        if (projectEvaluated)
        {
            project.Submit("https://github.com/x");
            project.Evaluate(90, "Bom trabalho.");
        }

        if (published)
        {
            var publication = week.StartPublication();
            publication.Submit(PublicationPlatform.GitHub, "https://github.com/falves/x");
            publication.MarkValidated();
        }

        return week;
    }
}
