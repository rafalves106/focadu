using Focadu.Domain.Courses;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class CourseConfiguration : IEntityTypeConfiguration<Course>
{
    public void Configure(EntityTypeBuilder<Course> builder)
    {
        builder.ToTable("Courses");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(c => c.Description).HasMaxLength(1000);
        // Fase 84: ficha do curso - mesmo array nativo do Postgres de User.Interests.
        builder.Property(c => c.Requirements).HasColumnType("text[]").IsRequired();
        builder.Property(c => c.RecommendedBefore).HasColumnType("text[]").IsRequired();
        builder.Property(c => c.PreparesText).HasMaxLength(500);
        builder.Property(c => c.OnlyForCohorts).IsRequired().HasDefaultValue(false);
        // Fase 97: marca de edicao do catalogo pelo Painel (nula = vale o curso.json).
        builder.Property(c => c.CatalogEditedAt);
        builder.Property(c => c.StatusSetByAdminAt);
        builder.Ignore(c => c.CanAutoPublish);
        builder.Ignore(c => c.CatalogEditedByAdmin);

        builder.HasMany(c => c.Monthlies)
            .WithOne()
            .HasForeignKey("CourseId")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
