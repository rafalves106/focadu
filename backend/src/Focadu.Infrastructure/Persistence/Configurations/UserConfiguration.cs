using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Email).IsRequired().HasMaxLength(320); // RFC 5321
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.Property(u => u.DisplayName).IsRequired().HasMaxLength(200);
        builder.Property(u => u.CreatedAt).IsRequired();

        // Fase 13, Entrevista de Perfil (Onboarding) - Interests como array nativo do Postgres
        // (Npgsql mapeia List<string> <-> text[] direto, sem precisar de tabela associativa - nao
        // e dado relacional de verdade, so uma lista curta de tags escolhidas pelo usuario).
        builder.Property(u => u.Interests).HasColumnType("text[]").IsRequired();

        // Fase 59: linguagens do Projeto Semanal marcadas na Entrevista de Perfil - mesmo array
        // nativo do Postgres, guardando o NOME de cada linguagem ('Python', 'JavaScript') e nao o
        // numero do enum: legivel no SQL e imune a reordenacao do enum.
        builder.PrimitiveCollection(u => u.PreferredLanguages).ElementType().HasConversion<string>();
        builder.Property(u => u.PreferredLanguages).HasColumnType("text[]").IsRequired();
        builder.Property(u => u.AdditionalProfileNotes).HasMaxLength(2000);
        builder.Property(u => u.ProfileCompletedAt);

        // Fase 17: nulo ate a 1a consulta gerar (lazy, ver GetReferralInfoUseCase).
        builder.Property(u => u.ReferralCode).HasMaxLength(16);

        // Fase 72: "nao mostrar minhas notas no feed do squad" - desligado por padrao.
        builder.Property(u => u.HideScoresInSquadFeed).IsRequired().HasDefaultValue(false);

        builder.HasIndex(u => u.Email).IsUnique();
        builder.HasIndex(u => u.ReferralCode).IsUnique();
    }
}
