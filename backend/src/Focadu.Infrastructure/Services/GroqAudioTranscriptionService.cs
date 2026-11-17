using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter concreto de IAudioTranscriptionService via Groq (endpoint compativel com o formato da
/// OpenAI: POST audio/transcriptions, multipart/form-data). Modelo whisper-large-v3 (nao a
/// variante Turbo) - decisao de produto (Fase 5): o audio ja foi gravado antes do envio, entao
/// precisao importa mais que velocidade de resposta em tempo real.
/// </summary>
public class GroqAudioTranscriptionService : IAudioTranscriptionService
{
    private const string Model = "whisper-large-v3";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly GroqOptions _options;

    public GroqAudioTranscriptionService(HttpClient httpClient, GroqOptions options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    public async Task<AudioTranscript> TranscribeAsync(Stream audioStream, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new ExternalServiceException(
                "groq_api_key_nao_configurada",
                "A chave de API do Groq nao esta configurada (Groq:ApiKey) - ver docs/ARQUITETURA.md.");
        }

        // Bufferiza pra memoria em vez de mandar o Stream original direto: um retry precisa
        // remontar o multipart do zero, e um Stream ja consumido na 1a tentativa nao da pra
        // reler. Audio de resumo falado e pequeno (ver MaxAudioSizeBytes em
        // SubmitVoiceSummaryResponseUseCase), sem custo real de memoria aqui.
        using var buffer = new MemoryStream();
        await audioStream.CopyToAsync(buffer, cancellationToken);
        var audioBytes = buffer.ToArray();

        try
        {
            return await HttpRetry.RunAsync(
                () => TranscribeOnceAsync(audioBytes, cancellationToken),
                ex => HttpRetry.IsTransientFailure(ex, cancellationToken)
                    || ex is ExternalServiceException { Code: "transcricao_vazia" },
                cancellationToken);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new ExternalServiceException(
                "groq_timeout", "A transcricao demorou demais para responder - tente novamente.", statusCode: 503);
        }
        catch (HttpRequestException ex)
        {
            throw new ExternalServiceException(
                "groq_indisponivel", $"Nao foi possivel conectar ao servico de transcricao: {ex.Message}");
        }
        catch (HttpRetry.HttpStatusException ex)
        {
            throw new ExternalServiceException(
                "groq_transcricao_falhou", $"O servico de transcricao respondeu com erro ({(int)ex.StatusCode}): {ex.Body}");
        }
    }

    private async Task<AudioTranscript> TranscribeOnceAsync(byte[] audioBytes, CancellationToken cancellationToken)
    {
        using var content = new MultipartFormDataContent();
        using var audioContent = new ByteArrayContent(audioBytes);
        audioContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        // ponytail: nome de arquivo fixo (o frontend so grava webm via MediaRecorder) - a Groq usa
        // o parametro "model" pra decidir como decodificar, a extensao aqui e so metadado.
        content.Add(audioContent, "file", "audio.webm");
        content.Add(new StringContent(Model), "model");
        // Fase 94: verbose_json traz "duration" (segundos de audio), que a Medicao de IA usa pra estimar o custo.
        // O campo "text" continua igual.
        content.Add(new StringContent("verbose_json"), "response_format");
        // Todo curso e falado em portugues. Sem isso o Whisper detecta o idioma sozinho e, num audio quase mudo,
        // "ouve" ingles: em 17/11/2026 uma gravacao de 15 s virou so "you" e levou nota 0.
        content.Add(new StringContent("pt"), "language");

        var response = await _httpClient.PostAsync("audio/transcriptions", content, cancellationToken);
        await HttpRetry.EnsureSuccessAsync(response, cancellationToken);

        var result = await response.Content.ReadFromJsonAsync<GroqTranscriptionResponse>(JsonOptions, cancellationToken);
        var text = result?.Text ?? string.Empty;

        // Resposta 200 mas sem texto util: a Groq roda com audio real, entao isso normalmente e
        // ruido/instabilidade da propria chamada, nao um resultado "correto" de audio vazio -
        // entra no mesmo orcamento de retry do RunAsync acima (nao retry indefinido).
        if (string.IsNullOrWhiteSpace(text))
        {
            throw new ExternalServiceException(
                "transcricao_vazia", "A transcricao do audio veio vazia - tente gravar novamente.");
        }

        // Audio sem fala (microfone errado ou mudo): o Whisper inventa uma frase curta ("you", "Obrigado.") em vez de
        // devolver vazio. Avaliar isso da nota 0 por algo que o aluno nao disse - melhor pedir pra gravar de novo.
        // Nao entra no retry: o mesmo audio daria o mesmo resultado.
        if (IsNoSpeech(text, result?.Segments))
        {
            throw new ValidationException(
                "voz_nao_detectada",
                "Não deu pra ouvir a sua voz nessa gravação. Confira se o microfone certo está selecionado e grave de novo.");
        }

        return new AudioTranscript(text, result?.Duration ?? 0);
    }

    /// <summary>Frases que o Whisper costuma inventar em audio mudo, comparadas com o texto inteiro (sem pontuacao).</summary>
    private static readonly HashSet<string> HallucinatedPhrases = new(StringComparer.OrdinalIgnoreCase)
    {
        "you", "thank you", "thanks for watching", "bye", "obrigado", "obrigada", "tchau",
        "legendas pela comunidade amaraorg", "hum",
    };

    /// <summary>
    /// Sem fala: todo segmento com no_speech_prob alto, ou o texto inteiro e uma das frases inventadas de sempre.
    /// </summary>
    internal static bool IsNoSpeech(string text, IReadOnlyList<GroqSegment>? segments)
    {
        if (segments is { Count: > 0 } && segments.All(s => s.NoSpeechProb >= 0.6)) return true;
        var normalized = new string(text.Where(c => char.IsLetter(c) || char.IsWhiteSpace(c)).ToArray());
        normalized = string.Join(' ', normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries));
        return HallucinatedPhrases.Contains(normalized);
    }

    internal record GroqSegment(
        [property: System.Text.Json.Serialization.JsonPropertyName("no_speech_prob")] double NoSpeechProb);

    private record GroqTranscriptionResponse(string? Text, double? Duration, List<GroqSegment>? Segments);
}
