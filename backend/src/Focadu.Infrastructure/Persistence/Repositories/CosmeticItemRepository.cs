using Focadu.Domain.Cosmetics;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class CosmeticItemRepository : ICosmeticItemRepository
{
    private readonly FocaduDbContext _context;

    public CosmeticItemRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyCollection<CosmeticItem>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _context.CosmeticItems.ToListAsync(cancellationToken);

    public async Task<CosmeticItem?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.CosmeticItems.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

    public async Task AddAsync(CosmeticItem item, CancellationToken cancellationToken = default) =>
        await _context.CosmeticItems.AddAsync(item, cancellationToken);
}
