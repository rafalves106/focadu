using Focadu.Domain.Referrals;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class ReferralRepository : IReferralRepository
{
    private readonly FocaduDbContext _context;

    public ReferralRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<Referral?> GetByReferredUserIdAsync(Guid referredUserId, CancellationToken cancellationToken = default) =>
        await _context.Referrals.FirstOrDefaultAsync(r => r.ReferredUserId == referredUserId, cancellationToken);

    public async Task<IReadOnlyCollection<Referral>> GetByReferrerUserIdAsync(Guid referrerUserId, CancellationToken cancellationToken = default) =>
        await _context.Referrals.Where(r => r.ReferrerUserId == referrerUserId).ToListAsync(cancellationToken);

    public async Task AddAsync(Referral referral, CancellationToken cancellationToken = default) =>
        await _context.Referrals.AddAsync(referral, cancellationToken);
}
