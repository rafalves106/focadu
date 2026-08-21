using Focadu.Application.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Users;

/// <summary>
/// Caso de uso: salva o resultado da Entrevista de Perfil (Fase 13, Onboarding - Documento Mestre
/// Secao 2.2). So captura e persiste os interesses - nao usa isso em nenhum prompt de IA ainda
/// (fora de escopo desta fase, ver docs/fase-13). Marca User.ProfileCompletedAt, que e o que
/// SplashPage/pos-login usam pra decidir se o usuario ainda precisa passar pelo onboarding.
/// </summary>
public class CompleteProfileUseCase
{
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CompleteProfileUseCase(IUserRepository userRepository, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<UserDto> ExecuteAsync(
        Guid userId, IEnumerable<string> interests, string? additionalNotes, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Usuario nao encontrado.");

        user.CompleteProfile(interests, additionalNotes);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new UserDto(user.Id, user.Email, user.DisplayName, user.ProfileCompletedAt);
    }
}
