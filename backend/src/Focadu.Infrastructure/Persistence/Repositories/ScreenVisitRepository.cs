using Focadu.Domain.ProductMetrics;
using Focadu.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence.Repositories;

public class ScreenVisitRepository : IScreenVisitRepository
{
    private readonly FocaduDbContext _context;

    public ScreenVisitRepository(FocaduDbContext context)
    {
        _context = context;
    }

    // INSERT ... ON CONFLICT DO NOTHING em vez de "consulta e depois insere": duas abas (ou o StrictMode) mandando a
    // mesma tela ao mesmo tempo nao estouram o indice unico.
    public async Task AddIfMissingAsync(ScreenVisit visit, CancellationToken cancellationToken = default) =>
        await _context.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO "ScreenVisits" ("Id", "UserId", "Day", "Screen", "Device", "FirstSeenAt")
            VALUES ({visit.Id}, {visit.UserId}, {visit.Day}, {visit.Screen}, {visit.Device.ToString()}, {visit.FirstSeenAt})
            ON CONFLICT ("UserId", "Day", "Screen", "Device") DO NOTHING
            """, cancellationToken);

    public async Task<IReadOnlyList<ScreenVisit>> ListAsync(DateOnly? fromDay, CancellationToken cancellationToken = default) =>
        await _context.ScreenVisits.AsNoTracking()
            .Where(v => fromDay == null || v.Day >= fromDay)
            .ToListAsync(cancellationToken);
}
