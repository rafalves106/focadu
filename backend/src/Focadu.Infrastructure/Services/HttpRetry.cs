using System.Net;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Retry generico pras chamadas HTTP cruas da Infrastructure (Groq, GitHub - sem SDK, so
/// HttpClient tipado). Sem interface/DI: e detalhe de implementacao de HTTP, nao uma dependencia
/// de negocio, entao e so uma classe estatica.
///
/// Ate 2 retries (3 tentativas) com backoff exponencial + jitter (~500ms na 1a espera, ~1s na
/// 2a), com teto de 2s de espera por tentativa - inclusive quando o servidor manda um Retry-After
/// maior num 429 (<see cref="HttpStatusException.RetryAfter"/>).
///
/// Quem chama decide o que e retryable (<paramref name="isRetryable"/> em <see cref="RunAsync"/>):
/// <see cref="IsTransientFailure"/> cobre o caso comum (transporte + status HTTP) e cada service
/// pode compor mais casos em cima (ex: Groq retry tambem em conteudo 200 mas inutilizavel -
/// transcricao vazia, JSON de avaliacao invalido - ver GroqAudioTranscriptionService/
/// GroqContentEvaluationService).
///
/// # ponytail: loop manual, migrar pra Polly se aparecer necessidade de circuit breaker/policy composta
/// </summary>
internal static class HttpRetry
{
    internal const int MaxAttempts = 3;
    private static readonly TimeSpan BaseDelay = TimeSpan.FromMilliseconds(500);
    internal static readonly TimeSpan MaxDelayPerAttempt = TimeSpan.FromSeconds(2);

    /// <summary>
    /// Executa <paramref name="attempt"/> ate MaxAttempts vezes, esperando entre tentativas
    /// (backoff exponencial + jitter, ou o Retry-After da tentativa anterior) enquanto
    /// <paramref name="isRetryable"/> disser que a excecao capturada vale uma nova tentativa.
    /// Relanca a excecao da ultima tentativa quando esgota as tentativas ou quando ela nao e
    /// retryable.
    /// </summary>
    public static async Task<T> RunAsync<T>(
        Func<Task<T>> attempt, Func<Exception, bool> isRetryable, CancellationToken cancellationToken)
    {
        for (var attemptNumber = 1; ; attemptNumber++)
        {
            try
            {
                return await attempt();
            }
            catch (Exception ex) when (attemptNumber < MaxAttempts && isRetryable(ex))
            {
                await Task.Delay(ComputeDelay(attemptNumber, ex), cancellationToken);
            }
        }
    }

    /// <summary>
    /// Classificacao padrao de "vale tentar de novo": HttpRequestException (falha de transporte),
    /// TaskCanceledException que NAO veio de cancelamento do usuario (timeout do HttpClient), ou
    /// HttpStatusException com 429/5xx. HTTP 4xx fora 429 nunca e retryable - o pedido em si esta
    /// errado, tentar de novo nao muda o resultado.
    /// </summary>
    public static bool IsTransientFailure(Exception ex, CancellationToken cancellationToken) => ex switch
    {
        HttpRequestException => true,
        TaskCanceledException => !cancellationToken.IsCancellationRequested,
        HttpStatusException status => status.StatusCode == HttpStatusCode.TooManyRequests || (int)status.StatusCode >= 500,
        _ => false,
    };

    /// <summary>Le o body e lanca HttpStatusException se a resposta nao for 2xx; no-op em caso de sucesso.</summary>
    public static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode) return;

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        throw new HttpStatusException(response.StatusCode, body, ParseRetryAfter(response));
    }

    private static TimeSpan? ParseRetryAfter(HttpResponseMessage response)
    {
        var retryAfter = response.Headers.RetryAfter;
        // Retry-After por data (raro, mas valido por spec) pode ja ter passado - Task.Delay nao
        // aceita TimeSpan negativo, entao vira "ja pode tentar" (zero) em vez de crashar o loop.
        if (retryAfter?.Delta is { } delta) return Max(delta, TimeSpan.Zero);
        if (retryAfter?.Date is { } date) return Max(date - DateTimeOffset.UtcNow, TimeSpan.Zero);
        return null;

        static TimeSpan Max(TimeSpan a, TimeSpan b) => a > b ? a : b;
    }

    internal static TimeSpan ComputeDelay(int attemptNumber, Exception ex)
    {
        // 429 com Retry-After: respeita o servidor, mas nunca alem do teto por tentativa.
        if (ex is HttpStatusException { RetryAfter: { } retryAfter })
            return retryAfter > MaxDelayPerAttempt ? MaxDelayPerAttempt : retryAfter;

        // Exponencial (500ms, 1s, ...) com "equal jitter" (metade fixo + metade aleatorio ate o
        // valor cheio) - evita que varias instancias erradas em retry ao mesmo tempo martelem a
        // Groq/GitHub juntas no mesmo instante.
        var exponential = TimeSpan.FromMilliseconds(BaseDelay.TotalMilliseconds * Math.Pow(2, attemptNumber - 1));
        var capped = exponential > MaxDelayPerAttempt ? MaxDelayPerAttempt : exponential;
        var half = capped / 2;
        return half + half * Random.Shared.NextDouble();
    }

    /// <summary>
    /// Carrega o status HTTP + body + Retry-After (se veio) de uma resposta nao-2xx entre a
    /// tentativa e o predicado/backoff de RunAsync - nunca deveria escapar do service que chamou
    /// RunAsync, sempre convertida na ExternalServiceException final (ver catch em
    /// GroqAudioTranscriptionService/GroqContentEvaluationService/GitHubService).
    /// </summary>
    public sealed class HttpStatusException(HttpStatusCode statusCode, string body, TimeSpan? retryAfter)
        : Exception($"HTTP {(int)statusCode}")
    {
        public HttpStatusCode StatusCode { get; } = statusCode;
        public string Body { get; } = body;
        public TimeSpan? RetryAfter { get; } = retryAfter;
    }
}
