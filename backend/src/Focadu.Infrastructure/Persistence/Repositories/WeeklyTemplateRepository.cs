using Focadu.Domain.Content;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class WeeklyTemplateRepository : IWeeklyTemplateRepository
{
    private readonly FocaduDbContext _context;

    public WeeklyTemplateRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<WeeklyTemplate?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.WeeklyTemplates
            .Include(w => w.DailyTemplates).ThenInclude(d => d.Activities).ThenInclude(a => a.QuizOptions)
            .Include(w => w.DailyTemplates).ThenInclude(d => d.Activities).ThenInclude(a => a.WordMatchPairs)
            .Include(w => w.DailyTemplates).ThenInclude(d => d.Activities).ThenInclude(a => a.RoleplayNodes).ThenInclude(n => n.Options)
            .Include(w => w.CuratedContents)
            .AsSplitQuery()
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

    public async Task<CuratedContent?> GetCuratedContentByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.CuratedContents.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<bool> IsBridgeContentAsync(Guid contentId, CancellationToken cancellationToken = default) =>
        await _context.DailyActivities.AnyAsync(
            a => a.ContentId == contentId && _context.DailyTemplates.Any(t => t.Id == a.DailyTemplateId && t.Language != null),
            cancellationToken);
}
