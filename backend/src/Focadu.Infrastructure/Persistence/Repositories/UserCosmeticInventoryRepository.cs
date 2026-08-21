using Focadu.Domain.Cosmetics;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class UserCosmeticInventoryRepository : IUserCosmeticInventoryRepository
{
    private readonly FocaduDbContext _context;

    public UserCosmeticInventoryRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyCollection<UserCosmeticInventory>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _context.UserCosmeticInventories.Where(e => e.UserId == userId).ToListAsync(cancellationToken);

    public async Task<UserCosmeticInventory?> GetByUserAndItemAsync(Guid userId, Guid cosmeticItemId, CancellationToken cancellationToken = default) =>
        await _context.UserCosmeticInventories
            .FirstOrDefaultAsync(e => e.UserId == userId && e.CosmeticItemId == cosmeticItemId, cancellationToken);

    public async Task AddAsync(UserCosmeticInventory entry, CancellationToken cancellationToken = default) =>
        await _context.UserCosmeticInventories.AddAsync(entry, cancellationToken);
}
