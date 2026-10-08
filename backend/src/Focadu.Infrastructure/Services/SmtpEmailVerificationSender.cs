using System.Net;
using System.Net.Mail;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter de IEmailVerificationSender via SmtpClient (Fase 93), mesma configuracao Smtp:* do e-mail de
/// redefinicao de senha (SmtpPasswordResetEmailSender). Smtp:Host ausente so falha aqui, quando chamado.
/// </summary>
public class SmtpEmailVerificationSender : IEmailVerificationSender
{
    private readonly SmtpOptions _smtpOptions;

    public SmtpEmailVerificationSender(SmtpOptions smtpOptions)
    {
        _smtpOptions = smtpOptions;
    }

    public async Task SendAsync(string toEmail, string displayName, string code, int validMinutes, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_smtpOptions.Host))
        {
            throw new ExternalServiceException(
                "smtp_nao_configurado", "O envio de email (Smtp:Host) nao esta configurado - ver docs/ARQUITETURA.md.");
        }

        using var client = new SmtpClient(_smtpOptions.Host, _smtpOptions.Port)
        {
            Credentials = new NetworkCredential(_smtpOptions.User, _smtpOptions.Password),
            EnableSsl = _smtpOptions.EnableSsl,
        };

        using var message = new MailMessage
        {
            From = new MailAddress(_smtpOptions.FromAddress, _smtpOptions.FromName),
            Subject = $"Seu código da Focadu: {code}",
            Body = BuildBody(displayName, code, validMinutes),
        };
        message.To.Add(toEmail);

        try
        {
            await client.SendMailAsync(message, cancellationToken);
        }
        catch (SmtpException ex)
        {
            throw new ExternalServiceException(
                "smtp_envio_falhou", $"Nao foi possivel enviar o email com o codigo: {ex.Message}");
        }
    }

    private static string BuildBody(string displayName, string code, int validMinutes) =>
        $"Oi, {displayName}!\n\n" +
        "Este é o seu código para confirmar o e-mail na Focadu:\n\n" +
        $"    {code}\n\n" +
        $"Ele vale por {validMinutes} minutos. Digite na tela \"Confira seu e-mail\".\n\n" +
        "Se não foi você que criou a conta, pode ignorar este e-mail.";
}
