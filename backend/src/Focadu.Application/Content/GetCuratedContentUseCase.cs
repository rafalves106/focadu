using Focadu.Application.Exceptions;
using Focadu.Application.Shared;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Content;

/// <summary>
/// Caso de uso: le um CuratedContent pelo Id (Fase 7) - o frontend precisa disso pra renderizar as
/// etapas de leitura/video de uma DailyActivity (DailyActivityDto so traz o ContentId, nunca o
/// conteudo em si). Reaproveita o mesmo IWeeklyTemplateRepository.GetCuratedContentByIdAsync que
/// UpdateCuratedContentUseCase (Fase 4) ja usa - CuratedContent e curriculo (Fase 13), aberto pra
/// qualquer usuario autenticado ler, nao precisa checar matricula.
/// </summary>
public class GetCuratedContentUseCase
{
    private readonly IWeeklyTemplateRepository _weeklyTemplateRepository;

    public GetCuratedContentUseCase(IWeeklyTemplateRepository weeklyTemplateRepository)
    {
        _weeklyTemplateRepository = weeklyTemplateRepository;
    }

    public async Task<CuratedContentDto> ExecuteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var content = await _weeklyTemplateRepository.GetCuratedContentByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("conteudo_nao_encontrado", "Conteudo curado nao encontrado.");

        return new CuratedContentDto(content.Id, content.Type, content.Title, content.ExternalUrl, content.BodyText);
    }
}
