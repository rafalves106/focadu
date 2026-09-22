using Focadu.Domain.Enums;
using Focadu.Domain.Users;

namespace Focadu.Application.Users;

/// <summary>
/// ProfileCompletedAt (Fase 13): nulo ate a Entrevista de Perfil ser concluida - o frontend usa
/// isso pra decidir se redireciona pra /onboarding (SplashPage/pos-login, ver AuthContext).
/// Interests/AdditionalProfileNotes (Fase 18): expostos aqui pra aba "Informacoes" do Perfil ler
/// o que ja foi salvo sem precisar de um endpoint novo - UserDto ja e buscado em /auth/me, unica
/// fonte de "quem esta logado" (AuthContext).
/// </summary>
/// PreferredLanguages (Fase 59): linguagens marcadas pro Projeto Semanal - vazio ate o aluno marcar
/// (a tela do projeto avisa e nao mostra o projeto enquanto isso, em semana com escolha de linguagem).
public record UserDto(
    Guid Id, string Email, string DisplayName, DateTime? ProfileCompletedAt,
    IReadOnlyCollection<string> Interests, string? AdditionalProfileNotes,
    IReadOnlyCollection<ProjectLanguage> PreferredLanguages)
{
    public static UserDto From(User user) => new(
        user.Id, user.Email, user.DisplayName, user.ProfileCompletedAt, user.Interests, user.AdditionalProfileNotes,
        user.PreferredLanguages);
}

/// <summary>
/// Resultado interno de Register/Login (Fase 12) - o token nunca sai da Api em JSON (so via
/// cookie httpOnly, ver Program.cs), mas o caso de uso precisa devolve-lo pra quem chama poder
/// setar o cookie.
/// </summary>
public record AuthResultDto(UserDto User, string Token);
