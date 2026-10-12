using Focadu.Domain.AiUsage;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

// Fase 94, Medicao de IA. Sem chave estrangeira de proposito: a medicao sobrevive a apagar dia, curso ou aluno.
public class AiUsageRecordConfiguration : IEntityTypeConfiguration<AiUsageRecord>
{
    public void Configure(EntityTypeBuilder<AiUsageRecord> builder)
    {
        builder.ToTable("AiUsageRecords");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.OccurredAt).IsRequired();
        builder.Property(r => r.CallType).HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(r => r.Model).HasMaxLength(100).IsRequired();
        builder.Property(r => r.InputTokens).IsRequired();
        builder.Property(r => r.OutputTokens).IsRequired();
        builder.Property(r => r.AudioSeconds).IsRequired();
        builder.Property(r => r.Succeeded).IsRequired();

        builder.HasIndex(r => r.OccurredAt);
        builder.HasIndex(r => new { r.UserId, r.OccurredAt });
    }
}

public class AiModelPriceConfiguration : IEntityTypeConfiguration<AiModelPrice>
{
    public void Configure(EntityTypeBuilder<AiModelPrice> builder)
    {
        builder.ToTable("AiModelPrices");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Model).HasMaxLength(100).IsRequired();
        builder.Property(p => p.InputPerMillionUsd).HasPrecision(12, 6);
        builder.Property(p => p.OutputPerMillionUsd).HasPrecision(12, 6);
        builder.Property(p => p.AudioPerHourUsd).HasPrecision(12, 6);
        builder.Property(p => p.UpdatedAt).IsRequired();
        builder.Property(p => p.UpdatedBy).HasMaxLength(200).IsRequired();
        builder.Property(p => p.Source).HasMaxLength(200);
        builder.HasIndex(p => p.Model).IsUnique();
    }
}

public class AiUsageSettingsConfiguration : IEntityTypeConfiguration<AiUsageSettings>
{
    public void Configure(EntityTypeBuilder<AiUsageSettings> builder)
    {
        builder.ToTable("AiUsageSettings");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.MeasuringSince).IsRequired();
        builder.Property(s => s.MonthlyCapUsd).HasPrecision(12, 2);
    }
}
