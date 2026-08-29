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

    public async Task<string> TranscribeAsync(Stream audioStream, CancellationToken cancellationToken = default)
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

    private async Task<string> TranscribeOnceAsync(byte[] audioBytes, CancellationToken cancellationToken)
    {
        using var content = new MultipartFormDataContent();
        using var audioContent = new ByteArrayContent(audioBytes);
        audioContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        // ponytail: nome de arquivo fixo (o frontend so grava webm via MediaRecorder) - a Groq usa
        // o parametro "model" pra decidir como decodificar, a extensao aqui e so metadado.
        content.Add(audioContent, "file", "audio.webm");
        content.Add(new StringContent(Model), "model");

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

        return text;
    }

    private record GroqTranscriptionResponse(string? Text);
}
