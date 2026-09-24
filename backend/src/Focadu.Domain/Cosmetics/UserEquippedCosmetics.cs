using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Cosmetics;

/// <summary>
/// O que um User tem equipado agora, no maximo 1 item por slot (Fase 17) - 1:1 com User, criada
/// sob demanda na 1a vez que o usuario equipa alguma coisa (mesmo padrao lazy de UserGemBalance/
/// UserStreak desde a Fase 14). Equipar um item novo no mesmo slot automaticamente desequipa o
/// anterior - so sobrescreve o campo, sem precisar de um passo "desequipar" explicito primeiro.
/// Fase 71: tambem guarda o agente em pixel art - tom de pele (SkinTone, nulo = agente ainda nao
/// criado) e as 4 camadas de roupa. Parte de cima, parte de baixo e tenis nunca ficam vazios depois
/// da criacao (sempre ha o kit basico); cabelo pode (agente careca).
/// </summary>
public class UserEquippedCosmetics : Entity
{
    public Guid UserId { get; private set; }
    public Guid? EquippedFrameId { get; private set; }
    public Guid? EquippedNameColorId { get; private set; }
    public Guid? EquippedBannerId { get; private set; }
    public Guid? EquippedTopId { get; private set; }
    public Guid? EquippedBottomId { get; private set; }
    public Guid? EquippedHairId { get; private set; }
    public Guid? EquippedShoesId { get; private set; }

    /// <summary>1 a 5 (tons de pele do Figma, variaveis pele/N) - nulo enquanto o agente nao foi criado.</summary>
    public int? SkinTone { get; private set; }

    public const int SkinToneCount = 5;

    public bool HasAgent => SkinTone is not null;

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
            case CosmeticSlot.Top: EquippedTopId = itemId; break;
            case CosmeticSlot.Bottom: EquippedBottomId = itemId; break;
            case CosmeticSlot.Hair: EquippedHairId = itemId; break;
            case CosmeticSlot.Shoes: EquippedShoesId = itemId; break;
        }
    }

    /// <summary>Parte de cima, parte de baixo e tenis nao podem ficar vazios (Fase 71) - o agente troca de peca, nunca tira.</summary>
    public static bool IsRequiredSlot(CosmeticSlot slot) => slot is CosmeticSlot.Top or CosmeticSlot.Bottom or CosmeticSlot.Shoes;

    public void Unequip(CosmeticSlot slot)
    {
        if (IsRequiredSlot(slot))
            throw new DomainException("Este slot do agente nao pode ficar vazio - troque por outra peca.");

        switch (slot)
        {
            case CosmeticSlot.AvatarFrame: EquippedFrameId = null; break;
            case CosmeticSlot.NameColor: EquippedNameColorId = null; break;
            case CosmeticSlot.ProfileBanner: EquippedBannerId = null; break;
            case CosmeticSlot.Hair: EquippedHairId = null; break;
        }
    }

    /// <summary>Cria o agente (Fase 71): tom de pele escolhido - as pecas do kit sao equipadas a parte, via Equip.</summary>
    public void CreateAgent(int skinTone)
    {
        if (HasAgent)
            throw new DomainException("O agente ja foi criado.");
        SetSkinTone(skinTone);
    }

    /// <summary>Troca o tom de pele (Fase 71) - pele nunca e item de loja, a troca e livre.</summary>
    public void SetSkinTone(int skinTone)
    {
        if (skinTone < 1 || skinTone > SkinToneCount)
            throw new DomainException($"Tom de pele precisa estar entre 1 e {SkinToneCount}.");
        SkinTone = skinTone;
    }

    public Guid? EquippedIdFor(CosmeticSlot slot) => slot switch
    {
        CosmeticSlot.AvatarFrame => EquippedFrameId,
        CosmeticSlot.NameColor => EquippedNameColorId,
        CosmeticSlot.ProfileBanner => EquippedBannerId,
        CosmeticSlot.Top => EquippedTopId,
        CosmeticSlot.Bottom => EquippedBottomId,
        CosmeticSlot.Hair => EquippedHairId,
        CosmeticSlot.Shoes => EquippedShoesId,
        _ => null,
    };
}
