using System.Text;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Caso de uso: publica a prova de aprendizado do modulo no GitHub (Fase 11) - cria o repositorio
/// (se novo) ou reaproveita um existente (da lista de ListPublicRepositoriesAsync), commita um
/// resumo em Markdown do modulo, e ja marca a publicacao como Validated no mesmo passo: o proprio
/// commit, feito com sucesso via a Api do GitHub, ja e a prova de que o repositorio existe e e
/// publico - repetir a checagem logo em seguida (GetRepositoryAsync) seria uma chamada redundante
/// pra confirmar algo que acabamos de fazer nos mesmos. Por isso o fluxo GitHub nao passa pelo
/// endpoint /submit como o LinkedIn passa (que so tem uma URL colada, sem prova nenhuma).
/// </summary>
public class CommitModuleSummaryUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IGitHubService _gitHubService;

    public CommitModuleSummaryUseCase(IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork, IGitHubService gitHubService)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
        _gitHubService = gitHubService;
    }

    public async Task<ModulePublicationDto> ExecuteAsync(
        Guid userId, Guid weeklyId, string repoName, bool isNewRepo, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var repo = isNewRepo
            ? await _gitHubService.CreateRepositoryAsync(repoName, cancellationToken)
            : (await _gitHubService.ListPublicRepositoriesAsync(cancellationToken)).FirstOrDefault(r => r.Name == repoName)
                ?? throw new NotFoundException("repositorio_nao_encontrado", "Repositorio nao encontrado entre os repositorios publicos do usuario.");

        var fileName = $"MODULO-{weekly.Number}.md";
        var summary = BuildSummary(weekly);
        await _gitHubService.CommitFileAsync(
            repo.Owner, repo.Name, fileName, summary, $"Resumo do modulo: {weekly.Theme ?? weekly.Title}", cancellationToken);

        var publication = weekly.StartPublication();
        publication.Submit(PublicationPlatform.GitHub, repo.HtmlUrl);
        publication.MarkValidated();
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new ModulePublicationDto(
            weeklyId, publication.Status, publication.Platform, publication.SubmittedUrl, publication.GeneratedDraft, publication.ValidationError);
    }

    private static string BuildSummary(Weekly weekly)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"# Módulo {weekly.Number}: {weekly.Theme ?? weekly.Title}");
        sb.AppendLine();
        sb.AppendLine("## O que estudei");
        sb.AppendLine();

        var contents = weekly.Template.CuratedContents.Where(c => c.Type is CuratedContentType.Reading or CuratedContentType.Video).ToList();
        if (contents.Count == 0)
        {
            sb.AppendLine("_Nenhum material curado registrado para este módulo._");
        }
        else
        {
            foreach (var content in contents)
                sb.AppendLine($"- {content.Title}");
        }

        if (weekly.Project is not null && weekly.Template.WeeklyProjectSpecText is not null)
        {
            sb.AppendLine();
            sb.AppendLine("## Projeto prático");
            sb.AppendLine();
            sb.AppendLine(weekly.Template.WeeklyProjectSpecText);
        }

        sb.AppendLine();
        sb.AppendLine("---");
        sb.AppendLine("_Gerado automaticamente pela [Focadu](https://github.com) ao concluir o módulo._");
        return sb.ToString();
    }
}
