using Focadu.Domain.Squads;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class SquadCheerConfiguration : IEntityTypeConfiguration<SquadCheer>
{
    public void Configure(EntityTypeBuilder<SquadCheer> builder)
    {
        builder.ToTable("SquadCheers");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.SquadId).IsRequired();
        builder.Property(c => c.ActivityKey).IsRequired().HasMaxLength(SquadCheer.MaxActivityKeyLength);
        builder.Property(c => c.FromUserId).IsRequired();
        builder.Property(c => c.CreatedAt).IsRequired();

        // Squad apagado (ultimo membro saiu) leva os GGs junto; usuario apagado tambem.
        builder.HasOne<Squad>().WithMany().HasForeignKey(c => c.SquadId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(c => c.FromUserId).OnDelete(DeleteBehavior.Cascade);

        // 1 GG por usuario por atividade (ver SquadCheer) - e o indice que o feed usa pra contar.
        builder.HasIndex(c => new { c.SquadId, c.ActivityKey, c.FromUserId }).IsUnique();
    }
}
