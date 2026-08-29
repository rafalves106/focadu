using Focadu.Domain.Common;

namespace Focadu.Domain.Squads;

/// <summary>
/// Um usuario dentro de um squad (Fase 24) - sem invariante de negocio propria alem de existir,
/// mesmo padrao de Enrollment (Fase 13). "1 squad ativo por usuario" e garantido em 2 camadas:
/// a Application checa antes de criar (CreateSquadUseCase/JoinSquadUseCase) e o indice unico em
/// UserId (SquadMembershipConfiguration) garante no banco. Sair do squad e um hard delete desta
/// linha (SquadRepository.RemoveMembershipAsync) - nao ha flag "inativo", a linha existir JA
/// significa "membro agora", o que permite entrar em outro squad depois sem sujeira acumulada.
/// </summary>
public class SquadMembership : Entity
{
    public Guid SquadId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime JoinedAt { get; private set; }

    private SquadMembership()
    {
    }

    public SquadMembership(Guid squadId, Guid userId)
    {
        SquadId = squadId;
        UserId = userId;
        JoinedAt = DateTime.UtcNow;
    }
}
