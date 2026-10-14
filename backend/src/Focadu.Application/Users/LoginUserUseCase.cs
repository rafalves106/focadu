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
    private readonly ICohortRepository _cohortRepository;

    public LoginUserUseCase(IUserRepository userRepository, IPasswordHasher passwordHasher, IJwtTokenService jwtTokenService,
        ICohortRepository cohortRepository)
    {
        _cohortRepository = cohortRepository;
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

        // Fase 97: so depois de conferir a senha, pra nao revelar quais e-mails existem a quem nao tem a senha.
        if (user.IsDisabled)
            throw new DomainException("Esta conta foi desativada. Fale com quem administra a Focadu.", "conta_desativada");

        var token = _jwtTokenService.GenerateToken(user);
        return new AuthResultDto(await UserDto.FromAsync(user, _cohortRepository, cancellationToken), token);
    }
}
