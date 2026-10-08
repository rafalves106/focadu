using Focadu.Application.Exceptions;
using Focadu.Application.Shared;
using Focadu.Domain.Repositories;
using Focadu.Domain.Users;

namespace Focadu.Application.Users;

/// <summary>
/// Gestao dos convites de tester pelo comando `convite` da Api (Fase 93) - sem endpoint: a Api ainda nao tem
/// papel de admin, e o dono roda o comando na VM (docker compose exec). Ganha tela quando existir o painel de gestao.
/// </summary>
public class SignupInviteAdminUseCase
{
    public const int DefaultValidDays = 7;

    private readonly ISignupInviteRepository _inviteRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SignupInviteAdminUseCase(ISignupInviteRepository inviteRepository, IUnitOfWork unitOfWork)
    {
        _inviteRepository = inviteRepository;
        _unitOfWork = unitOfWork;
    }

    /// <summary>`validDays` nulo = padrao (7 dias); 0 = nao vence.</summary>
    public async Task<SignupInvite> CreateAsync(string note, int maxUses, int? validDays, CancellationToken cancellationToken = default)
    {
        var days = validDays ?? DefaultValidDays;
        if (days < 0)
            throw new ValidationException("convite_dias_invalidos", "--dias precisa ser 0 (nao vence) ou mais.");

        var code = await UniqueCodeGenerator.GenerateSecureAsync(c => _inviteRepository.CodeExistsAsync(c, cancellationToken));
        var invite = SignupInvite.Create(code, note, maxUses, days == 0 ? null : DateTime.UtcNow.AddDays(days));

        await _inviteRepository.AddAsync(invite, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return invite;
    }

    public async Task<SignupInvite> RevokeAsync(string code, CancellationToken cancellationToken = default)
    {
        var invite = await _inviteRepository.GetByCodeAsync(code.Trim().ToUpperInvariant(), cancellationToken)
            ?? throw new NotFoundException("convite_nao_encontrado", $"Nao existe convite '{code}'.");

        invite.Revoke(DateTime.UtcNow);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return invite;
    }

    public Task<IReadOnlyList<SignupInvite>> ListAsync(CancellationToken cancellationToken = default) =>
        _inviteRepository.ListAsync(cancellationToken);
}
