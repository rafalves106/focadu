using Focadu.Domain.Common;

namespace Focadu.Domain.Activities;

/// <summary>
/// Fase 86: uma dica da Focada num passo de codigo com laboratorio (rascunho
/// laboratorio-de-codigo-na-ponte.md, decisao 4). Tres blocos curtos - o que esta certo, onde errou e
/// o que melhorar. Nao e uma tentativa (nao vira <see cref="ActivityResponse"/>, nao conta pro limite
/// de tentativas nem pra nota); o limite e <see cref="CodeStepProgress.MaxHints"/> por passo, contado
/// por esta tabela. Pertence a uma Daily (FK "DailyId" sombra, como as respostas).
/// </summary>
public class CodeStepHint : Entity
{
    public Guid ActivityId { get; private set; }

    /// <summary>1-based, incremental por passo.</summary>
    public int Number { get; private set; }

    public string Right { get; private set; } = string.Empty;
    public string Wrong { get; private set; } = string.Empty;
    public string Improve { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }

    private CodeStepHint()
    {
    }

    internal CodeStepHint(Guid activityId, int number, string right, string wrong, string improve)
    {
        ActivityId = activityId;
        Number = number;
        Right = right;
        Wrong = wrong;
        Improve = improve;
        CreatedAt = DateTime.UtcNow;
    }
}
