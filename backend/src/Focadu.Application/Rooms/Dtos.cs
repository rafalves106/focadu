using Focadu.Domain.Rooms;

namespace Focadu.Application.Rooms;

/// <summary>Card da lista de salas. Status: Locked (falta pré-requisito ou a semana), Available, InProgress, Completed.
/// <c>OpensWithWeek</c>: sala da semana ainda trancada porque o aluno não chegou na semana dela.</summary>
public record RoomSummaryDto(
    Guid Id, string Slug, string Title, string Kind, int? WeekNumber, string Difficulty, int EstimatedMinutes, string Summary,
    int TaskCount, int TasksDone, string Status, IReadOnlyList<string> MissingPrerequisites, int? OpensWithWeek, int? AverageScore,
    int? OpensWithSession = null, int? SessionNumber = null);

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
    int? OpensWithWeek, bool MachineOn, DateTime? StartedAt, IReadOnlyList<RoomTaskDto> Tasks, RoomFinalDto Final,
    int? OpensWithSession = null, int? SessionNumber = null);

public record SubmitRoomFlagResult(bool Correct, RoomStateDto Room);

/// <summary>
/// Por que a sala está trancada (Fase 110): pré-requisitos ainda não concluídos e, na sala da semana, a semana que o
/// aluno ainda não alcançou (decisão do dono, 16/11/2026: a sala da semana abre quando a semana é liberada).
/// Fase 111: em curso <c>StudyFormat.Sessions</c>, a sala apontada por um <c>salaDaSessao</c> abre quando a sessão de
/// origem é concluída (<c>OpensWithSession</c> = número do dia dela) e não mais com a semana. Fase 112:
/// <c>SessionNumber</c> é a sessão de origem da sala de sessão, trancada ou não (rótulo "S2" e "Sala da Sessão 2").
/// </summary>
public record RoomLock(IReadOnlyList<string> MissingPrerequisites, int? OpensWithWeek, int? OpensWithSession = null, int? SessionNumber = null)
{
    public bool Locked => MissingPrerequisites.Count > 0 || OpensWithWeek is not null || OpensWithSession is not null;
}

/// <summary>
/// Fase 111: o que abre as salas do aluno. <c>SessionRooms</c>: slug da sala da sessão para a sessão de origem (só em
/// curso em sessões; vazio no formato Daily, então nada muda nele).
/// </summary>
public record RoomUnlocks(IReadOnlySet<int> ReachedWeeks, IReadOnlyDictionary<string, SessionOrigin> SessionRooms)
{
    public static RoomUnlocks ByWeek(IReadOnlySet<int> reachedWeeks) => new(reachedWeeks, new Dictionary<string, SessionOrigin>());
}

/// <param name="DayNumber">Número do dia da sessão de origem (a de menor número, se mais de uma apontar para a sala).</param>
/// <param name="Completed">Alguma sessão de origem já foi concluída.</param>
public record SessionOrigin(int DayNumber, bool Completed);

internal static class RoomMapper
{
    /// <summary>Pasta que o zip do ambiente cria na máquina do aluno (o comando do painel faz <c>cd</c> nela).</summary>
    internal static string EnvironmentFolder(Room room) => $"sala-{room.Slug}";

