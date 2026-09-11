using Focadu.Domain.Notes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class NoteConfiguration : IEntityTypeConfiguration<Note>
{
    public void Configure(EntityTypeBuilder<Note> builder)
    {
        builder.ToTable("Notes");
        builder.HasKey(n => n.Id);

        builder.Property(n => n.UserId).IsRequired();
        builder.Property(n => n.DailyId).IsRequired();
        builder.Property(n => n.Content).IsRequired();

        // Tags como array nativo do Postgres - mesmo padrao de User.Interests (Npgsql mapeia
        // List<string> <-> text[] direto, sem tabela associativa - tags sao livres, sem
        // taxonomia pre-definida pela plataforma, nao e dado relacional de verdade).
        builder.Property(n => n.Tags).HasColumnType("text[]").IsRequired();

        builder.Property(n => n.CreatedAt).IsRequired();
        builder.Property(n => n.UpdatedAt).IsRequired();

        // Sem navegacao de volta pra User/Daily (referencias "fracas", mesmo padrao de
        // Referral/Enrollment) - so indice composto pra acelerar ListByUserAndDailyIdsAsync
        // (filtro por UserId + DailyId IN (...) e o unico jeito de listar notas hoje).
        builder.HasIndex(n => new { n.UserId, n.DailyId });
    }
}
