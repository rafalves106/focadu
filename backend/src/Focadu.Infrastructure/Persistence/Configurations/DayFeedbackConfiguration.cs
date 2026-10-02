using Focadu.Domain.Dailies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class DayFeedbackConfiguration : IEntityTypeConfiguration<DayFeedback>
{
    public void Configure(EntityTypeBuilder<DayFeedback> builder)
    {
        builder.ToTable("DayFeedbacks");
        builder.HasKey(f => f.Id);

        builder.Property(f => f.UserId).IsRequired();
        builder.Property(f => f.DailyId).IsRequired();
        builder.Property(f => f.DailyTemplateId).IsRequired();
        builder.Property(f => f.Clarity).IsRequired();
        builder.Property(f => f.StuckActivityId);
        builder.Property(f => f.StuckActivityType).HasConversion<string>().HasMaxLength(20);
        builder.Property(f => f.StuckActivityOrder);
        builder.Property(f => f.Comment).HasMaxLength(DayFeedback.MaxCommentLength);
        builder.Property(f => f.CreatedAt).IsRequired();
        builder.Property(f => f.UpdatedAt).IsRequired();

        builder.ToTable(t => t.HasCheckConstraint("CK_DayFeedbacks_Clarity", "\"Clarity\" BETWEEN 1 AND 5"));

        // Um feedback por Daily e usuario; sem navegacao (referencias fracas: o importador troca as atividades do dia).
        builder.HasIndex(f => new { f.UserId, f.DailyId }).IsUnique();
        builder.HasIndex(f => f.DailyTemplateId);
    }
}
