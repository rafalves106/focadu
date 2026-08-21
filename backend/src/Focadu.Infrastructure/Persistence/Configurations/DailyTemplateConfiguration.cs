using Focadu.Domain.Dailies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fase 13: curriculo (RENAME de DailyConfiguration - ver DailyTemplate). WeeklyTemplateId
/// nullable de proposito - null pros DailyTemplate "sinteticos" criados por reforco diario
/// (nunca pertencem a nenhuma WeeklyTemplate curricular, ver DailyTemplate.CreateSynthetic).
/// </summary>
public class DailyTemplateConfiguration : IEntityTypeConfiguration<DailyTemplate>
{
    public void Configure(EntityTypeBuilder<DailyTemplate> builder)
    {
        builder.ToTable("DailyTemplates");
        builder.HasKey(d => d.Id);

        builder.Property(d => d.DayNumber).IsRequired();
        builder.Property(d => d.WeeklyTemplateId);

        builder.HasMany(d => d.Activities)
            .WithOne()
            .HasForeignKey(a => a.DailyTemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        // Nulls nao colidem entre si num indice unico do Postgres - varios DailyTemplate
        // sinteticos (WeeklyTemplateId = null) convivem sem violar isso.
        builder.HasIndex(d => new { d.WeeklyTemplateId, d.DayNumber }).IsUnique();
    }
}
