using Focadu.Domain.Courses;
using Focadu.Domain.Rooms;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

// Fase 110: Salas práticas - currículo (Room/RoomTask) e progresso por aluno (RoomProgress/RoomTaskResult).
public class RoomConfiguration : IEntityTypeConfiguration<Room>
{
    public void Configure(EntityTypeBuilder<Room> builder)
    {
        builder.ToTable("Rooms");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Slug).IsRequired().HasMaxLength(80);
        builder.Property(r => r.Title).IsRequired().HasMaxLength(120);
        builder.Property(r => r.Kind).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(r => r.Difficulty).IsRequired().HasMaxLength(30);
        builder.Property(r => r.Summary).IsRequired().HasMaxLength(600);
        builder.Property(r => r.Scenario).IsRequired();
        builder.Property(r => r.MachineLabel).IsRequired().HasMaxLength(120);
        builder.Property(r => r.Prerequisites).HasColumnType("text[]").IsRequired();
        builder.Property(r => r.FinalPrompt).IsRequired();
        builder.Property(r => r.FinalReferenceAnswer).IsRequired();
        builder.Property(r => r.ContentHash).IsRequired().HasMaxLength(64);
        builder.Property(r => r.ContentFolder).IsRequired().HasMaxLength(80);

        builder.HasOne<Course>().WithMany().HasForeignKey(r => r.CourseId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(r => new { r.CourseId, r.Slug }).IsUnique();

        builder.HasMany(r => r.Tasks).WithOne().HasForeignKey("RoomId").IsRequired().OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(r => r.Tasks).HasField("_tasks").UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public class RoomTaskConfiguration : IEntityTypeConfiguration<RoomTask>
{
    public void Configure(EntityTypeBuilder<RoomTask> builder)
    {
        builder.ToTable("RoomTasks");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Key).IsRequired().HasMaxLength(60);
        builder.Property(t => t.Title).IsRequired().HasMaxLength(160);
        builder.Property(t => t.ChainLabel).HasMaxLength(60);
        builder.Property(t => t.Theory).IsRequired();
        builder.Property(t => t.Question).IsRequired();
        builder.Property(t => t.AnswerFormat).IsRequired().HasMaxLength(120);
        builder.Property(t => t.FlagHash).IsRequired().HasMaxLength(64);
        builder.Property(t => t.Hints).HasColumnType("text[]").IsRequired();
        builder.Property(t => t.VoicePrompt).IsRequired();
        builder.Property(t => t.VoiceReferenceAnswer).IsRequired();
    }
}

public class RoomProgressConfiguration : IEntityTypeConfiguration<RoomProgress>
{
    public void Configure(EntityTypeBuilder<RoomProgress> builder)
    {
        builder.ToTable("RoomProgresses");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.StartedAt).IsRequired();
        builder.Property(p => p.FinalAttempts).HasColumnType("timestamp with time zone[]").IsRequired();
        builder.Ignore(p => p.Completed);

        builder.HasOne<User>().WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Room>().WithMany().HasForeignKey(p => p.RoomId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(p => new { p.UserId, p.RoomId }).IsUnique();

        builder.HasMany(p => p.Results).WithOne().HasForeignKey("RoomProgressId").IsRequired().OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(p => p.Results).HasField("_results").UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public class RoomTaskResultConfiguration : IEntityTypeConfiguration<RoomTaskResult>
{
    public void Configure(EntityTypeBuilder<RoomTaskResult> builder)
    {
        builder.ToTable("RoomTaskResults");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.VoiceAttempts).HasColumnType("timestamp with time zone[]").IsRequired();
        // TaskId sem FK: a tarefa pode sair numa reimportação, e o importador limpa o progresso dela (RemoveResults).
        builder.HasIndex("RoomProgressId", nameof(RoomTaskResult.TaskId)).IsUnique();
    }
}
