using Focadu.Application.Exceptions;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;
using Focadu.Domain.Users;

namespace Focadu.Application.Admin;

/// <summary>
/// Da ou tira o papel de admin (Fase 94) - so pelo comando `admin` da Api, rodado na VM. Nao existe rota HTTP
/// pra isso de proposito: quem ganha uma sessao de admin roubada nao consegue criar outro admin.
/// </summary>
public class UserRoleAdminUseCase
{
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UserRoleAdminUseCase(IUserRepository userRepository, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<User> SetRoleAsync(string email, UserRole role, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByEmailAsync((email ?? string.Empty).Trim().ToLowerInvariant(), cancellationToken)
            ?? throw new NotFoundException("usuario_nao_encontrado", $"Nao existe conta com o e-mail '{email}'.");

        user.SetRole(role);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return user;
    }

    public Task<IReadOnlyList<User>> ListAdminsAsync(CancellationToken cancellationToken = default) =>
        _userRepository.ListByRoleAsync(UserRole.Admin, cancellationToken);
}

/// <summary>
/// Porta de toda rota /api/admin (Fase 94): confere o papel no banco a cada chamada, nao no JWT - rebaixar um admin
/// vale na hora, sem esperar o token vencer. Devolve o usuario pra quem precisa do @ (ex.: autor do preco).
/// </summary>
public class AdminAccessGuard
{
    private readonly IUserRepository _userRepository;

    public AdminAccessGuard(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<User> EnsureAdminAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null || !user.IsAdmin)
            throw new ForbiddenException("acesso_negado", "Essa area e so pra quem administra a Focadu.");

        return user;
    }
}
