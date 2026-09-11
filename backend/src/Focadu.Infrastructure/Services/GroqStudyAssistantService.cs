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
///
/// Fase 33: monta uma lista de `messages` de verdade (system + contexto/personalizacao como
/// mensagem de sistema propria, ja que valem a conversa inteira, nao so o ultimo turno + historico
/// curto de StudyAssistantRequest.History + a pergunta atual) em vez do "1 system + 1 user com tudo
/// junto" da Fase 32 - precisa disso pra o modelo enxergar os turnos anteriores como turnos de
/// verdade (nao texto narrado dentro de uma unica mensagem).
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
        "(é o que o aluno está vendo na tela agora) em vez de generalidades - mas se as mensagens " +
        "anteriores da conversa já tiverem estreitado o assunto pra algo mais específico dentro " +
        "desse contexto, mantenha o foco nesse assunto específico em vez de voltar a falar do " +
        "contexto inteiro. Se a pergunta for sobre segurança web/o curso mas fora do contexto " +
        "dado, responda mesmo assim com seu conhecimento geral do assunto. Se for claramente " +
        "sobre outra coisa (não é sobre o curso nem sobre estudar), responda rapidamente se for " +
        "trivial ou, se não souber, diga que não sabe - e sempre encerre reconduzindo com " +
        "gentileza pro foco da sessão. Nunca invente fatos técnicos com confiança quando não " +
        "tiver certeza: prefira dizer que não tem certeza a arriscar uma explicação errada de " +
        "segurança. Nunca use markdown pesado (sem títulos, sem blocos de código longos) - texto " +
        "corrido simples, é uma bolha de chat pequena.";

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
            messages = BuildMessages(request),
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

    /// <summary>
    /// system (persona) + system (contexto da sessao/personalizacao, quando houver - valem a
    /// conversa inteira, entao ficam fora do turno atual) + 1 mensagem user/assistant por item de
    /// `History` (ja clampado por AskStudyAssistantUseCase, ordem cronologica) + a pergunta atual
    /// como ultimo turno "user". `List&lt;object&gt;` (nao array) porque o tamanho varia com
    /// `History`.
    /// </summary>
    private static List<object> BuildMessages(StudyAssistantRequest request)
    {
        var messages = new List<object> { new { role = "system", content = SystemPrompt } };

        var contextAndPersonalization = BuildContextSystemMessage(request);
        if (contextAndPersonalization is not null)
            messages.Add(new { role = "system", content = contextAndPersonalization });

        foreach (var turn in request.History ?? [])
            messages.Add(new { role = turn.FromUser ? "user" : "assistant", content = turn.Content });

        messages.Add(new { role = "user", content = request.Question });
        return messages;
    }

    private static string? BuildContextSystemMessage(StudyAssistantRequest request)
    {
        var contextBlock = string.IsNullOrWhiteSpace(request.SessionContext)
            ? null
            : $"Contexto da sessão atual (o que o aluno está vendo na tela agora):\n\"\"\"\n{request.SessionContext}\n\"\"\"";

        var personalization = PersonalizationPromptBuilder.BuildInstruction(request.UserInterests, request.UserNotes);

        if (contextBlock is null && personalization is null) return null;
        return string.Join("\n\n", new[] { contextBlock, personalization }.Where(block => block is not null));
    }

    private record GroqChatCompletionResponse(List<GroqChatChoice>? Choices);

    private record GroqChatChoice(GroqChatMessage? Message);

    private record GroqChatMessage(string? Content);
}
