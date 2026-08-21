using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Referrals;

/// <summary>
/// Caso de uso: codigo de indicacao do usuario logado + contagem de indicacoes confirmadas
/// (Fase 17). Gera o codigo na 1a consulta (lazy, curto - 8 caracteres, sem 0/O/1/I pra evitar
/// confusao visual ao digitar/ler em voz alta) - unicidade checada contra o repositorio antes de
/// atribuir (User.AssignReferralCode so aceita ser chamado 1 vez).
/// </summary>
public class GetReferralInfoUseCase
{
    private const int CodeLength = 8;
    private const int MaxGenerationAttempts = 5;
    private const string CodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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
            user.AssignReferralCode(await GenerateUniqueCodeAsync(cancellationToken));
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        var referrals = await _referralRepository.GetByReferrerUserIdAsync(userId, cancellationToken);
        var confirmedCount = referrals.Count(r => r.ConfirmedAt is not null);

        return new ReferralInfoDto(user.ReferralCode!, confirmedCount);
    }

    private async Task<string> GenerateUniqueCodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < MaxGenerationAttempts; attempt++)
        {
            var candidate = RandomCode();
            if (await _userRepository.GetByReferralCodeAsync(candidate, cancellationToken) is null) return candidate;
        }

        // Praticamente impossivel (33^8 combinacoes) - defensivo, nunca deveria disparar de verdade.
        throw new InvalidOperationException("Nao foi possivel gerar um codigo de indicacao unico.");
    }

    private static string RandomCode() =>
        new(Enumerable.Range(0, CodeLength).Select(_ => CodeAlphabet[Random.Shared.Next(CodeAlphabet.Length)]).ToArray());
}

public record ReferralInfoDto(string ReferralCode, int ConfirmedReferralCount);
