using Focadu.Domain.Repositories;
using Focadu.Domain.Rooms;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class RoomRepository : IRoomRepository
{
    private readonly FocaduDbContext _context;

    public RoomRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Room>> ListByCourseAsync(Guid courseId, CancellationToken cancellationToken = default) =>
        await _context.Rooms.Include(r => r.Tasks).Where(r => r.CourseId == courseId).OrderBy(r => r.OrderIndex).ToListAsync(cancellationToken);

    public async Task<Room?> GetByIdAsync(Guid roomId, CancellationToken cancellationToken = default) =>
        await _context.Rooms.Include(r => r.Tasks).FirstOrDefaultAsync(r => r.Id == roomId, cancellationToken);

    public async Task AddAsync(Room room, CancellationToken cancellationToken = default) =>
        await _context.Rooms.AddAsync(room, cancellationToken);
}

public class RoomProgressRepository : IRoomProgressRepository
{
    private readonly FocaduDbContext _context;

    public RoomProgressRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<RoomProgress>> ListByUserAsync(Guid userId, IReadOnlyCollection<Guid> roomIds, CancellationToken cancellationToken = default) =>
        roomIds.Count == 0
            ? []
            : await _context.RoomProgresses.Include(p => p.Results).Where(p => p.UserId == userId && roomIds.Contains(p.RoomId)).ToListAsync(cancellationToken);

    public async Task<RoomProgress?> GetAsync(Guid userId, Guid roomId, CancellationToken cancellationToken = default) =>
        await _context.RoomProgresses.Include(p => p.Results).FirstOrDefaultAsync(p => p.UserId == userId && p.RoomId == roomId, cancellationToken);

    public async Task<IReadOnlyList<RoomProgress>> ListByRoomAsync(Guid roomId, CancellationToken cancellationToken = default) =>
        await _context.RoomProgresses.Include(p => p.Results).Where(p => p.RoomId == roomId).ToListAsync(cancellationToken);

    public async Task AddAsync(RoomProgress progress, CancellationToken cancellationToken = default) =>
        await _context.RoomProgresses.AddAsync(progress, cancellationToken);
}
