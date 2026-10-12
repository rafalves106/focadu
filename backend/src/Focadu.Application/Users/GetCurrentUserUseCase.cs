using Focadu.Application.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Users;

/// <summary>
/// Caso de uso: le o User da sessao atual (Fase 12). userId vem do JWT ja validado pelo
/// middleware JwtBearer (claim "sub", ver Program.cs) - este caso de uso nunca decodifica token
/// nenhum, so confia no Guid que a Api ja extraiu do ClaimsPrincipal.
/// </summary>
public class GetCurrentUserUseCase
{
    private readonly IUserRepository _userRepository;
    private readonly ICohortRepository _cohortRepository;

    public GetCurrentUserUseCase(IUserRepository userRepository, ICohortRepository cohortRepository)
    {
        _cohortRepository = cohortRepository;
        _userRepository = userRepository;
    }

    public async Task<UserDto> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Usuario nao encontrado.");

        return await UserDto.FromAsync(user, _cohortRepository, cancellationToken);
    }
}
