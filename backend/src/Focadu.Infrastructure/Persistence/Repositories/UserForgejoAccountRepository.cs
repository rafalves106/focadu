using Focadu.Domain.GitHosting;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class UserForgejoAccountRepository : IUserForgejoAccountRepository
{
    private readonly FocaduDbContext _context;

    public UserForgejoAccountRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<UserForgejoAccount?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _context.UserForgejoAccounts.FirstOrDefaultAsync(a => a.UserId == userId, cancellationToken);

    public async Task AddAsync(UserForgejoAccount account, CancellationToken cancellationToken = default) =>
        await _context.UserForgejoAccounts.AddAsync(account, cancellationToken);
}
