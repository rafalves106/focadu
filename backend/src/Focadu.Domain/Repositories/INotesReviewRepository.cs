using Focadu.Domain.Notes;

namespace Focadu.Domain.Repositories;

public interface INotesReviewRepository
{
    /// <summary>Todas as revisoes do usuario nestas Dailies (a tela pega a mais recente de cada uma).</summary>
    Task<IReadOnlyCollection<NotesReview>> ListByUserAndDailyIdsAsync(Guid userId, IReadOnlyCollection<Guid> dailyIds, CancellationToken cancellationToken = default);

    /// <summary>Quantas revisoes o usuario pediu desde <paramref name="sinceUtc"/> (limite diario).</summary>
    Task<int> CountByUserSinceAsync(Guid userId, DateTime sinceUtc, CancellationToken cancellationToken = default);

    Task AddAsync(NotesReview review, CancellationToken cancellationToken = default);
}
