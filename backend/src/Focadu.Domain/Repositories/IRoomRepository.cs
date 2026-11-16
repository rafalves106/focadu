using Focadu.Domain.Rooms;

namespace Focadu.Domain.Repositories;

public interface IRoomRepository
{
    /// <summary>Salas do curso, com as tarefas.</summary>
    Task<IReadOnlyList<Room>> ListByCourseAsync(Guid courseId, CancellationToken cancellationToken = default);

    Task<Room?> GetByIdAsync(Guid roomId, CancellationToken cancellationToken = default);

    Task AddAsync(Room room, CancellationToken cancellationToken = default);
}

public interface IRoomProgressRepository
{
    Task<IReadOnlyList<RoomProgress>> ListByUserAsync(Guid userId, IReadOnlyCollection<Guid> roomIds, CancellationToken cancellationToken = default);

    Task<RoomProgress?> GetAsync(Guid userId, Guid roomId, CancellationToken cancellationToken = default);

    /// <summary>Todos os progressos de uma sala (o importador confere e limpa tarefas removidas).</summary>
    Task<IReadOnlyList<RoomProgress>> ListByRoomAsync(Guid roomId, CancellationToken cancellationToken = default);

    Task AddAsync(RoomProgress progress, CancellationToken cancellationToken = default);
}
