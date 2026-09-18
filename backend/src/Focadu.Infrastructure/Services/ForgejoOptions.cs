namespace Focadu.Infrastructure.Services;

/// <summary>
/// Configuracao do adapter Forgejo interno. BaseUrl aponta pro container Forgejo (ex:
/// http://forgejo:3000/api/v1/ dentro da rede do Docker Compose); AdminToken precisa de escopo
/// administrativo (criar usuario, editar usuario, gerar token em nome de outro usuario via Sudo,
/// dar fork). Vem de "Forgejo:BaseUrl"/"Forgejo:AdminToken" (appsettings/user-secrets/env var
/// Forgejo__BaseUrl/Forgejo__AdminToken - mesmo padrao de GitHubOptions/GroqOptions, ver
/// docs/ARQUITETURA.md).
/// </summary>
public record ForgejoOptions(string BaseUrl, string AdminToken);
