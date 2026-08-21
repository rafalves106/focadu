using Focadu.Domain.Referrals;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class ReferralConfiguration : IEntityTypeConfiguration<Referral>
{
    public void Configure(EntityTypeBuilder<Referral> builder)
    {
        builder.ToTable("Referrals");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.ReferrerUserId).IsRequired();
        builder.Property(r => r.ReferredUserId).IsRequired();
        builder.Property(r => r.CreatedAt).IsRequired();
        builder.Property(r => r.ConfirmedAt);

        // Referencias "fracas" (sem navegacao de volta) - mesmo padrao de Enrollment. 2 FKs pra
        // User (indicador/indicado) - sem cascade duplo: se qualquer um dos 2 usuarios for
        // removido, Restrict evita ambiguidade de qual caminho de cascade o Postgres deveria
        // seguir (2 FKs pra mesma tabela na mesma linha).
        builder.HasOne<User>().WithMany().HasForeignKey(r => r.ReferrerUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(r => r.ReferredUserId).OnDelete(DeleteBehavior.Restrict);

        // 1 indicacao por indicado - um usuario so pode ter sido indicado por alguem uma vez.
        builder.HasIndex(r => r.ReferredUserId).IsUnique();
    }
}
