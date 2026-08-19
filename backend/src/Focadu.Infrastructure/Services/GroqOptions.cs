namespace Focadu.Infrastructure.Services;

/// <summary>
/// Configuracao dos adapters Groq (transcricao + avaliacao). ApiKey vem de "Groq:ApiKey"
/// (appsettings/user-secrets/env var Groq__ApiKey - ver docs/ARQUITETURA.md) - nunca hardcoded.
/// Guardada aqui (em vez de so no header do HttpClient) pra os adapters conseguirem detectar
/// "chave nao configurada" e falhar com uma mensagem clara, em vez de deixar a Groq devolver um
/// 401 sem contexto.
/// </summary>
public record GroqOptions(string ApiKey);
