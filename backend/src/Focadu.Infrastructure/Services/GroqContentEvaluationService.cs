using System.Net.Http.Json;
using System.Text.Json;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Shared;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter concreto de IContentEvaluationService via Groq (chat completion, formato compativel
/// com a OpenAI). Pede 1 score unico (0-100, ja ponderando conteudo + clareza) e 1 feedback curto
/// em JSON mode - decisao confirmada na Fase 5 (ver docs/ARQUITETURA.md pro raciocinio do prompt).
/// Resposta malformada (JSON invalido, campos ausentes, score fora de 0-100) sempre vira
/// ExternalServiceException (502) - nunca uma nota inventada.
///
/// Fase 42 (bug real relatado ao vivo: mesmo apos a correcao da Fase 39, um erro de transcricao
/// que troca um termo tecnico pelo seu antonimo foneticamente parecido - ex. "simetrica" por
/// "assimetrica" - continuava derrubando a nota injustamente): a correcao da transcricao virou uma
/// CHAMADA GROQ SEPARADA da nota (antes eram uma unica chamada, decisao da Fase 39 por custo/
/// latencia). Verificado ao vivo contra a API real que, numa unica chamada, o modelo e cauteloso
/// demais pra trocar uma palavra tecnicamente valida mesmo quando ela contradiz sozinha o resto de
/// uma resposta coerente - so numa chamada dedicada, sem competir atencao com o calculo da nota, o
/// modelo identifica e corrige essa troca de forma confiavel. Custo extra (2 chamadas por
/// submissao) e desprezivel pro volume de uso da Focadu.
///
/// Fase 42 tambem corrigiu um 2o problema achado no mesmo bug ao vivo: a nota penalizava o aluno
/// por nao cobrir topicos do ExpectedAnswer (conteudo curado inteiro, que pode ter mais de uma
/// secao) que a Instrucao da atividade nunca pediu. Quando ContextText (Instrucao) esta presente,
/// a nota agora mede completude em relacao ao que foi pedido, nao ao conteudo de referencia
/// inteiro - o conteudo de referencia continua servindo pra checar se o que foi dito esta correto.
/// </summary>
public class GroqContentEvaluationService : IContentEvaluationService
{
    // ponytail: Groq muda o catalogo de modelos com frequencia - llama-3.3-70b-versatile (escolha
    // original) saiu de linha e foi substituido por este apos validacao ao vivo com uma chave
    // real (Fase 5). Se "model_not_found" voltar a aparecer, checar o catalogo atual em
    // GET https://api.groq.com/openai/v1/models antes de trocar de novo.
    private const string Model = "openai/gpt-oss-120b";

    private const string CorrectionSystemPrompt =
        "Você revisa transcrições automáticas (Whisper) de resumos falados por alunos da Focadu, " +
        "plataforma de estudo de segurança web, usando o conteúdo de referência como vocabulário " +
        "técnico correto. Sua ÚNICA tarefa é identificar e corrigir trechos que são quase " +
        "certamente erro de reconhecimento de fala - nunca um erro conceitual real do aluno (isso " +
        "é conteúdo, não transcrição, e deve pesar na nota depois, não ser mascarado aqui). " +
        "Preserve literalmente tudo o mais: nunca complete, reescreva ou adicione ideias que o " +
        "aluno não disse. O sinal mais comum e mais perigoso de erro de transcrição: um par de " +
        "termos técnicos antônimos e foneticamente parecidos do conteúdo de referência (ex.: " +
        "simétrica/assimétrica, público/privado, criptografado/descriptografado) usado de forma " +
        "correta e consistente ao longo de quase todo o texto, mas trocado uma única vez, de " +
        "forma isolada e sem nenhuma explicação nova, contradizendo a distinção que o próprio " +
        "aluno já deixou clara antes - nesse caso o termo isolado quase certamente é ruído de " +
        "transcrição, mesmo sendo uma palavra tecnicamente válida, e deve ser corrigido para " +
        "manter a coerência com o resto da resposta. Não corrija quando a mesma confusão aparecer " +
        "de forma consistente ao longo do texto (aí é erro real do aluno, não toque). Responda " +
        "SEMPRE em JSON estrito, exatamente neste formato: {\"correctedTranscript\": " +
        "\"<transcrição revisada, ou idêntica à original se nada precisava de correção>\"}. Não " +
        "inclua nenhum texto fora desse JSON.";

    private const string GradingSystemPrompt =
        "Você é um avaliador pedagógico da Focadu, plataforma de estudo de segurança web. Avalie " +
        "se o resumo falado pelo aluno (já transcrito e revisado) demonstra compreensão correta " +
        "do conteúdo de referência, e a clareza com que foi comunicado. Responda SEMPRE em JSON " +
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

        try
        {
            var correctedTranscript = await CorrectTranscriptAsync(request, cancellationToken);
            var (score, feedback) = await GradeAsync(request, correctedTranscript, cancellationToken);
            return new ContentEvaluationResult(score, feedback, correctedTranscript);
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
        catch (HttpRetry.HttpStatusException ex)
        {
            throw new ExternalServiceException(
                "groq_avaliacao_falhou", $"O servico de avaliacao respondeu com erro ({(int)ex.StatusCode}): {ex.Body}");
        }
    }

    /// <summary>
    /// Correcao e um passo aditivo (best-effort), nao um requisito pra avaliar - se a IA nao
    /// devolver um JSON valido mesmo apos o orcamento de retry do HttpRetry, cai pra transcricao
    /// bruta em vez de falhar a submissao inteira por causa de um passo que so existe pra evitar
    /// injustica, nunca pra bloquear. Falha de transporte (timeout, HTTP 5xx/429 esgotado) nao cai
    /// aqui - sobe pro catch de EvaluateAsync, porque nesse caso a Groq esta indisponivel e a
    /// chamada de nota logo depois falharia do mesmo jeito.
    /// </summary>
    private async Task<string> CorrectTranscriptAsync(ContentEvaluationRequest request, CancellationToken cancellationToken)
    {
        var payload = new
        {
            model = Model,
            temperature = 0.2,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new { role = "system", content = CorrectionSystemPrompt },
                new { role = "user", content = BuildCorrectionUserPrompt(request) },
            },
        };

        try
        {
            return await HttpRetry.RunAsync(
                () => CorrectOnceAsync(payload, cancellationToken),
                ex => HttpRetry.IsTransientFailure(ex, cancellationToken)
                    || ex is ExternalServiceException { Code: "avaliacao_ia_formato_invalido" },
                cancellationToken);
        }
        catch (ExternalServiceException ex) when (ex.Code == "avaliacao_ia_formato_invalido")
        {
            return request.UserAnswer;
        }
    }

    private async Task<string> CorrectOnceAsync<TPayload>(TPayload payload, CancellationToken cancellationToken)
    {
        var response = await _httpClient.PostAsJsonAsync("chat/completions", payload, cancellationToken);
        await HttpRetry.EnsureSuccessAsync(response, cancellationToken);

        var completion = await response.Content.ReadFromJsonAsync<GroqChatCompletionResponse>(JsonOptions, cancellationToken);
        var rawContent = completion?.Choices?.FirstOrDefault()?.Message?.Content;

        return ParseCorrection(rawContent);
    }

    private async Task<(int Score, string Feedback)> GradeAsync(
        ContentEvaluationRequest request, string correctedTranscript, CancellationToken cancellationToken)
    {
        var payload = new
        {
            model = Model,
            temperature = 0.2,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new { role = "system", content = GradingSystemPrompt },
                new { role = "user", content = BuildGradingUserPrompt(request, correctedTranscript) },
            },
        };

        return await HttpRetry.RunAsync(
            () => GradeOnceAsync(payload, cancellationToken),
            ex => HttpRetry.IsTransientFailure(ex, cancellationToken)
                || ex is ExternalServiceException { Code: "avaliacao_ia_formato_invalido" },
            cancellationToken);
    }

    private async Task<(int Score, string Feedback)> GradeOnceAsync<TPayload>(TPayload payload, CancellationToken cancellationToken)
    {
        var response = await _httpClient.PostAsJsonAsync("chat/completions", payload, cancellationToken);
        await HttpRetry.EnsureSuccessAsync(response, cancellationToken);

        var completion = await response.Content.ReadFromJsonAsync<GroqChatCompletionResponse>(JsonOptions, cancellationToken);
        var rawContent = completion?.Choices?.FirstOrDefault()?.Message?.Content;

        return ParseGrading(rawContent);
    }

    private static string BuildCorrectionUserPrompt(ContentEvaluationRequest request) =>
        $"Conteúdo de referência (vocabulário técnico correto):\n\"\"\"\n{request.ExpectedAnswer}\n\"\"\"\n\n" +
        $"Transcrição bruta do resumo falado pelo aluno:\n\"\"\"\n{request.UserAnswer}\n\"\"\"";

    private static string BuildGradingUserPrompt(ContentEvaluationRequest request, string correctedTranscript)
    {
        var instruction = string.IsNullOrWhiteSpace(request.ContextText)
            ? string.Empty
            : $"Instrução original da atividade: {request.ContextText}\n\n";

        // Fase 27: mesmo perfil que a Fase 21/22 ja usava so pra analogia de Leitura
        // (IAnalogyGenerationService) - aqui entra no FEEDBACK, nunca no calculo do Score (a nota
        // continua so sobre correcao/clareza, ver instrucao final abaixo).
        var personalization = PersonalizationPromptBuilder.BuildInstruction(request.UserInterests, request.UserNotes);
        var personalizationBlock = personalization is null ? string.Empty : $"{personalization}\n\n";

        // Fase 42: quando ha Instrucao separada, o ExpectedAnswer (conteudo curado inteiro) pode
        // cobrir mais topicos do que a atividade pediu - completude e medida contra a Instrucao,
        // nao contra o conteudo de referencia inteiro (que so serve pra checar se o que foi dito
        // esta correto). Sem Instrucao separada, o proprio ExpectedAnswer e o que foi pedido.
        var completenessTarget = string.IsNullOrWhiteSpace(request.ContextText)
            ? "à referência"
            : "ao que a instrução da atividade pediu - a referência pode cobrir mais tópicos do " +
              "que a instrução, e completude não deve ser cobrada além do que foi efetivamente pedido";

        return
            $"Conteúdo de referência que o aluno deveria ter estudado:\n\"\"\"\n{request.ExpectedAnswer}\n\"\"\"\n\n" +
            $"Resumo falado pelo aluno (já transcrito e revisado):\n\"\"\"\n{correctedTranscript}\n\"\"\"\n\n" +
            instruction +
            personalizationBlock +
            $"Avalie considerando: (1) se o conteúdo do resumo está correto e completo em relação " +
            $"{completenessTarget}; (2) a clareza da explicação (organização, precisão de linguagem). " +
            "Combine os dois aspectos numa única nota de 0 a 100. No feedback (nunca na nota), " +
            "conecte sua explicação a um interesse do aluno quando isso ajudar a fixar o conceito.";
    }

    private static string ParseCorrection(string? rawContent)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
        {
            throw new ExternalServiceException(
                "avaliacao_ia_formato_invalido", "O servico de correcao nao retornou nenhum conteudo.");
        }

        GroqCorrectionPayload? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<GroqCorrectionPayload>(rawContent, JsonOptions);
        }
        catch (JsonException)
        {
            throw new ExternalServiceException(
                "avaliacao_ia_formato_invalido", "O servico de correcao retornou um formato inesperado (JSON invalido).");
        }

        if (string.IsNullOrWhiteSpace(parsed?.CorrectedTranscript))
        {
            throw new ExternalServiceException(
                "avaliacao_ia_formato_invalido", "O servico de correcao retornou um formato inesperado (campo ausente).");
        }

        return parsed.CorrectedTranscript;
    }

    /// <summary>
    /// Nunca inventa uma nota se a IA responder algo fora do formato esperado - joga
    /// ExternalServiceException (502) com uma mensagem clara, em vez de deixar passar um Score
    /// forjado que ninguem validou.
    /// </summary>
    private static (int Score, string Feedback) ParseGrading(string? rawContent)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
        {
            throw new ExternalServiceException(
                "avaliacao_ia_formato_invalido", "O servico de avaliacao nao retornou nenhum conteudo.");
        }

        GroqGradingPayload? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<GroqGradingPayload>(rawContent, JsonOptions);
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

        return (parsed.Score.Value, parsed.Feedback);
    }

    private record GroqCorrectionPayload(string? CorrectedTranscript);

    private record GroqGradingPayload(int? Score, string? Feedback);

    private record GroqChatCompletionResponse(List<GroqChatChoice>? Choices);

    private record GroqChatChoice(GroqChatMessage? Message);

    private record GroqChatMessage(string? Content);
}
