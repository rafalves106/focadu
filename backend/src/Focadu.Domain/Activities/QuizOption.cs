using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Activities;

/// <summary>
/// Opção de resposta para uma atividade Quiz. Também usada pelo Cloze com AnswerMode =
/// MultipleChoice (Fase 4), pra preencher a lacuna do enunciado. WordMatch usava isto até a Fase
/// 21 (1 termo = 1 DailyActivity, QuizOption = definição candidata) - a partir da Fase 23 usa
/// WordMatchPair, que modela o grupo de pares inteiro numa unica atividade.
/// </summary>
public class QuizOption : Entity
{
    public Guid ActivityId { get; private set; }
    public string Text { get; private set; }
    public bool IsCorrect { get; private set; }

    private QuizOption()
    {
        Text = string.Empty;
    }

    internal QuizOption(Guid activityId, string text, bool isCorrect)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new DomainException("Texto da opção é obrigatório.");

        ActivityId = activityId;
        Text = text;
        IsCorrect = isCorrect;
    }
}
