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

    /// <summary>
    /// Conteudo completo (arvore recursiva + o texto de cada arquivo de codigo/texto) do
    /// repositorio, formatado em texto pronto pra entrar no prompt de avaliacao por IA
    /// (EvaluateWeeklyProjectUseCase via IProjectEvaluationService) - a IA precisa ver o codigo de
    /// verdade pra avaliar se a atividade foi feita, nao so o README. Ponytail: filtra por extensao
    /// (heuristica de "arquivo de codigo/texto", ver GitHubService.CodeExtensions) e limita
    /// quantidade/tamanho de arquivos - upgrade natural: ampliar a lista de extensoes ou os limites
    /// se um projeto legitimo estourar o corte.
    /// </summary>
    Task<string> GetContentSnapshotAsync(string owner, string repo, CancellationToken cancellationToken = default);
}

public record GitHubRepositoryInfo(string Owner, string Name, string FullName, string HtmlUrl, bool IsPrivate, string DefaultBranch);
