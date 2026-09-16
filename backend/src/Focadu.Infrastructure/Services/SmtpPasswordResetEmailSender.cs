using System.Net;
using System.Net.Mail;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter de IPasswordResetEmailSender via SmtpClient puro do .NET (Fase 41) - sem lib de
/// terceiro, funciona com qualquer provedor SMTP que o usuario ja tenha (Gmail com senha de app,
/// Outlook, etc). Mesma decisao de Groq/GitHub: Smtp:Host ausente nao impede o app de subir, so
/// este envio falha (com erro claro) quando de fato chamado sem estar configurado.
/// </summary>
public class SmtpPasswordResetEmailSender : IPasswordResetEmailSender
{
    private readonly SmtpOptions _smtpOptions;
    private readonly FrontendOptions _frontendOptions;

    public SmtpPasswordResetEmailSender(SmtpOptions smtpOptions, FrontendOptions frontendOptions)
    {
        _smtpOptions = smtpOptions;
        _frontendOptions = frontendOptions;
    }

    public async Task SendAsync(string toEmail, string displayName, string resetToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_smtpOptions.Host))
        {
            throw new ExternalServiceException(
                "smtp_nao_configurado", "O envio de email (Smtp:Host) nao esta configurado - ver docs/ARQUITETURA.md.");
        }

        var resetLink = $"{_frontendOptions.BaseUrl.TrimEnd('/')}/redefinir-senha?token={Uri.EscapeDataString(resetToken)}";

        using var client = new SmtpClient(_smtpOptions.Host, _smtpOptions.Port)
        {
            Credentials = new NetworkCredential(_smtpOptions.User, _smtpOptions.Password),
            EnableSsl = _smtpOptions.EnableSsl,
        };

        using var message = new MailMessage
        {
            From = new MailAddress(_smtpOptions.FromAddress, _smtpOptions.FromName),
            Subject = "Redefinição de senha - Focadu",
            Body = BuildBody(displayName, resetLink),
        };
        message.To.Add(toEmail);

        try
        {
            await client.SendMailAsync(message, cancellationToken);
        }
        catch (SmtpException ex)
        {
            throw new ExternalServiceException(
                "smtp_envio_falhou", $"Nao foi possivel enviar o email de redefinicao de senha: {ex.Message}");
        }
    }

    private static string BuildBody(string displayName, string resetLink) =>
        $"Oi, {displayName}!\n\n" +
        "Recebemos um pedido para redefinir sua senha na Focadu. Se foi você, clique no link abaixo (válido por 1 hora):\n\n" +
        $"{resetLink}\n\n" +
        "Se você não pediu isso, pode ignorar este email - sua senha continua a mesma.";
}
