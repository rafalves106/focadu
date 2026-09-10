using Focadu.Application.Exceptions;
using Focadu.Application.Shared;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>Caso de uso: detalhe de uma semana especifica (suporta "/start?course=&amp;weekly=") - desempenho de cada Daily.</summary>
public class GetWeeklyDetailUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IMonthlyRepository _monthlyRepository;

    public GetWeeklyDetailUseCase(IWeeklyRepository weeklyRepository, IMonthlyRepository monthlyRepository)
    {
        _weeklyRepository = weeklyRepository;
        _monthlyRepository = monthlyRepository;
    }

    public async Task<WeeklyDetailDto> ExecuteAsync(Guid userId, Guid weeklyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        // Fase 29: CourseId nao mora na Weekly (instancia) - so em Monthly (template-level, ver
        // "Template vs Instancia" em docs/ARQUITETURA.md). 1 lookup extra, sem N+1 (endpoint de
        // 1 Weekly so).
        var monthly = await _monthlyRepository.GetByIdAsync(weekly.MonthlyId, cancellationToken)
            ?? throw new NotFoundException("mes_nao_encontrado", "Mes nao encontrado.");

        var dailyDtos = weekly.Dailies
            .OrderBy(d => d.DayNumber)
            .Select(d => new DailyOverviewDto(
                d.Id, d.DayNumber, d.Date, d.Status, d.IsReinforcement, d.PenaltyPoints, d.IsWeakDay,
                d.Activities.Count,
                d.Activities.Count(a => d.Responses.Any(r => r.ActivityId == a.Id)),
                d.Activities.Count(a => d.Responses.Any(r => r.ActivityId == a.Id && r.Passed))))
            .ToList();

        var contentDtos = weekly.Template.CuratedContents
            .Select(c => new CuratedContentDto(c.Id, c.Type, c.Title, c.ExternalUrl, c.BodyText))
            .ToList();

        var projectDto = weekly.Project is null
            ? null
            : new WeeklyProjectDto(
                weekly.Project.Id, weekly.Template.WeeklyProjectSpecText ?? string.Empty,
                weekly.Project.Status, weekly.Project.SubmissionUrl, weekly.Project.Score, weekly.Project.Feedback);

        var reinforcementDtos = weekly.Reinforcements
            .Select(r => new WeeklyReinforcementSummaryDto(r.Id, weekly.Id, r.TriggeredAt, r.WeakDailyIds))
            .ToList();

        return new WeeklyDetailDto(
            weekly.Id, weekly.MonthlyId, monthly.CourseId, weekly.Number, weekly.Title, weekly.Theme,
            dailyDtos, contentDtos, projectDto, reinforcementDtos, weekly.RequiresPublicationToUnlock(),
            weekly.HasPendingWeeklyReinforcement());
    }
}
