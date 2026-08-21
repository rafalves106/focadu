using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Referrals;
using Focadu.Domain.Repositories;
using Focadu.Domain.Users;

namespace Focadu.Application.Users;

/// <summary>
/// Caso de uso: cria um novo User (Fase 12). Email precisa ser unico (checado aqui, na camada de
/// aplicacao, porque exige consultar o repositorio - o dominio, em User.Create, so valida
/// formato/nao-vazio, nunca unicidade). Senha nunca e armazenada em texto puro, so o hash
/// (IPasswordHasher) - o caso de uso ja devolve um token pronto (IJwtTokenService), pra registro
/// contar como login automatico (sem precisar de uma segunda chamada logo em seguida).
///
/// Fase 17: aceita `referralCode` opcional - se corresponder a um User de verdade, cria um
/// Referral (indicador -> indicado) AINDA NAO confirmado. Codigo invalido/de ninguem so e
/// ignorado silenciosamente, nunca bloqueia o registro (confirmado no prompt: "se valido"). A
/// confirmacao de verdade (ConfirmedAt) so acontece na matricula (EnrollUserInCourseUseCase) -
/// prova de uso real, nao so cadastro vazio.
/// </summary>
public class RegisterUserUseCase
{
    private readonly IUserRepository _userRepository;
    private readonly IReferralRepository _referralRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public RegisterUserUseCase(
        IUserRepository userRepository,
        IReferralRepository referralRepository,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _referralRepository = referralRepository;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResultDto> ExecuteAsync(
        string email, string password, string displayName, string? referralCode, CancellationToken cancellationToken = default)
    {
        ValidatePassword(password);

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var existing = await _userRepository.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (existing is not null)
            throw new ConflictException("email_ja_cadastrado", "Este email ja esta cadastrado.");

        var passwordHash = _passwordHasher.Hash(password);
        var user = User.Create(normalizedEmail, passwordHash, displayName);

        await _userRepository.AddAsync(user, cancellationToken);

        if (!string.IsNullOrWhiteSpace(referralCode))
        {
            var referrer = await _userRepository.GetByReferralCodeAsync(referralCode.Trim(), cancellationToken);
            if (referrer is not null)
            {
                await _referralRepository.AddAsync(new Referral(referrer.Id, user.Id), cancellationToken);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var token = _jwtTokenService.GenerateToken(user);
        return new AuthResultDto(new UserDto(user.Id, user.Email, user.DisplayName, user.ProfileCompletedAt, user.Interests, user.AdditionalProfileNotes), token);
    }

    /// <summary>Minimo de 8 caracteres (pedido no prompt da fase) - validacao client-side existe tambem, mas o servidor nunca confia so nisso.</summary>
    internal static void ValidatePassword(string? password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
            throw new ValidationException("senha_muito_curta", "A senha precisa ter pelo menos 8 caracteres.");
    }
}
