using Focadu.Application.Dailies;
using Focadu.Application.Rooms;
using Focadu.Domain.Courses;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Rooms;
using Focadu.Domain.Weeklies;
using Focadu.Tests.Rooms;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Weeklies;

/// <summary>
/// Fase 111 (decisão do dono, 17/11/2026): curso em sessões (StudyFormat.Sessions, wstg = 3 por dia) tem cota de
/// sessões por dia e a sala da sessão entre elas. Curso Daily não muda em nada.
/// </summary>
public class SessionRulesTests
{
    private static readonly DateOnly Today = DailyFixtures.Today;
    private static readonly DateTime Now = DateTime.UtcNow;

    private static Daily CompletedToday(Weekly weekly, int dayNumber, string? sessionRoom = null)
    {
        var (daily, activity) = DailyFixtures.NewDailyWithOneActivity(weekly, dayNumber, Today);
        daily.Template.SetSessionRoom(sessionRoom);
        daily.Start();
        daily.SubmitActivityResponse(activity.Id, 100);
        daily.Complete();
        return daily;
    }

    private static Daily NewSession(Weekly weekly, int dayNumber, string? sessionRoom = null)
    {
        var daily = DailyFixtures.NewDaily(weekly, dayNumber, Today);
        daily.Template.SetSessionRoom(sessionRoom);
        return daily;
    }

    private static Room SessionRoom(string slug) =>
        new(Guid.NewGuid(),
            new RoomSpec(slug, $"Sala {slug}", RoomKind.Week, 1, "Fácil", 30, "r", "c", "m", [], "p", "r", 1, "h", "wstg"),
            [RoomProgressTests.Task("a", "1")]);

    private static RoomProgress Done(Room room)
    {
        var progress = new RoomProgress(Guid.NewGuid(), room.Id, Now);
        progress.SubmitFlag(room, room.Tasks[0].Id, "1", Now);
        progress.RecordVoice(room, room.Tasks[0].Id, 90, "t", null, null, Now);
        progress.RecordFinal(room, 90, "t", null, null, Now);
        return progress;
    }

    // --- Course ---

    [Fact]
    public void Course_DefaultsToDaily_WithOneSessionPerDay()
    {
        var course = new Course("Curso");
        Assert.Equal(StudyFormat.Daily, course.StudyFormat);
        Assert.Equal(1, course.SessionsPerDay);
    }

    [Fact]
    public void Course_Sessions_RequiresSessionsPerDay_AndDailyIgnoresIt()
    {
        var course = new Course("Curso");
        Assert.True(course.SetStudyFormat(StudyFormat.Sessions, 3));
        Assert.Equal(3, course.SessionsPerDay);
        Assert.False(course.SetStudyFormat(StudyFormat.Sessions, 3));
        Assert.Equal("sessoes_por_dia_invalido", Assert.Throws<DomainException>(() => course.SetStudyFormat(StudyFormat.Sessions, null)).Code);
        Assert.Throws<DomainException>(() => course.SetStudyFormat(StudyFormat.Sessions, 0));
        Assert.True(course.SetStudyFormat(StudyFormat.Daily, 3));
        Assert.Equal(1, course.SessionsPerDay);
    }

    [Fact]
    public void Manifest_Formato_Sessoes_SetsTheCourse_AndNoFormatoStaysDaily()
    {
        const string json = """{"name":"C","description":"d","practiceLanguage":"Bash","published":false,"modules":[],"formato":"sessoes","sessoesPorDia":3}""";
        var manifest = Focadu.Application.Seed.CuratedCourseImporter.ParseManifest(json);
        var course = Focadu.Application.Seed.CuratedCourseImporter.CreateCourse(manifest);
        Assert.Equal(StudyFormat.Sessions, course.StudyFormat);
        Assert.Equal(3, course.SessionsPerDay);

        var plain = Focadu.Application.Seed.CuratedCourseImporter.CreateCourse(
            Focadu.Application.Seed.CuratedCourseImporter.ParseManifest("""{"name":"C","description":"d","practiceLanguage":"Bash","published":false,"modules":[]}"""));
        Assert.Equal(StudyFormat.Daily, plain.StudyFormat);
        Assert.Throws<InvalidOperationException>(() => Focadu.Application.Seed.CuratedCourseImporter.ParseStudyFormat("semanal"));
    }

