using Focadu.Domain.Squads;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class SquadMembershipConfiguration : IEntityTypeConfiguration<SquadMembership>
{
    public void Configure(EntityTypeBuilder<SquadMembership> builder)
    {
        builder.ToTable("SquadMemberships");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.SquadId).IsRequired();
        builder.Property(m => m.UserId).IsRequired();
        builder.Property(m => m.JoinedAt).IsRequired();

        builder.HasOne<Squad>().WithMany().HasForeignKey(m => m.SquadId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Cascade);

        // 1 squad ativo por usuario: a linha existir JA significa "membro agora" (ver SquadMembership) - indice unico em UserId garante no banco.
        builder.HasIndex(m => m.UserId).IsUnique();
    }
}
