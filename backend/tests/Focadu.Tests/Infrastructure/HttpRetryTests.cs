using System.Net;
using Focadu.Infrastructure.Services;

namespace Focadu.Tests.Infrastructure;

/// <summary>
/// HttpRetry e internal (testado via InternalsVisibleTo em Focadu.Infrastructure) - cobre o
/// predicado padrao de retry (IsTransientFailure), o loop de tentativas (RunAsync) e o calculo de
/// backoff (ComputeDelay), usados pelos adapters Groq/GitHub (GroqAudioTranscriptionService,
/// GroqContentEvaluationService, GitHubService).
/// </summary>
public class HttpRetryTests
{
    [Fact]
    public void IsTransientFailure_RetriesTransportAndServerErrors()
    {
        var ct = CancellationToken.None;

        Assert.True(HttpRetry.IsTransientFailure(new HttpRequestException("falhou"), ct));
        Assert.True(HttpRetry.IsTransientFailure(new TaskCanceledException(), ct));
        Assert.True(HttpRetry.IsTransientFailure(StatusEx(HttpStatusCode.TooManyRequests), ct));
        Assert.True(HttpRetry.IsTransientFailure(StatusEx(HttpStatusCode.InternalServerError), ct));
        Assert.True(HttpRetry.IsTransientFailure(StatusEx(HttpStatusCode.ServiceUnavailable), ct));
    }

    [Fact]
    public void IsTransientFailure_DoesNotRetryClientErrorsOrUserCancellation()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        // TaskCanceledException so e retryable quando NAO veio de cancelamento do usuario (ex:
        // timeout do HttpClient) - com o token ja cancelado, e o usuario desistindo, nao retry.
        Assert.False(HttpRetry.IsTransientFailure(new TaskCanceledException(), cts.Token));
        Assert.False(HttpRetry.IsTransientFailure(StatusEx(HttpStatusCode.BadRequest), CancellationToken.None));
        Assert.False(HttpRetry.IsTransientFailure(StatusEx(HttpStatusCode.Unauthorized), CancellationToken.None));
        Assert.False(HttpRetry.IsTransientFailure(StatusEx(HttpStatusCode.NotFound), CancellationToken.None));
        Assert.False(HttpRetry.IsTransientFailure(new InvalidOperationException(), CancellationToken.None));
    }

    [Fact]
    public async Task RunAsync_RetriesUntilSuccessWithinMaxAttempts()
    {
        var attempts = 0;

        var result = await HttpRetry.RunAsync(
            () =>
            {
                attempts++;
                if (attempts < HttpRetry.MaxAttempts) throw new HttpRequestException("falha transitoria");
                return Task.FromResult("ok");
            },
            ex => HttpRetry.IsTransientFailure(ex, CancellationToken.None),
            CancellationToken.None);

        Assert.Equal("ok", result);
        Assert.Equal(HttpRetry.MaxAttempts, attempts);
    }

    [Fact]
    public async Task RunAsync_GivesUpAfterMaxAttempts()
    {
        var attempts = 0;

        await Assert.ThrowsAsync<HttpRequestException>(() => HttpRetry.RunAsync<string>(
            () =>
            {
                attempts++;
                throw new HttpRequestException("sempre falha");
            },
            ex => HttpRetry.IsTransientFailure(ex, CancellationToken.None),
            CancellationToken.None));

        Assert.Equal(HttpRetry.MaxAttempts, attempts);
    }

    [Fact]
    public async Task RunAsync_DoesNotRetryWhenPredicateSaysNo()
    {
        var attempts = 0;

        await Assert.ThrowsAsync<InvalidOperationException>(() => HttpRetry.RunAsync<string>(
            () =>
            {
                attempts++;
                throw new InvalidOperationException("erro definitivo, nao transitorio");
            },
            _ => false,
            CancellationToken.None));

        Assert.Equal(1, attempts);
    }

    [Theory]
    [InlineData(1, 250, 500)] // 1a espera: ~500ms (exponencial 500ms * 2^0), jitter [metade, cheio]
    [InlineData(2, 500, 1000)] // 2a espera: ~1s (500ms * 2^1)
    [InlineData(5, 1000, 2000)] // exponencial estouraria o teto bem antes - preso no teto de 2s
    public void ComputeDelay_ExponentialWithJitter_StaysWithinExpectedRange(int attemptNumber, int minMs, int maxMs)
    {
        var delay = HttpRetry.ComputeDelay(attemptNumber, new HttpRequestException("falha transitoria"));

        Assert.InRange(delay.TotalMilliseconds, minMs, maxMs);
    }

    [Fact]
    public void ComputeDelay_RespectsRetryAfterBelowCap()
    {
        var delay = HttpRetry.ComputeDelay(1, StatusEx(HttpStatusCode.TooManyRequests, retryAfter: TimeSpan.FromMilliseconds(700)));

        Assert.Equal(TimeSpan.FromMilliseconds(700), delay);
    }

    [Fact]
    public void ComputeDelay_CapsRetryAfterAboveCap()
    {
        var delay = HttpRetry.ComputeDelay(1, StatusEx(HttpStatusCode.TooManyRequests, retryAfter: TimeSpan.FromSeconds(30)));

        Assert.Equal(HttpRetry.MaxDelayPerAttempt, delay);
    }

    private static HttpRetry.HttpStatusException StatusEx(HttpStatusCode statusCode, TimeSpan? retryAfter = null) =>
        new(statusCode, "erro", retryAfter);
}
