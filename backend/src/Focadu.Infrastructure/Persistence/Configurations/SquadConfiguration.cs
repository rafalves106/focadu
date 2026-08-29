using Focadu.Domain.Squads;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class SquadConfiguration : IEntityTypeConfiguration<Squad>
{
    public void Configure(EntityTypeBuilder<Squad> builder)
    {
        builder.ToTable("Squads");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Name).IsRequired().HasMaxLength(60);
        builder.Property(s => s.OwnerUserId).IsRequired();
        builder.Property(s => s.JoinCode).HasMaxLength(8);
        builder.Property(s => s.CreatedAt).IsRequired();

        // Referencia "fraca" (sem navegacao de volta em User) - mesmo padrao de Enrollment.UserId.
        builder.HasOne<User>().WithMany().HasForeignKey(s => s.OwnerUserId).OnDelete(DeleteBehavior.Cascade);

        // Nulo ate a 1a leitura gerar (lazy, ver GetSquadRankingUseCase) - unico so entre os nao-nulos (comportamento padrao de indice unico + coluna nullable no Postgres).
        builder.HasIndex(s => s.JoinCode).IsUnique();
    }
}
