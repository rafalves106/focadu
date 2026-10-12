using Focadu.Domain.AiUsage;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia da Medicao de IA (Fase 94): uso medido, tabela de precos e configuracao (teto).</summary>
public interface IAiUsageRepository
{
    /// <summary>Chamadas com OccurredAt em [fromUtc, toUtc), opcionalmente de um curso so. Sem rastreio (so leitura).</summary>
    Task<IReadOnlyList<AiUsageRecord>> ListRecordsAsync(DateTime fromUtc, DateTime toUtc, Guid? courseId, CancellationToken cancellationToken = default);

    /// <summary>Todas as chamadas de um aluno (painel lateral: custo por dia do curso, desde o inicio da medicao).</summary>
    Task<IReadOnlyList<AiUsageRecord>> ListRecordsByUserAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Todas as chamadas de um curso (media do curso por dia, no painel do aluno).</summary>
    Task<IReadOnlyList<AiUsageRecord>> ListRecordsByCourseAsync(Guid courseId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AiModelPrice>> ListPricesAsync(CancellationToken cancellationToken = default);

    Task<AiModelPrice?> GetPriceAsync(string model, CancellationToken cancellationToken = default);

    Task AddPriceAsync(AiModelPrice price, CancellationToken cancellationToken = default);

    /// <summary>A linha unica de configuracao - criada pela migration da Fase 94 (MeasuringSince = hora do deploy).</summary>
    Task<AiUsageSettings?> GetSettingsAsync(CancellationToken cancellationToken = default);
}
