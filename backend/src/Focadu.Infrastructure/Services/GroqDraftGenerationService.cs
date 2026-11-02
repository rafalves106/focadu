using System.Net.Http.Json;
using System.Text.Json;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter concreto de IDraftGenerationService via Groq (chat completion) - mesmo HttpClient/
/// GroqOptions de GroqContentEvaluationService (Fase 5), mas sem JSON mode: aqui so texto livre
/// (o rascunho de post do LinkedIn), sem Score/Feedback pra validar.
/// </summary>
public class GroqDraftGenerationService : IDraftGenerationService
{
    private const string Model = "openai/gpt-oss-120b"; // mesmo modelo de GroqContentEvaluationService - ver nota la sobre o catalogo da Groq mudar.

    // Fase 107: JSON mode - o post e os textos da imagem de conclusao da semana numa chamada so.
    private const string SystemPrompt =
        "Você escreve posts de LinkedIn em português, em primeira pessoa, tom pessoal e direto " +
        "(nunca corporativo/genérico), para um aluno da Focadu compartilhando o que aprendeu numa " +
        "semana de estudos. Responda APENAS com um objeto JSON, em português, com as chaves: " +
        "\"post\" (o texto do post, sem markdown), " +
        "\"destaques\" (lista com exatamente 3 frases curtas, de até 70 caracteres cada, sobre o que eu aprendi, " +
        "sem ponto final, para uma imagem) e " +
        "\"projeto\" (nome curto do projeto que entreguei, até 50 caracteres, ou string vazia se não houver projeto).";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly GroqOptions _options;

    public GroqDraftGenerationService(HttpClient httpClient, GroqOptions options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    public async Task<GeneratedLinkedInDraft> GenerateAsync(string prompt, CancellationToken cancellationToken = default)
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
            temperature = 0.7,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new { role = "system", content = SystemPrompt },
                new { role = "user", content = prompt },
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
                "groq_timeout", "A geracao do rascunho demorou demais para responder - tente novamente.", statusCode: 503);
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
        var text = completion?.Choices?.FirstOrDefault()?.Message?.Content;

        if (string.IsNullOrWhiteSpace(text))
        {
            throw new ExternalServiceException(
                "groq_geracao_vazia", "O servico de geracao de texto nao retornou nenhum conteudo.");
        }

        return Parse(text);
    }

    private static GeneratedLinkedInDraft Parse(string json)
    {
        DraftJson? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<DraftJson>(json, JsonOptions);
        }
        catch (JsonException)
        {
            throw new ExternalServiceException("groq_resposta_invalida", "O servico de geracao de texto devolveu uma resposta fora do formato esperado.");
        }

        if (string.IsNullOrWhiteSpace(parsed?.Post))
            throw new ExternalServiceException("groq_geracao_vazia", "O servico de geracao de texto nao retornou nenhum conteudo.");

        return new GeneratedLinkedInDraft(
            parsed.Post.Trim(),
            parsed.Destaques?.Where(d => !string.IsNullOrWhiteSpace(d)).Select(d => d.Trim()).ToList() ?? [],
            string.IsNullOrWhiteSpace(parsed.Projeto) ? null : parsed.Projeto.Trim());
    }

    private record DraftJson(string? Post, List<string>? Destaques, string? Projeto);

    private record GroqChatCompletionResponse(List<GroqChatChoice>? Choices);

    private record GroqChatChoice(GroqChatMessage? Message);

    private record GroqChatMessage(string? Content);
}
