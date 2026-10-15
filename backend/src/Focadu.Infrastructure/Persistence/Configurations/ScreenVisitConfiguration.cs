using Focadu.Domain.ProductMetrics;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

// Fase 103, Medicao de produto. Sem chave estrangeira de proposito (como a medicao de IA): sobrevive a apagar aluno.
// O indice unico e o que o INSERT ... ON CONFLICT do ScreenVisitRepository usa.
public class ScreenVisitConfiguration : IEntityTypeConfiguration<ScreenVisit>
{
    public void Configure(EntityTypeBuilder<ScreenVisit> builder)
    {
        builder.ToTable("ScreenVisits");
        builder.HasKey(v => v.Id);
        builder.Property(v => v.UserId).IsRequired();
        builder.Property(v => v.Day).IsRequired();
        builder.Property(v => v.Screen).HasMaxLength(40).IsRequired();
        builder.Property(v => v.Device).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(v => v.FirstSeenAt).IsRequired();

        builder.HasIndex(v => new { v.UserId, v.Day, v.Screen, v.Device }).IsUnique();
        builder.HasIndex(v => v.Day);
    }
}
