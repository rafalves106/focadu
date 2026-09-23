using Focadu.Domain.Notes;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia para o aggregate Note (Fase 29, Caderninho de Anotações).</summary>
public interface INoteRepository
{
    /// <summary>userId filtra pelo dono da nota - id de outro usuario retorna null (404 pro chamador), nunca vaza anotação alheia.</summary>
    Task<Note?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Todas as notas do usuário cujo DailyId OU WeeklyProjectId (Fase 63) está nos conjuntos informados - usado pra listar as notas de um Course inteiro (ver ListNotesUseCase, que resolve os Ids da Enrollment antes de chamar isto).</summary>
    Task<IReadOnlyCollection<Note>> ListByUserAndContextIdsAsync(
        Guid userId, IReadOnlyCollection<Guid> dailyIds, IReadOnlyCollection<Guid> weeklyProjectIds, CancellationToken cancellationToken = default);

    Task AddAsync(Note note, CancellationToken cancellationToken = default);

    void Remove(Note note);
}
