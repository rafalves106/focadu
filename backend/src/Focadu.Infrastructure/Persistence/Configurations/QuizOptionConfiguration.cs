using Focadu.Domain.Activities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class QuizOptionConfiguration : IEntityTypeConfiguration<QuizOption>
{
    public void Configure(EntityTypeBuilder<QuizOption> builder)
    {
        builder.ToTable("QuizOptions");
        builder.HasKey(o => o.Id);

        builder.Property(o => o.Text).IsRequired();
        builder.Property(o => o.IsCorrect).IsRequired();
        builder.Property(o => o.ActivityId).IsRequired();
    }
}
