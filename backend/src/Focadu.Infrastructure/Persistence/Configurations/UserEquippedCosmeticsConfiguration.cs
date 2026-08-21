using Focadu.Domain.Cosmetics;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class UserEquippedCosmeticsConfiguration : IEntityTypeConfiguration<UserEquippedCosmetics>
{
    public void Configure(EntityTypeBuilder<UserEquippedCosmetics> builder)
    {
        builder.ToTable("UserEquippedCosmetics");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.UserId).IsRequired();

        builder.HasOne<User>().WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);

        // Os 3 slots sao referencias "fracas" opcionais pro catalogo - SetNull (nunca cascade) se
        // o item referenciado for removido, mesmo padrao de Daily.ReinforcementDailyId.
        builder.HasOne<CosmeticItem>().WithMany().HasForeignKey(e => e.EquippedFrameId).OnDelete(DeleteBehavior.SetNull).IsRequired(false);
        builder.HasOne<CosmeticItem>().WithMany().HasForeignKey(e => e.EquippedNameColorId).OnDelete(DeleteBehavior.SetNull).IsRequired(false);
        builder.HasOne<CosmeticItem>().WithMany().HasForeignKey(e => e.EquippedBannerId).OnDelete(DeleteBehavior.SetNull).IsRequired(false);

        // 1:1 com User - lazy-created, nunca mais de uma linha por usuario.
        builder.HasIndex(e => e.UserId).IsUnique();
    }
}
