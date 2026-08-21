using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Weeklies;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Weeklies;

public class WeeklyTests
{
    [Fact]
    public void ShouldTriggerWeeklyReinforcement_BecomesTrue_AtTwoWeakDailies()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;

        var day1 = DailyFixtures.NewWeakDaily(weekly, 1, today.AddDays(-2));
        Assert.False(weekly.ShouldTriggerWeeklyReinforcement());

        var day2 = DailyFixtures.NewWeakDaily(weekly, 2, today.AddDays(-1));

        Assert.True(weekly.ShouldTriggerWeeklyReinforcement());

        var reinforcement = weekly.TriggerWeeklyReinforcement();

        Assert.Equal(2, reinforcement.WeakDailyIds.Count);
        Assert.Contains(day1.Id, reinforcement.WeakDailyIds);
        Assert.Contains(day2.Id, reinforcement.WeakDailyIds);
    }

    [Fact]
    public void TriggerWeeklyReinforcement_Throws_WhenThresholdNotReached()
    {
        var weekly = DailyFixtures.NewWeekly();
        DailyFixtures.NewWeakDaily(weekly, 1, DailyFixtures.Today.AddDays(-1));

        Assert.Throws<DomainException>(() => weekly.TriggerWeeklyReinforcement());
    }

    [Fact]
    public void ShouldTriggerWeeklyReinforcement_DoesNotDoubleCountDaysAlreadyCovered()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        DailyFixtures.NewWeakDaily(weekly, 1, today.AddDays(-2));
        DailyFixtures.NewWeakDaily(weekly, 2, today.AddDays(-1));
        weekly.TriggerWeeklyReinforcement();

        // Nenhum dia fraco novo desde entao: nao deve disparar de novo.
        Assert.False(weekly.ShouldTriggerWeeklyReinforcement());
    }

    [Fact]
    public void EvaluateDailyAccess_ThrowsForFutureDaily()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var futureDaily = DailyFixtures.NewDaily(weekly, 1, today.AddDays(1));

        Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(futureDaily.Id, today));
    }

    [Fact]
    public void EvaluateDailyAccess_AllowsStart_ForTodayNotYetStarted()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var daily = DailyFixtures.NewDaily(weekly, 1, today);

        Assert.Equal(DailyAccessMode.Start, weekly.EvaluateDailyAccess(daily.Id, today));
    }

    [Fact]
    public void EvaluateDailyAccess_Throws_WhenAnotherDailyInProgressToday()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var daily1 = DailyFixtures.NewDaily(weekly, 1, today);
        var daily2 = DailyFixtures.NewDaily(weekly, 2, today);

        weekly.StartOrResumeDaily(daily1.Id, today);

        Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(daily2.Id, today));
    }

    [Fact]
    public void EvaluateDailyAccess_TodayCompleted_IsReplay_WithNoAttemptLimit()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, today);
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, 100);
        daily.Complete();

        Assert.Equal(DailyAccessMode.Replay, weekly.EvaluateDailyAccess(daily.Id, today));
    }

    [Fact]
    public void EvaluateDailyAccess_PastCompletedDaily_AllowsVoluntaryReplay_WhenNothingInProgress()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (pastDaily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, today.AddDays(-1));
        pastDaily.Start();
        pastDaily.SubmitActivityResponse(activity.Id, 100);
        pastDaily.Complete();

        Assert.Equal(DailyAccessMode.Replay, weekly.EvaluateDailyAccess(pastDaily.Id, today));
    }

    [Fact]
    public void EvaluateDailyAccess_PastDaily_IsReadOnly_WhenAnotherDailyIsInProgress()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (pastDaily, pastActivity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, today.AddDays(-1));
        pastDaily.Start();
        pastDaily.SubmitActivityResponse(pastActivity.Id, 100);
        pastDaily.Complete();

        var todayDaily = DailyFixtures.NewDaily(weekly, 2, today);
        weekly.StartOrResumeDaily(todayDaily.Id, today);

        Assert.Equal(DailyAccessMode.ReadOnly, weekly.EvaluateDailyAccess(pastDaily.Id, today));
    }

    [Fact]
    public void EvaluateDailyAccess_PastDaily_NeverCompleted_IsReadOnly()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var pastDaily = DailyFixtures.NewDaily(weekly, 1, today.AddDays(-3));

        Assert.Equal(DailyAccessMode.ReadOnly, weekly.EvaluateDailyAccess(pastDaily.Id, today));
    }

    [Fact]
    public void GetDailyByDate_PrefersNonReinforcementDaily_WhenTwoDailiesShareTheSameDate()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        // Dia fraco datado hoje mesmo - a reinforcement Daily gerada a partir dele tambem fica
        // datada hoje (CreateDailyReinforcement usa a data passada como "hoje"), reproduzindo
        // exatamente o cenario de ambiguidade da Fase 5.
        var weakDaily = DailyFixtures.NewWeakDaily(weekly, 1, today);

        var reinforcementDaily = weekly.CreateDailyReinforcement(weakDaily.Id, today);

        Assert.Equal(today, weakDaily.Date);
        Assert.Equal(today, reinforcementDaily.Date);
        Assert.True(reinforcementDaily.IsReinforcement);

        var resolved = weekly.GetDailyByDate(today);

        Assert.Equal(weakDaily.Id, resolved?.Id);
        Assert.NotEqual(reinforcementDaily.Id, resolved?.Id);
    }

    [Fact]
    public void GetDailyByDate_ReturnsNull_WhenNoDailyMatchesTheDate()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        DailyFixtures.NewDaily(weekly, 1, today.AddDays(-1));

        Assert.Null(weekly.GetDailyByDate(today));
    }

    // Fase 11: IsModuleComplete/RequiresPublicationToUnlock.

    [Fact]
    public void IsModuleComplete_False_WhenDailiesArentAllCompleted()
    {
        var weekly = DailyFixtures.NewWeekly();
        var (daily, _) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, DailyFixtures.Today);
        DefineEvaluatedProject(weekly);

        Assert.False(weekly.IsModuleComplete());
    }

    [Fact]
    public void IsModuleComplete_False_WhenProjectNotEvaluated()
    {
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly());
        weekly.InitializeProject();
        // Nunca submetido/avaliado.

        Assert.False(weekly.IsModuleComplete());
    }

    [Fact]
    public void IsModuleComplete_True_WhenDailiesDoneAndProjectEvaluated()
    {
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly());
        DefineEvaluatedProject(weekly);

        Assert.True(weekly.IsModuleComplete());
    }

    [Fact]
    public void IsModuleComplete_IgnoresReinforcementDailies()
    {
        // Dia original concluido (mesmo com penalidade/dia fraco) gera uma Daily de reforco
        // pendente - so a original conta pro modulo, a de reforco (IsReinforcement) fica de fora.
        var weekly = DailyFixtures.NewWeekly();
        var weakDaily = DailyFixtures.NewWeakDaily(weekly, 1, DailyFixtures.Today);
        // CreateDailyReinforcement so aceita antes da 1a conclusao (ShouldTriggerDailyReinforcement
        // exige !HasEverCompleted) - por isso o reforco vem antes do Complete() aqui.
        weekly.CreateDailyReinforcement(weakDaily.Id, DailyFixtures.Today.AddDays(1));
        weakDaily.Complete();
        DefineEvaluatedProject(weekly);

        Assert.True(weekly.IsModuleComplete());
    }

    [Fact]
    public void RequiresPublicationToUnlock_True_WhenModuleCompleteAndNoPublicationStarted()
    {
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly());
        DefineEvaluatedProject(weekly);

        Assert.True(weekly.RequiresPublicationToUnlock());
    }

    [Fact]
    public void RequiresPublicationToUnlock_False_WhenPublicationValidated()
    {
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly());
        DefineEvaluatedProject(weekly);

        var publication = weekly.StartPublication();
        publication.Submit(PublicationPlatform.GitHub, "https://github.com/falves/x");
        publication.MarkValidated();

        Assert.False(weekly.RequiresPublicationToUnlock());
    }

    [Fact]
    public void RequiresPublicationToUnlock_StaysTrue_WhenPublicationFailed()
    {
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly());
        DefineEvaluatedProject(weekly);

        var publication = weekly.StartPublication();
        publication.Submit(PublicationPlatform.LinkedIn, "https://naolinkedin.com/x");
        publication.MarkFailed("URL invalida.");

        Assert.True(weekly.RequiresPublicationToUnlock());
    }

    // Fase 14: IsPerfect (bonus de Gems).

    [Fact]
    public void IsPerfect_True_WhenModuleCompleteAndNoDailyHadPenalty()
    {
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly());
        DefineEvaluatedProject(weekly);

        Assert.True(weekly.IsPerfect());
    }

    [Fact]
    public void IsPerfect_False_WhenAnyOriginalDailyHadPenalty()
    {
        // NewWeakDaily reprova todas as respostas antes de concluir - PenaltyPoints > 0 mesmo apos
        // Complete(), entao o modulo pode ficar completo sem ficar perfeito.
        var weekly = DailyFixtures.NewWeekly();
        var weakDaily = DailyFixtures.NewWeakDaily(weekly, 1, DailyFixtures.Today);
        weakDaily.Complete();
        DefineEvaluatedProject(weekly);

        Assert.True(weekly.IsModuleComplete());
        Assert.False(weekly.IsPerfect());
    }

    [Fact]
    public void IsPerfect_False_WhenModuleNotComplete()
    {
        var weekly = DailyFixtures.NewWeekly();
        DailyFixtures.NewDailyWithOneActivity(weekly, 1, DailyFixtures.Today);
        DefineEvaluatedProject(weekly);

        Assert.False(weekly.IsPerfect());
    }

    // Fase 15: HasPendingWeeklyReinforcement / WeeklyReinforcement.IsResolved.

    [Fact]
    public void HasPendingWeeklyReinforcement_True_WhenWeakDailiesStillLackACompletedReinforcement()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var day1 = DailyFixtures.NewWeakDaily(weekly, 1, today.AddDays(-3));
        var day2 = DailyFixtures.NewWeakDaily(weekly, 2, today.AddDays(-2));
        weekly.CreateDailyReinforcement(day1.Id, today.AddDays(-1));
        weekly.CreateDailyReinforcement(day2.Id, today.AddDays(-1));

        var reinforcement = weekly.TriggerWeeklyReinforcement();

        Assert.False(reinforcement.IsResolved(weekly.Dailies));
        Assert.True(weekly.HasPendingWeeklyReinforcement());
    }

    [Fact]
    public void HasPendingWeeklyReinforcement_False_AfterAllWeakDailiesReinforcementsCompleted()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var day1 = DailyFixtures.NewWeakDaily(weekly, 1, today.AddDays(-3));
        var day2 = DailyFixtures.NewWeakDaily(weekly, 2, today.AddDays(-2));
        var reinforcementDaily1 = weekly.CreateDailyReinforcement(day1.Id, today.AddDays(-1));
        var reinforcementDaily2 = weekly.CreateDailyReinforcement(day2.Id, today.AddDays(-1));
        weekly.TriggerWeeklyReinforcement();

        CompleteWithPassingResponses(reinforcementDaily1);
        CompleteWithPassingResponses(reinforcementDaily2);

        Assert.False(weekly.HasPendingWeeklyReinforcement());
    }

    [Fact]
    public void HasPendingWeeklyReinforcement_False_WhenNoReinforcementEverTriggered()
    {
        var weekly = DailyFixtures.NewWeekly();
        DailyFixtures.NewDaily(weekly, 1, DailyFixtures.Today);

        Assert.False(weekly.HasPendingWeeklyReinforcement());
    }

    /// <summary>Start + responde 100 em cada atividade + Complete - so pros testes de IsResolved acima.</summary>
    private static void CompleteWithPassingResponses(Daily daily)
    {
        daily.Start();
        foreach (var activity in daily.Activities)
        {
            daily.SubmitActivityResponse(activity.Id, 100);
        }
        daily.Complete();
    }

    [Fact]
    public void InitializeProject_CalledTwice_Throws()
    {
        var weekly = DailyFixtures.NewWeekly();
        weekly.InitializeProject();

        Assert.Throws<DomainException>(() => weekly.InitializeProject());
    }

    /// <summary>Completa (Start+Submit 100+Complete) todas as Dailies ja existentes na Weekly - helper local so pros testes de modulo completo acima.</summary>
    private static Weekly CompleteWeeklyDailies(Weekly weekly)
    {
        var (_, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, weekly.Dailies.Count + 1, DailyFixtures.Today);
        var daily = weekly.Dailies.Last();
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, 100);
        daily.Complete();
        return weekly;
    }

    /// <summary>DefineProject/Submit/Evaluate sao void (nao encadeaveis) - helper so pra nao repetir as 3 linhas em cada teste acima.</summary>
    private static void DefineEvaluatedProject(Weekly weekly)
    {
        var project = weekly.InitializeProject();
        project.Submit("https://github.com/x");
        project.Evaluate();
    }
}
