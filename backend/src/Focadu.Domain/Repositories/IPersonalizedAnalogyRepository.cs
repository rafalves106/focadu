using Focadu.Domain.Content;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia para o aggregate PersonalizedAnalogy (Fase 21) - cache por (UserId, CuratedContentId), sempre criado sob demanda (lazy), nunca em lote.</summary>
public interface IPersonalizedAnalogyRepository
{
    Task<PersonalizedAnalogy?> GetAsync(Guid userId, Guid curatedContentId, CancellationToken cancellationToken = default);

    Task AddAsync(PersonalizedAnalogy analogy, CancellationToken cancellationToken = default);
}
