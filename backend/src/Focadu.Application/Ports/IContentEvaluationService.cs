namespace Focadu.Application.Ports;

/// <summary>
/// Port para o servico externo (IA, ex: Groq) que avalia uma resposta livre (texto ou transcricao
/// de voz) contra o gabarito esperado de uma atividade. Sem implementacao concreta neste passo:
/// a implementacao real (chamada ao provedor de IA) e assunto de um prompt tecnico separado.
/// </summary>
public interface IContentEvaluationService
{
    Task<ContentEvaluationResult> EvaluateAsync(ContentEvaluationRequest request, CancellationToken cancellationToken = default);
}

/// <summary>
/// Pedido de avaliacao de uma resposta de atividade. `UserInterests`/`UserNotes` (Fase 27) sao
/// opcionais - so `SubmitVoiceSummaryResponseUseCase` preenche hoje (perfil do usuario, mesmo dado
/// que a Fase 21/22 ja usava so pra analogia de Leitura), `GroqContentEvaluationService` injeta no
/// prompt quando presentes. `EvaluateWeeklyProjectUseCase` (avaliacao de projeto, mesmo shape de
/// request) deixa de proposito em branco - feedback sobre codigo nao ganha com analogia de hobby.
/// </summary>
public record ContentEvaluationRequest(
    string ExpectedAnswer,
    string UserAnswer,
    string? ContextText,
    IReadOnlyCollection<string>? UserInterests = null,
    string? UserNotes = null);

/// <summary>Resultado da avaliacao: Score de 0 a 100 e um feedback textual gerado pela IA.</summary>
public record ContentEvaluationResult(int Score, string Feedback);
