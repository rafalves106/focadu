using Focadu.Domain.Dailies;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class DayFeedbackRepository : IDayFeedbackRepository
{
    private readonly FocaduDbContext _context;

    public DayFeedbackRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<DayFeedback?> GetByUserAndDailyAsync(Guid userId, Guid dailyId, CancellationToken cancellationToken = default) =>
        await _context.DayFeedbacks.FirstOrDefaultAsync(f => f.UserId == userId && f.DailyId == dailyId, cancellationToken);

    public async Task AddAsync(DayFeedback feedback, CancellationToken cancellationToken = default) =>
        await _context.DayFeedbacks.AddAsync(feedback, cancellationToken);

    public async Task<IReadOnlyList<DayFeedbackRow>> ListByCourseAsync(Guid courseId, CancellationToken cancellationToken = default) =>
        await (from f in _context.DayFeedbacks
               join d in _context.DailyTemplates on f.DailyTemplateId equals d.Id
               join w in _context.WeeklyTemplates on d.WeeklyTemplateId equals w.Id
               join m in _context.Monthlies on w.MonthlyId equals m.Id
               where m.CourseId == courseId
               select new DayFeedbackRow(w.Number, d.DayNumber, f.Clarity, f.StuckActivityType))
            .ToListAsync(cancellationToken);
}
