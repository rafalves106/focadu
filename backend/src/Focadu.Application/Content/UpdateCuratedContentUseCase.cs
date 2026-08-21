using Focadu.Application.Exceptions;
using Focadu.Application.Shared;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Content;

/// <summary>
/// Caso de uso: atualiza Title/ExternalUrl/BodyText de um CuratedContent existente (Fase 4) - o
/// principal uso e carregar o texto completo de uma leitura por cima de um placeholder de seed.
/// Type e WeeklyTemplateId nunca mudam depois de criado (ver CuratedContent.Update). Fase 13:
/// CuratedContent virou curriculo (WeeklyTemplate), le/grava via IWeeklyTemplateRepository.
/// </summary>
public class UpdateCuratedContentUseCase
{
    private readonly IWeeklyTemplateRepository _weeklyTemplateRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateCuratedContentUseCase(IWeeklyTemplateRepository weeklyTemplateRepository, IUnitOfWork unitOfWork)
    {
        _weeklyTemplateRepository = weeklyTemplateRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<CuratedContentDto> ExecuteAsync(
        Guid id,
        string title,
        string? externalUrl,
        string? bodyText,
        CancellationToken cancellationToken = default)
    {
        var content = await _weeklyTemplateRepository.GetCuratedContentByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("conteudo_nao_encontrado", "Conteudo curado nao encontrado.");

        CreateCuratedContentUseCase.RequireExternalUrlOrBodyText(externalUrl, bodyText);

        content.Update(title, externalUrl, bodyText);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new CuratedContentDto(content.Id, content.Type, content.Title, content.ExternalUrl, content.BodyText);
    }
}
