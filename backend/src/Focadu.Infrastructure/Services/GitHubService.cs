using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter concreto de IGitHubService (Fase 11) - chamadas HTTP diretas a api.github.com (mesmo
/// padrao do Groq: sem SDK/pacote Octokit, so HttpClient tipado + JSON - ver DependencyInjection).
/// Token ausente nao impede o app de subir, so as chamadas abaixo falham com erro claro quando de
/// fato invocadas sem ele configurado (mesma decisao do Groq, ver GroqOptions).
/// </summary>
public class GitHubService : IGitHubService
{
    // ponytail: limites pra caber num prompt de LLM sem custo/latencia absurdos - nao e um
    // indexador de repositorio completo. Upgrade se um projeto legitimo estourar isso: subir os
    // numeros, ou paginar/resumir em vez de cortar.
    private const int MaxFiles = 40;
    private const int MaxFileChars = 20_000;
    private const int MaxTotalChars = 150_000;

    // ponytail: allow-list por extensao (heuristica) em vez de tentar bloquear todo binario/vendor
    // possivel - cobre as stacks comuns (a propria Focadu incluida). Upgrade: ampliar a lista se um
    // projeto legitimo usar uma extensao fora daqui.
    private static readonly HashSet<string> CodeExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".cs", ".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".go", ".rb", ".php", ".c", ".cpp",
        ".h", ".hpp", ".rs", ".swift", ".kt", ".html", ".css", ".scss", ".json", ".yml", ".yaml",
        ".md", ".sql", ".sh", ".xml", ".toml", ".razor", ".vue",
    };

    private static readonly HashSet<string> IgnoredFileNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "composer.lock",
    };

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly GitHubOptions _options;

    public GitHubService(HttpClient httpClient, GitHubOptions options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    public async Task<IReadOnlyList<GitHubRepositoryInfo>> ListPublicRepositoriesAsync(CancellationToken cancellationToken = default)
    {
        var response = await SendAsync(HttpMethod.Get, "user/repos?visibility=public&affiliation=owner&per_page=100", cancellationToken);
        var repos = await response.Content.ReadFromJsonAsync<List<GitHubRepoPayload>>(JsonOptions, cancellationToken) ?? [];
        return repos.Select(ToInfo).ToList();
    }

    public async Task<GitHubRepositoryInfo> CreateRepositoryAsync(string name, CancellationToken cancellationToken = default)
    {
        var response = await SendAsync(HttpMethod.Post, "user/repos", cancellationToken, new { name, @private = false, auto_init = true });
        var repo = await response.Content.ReadFromJsonAsync<GitHubRepoPayload>(JsonOptions, cancellationToken)
            ?? throw new ExternalServiceException("github_resposta_invalida", "O GitHub nao retornou os dados do repositorio criado.");
        return ToInfo(repo);
    }

    public async Task CommitFileAsync(
        string owner, string repo, string path, string content, string commitMessage, CancellationToken cancellationToken = default)
    {
        // A API PUT contents exige "sha" do arquivo atual pra sobrescrever um que ja existe -
        // sem isso ela responde 422 "sha wasnt supplied" em vez de sobrescrever. So e "criacao
        // pura" (sem sha) na 1a vez que este path e commitado num repo; um repo reaproveitado
        // (CommitModuleSummaryUseCase com isNewRepo=false) ou um retry apos o commit ja ter ido
        // pro GitHub mas a Api ter falhado depois (ex: SaveChangesAsync) caem no caso de update.
        var existingSha = await GetFileShaAsync(owner, repo, path, cancellationToken);
        object body = existingSha is null
            ? new { message = commitMessage, content = Convert.ToBase64String(Encoding.UTF8.GetBytes(content)) }
            : new { message = commitMessage, content = Convert.ToBase64String(Encoding.UTF8.GetBytes(content)), sha = existingSha };
        await SendAsync(HttpMethod.Put, $"repos/{owner}/{repo}/contents/{path}", cancellationToken, body);
    }

    private async Task<string?> GetFileShaAsync(string owner, string repo, string path, CancellationToken cancellationToken)
    {
        var response = await GetOptionalAsync($"repos/{owner}/{repo}/contents/{path}", cancellationToken);
        if (response is null) return null;

        var payload = await response.Content.ReadFromJsonAsync<GitHubContentPayload>(JsonOptions, cancellationToken);
        return payload?.Sha;
    }

    public async Task<GitHubRepositoryInfo?> GetRepositoryAsync(string owner, string repo, CancellationToken cancellationToken = default)
    {
        // 404 aqui e uma resposta valida (repositorio nao existe OU o token nao enxerga, ex:
        // privado de outro dono) - vira null, nao excecao, pra ValidatePublicationUseCase
        // distinguir "nao encontrado/sem acesso" de "erro de verdade".
        var response = await GetOptionalAsync($"repos/{owner}/{repo}", cancellationToken);
        if (response is null) return null;

        var payload = await response.Content.ReadFromJsonAsync<GitHubRepoPayload>(JsonOptions, cancellationToken);
        return payload is null ? null : ToInfo(payload);
    }

    public async Task<string> GetContentSnapshotAsync(string owner, string repo, CancellationToken cancellationToken = default)
    {
        var repoInfo = await GetRepositoryAsync(owner, repo, cancellationToken)
            ?? throw new ExternalServiceException("github_repo_nao_encontrado", $"Repositorio {owner}/{repo} nao encontrado ou inacessivel.");

        var treeResponse = await GetOptionalAsync(
            $"repos/{owner}/{repo}/git/trees/{repoInfo.DefaultBranch}?recursive=1", cancellationToken);
        var tree = treeResponse is null
            ? null
            : await treeResponse.Content.ReadFromJsonAsync<GitHubTreePayload>(JsonOptions, cancellationToken);

        var files = (tree?.Tree ?? [])
            .Where(e => e.Type == "blob" && e.Path is not null && e.Sha is not null && IsRelevantFile(e.Path))
            .Take(MaxFiles)
            .ToList();

        if (files.Count == 0) return "(repositorio vazio ou sem arquivos de codigo/texto reconhecidos)";

        var sb = new StringBuilder();
        sb.Append("Conteudo do repositorio (amostra de ate ").Append(MaxFiles).Append(" arquivos):\n");
        var totalChars = 0;
        foreach (var file in files)
        {
            if (totalChars >= MaxTotalChars)
            {
                sb.Append("\n(... mais arquivos omitidos, limite de tamanho do snapshot atingido)");
                break;
            }

            var content = await GetBlobContentAsync(owner, repo, file.Sha!, cancellationToken);
            if (content is null) continue;

            var text = content.Length > MaxFileChars ? content[..MaxFileChars] + "\n... (arquivo truncado)" : content;
            totalChars += text.Length;

            sb.Append("\n--- ").Append(file.Path).Append(" ---\n").Append(text).Append('\n');
        }

        return sb.ToString();
    }

    private async Task<string?> GetBlobContentAsync(string owner, string repo, string sha, CancellationToken cancellationToken)
    {
        var response = await GetOptionalAsync($"repos/{owner}/{repo}/git/blobs/{sha}", cancellationToken);
        if (response is null) return null;

        var blob = await response.Content.ReadFromJsonAsync<GitHubBlobPayload>(JsonOptions, cancellationToken);
        if (blob?.Content is null) return null;

        try
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(blob.Content.Replace("\n", "")));
        }
        catch (FormatException)
        {
            // Nao deveria acontecer (a API sempre devolve base64) - se acontecer, so pula esse
            // arquivo em vez de derrubar a avaliacao inteira por causa de 1 blob estranho.
            return null;
        }
    }

    private static bool IsRelevantFile(string path)
    {
        var name = path[(path.LastIndexOf('/') + 1)..];
        if (IgnoredFileNames.Contains(name)) return false;
        if (path.Contains("node_modules/") || path.Contains("/bin/") || path.Contains("/obj/") || path.Contains("/dist/")) return false;

        var lastDot = name.LastIndexOf('.');
        var extension = lastDot >= 0 ? name[lastDot..] : "";
        return CodeExtensions.Contains(extension) || name is "Dockerfile" or "Makefile";
    }

    /// <summary>GET que trata 404 como "nao existe" (null) em vez de excecao - usado pra checar o repo, a arvore de arquivos e cada blob, que podem faltar sem isso ser um erro de verdade.</summary>
    private async Task<HttpResponseMessage?> GetOptionalAsync(string path, CancellationToken cancellationToken)
    {
        EnsureConfigured();

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.GetAsync(path, cancellationToken);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new ExternalServiceException("github_timeout", "O GitHub demorou demais para responder - tente novamente.", statusCode: 503);
        }
        catch (HttpRequestException ex)
        {
            throw new ExternalServiceException("github_indisponivel", $"Nao foi possivel conectar ao GitHub: {ex.Message}");
        }

        if (response.StatusCode == HttpStatusCode.NotFound) return null;
        await EnsureSuccessAsync(response, cancellationToken);
        return response;
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.Token))
        {
            throw new ExternalServiceException(
                "github_token_nao_configurado",
                "O token de acesso do GitHub nao esta configurado (GitHub:Token) - ver docs/ARQUITETURA.md.");
        }
    }

    private async Task<HttpResponseMessage> SendAsync(HttpMethod method, string path, CancellationToken cancellationToken, object? body = null)
    {
        EnsureConfigured();

        HttpResponseMessage response;
        try
        {
            using var request = new HttpRequestMessage(method, path);
            if (body is not null) request.Content = JsonContent.Create(body, options: JsonOptions);
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new ExternalServiceException("github_timeout", "O GitHub demorou demais para responder - tente novamente.", statusCode: 503);
        }
        catch (HttpRequestException ex)
        {
            throw new ExternalServiceException("github_indisponivel", $"Nao foi possivel conectar ao GitHub: {ex.Message}");
        }

        await EnsureSuccessAsync(response, cancellationToken);
        return response;
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode) return;

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        throw new ExternalServiceException("github_falhou", $"O GitHub respondeu com erro ({(int)response.StatusCode}): {body}");
    }

    private static GitHubRepositoryInfo ToInfo(GitHubRepoPayload payload) =>
        new(
            payload.Owner?.Login ?? "", payload.Name ?? "", payload.FullName ?? "", payload.HtmlUrl ?? "",
            payload.Private ?? false, payload.DefaultBranch ?? "main");

    private record GitHubRepoPayload(
        string? Name,
        [property: JsonPropertyName("full_name")] string? FullName,
        [property: JsonPropertyName("html_url")] string? HtmlUrl,
        [property: JsonPropertyName("default_branch")] string? DefaultBranch,
        bool? Private,
        GitHubOwnerPayload? Owner);

    private record GitHubOwnerPayload(string? Login);

    private record GitHubTreePayload(List<GitHubTreeEntryPayload>? Tree);

    private record GitHubTreeEntryPayload(string? Path, string? Type, string? Sha);

    private record GitHubBlobPayload(string? Content);

    private record GitHubContentPayload(string? Sha);
}
