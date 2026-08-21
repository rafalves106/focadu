using Focadu.Domain.Enrollments;
using Focadu.Domain.Weeklies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

/// <summary>Fase 13: progresso por usuario (novo significado de Weekly - ver WeeklyTemplate pro curriculo).</summary>
public class WeeklyConfiguration : IEntityTypeConfiguration<Weekly>
{
    public void Configure(EntityTypeBuilder<Weekly> builder)
    {
        builder.ToTable("Weeklies");
        builder.HasKey(w => w.Id);

        builder.Property(w => w.EnrollmentId).IsRequired();
        builder.Property(w => w.WeeklyTemplateId).IsRequired();
        builder.Property(w => w.StartDate).IsRequired();

        // Pass-through computados a partir de Template (Number/Title/Theme/MonthlyId) - sem
        // backing field proprio, nunca colunas reais. Sem isso, a convencao do EF Core tenta
        // mapear como propriedade escalar comum e falha ("no backing field found").
        builder.Ignore(w => w.Number);
        builder.Ignore(w => w.Title);
        builder.Ignore(w => w.Theme);
        builder.Ignore(w => w.MonthlyId);

        // Curriculo: Restrict (nao Cascade) - apagar uma WeeklyTemplate nao pode arrastar junto o
        // progresso de todo mundo matriculado; isso teria que ser uma acao deliberada, separada.
        builder.HasOne(w => w.Template)
            .WithMany()
            .HasForeignKey(w => w.WeeklyTemplateId)
            .OnDelete(DeleteBehavior.Restrict);

        // Referencia "fraca" (sem navegacao de volta em Enrollment) - se a matricula for
        // removida, cascateia (nao faz sentido progresso orfao sem matricula dona).
        builder.HasOne<Enrollment>()
            .WithMany()
            .HasForeignKey(w => w.EnrollmentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.Dailies)
            .WithOne()
            .HasForeignKey(d => d.WeeklyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.Project)
            .WithOne()
            .HasForeignKey<WeeklyProject>(p => p.WeeklyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.Publication)
            .WithOne()
            .HasForeignKey<ModulePublication>(p => p.WeeklyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.Reinforcements)
            .WithOne()
            .HasForeignKey(r => r.WeeklyId)
            .OnDelete(DeleteBehavior.Cascade);

        // 1 instancia por WeeklyTemplate por matricula - EnrollUserInCourseUseCase garante isso
        // na criacao, o indice e a garantia de banco.
        builder.HasIndex(w => new { w.EnrollmentId, w.WeeklyTemplateId }).IsUnique();
    }
}
