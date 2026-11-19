using Focadu.Domain.Courses;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;
using Focadu.Domain.Rooms;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Dailies;

/// <summary>
/// Fase 111: monta o <see cref="StudyContext"/> que <see cref="Weekly.EvaluateDailyAccess"/> recebe. Curso
/// <see cref="StudyFormat.Daily"/> devolve <see cref="StudyContext.Daily"/> sem ler sala nenhuma; curso em
/// <see cref="StudyFormat.Sessions"/> le as salas do curso e o progresso do aluno pra saber se a sala da sessao
/// anterior esta pendente.
/// </summary>
public class StudyContextResolver
{
    private readonly ICourseRepository _courses;
    private readonly IEnrollmentRepository _enrollments;
    private readonly IRoomRepository _rooms;
    private readonly IRoomProgressRepository _progresses;

    public StudyContextResolver(
        ICourseRepository courses, IEnrollmentRepository enrollments, IRoomRepository rooms, IRoomProgressRepository progresses)
    {
        _courses = courses;
        _enrollments = enrollments;
        _rooms = rooms;
        _progresses = progresses;
    }

    /// <summary>Fase 115: o curso desta matricula e em sessoes (o reforco abre so no dia seguinte).</summary>
    public async Task<bool> IsSessionsCourseAsync(Guid courseId, CancellationToken cancellationToken) =>
        (await _courses.GetByIdAsync(courseId, cancellationToken))?.StudyFormat == StudyFormat.Sessions;

    /// <summary>Fase 115: idem, pela matricula de uma Weekly (<see cref="Weekly.EnrollmentId"/>).</summary>
    public async Task<bool> IsSessionsEnrollmentAsync(Guid userId, Guid enrollmentId, CancellationToken cancellationToken)
    {
        var enrollment = (await _enrollments.GetByUserIdAsync(userId, cancellationToken)).FirstOrDefault(e => e.Id == enrollmentId);
        return enrollment is not null && await IsSessionsCourseAsync(enrollment.CourseId, cancellationToken);
    }

    public async Task<StudyContext> ResolveAsync(
        Guid userId, IReadOnlyCollection<Weekly> enrollmentWeeklies, Daily target, CancellationToken cancellationToken)
    {
        var enrollmentId = enrollmentWeeklies.First(w => w.Dailies.Any(d => d.Id == target.Id)).EnrollmentId;
        var enrollment = (await _enrollments.GetByUserIdAsync(userId, cancellationToken)).FirstOrDefault(e => e.Id == enrollmentId);
        var course = enrollment is null ? null : await _courses.GetByIdAsync(enrollment.CourseId, cancellationToken);
        if (course is null || course.StudyFormat != StudyFormat.Sessions)
            return StudyContext.Daily;

        var rooms = await _rooms.ListByCourseAsync(course.Id, cancellationToken);
        var progresses = rooms.Count == 0
            ? []
            : await _progresses.ListByUserAsync(userId, rooms.Select(r => r.Id).ToList(), cancellationToken);
        return StudyContext.ForSessions(course.SessionsPerDay, SessionStudy.FindPendingSessionRoom(enrollmentWeeklies, target, rooms, progresses));
    }
}

internal static class SessionStudy
{
    /// <summary>
    /// A sala da sessao anterior a <paramref name="target"/> que o aluno ainda nao concluiu. Sessao anterior = a Daily
    /// nao-reforco de maior DayNumber antes da alvo, em toda a matricula. Sem <c>SessionRoomSlug</c> nela, ou com a sala
    /// ainda nao importada (importar-salas), nao ha trava: o aluno nunca fica preso por sala que nao existe. So vale pra
    /// Daily nao-reforco ainda nao iniciada (retomar ou repetir nunca trava).
    /// </summary>
    internal static PendingSessionRoom? FindPendingSessionRoom(
        IEnumerable<Weekly> enrollmentWeeklies, Daily target, IReadOnlyList<Room> courseRooms, IReadOnlyList<RoomProgress> progresses)
    {
        if (target.IsReinforcement || target.Status is DailyStatus.InProgress or DailyStatus.Completed)
            return null;

        var previous = enrollmentWeeklies
            .SelectMany(w => w.Dailies)
            .Where(d => !d.IsReinforcement && d.DayNumber < target.DayNumber)
            .MaxBy(d => d.DayNumber);
        if (previous?.Template.SessionRoomSlug is not { } slug)
            return null;

        var room = courseRooms.FirstOrDefault(r => r.Slug == slug);
        if (room is null || progresses.FirstOrDefault(p => p.RoomId == room.Id)?.Completed == true)
            return null;
        return new PendingSessionRoom(room.Id, room.Slug, room.Title, room.EstimatedMinutes, room.MachineLabel);
    }

    /// <summary>Contagem da tela ("sessao 2 de 3 hoje"). Nulo em curso Daily.</summary>
    internal static SessionInfoDto? ToInfo(StudyContext study, IEnumerable<Weekly> enrollmentWeeklies, DateOnly today) =>
        study.Format != StudyFormat.Sessions
            ? null
            : new SessionInfoDto(
                SessionRules.CompletedToday(enrollmentWeeklies.SelectMany(w => w.Dailies), today),
                study.SessionsPerDay,
                study.PendingRoom is { } room ? new SessionRoomDto(room.RoomId, room.Slug, room.Title, room.EstimatedMinutes, room.MachineLabel) : null);
}
