namespace Focadu.Infrastructure.Services;

/// <summary>
/// Chave de assinatura dos JWT de sessao (Fase 12). Diferente de GroqOptions/GitHubOptions (podem
/// ficar vazias, so as chamadas externas falham quando de fato invocadas), a ausencia desta
/// derruba o startup da Api (ver Program.cs) - autenticacao e fundacao a partir desta fase, nao
/// uma integracao opcional; sem a chave, absolutamente nenhum login/registro funcionaria.
/// </summary>
public record JwtOptions(string SecretKey);
