using Focadu.Domain.Cosmetics;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class CosmeticItemConfiguration : IEntityTypeConfiguration<CosmeticItem>
{
    public void Configure(EntityTypeBuilder<CosmeticItem> builder)
    {
        builder.ToTable("CosmeticItems");
        builder.HasKey(i => i.Id);

        builder.Property(i => i.Name).IsRequired().HasMaxLength(100);
        builder.Property(i => i.Slot).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(i => i.Rarity).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(i => i.PriceGems).IsRequired();
        builder.Property(i => i.AssetUrl).HasMaxLength(2000);
        builder.Property(i => i.IsAnimated).IsRequired();
    }
}
