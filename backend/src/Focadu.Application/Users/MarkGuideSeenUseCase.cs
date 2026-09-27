using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Users;

/// <summary>
/// Caso de uso: marca uma chave do guia das telas como vista (Fase 75) - o tour do app inteiro no 1o
/// acesso ou a 1a visita a uma tela. Idempotente. Devolve o UserDto atualizado pro AuthContext.
/// </summary>
public class MarkGuideSeenUseCase
{
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public MarkGuideSeenUseCase(IUserRepository userRepository, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<UserDto> ExecuteAsync(Guid userId, string key, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Usuario nao encontrado.");

        user.MarkGuideSeen(key);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return UserDto.From(user);
    }
}
