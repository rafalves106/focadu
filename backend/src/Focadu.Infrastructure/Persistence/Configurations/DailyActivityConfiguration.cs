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
        builder.Property(a => a.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(a => a.OrderIndex).IsRequired();
        builder.Property(a => a.Prompt);
        builder.Property(a => a.ExpectedAnswer);
        builder.Property(a => a.DailyId).IsRequired();

        builder.Ignore(a => a.HasFailedAtLeastOnce);

        builder.HasMany(a => a.Responses)
            .WithOne()
            .HasForeignKey(r => r.ActivityId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(a => a.QuizOptions)
            .WithOne()
            .HasForeignKey(o => o.ActivityId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(a => a.RoleplayNodes)
            .WithOne()
            .HasForeignKey(n => n.ActivityId)
            .OnDelete(DeleteBehavior.Cascade);

        // ContentId e uma referencia "fraca" a um CuratedContent (fora da arvore de cascata da
        // Daily): se o conteudo curado for removido, so desvincula (SetNull), nunca apaga em
        // cadeia o historico de respostas da atividade.
        builder.HasOne<CuratedContent>()
            .WithMany()
            .HasForeignKey(a => a.ContentId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);
    }
}
