using System.IO.Compression;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Seed;
using Focadu.Application.Shared;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;
using Focadu.Domain.Rooms;

namespace Focadu.Application.Rooms;

/// <summary>
/// Leitura comum das Salas (Fase 110): só quem está matriculado no curso vê as salas dele (mesma regra das notas); a sala
/// trancada por pré-requisito aparece, mas não aceita flag, áudio nem máquina.
/// </summary>
public class RoomAccess
{
    private readonly IRoomRepository _rooms;
    private readonly IRoomProgressRepository _progresses;
    private readonly IEnrollmentRepository _enrollments;
    private readonly IWeeklyRepository _weeklies;
    private readonly ICourseRepository _courses;

    public RoomAccess(
        IRoomRepository rooms, IRoomProgressRepository progresses, IEnrollmentRepository enrollments, IWeeklyRepository weeklies,
        ICourseRepository courses)
    {
        _rooms = rooms;
        _progresses = progresses;
        _enrollments = enrollments;
        _weeklies = weeklies;
        _courses = courses;
    }

    /// <summary>
    /// Confere a matrícula e devolve o que abre as salas: as semanas que o aluno já alcançou (salas da semana) e, em
    /// curso em sessões (Fase 111), a sessão de origem de cada sala de sessão.
    /// </summary>
    public async Task<RoomUnlocks> EnsureEnrolledAsync(Guid userId, Guid courseId, CancellationToken cancellationToken)
    {
        var enrollment = await _enrollments.GetByUserAndCourseAsync(userId, courseId, cancellationToken)
            ?? throw new NotFoundException("matricula_nao_encontrada", "Usuario nao esta matriculado neste curso.");
        var weeklies = await _weeklies.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken);
        var reached = RoomMapper.ReachedWeeks(weeklies);
        var course = await _courses.GetByIdAsync(courseId, cancellationToken);
        return course?.StudyFormat == Domain.Courses.StudyFormat.Sessions
            ? new RoomUnlocks(reached, RoomMapper.SessionRooms(weeklies))
            : RoomUnlocks.ByWeek(reached);
    }

    public async Task<RoomContext> LoadAsync(Guid userId, Guid roomId, CancellationToken cancellationToken)
    {
        var room = await _rooms.GetByIdAsync(roomId, cancellationToken)
            ?? throw new NotFoundException("sala_nao_encontrada", "Sala nao encontrada.");
        var unlocks = await EnsureEnrolledAsync(userId, room.CourseId, cancellationToken);

        var courseRooms = await _rooms.ListByCourseAsync(room.CourseId, cancellationToken);
        var progresses = await _progresses.ListByUserAsync(userId, courseRooms.Select(r => r.Id).ToList(), cancellationToken);
        return new RoomContext(room, progresses.FirstOrDefault(p => p.RoomId == room.Id), RoomMapper.LockOf(room, courseRooms, progresses, unlocks));
    }

    /// <summary>Progresso pra escrever: recusa sala trancada e cria o progresso na primeira ação.</summary>
    public async Task<RoomProgress> StartOrGetAsync(Guid userId, RoomContext context, CancellationToken cancellationToken)
    {
        if (context.Lock.OpensWithSession is { } session)
            throw new DomainException($"Essa sala abre quando você concluir a Sessão {session}.", "sala_trancada");
        if (context.Lock.OpensWithWeek is { } week)
            throw new DomainException($"Essa sala abre quando você chegar na Semana {week}.", "sala_trancada");
        if (context.Lock.MissingPrerequisites.Count > 0)
            throw new DomainException($"Essa sala abre depois de: {string.Join(", ", context.Lock.MissingPrerequisites)}.", "sala_trancada");
        if (context.Progress is not null) return context.Progress;

        var progress = new RoomProgress(userId, context.Room.Id, DateTime.UtcNow);
        await _progresses.AddAsync(progress, cancellationToken);
        return progress;
    }
}

public record RoomContext(Room Room, RoomProgress? Progress, RoomLock Lock)
{
    public RoomStateDto ToState(RoomProgress? progress = null) => RoomMapper.ToState(Room, progress ?? Progress, Lock);
}

public class ListRoomsUseCase
{
    private readonly IRoomRepository _rooms;
    private readonly IRoomProgressRepository _progresses;
    private readonly RoomAccess _access;

    public ListRoomsUseCase(IRoomRepository rooms, IRoomProgressRepository progresses, RoomAccess access)
    {
        _rooms = rooms;
        _progresses = progresses;
        _access = access;
    }

