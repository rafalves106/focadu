using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Shared;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;
using Focadu.Domain.Users;

namespace Focadu.Application.Users;

/// <summary>
/// Caso de uso: confere o codigo de 6 digitos e confirma o e-mail (Fase 93). So o codigo mais recente vale.
/// Errou: a tentativa e gravada antes de responder (senao chutar seria de graca). Acertou: devolve um token
/// novo, ja com o e-mail confirmado, pra Api trocar o cookie e a sessao sair da tela de confirmacao.
/// </summary>
public class ConfirmEmailVerificationUseCase
{
    private readonly IUserRepository _userRepository;
    private readonly IEmailVerificationCodeRepository _codeRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtTokenService _jwtTokenService;

    public ConfirmEmailVerificationUseCase(
        IUserRepository userRepository, IEmailVerificationCodeRepository codeRepository, IUnitOfWork unitOfWork, IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _codeRepository = codeRepository;
        _unitOfWork = unitOfWork;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResultDto> ExecuteAsync(Guid userId, string? typedCode, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Usuario nao encontrado.");

        if (user.EmailVerifiedAt is null)
        {
            var code = EmailVerificationCodeGenerator.Normalize(typedCode);
            if (code.Length != EmailVerificationCodeGenerator.Length || !code.All(char.IsAsciiDigit))
                throw new ValidationException("codigo_formato_invalido", "O codigo tem 6 numeros.");

            var latest = await _codeRepository.GetLatestAsync(userId, cancellationToken)
                ?? throw new DomainException("Esse codigo venceu. Peca um novo.", "codigo_expirado");

            var now = DateTime.UtcNow;
            if (!latest.TryConsume(EmailVerificationCodeGenerator.Hash(userId, code), now))
            {
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                throw latest.FailedAttempts >= EmailVerificationCode.MaxAttempts
                    ? new DomainException("Muitas tentativas erradas. Peca um novo codigo.", "codigo_bloqueado")
                    : new DomainException("Codigo errado. Confira o e-mail e tente de novo.", "codigo_invalido");
            }

            user.MarkEmailVerified(now);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return new AuthResultDto(UserDto.From(user), _jwtTokenService.GenerateToken(user));
    }
}
