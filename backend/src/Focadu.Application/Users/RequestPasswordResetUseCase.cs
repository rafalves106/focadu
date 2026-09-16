using Focadu.Application.Ports;
using Focadu.Application.Shared;
using Focadu.Domain.Repositories;
using Focadu.Domain.Users;

namespace Focadu.Application.Users;

/// <summary>
/// Caso de uso: inicia a redefinicao de senha (Fase 41) - gera um token de uso unico valido por 1h
/// e manda por email. Nunca revela se o email existe ou nao (mesmo raciocinio de
/// LoginUserUseCase/credenciais_invalidas: nao dar pista de quais emails estao cadastrados) -
/// sempre completa normalmente, mesmo quando nao ha usuario com aquele email; so gera token e
/// manda email de verdade quando existe.
/// </summary>
public class RequestPasswordResetUseCase
{
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(1);

    private readonly IUserRepository _userRepository;
    private readonly IPasswordResetTokenRepository _tokenRepository;
    private readonly IPasswordResetEmailSender _emailSender;
    private readonly IUnitOfWork _unitOfWork;

    public RequestPasswordResetUseCase(
        IUserRepository userRepository,
        IPasswordResetTokenRepository tokenRepository,
        IPasswordResetEmailSender emailSender,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _tokenRepository = tokenRepository;
        _emailSender = emailSender;
        _unitOfWork = unitOfWork;
    }

    public async Task ExecuteAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user is null) return;

        var rawToken = PasswordResetTokenGenerator.Generate();
        var token = PasswordResetToken.Create(user.Id, PasswordResetTokenGenerator.Hash(rawToken), DateTime.UtcNow.Add(TokenLifetime));

        await _tokenRepository.AddAsync(token, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _emailSender.SendAsync(user.Email, user.DisplayName, rawToken, cancellationToken);
    }
}
