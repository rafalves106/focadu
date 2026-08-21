using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Email).IsRequired().HasMaxLength(320); // RFC 5321
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.Property(u => u.DisplayName).IsRequired().HasMaxLength(200);
        builder.Property(u => u.CreatedAt).IsRequired();

        // Fase 13, Entrevista de Perfil (Onboarding) - Interests como array nativo do Postgres
        // (Npgsql mapeia List<string> <-> text[] direto, sem precisar de tabela associativa - nao
        // e dado relacional de verdade, so uma lista curta de tags escolhidas pelo usuario).
        builder.Property(u => u.Interests).HasColumnType("text[]").IsRequired();
        builder.Property(u => u.AdditionalProfileNotes).HasMaxLength(2000);
        builder.Property(u => u.ProfileCompletedAt);

        builder.HasIndex(u => u.Email).IsUnique();
    }
}
