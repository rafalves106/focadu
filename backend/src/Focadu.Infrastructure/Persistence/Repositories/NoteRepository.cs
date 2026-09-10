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

    public async Task<IReadOnlyCollection<Note>> ListByUserAndDailyIdsAsync(
        Guid userId, IReadOnlyCollection<Guid> dailyIds, CancellationToken cancellationToken = default) =>
        await _context.Notes
            .Where(n => n.UserId == userId && dailyIds.Contains(n.DailyId))
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Note note, CancellationToken cancellationToken = default) =>
        await _context.Notes.AddAsync(note, cancellationToken);

    public void Remove(Note note) => _context.Notes.Remove(note);
}
