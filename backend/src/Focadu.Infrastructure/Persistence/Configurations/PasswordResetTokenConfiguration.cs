using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class PasswordResetTokenConfiguration : IEntityTypeConfiguration<PasswordResetToken>
{
    public void Configure(EntityTypeBuilder<PasswordResetToken> builder)
    {
        builder.ToTable("PasswordResetTokens");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.UserId).IsRequired();
        builder.Property(t => t.TokenHash).IsRequired().HasMaxLength(64); // SHA-256 em hex = 64 chars
        builder.Property(t => t.ExpiresAt).IsRequired();
        builder.Property(t => t.CreatedAt).IsRequired();
        builder.Property(t => t.UsedAt);

        builder.HasIndex(t => t.TokenHash).IsUnique();
        builder.HasIndex(t => t.UserId);
    }
}
