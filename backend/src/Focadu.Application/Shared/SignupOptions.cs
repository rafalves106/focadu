namespace Focadu.Application.Shared;

/// <summary>
/// Chaves do cadastro (Fase 93), decididas pelo dono em 02/10 e 08/10/2026. Desligadas por padrao (dev local
/// sem SMTP continua entrando direto) e ligadas so no .env de producao:
/// - <c>Signup:InviteOnly</c>: registro so com convite de tester que ainda vale. Desligada, convite preenchido
///   ainda e validado e gasto; vazio passa.
/// - <c>Signup:EmailVerification</c>: a conta so usa o app depois de confirmar o e-mail com o codigo de 6 digitos.
/// - <c>Signup:ContactEmail</c>: o contato que a tela de "cadastro fechado" mostra pra quem chega sem convite.
/// </summary>
public sealed record SignupOptions(bool InviteOnly, bool EmailVerification, string? ContactEmail)
{
    public static SignupOptions FromSettings(string? inviteOnly, string? emailVerification, string? contactEmail) =>
        new(bool.TryParse(inviteOnly, out var invite) && invite,
            bool.TryParse(emailVerification, out var verification) && verification,
            string.IsNullOrWhiteSpace(contactEmail) ? null : contactEmail.Trim());
}
