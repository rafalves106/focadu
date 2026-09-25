using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Users;

/// <summary>
/// Caso de uso: liga/desliga "nao mostrar minhas notas no feed do squad" (Fase 72, decisao do dono) -
/// chamado pelas Configuracoes. Devolve o UserDto atualizado pro AuthContext trocar o usuario em memoria.
/// </summary>
public class UpdateSquadFeedPrivacyUseCase
{
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateSquadFeedPrivacyUseCase(IUserRepository userRepository, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<UserDto> ExecuteAsync(Guid userId, bool hideScores, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Usuario nao encontrado.");

        user.SetSquadFeedPrivacy(hideScores);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return UserDto.From(user);
    }
}
