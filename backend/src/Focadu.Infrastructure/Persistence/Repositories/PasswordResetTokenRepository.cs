using Focadu.Domain.Repositories;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class PasswordResetTokenRepository : IPasswordResetTokenRepository
{
    private readonly FocaduDbContext _context;

    public PasswordResetTokenRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default) =>
        await _context.PasswordResetTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

    public async Task AddAsync(PasswordResetToken token, CancellationToken cancellationToken = default) =>
        await _context.PasswordResetTokens.AddAsync(token, cancellationToken);
}
