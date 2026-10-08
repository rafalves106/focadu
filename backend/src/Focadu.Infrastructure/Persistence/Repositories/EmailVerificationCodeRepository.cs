using Focadu.Domain.Repositories;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class EmailVerificationCodeRepository : IEmailVerificationCodeRepository
{
    private readonly FocaduDbContext _context;

    public EmailVerificationCodeRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<EmailVerificationCode?> GetLatestAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _context.EmailVerificationCodes.Where(c => c.UserId == userId).OrderByDescending(c => c.CreatedAt).FirstOrDefaultAsync(cancellationToken);

    public async Task AddAsync(EmailVerificationCode code, CancellationToken cancellationToken = default) =>
        await _context.EmailVerificationCodes.AddAsync(code, cancellationToken);
}
