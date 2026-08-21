using Focadu.Domain.Cosmetics;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Xunit;

namespace Focadu.Tests.Cosmetics;

public class CosmeticItemTests
{
    [Fact]
    public void Create_WithValidData_SetsFieldsAndNeverAnimated()
    {
        var item = new CosmeticItem("Moldura Bronze", CosmeticSlot.AvatarFrame, CosmeticRarity.Common, 15);

        Assert.Equal("Moldura Bronze", item.Name);
        Assert.Equal(CosmeticSlot.AvatarFrame, item.Slot);
        Assert.Equal(CosmeticRarity.Common, item.Rarity);
        Assert.Equal(15, item.PriceGems);
        Assert.False(item.IsAnimated);
        Assert.Null(item.AssetUrl);
    }

    [Fact]
    public void Create_WithBlankName_Throws()
    {
        Assert.Throws<DomainException>(() => new CosmeticItem("   ", CosmeticSlot.AvatarFrame, CosmeticRarity.Common, 15));
    }

    [Fact]
    public void Create_WithNegativePrice_Throws()
    {
        Assert.Throws<DomainException>(() => new CosmeticItem("Moldura Bronze", CosmeticSlot.AvatarFrame, CosmeticRarity.Common, -1));
    }
}
