using Focadu.Domain.Common;
using Focadu.Domain.Enums;

namespace Focadu.Domain.Cosmetics;

/// <summary>
/// O que um User tem equipado agora, no maximo 1 item por slot (Fase 17) - 1:1 com User, criada
/// sob demanda na 1a vez que o usuario equipa alguma coisa (mesmo padrao lazy de UserGemBalance/
/// UserStreak desde a Fase 14). Equipar um item novo no mesmo slot automaticamente desequipa o
/// anterior - so sobrescreve o campo, sem precisar de um passo "desequipar" explicito primeiro.
/// </summary>
public class UserEquippedCosmetics : Entity
{
    public Guid UserId { get; private set; }
    public Guid? EquippedFrameId { get; private set; }
    public Guid? EquippedNameColorId { get; private set; }
    public Guid? EquippedBannerId { get; private set; }

    private UserEquippedCosmetics()
    {
    }

    public UserEquippedCosmetics(Guid userId)
    {
        UserId = userId;
    }

    public void Equip(CosmeticSlot slot, Guid itemId)
    {
        switch (slot)
        {
            case CosmeticSlot.AvatarFrame: EquippedFrameId = itemId; break;
            case CosmeticSlot.NameColor: EquippedNameColorId = itemId; break;
            case CosmeticSlot.ProfileBanner: EquippedBannerId = itemId; break;
        }
    }

    public void Unequip(CosmeticSlot slot)
    {
        switch (slot)
        {
            case CosmeticSlot.AvatarFrame: EquippedFrameId = null; break;
            case CosmeticSlot.NameColor: EquippedNameColorId = null; break;
            case CosmeticSlot.ProfileBanner: EquippedBannerId = null; break;
        }
    }

    public Guid? EquippedIdFor(CosmeticSlot slot) => slot switch
    {
        CosmeticSlot.AvatarFrame => EquippedFrameId,
        CosmeticSlot.NameColor => EquippedNameColorId,
        CosmeticSlot.ProfileBanner => EquippedBannerId,
        _ => null,
    };
}
