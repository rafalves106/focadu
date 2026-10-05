using Focadu.Domain.Content;
using Focadu.Domain.Enums;
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
            a => a.ContentId == contentId && _context.DailyTemplates.Any(t => t.Id == a.DailyTemplateId
                && (t.Language != null || _context.DailyActivities.Any(s => s.DailyTemplateId == t.Id && s.Type == ActivityType.CodeStep))),
            cancellationToken);

    public async Task<string?> GetCourseNameAsync(Guid weeklyTemplateId, CancellationToken cancellationToken = default) =>
        await (from w in _context.WeeklyTemplates
               where w.Id == weeklyTemplateId
               join m in _context.Monthlies on w.MonthlyId equals m.Id
               join c in _context.Courses on m.CourseId equals c.Id
               select c.Name).FirstOrDefaultAsync(cancellationToken);

    public async Task<string?> GetCourseNameForContentAsync(Guid contentId, CancellationToken cancellationToken = default) =>
        await (from cc in _context.CuratedContents
               where cc.Id == contentId
               join w in _context.WeeklyTemplates on cc.WeeklyTemplateId equals w.Id
               join m in _context.Monthlies on w.MonthlyId equals m.Id
               join c in _context.Courses on m.CourseId equals c.Id
               select c.Name).FirstOrDefaultAsync(cancellationToken);

    public async Task<CourseStatus?> GetCourseStatusAsync(Guid weeklyTemplateId, CancellationToken cancellationToken = default) =>
        await (from w in _context.WeeklyTemplates
               where w.Id == weeklyTemplateId
               join m in _context.Monthlies on w.MonthlyId equals m.Id
               join c in _context.Courses on m.CourseId equals c.Id
               select (CourseStatus?)c.Status).FirstOrDefaultAsync(cancellationToken);

    public async Task<CourseStatus?> GetCourseStatusForContentAsync(Guid contentId, CancellationToken cancellationToken = default) =>
        await (from cc in _context.CuratedContents
               where cc.Id == contentId
               join w in _context.WeeklyTemplates on cc.WeeklyTemplateId equals w.Id
               join m in _context.Monthlies on w.MonthlyId equals m.Id
               join c in _context.Courses on m.CourseId equals c.Id
               select (CourseStatus?)c.Status).FirstOrDefaultAsync(cancellationToken);
}
