using Focadu.Domain.Weeklies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class ModulePublicationConfiguration : IEntityTypeConfiguration<ModulePublication>
{
    public void Configure(EntityTypeBuilder<ModulePublication> builder)
    {
        builder.ToTable("ModulePublications");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.WeeklyId).IsRequired();
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(p => p.Platform).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.SubmittedUrl).HasMaxLength(2000);
        builder.Property(p => p.GeneratedDraft);
        builder.Property(p => p.ValidationError).HasMaxLength(2000);

        builder.HasIndex(p => p.WeeklyId).IsUnique();
    }
}
