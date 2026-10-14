using Focadu.Application.Ports;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Focadu.Infrastructure.AiUsage;

/// <summary>
/// Guarda por 1 minuto a situacao do teto mensal de IA (Fase 101), pra o handler de troca de modelo nao consultar o banco a
/// cada chamada. Singleton. Se a leitura falhar, assume "sem teto estourado": limite nunca pode derrubar a IA do aluno.
/// </summary>
public sealed class AiCapMonitor
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AiCapMonitor> _logger;
    private AiCapStatus? _status;
    private DateTime _readAtUtc;

    public AiCapMonitor(IServiceScopeFactory scopeFactory, ILogger<AiCapMonitor> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task<AiCapStatus?> GetAsync(CancellationToken cancellationToken)
    {
        if (_status is not null && DateTime.UtcNow - _readAtUtc < Ttl) return _status;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var status = await scope.ServiceProvider.GetRequiredService<IAiBudget>().GetMonthlyStatusAsync(cancellationToken);
            if (status.OverCap && _status is not { OverCap: true })
                _logger.LogWarning("Teto mensal de IA atingido (US$ {Cost} de {Cap}): texto passa a usar {Model}.", status.MonthCostUsd, status.CapUsd, status.FallbackModel ?? "(sem modelo reserva)");
            _status = status;
            _readAtUtc = DateTime.UtcNow;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Teto de IA: nao deu pra ler a situacao do mes; seguindo sem trocar de modelo.");
            _status = null;
        }

        return _status;
    }
}
