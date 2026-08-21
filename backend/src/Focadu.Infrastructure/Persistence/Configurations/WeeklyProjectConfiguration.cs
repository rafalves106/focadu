using Focadu.Domain.Weeklies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class WeeklyProjectConfiguration : IEntityTypeConfiguration<WeeklyProject>
{
    public void Configure(EntityTypeBuilder<WeeklyProject> builder)
    {
        builder.ToTable("WeeklyProjects");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(p => p.SubmissionUrl).HasMaxLength(2000);
        builder.Property(p => p.WeeklyId).IsRequired();

        builder.HasIndex(p => p.WeeklyId).IsUnique();
    }
}
