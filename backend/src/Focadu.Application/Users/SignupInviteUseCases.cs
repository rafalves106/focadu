using Focadu.Application.Exceptions;
using Focadu.Application.Shared;
using Focadu.Domain.Repositories;
using Focadu.Domain.Users;

namespace Focadu.Application.Users;

/// <summary>
/// Gestao dos convites de tester (Fase 93 pelo comando `convite` da Api; Fase 94 tambem pela aba Convites do
/// Painel de gestao, so admin). Os dois caminhos usam os mesmos limites: 1 a 20 usos, 1 a 30 dias.
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

    /// <summary>`validDays` nulo = padrao (7 dias). Desde a Fase 94 todo convite vence (1 a 30 dias).</summary>
    public async Task<SignupInvite> CreateAsync(string note, int maxUses, int? validDays, CancellationToken cancellationToken = default)
    {
        var days = validDays ?? DefaultValidDays;
        if (days < 1 || days > SignupInvite.MaxValidDays)
            throw new ValidationException("convite_dias_invalidos", $"A validade vai de 1 a {SignupInvite.MaxValidDays} dias.");

        var code = await UniqueCodeGenerator.GenerateSecureAsync(c => _inviteRepository.CodeExistsAsync(c, cancellationToken));
        var invite = SignupInvite.Create(code, note, maxUses, DateTime.UtcNow.AddDays(days));

        await _inviteRepository.AddAsync(invite, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return invite;
    }

    public async Task<SignupInvite> RevokeAsync(string code, CancellationToken cancellationToken = default)
    {
        var invite = await _inviteRepository.GetByCodeAsync((code ?? string.Empty).Trim().ToUpperInvariant(), cancellationToken)
            ?? throw new NotFoundException("convite_nao_encontrado", $"Nao existe convite '{code}'.");

        invite.Revoke(DateTime.UtcNow);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return invite;
    }

    public Task<IReadOnlyList<SignupInvite>> ListAsync(CancellationToken cancellationToken = default) =>
        _inviteRepository.ListAsync(cancellationToken);
}
