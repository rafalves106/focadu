using System.Text.RegularExpressions;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Caso de uso: submete e valida a URL do post do LinkedIn que prova o modulo (Fase 11). Submit+validacao sao
/// sincronos - sem fila/job em background, "Validacao Pendente" no frontend e so o loading deste POST.
///
/// Validacao estrutural, nao de conteudo (limitacao conhecida, ver docs/fase-11): so confirma que a URL tem formato
/// de post do LinkedIn - nao ha Api gratuita simples pra verificar que o post fala sobre o modulo de verdade.
/// Fase 106: o caminho GitHub saiu (ver Program.cs); publicacao antiga com Platform=GitHub continua valida no banco.
/// </summary>
public class SubmitPublicationUseCase
{
    private static readonly Regex LinkedInPostUrl = new(
        @"^https://(www\.)?linkedin\.com/(posts|feed/update)/", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SubmitPublicationUseCase(IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<ModulePublicationDto> ExecuteAsync(
        Guid userId, Guid weeklyId, PublicationPlatform platform, string url, CancellationToken cancellationToken = default)
    {
        if (platform != PublicationPlatform.LinkedIn)
            throw new ValidationException("platform_invalida", "A publicacao do modulo e so pelo LinkedIn.");

        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var publication = weekly.StartPublication();
        publication.Submit(platform, url);

        if (LinkedInPostUrl.IsMatch(url.Trim())) publication.MarkValidated();
        else publication.MarkFailed("URL não parece ser um post do LinkedIn válido.");

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new ModulePublicationDto(
            weeklyId, publication.Status, publication.Platform, publication.SubmittedUrl, publication.GeneratedDraft, publication.ValidationError);
    }
}
