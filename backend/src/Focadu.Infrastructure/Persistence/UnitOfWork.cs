using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly FocaduDbContext _context;

    public UnitOfWork(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.SaveChangesAsync(cancellationToken);
        }
        // Fase 93: so o SignupInvite tem token de concorrencia (xmin). Outro cadastro gastou o ultimo uso entre a
        // leitura e o SaveChanges - a resposta certa e a mesma de um convite esgotado, nao um 500.
        catch (DbUpdateConcurrencyException ex) when (ex.Entries.Any(e => e.Entity is SignupInvite))
        {
            throw new DomainException(SignupInvite.InvalidMessage, "convite_esgotado");
        }
    }
}
