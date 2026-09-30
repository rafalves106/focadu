using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter concreto de IAnalogyGenerationService via Groq (chat completion, JSON mode - mesmo
/// formato de GroqContentEvaluationService/GroqProjectEvaluationService) - gera 1 analogia por
/// secao do Reading (Fase 21/22). Pede as N analogias numa unica chamada (nao 1 chamada por secao)
/// pra IA ver o texto inteiro de contexto e variar o cenario entre secoes, em vez de repetir a
/// mesma analogia.
/// Fase 47: o interesse/hobby do aluno deixou de ser o eixo obrigatorio da analogia - so entra quando
/// reproduz o mecanismo da secao elemento por elemento; na duvida, cenario universal do cotidiano.
/// Antes, o prompt "conecte um interesse do aluno ao conceito" fazia o modelo inventar mecanicas de
/// jogo pra caber (ex: "lista de bans do CS" pra explicar OCSP) - ver docs/fase-47/.
/// </summary>
public class GroqAnalogyGenerationService : IAnalogyGenerationService
{
    private const string Model = "openai/gpt-oss-120b"; // mesmo modelo dos outros adapters Groq - ver nota em GroqContentEvaluationService sobre o catalogo mudar.

    private const string SystemPromptTemplate =
        "Você ajuda alunos {plataforma} a entender conceitos técnicos através de " +
        "analogias curtas e realistas. Você recebe um texto técnico dividido em seções numeradas e " +
        "os interesses do aluno. Para CADA seção, escreva uma analogia de no máximo 3 frases curtas " +
        "(cerca de 50 palavras), sempre em português do Brasil (mesmo que o interesse ou o termo " +
        "técnico citado seja em inglês), seguindo estas regras: " +
        "(1) O mecanismo técnico vem primeiro. A analogia precisa reproduzir o funcionamento real " +
        "do conceito central DAQUELA seção: cada elemento do cenário corresponde a um elemento real " +
        "(ex.: carta = pacote, endereço no envelope = destino) e a relação entre eles funciona do " +
        "mesmo jeito. Se a analogia sugerir um funcionamento diferente do real, descarte e escolha " +
        "outro cenário. " +
        "(2) Os interesses e hobbies do aluno são a fonte PREFERIDA das analogias - é por isso que ele " +
        "os informou. Em cada seção, procure PRIMEIRO, entre os interesses dele, uma situação real " +
        "cujo funcionamento reproduza o mecanismo da seção elemento por elemento (ex.: pra quem " +
        "cozinha, a receita que diz a ordem dos passos; pra quem joga futebol, o juiz que só valida " +
        "o gol depois de conferir o impedimento). Varie os interesses entre as seções. Use apenas " +
        "aspectos verdadeiros e conhecidos do interesse: nunca invente regras, mecânicas ou " +
        "detalhes para a analogia caber. " +
        "(3) Só quando NENHUM interesse reproduzir o mecanismo sem distorcer, use um cenário " +
        "universal do cotidiano: correio e cartas, portaria de prédio, chaves e fechaduras, " +
        "cofres, trânsito urbano simples, filas, listas telefônicas. Isso é sempre melhor do que uma " +
        "analogia forçada. Exemplo do que NÃO fazer: explicar o handshake TCP com a fila de entrada " +
        "de uma partida de um jogo (o jogo não funciona assim e a analogia induz um modelo errado). " +
        "Exemplo do que fazer: uma ligação telefônica (\"alô, está me ouvindo?\" / \"estou, e você?\" " +
        "/ \"também\") reproduz os três passos do handshake. " +
        "(4) Um único cenário simples por seção, com poucos elementos e sem enredo; se a analogia " +
        "precisar de mais de 3 frases, ela está complexa demais. Tom sóbrio e realista: sem " +
        "exageros, humor, personagens fantasiosos ou comparações absurdas. " +
        "(5) Varie o cenário entre as seções e nunca repita a mesma analogia. Não repita nem " +
        "resuma o texto técnico da seção: só complemente com a analogia. " +
        "Responda SEMPRE em JSON estrito, exatamente neste formato: " +
        "{\"analogies\": [\"<analogia da seção 1>\", \"<analogia da seção 2>\", ...]} " +
        "- um item por seção recebida, na MESMA ordem e MESMA quantidade. Não inclua nenhum texto " +
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
            temperature = 0.4, // Fase 47: era 0.8 - criatividade alta empurrava o modelo a forcar o interesse do aluno em cenarios que nao mapeiam o mecanismo.
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new { role = "system", content = BuildSystemPrompt(request.CourseName) },
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

    /// <summary>Fase 85: o prompt cita o curso do conteudo (antes: sempre "alunos de seguranca web").</summary>
    internal static string BuildSystemPrompt(string? courseName) =>
        SystemPromptTemplate.Replace("{plataforma}", CoursePromptText.Platform(courseName));

    /// <summary>
    /// Fase 86: as etiquetas de interesse e o texto livre do perfil ("Referencias, hobbies, o que quiser...")
    /// entram juntos como interesses - o dono tinha "Academia, Motos, Carros, Rock" so no texto livre (as
    /// etiquetas fixas nao tem nada disso) e o prompt dizia "nenhum interesse informado".
    /// </summary>
    internal static string BuildUserPrompt(AnalogyRequest request)
    {
        var parts = request.Interests.Where(i => !string.IsNullOrWhiteSpace(i)).Select(i => i.Trim()).ToList();
        if (!string.IsNullOrWhiteSpace(request.AdditionalNotes)) parts.Add(request.AdditionalNotes.Trim());
        var interests = parts.Count > 0 ? string.Join("; ", parts) : "(nenhum informado)";

        var sections = new StringBuilder();
        for (var i = 0; i < request.Sections.Count; i++)
            sections.Append($"[Seção {i + 1}]\n{request.Sections[i]}\n\n");

        return
            $"Interesses e hobbies do aluno (o que ele escreveu no perfil): {interests}\n\n" +
            $"Seções do texto (na ordem):\n\n{sections}" +
            $"Escreva uma analogia para cada uma das {request.Sections.Count} seções acima, nessa ordem. " +
            "Em cada seção, tente primeiro um dos interesses e hobbies acima; só use um cenário universal do cotidiano se nenhum reproduzir o mecanismo sem distorcer. " +
            "Escreva todas as analogias em português do Brasil.";
    }

    /// <summary>Nunca inventa/completa analogias faltando se a IA responder fora do formato ou com a quantidade errada - ExternalServiceException, mesma decisao de GroqContentEvaluationService.</summary>
    internal static IReadOnlyList<string> ParseAnalogies(string? rawContent, int expectedCount)
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

        // Fase 48: o modelo as vezes ignora "responda em portugues" e devolve tudo em ingles (visto ao
        // vivo no dia 5, e ja registrado na Fase 38b). Como PersonalizedAnalogy e gravado uma vez e nunca
        // reavaliado, uma resposta em ingles ficaria pra sempre - entao e rejeitada aqui: nada e gravado,
        // a leitura abre sem analogias dessa vez (GetCuratedContentUseCase captura a excecao) e a proxima
        // abertura tenta de novo.
        if (parsed.Analogies.Any(LooksEnglish))
        {
            throw new ExternalServiceException(
                "analogias_ia_idioma_invalido",
                "O servico de geracao de analogias respondeu em ingles - descartado, nada foi gravado em cache.");
        }

        return parsed.Analogies;
    }

    // Palavras funcionais que so existem em ingles. Deliberadamente sem "a", "as", "in", "on", "it", "an"
    // (existem em portugues ou aparecem em termos tecnicos) - termos como "man-in-the-middle" contam no
    // maximo 1, e o detector so dispara com 3 ou mais E mais que as palavras funcionais do portugues.
    private static readonly Regex EnglishFunctionWords = new(
        @"\b(the|and|is|are|of|to|with|that|which|from|when|where|only|every|each|any|into|its|like|just|not)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex PortugueseFunctionWords = new(
        @"\b(de|que|o|os|e|do|da|dos|das|em|um|uma|para|com|não|por|se|na|no|ao|é)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    internal static bool LooksEnglish(string text)
    {
        var english = EnglishFunctionWords.Matches(text).Count;
        return english >= 3 && english > PortugueseFunctionWords.Matches(text).Count;
    }

    private record GroqAnalogiesPayload(List<string>? Analogies);

    private record GroqChatCompletionResponse(List<GroqChatChoice>? Choices);

    private record GroqChatChoice(GroqChatMessage? Message);

    private record GroqChatMessage(string? Content);
}
