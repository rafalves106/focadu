using System.Net.Http.Json;
using System.Text.Json;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Shared;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter concreto de IStudyAssistantService via Groq (chat completion) - mesmo HttpClient/
/// GroqOptions dos outros adapters Groq (Fase 5+), sem JSON mode (texto livre, mesmo estilo de
/// GroqDraftGenerationService): aqui a resposta E o texto mostrado pro aluno, nao ha campo
/// estruturado (Score/lista) pra validar.
/// </summary>
public class GroqStudyAssistantService : IStudyAssistantService
{
    private const string Model = "openai/gpt-oss-120b"; // mesmo modelo dos outros adapters Groq - ver nota em GroqContentEvaluationService sobre o catalogo mudar.

    private const string SystemPrompt =
        "Você é o Suporte Rápido de IA da Focadu, plataforma de estudo de segurança web (curso " +
        "Web Security). Um aluno te chama através de um botão flutuante DURANTE uma sessão de " +
        "estudo pra tirar uma dúvida pontual - o objetivo é ele voltar rápido pro foco, não " +
        "manter uma conversa longa. Responda SEMPRE em português, de forma curta e direta " +
        "(normalmente 2 a 4 frases; use uma lista curta só se a pergunta pedir passos/itens " +
        "concretos). Quando receber 'Contexto da sessão atual', priorize responder com base nele " +
        "(é o que o aluno está vendo na tela agora) em vez de generalidades. Se a pergunta for " +
        "sobre segurança web/o curso mas fora do contexto dado, responda mesmo assim com seu " +
        "conhecimento geral do assunto. Se for claramente sobre outra coisa (não é sobre o curso " +
        "nem sobre estudar), responda rapidamente se for trivial ou, se não souber, diga que não " +
        "sabe - e sempre encerre reconduzindo com gentileza pro foco da sessão. Nunca invente fatos " +
        "técnicos com confiança quando não tiver certeza: prefira dizer que não tem certeza a " +
        "arriscar uma explicação errada de segurança. Nunca use markdown pesado (sem títulos, sem " +
        "blocos de código longos) - texto corrido simples, é uma bolha de chat pequena.";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly GroqOptions _options;

    public GroqStudyAssistantService(HttpClient httpClient, GroqOptions options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    public async Task<string> AskAsync(StudyAssistantRequest request, CancellationToken cancellationToken = default)
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
            temperature = 0.4,
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
                "assistente_ia_timeout", "O suporte de IA demorou demais para responder - tente novamente.", statusCode: 503);
        }
        catch (HttpRequestException ex)
        {
            throw new ExternalServiceException(
                "assistente_ia_indisponivel", $"Nao foi possivel conectar ao suporte de IA: {ex.Message}");
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new ExternalServiceException(
                "assistente_ia_falhou", $"O suporte de IA respondeu com erro ({(int)response.StatusCode}): {body}");
        }

        var completion = await response.Content.ReadFromJsonAsync<GroqChatCompletionResponse>(JsonOptions, cancellationToken);
        var text = completion?.Choices?.FirstOrDefault()?.Message?.Content;

        if (string.IsNullOrWhiteSpace(text))
        {
            throw new ExternalServiceException(
                "assistente_ia_resposta_vazia", "O suporte de IA nao retornou nenhuma resposta.");
        }

        return text.Trim();
    }

    private static string BuildUserPrompt(StudyAssistantRequest request)
    {
        var contextBlock = string.IsNullOrWhiteSpace(request.SessionContext)
            ? string.Empty
            : $"Contexto da sessão atual (o que o aluno está vendo na tela agora):\n\"\"\"\n{request.SessionContext}\n\"\"\"\n\n";

        var personalization = PersonalizationPromptBuilder.BuildInstruction(request.UserInterests, request.UserNotes);
        var personalizationBlock = personalization is null ? string.Empty : $"{personalization}\n\n";

        return $"{contextBlock}{personalizationBlock}Pergunta do aluno: {request.Question}";
    }

    private record GroqChatCompletionResponse(List<GroqChatChoice>? Choices);

    private record GroqChatChoice(GroqChatMessage? Message);

    private record GroqChatMessage(string? Content);
}
