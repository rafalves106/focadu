using Focadu.Application.Exceptions;
using Focadu.Application.Shared;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Users;

/// <summary>
/// Caso de uso (Fase 102): o aluno que ja tinha conta (ou que viu uma versao antiga) aceita a versao vigente dos termos.
/// O cliente manda a versao que mostrou na tela; se o texto mudou no meio do caminho, recusa em vez de gravar um aceite
/// de algo que o aluno nao leu.
/// </summary>
public class AcceptTermsUseCase
{
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public AcceptTermsUseCase(IUserRepository userRepository, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<UserDto> ExecuteAsync(Guid userId, string? version, CancellationToken cancellationToken = default)
    {
        if (version?.Trim() != LegalDocuments.CurrentVersion)
            throw new ConflictException("termos_desatualizados", "Os termos mudaram. Recarregue a pagina e leia a versao nova.");

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Usuario nao encontrado.");

        user.AcceptTerms(LegalDocuments.CurrentVersion, DateTime.UtcNow);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return UserDto.From(user);
    }
}
