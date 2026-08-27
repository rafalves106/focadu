using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter concreto de IAnalogyGenerationService via Groq (chat completion, JSON mode - mesmo
/// formato de GroqContentEvaluationService/GroqProjectEvaluationService) - gera 1 analogia por
/// secao do Reading, conectando cada uma a um interesse/hobby do aluno (Fase 21/22). Pede as N
/// analogias numa unica chamada (nao 1 chamada por secao) pra IA ver o texto inteiro de contexto e
/// variar os interesses usados entre secoes, em vez de repetir a mesma analogia.
/// </summary>
public class GroqAnalogyGenerationService : IAnalogyGenerationService
{
    private const string Model = "openai/gpt-oss-120b"; // mesmo modelo dos outros adapters Groq - ver nota em GroqContentEvaluationService sobre o catalogo mudar.

    private const string SystemPrompt =
        "Você ajuda alunos de segurança web da Focadu a entender conceitos técnicos através de " +
        "analogias com os hobbies/interesses pessoais deles. Você recebe um texto técnico dividido " +
        "em seções numeradas e os interesses do aluno. Para CADA seção, escreva uma analogia curta " +
        "(2 a 3 frases) que conecte um interesse do aluno ao conceito central DAQUELA seção " +
        "especificamente - varie os interesses usados entre seções quando fizer sentido, nunca " +
        "repita a mesma analogia genérica em seções diferentes. Nunca reescreva ou repita o texto " +
        "técnico em si, só complemente com a analogia. Se nenhum interesse permitir uma conexão " +
        "natural pra alguma seção, use o que fizer mais sentido, mas nunca force uma analogia " +
        "absurda ou tecnicamente incorreta. Responda SEMPRE em JSON estrito, exatamente neste " +
        "formato: {\"analogies\": [\"<analogia da seção 1>\", \"<analogia da seção 2>\", ...]} - " +
        "um item por seção recebida, na MESMA ordem e MESMA quantidade. Não inclua nenhum texto " +
        "fora desse JSON.";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly GroqOptions _options;

    public GroqAnalogyGenerationService(HttpClient httpClient, GroqOptions options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    public async Task<IReadOnlyList<string>> GenerateAsync(AnalogyRequest request, CancellationToken cancellationToken = default)
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
            temperature = 0.8,
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
                "groq_timeout", "A geracao das analogias demorou demais para responder - tente novamente.", statusCode: 503);
        }
        catch (HttpRequestException ex)
        {
            throw new ExternalServiceException(
                "groq_indisponivel", $"Nao foi possivel conectar ao servico de geracao de texto: {ex.Message}");
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new ExternalServiceException(
                "groq_geracao_falhou", $"O servico de geracao de texto respondeu com erro ({(int)response.StatusCode}): {body}");
        }

        var completion = await response.Content.ReadFromJsonAsync<GroqChatCompletionResponse>(JsonOptions, cancellationToken);
        var rawContent = completion?.Choices?.FirstOrDefault()?.Message?.Content;

        return ParseAnalogies(rawContent, request.Sections.Count);
    }

    private static string BuildUserPrompt(AnalogyRequest request)
    {
        var interests = request.Interests.Count > 0 ? string.Join(", ", request.Interests) : "(nenhum interesse especifico informado)";
        var notes = string.IsNullOrWhiteSpace(request.AdditionalNotes)
            ? string.Empty
            : $"Notas adicionais do aluno sobre si mesmo: {request.AdditionalNotes}\n\n";

        var sections = new StringBuilder();
        for (var i = 0; i < request.Sections.Count; i++)
            sections.Append($"[Seção {i + 1}]\n{request.Sections[i]}\n\n");

        return
            $"Interesses do aluno: {interests}\n\n" +
            notes +
            $"Seções do texto (na ordem):\n\n{sections}" +
            $"Escreva uma analogia para cada uma das {request.Sections.Count} seções acima, nessa ordem.";
    }

    /// <summary>Nunca inventa/completa analogias faltando se a IA responder fora do formato ou com a quantidade errada - ExternalServiceException, mesma decisao de GroqContentEvaluationService.</summary>
    private static IReadOnlyList<string> ParseAnalogies(string? rawContent, int expectedCount)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
        {
            throw new ExternalServiceException(
                "analogias_ia_formato_invalido", "O servico de geracao de analogias nao retornou nenhum conteudo.");
        }

        GroqAnalogiesPayload? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<GroqAnalogiesPayload>(rawContent, JsonOptions);
        }
        catch (JsonException)
        {
            throw new ExternalServiceException(
                "analogias_ia_formato_invalido", "O servico de geracao de analogias retornou um formato inesperado (JSON invalido).");
        }

        if (parsed?.Analogies is null || parsed.Analogies.Count != expectedCount || parsed.Analogies.Any(string.IsNullOrWhiteSpace))
        {
            throw new ExternalServiceException(
                "analogias_ia_formato_invalido",
                $"O servico de geracao de analogias retornou uma quantidade inesperada (esperava {expectedCount}).");
        }

        return parsed.Analogies;
    }

    private record GroqAnalogiesPayload(List<string>? Analogies);

    private record GroqChatCompletionResponse(List<GroqChatChoice>? Choices);

    private record GroqChatChoice(GroqChatMessage? Message);

    private record GroqChatMessage(string? Content);
}
