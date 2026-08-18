using Focadu.Domain.Activities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class RoleplayNodeConfiguration : IEntityTypeConfiguration<RoleplayNode>
{
    public void Configure(EntityTypeBuilder<RoleplayNode> builder)
    {
        builder.ToTable("RoleplayNodes");
        builder.HasKey(n => n.Id);

        builder.Property(n => n.NodeKey).IsRequired().HasMaxLength(100);
        builder.Property(n => n.Text).IsRequired();
        builder.Property(n => n.IsTerminal).IsRequired();
        builder.Property(n => n.TerminalQuality).HasConversion<string>().HasMaxLength(20);
        builder.Property(n => n.ActivityId).IsRequired();

        builder.HasMany(n => n.Options)
            .WithOne()
            .HasForeignKey(o => o.NodeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(n => new { n.ActivityId, n.NodeKey }).IsUnique();
    }
}
