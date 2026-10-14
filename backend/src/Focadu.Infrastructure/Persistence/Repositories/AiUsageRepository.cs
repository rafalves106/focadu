using Focadu.Domain.AiUsage;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class AiUsageRepository : IAiUsageRepository
{
    private readonly FocaduDbContext _context;

    public AiUsageRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<AiUsageRecord>> ListRecordsAsync(DateTime fromUtc, DateTime toUtc, Guid? courseId, CancellationToken cancellationToken = default) =>
        await _context.AiUsageRecords.AsNoTracking()
            .Where(r => r.OccurredAt >= fromUtc && r.OccurredAt < toUtc && (courseId == null || r.CourseId == courseId))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<AiUsageRecord>> ListRecordsByUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _context.AiUsageRecords.AsNoTracking().Where(r => r.UserId == userId).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<AiUsageRecord>> ListRecordsByUserAsync(Guid userId, DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default) =>
        await _context.AiUsageRecords.AsNoTracking()
            .Where(r => r.UserId == userId && r.OccurredAt >= fromUtc && r.OccurredAt < toUtc)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<AiUsageRecord>> ListRecordsByCourseAsync(Guid courseId, CancellationToken cancellationToken = default) =>
        await _context.AiUsageRecords.AsNoTracking().Where(r => r.CourseId == courseId).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<AiModelPrice>> ListPricesAsync(CancellationToken cancellationToken = default) =>
        await _context.AiModelPrices.OrderBy(p => p.Model).ToListAsync(cancellationToken);

    public Task<AiModelPrice?> GetPriceAsync(string model, CancellationToken cancellationToken = default) =>
        _context.AiModelPrices.FirstOrDefaultAsync(p => p.Model == model, cancellationToken);

    public async Task AddPriceAsync(AiModelPrice price, CancellationToken cancellationToken = default) =>
        await _context.AiModelPrices.AddAsync(price, cancellationToken);

    public Task<AiUsageSettings?> GetSettingsAsync(CancellationToken cancellationToken = default) =>
        _context.AiUsageSettings.FirstOrDefaultAsync(s => s.Id == AiUsageSettings.SingletonId, cancellationToken);
}
