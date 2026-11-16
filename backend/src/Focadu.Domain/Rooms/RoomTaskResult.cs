using Focadu.Domain.Common;

namespace Focadu.Domain.Rooms;

/// <summary>Progresso do aluno numa tarefa de Sala: quando acertou a flag e o último áudio avaliado da entrega.</summary>
public class RoomTaskResult : Entity
{
    public Guid TaskId { get; private set; }
    public DateTime? FlagSolvedAt { get; private set; }
    public DateTime? VoiceAt { get; private set; }
    public int? VoiceScore { get; private set; }
    public string? Transcript { get; private set; }
    public string? CorrectedTranscript { get; private set; }
    public string? ImprovementPoints { get; private set; }
    private List<DateTime> _voiceAttempts = new();
    /// <summary>Instantes (UTC) de cada áudio mandado, pro limite diário de tentativas por atividade (Fase 101).</summary>
    public IReadOnlyList<DateTime> VoiceAttempts => _voiceAttempts.AsReadOnly();

    private RoomTaskResult() { }

    internal RoomTaskResult(Guid taskId) => TaskId = taskId;

    internal void SolveFlag(DateTime nowUtc) => FlagSolvedAt ??= nowUtc;

    internal void RecordVoice(int score, string transcript, string? correctedTranscript, string? improvementPoints, DateTime nowUtc)
    {
        VoiceAt = nowUtc;
        VoiceScore = score;
        Transcript = transcript;
        CorrectedTranscript = correctedTranscript;
        ImprovementPoints = improvementPoints;
        _voiceAttempts.Add(nowUtc);
    }
}
