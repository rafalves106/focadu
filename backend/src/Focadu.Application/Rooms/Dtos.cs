using Focadu.Domain.Rooms;

namespace Focadu.Application.Rooms;

/// <summary>Card da lista de salas. Status: Locked (falta pré-requisito), Available, InProgress, Completed.</summary>
public record RoomSummaryDto(
    Guid Id, string Slug, string Title, string Kind, int? WeekNumber, string Difficulty, int EstimatedMinutes, string Summary,
    int TaskCount, int TasksDone, string Status, IReadOnlyList<string> MissingPrerequisites, int? AverageScore);

/// <summary>Áudio avaliado (de uma entrega ou do fechamento). <c>CorrectAnswer</c> é a resposta curada, nunca a da IA.</summary>
public record RoomVoiceResultDto(int Score, string Transcript, string? ImprovementPoints, string CorrectAnswer, DateTime At);

/// <summary>
/// Tarefa na tela da sala. Trancada não traz teoria, pergunta, dicas nem pergunta do áudio. As dicas vêm todas (liberadas
/// desde o início, sem desconto); a tela mostra uma de cada vez.
/// </summary>
public record RoomTaskDto(
    Guid Id, int Number, string Title, string? ChainLabel, string State, string? Theory, string? Question, string AnswerFormat,
    IReadOnlyList<string> Hints, string? VoicePrompt, DateTime? FlagSolvedAt, RoomVoiceResultDto? Voice);

public record RoomFinalDto(bool Unlocked, string? Prompt, RoomVoiceResultDto? Voice);

public record RoomStateDto(
    Guid Id, Guid CourseId, string Slug, string Title, string Kind, int? WeekNumber, string Difficulty, int EstimatedMinutes,
    string Summary, string Scenario, string MachineLabel, string EnvironmentFolder, bool Locked, IReadOnlyList<string> MissingPrerequisites,
    bool MachineOn, DateTime? StartedAt, IReadOnlyList<RoomTaskDto> Tasks, RoomFinalDto Final);

public record SubmitRoomFlagResult(bool Correct, RoomStateDto Room);

internal static class RoomMapper
{
    /// <summary>Pasta que o zip do ambiente cria na máquina do aluno (o comando do painel faz <c>cd</c> nela).</summary>
    internal static string EnvironmentFolder(Room room) => $"sala-{room.Slug}";

    internal static RoomStateDto ToState(Room room, RoomProgress? progress, IReadOnlyList<string> missingPrerequisites)
    {
        var locked = missingPrerequisites.Count > 0;
        var tasks = room.Tasks.Select((task, index) =>
        {
            var state = locked ? RoomTaskState.Locked : progress?.StateOf(room, task) ?? (index == 0 ? RoomTaskState.Current : RoomTaskState.Locked);
            var result = progress?.ResultFor(task.Id);
            var open = state != RoomTaskState.Locked;
            return new RoomTaskDto(
                task.Id, index + 1, task.Title, task.ChainLabel, state.ToString(),
                open ? task.Theory : null, open ? task.Question : null, task.AnswerFormat,
                open ? task.Hints : [], open ? task.VoicePrompt : null, result?.FlagSolvedAt,
                result is { VoiceAt: { } at, VoiceScore: { } score }
                    ? new RoomVoiceResultDto(score, result.Transcript ?? string.Empty, result.ImprovementPoints, task.VoiceReferenceAnswer, at)
                    : null);
        }).ToList();

        var finalUnlocked = !locked && progress is not null && progress.AllTasksDone(room);
        var final = new RoomFinalDto(
            finalUnlocked, finalUnlocked ? room.FinalPrompt : null,
            progress is { FinalAt: { } finalAt, FinalScore: { } finalScore }
                ? new RoomVoiceResultDto(finalScore, progress.FinalTranscript ?? string.Empty, progress.FinalImprovementPoints, room.FinalReferenceAnswer, finalAt)
                : null);

        return new RoomStateDto(
            room.Id, room.CourseId, room.Slug, room.Title, room.Kind.ToString(), room.WeekNumber, room.Difficulty, room.EstimatedMinutes,
            room.Summary, room.Scenario, room.MachineLabel, EnvironmentFolder(room), locked, missingPrerequisites,
            progress?.MachineOn ?? false, progress?.StartedAt, tasks, final);
    }

    internal static RoomSummaryDto ToSummary(Room room, RoomProgress? progress, IReadOnlyList<string> missingPrerequisites)
    {
        var done = progress is null ? 0 : room.Tasks.Count(t => progress.ResultFor(t.Id)?.VoiceAt is not null);
        var status = missingPrerequisites.Count > 0 ? "Locked"
            : progress?.Completed == true ? "Completed"
            : progress is not null ? "InProgress"
            : "Available";
        var scores = progress?.Results.Where(r => r.VoiceScore is not null).Select(r => r.VoiceScore!.Value).ToList() ?? [];
        return new RoomSummaryDto(
            room.Id, room.Slug, room.Title, room.Kind.ToString(), room.WeekNumber, room.Difficulty, room.EstimatedMinutes, room.Summary,
            room.Tasks.Count, done, status, missingPrerequisites, scores.Count > 0 ? (int)Math.Round(scores.Average()) : null);
    }

    /// <summary>Títulos dos pré-requisitos ainda não concluídos (slug que não existe no curso é ignorado: o importador já recusa).</summary>
    internal static IReadOnlyList<string> MissingPrerequisites(Room room, IReadOnlyList<Room> courseRooms, IReadOnlyList<RoomProgress> progresses) =>
        room.Prerequisites
            .Select(slug => courseRooms.FirstOrDefault(r => r.Slug == slug))
            .Where(r => r is not null && progresses.FirstOrDefault(p => p.RoomId == r.Id)?.Completed != true)
            .Select(r => r!.Title)
            .ToList();
}
