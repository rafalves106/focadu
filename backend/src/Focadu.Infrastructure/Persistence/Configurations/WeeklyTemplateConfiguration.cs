using System.Text.Json;
using Focadu.Domain.Weeklies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
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

        // Fase 64: briefing da Focada (text[], mesmo tipo das linguagens preferidas do perfil) e as
        // falas de estado sobrescritas pela semana (jsonb, chave -> texto). Ambos definidos 1x via seed.
        builder.Property(w => w.WeeklyProjectBriefing).IsRequired().HasDefaultValueSql("'{}'::text[]");
        builder.Property(w => w.WeeklyProjectStateLines)
            .IsRequired()
            .HasColumnType("jsonb")
            .HasDefaultValueSql("'{}'::jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, (JsonSerializerOptions?)null) ?? new Dictionary<string, string>(),
                new ValueComparer<Dictionary<string, string>>(
                    (a, b) => a!.Count == b!.Count && !a.Except(b).Any(),
                    v => v.Aggregate(0, (h, kv) => HashCode.Combine(h, kv.Key.GetHashCode(), kv.Value.GetHashCode())),
                    v => new Dictionary<string, string>(v)));

        builder.HasMany(w => w.DailyTemplates)
            .WithOne()
            .HasForeignKey(d => d.WeeklyTemplateId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.CuratedContents)
            .WithOne()
            .HasForeignKey(c => c.WeeklyTemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        // Fase 59: variantes de linguagem e referencias do projeto.
        builder.HasMany(w => w.LanguageVariants)
            .WithOne()
            .HasForeignKey(l => l.WeeklyTemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.References)
            .WithOne()
            .HasForeignKey(r => r.WeeklyTemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(w => new { w.MonthlyId, w.Number }).IsUnique();
    }
}
