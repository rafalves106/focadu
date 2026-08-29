using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Activities;

/// <summary>
/// Um par termo-definição de uma DailyActivity do tipo WordMatch (Fase 23 - reforma completa do
/// matcher de 2 colunas, ver docs/ARQUITETURA.md). Substitui o uso de QuizOption pra WordMatch:
/// antes (Fase 4-21) 1 termo = 1 DailyActivity com N QuizOption (definições candidatas); agora 1
/// DailyActivity guarda TODOS os pares do grupo (N termos x N definições), submetidos/avaliados
/// de uma vez só.
///
/// <c>Id</c> é a identidade do "termo" (coluna esquerda no matcher); <c>DefinitionId</c> é um Guid
/// SEPARADO pra identidade da "definição" (coluna direita) - de propósito, nunca o mesmo valor de
/// <c>Id</c>. Se o cliente recebesse os dois lados com o mesmo id, a correspondência (o próprio
/// gabarito) vazaria só de olhar o JSON, sem nem jogar - o mesmo princípio que já esconde
/// QuizOption.IsCorrect antes da primeira resposta (ver DailyStateMapper).
/// </summary>
public class WordMatchPair : Entity
{
    public Guid ActivityId { get; private set; }
    public string Term { get; private set; }
    public Guid DefinitionId { get; private set; }
    public string Definition { get; private set; }

    private WordMatchPair()
    {
        Term = string.Empty;
        Definition = string.Empty;
    }

    internal WordMatchPair(Guid activityId, string term, string definition)
    {
        if (string.IsNullOrWhiteSpace(term))
            throw new DomainException("Termo é obrigatório.");
        if (string.IsNullOrWhiteSpace(definition))
            throw new DomainException("Definição é obrigatória.");

        ActivityId = activityId;
        Term = term;
        DefinitionId = Guid.NewGuid();
        Definition = definition;
    }
}
