using Focadu.Domain.Repositories;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class UserRepository : IUserRepository
{
    private readonly FocaduDbContext _context;

    public UserRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        await _context.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

    public async Task<User?> GetByReferralCodeAsync(string referralCode, CancellationToken cancellationToken = default) =>
        await _context.Users.FirstOrDefaultAsync(u => u.ReferralCode == referralCode, cancellationToken);

    public async Task<bool> IsAmongFirstRegisteredAsync(Guid userId, int count, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null) return false;

        // Ordem total deterministica (CreatedAt, Id) - evita ambiguidade se 2 usuarios
        // registrarem no mesmo instante (CreatedAt igual).
        var rank = await _context.Users
            .Where(u => u.CreatedAt < user.CreatedAt || (u.CreatedAt == user.CreatedAt && u.Id <= user.Id))
            .CountAsync(cancellationToken);

        return rank <= count;
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken = default) =>
        await _context.Users.AddAsync(user, cancellationToken);
}
