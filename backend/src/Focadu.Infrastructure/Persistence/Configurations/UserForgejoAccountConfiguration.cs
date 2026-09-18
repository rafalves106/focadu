using Focadu.Domain.GitHosting;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class UserForgejoAccountConfiguration : IEntityTypeConfiguration<UserForgejoAccount>
{
    public void Configure(EntityTypeBuilder<UserForgejoAccount> builder)
    {
        builder.ToTable("UserForgejoAccounts");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.UserId).IsRequired();
        builder.Property(a => a.ForgejoUsername).IsRequired();
        builder.Property(a => a.AccessToken).IsRequired();

        // Referencia "fraca" (sem navegacao de volta em User) - mesmo padrao de UserGemBalance.
        builder.HasOne<User>().WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);

        // 1:1 com User - lazy-created, nunca mais de uma linha por usuario.
        builder.HasIndex(a => a.UserId).IsUnique();
    }
}
