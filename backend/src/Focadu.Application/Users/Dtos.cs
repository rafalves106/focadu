namespace Focadu.Application.Users;

/// <summary>ProfileCompletedAt (Fase 13): nulo ate a Entrevista de Perfil ser concluida - o frontend usa isso pra decidir se redireciona pra /onboarding (SplashPage/pos-login, ver AuthContext).</summary>
public record UserDto(Guid Id, string Email, string DisplayName, DateTime? ProfileCompletedAt);

/// <summary>
/// Resultado interno de Register/Login (Fase 12) - o token nunca sai da Api em JSON (so via
/// cookie httpOnly, ver Program.cs), mas o caso de uso precisa devolve-lo pra quem chama poder
/// setar o cookie.
/// </summary>
public record AuthResultDto(UserDto User, string Token);
