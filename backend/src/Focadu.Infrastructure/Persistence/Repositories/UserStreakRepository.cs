using Focadu.Domain.Gamification;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class UserStreakRepository : IUserStreakRepository
{
    private readonly FocaduDbContext _context;

    public UserStreakRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<UserStreak?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _context.UserStreaks.FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

    public async Task AddAsync(UserStreak streak, CancellationToken cancellationToken = default) =>
        await _context.UserStreaks.AddAsync(streak, cancellationToken);
}
