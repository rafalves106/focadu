using Focadu.Domain.Dailies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

/// <summary>Fase 13: progresso por usuario (novo significado de Daily - ver DailyTemplate pro curriculo).</summary>
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
        builder.Property(d => d.DailyTemplateId).IsRequired();

        // Propriedades so-leitura, calculadas a partir de outros campos - nunca uma coluna real.
        builder.Ignore(d => d.HasEverCompleted);
        builder.Ignore(d => d.IsWeakDay);

        // Pass-through pra Template.Activities (sem backing field proprio) - mesmo motivo do
        // Ignore em WeeklyConfiguration acima.
        builder.Ignore(d => d.Activities);

        // Curriculo: Restrict, mesmo raciocinio de Weekly.Template acima. Cobre tanto
        // DailyTemplate curricular (compartilhado entre usuarios) quanto sintetico (proprio de
        // reforco - so esta Daily aponta pra ele, mas o FK e o mesmo mecanismo pros dois casos).
        builder.HasOne(d => d.Template)
            .WithMany()
            .HasForeignKey(d => d.DailyTemplateId)
            .OnDelete(DeleteBehavior.Restrict);

        // Fase 13: ActivityResponse pertence a Daily-instancia agora (nao mais a DailyActivity,
        // que virou curriculo compartilhado) - "DailyId" e shadow property (sem campo de dominio
        // correspondente, ActivityResponse nunca precisou expor o proprio dono publicamente).
        builder.HasMany(d => d.Responses)
            .WithOne()
            .HasForeignKey("DailyId")
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);

        // Referencia "fraca" auto-relacionada (mesmo padrao de DailyActivity.ContentId antes): se
        // a Daily de reforco gerada for removida por algum motivo, so desvincula (SetNull), nunca
        // apaga em cadeia a Daily de origem.
        builder.HasOne<Daily>()
            .WithMany()
            .HasForeignKey(d => d.ReinforcementDailyId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        builder.HasIndex(d => new { d.WeeklyId, d.DayNumber }).IsUnique();
    }
}
