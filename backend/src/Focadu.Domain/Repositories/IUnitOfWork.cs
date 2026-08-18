namespace Focadu.Domain.Repositories;

/// <summary>
/// Port que representa a fronteira transacional: confirma no banco todas as mudancas feitas nos
/// aggregates carregados/adicionados durante o caso de uso atual.
/// </summary>
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
