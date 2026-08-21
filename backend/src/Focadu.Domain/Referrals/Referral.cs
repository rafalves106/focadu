using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Referrals;

/// <summary>
/// Uma indicacao: ReferrerUserId indicou ReferredUserId (Fase 17, pre-requisito do badge
/// Embaixador). Criada no registro (RegisterUserUseCase, se o referralCode informado for valido),
/// mas so CONFIRMADA quando o indicado de fato se matricula num curso (EnrollUserInCourseUseCase)
/// - prova de uso real, nao so cadastro vazio. No maximo 1 Referral por ReferredUserId (indice
/// unico no banco) - um usuario so pode ter sido indicado por alguem uma vez.
/// </summary>
public class Referral : Entity
{
    public Guid ReferrerUserId { get; private set; }
    public Guid ReferredUserId { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? ConfirmedAt { get; private set; }

    private Referral()
    {
    }

    public Referral(Guid referrerUserId, Guid referredUserId)
    {
        if (referrerUserId == referredUserId)
            throw new DomainException("Um usuario nao pode se auto-indicar.");

        ReferrerUserId = referrerUserId;
        ReferredUserId = referredUserId;
        CreatedAt = DateTime.UtcNow;
    }

    /// <summary>Idempotente - confirmar uma indicacao ja confirmada nao muda ConfirmedAt de novo.</summary>
    public void Confirm() => ConfirmedAt ??= DateTime.UtcNow;
}
