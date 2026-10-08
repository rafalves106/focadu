using Focadu.Domain.Repositories;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class SignupInviteRepository : ISignupInviteRepository
{
    private readonly FocaduDbContext _context;

    public SignupInviteRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<SignupInvite?> GetByCodeAsync(string code, CancellationToken cancellationToken = default) =>
        await _context.SignupInvites.FirstOrDefaultAsync(i => i.Code == code, cancellationToken);

    public async Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken = default) =>
        await _context.SignupInvites.AnyAsync(i => i.Code == code, cancellationToken);

    public async Task<IReadOnlyList<SignupInvite>> ListAsync(CancellationToken cancellationToken = default) =>
        await _context.SignupInvites.OrderByDescending(i => i.CreatedAt).ToListAsync(cancellationToken);

    public async Task AddAsync(SignupInvite invite, CancellationToken cancellationToken = default) =>
        await _context.SignupInvites.AddAsync(invite, cancellationToken);
}
