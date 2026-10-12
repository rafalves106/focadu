using Focadu.Domain.Repositories;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class CohortRepository : ICohortRepository
{
    private readonly FocaduDbContext _context;

    public CohortRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<Cohort?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Cohorts.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Cohort>> ListAsync(CancellationToken cancellationToken = default) =>
        await _context.Cohorts.OrderByDescending(c => c.CreatedAt).ToListAsync(cancellationToken);

    public async Task AddAsync(Cohort cohort, CancellationToken cancellationToken = default) =>
        await _context.Cohorts.AddAsync(cohort, cancellationToken);
}
