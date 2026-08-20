using Focadu.Application.Ports;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Users;

/// <summary>
/// Caso de uso: autentica um User existente (Fase 12). A mensagem de erro nunca diferencia
/// "email nao existe" de "senha errada" (boa pratica basica de seguranca - nao da pista de quais
/// emails estao cadastrados) - por isso usa DomainException com Code proprio
/// ("credenciais_invalidas", mapeado pra 401 em ApiExceptionHandler.DomainCodeStatusOverrides) em
/// vez de NotFoundException/ValidationException, que teriam status fixos (404/400) errados pra
/// este caso.
/// </summary>
public class LoginUserUseCase
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public LoginUserUseCase(IUserRepository userRepository, IPasswordHasher passwordHasher, IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResultDto> ExecuteAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(normalizedEmail, cancellationToken);

        if (user is null || !_passwordHasher.Verify(password, user.PasswordHash))
            throw new DomainException("Email ou senha invalidos.", "credenciais_invalidas");

        var token = _jwtTokenService.GenerateToken(user);
        return new AuthResultDto(new UserDto(user.Id, user.Email, user.DisplayName), token);
    }
}
