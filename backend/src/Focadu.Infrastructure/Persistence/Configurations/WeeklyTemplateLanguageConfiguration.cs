using Focadu.Domain.Weeklies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

/// <summary>Fase 59: variante de linguagem do projeto de uma WeeklyTemplate (1 repositorio-modelo por linguagem).</summary>
public class WeeklyTemplateLanguageConfiguration : IEntityTypeConfiguration<WeeklyTemplateLanguage>
{
    public void Configure(EntityTypeBuilder<WeeklyTemplateLanguage> builder)
    {
        builder.ToTable("WeeklyTemplateLanguages");
        builder.HasKey(l => l.Id);

        builder.Property(l => l.WeeklyTemplateId).IsRequired();
        // Nome, nao numero (mesma convencao de WeeklyProjects.Status) - deixa o SQL de patch de
        // curadoria legivel ('Python', 'JavaScript').
        builder.Property(l => l.Language).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(l => l.ForgejoTemplateSlug).IsRequired().HasMaxLength(200);

        builder.HasIndex(l => new { l.WeeklyTemplateId, l.Language }).IsUnique();
    }
}
