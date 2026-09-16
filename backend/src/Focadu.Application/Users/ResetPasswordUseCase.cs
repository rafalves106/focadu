using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Shared;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Users;

/// <summary>
/// Caso de uso: efetiva a redefinicao de senha (Fase 41) depois de o usuario clicar no link
/// recebido por email. Valida o token (existe, nao usado, nao expirado - PasswordResetToken.
/// Consume) e a forca da nova senha (mesma regra de RegisterUserUseCase.ValidatePassword, nunca
/// duplicada), troca o hash da senha (User.SetPasswordHash) e marca o token como usado, tudo antes
/// de um unico SaveChangesAsync - um token nunca pode ser reaproveitado, mesmo se o usuario tentar
/// de novo com o mesmo link.
/// </summary>
public class ResetPasswordUseCase
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordResetTokenRepository _tokenRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IUnitOfWork _unitOfWork;

    public ResetPasswordUseCase(
        IUserRepository userRepository,
        IPasswordResetTokenRepository tokenRepository,
        IPasswordHasher passwordHasher,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _tokenRepository = tokenRepository;
        _passwordHasher = passwordHasher;
        _unitOfWork = unitOfWork;
    }

    public async Task ExecuteAsync(string rawToken, string newPassword, CancellationToken cancellationToken = default)
    {
        RegisterUserUseCase.ValidatePassword(newPassword);

        var token = await _tokenRepository.GetByTokenHashAsync(PasswordResetTokenGenerator.Hash(rawToken), cancellationToken);
        if (token is null)
            throw new DomainException("Este link de redefinicao de senha e invalido.", "token_invalido");

        token.Consume(DateTime.UtcNow);

        // So deveria ser nulo se o usuario tivesse sido apagado entre o pedido e o clique no link -
        // nao ha exclusao de conta no app hoje, defensivo/praticamente impossivel de disparar.
        var user = await _userRepository.GetByIdAsync(token.UserId, cancellationToken)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Usuario nao encontrado.");

        user.SetPasswordHash(_passwordHasher.Hash(newPassword));

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