    // --- Cota ---

    [Fact]
    public void DailyFormat_StillBlocksTheSecondDaily_EvenWithStudyContext()
    {
        var weekly = DailyFixtures.NewWeekly();
        CompletedToday(weekly, 1);
        var next = NewSession(weekly, 2);

        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(next.Id, Today, true, null, StudyContext.Daily));
        Assert.Equal("daily_limite_diario_atingido", ex.Code);
    }

    [Fact]
    public void Sessions_ThirdSessionStarts_FourthIsBlocked()
    {
        var weekly = DailyFixtures.NewWeekly();
        CompletedToday(weekly, 1);
        CompletedToday(weekly, 2);
        var third = NewSession(weekly, 3);
        var study = StudyContext.ForSessions(3, null);

        Assert.Equal(DailyAccessMode.Start, weekly.EvaluateDailyAccess(third.Id, Today, true, null, study));

        third.Start();
        third.Complete();
        var fourth = NewSession(weekly, 4);
        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(fourth.Id, Today, true, null, study));
        Assert.Equal("daily_limite_diario_atingido", ex.Code);
        Assert.Contains("3 sessoes", ex.Message);
    }

    [Fact]
    public void Sessions_YesterdaysSessions_DoNotCountToday()
    {
        var weekly = DailyFixtures.NewWeekly();
        for (var day = 1; day <= 3; day++)
            DailyFixtures.BackdateCompletion(CompletedToday(weekly, day), 1);
        var next = NewSession(weekly, 4);

        Assert.Equal(DailyAccessMode.Start, weekly.EvaluateDailyAccess(next.Id, Today, true, null, StudyContext.ForSessions(3, null)));
    }

    [Fact]
    public void Sessions_ReinforcementStaysOutOfTheQuota()
    {
        var weekly = DailyFixtures.NewWeekly();
        CompletedToday(weekly, 1);
        var weak = DailyFixtures.NewWeakDaily(weekly, 2, Today);
        // Fase 115: o reforço nasce com a data de ontem para já estar aberto hoje.
        var reinforcement = weekly.CreateDailyReinforcement(weak.Id, Today.AddDays(-1));
        weak.Complete();
        var study = StudyContext.ForSessions(2, null);

        // A cota de 2 está gasta, mas o reforço entra; e a conclusão dele não conta.
        Assert.Equal(DailyAccessMode.Start, weekly.EvaluateDailyAccess(reinforcement.Id, Today, false, null, study));
        Assert.Equal(2, SessionRules.CompletedToday(weekly.Dailies, Today));
    }

    [Fact]
    public void Sessions_OneInProgressAtATime_StillHolds()
    {
        var weekly = DailyFixtures.NewWeekly();
        var running = NewSession(weekly, 1);
        running.Start();
        var next = NewSession(weekly, 2);

        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(next.Id, Today, true, null, StudyContext.ForSessions(3, null)));
        Assert.Equal("daily_em_andamento", ex.Code);
    }

    // --- Sala da sessão ---

    [Fact]
    public void Sessions_PendingRoom_BlocksTheNextSession_BeforeTheQuota()
    {
        var weekly = DailyFixtures.NewWeekly();
        CompletedToday(weekly, 1, "sessao-1");
        var next = NewSession(weekly, 2, "sessao-2");
        var study = StudyContext.ForSessions(1, new PendingSessionRoom(Guid.NewGuid(), "sessao-1", "Sessão 1"));

        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(next.Id, Today, true, null, study));
        Assert.Equal("sala_da_sessao_pendente", ex.Code);
        Assert.Contains("Sessão 1", ex.Message);
    }

    [Fact]
    public void FindPendingSessionRoom_NoSlug_NoLock()
    {
        var weekly = DailyFixtures.NewWeekly();
        CompletedToday(weekly, 1);
        var next = NewSession(weekly, 2);

        Assert.Null(SessionStudy.FindPendingSessionRoom([weekly], next, [SessionRoom("sessao-1")], []));
    }

    [Fact]
    public void FindPendingSessionRoom_RoomNotDone_Locks_DoneUnlocks()
    {
        var weekly = DailyFixtures.NewWeekly();
        CompletedToday(weekly, 1, "sessao-1");
        var next = NewSession(weekly, 2, "sessao-2");
        var room = SessionRoom("sessao-1");

        var pending = SessionStudy.FindPendingSessionRoom([weekly], next, [room], []);
        Assert.Equal(room.Id, pending?.RoomId);

        Assert.Null(SessionStudy.FindPendingSessionRoom([weekly], next, [room], [Done(room)]));
    }

    [Fact]
    public void FindPendingSessionRoom_RoomNotImported_NoLock_AndStartedSessionNeverLocks()
    {
        var weekly = DailyFixtures.NewWeekly();
        CompletedToday(weekly, 1, "sessao-1");
        var next = NewSession(weekly, 2);

        Assert.Null(SessionStudy.FindPendingSessionRoom([weekly], next, [], []));

        next.Start();
        Assert.Null(SessionStudy.FindPendingSessionRoom([weekly], next, [SessionRoom("sessao-1")], []));
    }

    [Fact]
    public void FindPendingSessionRoom_LooksAtThePreviousSession_AcrossWeeks()
    {
        var week1 = DailyFixtures.NewWeekly(1);
        CompletedToday(week1, 6, "sessao-6");
        var week2 = DailyFixtures.NewWeekly(2);
        var next = NewSession(week2, 7);
        var room = SessionRoom("sessao-6");

        Assert.Equal(room.Id, SessionStudy.FindPendingSessionRoom([week1, week2], next, [room], [])?.RoomId);
    }

    // --- Sala abre com a sessão ---

    [Fact]
    public void SessionRoom_OpensWhenItsSessionIsCompleted_NotWithTheWeek()
    {
        var weekly = DailyFixtures.NewWeekly();
        var first = NewSession(weekly, 1, "sessao-1");
        var room = SessionRoom("sessao-1");
        var reached = new HashSet<int> { 1 };

        var locked = RoomMapper.LockOf(room, [room], [], new RoomUnlocks(reached, RoomMapper.SessionRooms([weekly])));
        Assert.True(locked.Locked);
        Assert.Equal(1, locked.OpensWithSession);
        Assert.Null(locked.OpensWithWeek);

        first.Start();
        first.Complete();
        Assert.False(RoomMapper.LockOf(room, [room], [], new RoomUnlocks(reached, RoomMapper.SessionRooms([weekly]))).Locked);
    }

    [Fact]
    public void SessionRoom_KeepsItsSessionNumber_LockedOrOpen()
    {
        var weekly = DailyFixtures.NewWeekly();
        var first = NewSession(weekly, 1, "sessao-1");
        var room = SessionRoom("sessao-1");
        var reached = new HashSet<int> { 1 };
        RoomLock LockNow() => RoomMapper.LockOf(room, [room], [], new RoomUnlocks(reached, RoomMapper.SessionRooms([weekly])));

        Assert.Equal(1, LockNow().SessionNumber);
        Assert.Equal("Locked", RoomMapper.StatusOf(null, LockNow()));

        first.Start();
        first.Complete();
        Assert.Equal(1, LockNow().SessionNumber);
        Assert.Equal("Available", RoomMapper.StatusOf(null, LockNow()));
    }

    [Fact]
    public void DailyCourse_RoomStillOpensWithTheWeek()
    {
        var weekly = DailyFixtures.NewWeekly();
        NewSession(weekly, 1, "sessao-1");
        var room = SessionRoom("sessao-1");

        // Curso Daily: RoomAccess usa RoomUnlocks.ByWeek, sem sala de sessão.
        var roomLock = RoomMapper.LockOf(room, [room], [], RoomUnlocks.ByWeek(new HashSet<int> { 1 }));
        Assert.False(roomLock.Locked);
        Assert.Null(roomLock.OpensWithSession);
        Assert.Null(roomLock.SessionNumber);
    }

    // --- Fase 115: reforço no dia seguinte ---

    /// <summary>Sessão 1 com 3 erros (reforço disparado) e o reforço criado com a data de <paramref name="createdOn"/>.</summary>
    private static (Daily Source, Daily Reinforcement) WeakSessionWithReinforcement(Weekly weekly, DateOnly createdOn)
    {
        var source = DailyFixtures.NewWeakDaily(weekly, 1, createdOn);
        var reinforcement = weekly.CreateDailyReinforcement(source.Id, createdOn);
        source.Complete();
        return (source, reinforcement);
    }

    [Fact]
    public void Sessions_ReinforcementCreatedToday_OpensOnlyTomorrow()
    {
        var weekly = DailyFixtures.NewWeekly();
        var (_, reinforcement) = WeakSessionWithReinforcement(weekly, Today);
        var study = StudyContext.ForSessions(3, null);

        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(reinforcement.Id, Today, false, null, study));
        Assert.Equal("reforco_abre_amanha", ex.Code);
        Assert.Equal(DailyAccessMode.Start, weekly.EvaluateDailyAccess(reinforcement.Id, Today.AddDays(1), false, null, study));
    }

    [Fact]
    public void DailyCourse_ReinforcementStillOpensRightAway()
    {
        var weekly = DailyFixtures.NewWeekly();
        var (_, reinforcement) = WeakSessionWithReinforcement(weekly, Today);

        Assert.Equal(DailyAccessMode.Start, weekly.EvaluateDailyAccess(reinforcement.Id, Today, false, null, StudyContext.Daily));
    }

    [Fact]
    public void Sessions_OpenReinforcement_ComesBeforeTheNextSession()
    {
        var weekly = DailyFixtures.NewWeekly();
        var (_, reinforcement) = WeakSessionWithReinforcement(weekly, Today.AddDays(-1));
        var next = NewSession(weekly, 2);
        var study = StudyContext.ForSessions(3, null);

        var ex = Assert.Throws<DomainException>(() => weekly.EvaluateDailyAccess(next.Id, Today, true, null, study));
        Assert.Equal("reforco_pendente", ex.Code);
        Assert.Same(reinforcement, SessionRules.OpenPendingReinforcement(weekly.Dailies, Today));

        reinforcement.Start();
        reinforcement.Complete();
        Assert.Null(SessionRules.OpenPendingReinforcement(weekly.Dailies, Today));
        Assert.Equal(DailyAccessMode.Start, weekly.EvaluateDailyAccess(next.Id, Today, true, null, study));
    }

    [Fact]
    public void Sessions_ReinforcementOfToday_DoesNotBlockTheNextSession()
    {
        var weekly = DailyFixtures.NewWeekly();
        WeakSessionWithReinforcement(weekly, Today);
        var next = NewSession(weekly, 2);

        Assert.Equal(DailyAccessMode.Start, weekly.EvaluateDailyAccess(next.Id, Today, true, null, StudyContext.ForSessions(3, null)));
    }

    [Fact]
    public void FindPendingReinforcement_WithOpenOn_SkipsTheOneThatOpensTomorrow()
    {
        var weekly = DailyFixtures.NewWeekly();
        var (_, reinforcement) = WeakSessionWithReinforcement(weekly, Today);

        Assert.Same(reinforcement, DailySequencing.FindPendingReinforcement([weekly]));
        Assert.Null(DailySequencing.FindPendingReinforcement([weekly], Today));
        Assert.Same(reinforcement, DailySequencing.FindPendingReinforcement([weekly], Today.AddDays(1)));
    }
}
