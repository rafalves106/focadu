using Focadu.Domain.Weeklies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class WeeklyConfiguration : IEntityTypeConfiguration<Weekly>
{
    public void Configure(EntityTypeBuilder<Weekly> builder)
    {
        builder.ToTable("Weeklies");
        builder.HasKey(w => w.Id);

        builder.Property(w => w.Title).IsRequired().HasMaxLength(200);
        builder.Property(w => w.Theme).HasMaxLength(200);
        builder.Property(w => w.Number).IsRequired();
        builder.Property(w => w.MonthlyId).IsRequired();

        builder.HasMany(w => w.Dailies)
            .WithOne()
            .HasForeignKey(d => d.WeeklyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.CuratedContents)
            .WithOne()
            .HasForeignKey(c => c.WeeklyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.Project)
            .WithOne()
            .HasForeignKey<WeeklyProject>(p => p.WeeklyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.Publication)
            .WithOne()
            .HasForeignKey<ModulePublication>(p => p.WeeklyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.Reinforcements)
            .WithOne()
            .HasForeignKey(r => r.WeeklyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(w => new { w.MonthlyId, w.Number }).IsUnique();
    }
}
