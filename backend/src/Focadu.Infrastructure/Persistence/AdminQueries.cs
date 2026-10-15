using Focadu.Application.Ports;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence;

/// <summary>Leituras do Painel de gestao (Fase 94) - so AsNoTracking, nada aqui grava.</summary>
public class AdminQueries : IAdminQueries
{
    private readonly FocaduDbContext _context;

    public AdminQueries(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<AdminUserRow>> ListUsersAsync(CancellationToken cancellationToken = default) =>
        await _context.Users.AsNoTracking()
            .OrderBy(u => u.CreatedAt)
            .Select(u => new AdminUserRow(u.Id, u.DisplayName, u.Email, u.CreatedAt, u.EmailVerifiedAt, u.Role == Domain.Enums.UserRole.Admin, u.CohortId, u.DisabledAt))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<AdminEnrollmentRow>> ListEnrollmentsAsync(Guid? userId, CancellationToken cancellationToken = default)
    {
        var enrollments = await (
            from e in _context.Enrollments.AsNoTracking()
            join c in _context.Courses on e.CourseId equals c.Id
            where userId == null || e.UserId == userId
            select new { e.Id, e.UserId, e.CourseId, c.Name, e.EnrolledAt }).ToListAsync(cancellationToken);

        var ids = enrollments.Select(e => e.Id).ToList();
        var days = await (
            from d in _context.Dailies.AsNoTracking()
            join w in _context.Weeklies on d.WeeklyId equals w.Id
            where ids.Contains(w.EnrollmentId) && !d.IsReinforcement
            group d by w.EnrollmentId into g
            select new
            {
                EnrollmentId = g.Key,
                Total = g.Count(),
                Completed = g.Count(d => d.CompletedAt != null),
                LastCompletedDay = g.Where(d => d.CompletedAt != null).Max(d => (int?)d.DayNumber),
                LastCompletedAt = g.Max(d => d.CompletedAt),
            }).ToDictionaryAsync(x => x.EnrollmentId, cancellationToken);

        var cells = (await (
            from d in _context.Dailies.AsNoTracking()
            join w in _context.Weeklies on d.WeeklyId equals w.Id
            join wt in _context.WeeklyTemplates on w.WeeklyTemplateId equals wt.Id
            where ids.Contains(w.EnrollmentId) && !d.IsReinforcement
            select new { w.EnrollmentId, Week = wt.Number, d.DayNumber, Completed = d.CompletedAt != null }).ToListAsync(cancellationToken))
            .ToLookup(c => c.EnrollmentId);

        var lastAnswer = await (
            from r in _context.ActivityResponses.AsNoTracking()
            join d in _context.Dailies on EF.Property<Guid>(r, "DailyId") equals d.Id
            join w in _context.Weeklies on d.WeeklyId equals w.Id
            where ids.Contains(w.EnrollmentId)
            group r by w.EnrollmentId into g
            select new { EnrollmentId = g.Key, At = g.Max(r => r.CreatedAt) }).ToDictionaryAsync(x => x.EnrollmentId, x => x.At, cancellationToken);

        return enrollments.Select(e =>
        {
            days.TryGetValue(e.Id, out var progress);
            DateTime? answeredAt = lastAnswer.TryGetValue(e.Id, out var at) ? at : null;
            var last = new[] { answeredAt, progress?.LastCompletedAt }.Where(x => x is not null).DefaultIfEmpty(null).Max();
            return new AdminEnrollmentRow(
                e.Id, e.UserId, e.CourseId, e.Name, e.EnrolledAt,
                progress?.Total ?? 0, progress?.Completed ?? 0, progress?.LastCompletedDay, last,
                cells[e.Id].OrderBy(c => c.DayNumber).Select(c => new AdminDayCell(c.Week, c.DayNumber, c.Completed)).ToList());
        }).ToList();
    }

    public async Task<IReadOnlyList<DateTime>> ListCompletionsSinceAsync(DateTime fromUtc, CancellationToken cancellationToken = default) =>
        await _context.Dailies.AsNoTracking()
            .Where(d => !d.IsReinforcement && d.CompletedAt != null && d.CompletedAt >= fromUtc)
            .Select(d => d.CompletedAt!.Value)
            .ToListAsync(cancellationToken);

    public async Task<int> CountActiveUsersSinceAsync(DateTime fromUtc, CancellationToken cancellationToken = default)
    {
        var answered =
            from r in _context.ActivityResponses.AsNoTracking()
            join d in _context.Dailies on EF.Property<Guid>(r, "DailyId") equals d.Id
            join w in _context.Weeklies on d.WeeklyId equals w.Id
            join e in _context.Enrollments on w.EnrollmentId equals e.Id
            where r.CreatedAt >= fromUtc
            select e.UserId;
        var completed =
            from d in _context.Dailies.AsNoTracking()
            join w in _context.Weeklies on d.WeeklyId equals w.Id
            join e in _context.Enrollments on w.EnrollmentId equals e.Id
            where d.CompletedAt >= fromUtc
            select e.UserId;
        return await answered.Union(completed).Distinct().CountAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AdminCourseRow>> ListCoursesAsync(CancellationToken cancellationToken = default) =>
        (await _context.Courses.AsNoTracking().OrderBy(c => c.Name).Select(c => new { c.Id, c.Name, c.Status, c.OnlyForCohorts }).ToListAsync(cancellationToken))
            .Select(c => new AdminCourseRow(c.Id, c.Name, c.Status.ToString(), c.OnlyForCohorts)).ToList();

    public async Task<IReadOnlyList<AdminCourseDayRow>> ListCourseDaysAsync(Guid courseId, CancellationToken cancellationToken = default)
    {
        var templates = await (
            from t in _context.DailyTemplates.AsNoTracking()
            join w in _context.WeeklyTemplates on t.WeeklyTemplateId equals w.Id
            join m in _context.Monthlies on w.MonthlyId equals m.Id
            where m.CourseId == courseId
            select new { t.Id, t.DayNumber, t.ContentHash, t.Language }).ToListAsync(cancellationToken);
        var templateIds = templates.Select(t => t.Id).ToList();

        var responses = await (
            from r in _context.ActivityResponses.AsNoTracking()
            join d in _context.Dailies on EF.Property<Guid>(r, "DailyId") equals d.Id
            where templateIds.Contains(d.DailyTemplateId)
            group r by d.DailyTemplateId into g
            select new { TemplateId = g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.TemplateId, x => x.Count, cancellationToken);

        var students = await (
            from d in _context.Dailies.AsNoTracking()
            join w in _context.Weeklies on d.WeeklyId equals w.Id
            join e in _context.Enrollments on w.EnrollmentId equals e.Id
            where templateIds.Contains(d.DailyTemplateId)
                && (d.CompletedAt != null || _context.ActivityResponses.Any(r => EF.Property<Guid>(r, "DailyId") == d.Id))
            select new { d.DailyTemplateId, e.UserId }).Distinct().ToListAsync(cancellationToken);

        return templates.GroupBy(t => t.DayNumber).OrderBy(g => g.Key).Select(g =>
        {
            var ids = g.Select(t => t.Id).ToHashSet();
            var main = g.FirstOrDefault(t => t.Language is null) ?? g.First();
            return new AdminCourseDayRow(
                g.Key, main.ContentHash, ids.Sum(id => responses.GetValueOrDefault(id)),
                students.Where(s => ids.Contains(s.DailyTemplateId)).Select(s => s.UserId).Distinct().Count());
        }).ToList();
    }

    public async Task<IReadOnlyList<AdminCompletionFact>> ListCompletionFactsAsync(CancellationToken cancellationToken = default) =>
        await (
            from d in _context.Dailies.AsNoTracking()
            join w in _context.Weeklies on d.WeeklyId equals w.Id
            join e in _context.Enrollments on w.EnrollmentId equals e.Id
            join wt in _context.WeeklyTemplates on w.WeeklyTemplateId equals wt.Id
            where !d.IsReinforcement && d.CompletedAt != null
            select new AdminCompletionFact(e.UserId, e.CourseId, wt.Number, d.CompletedAt!.Value)).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<AdminCourseWeek>> ListProjectWeeksAsync(CancellationToken cancellationToken = default) =>
        await (
            from wt in _context.WeeklyTemplates.AsNoTracking()
            join m in _context.Monthlies on wt.MonthlyId equals m.Id
            where wt.WeeklyProjectSpecText != null
            select new AdminCourseWeek(m.CourseId, wt.Number)).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<AdminProjectFact>> ListDeliveredProjectsAsync(CancellationToken cancellationToken = default) =>
        await (
            from p in _context.WeeklyProjects.AsNoTracking()
            join w in _context.Weeklies on p.WeeklyId equals w.Id
            join e in _context.Enrollments on w.EnrollmentId equals e.Id
            join wt in _context.WeeklyTemplates on w.WeeklyTemplateId equals wt.Id
            where p.Status != Domain.Enums.WeeklyProjectStatus.Pending
            select new AdminProjectFact(e.UserId, e.CourseId, wt.Number)).ToListAsync(cancellationToken);
}
