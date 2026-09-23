using Focadu.Domain.Notes;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class NoteRepository : INoteRepository
{
    private readonly FocaduDbContext _context;

    public NoteRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<Note?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default) =>
        await _context.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, cancellationToken);

    public async Task<IReadOnlyCollection<Note>> ListByUserAndContextIdsAsync(
        Guid userId, IReadOnlyCollection<Guid> dailyIds, IReadOnlyCollection<Guid> weeklyProjectIds, CancellationToken cancellationToken = default) =>
        await _context.Notes
            .Where(n => n.UserId == userId
                && ((n.DailyId != null && dailyIds.Contains(n.DailyId.Value))
                    || (n.WeeklyProjectId != null && weeklyProjectIds.Contains(n.WeeklyProjectId.Value))))
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Note note, CancellationToken cancellationToken = default) =>
        await _context.Notes.AddAsync(note, cancellationToken);

    public void Remove(Note note) => _context.Notes.Remove(note);
}
