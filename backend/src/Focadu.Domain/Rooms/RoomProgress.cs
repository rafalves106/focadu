using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Rooms;

/// <summary>Estado de uma tarefa pra quem está na sala.</summary>
public enum RoomTaskState
{
    /// <summary>Uma tarefa anterior ainda não tem o áudio da entrega.</summary>
    Locked = 0,
    /// <summary>Aberta, esperando a flag.</summary>
    Current = 1,
    /// <summary>Flag certa; falta o áudio (ele trava a próxima tarefa).</summary>
    AwaitingVoice = 2,
    /// <summary>Flag certa e áudio avaliado (qualquer nota: nota baixa deixa seguir).</summary>
    Done = 3
}

/// <summary>
/// Progresso de um aluno numa Sala (Fase 110), criado quando ele abre a sala pela primeira vez. Regras do dono (15/11/2026):
/// a tarefa só abre depois do áudio da anterior; nota baixa deixa seguir; dica liberada desde o início, sem desconto; o
/// fechamento (opcional desde a Fase 116) é um áudio curto de "como eu corrigiria", liberado quando todas as tarefas têm áudio. "Máquina ligada" é só
/// a marcação do aluno: a Focadu não enxerga a máquina dele.
/// </summary>
public class RoomProgress : Entity
{
    public Guid UserId { get; private set; }
    public Guid RoomId { get; private set; }
    public DateTime StartedAt { get; private set; }
    public bool MachineOn { get; private set; }
    public DateTime? FinalAt { get; private set; }
    public int? FinalScore { get; private set; }
    public string? FinalTranscript { get; private set; }
    public string? FinalCorrectedTranscript { get; private set; }
    public string? FinalImprovementPoints { get; private set; }
    private List<DateTime> _finalAttempts = new();
    public IReadOnlyList<DateTime> FinalAttempts => _finalAttempts.AsReadOnly();

    private readonly List<RoomTaskResult> _results = new();
    public IReadOnlyCollection<RoomTaskResult> Results => _results.AsReadOnly();

    public bool Completed => FinalAt is not null;

    private RoomProgress() { }

    public RoomProgress(Guid userId, Guid roomId, DateTime nowUtc)
    {
        UserId = userId;
        RoomId = roomId;
        StartedAt = nowUtc;
    }

    public RoomTaskResult? ResultFor(Guid taskId) => _results.FirstOrDefault(r => r.TaskId == taskId);

    public RoomTaskState StateOf(Room room, RoomTask task)
    {
        var previousDone = room.Tasks.Where(t => t.OrderIndex < task.OrderIndex).All(t => ResultFor(t.Id)?.VoiceAt is not null);
        if (!previousDone) return RoomTaskState.Locked;
        var result = ResultFor(task.Id);
        if (result?.VoiceAt is not null) return RoomTaskState.Done;
        return result?.FlagSolvedAt is not null ? RoomTaskState.AwaitingVoice : RoomTaskState.Current;
    }

    public bool AllTasksDone(Room room) => room.Tasks.All(t => ResultFor(t.Id)?.VoiceAt is not null);

    public void SetMachine(bool on) => MachineOn = on;

    /// <summary>Confere a flag. Errar não tem limite nem custo; acertar de novo uma tarefa já resolvida devolve verdadeiro.</summary>
    public bool SubmitFlag(Room room, Guid taskId, string answer, DateTime nowUtc)
    {
        var task = room.GetTask(taskId);
        if (StateOf(room, task) == RoomTaskState.Locked)
            throw new DomainException("Essa tarefa ainda está trancada: grave o áudio da anterior.", "tarefa_trancada");
        if (string.IsNullOrWhiteSpace(answer))
            throw new DomainException("Digite a resposta.", "resposta_obrigatoria");
        if (!RoomFlag.Matches(answer, task.FlagHash))
            return ResultFor(taskId)?.FlagSolvedAt is not null;

        GetOrAddResult(taskId).SolveFlag(nowUtc);
        return true;
    }

    /// <summary>Lança se ainda não dá pra gravar o áudio desta tarefa (chamado antes de gastar com a transcrição).</summary>
    public void EnsureCanRecordVoice(Room room, Guid taskId)
    {
        var state = StateOf(room, room.GetTask(taskId));
        if (state is RoomTaskState.Locked or RoomTaskState.Current)
            throw new DomainException("Acerte a flag antes de gravar o áudio.", "flag_pendente");
    }

    public void RecordVoice(Room room, Guid taskId, int score, string transcript, string? correctedTranscript, string? improvementPoints, DateTime nowUtc)
    {
        EnsureCanRecordVoice(room, taskId);
        ResultFor(taskId)!.RecordVoice(Math.Clamp(score, 0, 100), transcript, correctedTranscript, improvementPoints, nowUtc);
        CompleteIfNoFinal(room, nowUtc);
    }

    /// <summary>
    /// Sala sem fechamento (Fase 116) termina no áudio da última tarefa: <c>FinalAt</c> marca a conclusão (sem nota de
    /// fechamento) e <see cref="Completed"/> segue valendo pro resto do sistema. Chamado também na reimportação, pra quem
    /// já tinha todos os áudios quando o fechamento saiu da sala.
    /// </summary>
    public void CompleteIfNoFinal(Room room, DateTime nowUtc)
    {
        if (!room.HasFinal && FinalAt is null && AllTasksDone(room))
            FinalAt = nowUtc;
    }

    public void EnsureCanRecordFinal(Room room)
    {
        if (!room.HasFinal)
            throw new DomainException("Esta sala não tem fechamento por áudio.", "sala_sem_fechamento");
        if (!AllTasksDone(room))
            throw new DomainException("O fechamento abre depois do áudio de todas as tarefas.", "sala_incompleta");
    }

    public void RecordFinal(Room room, int score, string transcript, string? correctedTranscript, string? improvementPoints, DateTime nowUtc)
    {
        EnsureCanRecordFinal(room);
        FinalAt = nowUtc;
        FinalScore = Math.Clamp(score, 0, 100);
        FinalTranscript = transcript;
        FinalCorrectedTranscript = correctedTranscript;
        FinalImprovementPoints = improvementPoints;
        _finalAttempts.Add(nowUtc);
    }

    /// <summary>Tira o progresso de tarefas que saíram da sala numa reimportação.</summary>
    public void RemoveResults(IReadOnlyCollection<Guid> taskIds) => _results.RemoveAll(r => taskIds.Contains(r.TaskId));

    private RoomTaskResult GetOrAddResult(Guid taskId)
    {
        var result = ResultFor(taskId);
        if (result is not null) return result;
        result = new RoomTaskResult(taskId);
        _results.Add(result);
        return result;
    }
}
