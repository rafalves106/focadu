using Focadu.Domain.Cosmetics;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class UserCosmeticInventoryConfiguration : IEntityTypeConfiguration<UserCosmeticInventory>
{
    public void Configure(EntityTypeBuilder<UserCosmeticInventory> builder)
    {
        builder.ToTable("UserCosmeticInventories");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.UserId).IsRequired();
        builder.Property(e => e.CosmeticItemId).IsRequired();
        builder.Property(e => e.AcquiredAt).IsRequired();

        // Referencias "fracas" (sem navegacao de volta) - mesmo padrao de Enrollment.
        builder.HasOne<User>().WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<CosmeticItem>().WithMany().HasForeignKey(e => e.CosmeticItemId).OnDelete(DeleteBehavior.Cascade);

        // 1 compra por usuario por item - mesma garantia dupla (Application checa antes de criar +
        // indice unico) de Enrollment (UserId, CourseId).
        builder.HasIndex(e => new { e.UserId, e.CosmeticItemId }).IsUnique();
    }
}
