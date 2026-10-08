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
/// CreatedAt (Fase 72): o "desde set/2026" do Perfil. HideScoresInSquadFeed (Fase 72): a opcao das
/// Configuracoes "nao mostrar minhas notas no feed do squad". SeenGuides (Fase 75): o que o aluno ja
/// viu do guia das telas (tour do app, 1a visita a cada tela).
public record UserDto(
    Guid Id, string Email, string DisplayName, DateTime? ProfileCompletedAt,
    IReadOnlyCollection<string> Interests, string? AdditionalProfileNotes,
    IReadOnlyCollection<ProjectLanguage> PreferredLanguages, DateTime CreatedAt, bool HideScoresInSquadFeed,
    IReadOnlyCollection<string> SeenGuides, DateTime? EmailVerifiedAt)
{
    /// <summary>
    /// Fase 93: a sessao ainda esta presa na tela "Confira seu e-mail" (chave Signup:EmailVerification ligada e
    /// e-mail nao confirmado). So as rotas de auth preenchem (WithSignup no Program.cs) - as outras nem respondem
    /// pra quem esta pendente.
    /// </summary>
    public bool EmailVerificationPending { get; init; }

    public static UserDto From(User user) => new(
        user.Id, user.Email, user.DisplayName, user.ProfileCompletedAt, user.Interests, user.AdditionalProfileNotes,
        user.PreferredLanguages, user.CreatedAt, user.HideScoresInSquadFeed, user.SeenGuides, user.EmailVerifiedAt);
}

/// <summary>
/// Resultado interno de Register/Login (Fase 12) - o token nunca sai da Api em JSON (so via
/// cookie httpOnly, ver Program.cs), mas o caso de uso precisa devolve-lo pra quem chama poder
/// setar o cookie.
/// </summary>
public record AuthResultDto(UserDto User, string Token);
