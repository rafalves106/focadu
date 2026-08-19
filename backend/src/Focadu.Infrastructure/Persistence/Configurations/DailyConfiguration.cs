using Focadu.Domain.Dailies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class DailyConfiguration : IEntityTypeConfiguration<Daily>
{
    public void Configure(EntityTypeBuilder<Daily> builder)
    {
        builder.ToTable("Dailies");
        builder.HasKey(d => d.Id);

        builder.Property(d => d.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(d => d.DayNumber).IsRequired();
        builder.Property(d => d.Date).IsRequired();
        builder.Property(d => d.IsReinforcement).IsRequired();
        builder.Property(d => d.PenaltyPoints).IsRequired();
        builder.Property(d => d.ReinforcementTriggered).IsRequired();
        builder.Property(d => d.CompletedAt);
        builder.Property(d => d.WeeklyId).IsRequired();

        // Propriedades so-leitura, calculadas a partir de outros campos - nunca uma coluna real.
        builder.Ignore(d => d.HasEverCompleted);
        builder.Ignore(d => d.IsWeakDay);

        builder.HasMany(d => d.Activities)
            .WithOne()
            .HasForeignKey(a => a.DailyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Referencia "fraca" auto-relacionada (mesmo padrao de DailyActivity.ContentId): se a
        // Daily de reforco gerada for removida por algum motivo, so desvincula (SetNull), nunca
        // apaga em cadeia a Daily de origem.
        builder.HasOne<Daily>()
            .WithMany()
            .HasForeignKey(d => d.ReinforcementDailyId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        builder.HasIndex(d => new { d.WeeklyId, d.DayNumber }).IsUnique();
    }
}
