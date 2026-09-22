using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter concreto de IForgejoService - chamadas HTTP diretas a instancia Forgejo interna
/// (mesmo padrao sem SDK do GitHubService: HttpClient tipado + JSON). Token admin ausente nao
/// impede o app de subir, so as chamadas abaixo falham com erro claro quando de fato invocadas
/// sem ele configurado (mesma decisao de Groq/GitHub, ver ForgejoOptions).
///
/// Ponytail explicito: endpoints da API do Forgejo/Gitea (criacao de usuario admin, geracao de
/// token via Sudo, fork) nunca foram exercitados contra uma instancia real ainda - mesma ressalva
/// que GitHubService teve na Fase 11 (ver docs/ARQUITETURA.md, "GitHub nunca foi testado contra a
/// API real"). Os payloads abaixo seguem a documentacao publica da API do Gitea/Forgejo (que os
/// dois compartilham, Forgejo e fork do Gitea) - a primeira rodada de teste contra um container
/// real (ver plano da Semana 1) pode revelar ajuste de campo/nome que so aparece na pratica.
/// </summary>
public class ForgejoService : IForgejoService
{
    // Mesmos limites de GitHubService.GetContentSnapshotAsync - motivo identico (caber num prompt
    // de LLM sem custo/latencia absurdos).
    private const int MaxFiles = 40;
    private const int MaxFileChars = 20_000;
    private const int MaxTotalChars = 150_000;

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
    private readonly ForgejoOptions _options;

