using Focadu.Domain.Squads;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class SquadJoinRequestConfiguration : IEntityTypeConfiguration<SquadJoinRequest>
{
    public void Configure(EntityTypeBuilder<SquadJoinRequest> builder)
    {
        builder.ToTable("SquadJoinRequests");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.SquadId).IsRequired();
        builder.Property(r => r.UserId).IsRequired();
        // Nome do status em texto (legivel no SQL e imune a reordenacao do enum) - mesmo criterio de Users.PreferredLanguages.
        builder.Property(r => r.Status).IsRequired().HasConversion<string>().HasMaxLength(32);
        builder.Property(r => r.CreatedAt).IsRequired();
        builder.Property(r => r.DecidedAt);
        builder.Property(r => r.DecidedByUserId);
        builder.Ignore(r => r.ExpiresAt);

        // Squad apagado (ultimo membro saiu) leva os pedidos junto; quem pediu apagado tambem.
        builder.HasOne<Squad>().WithMany().HasForeignKey(r => r.SquadId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => new { r.SquadId, r.Status });
        builder.HasIndex(r => r.UserId);
    }
}
