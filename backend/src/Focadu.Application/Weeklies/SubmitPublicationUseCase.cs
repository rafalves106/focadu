using System.Text.RegularExpressions;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Caso de uso: submete e valida a URL de publicacao (Fase 11) - fluxo padrao do LinkedIn (so tem
/// a URL colada, sem prova por si so) e fallback pro GitHub caso a URL seja colada direto aqui em
/// vez de passar por CommitModuleSummaryUseCase (que ja valida no proprio commit). Submit+validacao
/// sao sincronos - sem fila/job em background (nao ha essa infra no app), "Validacao Pendente" no
/// frontend e so o loading deste POST.
///
/// Validacao do LinkedIn e estrutural, nao de conteudo (limitacao conhecida, ver docs/fase-11):
/// so confirma que a URL tem formato de post do LinkedIn - nao ha Api gratuita simples pra
/// verificar que o post fala sobre o modulo de verdade.
/// </summary>
public class SubmitPublicationUseCase
{
    private static readonly Regex LinkedInPostUrl = new(
        @"^https://(www\.)?linkedin\.com/(posts|feed/update)/", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private const string GitHubValidationError = "Repositório não encontrado ou está privado - verifique se é público.";

    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IGitHubService _gitHubService;

    public SubmitPublicationUseCase(IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork, IGitHubService gitHubService)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
        _gitHubService = gitHubService;
    }

    public async Task<ModulePublicationDto> ExecuteAsync(
        Guid userId, Guid weeklyId, PublicationPlatform platform, string url, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var publication = weekly.StartPublication();
        publication.Submit(platform, url);

        var (valid, error) = platform == PublicationPlatform.LinkedIn
            ? ValidateLinkedIn(url)
            : await ValidateGitHubAsync(url, cancellationToken);

        if (valid) publication.MarkValidated();
        else publication.MarkFailed(error!);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new ModulePublicationDto(
            weeklyId, publication.Status, publication.Platform, publication.SubmittedUrl, publication.GeneratedDraft, publication.ValidationError);
    }

    private static (bool Valid, string? Error) ValidateLinkedIn(string url) =>
        LinkedInPostUrl.IsMatch(url.Trim())
            ? (true, null)
            : (false, "URL não parece ser um post do LinkedIn válido.");

    private async Task<(bool Valid, string? Error)> ValidateGitHubAsync(string url, CancellationToken cancellationToken)
    {
        var parsed = GitHubUrlParser.TryParse(url);
        if (parsed is null) return (false, GitHubValidationError);

        var repo = await _gitHubService.GetRepositoryAsync(parsed.Value.Owner, parsed.Value.Repo, cancellationToken);
        return repo is { IsPrivate: false } ? (true, null) : (false, GitHubValidationError);
    }
}
