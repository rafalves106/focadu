namespace Focadu.Domain.Enums;

/// <summary>
/// Resultado da avaliação de acesso a uma Daily específica em um determinado dia,
/// calculado por <see cref="Focadu.Domain.Weeklies.Weekly.EvaluateDailyAccess"/>.
/// </summary>
public enum DailyAccessMode
{
    /// <summary>Daily inédita de hoje, pode ser iniciada (Locked/Available -> InProgress).</summary>
    Start = 0,

    /// <summary>Daily de hoje já InProgress, pode continuar de onde parou.</summary>
    Resume = 1,

    /// <summary>Daily já concluída (hoje, ou de dia anterior por vontade própria) sendo refeita: não gera penalidade nova.</summary>
    Replay = 2,

    /// <summary>Daily de dia anterior, somente para consulta (resumo/gabarito), sem reabertura para edição.</summary>
    ReadOnly = 3
}
