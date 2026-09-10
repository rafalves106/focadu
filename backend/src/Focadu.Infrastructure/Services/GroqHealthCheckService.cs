using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter concreto de IAiProviderHealthCheck via Groq (Fase 28) - ao contrario dos outros
/// adapters Groq (que fazem chat completion/transcricao), este so testa se a Groq esta no ar:
/// GET "models" (lista o catalogo de modelos), leve e nao consome cota de geracao. Chave ausente
/// nunca chega a tentar a chamada - mesma distincao "nao configurado" vs "fora do ar" de
/// GroqAnalogyGenerationService.
///
/// Registrado como Singleton (DependencyInjection.cs) porque guarda o cache em memoria: varios
/// usuarios com o GlobalNav aberto ao mesmo tempo nao devem gerar 1 chamada de teste a Groq por
/// requisicao de badge - CacheDuration (45s) e o "time-to-detect" maximo de uma queda real,
/// aceitavel pro proposito (sinalizar quando desativar atividades de IA, nao um SLA de verdade).
/// SemaphoreSlim (nao lock comum) porque o corpo protegido e assincrono (await na chamada HTTP).
/// </summary>
public class GroqHealthCheckService : IAiProviderHealthCheck
{
    public const string GroqHealthCheckHttpClientName = "GroqHealthCheck";

    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(45);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GroqOptions _options;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);

    private AiProviderStatus? _cachedStatus;
    private DateTimeOffset _cachedAt;

    public GroqHealthCheckService(IHttpClientFactory httpClientFactory, GroqOptions options)
    {
        _httpClientFactory = httpClientFactory;
        _options = options;
    }

    public string ProviderName => "Groq";

    public async Task<AiProviderStatus> CheckAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
            return new AiProviderStatus(Configured: false, Available: false, ErrorMessage: "Chave da Groq nao configurada (Groq:ApiKey).");

        if (TryGetFreshCache(out var fresh)) return fresh;

        await _refreshLock.WaitAsync(cancellationToken);
        try
        {
            // Outra requisicao pode ja ter atualizado o cache enquanto esta esperava o lock.
            if (TryGetFreshCache(out fresh)) return fresh;

            var status = await PingAsync(cancellationToken);
            _cachedStatus = status;
            _cachedAt = DateTimeOffset.UtcNow;
            return status;
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    private bool TryGetFreshCache(out AiProviderStatus status)
    {
        if (_cachedStatus is not null && DateTimeOffset.UtcNow - _cachedAt < CacheDuration)
        {
            status = _cachedStatus;
            return true;
        }

        status = null!;
        return false;
    }

    private async Task<AiProviderStatus> PingAsync(CancellationToken cancellationToken)
    {
        try
        {
            var client = _httpClientFactory.CreateClient(GroqHealthCheckHttpClientName);
            using var response = await client.GetAsync("models", cancellationToken);

            return response.IsSuccessStatusCode
                ? new AiProviderStatus(Configured: true, Available: true, ErrorMessage: null)
                : new AiProviderStatus(Configured: true, Available: false, ErrorMessage: $"Groq respondeu com status {(int)response.StatusCode}.");
        }
        // TaskCanceledException aqui e o timeout curto do client (ver DependencyInjection.cs) - se
        // for o cancellationToken do proprio chamador (ex: cliente desconectou), deixa propagar em
        // vez de reportar "fora do ar" (mesmo idioma dos outros adapters Groq, ex:
        // GroqAnalogyGenerationService).
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return new AiProviderStatus(Configured: true, Available: false, ErrorMessage: "Groq nao respondeu a tempo.");
        }
        catch (HttpRequestException)
        {
            return new AiProviderStatus(Configured: true, Available: false, ErrorMessage: "Nao foi possivel conectar a Groq.");
        }
    }
}
