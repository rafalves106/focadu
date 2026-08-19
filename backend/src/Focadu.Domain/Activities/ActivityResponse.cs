using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Policies;

namespace Focadu.Domain.Activities;

/// <summary>
/// Uma tentativa de resposta a uma DailyActivity. Nunca é sobrescrita: cada tentativa gera
/// um novo registro (histórico completo), com AttemptNumber incremental por atividade.
/// </summary>
public class ActivityResponse : Entity
{
    public Guid ActivityId { get; private set; }
    public int AttemptNumber { get; private set; }
    public int Score { get; private set; }
    public bool Passed { get; private set; }
    public string? Transcript { get; private set; }

    /// <summary>
    /// Justificativa em texto livre do usuário sobre a resposta dada (usado no Cloze/FreeText,
    /// pedida antes de revelar se acertou). Apenas armazenada nesta fase - sem avaliação de IA
    /// sobre o conteúdo (fora de escopo até IContentEvaluationService existir).
    /// </summary>
    public string? Justification { get; private set; }

    public string? AiFeedback { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private ActivityResponse()
    {
    }

    internal ActivityResponse(
        Guid activityId, int attemptNumber, int score, string? transcript, string? justification, string? aiFeedback)
    {
        if (score < 0 || score > 100)
            throw new DomainException("Score deve estar entre 0 e 100.");
        if (attemptNumber < 1)
            throw new DomainException("AttemptNumber deve começar em 1.");

        ActivityId = activityId;
        AttemptNumber = attemptNumber;
        Score = score;
        // Critério de aprovação centralizado em EvaluationPolicy: nunca duplicar esse número.
        Passed = score >= EvaluationPolicy.PassingScore;
        Transcript = transcript;
        Justification = justification;
        AiFeedback = aiFeedback;
        CreatedAt = DateTime.UtcNow;
    }
}
