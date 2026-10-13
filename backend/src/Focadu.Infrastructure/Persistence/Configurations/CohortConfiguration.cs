using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class CohortConfiguration : IEntityTypeConfiguration<Cohort>
{
    public void Configure(EntityTypeBuilder<Cohort> builder)
    {
        builder.ToTable("Cohorts");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name).IsRequired().HasMaxLength(Cohort.MaxNameLength);
        // Ids dos cursos num array nativo do Postgres (mesmo jeito de Course.Requirements): sem FK de proposito - curso
        // apagado so some da lista na leitura, a turma nao quebra.
        builder.Property(c => c.CourseIds).HasColumnType("uuid[]").IsRequired();
        builder.Property(c => c.CreatedAt).IsRequired();
        builder.Property(c => c.ArchivedAt);
        builder.Ignore(c => c.IsArchived);
    }
}
