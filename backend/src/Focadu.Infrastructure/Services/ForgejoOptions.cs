namespace Focadu.Infrastructure.Services;

/// <summary>
/// Configuracao do adapter Forgejo interno. BaseUrl aponta pro container Forgejo (ex:
/// http://forgejo:3000/api/v1/ dentro da rede do Docker Compose); AdminToken precisa de escopo
/// administrativo (criar usuario, editar usuario, gerar token em nome de outro usuario via Sudo,
/// dar fork). Vem de "Forgejo:BaseUrl"/"Forgejo:AdminToken" (appsettings/user-secrets/env var
/// Forgejo__BaseUrl/Forgejo__AdminToken - mesmo padrao de GitHubOptions/GroqOptions, ver
/// docs/ARQUITETURA.md).
/// </summary>
/// <param name="RequirePrivateForks">
/// Fase 100: ligado, o fork do aluno exige template privado (concede leitura ao aluno e recusa fork publico). Desligado por padrao
/// ate o README do Projeto Semanal ser servido pelo proprio app - o link pro Forgejo nao abre repositorio privado sem login.
/// </param>
public record ForgejoOptions(string BaseUrl, string AdminToken, bool RequirePrivateForks = false);
