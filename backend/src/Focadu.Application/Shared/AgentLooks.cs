using Focadu.Domain.Cosmetics;

namespace Focadu.Application.Shared;

/// <summary>Agente em pixel art de alguem (Fase 71): pele de 1 a 5 e o Code da peca vestida em cada camada (cabelo pode ser nulo).</summary>
public record AgentLookDto(int SkinTone, string? Top, string? Bottom, string? Hair, string? Shoes);

/// <summary>
/// Monta o AgentLookDto de outra pessoa (Fase 72) - usado onde aparecem agentes de outros usuarios: QG
/// do Squad e ranking. Nulo enquanto a pessoa nao criou o agente.
/// </summary>
internal static class AgentLooks
{
    public static AgentLookDto? Resolve(UserEquippedCosmetics? equipped, IReadOnlyDictionary<Guid, CosmeticItem> itemsById)
    {
        if (equipped?.SkinTone is not { } skinTone) return null;
        string? Code(Guid? id) => id is { } value && itemsById.TryGetValue(value, out var item) ? item.Code : null;
        return new AgentLookDto(skinTone, Code(equipped.EquippedTopId), Code(equipped.EquippedBottomId), Code(equipped.EquippedHairId), Code(equipped.EquippedShoesId));
    }
}
