using Focadu.Domain.Gamification;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class UserGemBalanceRepository : IUserGemBalanceRepository
{
    private readonly FocaduDbContext _context;

    public UserGemBalanceRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<UserGemBalance?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _context.UserGemBalances.FirstOrDefaultAsync(b => b.UserId == userId, cancellationToken);

    public async Task AddAsync(UserGemBalance balance, CancellationToken cancellationToken = default) =>
        await _context.UserGemBalances.AddAsync(balance, cancellationToken);
}
