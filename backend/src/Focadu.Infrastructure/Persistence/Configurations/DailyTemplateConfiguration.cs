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
        // Fase 69: variante de linguagem do dia (a ponte) - mesma conversao de WeeklyProject.Language.
        builder.Property(d => d.Language).HasConversion<string>().HasMaxLength(20);

        builder.HasMany(d => d.Activities)
            .WithOne()
            .HasForeignKey(a => a.DailyTemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        // Nulls nao colidem entre si num indice unico do Postgres - varios DailyTemplate
        // sinteticos (WeeklyTemplateId = null) convivem sem violar isso. Fase 69: a linguagem entra
        // no indice (a ponte tem um DailyTemplate por linguagem no mesmo DayNumber). Com Language
        // nulo o indice nao impede um 2o dia unico no mesmo DayNumber - quem garante isso e
        // WeeklyTemplate.AddDailyTemplate.
        builder.HasIndex(d => new { d.WeeklyTemplateId, d.DayNumber, d.Language }).IsUnique();
    }
}
