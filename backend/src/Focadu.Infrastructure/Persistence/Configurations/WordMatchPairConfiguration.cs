using Focadu.Domain.Activities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class WordMatchPairConfiguration : IEntityTypeConfiguration<WordMatchPair>
{
    public void Configure(EntityTypeBuilder<WordMatchPair> builder)
    {
        builder.ToTable("WordMatchPairs");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Term).IsRequired();
        builder.Property(p => p.DefinitionId).IsRequired();
        builder.Property(p => p.Definition).IsRequired();
        builder.Property(p => p.ActivityId).IsRequired();
    }
}
