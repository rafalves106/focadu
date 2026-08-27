using System.Net.Http.Json;
using System.Text.Json;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter concreto de IProjectEvaluationService via Groq (chat completion, JSON mode) - mesmo
/// HttpClient/GroqOptions/formato de resposta de GroqContentEvaluationService, mas prompt proprio:
/// aqui a IA le o codigo/texto dos arquivos do repositorio (ver IGitHubService.
/// GetContentSnapshotAsync) contra a especificacao do projeto da semana, nao uma transcricao de
/// resumo falado. Resposta malformada sempre vira ExternalServiceException (502), nunca uma nota
/// inventada (mesma decisao de GroqContentEvaluationService).
/// </summary>
public class GroqProjectEvaluationService : IProjectEvaluationService
{
    private const string Model = "openai/gpt-oss-120b"; // mesmo modelo dos outros adapters Groq - ver nota em GroqContentEvaluationService sobre o catalogo mudar.

    private const string SystemPrompt =
        "Você é um avaliador técnico da Focadu, plataforma de estudo de segurança web. Você recebe " +
        "o código-fonte de um repositório GitHub entregue por um aluno (uma amostra dos arquivos, " +
        "possivelmente truncada por limite de tamanho) e a especificação pedida para o projeto " +
        "prático da semana. Leia o código de verdade - não só nomes de arquivo ou README - e " +
        "avalie se as funcionalidades/requisitos pedidos foram de fato implementados, a qualidade " +
        "da implementação, e a organização do repositório. Responda SEMPRE em JSON estrito, " +
        "exatamente neste formato: {\"score\": <inteiro de 0 a 100>, \"feedback\": \"<até 3 frases " +
        "em português, direto ao aluno, apontando o que atende à especificação e o que falta ou " +
        "pode melhorar>\"}. Não inclua nenhum texto fora desse JSON.";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly GroqOptions _options;

    public GroqProjectEvaluationService(HttpClient httpClient, GroqOptions options)
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
            : $"Instrução adicional: {request.ContextText}\n\n";

        return
            $"Especificação pedida para o projeto da semana:\n\"\"\"\n{request.ExpectedAnswer}\n\"\"\"\n\n" +
            $"Conteúdo do repositório entregue pelo aluno:\n\"\"\"\n{request.UserAnswer}\n\"\"\"\n\n" +
            instruction +
            "Avalie o quanto o repositório atende à especificação pedida, numa única nota de 0 a 100.";
    }

    /// <summary>Nunca inventa uma nota se a IA responder fora do formato esperado - mesma decisao de GroqContentEvaluationService.</summary>
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
