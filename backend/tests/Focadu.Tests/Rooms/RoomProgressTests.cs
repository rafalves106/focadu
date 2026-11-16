using Focadu.Domain.Exceptions;
using Focadu.Domain.Rooms;
using Xunit;

namespace Focadu.Tests.Rooms;

/// <summary>
/// Fase 110: regras da Sala prática decididas pelo dono (15/11/2026) - a tarefa só abre depois do áudio da anterior, nota
/// baixa deixa seguir, flag errada não tem custo, o fechamento só abre com todas as entregas gravadas.
/// </summary>
public class RoomProgressTests
{
    internal static RoomTaskSpec Task(string key, string flag) =>
        new(key, $"Tarefa {key}", null, "teoria", "pergunta", "FOCADU{...}", RoomFlag.Hash(flag), ["dica 1"], "explique", "resposta curada");

    internal static Room NewRoom(params RoomTaskSpec[] tasks) =>
        new(Guid.NewGuid(),
            new RoomSpec("lojaserv", "LojaServ", RoomKind.Week, 1, "Fácil", 45, "resumo", "cenário", "Kali + LojaServ", [], "como corrigiria", "curada", 1, "hash", "web-security"),
            tasks.Length > 0 ? tasks : [Task("portas", "8080"), Task("servidor", "LojaServ/2.4.1")]);

    private static readonly DateTime Now = new(2026, 11, 16, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void FirstTaskIsOpen_AndTheNextIsLocked()
    {
        var room = NewRoom();
        var progress = new RoomProgress(Guid.NewGuid(), room.Id, Now);

        Assert.Equal(RoomTaskState.Current, progress.StateOf(room, room.Tasks[0]));
        Assert.Equal(RoomTaskState.Locked, progress.StateOf(room, room.Tasks[1]));
    }

    [Fact]
    public void WrongFlag_IsFalseAndChangesNothing()
    {
        var room = NewRoom();
        var progress = new RoomProgress(Guid.NewGuid(), room.Id, Now);

        Assert.False(progress.SubmitFlag(room, room.Tasks[0].Id, "80", Now));
        Assert.Equal(RoomTaskState.Current, progress.StateOf(room, room.Tasks[0]));
    }

    [Fact]
    public void RightFlag_AsksForTheVoice_AndTheNextStaysLockedUntilTheVoice()
    {
        var room = NewRoom();
        var progress = new RoomProgress(Guid.NewGuid(), room.Id, Now);

        Assert.True(progress.SubmitFlag(room, room.Tasks[0].Id, " 8080 ", Now));
        Assert.Equal(RoomTaskState.AwaitingVoice, progress.StateOf(room, room.Tasks[0]));
        Assert.Equal(RoomTaskState.Locked, progress.StateOf(room, room.Tasks[1]));

        // Nota baixa deixa seguir.
        progress.RecordVoice(room, room.Tasks[0].Id, 40, "fala", null, "faltou x", Now);
        Assert.Equal(RoomTaskState.Done, progress.StateOf(room, room.Tasks[0]));
        Assert.Equal(RoomTaskState.Current, progress.StateOf(room, room.Tasks[1]));
    }

    [Fact]
    public void Flag_IgnoresCaseAndRepeatedSpaces()
    {
        Assert.True(RoomFlag.Matches("lojaserv/2.4.1", RoomFlag.Hash("LojaServ/2.4.1")));
        Assert.True(RoomFlag.Matches("FOCADU{a  b}", RoomFlag.Hash("focadu{a b}")));
        Assert.False(RoomFlag.Matches("", RoomFlag.Hash("")));
    }

    [Fact]
    public void LockedTask_RefusesFlag_AndVoiceNeedsTheFlag()
    {
        var room = NewRoom();
        var progress = new RoomProgress(Guid.NewGuid(), room.Id, Now);

        var locked = Assert.Throws<DomainException>(() => progress.SubmitFlag(room, room.Tasks[1].Id, "LojaServ/2.4.1", Now));
        Assert.Equal("tarefa_trancada", locked.Code);
        var noFlag = Assert.Throws<DomainException>(() => progress.EnsureCanRecordVoice(room, room.Tasks[0].Id));
        Assert.Equal("flag_pendente", noFlag.Code);
    }

    [Fact]
    public void Final_OpensOnlyWhenEveryTaskHasItsVoice()
    {
        var room = NewRoom();
        var progress = new RoomProgress(Guid.NewGuid(), room.Id, Now);
        progress.SubmitFlag(room, room.Tasks[0].Id, "8080", Now);
        progress.RecordVoice(room, room.Tasks[0].Id, 90, "fala", null, null, Now);

        Assert.Equal("sala_incompleta", Assert.Throws<DomainException>(() => progress.EnsureCanRecordFinal(room)).Code);

        progress.SubmitFlag(room, room.Tasks[1].Id, "LojaServ/2.4.1", Now);
        progress.RecordVoice(room, room.Tasks[1].Id, 80, "fala", null, null, Now);
        progress.RecordFinal(room, 85, "corrigiria", null, null, Now);

        Assert.True(progress.Completed);
        Assert.Equal(85, progress.FinalScore);
    }

    [Fact]
    public void ReplaceContent_KeepsTasksByKey_AndReturnsTheRemovedOnes()
    {
        var room = NewRoom();
        var kept = room.Tasks.Single(t => t.Key == "portas");
        var removedId = room.Tasks.Single(t => t.Key == "servidor").Id;

        var removed = room.ReplaceContent(
            new RoomSpec("lojaserv", "LojaServ", RoomKind.Week, 1, "Fácil", 45, "resumo", "cenário", "Kali", [], "p", "r", 1, "hash2", "web-security"),
            [Task("painel", "302"), Task("portas", "8080, 8443")]);

        Assert.Equal([removedId], removed);
        Assert.Equal(["painel", "portas"], room.Tasks.Select(t => t.Key));
        Assert.Same(kept, room.Tasks[1]);
        Assert.Equal(1, kept.OrderIndex);
    }

    [Fact]
    public void Room_RefusesDuplicatedKeys_AndWeekRoomWithoutWeek()
    {
        Assert.Throws<DomainException>(() => NewRoom(Task("a", "1"), Task("a", "2")));
        Assert.Throws<DomainException>(() => new Room(Guid.NewGuid(),
            new RoomSpec("x", "X", RoomKind.Week, null, "Fácil", 10, "r", "c", "m", [], "p", "r", 1, "h", "web-security"), [Task("a", "1")]));
    }
}
