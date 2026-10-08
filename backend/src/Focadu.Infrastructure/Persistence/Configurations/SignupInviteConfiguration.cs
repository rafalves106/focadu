using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class SignupInviteConfiguration : IEntityTypeConfiguration<SignupInvite>
{
    public void Configure(EntityTypeBuilder<SignupInvite> builder)
    {
        builder.ToTable("SignupInvites");
        builder.HasKey(i => i.Id);

        builder.Property(i => i.Code).IsRequired().HasMaxLength(8);
        builder.Property(i => i.Note).IsRequired().HasMaxLength(200);
        builder.Property(i => i.MaxUses).IsRequired();
        builder.Property(i => i.UsedCount).IsRequired();
        builder.Property(i => i.ExpiresAt);
        builder.Property(i => i.RevokedAt);
        builder.Property(i => i.CreatedAt).IsRequired();

        // Dois cadastros ao mesmo tempo com o ultimo uso: o segundo SaveChanges falha na concorrencia otimista
        // (xmin do Postgres) e vira convite_esgotado em UnitOfWork, em vez de gastar o convite duas vezes.
        builder.Property<uint>("xmin").HasColumnType("xid").ValueGeneratedOnAddOrUpdate().IsConcurrencyToken();

        builder.HasIndex(i => i.Code).IsUnique();
    }
}
