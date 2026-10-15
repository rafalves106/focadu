using Focadu.Domain.ProductMetrics;

namespace Focadu.Domain.Repositories;

/// <summary>Medicao de produto (Fase 103): telas abertas por aluno, dia e aparelho.</summary>
public interface IScreenVisitRepository
{
    /// <summary>Grava a visita se ainda nao existe a mesma (aluno, dia, tela, aparelho); repetida e ignorada sem erro.</summary>
    Task AddIfMissingAsync(ScreenVisit visit, CancellationToken cancellationToken = default);

    /// <summary>Visitas a partir de `fromDay` (inclusive); nulo = todas.</summary>
    Task<IReadOnlyList<ScreenVisit>> ListAsync(DateOnly? fromDay, CancellationToken cancellationToken = default);
}
