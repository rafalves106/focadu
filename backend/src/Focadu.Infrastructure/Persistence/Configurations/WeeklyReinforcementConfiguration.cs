using Focadu.Domain.Dailies;
using Focadu.Domain.Weeklies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class WeeklyReinforcementConfiguration : IEntityTypeConfiguration<WeeklyReinforcement>
{
    public void Configure(EntityTypeBuilder<WeeklyReinforcement> builder)
    {
        builder.ToTable("WeeklyReinforcements");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.TriggeredAt).IsRequired();
        builder.Property(r => r.WeeklyId).IsRequired();

        // WeakDailyIds e so uma projecao de leitura (Select sobre _weakDailyLinks) - nunca uma
        // coluna real. A persistencia de verdade e a tabela associativa configurada abaixo, que
        // guarda uma FK real para Daily (integridade referencial garantida pelo banco, em vez de
        // um array/jsonb solto de ids).
        builder.Ignore(r => r.WeakDailyIds);

        builder.OwnsMany<WeakDailyLink>("_weakDailyLinks", wd =>
        {
            wd.ToTable("WeeklyReinforcementWeakDailies");
            wd.WithOwner().HasForeignKey("WeeklyReinforcementId");
            wd.Property(l => l.DailyId).IsRequired();
            wd.HasKey("WeeklyReinforcementId", nameof(WeakDailyLink.DailyId));

            wd.HasOne<Daily>()
                .WithMany()
                .HasForeignKey(l => l.DailyId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
