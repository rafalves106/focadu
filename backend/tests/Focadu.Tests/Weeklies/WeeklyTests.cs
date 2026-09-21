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
    public void EvaluateDailyAccess_Throws_WhenDailyIsNotNextInSequence()
    {
        // Fase 38b: a barreira pra Dailies ainda nao iniciadas deixou de ser calendario
        // (Daily.Date vs "hoje") e virou sequencia (isNextInSequence, calculado fora da Weekly -
        // ver DailySequencing). Aqui isNextInSequence=false simula qualquer motivo pra esta Daily
        // ainda nao ser a vez dela (ex: uma Daily anterior, em outra Weekly, ainda pendente).
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var daily = DailyFixtures.NewDaily(weekly, 1, today);

        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(daily.Id, today, isNextInSequence: false));
        Assert.Equal("daily_bloqueada", ex.Code);
    }

    [Fact]
    public void EvaluateDailyAccess_AllowsStart_WhenNextInSequenceAndNotYetStarted()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var daily = DailyFixtures.NewDaily(weekly, 1, today);

        Assert.Equal(DailyAccessMode.Start, weekly.EvaluateDailyAccess(daily.Id, today, isNextInSequence: true));
    }

    [Fact]
    public void EvaluateDailyAccess_AllowsStart_ForReinforcementDaily_EvenWhenNotNextInSequence()
    {
        // Reforco nunca disputa a sequencia principal - acesso e sempre por link explicito
        // (Daily.ReinforcementDailyId), mesmo que nao seja a isNextInSequence.
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var weakDaily = DailyFixtures.NewWeakDaily(weekly, 1, today);
        var reinforcementDaily = weekly.CreateDailyReinforcement(weakDaily.Id, today);
        weakDaily.Complete();

        // "tomorrow" isola especificamente o comportamento sob teste: sem isso, o guard de "outra
        // Daily em andamento" (weakDaily estava InProgress ate a linha acima) ou o limite diario
        // (weakDaily.Complete() consumiu a cota de hoje) disparariam primeiro.
        var tomorrow = today.AddDays(1);

        Assert.Equal(
            DailyAccessMode.Start,
            weekly.EvaluateDailyAccess(reinforcementDaily.Id, tomorrow, isNextInSequence: false));
    }

    [Fact]
    public void EvaluateDailyAccess_Throws_WhenAnotherDailyInProgress()
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
    public void EvaluateDailyAccess_TodayCompleted_IsReplay_WithNoAttemptLimit()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, today);
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, 100);
        daily.Complete();

        Assert.Equal(DailyAccessMode.Replay, weekly.EvaluateDailyAccess(daily.Id, today, isNextInSequence: true));
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

        Assert.Equal(DailyAccessMode.Replay, weekly.EvaluateDailyAccess(pastDaily.Id, today, isNextInSequence: true));
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

        // Start() direto (nao via Weekly.StartOrResumeDaily): completar pastDaily consumiu a
        // "cota diaria" de hoje (regra nova), entao passar pelo guard de acesso da Weekly bloquearia
        // este setup - o que importa aqui e so ter uma segunda Daily InProgress, nao validar a
        // entrada dela.
        var todayDaily = DailyFixtures.NewDaily(weekly, 2, today);
        todayDaily.Start();

        Assert.Equal(DailyAccessMode.ReadOnly, weekly.EvaluateDailyAccess(pastDaily.Id, today, isNextInSequence: true));
    }

    [Fact]
    public void EvaluateDailyAccess_ResumesAbandonedPastDaily_RegardlessOfSequence()
    {
        // Cenario reportado: Daily iniciada ha alguns dias e nunca concluida nao pode ficar presa
        // pra sempre - precisa continuar acessivel pra retomar de onde parou.
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var abandonedDaily = DailyFixtures.NewDaily(weekly, 1, today.AddDays(-2));
        abandonedDaily.Start();

        Assert.Equal(DailyAccessMode.Resume, weekly.EvaluateDailyAccess(abandonedDaily.Id, today, isNextInSequence: false));
    }

    [Fact]
    public void EvaluateDailyAccess_BlocksStartingAnotherDaily_WhileAnEarlierDailyIsStillInProgress()
    {
        // Reproduz o bug original (Fase 5): uma Daily InProgress abandonada nao pode conviver com
        // uma segunda Daily "iniciavel" ao mesmo tempo - isNextInSequence=true aqui isola
        // especificamente o guard de "outra Daily em andamento" (na pratica, com o calculo real de
        // DailySequencing, a Daily abandonada e sempre quem seria a proxima da sequencia).
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var abandonedDaily = DailyFixtures.NewDaily(weekly, 1, today.AddDays(-1));
        abandonedDaily.Start();
        var todayDaily = DailyFixtures.NewDaily(weekly, 2, today);

        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(todayDaily.Id, today, isNextInSequence: true));
        Assert.Equal("daily_em_andamento", ex.Code);
    }

    [Fact]
    public void EvaluateDailyAccess_BlocksStartingAnotherDaily_AfterCatchingUpAnAbandonedDailyToday()
    {
        // Retomar e concluir hoje um dia atrasado conta como a Daily de hoje - nao da pra fazer
        // duas "rodadas" no mesmo dia corrido.
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var (abandonedDaily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, 1, today.AddDays(-1));
        abandonedDaily.Start();
        abandonedDaily.SubmitActivityResponse(activity.Id, 100);
        abandonedDaily.Complete();
        var todayDaily = DailyFixtures.NewDaily(weekly, 2, today);

        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(todayDaily.Id, today, isNextInSequence: true));
        Assert.Equal("daily_limite_diario_atingido", ex.Code);
    }

    // Fase 54 (bug real, 21/09/2026): concluir a Daily 5 (ultima da Semana 1) gerava a sessao de
    // reforco, mas o botao "Ir para a sessao de reforco" dava 409 - o reforco cai na mesma
    // Weekly da Daily de origem, que acabara de consumir a cota diaria.

    [Fact]
    public void EvaluateDailyAccess_AllowsStart_ForReinforcementDaily_OnTheSameDayItsSourceWasCompleted()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var weakDaily = DailyFixtures.NewWeakDaily(weekly, 1, today);
        var reinforcementDaily = weekly.CreateDailyReinforcement(weakDaily.Id, today);
        weakDaily.Complete();

        Assert.Equal(
            DailyAccessMode.Start,
            weekly.EvaluateDailyAccess(reinforcementDaily.Id, today, isNextInSequence: false));
    }

    [Fact]
    public void StartOrResumeDaily_StartsReinforcementDaily_OnTheSameDayItsSourceWasCompleted()
    {
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var weakDaily = DailyFixtures.NewWeakDaily(weekly, 1, today);
        var reinforcementDaily = weekly.CreateDailyReinforcement(weakDaily.Id, today);
        weakDaily.Complete();

        weekly.StartOrResumeDaily(reinforcementDaily.Id, today, isNextInSequence: false);

        Assert.Equal(DailyStatus.InProgress, reinforcementDaily.Status);
    }

    [Fact]
    public void EvaluateDailyAccess_StillBlocksReinforcementDaily_WhileAnotherDailyIsInProgress()
    {
        // A isencao do reforco e so da cota diaria - "uma Daily em andamento por vez" continua valendo.
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var weakDaily = DailyFixtures.NewWeakDaily(weekly, 1, today); // ainda InProgress
        var reinforcementDaily = weekly.CreateDailyReinforcement(weakDaily.Id, today);

        var ex = Assert.Throws<DomainException>(() =>
            weekly.EvaluateDailyAccess(reinforcementDaily.Id, today, isNextInSequence: false));
        Assert.Equal("daily_em_andamento", ex.Code);
    }

    // Fase 54 (bug real, 21/09/2026): "1 Daily por dia" e "1 Daily em andamento por vez" eram
    // checados so dentro da propria Weekly - concluir a Daily 5 (Semana 1) e clicar em "Hoje"
    // abria a Daily 6 (Semana 2) no mesmo dia.

    [Fact]
    public void EvaluateDailyAccess_Throws_WhenADailyWasCompletedTodayInAnotherWeekly()
    {
        var week1 = DailyFixtures.NewWeekly(1);
        var week2 = DailyFixtures.NewWeekly(2);
        var today = DailyFixtures.Today;
        var (lastOfWeek1, activity) = DailyFixtures.NewDailyWithOneActivity(week1, 5, today);
        lastOfWeek1.Start();
        lastOfWeek1.SubmitActivityResponse(activity.Id, 100);
        lastOfWeek1.Complete();
        var firstOfWeek2 = DailyFixtures.NewDaily(week2, 6, today);

        var ex = Assert.Throws<DomainException>(() =>
            week2.EvaluateDailyAccess(firstOfWeek2.Id, today, isNextInSequence: true, otherWeekliesDailies: week1.Dailies));

        Assert.Equal("daily_limite_diario_atingido", ex.Code);
    }

    [Fact]
    public void StartOrResumeDaily_Throws_WhenADailyWasCompletedTodayInAnotherWeekly_AndLeavesDailyUntouched()
    {
        var week1 = DailyFixtures.NewWeekly(1);
        var week2 = DailyFixtures.NewWeekly(2);
        var today = DailyFixtures.Today;
        var (lastOfWeek1, activity) = DailyFixtures.NewDailyWithOneActivity(week1, 5, today);
        lastOfWeek1.Start();
        lastOfWeek1.SubmitActivityResponse(activity.Id, 100);
        lastOfWeek1.Complete();
        var firstOfWeek2 = DailyFixtures.NewDaily(week2, 6, today);

        Assert.Throws<DomainException>(() =>
            week2.StartOrResumeDaily(firstOfWeek2.Id, today, isNextInSequence: true, otherWeekliesDailies: week1.Dailies));

        Assert.Equal(DailyStatus.Locked, firstOfWeek2.Status);
    }

    [Fact]
    public void EvaluateDailyAccess_AllowsStart_WhenTheOtherWeeklyDailyWasCompletedOnAnEarlierDay()
    {
        var week1 = DailyFixtures.NewWeekly(1);
        var week2 = DailyFixtures.NewWeekly(2);
        var today = DailyFixtures.Today;
        var (lastOfWeek1, activity) = DailyFixtures.NewDailyWithOneActivity(week1, 5, today);
        lastOfWeek1.Start();
        lastOfWeek1.SubmitActivityResponse(activity.Id, 100);
        lastOfWeek1.Complete();
        var firstOfWeek2 = DailyFixtures.NewDaily(week2, 6, today);

        var tomorrow = today.AddDays(1);

        Assert.Equal(
            DailyAccessMode.Start,
            week2.EvaluateDailyAccess(firstOfWeek2.Id, tomorrow, isNextInSequence: true, otherWeekliesDailies: week1.Dailies));
    }

    [Fact]
    public void EvaluateDailyAccess_Throws_WhenADailyIsInProgressInAnotherWeekly()
    {
        var week1 = DailyFixtures.NewWeekly(1);
        var week2 = DailyFixtures.NewWeekly(2);
        var today = DailyFixtures.Today;
        var abandonedInWeek1 = DailyFixtures.NewDaily(week1, 5, today.AddDays(-1));
        abandonedInWeek1.Start();
        var firstOfWeek2 = DailyFixtures.NewDaily(week2, 6, today);

        var ex = Assert.Throws<DomainException>(() =>
            week2.EvaluateDailyAccess(firstOfWeek2.Id, today, isNextInSequence: true, otherWeekliesDailies: week1.Dailies));

        Assert.Equal("daily_em_andamento", ex.Code);
    }

    [Fact]
    public void EvaluateDailyAccess_StillResumes_ADailyInProgress_EvenWhenAnotherWeeklyCompletedOneToday()
    {
        // Retomar uma Daily ja InProgress sempre vale (e o que permite recuperar uma abandonada) - a cota diaria so barra ENTRADAS novas.
        var week1 = DailyFixtures.NewWeekly(1);
        var week2 = DailyFixtures.NewWeekly(2);
        var today = DailyFixtures.Today;
        var (lastOfWeek1, activity) = DailyFixtures.NewDailyWithOneActivity(week1, 5, today);
        lastOfWeek1.Start();
        lastOfWeek1.SubmitActivityResponse(activity.Id, 100);
        lastOfWeek1.Complete();
        var inProgressInWeek2 = DailyFixtures.NewDaily(week2, 6, today);
        inProgressInWeek2.Start();

        Assert.Equal(
            DailyAccessMode.Resume,
            week2.EvaluateDailyAccess(inProgressInWeek2.Id, today, isNextInSequence: true, otherWeekliesDailies: week1.Dailies));
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

    // Fase 54 (bug real, 21/09/2026): a Semana 2 abria sem o projeto da Semana 1 - a unica trava
    // entre semanas (RequiresPublicationToUnlock) so ligava DEPOIS do projeto avaliado, entao com
    // o projeto ainda Pending nada segurava a proxima semana.

    [Fact]
    public void RequiresProjectToUnlock_True_WhenDailiesDoneAndProjectStillPending()
    {
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly());
        weekly.InitializeProject();

        Assert.True(weekly.RequiresProjectToUnlock());
    }

    [Fact]
    public void RequiresProjectToUnlock_True_WhenProjectSubmittedButNotYetEvaluated()
    {
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly());
        weekly.InitializeProject();
        weekly.SubmitProject("https://github.com/falves/x");

        Assert.True(weekly.RequiresProjectToUnlock());
    }

    [Fact]
    public void RequiresProjectToUnlock_False_WhenProjectEvaluated()
    {
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly());
        DefineEvaluatedProject(weekly);

        Assert.False(weekly.RequiresProjectToUnlock());
    }

    [Fact]
    public void RequiresProjectToUnlock_False_WhenDailiesArentAllCompleted()
    {
        // Nesse caso quem segura a proxima semana e a sequencia das Dailies (daily_bloqueada), nao o projeto.
        var weekly = DailyFixtures.NewWeekly();
        DailyFixtures.NewDaily(weekly, 1, DailyFixtures.Today);
        weekly.InitializeProject();

        Assert.False(weekly.RequiresProjectToUnlock());
    }

    [Fact]
    public void RequiresProjectToUnlock_False_WhenWeeklyHasNoProject()
    {
        // Nunca deve acontecer (a matricula sempre inicializa o projeto), mas se acontecer nao pode travar o curso pra sempre.
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly());

        Assert.False(weekly.RequiresProjectToUnlock());
    }

    [Fact]
    public void RequiresProjectToUnlock_IgnoresPendingReinforcementDailies()
    {
        // Mesmo criterio de AreDailiesComplete/IsModuleComplete: reforco nao e conteudo planejado.
        var weekly = DailyFixtures.NewWeekly();
        var today = DailyFixtures.Today;
        var weakDaily = DailyFixtures.NewWeakDaily(weekly, 1, today);
        weekly.CreateDailyReinforcement(weakDaily.Id, today); // reforco fica pendente
        weakDaily.Complete();
        weekly.InitializeProject();

        Assert.True(weekly.RequiresProjectToUnlock());
    }

    // Fase 38: SubmitProject so libera depois que as Dailies originais da Weekly estiverem
    // todas concluidas - antes desta fase o projeto podia ser enviado a qualquer momento
    // (bug reportado ao vivo, card sempre mostrava "PENDENTE" desde o dia 1 da semana).

    [Fact]
    public void SubmitProject_Throws_WhenDailiesArentAllCompleted()
    {
        var weekly = DailyFixtures.NewWeekly();
        DailyFixtures.NewDaily(weekly, 1, DailyFixtures.Today);
        weekly.InitializeProject();

        var ex = Assert.Throws<DomainException>(() => weekly.SubmitProject("https://github.com/falves/x"));

        Assert.Equal("projeto_semana_bloqueado", ex.Code);
        Assert.Equal(WeeklyProjectStatus.Pending, weekly.Project!.Status);
    }

    [Fact]
    public void SubmitProject_Succeeds_WhenAllDailiesCompleted()
    {
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly());
        weekly.InitializeProject();

        weekly.SubmitProject("https://github.com/falves/x");

        Assert.Equal(WeeklyProjectStatus.Submitted, weekly.Project!.Status);
        Assert.Equal("https://github.com/falves/x", weekly.Project!.SubmissionUrl);
    }

    [Fact]
    public void SubmitProject_Throws_WhenWeeklyHasNoProject()
    {
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly());
        // InitializeProject() nunca chamado.

        var ex = Assert.Throws<DomainException>(() => weekly.SubmitProject("https://github.com/falves/x"));

        Assert.Equal("projeto_nao_encontrado", ex.Code);
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

    // Fase 16: CalculateScore (Score de Estudo).

    [Fact]
    public void CalculateScore_Combines70PercentDailyAverageAnd30PercentProjectScore()
    {
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly()); // 1 Daily, score 100
        DefineEvaluatedProject(weekly, score: 80);

        // 0.7*100 + 0.3*80 = 70 + 24 = 94.
        Assert.Equal(94, weekly.CalculateScore());
    }

    [Fact]
    public void CalculateScore_Null_WhenModuleNotComplete()
    {
        var weekly = DailyFixtures.NewWeekly();
        DailyFixtures.NewDailyWithOneActivity(weekly, 1, DailyFixtures.Today);
        DefineEvaluatedProject(weekly);

        Assert.Null(weekly.CalculateScore());
    }

    [Fact]
    public void CalculateScore_Null_WhenProjectNotEvaluated()
    {
        var weekly = CompleteWeeklyDailies(DailyFixtures.NewWeekly());
        weekly.InitializeProject();
        // Nunca submetido/avaliado.

        Assert.Null(weekly.CalculateScore());
    }

    [Fact]
    public void CalculateScore_ExcludesReinforcementDailies_FromTheAverage()
    {
        var weekly = DailyFixtures.NewWeekly();
        var weakDaily = DailyFixtures.NewWeakDaily(weekly, 1, DailyFixtures.Today); // 3 quizzes, todos score 0
        // CreateDailyReinforcement so aceita antes da 1a conclusao (ShouldTriggerDailyReinforcement
        // exige !HasEverCompleted) - por isso o reforco vem antes do Complete() aqui.
        var reinforcementDaily = weekly.CreateDailyReinforcement(weakDaily.Id, DailyFixtures.Today.AddDays(1));
        weakDaily.Complete();

        reinforcementDaily.Start();
        foreach (var activity in reinforcementDaily.Activities)
        {
            reinforcementDaily.SubmitActivityResponse(activity.Id, 100); // reforco "perfeito" - nunca deveria contar
        }
        reinforcementDaily.Complete();
        DefineEvaluatedProject(weekly, score: 50);

        // So a Daily original conta pra media (3 quizzes com score 0 -> media 0).
        // 0.7*0 + 0.3*50 = 15.
        Assert.Equal(15, weekly.CalculateScore());
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
    /// <summary>Score default (90) so importa pra quem quer controlar o Score da Weekly de proposito (ver CalculateScore abaixo) - os outros testes so precisam do projeto Evaluated.</summary>
    private static void DefineEvaluatedProject(Weekly weekly, int score = 90)
    {
        var project = weekly.InitializeProject();
        project.Submit("https://github.com/x");
        project.Evaluate(score, "Bom trabalho.");
    }
}
