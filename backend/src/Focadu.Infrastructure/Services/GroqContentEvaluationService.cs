using System.Net.Http.Json;
using System.Text.Json;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter concreto de IContentEvaluationService via Groq (chat completion, formato compativel
/// com a OpenAI). Pede 1 score unico (0-100, ja ponderando conteudo + clareza) e 1 feedback curto
/// em JSON mode - decisao confirmada na Fase 5 (ver docs/ARQUITETURA.md pro raciocinio do prompt).
/// Resposta malformada (JSON invalido, campos ausentes, score fora de 0-100) sempre vira
/// ExternalServiceException (502) - nunca uma nota inventada.
/// </summary>
public class GroqContentEvaluationService : IContentEvaluationService
{
    private const string Model = "llama-3.3-70b-versatile";

    private const string SystemPrompt =
        "Você é um avaliador pedagógico da Focadu, plataforma de estudo de segurança web. " +
        "Avalie se a transcrição de um resumo falado pelo aluno demonstra compreensão correta do " +
        "conteúdo de referência, e a clareza com que foi comunicado. Responda SEMPRE em JSON " +
        "estrito, exatamente neste formato: {\"score\": <inteiro de 0 a 100>, \"feedback\": " +
        "\"<até 2 frases em português, direto ao aluno, apontando o que acertou e o que pode " +
        "melhorar>\"}. Não inclua nenhum texto fora desse JSON.";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly GroqOptions _options;

    public GroqContentEvaluationService(HttpClient httpClient, GroqOptions options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    public async Task<ContentEvaluationResult> EvaluateAsync(
        ContentEvaluationRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new ExternalServiceException(
                "groq_api_key_nao_configurada",
                "A chave de API do Groq nao esta configurada (Groq:ApiKey) - ver docs/ARQUITETURA.md.");
        }

        var payload = new
        {
            model = Model,
            temperature = 0.2,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new { role = "system", content = SystemPrompt },
                new { role = "user", content = BuildUserPrompt(request) },
            },
        };

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsJsonAsync("chat/completions", payload, cancellationToken);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new ExternalServiceException(
                "groq_timeout", "A avaliacao demorou demais para responder - tente novamente.", statusCode: 503);
        }
        catch (HttpRequestException ex)
        {
            throw new ExternalServiceException(
                "groq_indisponivel", $"Nao foi possivel conectar ao servico de avaliacao: {ex.Message}");
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new ExternalServiceException(
                "groq_avaliacao_falhou", $"O servico de avaliacao respondeu com erro ({(int)response.StatusCode}): {body}");
        }

        var completion = await response.Content.ReadFromJsonAsync<GroqChatCompletionResponse>(JsonOptions, cancellationToken);
        var rawContent = completion?.Choices?.FirstOrDefault()?.Message?.Content;

        return ParseEvaluation(rawContent);
    }

    private static string BuildUserPrompt(ContentEvaluationRequest request)
    {
        var instruction = string.IsNullOrWhiteSpace(request.ContextText)
            ? string.Empty
            : $"Instrução original da atividade: {request.ContextText}\n\n";

        return
            $"Conteúdo de referência que o aluno deveria ter estudado:\n\"\"\"\n{request.ExpectedAnswer}\n\"\"\"\n\n" +
            $"Resumo falado pelo aluno (transcrito):\n\"\"\"\n{request.UserAnswer}\n\"\"\"\n\n" +
            instruction +
            "Avalie considerando: (1) se o conteúdo do resumo está correto e completo em relação " +
            "à referência; (2) a clareza da explicação (organização, precisão de linguagem). " +
            "Combine os dois aspectos numa única nota de 0 a 100.";
    }

    /// <summary>
    /// Nunca inventa uma nota se a IA responder algo fora do formato esperado - joga
    /// ExternalServiceException (502) com uma mensagem clara, em vez de deixar passar um Score
    /// forjado que ninguem validou.
    /// </summary>
    private static ContentEvaluationResult ParseEvaluation(string? rawContent)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
        {
            throw new ExternalServiceException(
                "avaliacao_ia_formato_invalido", "O servico de avaliacao nao retornou nenhum conteudo.");
        }

        GroqEvaluationPayload? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<GroqEvaluationPayload>(rawContent, JsonOptions);
        }
        catch (JsonException)
        {
            throw new ExternalServiceException(
                "avaliacao_ia_formato_invalido", "O servico de avaliacao retornou um formato inesperado (JSON invalido).");
        }

        if (parsed?.Score is null || string.IsNullOrWhiteSpace(parsed.Feedback) || parsed.Score is < 0 or > 100)
        {
            throw new ExternalServiceException(
                "avaliacao_ia_formato_invalido",
                "O servico de avaliacao retornou um formato inesperado (campos ausentes ou score fora de 0-100).");
        }

        return new ContentEvaluationResult(parsed.Score.Value, parsed.Feedback);
    }

    private record GroqEvaluationPayload(int? Score, string? Feedback);

    private record GroqChatCompletionResponse(List<GroqChatChoice>? Choices);

    private record GroqChatChoice(GroqChatMessage? Message);

    private record GroqChatMessage(string? Content);
}
