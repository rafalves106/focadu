using Focadu.Application.Shared;
using Focadu.Domain.Enums;

namespace Focadu.Application.Weeklies;

public record WeeklyDetailDto(
    Guid Id,
    Guid MonthlyId,
    /// <summary>Fase 29: resolvido via Monthly.CourseId (MonthlyId -> Monthly, template-level) - o frontend precisa disso pra montar o link "CADERNINHO" (/start?course=&amp;tab=caderninho) e o autocomplete de tags a partir do contexto de uma Daily em andamento, sem endpoint novo.</summary>
    Guid CourseId,
    int Number,
    string Title,
    string? Theme,
    IReadOnlyCollection<DailyOverviewDto> Dailies,
    IReadOnlyCollection<CuratedContentDto> CuratedContents,
    WeeklyProjectDto? Project,
    IReadOnlyCollection<WeeklyReinforcementSummaryDto> Reinforcements,
    /// <summary>Fase 11: true quando o modulo esta completo mas ainda falta uma publicacao Validated - o frontend usa isso pro banner/bloqueio, sem precisar de uma 2a chamada a /publication/status so pra saber "precisa ou nao".</summary>
    bool RequiresPublicationToUnlock,
    /// <summary>Fase 15: true quando existe um WeeklyReinforcement (2+ dias fracos) ainda nao totalmente atendido - ver Weekly.HasPendingWeeklyReinforcement. So indicador, nunca bloqueia nada.</summary>
    bool HasPendingWeeklyReinforcement);

/// <summary>Desempenho de um dia dentro da semana: quantas atividades tem, quantas ja foram feitas, quantas passaram.</summary>
public record DailyOverviewDto(
    Guid Id,
    int DayNumber,
    DateOnly Date,
    DailyStatus Status,
    bool IsReinforcement,
    int PenaltyPoints,
    bool IsWeakDay,
    /// <summary>Fase 38b: true quando esta e a Daily nao-reforco de menor DayNumber ainda nao concluida em TODA a matricula - a unica Locked/Available que pode ser iniciada agora (ver Weekly.EvaluateDailyAccess/DailySequencing). Nunca true pra Dailies de reforco (acesso sempre por link explicito). O frontend usa isso pra saber qual dia destacar/bloquear, ja que Daily.Date nao serve mais pra isso.</summary>
    bool IsNext,
    /// <summary>Titulo do material do dia (Leitura, ou Video se nao houver Leitura) - Daily nao tem titulo proprio, este e o do CuratedContent associado. Nulo quando o dia nao tem nenhuma atividade de Leitura/Video (ex: alguma Daily de reforco sintetica). So usado por WeeklyDetailPage (visao de uma semana) - as outras telas continuam mostrando so o numero do dia.</summary>
    string? Title,
    int TotalActivities,
    int CompletedActivities,
    int PassedActivities);

public record WeeklyProjectDto(
    Guid Id,
    string SpecText,
    WeeklyProjectStatus Status,
    /// <summary>Fase 38: true quando as Dailies originais da Weekly ainda nao foram todas concluidas - Weekly.SubmitProject() recusa o envio enquanto isso for verdade (ver Weekly.AreDailiesComplete). So faz sentido junto de Status=Pending; uma vez Submitted/Evaluated, sempre false.</summary>
    bool IsLocked,
    string? SubmissionUrl,
    /// <summary>Fase 16: nota (0-100) da avaliacao, preenchida junto com Status=Evaluated. Nulo ate entao.</summary>
    int? Score,
    string? Feedback);
