using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter de INotesReviewService via Groq (Fase 78, revisao por IA do Caderninho) - mesmo
/// HttpClient/GroqOptions/formato de GroqProjectEvaluationService, prompt proprio. Formativo por
/// decisao do dono: aponta o que esta bom, o que falta e se confere com o material, sem nota, sem
/// reescrever as notas e sem entregar a resposta pronta (principio "contra a resposta fácil de IA").
/// Resposta fora do formato vira ExternalServiceException (502), nunca uma revisao inventada.
/// </summary>
public class GroqNotesReviewService : INotesReviewService
{
    private const string Model = "openai/gpt-oss-120b"; // mesmo modelo dos outros adapters Groq.

    private const string SystemPrompt =
        "Você é a Focada, mentora da Focadu, plataforma de estudo de segurança web. Você revisa as " +
        "anotações que um aluno fez sobre um dia de estudo, comparando com o material daquele dia. " +
        "É uma revisão formativa, não uma nota. Regras: fale direto com o aluno, em português do " +
        "Brasil, frases curtas; não reescreva as anotações dele; não entregue a explicação completa " +
        "do que falta - aponte o que falta e onde reler no material (cite o título da seção). Se algo " +
        "anotado contradiz o material, diga o que e onde conferir. Se as anotações forem pouquinhas, " +
        "diga isso sem ser duro. Responda SEMPRE em JSON estrito, exatamente neste formato: " +
        "{\"bom\": \"<1 a 2 frases: o que o aluno registrou bem>\", \"falta\": \"<1 a 2 frases: no " +
        "máximo os 2 pontos mais importantes que ficaram de fora ou rasos, com onde reler>\", \"material\": \"<1 a 2 frases: se o que foi " +
        "anotado confere com o material; se não confere, o quê e onde conferir>\"}. Não inclua " +
        "nenhum texto fora desse JSON.";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly GroqOptions _options;

    public GroqNotesReviewService(HttpClient httpClient, GroqOptions options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    public async Task<NotesReviewResult> ReviewAsync(NotesReviewRequest request, CancellationToken cancellationToken = default)
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
            temperature = 0.3,
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
                "groq_timeout", "A revisao demorou demais para responder - tente novamente.", statusCode: 503);
        }
        catch (HttpRequestException ex)
        {
            throw new ExternalServiceException("groq_indisponivel", $"Nao foi possivel conectar ao servico de revisao: {ex.Message}");
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new ExternalServiceException(
                "groq_revisao_falhou", $"O servico de revisao respondeu com erro ({(int)response.StatusCode}): {body}");
        }

        var completion = await response.Content.ReadFromJsonAsync<GroqChatCompletionResponse>(JsonOptions, cancellationToken);
        return ParseReview(completion?.Choices?.FirstOrDefault()?.Message?.Content);
    }

    internal static string BuildUserPrompt(NotesReviewRequest request)
    {
        var notes = new StringBuilder();
        for (var i = 0; i < request.Notes.Count; i++)
            notes.Append($"Anotação {i + 1}:\n{request.Notes[i]}\n\n");

        return
            $"Dia de estudo: {request.DayTitle}\n\n" +
            $"Material do dia:\n\"\"\"\n{request.Material}\n\"\"\"\n\n" +
            $"Anotações do aluno sobre este dia:\n\"\"\"\n{notes.ToString().TrimEnd()}\n\"\"\"\n\n" +
            "Revise as anotações seguindo as regras.";
    }

    private static NotesReviewResult ParseReview(string? rawContent)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
            throw new ExternalServiceException("revisao_ia_formato_invalido", "O servico de revisao nao retornou nenhum conteudo.");

        GroqReviewPayload? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<GroqReviewPayload>(rawContent, JsonOptions);
        }
        catch (JsonException)
        {
            throw new ExternalServiceException("revisao_ia_formato_invalido", "O servico de revisao retornou um formato inesperado (JSON invalido).");
        }

        if (string.IsNullOrWhiteSpace(parsed?.Bom) || string.IsNullOrWhiteSpace(parsed.Falta) || string.IsNullOrWhiteSpace(parsed.Material))
            throw new ExternalServiceException("revisao_ia_formato_invalido", "O servico de revisao retornou um formato inesperado (campos ausentes).");

        return new NotesReviewResult(parsed.Bom.Trim(), parsed.Falta.Trim(), parsed.Material.Trim());
    }

    private record GroqReviewPayload(string? Bom, string? Falta, string? Material);

    private record GroqChatCompletionResponse(List<GroqChatChoice>? Choices);

    private record GroqChatChoice(GroqChatMessage? Message);

    private record GroqChatMessage(string? Content);
}
