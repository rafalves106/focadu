using Focadu.Domain.Cosmetics;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class UserEquippedCosmeticsRepository : IUserEquippedCosmeticsRepository
{
    private readonly FocaduDbContext _context;

    public UserEquippedCosmeticsRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<UserEquippedCosmetics?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _context.UserEquippedCosmetics.FirstOrDefaultAsync(e => e.UserId == userId, cancellationToken);

    public async Task AddAsync(UserEquippedCosmetics equipped, CancellationToken cancellationToken = default) =>
        await _context.UserEquippedCosmetics.AddAsync(equipped, cancellationToken);
}
