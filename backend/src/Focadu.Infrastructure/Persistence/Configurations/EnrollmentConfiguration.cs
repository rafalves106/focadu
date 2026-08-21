using Focadu.Domain.Courses;
using Focadu.Domain.Enrollments;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class EnrollmentConfiguration : IEntityTypeConfiguration<Enrollment>
{
    public void Configure(EntityTypeBuilder<Enrollment> builder)
    {
        builder.ToTable("Enrollments");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.UserId).IsRequired();
        builder.Property(e => e.CourseId).IsRequired();
        builder.Property(e => e.EnrolledAt).IsRequired();

        // Referencias "fracas" (sem navegacao de volta em User/Course) - so FK real pra
        // integridade referencial no banco.
        builder.HasOne<User>().WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Course>().WithMany().HasForeignKey(e => e.CourseId).OnDelete(DeleteBehavior.Cascade);

        // 1 matricula por usuario por curso - mesma garantia dupla (Application checa antes de
        // criar, indice unico garante no banco) do email unico de User (Fase 12).
        builder.HasIndex(e => new { e.UserId, e.CourseId }).IsUnique();
    }
}
