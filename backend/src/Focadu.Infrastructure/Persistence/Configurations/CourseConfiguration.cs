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

        builder.HasMany(c => c.Monthlies)
            .WithOne()
            .HasForeignKey("CourseId")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
