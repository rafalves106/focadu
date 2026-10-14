namespace Focadu.Application.Ports;

/// <summary>Situacao do teto mensal de IA (Fase 101): gasto estimado do mes, de todos os alunos, contra o teto.</summary>
/// <param name="OverCap">Passou do teto: as chamadas de texto trocam para <paramref name="FallbackModel"/> (se houver).</param>
/// <param name="FallbackModel">Modelo reserva configurado e com preco na tabela; nulo = nao troca.</param>
public record AiCapStatus(bool OverCap, string? FallbackModel, decimal MonthCostUsd, decimal? CapUsd);

/// <summary>
/// Limites de gasto de IA (Fase 101), sobre a Medicao da Fase 94: o gasto e sempre ESTIMADO (uso medido x tabela de
/// precos). Dois limites: o orcamento diario de cada aluno (passou, a chamada nao acontece) e o teto mensal global
/// (passou, o texto troca para um modelo mais barato, ninguem fica sem IA).
/// </summary>
public interface IAiBudget
{
    /// <summary>Lanca <c>orcamento_ia_esgotado</c> (429) se o aluno ja gastou o orcamento de hoje. Sem limite configurado, nao faz nada.</summary>
    Task EnsureDailyBudgetAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<AiCapStatus> GetMonthlyStatusAsync(CancellationToken cancellationToken = default);
}
