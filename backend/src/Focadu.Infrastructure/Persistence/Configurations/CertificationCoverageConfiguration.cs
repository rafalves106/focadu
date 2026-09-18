using Focadu.Domain.Monthlies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class CertificationCoverageConfiguration : IEntityTypeConfiguration<CertificationCoverage>
{
    public void Configure(EntityTypeBuilder<CertificationCoverage> builder)
    {
        builder.ToTable("CertificationCoverages");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.MonthlyId).IsRequired();
        builder.Property(c => c.CertificationCode).IsRequired().HasMaxLength(20);
        builder.Property(c => c.CertificationName).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Certifier).IsRequired().HasMaxLength(200);
        builder.Property(c => c.CoveredDomains).IsRequired();

        builder.HasIndex(c => new { c.MonthlyId, c.CertificationCode }).IsUnique();
    }
}
