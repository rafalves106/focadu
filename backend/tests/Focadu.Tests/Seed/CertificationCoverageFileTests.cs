using Focadu.Application.Seed;
using Focadu.Domain.Courses;
using Xunit;

namespace Focadu.Tests.Seed;

/// <summary>
/// Fase 45: rede de seguranca pro unico arquivo de curadoria em nivel de CURSO hoje
/// (certificacoes.json) - mesmo raciocinio de CuratedContentAllFilesTests (pegar erro de
/// schema/referencia sem precisar rodar o seed de verdade contra um Postgres), so que aqui contra
/// os 4 Monthly reais do curso em vez de uma WeeklyTemplate solta.
/// </summary>
public class CertificationCoverageFileTests
{
    private static readonly string? FilePath = TestContent.Resolve("web-security", null, "certificacoes.json");

    private static Course NewCourseWithFourMonthlies()
    {
        var course = new Course("Web Security");
        for (var number = 1; number <= 4; number++)
            course.AddMonthly(number, $"Modulo {number}");
        return course;
    }

    [Fact]
    public void CertificacoesJson_ImportsWithoutException()
    {
        if (FilePath is null) return; // conteudo fora do checkout (CI)
        var exception = Record.Exception(() =>
            CertificationCoverageImporter.ImportFile(NewCourseWithFourMonthlies(), FilePath));

        Assert.True(exception is null, $"certificacoes.json falhou ao importar: {exception}");
    }

    [Fact]
    public void CertificacoesJson_EveryMonthlyHasAtLeastOneCertification()
    {
        var course = NewCourseWithFourMonthlies();
        if (FilePath is null) return; // conteudo fora do checkout (CI)
        CertificationCoverageImporter.ImportFile(course, FilePath);

        Assert.All(course.Monthlies, m => Assert.NotEmpty(m.CertificationCoverages));
    }
}
