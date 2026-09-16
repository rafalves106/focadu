namespace Focadu.Infrastructure.Services;

/// <summary>Configuracao do servidor SMTP usado pra enviar o email de redefinicao de senha (Fase 41) - generico (SmtpClient puro, sem lib de terceiro), funciona com qualquer provedor (Gmail com senha de app, Outlook, etc), nao amarra a um servico especifico.</summary>
public record SmtpOptions(string Host, int Port, string User, string Password, string FromAddress, string FromName, bool EnableSsl);