    public async Task<IReadOnlyList<RoomSummaryDto>> ExecuteAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        var unlocks = await _access.EnsureEnrolledAsync(userId, courseId, cancellationToken);
        var rooms = await _rooms.ListByCourseAsync(courseId, cancellationToken);
        var progresses = await _progresses.ListByUserAsync(userId, rooms.Select(r => r.Id).ToList(), cancellationToken);
        return rooms
            .Select(r => RoomMapper.ToSummary(r, progresses.FirstOrDefault(p => p.RoomId == r.Id), RoomMapper.LockOf(r, rooms, progresses, unlocks)))
            .ToList();
    }
}

public class GetRoomStateUseCase
{
    private readonly RoomAccess _access;

    public GetRoomStateUseCase(RoomAccess access) => _access = access;

    public async Task<RoomStateDto> ExecuteAsync(Guid userId, Guid roomId, CancellationToken cancellationToken = default) =>
        (await _access.LoadAsync(userId, roomId, cancellationToken)).ToState();
}

/// <summary>"Já subi a máquina" / "A máquina caiu? Desmarcar": só a marcação do aluno, a Focadu não vê a máquina dele.</summary>
public class SetRoomMachineUseCase
{
    private readonly RoomAccess _access;
    private readonly IUnitOfWork _unitOfWork;

    public SetRoomMachineUseCase(RoomAccess access, IUnitOfWork unitOfWork)
    {
        _access = access;
        _unitOfWork = unitOfWork;
    }

    public async Task<RoomStateDto> ExecuteAsync(Guid userId, Guid roomId, bool on, CancellationToken cancellationToken = default)
    {
        var context = await _access.LoadAsync(userId, roomId, cancellationToken);
        var progress = await _access.StartOrGetAsync(userId, context, cancellationToken);
        progress.SetMachine(on);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return context.ToState(progress);
    }
}

public class SubmitRoomFlagUseCase
{
    private readonly RoomAccess _access;
    private readonly IUnitOfWork _unitOfWork;

    public SubmitRoomFlagUseCase(RoomAccess access, IUnitOfWork unitOfWork)
    {
        _access = access;
        _unitOfWork = unitOfWork;
    }

    public async Task<SubmitRoomFlagResult> ExecuteAsync(Guid userId, Guid roomId, Guid taskId, string? answer, CancellationToken cancellationToken = default)
    {
        var context = await _access.LoadAsync(userId, roomId, cancellationToken);
        var progress = await _access.StartOrGetAsync(userId, context, cancellationToken);
        var correct = progress.SubmitFlag(context.Room, taskId, answer ?? string.Empty, DateTime.UtcNow);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new SubmitRoomFlagResult(correct, context.ToState(progress));
    }
}

/// <summary>
/// Áudio de uma entrega (com <c>taskId</c>) ou do fechamento "como eu corrigiria" (sem). Mesmo caminho da conversa por voz do
/// molde v1: transcreve, a IA mede contra a resposta correta curada e devolve nota e pontos a melhorar. Score nunca vem do
/// cliente; travas de IA da Fase 101 (orçamento do dia, duração, tentativas por atividade no dia).
/// </summary>
public class SubmitRoomVoiceUseCase
{
    private readonly RoomAccess _access;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;
    private readonly IAudioTranscriptionService _transcription;
    private readonly IContentEvaluationService _evaluation;
    private readonly ICourseRepository _courses;
    private readonly IAiUsageContext _aiUsage;

    public SubmitRoomVoiceUseCase(
        RoomAccess access, IUnitOfWork unitOfWork, IClock clock, IAudioTranscriptionService transcription,
        IContentEvaluationService evaluation, ICourseRepository courses, IAiUsageContext aiUsage)
    {
        _access = access;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _transcription = transcription;
        _evaluation = evaluation;
        _courses = courses;
        _aiUsage = aiUsage;
    }

