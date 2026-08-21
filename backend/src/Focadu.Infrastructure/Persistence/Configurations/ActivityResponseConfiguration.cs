using Focadu.Domain.Activities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class ActivityResponseConfiguration : IEntityTypeConfiguration<ActivityResponse>
{
    public void Configure(EntityTypeBuilder<ActivityResponse> builder)
    {
        builder.ToTable("ActivityResponses");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.AttemptNumber).IsRequired();
        builder.Property(r => r.Score).IsRequired();
        builder.Property(r => r.Passed).IsRequired();
        builder.Property(r => r.Transcript);
        builder.Property(r => r.Justification);
        builder.Property(r => r.AiFeedback);
        builder.Property(r => r.CreatedAt).IsRequired();
        builder.Property(r => r.ActivityId).IsRequired();

        // Fase 13: "DailyId" e shadow property (dono real da resposta, configurado do lado de
        // Daily.Responses - ver DailyConfiguration) - nunca exposta como propriedade de dominio,
        // ActivityResponse so guarda ActivityId (a definicao curricular que ela responde, agora
        // compartilhada entre todos os usuarios matriculados).
        //
        // O indice unico PRECISA incluir DailyId: como ActivityId aponta pra uma DailyActivity de
        // curriculo (WeeklyTemplate/DailyTemplate), o MESMO ActivityId e respondido por N usuarios
        // diferentes - um indice unico so em (ActivityId, AttemptNumber) rejeitaria a 1a tentativa
        // do 2o usuario, achando que ja existe (era inofensivo antes da Fase 13, quando so havia
        // 1 usuario/1 instancia global). Bug pego em design, nunca chegou a rodar em producao.
        builder.HasIndex("DailyId", nameof(ActivityResponse.ActivityId), nameof(ActivityResponse.AttemptNumber)).IsUnique();
    }
}
