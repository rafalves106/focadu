using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Shared;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Referrals;

/// <summary>
/// Caso de uso: codigo de indicacao do usuario logado + contagem de indicacoes confirmadas
/// (Fase 17). Gera o codigo na 1a consulta (lazy, ver UniqueCodeGenerator) - unicidade checada
/// contra o repositorio antes de atribuir (User.AssignReferralCode so aceita ser chamado 1 vez).
/// </summary>
public class GetReferralInfoUseCase
{
    private readonly IUserRepository _userRepository;
    private readonly IReferralRepository _referralRepository;
    private readonly IUnitOfWork _unitOfWork;

    public GetReferralInfoUseCase(IUserRepository userRepository, IReferralRepository referralRepository, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _referralRepository = referralRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<ReferralInfoDto> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Usuario nao encontrado.");

        if (user.ReferralCode is null)
        {
            var code = await UniqueCodeGenerator.GenerateAsync(
                async candidate => await _userRepository.GetByReferralCodeAsync(candidate, cancellationToken) is not null);
            user.AssignReferralCode(code);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        var referrals = await _referralRepository.GetByReferrerUserIdAsync(userId, cancellationToken);
        var confirmedCount = referrals.Count(r => r.ConfirmedAt is not null);

        return new ReferralInfoDto(user.ReferralCode!, confirmedCount);
    }
}

public record ReferralInfoDto(string ReferralCode, int ConfirmedReferralCount);
