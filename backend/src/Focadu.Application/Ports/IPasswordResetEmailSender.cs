namespace Focadu.Application.Ports;

/// <summary>
/// Port de envio do email de redefinicao de senha (Fase 41) - adapter concreto via SMTP, ver
/// Focadu.Infrastructure/Services/SmtpPasswordResetEmailSender. Recebe o token em TEXTO PURO (a
/// Application nunca guarda essa versao em lugar nenhum, so o hash - ver
/// PasswordResetTokenGenerator) porque so o email tem como entregar isso ao usuario. Quem monta o
/// link final (dominio/rota do frontend) e o adapter concreto, nao a Application - mesma decisao
/// de GitHubService conhecer sua propria BaseAddress.
/// </summary>
public interface IPasswordResetEmailSender
{
    Task SendAsync(string toEmail, string displayName, string resetToken, CancellationToken cancellationToken = default);
}
