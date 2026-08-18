using Focadu.Domain.Activities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class RoleplayOptionConfiguration : IEntityTypeConfiguration<RoleplayOption>
{
    public void Configure(EntityTypeBuilder<RoleplayOption> builder)
    {
        builder.ToTable("RoleplayOptions");
        builder.HasKey(o => o.Id);

        builder.Property(o => o.Text).IsRequired();
        builder.Property(o => o.NodeId).IsRequired();

        // NextNodeId aponta para outro RoleplayNode dentro da mesma atividade. Restrict (em vez
        // de Cascade) evita apagamento em cadeia entre nodes do mesmo grafo de dialogo.
        builder.HasOne<RoleplayNode>()
            .WithMany()
            .HasForeignKey(o => o.NextNodeId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);
    }
}
