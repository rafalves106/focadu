using Focadu.Domain.Content;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class PersonalizedAnalogyConfiguration : IEntityTypeConfiguration<PersonalizedAnalogy>
{
    public void Configure(EntityTypeBuilder<PersonalizedAnalogy> builder)
    {
        builder.ToTable("PersonalizedAnalogies");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.UserId).IsRequired();
        builder.Property(a => a.CuratedContentId).IsRequired();

        // Referencias "fracas" (sem navegacao de volta) - mesmo padrao de UserGemBalance/Enrollment.
        builder.HasOne<User>().WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<CuratedContent>().WithMany().HasForeignKey(a => a.CuratedContentId).OnDelete(DeleteBehavior.Cascade);

        // Cache 1:1 por (usuario, conteudo) - no maximo 1 PersonalizedAnalogy por par.
        builder.HasIndex(a => new { a.UserId, a.CuratedContentId }).IsUnique();

        // Sections e so uma projecao de leitura (OrderBy sobre _sections) - nunca uma coluna/
        // navegacao real (mesmo padrao de WeeklyReinforcement.WeakDailyIds).
        builder.Ignore(a => a.Sections);

        // Uma analogia por secao, tabela associativa de verdade (mesmo padrao de
        // WeeklyReinforcement/WeakDailyLink) - sem FK externa aqui (secao nao referencia nada fora
        // de si mesma), so uma tabela owned pra nao empacotar tudo numa coluna so.
        builder.OwnsMany<AnalogySection>("_sections", s =>
        {
            s.ToTable("PersonalizedAnalogySections");
            s.WithOwner().HasForeignKey("PersonalizedAnalogyId");
            // Sem isso o EF trata SectionIndex como identity autogerada (convencao de int em PK
            // composta) - o valor e sempre o que o dominio atribui (posicao da secao), nunca o banco.
            s.Property(x => x.SectionIndex).IsRequired().ValueGeneratedNever();
            s.Property(x => x.Text).IsRequired();
            s.HasKey("PersonalizedAnalogyId", nameof(AnalogySection.SectionIndex));
        });
    }
}
