using Focadu.Domain.Content;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class CuratedContentConfiguration : IEntityTypeConfiguration<CuratedContent>
{
    public void Configure(EntityTypeBuilder<CuratedContent> builder)
    {
        builder.ToTable("CuratedContents");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Type).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(c => c.Title).IsRequired().HasMaxLength(200);
        builder.Property(c => c.ExternalUrl).HasMaxLength(2000);
        builder.Property(c => c.BodyText);
        builder.Property(c => c.WeeklyId).IsRequired();
    }
}
