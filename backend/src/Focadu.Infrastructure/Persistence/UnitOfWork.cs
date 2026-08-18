using Focadu.Domain.Repositories;

namespace Focadu.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly FocaduDbContext _context;

    public UnitOfWork(FocaduDbContext context)
    {
        _context = context;
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _context.SaveChangesAsync(cancellationToken);
}
