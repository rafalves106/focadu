using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

/// <summary>
/// Weekly (instancia, Fase 13) e o aggregate "operacional": carregado sempre com o grafo completo
/// TEMPLATE+INSTANCIA - Dailies (cada uma com seu DailyTemplate.Activities.QuizOptions/
/// RoleplayNodes/Options e Responses), WeeklyTemplate (CuratedContents), WeeklyProject,
/// WeeklyReinforcements, ModulePublication - porque as regras de negocio em Weekly.cs precisam
/// enxergar tudo isso ao mesmo tempo. AsSplitQuery() (novo nesta fase): a fusao dos dois grafos
/// (curriculo + progresso) fica grande demais pra um unico JOIN sem risco de explosao cartesiana.
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
            .Include(w => w.Template).ThenInclude(t => t.CuratedContents)
            .Include(w => w.Dailies).ThenInclude(d => d.Template).ThenInclude(t => t.Activities).ThenInclude(a => a.QuizOptions)
            .Include(w => w.Dailies).ThenInclude(d => d.Template).ThenInclude(t => t.Activities).ThenInclude(a => a.RoleplayNodes).ThenInclude(n => n.Options)
            .Include(w => w.Dailies).ThenInclude(d => d.Responses)
            .Include(w => w.Project)
            .Include(w => w.Reinforcements)
            .Include(w => w.Publication)
            .AsSplitQuery();

    /// <summary>Sem navegacao de Weekly pra Enrollment (referencia fraca, ver WeeklyConfiguration) - o dono e checado via subquery em Enrollments.</summary>
    private IQueryable<Weekly> OwnedBy(Guid userId) =>
        FullGraph().Where(w => _context.Enrollments.Any(e => e.Id == w.EnrollmentId && e.UserId == userId));

    public async Task<Weekly?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default) =>
        await OwnedBy(userId).FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

    public async Task<Weekly?> GetByDailyIdAsync(Guid dailyId, Guid userId, CancellationToken cancellationToken = default) =>
        await OwnedBy(userId).FirstOrDefaultAsync(w => w.Dailies.Any(d => d.Id == dailyId), cancellationToken);

    public async Task<IReadOnlyCollection<Weekly>> GetByEnrollmentIdAsync(Guid enrollmentId, CancellationToken cancellationToken = default) =>
        await FullGraph().Where(w => w.EnrollmentId == enrollmentId).ToListAsync(cancellationToken);

    public async Task<Weekly?> GetByEnrollmentAndDateAsync(Guid enrollmentId, DateOnly date, CancellationToken cancellationToken = default) =>
        await FullGraph()
            .Where(w => w.EnrollmentId == enrollmentId && w.Dailies.Any(d => d.Date == date))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task AddAsync(Weekly weekly, CancellationToken cancellationToken = default) =>
        await _context.Weeklies.AddAsync(weekly, cancellationToken);
}
