using Focadu.Application.Shared;
using Focadu.Domain.Enums;

namespace Focadu.Application.Courses;

public record CourseSummaryDto(
    Guid Id,
    string Name,
    CourseStatus Status,
    int MonthlyCount);

public record CourseDetailDto(
    Guid Id,
    string Name,
    CourseStatus Status,
    CourseProgressDto Progress,
    IReadOnlyCollection<MonthlyOverviewDto> Monthlies,
    IReadOnlyCollection<DailyReinforcementSummaryDto> DailyReinforcements,
    IReadOnlyCollection<WeeklyReinforcementSummaryDto> WeeklyReinforcements);

/// <summary>"Conclusao" do curso: quantas Dailies existem, quantas ja foram concluidas, quantas sao de reforco.</summary>
public record CourseProgressDto(
    int TotalDailies,
    int CompletedDailies,
    int ReinforcementDailies,
    double CompletionPercentage);

public record MonthlyOverviewDto(
    Guid Id,
    int Number,
    string Title,
    IReadOnlyCollection<WeeklyOverviewDto> Weeklies,
    /// <summary>Fase 45: certificacoes de mercado que este modulo (curadoria estatica) ja cobre/aproxima - ver secret/rascunhos/informativo-certificacoes.md.</summary>
    IReadOnlyCollection<CertificationCoverageDto> Certifications);

public record WeeklyOverviewDto(
    Guid Id,
    int Number,
    string Title,
    string? Theme,
    int TotalDailies,
    int CompletedDailies,
    int WeakDailies,
    bool HasWeeklyReinforcement,
    /// <summary>Fase 8: pra grids de navegacao (Detalhes do Curso) mostrarem status por dia sem precisar buscar WeeklyDetailDto de cada semana.</summary>
    IReadOnlyCollection<DailyStatusSummaryDto> Days,
    /// <summary>Fase 11: true quando ESTA Weekly esta com o modulo completo mas sem publicacao Validated - trava as proximas Weeklies (ver IsLocked e StartOrResumeDailyUseCase).</summary>
    bool RequiresPublicationToUnlock,
    /// <summary>
    /// Fase 55: true quando alguma Weekly ANTERIOR do mesmo curso ainda nao fechou (projeto nao
    /// avaliado ou publicacao nao validada) - "se existe um projeto pendente, todas as semanas
    /// seguintes ficam bloqueadas". Calculado no servidor (DailySequencing.FindPendingClosureBefore,
    /// a mesma regra que StartOrResumeDailyUseCase aplica) pra a trilha nao reimplementar a regra.
    /// </summary>
    bool IsLocked,
    /// <summary>
    /// Fase 65: status do Projeto Semanal desta semana (null se ainda nao existe) - o mapa da trilha
    /// usa pro estado do castelo (concluido quando Evaluated) e pras falas da Focada que dependem do
    /// projeto (entregue, aguardando avaliacao, curso concluido).
    /// </summary>
    WeeklyProjectStatus? ProjectStatus);

/// <summary>Resumo enxuto de uma Daily pra grids de navegacao (Fase 8) - versao mais leve de DailyOverviewDto (WeeklyDetailDto), sem PenaltyPoints/PassedActivities que essas telas nao usam.</summary>
public record DailyStatusSummaryDto(
    Guid Id,
    int DayNumber,
    DateOnly Date,
    DailyStatus Status,
    bool IsReinforcement,
    int TotalActivities,
    int CompletedActivities,
    /// <summary>Fase 65: titulo do material do dia (mesma regra de DailyOverviewDto.Title, ver GetWeeklyDetailUseCase) - mostrado no balao do ponto no mapa da trilha.</summary>
    string? Title,
    /// <summary>Fase 65: mesma semantica de DailyOverviewDto.IsNext (DailySequencing.FindNext) - onde a Focada fica parada no mapa.</summary>
    bool IsNext,
    /// <summary>Fase 65: Daily de reforco gerada a partir desta (Daily.ReinforcementDailyId) - o mapa mostra o selo de reforco no ponto do dia de origem, ja que o reforco tem DayNumber proprio (max+1 da semana) e nao tem ponto no mapa.</summary>
    Guid? ReinforcementDailyId,
    /// <summary>Fase 65: concluida hoje (hora local, mesma conversao de Weekly.EvaluateDailyAccess) - o mapa usa pra fala "por hoje acabou" quando a cota diaria ja foi gasta.</summary>
    bool CompletedToday);