    public async Task<RoomStateDto> ExecuteAsync(
        Guid userId, Guid roomId, Guid? taskId, Stream audio, long audioLength, CancellationToken cancellationToken = default)
    {
        if (audioLength <= 0)
            throw new ValidationException("audio_obrigatorio", "O arquivo de audio e obrigatorio.");
        if (audioLength > Dailies.SubmitVoiceSummaryResponseUseCase.MaxAudioSizeBytes)
            throw new ValidationException("audio_muito_grande", "O arquivo de audio excede o tamanho maximo permitido.");

        var context = await _access.LoadAsync(userId, roomId, cancellationToken);
        var progress = await _access.StartOrGetAsync(userId, context, cancellationToken);
        var room = context.Room;

        string prompt, reference, vocabulary;
        IReadOnlyList<DateTime> attempts;
        if (taskId is { } id)
        {
            progress.EnsureCanRecordVoice(room, id);
            var task = room.GetTask(id);
            (prompt, reference, vocabulary) = (task.VoicePrompt, task.VoiceReferenceAnswer, task.Theory);
            attempts = progress.ResultFor(id)?.VoiceAttempts ?? [];
        }
        else
        {
            progress.EnsureCanRecordFinal(room);
            (prompt, reference) = (room.FinalPrompt, room.FinalReferenceAnswer);
            vocabulary = string.Join("\n\n", room.Tasks.Select(t => t.Theory));
            attempts = progress.FinalAttempts;
        }

        AiLimits.EnsureBelowLimit(AiLimits.AttemptsToday(attempts, _clock.Today()));
        await _aiUsage.EnsureBudgetAsync(userId, cancellationToken);
        using var aiUsage = _aiUsage.Begin(userId);
        var spoken = await _transcription.TranscribeAsync(audio, cancellationToken);
        if (spoken.DurationSeconds > AiLimits.MaxAudioSeconds)
            throw new ValidationException("audio_muito_longo", $"O áudio tem mais de {(int)(AiLimits.MaxAudioSeconds / 60)} minutos. Grave de novo, mais curto.");

        var courseName = (await _courses.GetByIdAsync(room.CourseId, cancellationToken))?.Name;
        var evaluation = await _evaluation.EvaluateAsync(
            new ContentEvaluationRequest(reference, spoken.Text, prompt, CourseName: courseName, Debrief: true, VocabularyText: vocabulary),
            cancellationToken);
        var improvement = evaluation.ImprovementPoints ?? evaluation.Feedback;

        var now = DateTime.UtcNow;
        if (taskId is { } doneId)
            progress.RecordVoice(room, doneId, evaluation.Score, spoken.Text, evaluation.CorrectedTranscript, improvement, now);
        else
            progress.RecordFinal(room, evaluation.Score, spoken.Text, evaluation.CorrectedTranscript, improvement, now);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return context.ToState(progress);
    }
}

/// <summary>
/// Zip do ambiente da sala (compose.yml, Dockerfiles, iniciar.sh), lido de secret/conteudo/&lt;curso&gt;/salas/&lt;slug&gt;/ambiente/
/// na hora do pedido. Só pra matriculado; sala trancada também baixa (o aluno pode se preparar antes).
/// </summary>
public class GetRoomEnvironmentUseCase
{
    private readonly RoomAccess _access;

    public GetRoomEnvironmentUseCase(RoomAccess access) => _access = access;

    public async Task<(string FileName, byte[] Content)> ExecuteAsync(Guid userId, Guid roomId, CancellationToken cancellationToken = default)
    {
        var room = (await _access.LoadAsync(userId, roomId, cancellationToken)).Room;
        var folder = RoomContentPaths.EnvironmentDirectory(room.ContentFolder, room.Slug)
            ?? throw new NotFoundException("ambiente_nao_encontrado", "O ambiente desta sala nao foi encontrado no servidor.");

        var root = RoomMapper.EnvironmentFolder(room);
        using var buffer = new MemoryStream();
        using (var zip = new ZipArchive(buffer, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var file in Directory.EnumerateFiles(folder, "*", SearchOption.AllDirectories).Order(StringComparer.Ordinal))
            {
                var relative = Path.GetRelativePath(folder, file).Replace('\\', '/');
                if (relative.Split('/').Any(part => part.StartsWith('.'))) continue;
                var entry = zip.CreateEntryFromFile(file, $"{root}/{relative}", CompressionLevel.Optimal);
                if (relative.EndsWith(".sh", StringComparison.Ordinal))
                    entry.ExternalAttributes = Convert.ToInt32("100755", 8) << 16;
            }

            // Windows: o iniciar.sh nao roda no PowerShell; a sala leva o iniciar.ps1 padrao quando nao traz um proprio.
            if (!File.Exists(Path.Combine(folder, WindowsStartScript.FileName)))
            {
                var entry = zip.CreateEntry($"{root}/{WindowsStartScript.FileName}", CompressionLevel.Optimal);
                using var stream = entry.Open();
                stream.Write(WindowsStartScript.Bytes());
            }
        }
        return ($"{root}.zip", buffer.ToArray());
    }
}

public static class RoomContentPaths
{
    /// <summary>secret/conteudo/&lt;curso&gt;/salas (nulo se a raiz de conteúdo não existe).</summary>
    public static string? RoomsDirectory(string courseFolder) =>
        CuratedContentLocator.SecretRoot() is { } secret ? Path.Combine(secret, "conteudo", courseFolder, "salas") : null;

    public static string? EnvironmentDirectory(string courseFolder, string slug) =>
        RoomsDirectory(courseFolder) is { } rooms && Directory.Exists(Path.Combine(rooms, slug, "ambiente"))
            ? Path.Combine(rooms, slug, "ambiente")
            : null;
}
