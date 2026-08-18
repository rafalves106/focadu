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

/// <summary>Pedido de avaliacao de uma resposta de atividade.</summary>
public record ContentEvaluationRequest(string ExpectedAnswer, string UserAnswer, string? ContextText);

/// <summary>Resultado da avaliacao: Score de 0 a 100 e um feedback textual gerado pela IA.</summary>
public record ContentEvaluationResult(int Score, string Feedback);