    internal static RoomStateDto ToState(Room room, RoomProgress? progress, RoomLock roomLock)
    {
        var locked = roomLock.Locked;
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
            room.Summary, room.Scenario, room.MachineLabel, EnvironmentFolder(room), locked, roomLock.MissingPrerequisites,
            roomLock.OpensWithWeek, progress?.MachineOn ?? false, progress?.StartedAt, tasks, final, roomLock.OpensWithSession, roomLock.SessionNumber);
    }

    internal static RoomSummaryDto ToSummary(Room room, RoomProgress? progress, RoomLock roomLock)
    {
        var done = progress is null ? 0 : room.Tasks.Count(t => progress.ResultFor(t.Id)?.VoiceAt is not null);
        var status = StatusOf(progress, roomLock);
        var scores = progress?.Results.Where(r => r.VoiceScore is not null).Select(r => r.VoiceScore!.Value).ToList() ?? [];
        return new RoomSummaryDto(
            room.Id, room.Slug, room.Title, room.Kind.ToString(), room.WeekNumber, room.Difficulty, room.EstimatedMinutes, room.Summary,
            room.Tasks.Count, done, status, roomLock.MissingPrerequisites, roomLock.OpensWithWeek, scores.Count > 0 ? (int)Math.Round(scores.Average()) : null,
            roomLock.OpensWithSession, roomLock.SessionNumber);
    }

    /// <summary>Locked (falta pré-requisito, a semana ou a sessão), Available, InProgress ou Completed.</summary>
    internal static string StatusOf(RoomProgress? progress, RoomLock roomLock) =>
        roomLock.Locked ? "Locked"
        : progress?.Completed == true ? "Completed"
        : progress is not null ? "InProgress"
        : "Available";

    /// <summary>
    /// Semanas que o aluno já alcançou: mesma regra da trilha (isWeekReached no front, Fase 109b) - a semana não está
    /// atrás de projeto ou publicação pendente e tem um Dia começado, feito ou que é o próximo da sequência.
    /// </summary>
    internal static IReadOnlySet<int> ReachedWeeks(IReadOnlyCollection<Domain.Weeklies.Weekly> weeklies)
    {
        var next = Dailies.DailySequencing.FindNext(weeklies)?.Id;
        return weeklies
            .Where(w => Dailies.DailySequencing.FindPendingClosureBefore(weeklies, w) is null)
            .Where(w => w.Dailies.Where(d => !d.IsReinforcement).Any(d =>
                d.Id == next || d.Status is Domain.Enums.DailyStatus.InProgress or Domain.Enums.DailyStatus.Completed))
            .Select(w => w.Number)
            .ToHashSet();
    }

    /// <summary>Fase 111: salas das sessões (dia.json "salaDaSessao") e a sessão de origem de cada uma. Só para curso em sessões.</summary>
    internal static IReadOnlyDictionary<string, SessionOrigin> SessionRooms(IReadOnlyCollection<Domain.Weeklies.Weekly> weeklies) =>
        weeklies
            .SelectMany(w => w.Dailies)
            .Where(d => !d.IsReinforcement && d.Template.SessionRoomSlug is not null)
            .GroupBy(d => d.Template.SessionRoomSlug!)
            .ToDictionary(
                g => g.Key,
                g => new SessionOrigin(g.Min(d => d.DayNumber), g.Any(d => d.Status == Domain.Enums.DailyStatus.Completed)));

    internal static RoomLock LockOf(Room room, IReadOnlyList<Room> courseRooms, IReadOnlyList<RoomProgress> progresses, IReadOnlySet<int> reachedWeeks) =>
        LockOf(room, courseRooms, progresses, RoomUnlocks.ByWeek(reachedWeeks));

    internal static RoomLock LockOf(Room room, IReadOnlyList<Room> courseRooms, IReadOnlyList<RoomProgress> progresses, RoomUnlocks unlocks)
    {
        var missing = MissingPrerequisites(room, courseRooms, progresses);
        // Sala da sessão: abre com a sessão de origem concluída, não com a semana.
        if (unlocks.SessionRooms.TryGetValue(room.Slug, out var origin))
            return new RoomLock(missing, null, origin.Completed ? null : origin.DayNumber, origin.DayNumber);
        return new RoomLock(missing,
            room.Kind == RoomKind.Week && room.WeekNumber is { } week && !unlocks.ReachedWeeks.Contains(week) ? week : null);
    }

    /// <summary>Títulos dos pré-requisitos ainda não concluídos (slug que não existe no curso é ignorado: o importador já recusa).</summary>
    internal static IReadOnlyList<string> MissingPrerequisites(Room room, IReadOnlyList<Room> courseRooms, IReadOnlyList<RoomProgress> progresses) =>
        room.Prerequisites
            .Select(slug => courseRooms.FirstOrDefault(r => r.Slug == slug))
            .Where(r => r is not null && progresses.FirstOrDefault(p => p.RoomId == r.Id)?.Completed != true)
            .Select(r => r!.Title)
            .ToList();
}
