using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Assistant;

/// <summary>
/// Caso de uso do Suporte Rapido de IA (Fase 32, botao flutuante durante a sessao - ver
/// secret/rascunhos/visual-ui-ux.md). `Context` vem pronto do frontend (o que ja esta na tela:
/// titulo/trecho da leitura em andamento, enunciado da atividade, especificacao do projeto semanal
/// - ver frontend/src/lib/studyAssistantContext.ts) - este caso de uso nunca busca Daily/Weekly/
/// CuratedContent por conta propria, so valida/trunca e repassa. Isso evita duplicar toda a logica
/// de posse/autorizacao que ja rodou quando o frontend buscou esses dados nos proprios endpoints
/// (GetDailyStateUseCase, GetCuratedContentUseCase, GetWeeklyDetailUseCase etc).
///
/// `History` (Fase 33, revisao da decisao original da Fase 32 - ver IStudyAssistantService): o
/// frontend manda o transcript local da conversa aberta no painel; este caso de uso clampa pra so
/// as ultimas `MaxHistoryMessages` mensagens antes de repassar - nunca memoria ilimitada, so o
/// suficiente pra uma pergunta de seguimento ("explica melhor", "e esse aí?") continuar fazendo
/// sentido sem o aluno precisar repetir o assunto toda vez.
/// </summary>
public class AskStudyAssistantUseCase
{
    // Pergunta curta de proposito (design do rascunho: "impedindo que o usuario se perca em
    // dialogos longos") - nao e um campo de redacao.
    internal const int MaxQuestionLength = 500;

    // Contexto pode ser um trecho de leitura/especificacao de projeto inteiros - bem maior que a
    // pergunta, mas ainda limitado pra nao estourar o prompt (custo/latencia da Groq).
    internal const int MaxContextLength = 6000;

    // ~4 trocas (pergunta+resposta) - historico CURTO de proposito (Fase 33): o suficiente pra um
    // seguimento imediato nao perder o fio, sem virar memoria de conversa longa (o design original
    // da Fase 32 ainda vale pra isso - ver doc da classe).
    internal const int MaxHistoryMessages = 8;

    // Resposta da IA pode passar dos 500 chars da pergunta do aluno (MaxQuestionLength acima) - teto
    // proprio pra nao deixar 1 resposta antiga longa dominar o prompt sozinha.
    internal const int MaxHistoryMessageLength = 800;

    private readonly IUserRepository _userRepository;
    private readonly IStudyAssistantService _assistantService;

    public AskStudyAssistantUseCase(IUserRepository userRepository, IStudyAssistantService assistantService)
    {
        _userRepository = userRepository;
        _assistantService = assistantService;
    }

    public async Task<string> ExecuteAsync(
        Guid userId, string question, string? context, IReadOnlyList<StudyAssistantChatTurn>? history, CancellationToken cancellationToken = default)
    {
        var trimmedQuestion = (question ?? string.Empty).Trim();
        if (trimmedQuestion.Length == 0)
            throw new ValidationException("pergunta_obrigatoria", "Digite uma pergunta antes de enviar.");
        if (trimmedQuestion.Length > MaxQuestionLength)
            throw new ValidationException("pergunta_muito_longa", $"A pergunta pode ter no maximo {MaxQuestionLength} caracteres.");

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);

        var request = new StudyAssistantRequest(
            trimmedQuestion, Truncate(context, MaxContextLength), ClampHistory(history), user?.Interests, user?.AdditionalProfileNotes);

        return await _assistantService.AskAsync(request, cancellationToken);
    }

    internal static string? Truncate(string? text, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var trimmed = text.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    /// <summary>So as ultimas MaxHistoryMessages entradas (mais recentes primeiro descartadas de fora - a ordem cronologica original e preservada dentro do que sobra), cada `Content` truncado em MaxHistoryMessageLength - entradas vazias/so espaco sao descartadas (nunca viram um turno "" no prompt).</summary>
    internal static IReadOnlyList<StudyAssistantChatTurn> ClampHistory(IReadOnlyList<StudyAssistantChatTurn>? history)
    {
        if (history is null || history.Count == 0) return [];

        return history
            .Where(turn => !string.IsNullOrWhiteSpace(turn.Content))
            .TakeLast(MaxHistoryMessages)
            .Select(turn => turn with { Content = Truncate(turn.Content, MaxHistoryMessageLength)! })
            .ToList();
    }
}
