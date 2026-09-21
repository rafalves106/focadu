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
    ReadOnly = 3,

    /// <summary>
    /// Daily de hoje ainda não iniciada, mas bloqueada porque o usuário já gastou a única
    /// conclusão permitida no dia corrido (limite de 1 Daily concluída por dia, mesmo se veio de
    /// retomar um atraso - ver Weekly.EvaluateDailyAccess/"daily_limite_diario_atingido"). Só
    /// existe vindo do atalho "/hoje" (GetTodayUseCase) - StartOrResumeDaily/GetDailyState
    /// continuam recusando com 409 normalmente, porque ali é uma tentativa explícita de
    /// iniciar/mutar, não uma leitura de "o que devo mostrar agora".
    /// </summary>
    Blocked = 4,

    /// <summary>
    /// Fase 54: todas as Dailies da Weekly ja foram concluidas, mas o projeto semanal (ou, depois
    /// dele, a publicacao) ainda esta pendente - a proxima Weekly nao abre ate isso fechar (ver
    /// Weekly.RequiresProjectToUnlock/RequiresPublicationToUnlock). Como o atalho "/hoje" nao tem
    /// nenhuma Daily "de hoje" pra mostrar nesse caso, GetTodayUseCase devolve a ultima Daily
    /// original da Weekly que ainda nao fechou (ja Completed) com este modo - assim o cliente cai
    /// na Weekly certa (onde esta o card do projeto) em vez de na 1a Daily da semana seguinte.
    /// Diferente de <see cref="Blocked"/>, "voltar amanha" nao resolve: precisa fechar a semana.
    /// Como Blocked, so existe vindo de "/hoje"; StartOrResumeDaily recusa a mutacao com 409.
    /// </summary>
    WeekPendingClosure = 5
}
