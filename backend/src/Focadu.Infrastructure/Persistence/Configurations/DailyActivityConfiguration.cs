using Focadu.Domain.Activities;
using Focadu.Domain.Content;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class DailyActivityConfiguration : IEntityTypeConfiguration<DailyActivity>
{
    public void Configure(EntityTypeBuilder<DailyActivity> builder)
    {
        builder.ToTable("DailyActivities");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Type).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(a => a.AnswerMode).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(a => a.OrderIndex).IsRequired();
        builder.Property(a => a.Prompt);
        builder.Property(a => a.ExpectedAnswer);
        builder.Property(a => a.DailyTemplateId).IsRequired();

        builder.HasMany(a => a.QuizOptions)
            .WithOne()
            .HasForeignKey(o => o.ActivityId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(a => a.WordMatchPairs)
            .WithOne()
            .HasForeignKey(p => p.ActivityId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(a => a.RoleplayNodes)
            .WithOne()
            .HasForeignKey(n => n.ActivityId)
            .OnDelete(DeleteBehavior.Cascade);

        // ContentId e uma referencia "fraca" a um CuratedContent (fora da arvore de cascata da
        // DailyTemplate): se o conteudo curado for removido, so desvincula (SetNull), nunca apaga
        // em cadeia a definicao da atividade.
        builder.HasOne<CuratedContent>()
            .WithMany()
            .HasForeignKey(a => a.ContentId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);
    }
}
