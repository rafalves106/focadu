using Focadu.Domain.Content;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class PersonalizedAnalogyRepository : IPersonalizedAnalogyRepository
{
    private readonly FocaduDbContext _context;

    public PersonalizedAnalogyRepository(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<PersonalizedAnalogy?> GetAsync(Guid userId, Guid curatedContentId, CancellationToken cancellationToken = default) =>
        await _context.PersonalizedAnalogies
            .FirstOrDefaultAsync(a => a.UserId == userId && a.CuratedContentId == curatedContentId, cancellationToken);

    public async Task AddAsync(PersonalizedAnalogy analogy, CancellationToken cancellationToken = default) =>
        await _context.PersonalizedAnalogies.AddAsync(analogy, cancellationToken);
}
