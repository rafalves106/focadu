using Focadu.Domain.Gamification;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class UserGemBalanceConfiguration : IEntityTypeConfiguration<UserGemBalance>
{
    public void Configure(EntityTypeBuilder<UserGemBalance> builder)
    {
        builder.ToTable("UserGemBalances");
        builder.HasKey(b => b.Id);

        builder.Property(b => b.UserId).IsRequired();
        builder.Property(b => b.TotalGems).IsRequired();
        builder.Property(b => b.GemsFromDailiesThisMonth).IsRequired();
        builder.Property(b => b.GemsFromWeekliesThisMonth).IsRequired();
        builder.Property(b => b.GemsFromMonthlyThisMonth).IsRequired();
        builder.Property(b => b.CurrentMonthPeriod).IsRequired();

        // Referencia "fraca" (sem navegacao de volta em User) - mesmo padrao de Enrollment.
        builder.HasOne<User>().WithMany().HasForeignKey(b => b.UserId).OnDelete(DeleteBehavior.Cascade);

        // 1:1 com User - lazy-created, nunca mais de uma linha por usuario.
        builder.HasIndex(b => b.UserId).IsUnique();
    }
}
