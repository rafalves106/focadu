using Focadu.Application.Seed;
using Focadu.Domain.Courses;
using Focadu.Domain.Exceptions;
using Xunit;

namespace Focadu.Tests.Seed;

public class CertificationCoverageImporterTests
{
    private static Course NewCourseWithFourMonthlies()
    {
        var course = new Course("Curso Teste");
        for (var number = 1; number <= 4; number++)
            course.AddMonthly(number, $"Modulo {number}");
        return course;
    }

    [Fact]
    public void Import_AddsCoverageToMatchingMonthly()
    {
        const string json = """
        {
          "certifications": [
            { "code": "SEC+", "name": "CompTIA Security+", "certifier": "CompTIA" }
          ],
          "moduleCoverage": [
            { "monthlyNumber": 1, "coverage": [ { "certificationCode": "SEC+", "coveredDomains": "Dominio 1.0" } ] }
          ]
        }
        """;

        var course = NewCourseWithFourMonthlies();
        CertificationCoverageImporter.Import(course, json);

        var monthly1 = course.Monthlies.Single(m => m.Number == 1);
        var coverage = monthly1.CertificationCoverages.Single();
        Assert.Equal("SEC+", coverage.CertificationCode);
        Assert.Equal("CompTIA Security+", coverage.CertificationName);
        Assert.Equal("CompTIA", coverage.Certifier);
        Assert.Equal("Dominio 1.0", coverage.CoveredDomains);

        Assert.Empty(course.Monthlies.Single(m => m.Number == 2).CertificationCoverages);
    }

    [Fact]
    public void Import_UnknownCertificationCode_Throws()
    {
        const string json = """
        {
          "certifications": [
            { "code": "SEC+", "name": "CompTIA Security+", "certifier": "CompTIA" }
          ],
          "moduleCoverage": [
            { "monthlyNumber": 1, "coverage": [ { "certificationCode": "CEH", "coveredDomains": "..." } ] }
          ]
        }
        """;

        Assert.Throws<InvalidOperationException>(() =>
            CertificationCoverageImporter.Import(NewCourseWithFourMonthlies(), json));
    }

    [Fact]
    public void Import_UnknownMonthlyNumber_Throws()
    {
        const string json = """
        {
          "certifications": [
            { "code": "SEC+", "name": "CompTIA Security+", "certifier": "CompTIA" }
          ],
          "moduleCoverage": [
            { "monthlyNumber": 9, "coverage": [ { "certificationCode": "SEC+", "coveredDomains": "..." } ] }
          ]
        }
        """;

        Assert.Throws<InvalidOperationException>(() =>
            CertificationCoverageImporter.Import(NewCourseWithFourMonthlies(), json));
    }

    [Fact]
    public void Import_DuplicateCertificationCodeForSameMonthly_ThrowsDomainException()
    {
        const string json = """
        {
          "certifications": [
            { "code": "SEC+", "name": "CompTIA Security+", "certifier": "CompTIA" }
          ],
          "moduleCoverage": [
            { "monthlyNumber": 1, "coverage": [
              { "certificationCode": "SEC+", "coveredDomains": "Dominio 1.0" },
              { "certificationCode": "SEC+", "coveredDomains": "Dominio 2.0" }
            ] }
          ]
        }
        """;

        Assert.Throws<DomainException>(() =>
            CertificationCoverageImporter.Import(NewCourseWithFourMonthlies(), json));
    }
}
