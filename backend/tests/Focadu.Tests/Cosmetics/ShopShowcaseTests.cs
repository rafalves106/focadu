using Focadu.Application.Seed;
using Focadu.Domain.Cosmetics;
using Focadu.Domain.Enums;
using Xunit;

namespace Focadu.Tests.Cosmetics;

public class ShopShowcaseTests
{
    private static readonly DateOnly Wednesday = new(2026, 9, 23);

    private static List<CosmeticItem> Catalog() => [.. SeedCosmeticCatalogUseCase.PixelCatalog(),
        new CosmeticItem("Moldura Bronze", CosmeticSlot.AvatarFrame, CosmeticRarity.Common, 15)];

    [Fact]
    public void Draw_IsDeterministicWithinTheWeek_AndChangesWithTheWeek()
    {
        var catalog = Catalog();
        var user = Guid.NewGuid();

        var monday = ShopShowcase.Draw(catalog, new HashSet<Guid>(), user, new DateOnly(2026, 9, 21)).Select(i => i.Code);
        var sunday = ShopShowcase.Draw(catalog, new HashSet<Guid>(), user, new DateOnly(2026, 9, 27)).Select(i => i.Code);
        Assert.Equal(monday, sunday);

        var weeks = Enumerable.Range(1, 8)
            .Select(w => string.Join(",", ShopShowcase.Draw(catalog, new HashSet<Guid>(), user, Wednesday.AddDays(7 * w)).Select(i => i.Code)))
            .ToHashSet();
        Assert.True(weeks.Count > 1);
    }

    [Fact]
    public void Draw_OnlySellsPixelItemsTheUserDoesNotOwn_NeverStarterOrLegacy()
    {
        var catalog = Catalog();
        var owned = catalog.Where(i => i.Code is "cabelo/curto" or "tenis/bota").Select(i => i.Id).ToHashSet();

        for (var n = 0; n < 50; n++)
        {
            var drawn = ShopShowcase.Draw(catalog, owned, Guid.NewGuid(), Wednesday);
            Assert.All(drawn, i =>
            {
                Assert.NotNull(i.Code);
                Assert.False(i.IsStarter);
                Assert.DoesNotContain(i.Id, owned);
            });
        }
    }

    [Fact]
    public void Draw_GivesSixDistinctItems_AtLeastTwoCommons_AtMostTwoPerSlot()
    {
        var catalog = Catalog();

        for (var n = 0; n < 200; n++)
        {
            var drawn = ShopShowcase.Draw(catalog, new HashSet<Guid>(), Guid.NewGuid(), Wednesday);

            Assert.Equal(ShopShowcase.Size, drawn.Count);
            Assert.Equal(drawn.Count, drawn.Select(i => i.Id).Distinct().Count());
            Assert.True(drawn.Count(i => i.Rarity == CosmeticRarity.Common) >= ShopShowcase.MinCommons);
            Assert.All(drawn.GroupBy(i => i.Slot), g => Assert.True(g.Count() <= ShopShowcase.MaxPerSlot));
        }
    }

    [Fact]
    public void Draw_WithFewItemsLeft_ReturnsWhatIsLeft_WithoutRepeating()
    {
        var catalog = Catalog();
        var owned = catalog.Where(i => i.Code is not null && i.Slot != CosmeticSlot.Hair).Select(i => i.Id).ToHashSet();

        var drawn = ShopShowcase.Draw(catalog, owned, Guid.NewGuid(), Wednesday);

        Assert.Equal(ShopShowcase.MaxPerSlot, drawn.Count);
        Assert.All(drawn, i => Assert.Equal(CosmeticSlot.Hair, i.Slot));
    }

    [Fact]
    public void OwnedBeforeWeek_IgnoresWhatWasAcquiredThisWeek_SoBuyingDoesNotReshuffleTheShowcase()
    {
        var catalog = Catalog();
        var user = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.Now);
        var before = ShopShowcase.Draw(catalog, new HashSet<Guid>(), user, today);

        var boughtNow = new UserCosmeticInventory(user, before[0].Id);
        var owned = ShopShowcase.OwnedBeforeWeek([boughtNow], today);

        Assert.Empty(owned);
        Assert.Equal(before.Select(i => i.Id), ShopShowcase.Draw(catalog, owned, user, today).Select(i => i.Id));
        Assert.Contains(boughtNow.CosmeticItemId, ShopShowcase.OwnedBeforeWeek([boughtNow], today.AddDays(7)));
    }

    [Theory]
    [InlineData(2026, 9, 21, 2026, 9, 21)]
    [InlineData(2026, 9, 23, 2026, 9, 21)]
    [InlineData(2026, 9, 27, 2026, 9, 21)]
    public void WeekStart_IsTheMondayOfTheWeek(int y, int m, int d, int ey, int em, int ed)
    {
        Assert.Equal(new DateOnly(ey, em, ed), ShopShowcase.WeekStart(new DateOnly(y, m, d)));
    }
}
