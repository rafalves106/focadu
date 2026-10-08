using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Shared;
using Focadu.Domain.Repositories;
using Focadu.Domain.Users;

namespace Focadu.Application.Users;

/// <summary>
/// Caso de uso: manda o codigo de confirmacao de e-mail (Fase 93). A tela "Confira seu e-mail" chama ao abrir
/// (`force` falso: so manda se o aluno nao tem codigo que ainda vale, pra recarregar a pagina nao encher a caixa
/// de entrada) e no "Reenviar codigo" (`force` verdadeiro: manda outro, respeitando a espera de 1 minuto entre
/// envios). O e-mail sai antes de gravar: SMTP falhou, nada fica salvo e o aluno pode tentar de novo na hora.
/// </summary>
public class SendEmailVerificationUseCase
{
    public static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan ResendCooldown = TimeSpan.FromSeconds(60);

    private readonly IUserRepository _userRepository;
    private readonly IEmailVerificationCodeRepository _codeRepository;
    private readonly IEmailVerificationSender _sender;
    private readonly IUnitOfWork _unitOfWork;

    public SendEmailVerificationUseCase(
        IUserRepository userRepository, IEmailVerificationCodeRepository codeRepository, IEmailVerificationSender sender, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _codeRepository = codeRepository;
        _sender = sender;
        _unitOfWork = unitOfWork;
    }

    public async Task<EmailVerificationStatusDto> ExecuteAsync(Guid userId, bool force, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Usuario nao encontrado.");
        if (user.EmailVerifiedAt is not null)
            return new EmailVerificationStatusDto(AlreadyVerified: true, Sent: false, ResendInSeconds: 0);

        var now = DateTime.UtcNow;
        var latest = await _codeRepository.GetLatestAsync(userId, cancellationToken);
        var wait = WaitBeforeResend(latest?.CreatedAt, now);

        if (latest is not null && (wait > 0 || (!force && latest.IsUsable(now))))
            return new EmailVerificationStatusDto(AlreadyVerified: false, Sent: false, ResendInSeconds: wait);

        var code = EmailVerificationCodeGenerator.Generate();
        await _sender.SendAsync(user.Email, user.DisplayName, code, (int)CodeLifetime.TotalMinutes, cancellationToken);

        await _codeRepository.AddAsync(
            EmailVerificationCode.Create(userId, EmailVerificationCodeGenerator.Hash(userId, code), now, now.Add(CodeLifetime)), cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new EmailVerificationStatusDto(AlreadyVerified: false, Sent: true, ResendInSeconds: (int)ResendCooldown.TotalSeconds);
    }

    /// <summary>Segundos que faltam pra poder pedir outro codigo (0 = ja pode).</summary>
    internal static int WaitBeforeResend(DateTime? lastSentAt, DateTime now)
    {
        if (lastSentAt is null) return 0;
        var remaining = lastSentAt.Value.Add(ResendCooldown) - now;
        return remaining <= TimeSpan.Zero ? 0 : (int)Math.Ceiling(remaining.TotalSeconds);
    }
}

/// <summary>Resposta do envio do codigo (Fase 93): `ResendInSeconds` alimenta o "Reenviar em 0:45" da tela.</summary>
public record EmailVerificationStatusDto(bool AlreadyVerified, bool Sent, int ResendInSeconds);
