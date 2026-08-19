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
        var body = new { message = commitMessage, content = Convert.ToBase64String(Encoding.UTF8.GetBytes(content)) };
        await SendAsync(HttpMethod.Put, $"repos/{owner}/{repo}/contents/{path}", cancellationToken, body);
    }

    public async Task<GitHubRepositoryInfo?> GetRepositoryAsync(string owner, string repo, CancellationToken cancellationToken = default)
    {
        EnsureConfigured();

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.GetAsync($"repos/{owner}/{repo}", cancellationToken);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new ExternalServiceException("github_timeout", "O GitHub demorou demais para responder - tente novamente.", statusCode: 503);
        }
        catch (HttpRequestException ex)
        {
            throw new ExternalServiceException("github_indisponivel", $"Nao foi possivel conectar ao GitHub: {ex.Message}");
        }

        // 404 aqui e uma resposta valida (repositorio nao existe OU o token nao enxerga, ex:
        // privado de outro dono) - vira null, nao excecao, pra ValidatePublicationUseCase
        // distinguir "nao encontrado/sem acesso" de "erro de verdade".
        if (response.StatusCode == HttpStatusCode.NotFound) return null;
        await EnsureSuccessAsync(response, cancellationToken);

        var payload = await response.Content.ReadFromJsonAsync<GitHubRepoPayload>(JsonOptions, cancellationToken);
        return payload is null ? null : ToInfo(payload);
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
        new(payload.Owner?.Login ?? "", payload.Name ?? "", payload.FullName ?? "", payload.HtmlUrl ?? "", payload.Private ?? false);

    private record GitHubRepoPayload(
        string? Name,
        [property: JsonPropertyName("full_name")] string? FullName,
        [property: JsonPropertyName("html_url")] string? HtmlUrl,
        bool? Private,
        GitHubOwnerPayload? Owner);

    private record GitHubOwnerPayload(string? Login);
}
