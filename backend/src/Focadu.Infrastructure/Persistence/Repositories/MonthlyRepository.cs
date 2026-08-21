using Focadu.Domain.Monthlies;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class MonthlyRepository : IMonthlyRepository
{
    private readonly FocaduDbContext _context;

    public MonthlyRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<Monthly?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Monthlies
            .Include(m => m.WeeklyTemplates)
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

    public async Task<IReadOnlyCollection<Monthly>> GetByCourseIdAsync(Guid courseId, CancellationToken cancellationToken = default) =>
        await _context.Monthlies.Where(m => m.CourseId == courseId).ToListAsync(cancellationToken);

    public async Task AddAsync(Monthly monthly, CancellationToken cancellationToken = default) =>
        await _context.Monthlies.AddAsync(monthly, cancellationToken);
}
