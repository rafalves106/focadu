namespace Focadu.Application.Ports;

/// <summary>
/// Port do e-mail com o codigo de confirmacao (Fase 93) - adapter via SMTP, mesmo de
/// IPasswordResetEmailSender. Recebe o codigo em texto puro: so o e-mail entrega isso ao aluno.
/// </summary>
public interface IEmailVerificationSender
{
    Task SendAsync(string toEmail, string displayName, string code, int validMinutes, CancellationToken cancellationToken = default);
}
