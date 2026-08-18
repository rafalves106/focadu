using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Activities;

/// <summary>
/// Opção de resposta para uma atividade Quiz, ou par termo-definição para WordMatch
/// (nesse caso, o "termo" é modelado como o texto da própria DailyActivity/enunciado,
/// e cada QuizOption representa uma definição candidata vinculada a ele).
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
