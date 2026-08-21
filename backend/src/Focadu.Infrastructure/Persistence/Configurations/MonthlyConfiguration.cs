using Focadu.Domain.Monthlies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class MonthlyConfiguration : IEntityTypeConfiguration<Monthly>
{
    public void Configure(EntityTypeBuilder<Monthly> builder)
    {
        builder.ToTable("Monthlies");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Title).IsRequired().HasMaxLength(200);
        builder.Property(m => m.Number).IsRequired();
        builder.Property(m => m.CourseId).IsRequired();

        builder.HasMany(m => m.WeeklyTemplates)
            .WithOne()
            .HasForeignKey(w => w.MonthlyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(m => new { m.CourseId, m.Number }).IsUnique();
    }
}
