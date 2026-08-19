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
    VoiceSummary = 4,

    /// <summary>
    /// Etapa de leitura de um CuratedContent (ContentId obrigatorio, mesma regra do VoiceSummary) -
    /// nao e avaliada por IA nem tem Score no sentido tradicional (Fase 7): concluir a leitura
    /// registra uma ActivityResponse fixa (Score 100, sempre Passed) so pra marcar a etapa como
    /// feita, reaproveitando o mesmo pipeline de conclusao/penalidade dos outros tipos sem nunca
    /// penalizar.
    /// </summary>
    Reading = 5,

    /// <summary>Etapa de assistir um CuratedContent em video (ContentId obrigatorio) - mesma logica de conclusao do Reading, ver comentario acima.</summary>
    Video = 6
}
