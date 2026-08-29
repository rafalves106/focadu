using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Squads;

/// <summary>
/// Um squad: grupo de usuarios com 1 dono (Fase 24). So 2 papeis existem - Owner (quem criou,
/// guardado em OwnerUserId) e member (qualquer SquadMembership) - sem aprovacao de convite: quem
/// tem o JoinCode entra direto (ver JoinSquadUseCase). JoinCode e nulo ate a 1a vez que for pedido
/// (lazy, gerado em GetSquadRankingUseCase - mesmo padrao de User.ReferralCode/AssignReferralCode,
/// Fase 17), mesmo alfabeto sem 0/O/1/I (ver Focadu.Application.Shared.UniqueCodeGenerator).
/// </summary>
public class Squad : Entity
{
    public string Name { get; private set; }
    public Guid OwnerUserId { get; private set; }
    public string? JoinCode { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private Squad()
    {
        Name = string.Empty;
    }

    public Squad(string name, Guid ownerUserId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Nome do squad e obrigatorio.", "nome_obrigatorio");

        Name = name.Trim();
        OwnerUserId = ownerUserId;
        CreatedAt = DateTime.UtcNow;
    }

    /// <summary>Atribui o codigo de entrada gerado pela Application (unicidade ja checada la contra o repositorio) - so pode ser chamado uma vez.</summary>
    public void AssignJoinCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new DomainException("Codigo de squad invalido.");
        if (JoinCode is not null)
            throw new DomainException("Este squad ja tem um codigo de entrada.");

        JoinCode = code;
    }
}
