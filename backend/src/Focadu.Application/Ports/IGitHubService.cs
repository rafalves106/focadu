namespace Focadu.Application.Ports;

/// <summary>
/// Port para o GitHub (Fase 11) - listar repositorios publicos do usuario, criar repositorio,
/// commitar um arquivo, e checar se um repositorio existe/e publico (validacao da publicacao).
/// Sem implementacao concreta configurada por padrao (token ausente) - ver GitHubOptions.
/// </summary>
public interface IGitHubService
{
    Task<IReadOnlyList<GitHubRepositoryInfo>> ListPublicRepositoriesAsync(CancellationToken cancellationToken = default);

    Task<GitHubRepositoryInfo> CreateRepositoryAsync(string name, CancellationToken cancellationToken = default);

    Task CommitFileAsync(
        string owner, string repo, string path, string content, string commitMessage, CancellationToken cancellationToken = default);

    /// <summary>Null se o repositorio nao existir (ou o usuario nao tiver acesso) - usado na validacao pra distinguir "nao encontrado" de "privado".</summary>
    Task<GitHubRepositoryInfo?> GetRepositoryAsync(string owner, string repo, CancellationToken cancellationToken = default);
}

public record GitHubRepositoryInfo(string Owner, string Name, string FullName, string HtmlUrl, bool IsPrivate);
