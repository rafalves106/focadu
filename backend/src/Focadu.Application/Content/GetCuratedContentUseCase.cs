using Focadu.Application.Exceptions;
using Focadu.Application.Shared;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Content;

/// <summary>
/// Caso de uso: le um CuratedContent pelo Id (Fase 7) - o frontend precisa disso pra renderizar as
/// etapas de leitura/video de uma DailyActivity (DailyActivityDto so traz o ContentId, nunca o
/// conteudo em si). Reaproveita o mesmo IWeeklyRepository.GetCuratedContentByIdAsync que
/// UpdateCuratedContentUseCase (Fase 4) ja usa.
/// </summary>
public class GetCuratedContentUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;

    public GetCuratedContentUseCase(IWeeklyRepository weeklyRepository)
    {
        _weeklyRepository = weeklyRepository;
    }

    public async Task<CuratedContentDto> ExecuteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var content = await _weeklyRepository.GetCuratedContentByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("conteudo_nao_encontrado", "Conteudo curado nao encontrado.");

        return new CuratedContentDto(content.Id, content.Type, content.Title, content.ExternalUrl, content.BodyText);
    }
}
