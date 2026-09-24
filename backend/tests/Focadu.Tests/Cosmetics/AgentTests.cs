using Focadu.Application.Seed;
using Focadu.Domain.Cosmetics;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Xunit;

namespace Focadu.Tests.Cosmetics;

public class AgentTests
{
    [Fact]
    public void CreateAgent_SetsSkinTone_OnlyOnce()
    {
        var equipped = new UserEquippedCosmetics(Guid.NewGuid());
        Assert.False(equipped.HasAgent);

        equipped.CreateAgent(3);

        Assert.True(equipped.HasAgent);
        Assert.Equal(3, equipped.SkinTone);
        Assert.Throws<DomainException>(() => equipped.CreateAgent(2));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void SkinTone_OutOfRange_Throws(int tone)
    {
        Assert.Throws<DomainException>(() => new UserEquippedCosmetics(Guid.NewGuid()).CreateAgent(tone));
    }

    [Fact]
    public void Clothing_TopBottomShoesCannotBeRemoved_HairCan()
    {
        var equipped = new UserEquippedCosmetics(Guid.NewGuid());
        var hair = Guid.NewGuid();
        equipped.Equip(CosmeticSlot.Hair, hair);
        equipped.Equip(CosmeticSlot.Top, Guid.NewGuid());

        Assert.Throws<DomainException>(() => equipped.Unequip(CosmeticSlot.Top));
        Assert.Throws<DomainException>(() => equipped.Unequip(CosmeticSlot.Bottom));
        Assert.Throws<DomainException>(() => equipped.Unequip(CosmeticSlot.Shoes));

        equipped.Unequip(CosmeticSlot.Hair);
        Assert.Null(equipped.EquippedHairId);
    }

    [Fact]
    public void PixelCatalog_HasTheStarterKitAndNaturalHairs_WithUniqueCodes()
    {
        var catalog = SeedCosmeticCatalogUseCase.PixelCatalog();

        Assert.Equal(catalog.Count, catalog.Select(i => i.Code).Distinct().Count());
        foreach (var code in AgentStarter.KitCodes)
            Assert.Contains(catalog, i => i.Code == code && i.IsStarter && i.PriceGems == 0);
        foreach (var code in AgentStarter.NaturalHairCodes)
            Assert.Contains(catalog, i => i.Code == code && !i.IsStarter && i.Slot == CosmeticSlot.Hair && i.Rarity == CosmeticRarity.Common);
    }

    [Fact]
    public void PixelItem_RequiresCode_AndStarterIsNeverSold()
    {
        Assert.Throws<DomainException>(() => new CosmeticItem("X", CosmeticSlot.Top, CosmeticRarity.Common, 10, " "));
        Assert.False(new CosmeticItem("Kit", CosmeticSlot.Top, CosmeticRarity.Common, 0, "a/b", isStarter: true).IsSoldInShop);
        Assert.False(new CosmeticItem("Legado", CosmeticSlot.AvatarFrame, CosmeticRarity.Common, 10).IsSoldInShop);
        Assert.True(new CosmeticItem("Peça", CosmeticSlot.Top, CosmeticRarity.Common, 10, "a/c").IsSoldInShop);
    }
}
