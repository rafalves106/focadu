using Focadu.Domain.Weeklies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

/// <summary>Fase 59: link de referencia (biblioteca/documentacao) de um projeto, curado na mao.</summary>
public class WeeklyTemplateReferenceConfiguration : IEntityTypeConfiguration<WeeklyTemplateReference>
{
    public void Configure(EntityTypeBuilder<WeeklyTemplateReference> builder)
    {
        builder.ToTable("WeeklyTemplateReferences");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.WeeklyTemplateId).IsRequired();
        // Nulo = vale pra todas as linguagens da semana.
        builder.Property(r => r.Language).HasConversion<string>().HasMaxLength(20);
        builder.Property(r => r.Title).IsRequired().HasMaxLength(WeeklyTemplateReference.MaxTitleLength);
        builder.Property(r => r.Url).IsRequired().HasMaxLength(WeeklyTemplateReference.MaxUrlLength);
        builder.Property(r => r.Documents).IsRequired().HasMaxLength(WeeklyTemplateReference.MaxDocumentsLength);
        builder.Property(r => r.Position).IsRequired();
        builder.Property(r => r.LastVerifiedAt);

        builder.HasIndex(r => new { r.WeeklyTemplateId, r.Position });
    }
}
