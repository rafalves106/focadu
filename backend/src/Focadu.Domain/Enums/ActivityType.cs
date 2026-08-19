namespace Focadu.Domain.Enums;

/// <summary>Tipo de atividade dentro de uma Daily.</summary>
public enum ActivityType
{
    Quiz = 0,
    WordMatch = 1,
    Cloze = 2,
    Roleplay = 3,

    /// <summary>
    /// Resumo falado sobre um CuratedContent (ContentId obrigatorio) - a resposta e sempre a
    /// transcricao do audio gravado pelo usuario, avaliada por IA (Fase 5). Nunca usa QuizOption
    /// nem ExpectedAnswer.
    /// </summary>
    VoiceSummary = 4
}
