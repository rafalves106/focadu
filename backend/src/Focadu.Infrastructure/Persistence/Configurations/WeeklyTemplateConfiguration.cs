using Focadu.Domain.Weeklies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

/// <summary>Fase 13: curriculo (RENAME de WeeklyConfiguration - ver WeeklyTemplate).</summary>
public class WeeklyTemplateConfiguration : IEntityTypeConfiguration<WeeklyTemplate>
{
    public void Configure(EntityTypeBuilder<WeeklyTemplate> builder)
    {
        builder.ToTable("WeeklyTemplates");
        builder.HasKey(w => w.Id);

        builder.Property(w => w.Title).IsRequired().HasMaxLength(200);
        builder.Property(w => w.Theme).HasMaxLength(200);
        builder.Property(w => w.Number).IsRequired();
        builder.Property(w => w.MonthlyId).IsRequired();
        builder.Property(w => w.WeeklyProjectSpecText);

        builder.HasMany(w => w.DailyTemplates)
            .WithOne()
            .HasForeignKey(d => d.WeeklyTemplateId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.CuratedContents)
            .WithOne()
            .HasForeignKey(c => c.WeeklyTemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(w => new { w.MonthlyId, w.Number }).IsUnique();
    }
}
