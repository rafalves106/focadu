using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

/// <summary>
/// Weekly e o aggregate "operacional": carregado sempre com o grafo completo (Dailies,
/// DailyActivities, ActivityResponses, QuizOptions, RoleplayNodes/Options, CuratedContents,
/// WeeklyProject, WeeklyReinforcements), porque as regras de negocio em Weekly.cs precisam
/// enxergar todas as Dailies da semana ao mesmo tempo.
/// </summary>
public class WeeklyRepository : IWeeklyRepository
{
    private readonly FocaduDbContext _context;

    public WeeklyRepository(FocaduDbContext context)
    {
        _context = context;
    }

    private IQueryable<Weekly> FullGraph() =>
        _context.Weeklies
            .Include(w => w.Dailies).ThenInclude(d => d.Activities).ThenInclude(a => a.Responses)
            .Include(w => w.Dailies).ThenInclude(d => d.Activities).ThenInclude(a => a.QuizOptions)
            .Include(w => w.Dailies).ThenInclude(d => d.Activities).ThenInclude(a => a.RoleplayNodes).ThenInclude(n => n.Options)
            .Include(w => w.CuratedContents)
            .Include(w => w.Project)
            .Include(w => w.Reinforcements);

    public async Task<Weekly?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await FullGraph().FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

    public async Task<Weekly?> GetByDailyIdAsync(Guid dailyId, CancellationToken cancellationToken = default) =>
        await FullGraph().FirstOrDefaultAsync(w => w.Dailies.Any(d => d.Id == dailyId), cancellationToken);

    public async Task<IReadOnlyCollection<Weekly>> GetByMonthlyIdAsync(Guid monthlyId, CancellationToken cancellationToken = default) =>
        await FullGraph().Where(w => w.MonthlyId == monthlyId).ToListAsync(cancellationToken);

    public async Task<Weekly?> GetByDateAsync(Guid courseId, DateOnly date, CancellationToken cancellationToken = default)
    {
        var monthlyIds = _context.Monthlies
            .Where(m => m.CourseId == courseId)
            .Select(m => m.Id);

        return await FullGraph()
            .Where(w => monthlyIds.Contains(w.MonthlyId) && w.Dailies.Any(d => d.Date == date))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task AddAsync(Weekly weekly, CancellationToken cancellationToken = default) =>
        await _context.Weeklies.AddAsync(weekly, cancellationToken);
}
