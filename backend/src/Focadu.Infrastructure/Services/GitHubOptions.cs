namespace Focadu.Infrastructure.Services;

/// <summary>
/// Configuracao do adapter GitHub (Fase 11). Token vem de "GitHub:Token" (appsettings/user-secrets/
/// env var GitHub__Token - mesmo padrao de Groq:ApiKey, ver docs/ARQUITETURA.md) - precisa de
/// escopo de escrita (repo) pra criar repositorio/commitar, nao so leitura.
/// </summary>
public record GitHubOptions(string Token);
