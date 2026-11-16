using Focadu.Application.Rooms;
using Focadu.Domain.Rooms;
using Focadu.Tests.TestHelpers;
using Xunit;

namespace Focadu.Tests.Rooms;

/// <summary>
/// Fase 110 (decisão do dono, 16/11/2026): a sala da semana abre quando a semana dela é liberada - mesma regra da trilha
/// (um Dia começado, feito ou que é o próximo da sequência). Sala de ferramenta e desafio não dependem de semana.
/// </summary>
public class RoomWeekGateTests
{
    [Fact]
    public void OnlyTheWeekOfTheNextDay_IsReached_AtTheStart()
    {
        var week1 = DailyFixtures.NewWeekly(1);
        DailyFixtures.NewDaily(week1, 1, DailyFixtures.Today);
        var week2 = DailyFixtures.NewWeekly(2);
        DailyFixtures.NewDaily(week2, 7, DailyFixtures.Today);

        Assert.Equal([1], RoomMapper.ReachedWeeks([week1, week2]));
    }

    [Fact]
    public void WeekRoom_LocksUntilItsWeek_OtherKindsIgnoreWeeks()
    {
        var week2Room = RoomProgressTests.NewRoom();
        var weekRoomSpec = new RoomSpec("cookies", "Cookies", RoomKind.Week, 2, "Médio", 50, "r", "c", "m", [], "p", "r", 2, "h", "web-security");
        var cookies = new Room(Guid.NewGuid(), weekRoomSpec, [RoomProgressTests.Task("a", "1")]);
        var tool = new Room(Guid.NewGuid(),
            new RoomSpec("nmap", "Domine o nmap", RoomKind.Tool, null, "Fácil", 30, "r", "c", "m", [], "p", "r", 3, "h", "web-security"),
            [RoomProgressTests.Task("a", "1")]);
        var reached = new HashSet<int> { 1 };

        Assert.False(RoomMapper.LockOf(week2Room, [week2Room, cookies, tool], [], reached).Locked);
        var locked = RoomMapper.LockOf(cookies, [week2Room, cookies, tool], [], reached);
        Assert.True(locked.Locked);
        Assert.Equal(2, locked.OpensWithWeek);
        Assert.False(RoomMapper.LockOf(tool, [week2Room, cookies, tool], [], reached).Locked);
    }
}
