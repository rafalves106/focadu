using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Assistant;

/// <summary>
/// Caso de uso do Suporte Rapido de IA (Fase 32, botao flutuante durante a sessao - ver
/// secret/rascunhos/visual-ui-ux.md). Sem historico de conversa/persistencia de proposito: o
/// rascunho pede "interacoes curtas e diretas", entao cada pergunta e independente - o frontend
/// mostra o historico local da conversa so pra referencia visual do aluno dentro da mesma sessao,
/// nunca reenvia turnos anteriores. `Context` vem pronto do frontend (o que ja esta na tela: titulo/
/// trecho da leitura em andamento, enunciado da atividade, especificacao do projeto semanal - ver
/// frontend/src/lib/studyAssistantContext.ts) - este caso de uso nunca busca Daily/Weekly/
/// CuratedContent por conta propria, so valida/trunca e repassa. Isso evita duplicar toda a logica
/// de posse/autorizacao que ja rodou quando o frontend buscou esses dados nos proprios endpoints
/// (GetDailyStateUseCase, GetCuratedContentUseCase, GetWeeklyDetailUseCase etc).
/// </summary>
public class AskStudyAssistantUseCase
{
    // Pergunta curta de proposito (design do rascunho: "impedindo que o usuario se perca em
    // dialogos longos") - nao e um campo de redacao.
    internal const int MaxQuestionLength = 500;

    // Contexto pode ser um trecho de leitura/especificacao de projeto inteiros - bem maior que a
    // pergunta, mas ainda limitado pra nao estourar o prompt (custo/latencia da Groq).
    internal const int MaxContextLength = 6000;

    private readonly IUserRepository _userRepository;
    private readonly IStudyAssistantService _assistantService;

    public AskStudyAssistantUseCase(IUserRepository userRepository, IStudyAssistantService assistantService)
    {
        _userRepository = userRepository;
        _assistantService = assistantService;
    }

    public async Task<string> ExecuteAsync(Guid userId, string question, string? context, CancellationToken cancellationToken = default)
    {
        var trimmedQuestion = (question ?? string.Empty).Trim();
        if (trimmedQuestion.Length == 0)
            throw new ValidationException("pergunta_obrigatoria", "Digite uma pergunta antes de enviar.");
        if (trimmedQuestion.Length > MaxQuestionLength)
            throw new ValidationException("pergunta_muito_longa", $"A pergunta pode ter no maximo {MaxQuestionLength} caracteres.");

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);

        var request = new StudyAssistantRequest(
            trimmedQuestion, Truncate(context, MaxContextLength), user?.Interests, user?.AdditionalProfileNotes);

        return await _assistantService.AskAsync(request, cancellationToken);
    }

    internal static string? Truncate(string? text, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var trimmed = text.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }
}
