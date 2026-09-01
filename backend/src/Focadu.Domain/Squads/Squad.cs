using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Squads;

/// <summary>
/// Um squad: grupo de usuarios com 1 dono (Fase 24). 3 papeis existem - Owner (lider, guardado em
/// OwnerUserId), Co-Leader opcional (CoLeaderUserId, promovido pelo Owner) e member (qualquer
/// SquadMembership) - sem aprovacao de convite: quem tem o JoinCode entra direto (ver
/// JoinSquadUseCase). JoinCode e nulo ate a 1a vez que for pedido (lazy, gerado em
/// GetSquadRankingUseCase - mesmo padrao de User.ReferralCode/AssignReferralCode, Fase 17), mesmo
/// alfabeto sem 0/O/1/I (ver Focadu.Application.Shared.UniqueCodeGenerator).
///
/// Sucessao ao sair (Fase 24b, referencia Clash of Clans): quando o Owner sai com outros membros
/// ainda dentro, a lideranca passa pro Co-Leader (TransferOwnership); sem Co-Leader, pro membro
/// mais antigo (ver LeaveSquadUseCase - a ordenacao por SquadMembership.JoinedAt e decidida la,
/// nao aqui). Squad sem nenhum membro e deletado (nunca fica orfao) - ver LeaveSquadUseCase.
/// </summary>
public class Squad : Entity
{
    public string Name { get; private set; }
    public Guid OwnerUserId { get; private set; }
    public Guid? CoLeaderUserId { get; private set; }
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

    /// <summary>Promove um membro a Co-Leader (substitui quem estava, se houver) - validacao de "e membro mesmo/nao e o proprio Owner" fica na Application (precisa do repositorio).</summary>
    public void PromoteCoLeader(Guid userId) => CoLeaderUserId = userId;

    public void ClearCoLeader() => CoLeaderUserId = null;

    /// <summary>Chamado ao remover qualquer membro (sair ou ser removido) - se era o Co-Leader, o cargo esvazia junto.</summary>
    public void ClearCoLeaderIfMatches(Guid userId)
    {
        if (CoLeaderUserId == userId)
            CoLeaderUserId = null;
    }

    /// <summary>Sucessao (ver comentario da classe) - o novo Owner nunca fica sendo tambem Co-Leader do proprio squad.</summary>
    public void TransferOwnership(Guid newOwnerUserId)
    {
        OwnerUserId = newOwnerUserId;
        CoLeaderUserId = null;
    }
}
