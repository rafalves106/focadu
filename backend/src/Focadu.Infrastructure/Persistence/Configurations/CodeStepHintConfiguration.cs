using Focadu.Domain.Activities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fase 86: dica da Focada num passo de codigo com laboratorio. "DailyId" e a FK sombra declarada em
/// DailyConfiguration (mesmo padrao de ActivityResponse); o indice unico garante 1 dica por numero em cada passo.
/// </summary>
public class CodeStepHintConfiguration : IEntityTypeConfiguration<CodeStepHint>
{
    public void Configure(EntityTypeBuilder<CodeStepHint> builder)
    {
        builder.ToTable("CodeStepHints");
        builder.HasKey(h => h.Id);

        builder.Property(h => h.ActivityId).IsRequired();
        builder.Property(h => h.Number).IsRequired();
        builder.Property(h => h.Right).IsRequired();
        builder.Property(h => h.Wrong).IsRequired();
        builder.Property(h => h.Improve).IsRequired();
        builder.Property(h => h.CreatedAt).IsRequired();

        builder.HasIndex("DailyId", nameof(CodeStepHint.ActivityId), nameof(CodeStepHint.Number)).IsUnique();
    }
}
