using Focadu.Domain.Gamification;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class UserStreakConfiguration : IEntityTypeConfiguration<UserStreak>
{
    public void Configure(EntityTypeBuilder<UserStreak> builder)
    {
        builder.ToTable("UserStreaks");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.UserId).IsRequired();
        builder.Property(s => s.CurrentStreak).IsRequired();
        builder.Property(s => s.LongestStreak).IsRequired();
        builder.Property(s => s.LastCompletedDate);

        // Referencia "fraca" (sem navegacao de volta em User) - mesmo padrao de Enrollment.
        builder.HasOne<User>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);

        // 1:1 com User - lazy-created, nunca mais de uma linha por usuario.
        builder.HasIndex(s => s.UserId).IsUnique();
    }
}
