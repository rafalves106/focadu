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

        using var content = new MultipartFormDataContent();
        using var audioContent = new StreamContent(audioStream);
        audioContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        // ponytail: nome de arquivo fixo (o frontend so grava webm via MediaRecorder) - a Groq usa
        // o parametro "model" pra decidir como decodificar, a extensao aqui e so metadado.
        content.Add(audioContent, "file", "audio.webm");
        content.Add(new StringContent(Model), "model");

        var response = await PostAsync("audio/transcriptions", content, cancellationToken);

        var result = await response.Content.ReadFromJsonAsync<GroqTranscriptionResponse>(JsonOptions, cancellationToken);
        return result?.Text ?? string.Empty;
    }

    private async Task<HttpResponseMessage> PostAsync(string path, HttpContent content, CancellationToken cancellationToken)
    {
        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsync(path, content, cancellationToken);
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

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new ExternalServiceException(
                "groq_transcricao_falhou", $"O servico de transcricao respondeu com erro ({(int)response.StatusCode}): {body}");
        }

        return response;
    }

    private record GroqTranscriptionResponse(string? Text);
}
