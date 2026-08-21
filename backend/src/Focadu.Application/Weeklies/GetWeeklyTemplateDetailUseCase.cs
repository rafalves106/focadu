using Focadu.Application.Exceptions;
using Focadu.Application.Shared;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Caso de uso: detalhe de uma WeeklyTemplate pelo Id (Fase 13b, endpoint que faltava - ver
/// docs/fase-13a). Usado por `/admin/conteudo` pra listar/curar CuratedContent de uma semana sem
/// exigir Enrollment - diferente de GetWeeklyDetailUseCase, que le a Weekly-INSTANCIA de um
/// usuario matriculado. Reaproveita IWeeklyTemplateRepository.GetByIdAsync, que
/// CreateCuratedContentUseCase ja usa.
/// </summary>
public class GetWeeklyTemplateDetailUseCase
{
    private readonly IWeeklyTemplateRepository _weeklyTemplateRepository;

    public GetWeeklyTemplateDetailUseCase(IWeeklyTemplateRepository weeklyTemplateRepository)
    {
        _weeklyTemplateRepository = weeklyTemplateRepository;
    }

    public async Task<WeeklyTemplateDetailDto> ExecuteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var template = await _weeklyTemplateRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var contentDtos = template.CuratedContents
            .Select(c => new CuratedContentDto(c.Id, c.Type, c.Title, c.ExternalUrl, c.BodyText))
            .ToList();

        return new WeeklyTemplateDetailDto(template.Id, template.MonthlyId, template.Number, template.Title, template.Theme, contentDtos);
    }
}

public record WeeklyTemplateDetailDto(
    Guid Id,
    Guid MonthlyId,
    int Number,
    string Title,
    string? Theme,
    IReadOnlyCollection<CuratedContentDto> CuratedContents);
