using Focadu.Application.Ports;

namespace Focadu.Application.System;

/// <summary>
/// Caso de uso: agrega o status de todo provedor de IA externo registrado (hoje so Groq, ver
/// GroqHealthCheckService) - GET puro, sem persistencia (o cache de verdade vive dentro de cada
/// IAiProviderHealthCheck, nao aqui). Usado pelo badge de status no GlobalNav do frontend (ver
/// docs/fase-28) pra sinalizar quando a Groq (ou outra IA futura) esta fora do ar, ajudando a
/// decidir quando trocar a chave ou desativar atividades que dependem dela.
/// </summary>
public class GetAiProviderStatusUseCase
{
    private readonly IEnumerable<IAiProviderHealthCheck> _healthChecks;

    public GetAiProviderStatusUseCase(IEnumerable<IAiProviderHealthCheck> healthChecks)
    {
        _healthChecks = healthChecks;
    }

    public async Task<IReadOnlyList<AiProviderStatusDto>> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var results = new List<AiProviderStatusDto>();
        foreach (var healthCheck in _healthChecks)
        {
            var status = await healthCheck.CheckAsync(cancellationToken);
            results.Add(new AiProviderStatusDto(
                healthCheck.ProviderName, status.Configured, status.Available, status.ErrorMessage, DateTimeOffset.UtcNow));
        }

        return results;
    }
}

public record AiProviderStatusDto(string Provider, bool Configured, bool Available, string? ErrorMessage, DateTimeOffset CheckedAt);
