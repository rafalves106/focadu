using Focadu.Application.Ports;

namespace Focadu.Application.Weeklies;

/// <summary>Caso de uso: lista os repositorios publicos do usuario (Fase 11) - pro seletor de repositorio do fluxo GitHub.</summary>
public class GetGitHubRepositoriesUseCase
{
    private readonly IGitHubService _gitHubService;

    public GetGitHubRepositoriesUseCase(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<IReadOnlyList<GitHubRepoDto>> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var repos = await _gitHubService.ListPublicRepositoriesAsync(cancellationToken);
        return repos.Select(r => new GitHubRepoDto(r.Owner, r.Name, r.FullName, r.HtmlUrl, r.IsPrivate)).ToList();
    }
}
