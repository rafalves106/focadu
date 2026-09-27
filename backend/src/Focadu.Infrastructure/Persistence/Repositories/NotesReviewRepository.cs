using Focadu.Domain.Notes;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class NotesReviewRepository : INotesReviewRepository
{
    private readonly FocaduDbContext _context;

    public NotesReviewRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyCollection<NotesReview>> ListByUserAndDailyIdsAsync(Guid userId, IReadOnlyCollection<Guid> dailyIds, CancellationToken cancellationToken = default) =>
        dailyIds.Count == 0
            ? []
            : await _context.NotesReviews.Where(r => r.UserId == userId && dailyIds.Contains(r.DailyId)).ToListAsync(cancellationToken);

    public async Task<int> CountByUserSinceAsync(Guid userId, DateTime sinceUtc, CancellationToken cancellationToken = default) =>
        await _context.NotesReviews.CountAsync(r => r.UserId == userId && r.CreatedAt >= sinceUtc, cancellationToken);

    public async Task AddAsync(NotesReview review, CancellationToken cancellationToken = default) =>
        await _context.NotesReviews.AddAsync(review, cancellationToken);
}