    public ForgejoService(HttpClient httpClient, ForgejoOptions options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    public async Task<ForgejoAccountInfo> CreateUserAccountAsync(string username, string email, CancellationToken cancellationToken = default)
    {
        // POST /admin/users - cria com senha aleatoria (o aluno nunca loga com ela: acesso e so
        // via token, ver "Credencial git" no rascunho) e must_change_password=false (senao a conta
        // fica travada esperando um troca de senha que nunca vai acontecer).
        var randomPassword = Convert.ToBase64String(Guid.NewGuid().ToByteArray()) + "Aa1!";
        await SendAsync(
            HttpMethod.Post, "admin/users", cancellationToken,
            new { username, email, password = randomPassword, must_change_password = false });

        // "So a Focadu cria repositorio" (ver rascunho) - desabilita criacao de repo pra essa
        // conta. Endpoint separado (PATCH /admin/users/{username}) porque POST /admin/users nao
        // aceita max_repo_creation na criacao.
        await SendAsync(HttpMethod.Patch, $"admin/users/{username}", cancellationToken, new { max_repo_creation = 0 });

        // POST /users/{username}/tokens - ponytail confirmado ao vivo (18/09/2026): esse endpoint
        // especifico do Forgejo/Gitea RECUSA autenticacao via API token (mesmo com Sudo), 401
        // "auth required" - so aceita Basic Auth de verdade (por design: um token nao pode gerar
        // outro token). Como a Focadu acabou de definir a senha aleatoria do aluno agora mesmo (2
        // chamadas acima), autentica como o proprio aluno via Basic Auth com essa senha - nao
        // precisa do admin/Sudo pra isso, so pras 2 chamadas anteriores (criar conta + travar
        // criacao de repo).
        var token = await GenerateUserTokenAsync(username, randomPassword, cancellationToken);

        return new ForgejoAccountInfo(username, token);
    }

    /// <summary>Basic Auth dedicado (ver comentario acima) - unico lugar deste service que nao usa o token administrativo do Authorization header padrao do HttpClient.</summary>
    private async Task<string> GenerateUserTokenAsync(string username, string password, CancellationToken cancellationToken)
    {
        // Request novo a cada tentativa (dentro do lambda) - um HttpRequestMessage so pode ser
        // enviado uma vez, um retry reaproveitando a mesma instancia lançaria
        // InvalidOperationException na 2a tentativa (mesmo cuidado de SendOnceAsync abaixo).
        HttpResponseMessage response;
        try
        {
            response = await HttpRetry.RunAsync(
                async () =>
                {
                    using var request = new HttpRequestMessage(HttpMethod.Post, $"users/{username}/tokens")
                    {
                        Content = JsonContent.Create(
                            new { name = "focadu-projeto-semanal", scopes = new[] { "write:repository" } }, options: JsonOptions),
                    };
                    request.Headers.Authorization = new AuthenticationHeaderValue(
                        "Basic", Convert.ToBase64String(Encoding.ASCII.GetBytes($"{username}:{password}")));

                    var r = await _httpClient.SendAsync(request, cancellationToken);
                    await HttpRetry.EnsureSuccessAsync(r, cancellationToken);
                    return r;
                },
                ex => HttpRetry.IsTransientFailure(ex, cancellationToken),
                cancellationToken);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new ExternalServiceException("forgejo_timeout", "O Forgejo demorou demais para responder - tente novamente.", statusCode: 503);
        }
        catch (HttpRequestException ex)
        {
            throw new ExternalServiceException("forgejo_indisponivel", $"Nao foi possivel conectar ao Forgejo: {ex.Message}");
        }
        catch (HttpRetry.HttpStatusException ex)
        {
            throw new ExternalServiceException("forgejo_falhou", $"O Forgejo respondeu com erro ({(int)ex.StatusCode}): {ex.Body}");
        }

        var payload = await response.Content.ReadFromJsonAsync<ForgejoTokenPayload>(JsonOptions, cancellationToken)
            ?? throw new ExternalServiceException("forgejo_resposta_invalida", "O Forgejo nao retornou o token gerado.");
        return payload.Sha1 ?? throw new ExternalServiceException(
            "forgejo_resposta_invalida", "O Forgejo nao retornou o valor do token gerado.");
    }

    public async Task<string> ForkTemplateAsync(string templateSlug, string asUsername, CancellationToken cancellationToken = default)
    {
        // POST /repos/{owner}/{repo}/forks com Sudo: fork nasce direto na conta do aluno, o
        // template (dono: conta administrativa da Focadu) nunca e alterado - ver "Nivel 1 vs 2" no
        // rascunho. templateSlug e so o nome do repo; o "owner" do template e sempre a conta admin
        // configurada nesta instancia (ver EnsureConfigured/AdminToken). body: new {} (nao null) -
        // ponytail confirmado ao vivo (18/09/2026): sem Content-Type/corpo nenhum, o Forgejo
        // recusa com 422 "Empty Content-Type", mesmo o corpo sendo opcional na pratica.
        HttpResponseMessage response;
        try
        {
            response = await SendAsync(
                HttpMethod.Post, $"repos/{ForgejoAdminUsername}/{templateSlug}/forks", cancellationToken, body: new { }, sudoAs: asUsername);
        }
        catch (ExternalServiceException ex) when (ex.Code == "forgejo_falhou" && ex.Message.Contains("(409)"))
        {
            // Fase 59: o aluno ja tem um fork deste modelo - uma tentativa anterior de escolher a
            // linguagem criou o fork e falhou antes de gravar a escolha. Como a escolha e
            // irreversivel e precisa poder ser refeita, reaproveita o fork que ja existe em vez de
            // falhar pra sempre. So chega aqui um repositorio do proprio aluno com o nome do modelo:
            // o aluno nao cria repositorio (max_repo_creation = 0), so recebe fork.
            var existing = await GetOptionalAsync($"repos/{asUsername}/{templateSlug}", cancellationToken) ?? throw ex;
            var existingRepo = await existing.Content.ReadFromJsonAsync<ForgejoRepoPayload>(JsonOptions, cancellationToken);
            return existingRepo?.CloneUrl ?? existingRepo?.HtmlUrl ?? throw ex;
        }

        var repo = await response.Content.ReadFromJsonAsync<ForgejoRepoPayload>(JsonOptions, cancellationToken)
            ?? throw new ExternalServiceException("forgejo_resposta_invalida", "O Forgejo nao retornou os dados do fork criado.");
        return repo.CloneUrl ?? repo.HtmlUrl ?? throw new ExternalServiceException(
            "forgejo_resposta_invalida", "O Forgejo nao retornou a URL do fork criado.");
    }

    public async Task<string> GetContentSnapshotAsync(string owner, string repo, CancellationToken cancellationToken = default)
    {
        var repoResponse = await GetOptionalAsync($"repos/{owner}/{repo}", cancellationToken)
            ?? throw new ExternalServiceException("forgejo_repo_nao_encontrado", $"Repositorio {owner}/{repo} nao encontrado ou inacessivel.");
        var repoInfo = await repoResponse.Content.ReadFromJsonAsync<ForgejoRepoPayload>(JsonOptions, cancellationToken);
        var defaultBranch = repoInfo?.DefaultBranch ?? "main";

        var treeResponse = await GetOptionalAsync($"repos/{owner}/{repo}/git/trees/{defaultBranch}?recursive=1", cancellationToken);
        var tree = treeResponse is null
            ? null
            : await treeResponse.Content.ReadFromJsonAsync<ForgejoTreePayload>(JsonOptions, cancellationToken);

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

        var blob = await response.Content.ReadFromJsonAsync<ForgejoBlobPayload>(JsonOptions, cancellationToken);
        if (blob?.Content is null) return null;

        try
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(blob.Content.Replace("\n", "")));
        }
        catch (FormatException)
        {
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

    // Nome da conta administrativa configurada nesta instancia - dona de todo repositorio-template
    // (ver ForkTemplateAsync). Fixo por convencao de provisionamento (nao vem de config separada):
    // e a mesma conta cujo token e usado em AdminToken.
    private const string ForgejoAdminUsername = "focadu-admin";

    private async Task<HttpResponseMessage?> GetOptionalAsync(string path, CancellationToken cancellationToken)
    {
        EnsureConfigured();

        try
        {
            return await HttpRetry.RunAsync(
                () => GetOnceAsync(path, cancellationToken),
                ex => HttpRetry.IsTransientFailure(ex, cancellationToken),
                cancellationToken);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new ExternalServiceException("forgejo_timeout", "O Forgejo demorou demais para responder - tente novamente.", statusCode: 503);
        }
        catch (HttpRequestException ex)
        {
            throw new ExternalServiceException("forgejo_indisponivel", $"Nao foi possivel conectar ao Forgejo: {ex.Message}");
        }
        catch (HttpRetry.HttpStatusException ex)
        {
            throw new ExternalServiceException("forgejo_falhou", $"O Forgejo respondeu com erro ({(int)ex.StatusCode}): {ex.Body}");
        }
    }

    private async Task<HttpResponseMessage?> GetOnceAsync(string path, CancellationToken cancellationToken)
    {
        var response = await _httpClient.GetAsync(path, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound) return null;
        await HttpRetry.EnsureSuccessAsync(response, cancellationToken);
        return response;
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.AdminToken))
        {
            throw new ExternalServiceException(
                "forgejo_token_nao_configurado",
                "O token administrativo do Forgejo nao esta configurado (Forgejo:AdminToken) - ver docs/ARQUITETURA.md.");
        }
    }

    /// <summary>`sudoAs` impersona outro usuario (header Sudo) - usado pra gerar token/fazer fork EM NOME do aluno, com o token administrativo continuando na Authorization header.</summary>
    private async Task<HttpResponseMessage> SendAsync(
        HttpMethod method, string path, CancellationToken cancellationToken, object? body = null, string? sudoAs = null)
    {
        EnsureConfigured();

        try
        {
            return await HttpRetry.RunAsync(
                () => SendOnceAsync(method, path, body, sudoAs, cancellationToken),
                ex => HttpRetry.IsTransientFailure(ex, cancellationToken),
                cancellationToken);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new ExternalServiceException("forgejo_timeout", "O Forgejo demorou demais para responder - tente novamente.", statusCode: 503);
        }
        catch (HttpRequestException ex)
        {
            throw new ExternalServiceException("forgejo_indisponivel", $"Nao foi possivel conectar ao Forgejo: {ex.Message}");
        }
        catch (HttpRetry.HttpStatusException ex)
        {
            throw new ExternalServiceException("forgejo_falhou", $"O Forgejo respondeu com erro ({(int)ex.StatusCode}): {ex.Body}");
        }
    }

    private async Task<HttpResponseMessage> SendOnceAsync(
        HttpMethod method, string path, object? body, string? sudoAs, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, path);
        if (body is not null) request.Content = JsonContent.Create(body, options: JsonOptions);
        if (sudoAs is not null) request.Headers.Add("Sudo", sudoAs);
        var response = await _httpClient.SendAsync(request, cancellationToken);
        await HttpRetry.EnsureSuccessAsync(response, cancellationToken);
        return response;
    }

    private record ForgejoTokenPayload(string? Sha1);

    private record ForgejoRepoPayload(
        string? Name,
        [property: JsonPropertyName("clone_url")] string? CloneUrl,
        [property: JsonPropertyName("html_url")] string? HtmlUrl,
        [property: JsonPropertyName("default_branch")] string? DefaultBranch);

    private record ForgejoTreePayload(List<ForgejoTreeEntryPayload>? Tree);

    private record ForgejoTreeEntryPayload(string? Path, string? Type, string? Sha);

    private record ForgejoBlobPayload(string? Content);
}
