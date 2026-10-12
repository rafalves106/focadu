using Focadu.Application.Ports;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence;

/// <summary>
/// Operacoes destrutivas do Painel de gestao (Fase 94), por <c>ExecuteDelete</c> numa transacao so (mesmo jeito do
/// UserResetService). A ordem importa: Dailies tem FK Restrict pro DailyTemplate, e Weeklies pro WeeklyTemplate, entao
/// a instancia do aluno sai antes do curriculo. A medicao de IA (AiUsageRecords) nunca e apagada.
/// </summary>
public class AdminMaintenance : IAdminMaintenance
{
    private readonly FocaduDbContext _context;

    public AdminMaintenance(FocaduDbContext context)
    {
        _context = context;
    }

    // --- Resetar o progresso de um aluno num curso -------------------------------------------------------------

    public async Task<IReadOnlyList<KeyValuePair<string, int>>> PlanCourseResetAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        var counts = new List<KeyValuePair<string, int>>();
        foreach (var (name, query, _) in CourseResetSteps(userId, courseId))
            counts.Add(new(name, await query.CountAsync(cancellationToken)));
        return counts;
    }

    public async Task<IReadOnlyList<KeyValuePair<string, int>>> ResetCourseAsync(
        Guid userId, Guid courseId, Func<CancellationToken, Task> reEnroll, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        var counts = new List<KeyValuePair<string, int>>();
        foreach (var (name, _, delete) in CourseResetSteps(userId, courseId))
            counts.Add(new(name, await delete(cancellationToken)));

        _context.ChangeTracker.Clear();
        await reEnroll(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return counts;
    }

    private List<(string Name, IQueryable<object> Query, Func<CancellationToken, Task<int>> Delete)> CourseResetSteps(Guid userId, Guid courseId)
    {
        var enrollments = _context.Enrollments.Where(e => e.UserId == userId && e.CourseId == courseId);
        var weeklyIds = _context.Weeklies.Where(w => enrollments.Any(e => e.Id == w.EnrollmentId)).Select(w => w.Id);
        var dailyIds = _context.Dailies.Where(d => weeklyIds.Contains(d.WeeklyId)).Select(d => d.Id);
        var projectIds = _context.WeeklyProjects.Where(p => weeklyIds.Contains(p.WeeklyId)).Select(p => p.Id);

        var steps = new List<(string, IQueryable<object>, Func<CancellationToken, Task<int>>)>();
        void Add<T>(string name, IQueryable<T> query) where T : class =>
            steps.Add((name, query.Cast<object>(), ct => query.ExecuteDeleteAsync(ct)));

        Add("ActivityResponses", _context.ActivityResponses.Where(r => dailyIds.Contains(EF.Property<Guid>(r, "DailyId"))));
        Add("Notes", _context.Notes.Where(n => n.UserId == userId
            && ((n.DailyId != null && dailyIds.Contains(n.DailyId.Value)) || (n.WeeklyProjectId != null && projectIds.Contains(n.WeeklyProjectId.Value)))));
        Add("NotesReviews", _context.NotesReviews.Where(r => r.UserId == userId && dailyIds.Contains(r.DailyId)));
        // Leva junto semanas, dias (os que faltam), respostas, dicas, projetos e publicacoes (cascata).
        Add("Enrollments", enrollments);
        return steps;
    }

    // --- Apagar dias antigos de um curso -----------------------------------------------------------------------

    public Task<StaleDaysPlan> PlanStaleDaysAsync(Guid courseId, IReadOnlySet<int> curatedDays, CancellationToken cancellationToken = default) =>
        StaleDaysAsync(courseId, curatedDays, execute: false, cancellationToken);

    public async Task<StaleDaysPlan> DeleteStaleDaysAsync(Guid courseId, IReadOnlySet<int> curatedDays, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        var plan = await StaleDaysAsync(courseId, curatedDays, execute: true, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return plan;
    }

    private async Task<StaleDaysPlan> StaleDaysAsync(Guid courseId, IReadOnlySet<int> curatedDays, bool execute, CancellationToken cancellationToken)
    {
        var curated = curatedDays.ToList();
        var monthlyIds = _context.Monthlies.Where(m => m.CourseId == courseId).Select(m => m.Id);
        var weekTemplateIds = _context.WeeklyTemplates.Where(w => monthlyIds.Contains(w.MonthlyId)).Select(w => w.Id);
        var staleTemplates = _context.DailyTemplates.Where(t => t.WeeklyTemplateId != null && weekTemplateIds.Contains(t.WeeklyTemplateId.Value) && !curated.Contains(t.DayNumber));
        var staleTemplateIds = staleTemplates.Select(t => t.Id);
        var staleDailyIds = _context.Dailies.Where(d => staleTemplateIds.Contains(d.DailyTemplateId)).Select(d => d.Id);

        // Semana que fica sem nenhum dia depois de apagar (todas as semanas so com dias antigos) e mes sem semana.
        var emptyWeekTemplates = _context.WeeklyTemplates.Where(w => weekTemplateIds.Contains(w.Id)
            && !_context.DailyTemplates.Any(t => t.WeeklyTemplateId == w.Id && curated.Contains(t.DayNumber)));
        var emptyWeekTemplateIds = emptyWeekTemplates.Select(w => w.Id);
        var emptyWeeklies = _context.Weeklies.Where(w => emptyWeekTemplateIds.Contains(w.WeeklyTemplateId));
        var emptyWeeklyIds = emptyWeeklies.Select(w => w.Id);
        var emptyProjectIds = _context.WeeklyProjects.Where(p => emptyWeeklyIds.Contains(p.WeeklyId)).Select(p => p.Id);
        var emptyMonthlies = _context.Monthlies.Where(m => monthlyIds.Contains(m.Id)
            && !_context.WeeklyTemplates.Any(w => w.MonthlyId == m.Id && !emptyWeekTemplateIds.Contains(w.Id)));

        var days = await staleTemplates.Select(t => t.DayNumber).Distinct().OrderBy(n => n).ToListAsync(cancellationToken);
        var affectedUserIds = await (
            from d in _context.Dailies
            join w in _context.Weeklies on d.WeeklyId equals w.Id
            join e in _context.Enrollments on w.EnrollmentId equals e.Id
            where staleTemplateIds.Contains(d.DailyTemplateId)
                && (d.CompletedAt != null || _context.ActivityResponses.Any(r => EF.Property<Guid>(r, "DailyId") == d.Id))
            select e.UserId).Distinct().ToListAsync(cancellationToken);
        var affected = await _context.Users.AsNoTracking().Where(u => affectedUserIds.Contains(u.Id)).OrderBy(u => u.DisplayName)
            .Select(u => new AdminUserRow(u.Id, u.DisplayName, u.Email, u.CreatedAt, u.EmailVerifiedAt, u.Role == Domain.Enums.UserRole.Admin))
            .ToListAsync(cancellationToken);

        var steps = new List<(string Name, IQueryable<object> Query, Func<CancellationToken, Task<int>> Delete)>();
        void Add<T>(string name, IQueryable<T> query) where T : class =>
            steps.Add((name, query.Cast<object>(), ct => query.ExecuteDeleteAsync(ct)));

        Add("Notes", _context.Notes.Where(n => (n.DailyId != null && staleDailyIds.Contains(n.DailyId.Value))
            || (n.WeeklyProjectId != null && emptyProjectIds.Contains(n.WeeklyProjectId.Value))));
        Add("NotesReviews", _context.NotesReviews.Where(r => staleDailyIds.Contains(r.DailyId)));
        Add("DayFeedbacks", _context.DayFeedbacks.Where(f => staleTemplateIds.Contains(f.DailyTemplateId)));
        Add("ActivityResponses", _context.ActivityResponses.Where(r => staleDailyIds.Contains(EF.Property<Guid>(r, "DailyId"))));
        // Semanas inteiras de dias antigos saem com projeto, publicacao, reforcos e dias (cascata)...
        Add("Weeklies", emptyWeeklies);
        // ...e o resto dos dias antigos (semana que ainda tem dia curado) sai um por um.
        Add("Dailies", _context.Dailies.Where(d => staleTemplateIds.Contains(d.DailyTemplateId)));
        // RoleplayOption.NextNodeId e Restrict (aponta pra outro no da mesma arvore): sem tirar as opcoes antes, a
        // cascata DailyTemplate -> atividade -> nos esbarra nelas.
        var staleActivityIds = _context.DailyActivities.Where(a => staleTemplateIds.Contains(a.DailyTemplateId)).Select(a => a.Id);
        var staleNodeIds = _context.RoleplayNodes.Where(n => staleActivityIds.Contains(n.ActivityId)).Select(n => n.Id);
        Add("RoleplayOptions", _context.RoleplayOptions.Where(o => staleNodeIds.Contains(o.NodeId)));
        Add("DailyTemplates", staleTemplates);
        Add("WeeklyTemplates", emptyWeekTemplates);
        Add("Monthlies", emptyMonthlies);

        var counts = new List<KeyValuePair<string, int>>();
        foreach (var (name, query, delete) in steps)
            counts.Add(new(name, execute ? await delete(cancellationToken) : await query.CountAsync(cancellationToken)));

        return new StaleDaysPlan(days, affected, counts);
    }

    public async Task<T> InTransactionAsync<T>(Func<CancellationToken, Task<T>> work, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        var result = await work(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return result;
    }
}
