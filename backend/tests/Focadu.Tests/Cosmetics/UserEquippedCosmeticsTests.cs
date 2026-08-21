using Focadu.Domain.Cosmetics;
using Focadu.Domain.Enums;
using Xunit;

namespace Focadu.Tests.Cosmetics;

public class UserEquippedCosmeticsTests
{
    [Fact]
    public void Equip_SetsTheItemForItsSlot()
    {
        var equipped = new UserEquippedCosmetics(Guid.NewGuid());
        var frameId = Guid.NewGuid();

        equipped.Equip(CosmeticSlot.AvatarFrame, frameId);

        Assert.Equal(frameId, equipped.EquippedFrameId);
        Assert.Equal(frameId, equipped.EquippedIdFor(CosmeticSlot.AvatarFrame));
    }

    [Fact]
    public void Equip_NewItem_AutomaticallyReplacesThePreviousOneInTheSameSlot()
    {
        var equipped = new UserEquippedCosmetics(Guid.NewGuid());
        var bronze = Guid.NewGuid();
        var gold = Guid.NewGuid();

        equipped.Equip(CosmeticSlot.AvatarFrame, bronze);
        equipped.Equip(CosmeticSlot.AvatarFrame, gold);

        Assert.Equal(gold, equipped.EquippedFrameId);
    }

    [Fact]
    public void Equip_DifferentSlots_DoNotInterfereWithEachOther()
    {
        var equipped = new UserEquippedCosmetics(Guid.NewGuid());
        var frameId = Guid.NewGuid();
        var colorId = Guid.NewGuid();
        var bannerId = Guid.NewGuid();

        equipped.Equip(CosmeticSlot.AvatarFrame, frameId);
        equipped.Equip(CosmeticSlot.NameColor, colorId);
        equipped.Equip(CosmeticSlot.ProfileBanner, bannerId);

        Assert.Equal(frameId, equipped.EquippedFrameId);
        Assert.Equal(colorId, equipped.EquippedNameColorId);
        Assert.Equal(bannerId, equipped.EquippedBannerId);
    }

    [Fact]
    public void Unequip_ClearsOnlyTheGivenSlot()
    {
        var equipped = new UserEquippedCosmetics(Guid.NewGuid());
        equipped.Equip(CosmeticSlot.AvatarFrame, Guid.NewGuid());
        equipped.Equip(CosmeticSlot.NameColor, Guid.NewGuid());

        equipped.Unequip(CosmeticSlot.AvatarFrame);

        Assert.Null(equipped.EquippedFrameId);
        Assert.NotNull(equipped.EquippedNameColorId);
    }

    [Fact]
    public void Unequip_EmptySlot_IsANoOp()
    {
        var equipped = new UserEquippedCosmetics(Guid.NewGuid());

        equipped.Unequip(CosmeticSlot.ProfileBanner);

        Assert.Null(equipped.EquippedBannerId);
    }
}
