using System.Text.RegularExpressions;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Extrai owner/repo de uma URL de repositorio GitHub (ex: https://github.com/owner/repo) -
/// compartilhado entre SubmitPublicationUseCase (valida a URL colada) e EvaluateWeeklyProjectUseCase
/// (precisa do owner/repo pra buscar o conteudo via IGitHubService). Antes vivia duplicado como
/// regex privada em SubmitPublicationUseCase.
/// </summary>
public static class GitHubUrlParser
{
    private static readonly Regex RepoUrl = new(
        @"^https://github\.com/(?<owner>[^/]+)/(?<repo>[^/]+?)/?$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static (string Owner, string Repo)? TryParse(string url)
    {
        var match = RepoUrl.Match(url.Trim());
        return match.Success ? (match.Groups["owner"].Value, match.Groups["repo"].Value) : null;
    }
}
