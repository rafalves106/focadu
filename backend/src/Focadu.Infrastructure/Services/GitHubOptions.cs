namespace Focadu.Infrastructure.Services;

/// <summary>
/// Configuracao do adapter GitHub (Fase 11). Token vem de "GitHub:Token" (appsettings/user-secrets/
/// env var GitHub__Token - mesmo padrao de Groq:ApiKey, ver docs/ARQUITETURA.md) - precisa de
/// escopo de escrita (repo) pra criar repositorio/commitar, nao so leitura. Username e o dono dos
/// repositorios (usuario unico do app, mesmo hardcoded de sempre) - usado pra montar owner/repo
/// nas chamadas que nao vem de uma URL ja submetida.
/// </summary>
public record GitHubOptions(string Token, string Username);
