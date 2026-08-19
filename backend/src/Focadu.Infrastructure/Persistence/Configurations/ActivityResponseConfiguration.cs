using Focadu.Domain.Activities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class ActivityResponseConfiguration : IEntityTypeConfiguration<ActivityResponse>
{
    public void Configure(EntityTypeBuilder<ActivityResponse> builder)
    {
        builder.ToTable("ActivityResponses");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.AttemptNumber).IsRequired();
        builder.Property(r => r.Score).IsRequired();
        builder.Property(r => r.Passed).IsRequired();
        builder.Property(r => r.Transcript);
        builder.Property(r => r.Justification);
        builder.Property(r => r.AiFeedback);
        builder.Property(r => r.CreatedAt).IsRequired();
        builder.Property(r => r.ActivityId).IsRequired();

        builder.HasIndex(r => new { r.ActivityId, r.AttemptNumber }).IsUnique();
    }
}
